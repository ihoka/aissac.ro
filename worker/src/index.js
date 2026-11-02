// aissac contact Worker.
//
// POST /contact
//   CORS locked to the site origins (ALLOWED_ORIGINS)
//   honeypot and "too fast" submissions are dropped silently
//   rate limit per IP
//   Turnstile: required for fetch posts; a present-but-invalid token is always
//     rejected. Plain no-JS posts cannot carry a token: they are accepted but
//     flagged [unverified], rate limited harder and get no autoreply.
//   validate and normalise fields, cap message length
//   Resend: notification to office@, autoreply to verified senders
//   303 to /thanks/ for the no-JS path, JSON for the fetch path
//
// Secrets (wrangler secret put): TURNSTILE_SECRET, RESEND_API_KEY.

import { notification, autoreply } from "./copy.js";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND = "https://api.resend.com/emails";
const MIN_FILL_MS = 3000;
const LIMITS = { name: 200, email: 254, company: 200, topic: 100, message: 5000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);
    const cors = corsHeaders(origin, allowed);

    if (url.pathname !== "/contact") return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, OPTIONS" } });

    const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
    const site = env.SITE_URL.replace(/\/$/, "");
    const reply = makeReply({ wantsJson, cors, site });

    // Browsers always send Origin on cross-origin POSTs, form or fetch.
    if (!origin || !allowed.includes(origin)) return reply.error(403, "origin");

    let form;
    try {
      form = await request.formData();
    } catch {
      return reply.error(400, "body");
    }

    // Spam traps: pretend success so bots learn nothing.
    if (str(form.get("website"))) return reply.ok();
    const ts = Number(form.get("ts"));
    if (ts && Date.now() - ts < MIN_FILL_MS) return reply.ok();

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const token = str(form.get("cf-turnstile-response"));

    // Fetch posts come from the enhanced form, which always has Turnstile.
    if (wantsJson && !token) return reply.error(403, "turnstile");

    let verified = false;
    if (token) {
      verified = await verifyTurnstile(token, ip, env);
      if (!verified) return reply.error(403, "turnstile");
    }

    const limiter = verified ? env.CONTACT_LIMIT : env.UNVERIFIED_LIMIT;
    if (limiter) {
      const { success } = await limiter.limit({ key: ip });
      if (!success) return reply.error(429, "rate");
    }

    const { values, errors } = normalise(form);
    if (Object.keys(errors).length) {
      if (wantsJson) return json({ ok: false, errors }, 422, cors);
      return redirect(`${site}/#contact`);
    }

    const note = notification(values, { verified, ip });
    const sent = await sendEmail(env, {
      to: [env.MAIL_TO],
      reply_to: values.email,
      subject: note.subject,
      text: note.text,
    });
    if (!sent) return reply.error(502, "send");

    // Autoreply only to senders Turnstile vouched for: an unverified address
    // could be anyone's, and we will not be used to mail strangers.
    if (verified) {
      const auto = autoreply(values);
      const send = sendEmail(env, { to: [values.email], reply_to: env.MAIL_TO, subject: auto.subject, text: auto.text });
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(send);
      else await send;
    }

    return reply.ok();
  },
};

// ------------------------------------------------------------ helpers

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin, allowed) {
  if (!origin || !allowed.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function makeReply({ wantsJson, cors, site }) {
  return {
    ok: () => (wantsJson ? json({ ok: true }, 200, cors) : redirect(`${site}/thanks/`)),
    // The no-JS path has no designed error page; it goes back to the form,
    // where the email address is always visible.
    error: (status, reason) => (wantsJson ? json({ ok: false, error: reason }, status, cors) : redirect(`${site}/#contact`)),
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}

function str(v) {
  return typeof v === "string" ? v : "";
}

// Single line: trim, drop control characters (no header injection), collapse spaces.
function line(v, max) {
  return str(v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalise(form) {
  const values = {
    name: line(form.get("name"), LIMITS.name),
    email: line(form.get("email"), LIMITS.email),
    company: line(form.get("company"), LIMITS.company),
    topic: line(form.get("topic"), LIMITS.topic),
    message: str(form.get("message"))
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .trim(),
  };
  if (values.message.length > LIMITS.message) values.message = values.message.slice(0, LIMITS.message) + "\n[truncated]";

  const errors = {};
  if (!values.name) errors.name = true;
  if (!EMAIL.test(values.email)) errors.email = true;
  if (!values.message) errors.message = true;
  return { values, errors };
}

// Canonical siteverify (developers.cloudflare.com/turnstile/spin): require
// success, the expected action and an approved frontend hostname.
// Tokens are single-use; Cloudflare rejects a replayed one.
export async function verifyTurnstile(token, ip, env) {
  const hostnames = new Set(
    (env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim()).filter(Boolean)
  );
  if (!env.TURNSTILE_SECRET || typeof token !== "string" || token.length === 0 || token.length > 2048 || hostnames.size === 0) {
    return false;
  }
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);

  let result;
  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    result = await res.json();
  } catch {
    return false;
  }

  // Cloudflare's public test keys answer with hostname "example.com" and no
  // action. Accept that only where ALLOW_TEST_KEYS is set (local .dev.vars).
  const testKey = env.ALLOW_TEST_KEYS === "1" && result?.metadata?.result_with_testing_key === true;
  return (
    result?.success === true &&
    hostnames.has(result.hostname) &&
    (result.action === env.TURNSTILE_ACTION || testKey)
  );
}

async function sendEmail(env, { to, reply_to, subject, text }) {
  const payload = { from: env.MAIL_FROM, to, reply_to, subject, text };
  if (env.DRY_RUN === "1") {
    console.log("DRY_RUN email", JSON.stringify(payload));
    return true;
  }
  try {
    const res = await fetch(RESEND, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("Resend failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("Resend error", err);
    return false;
  }
}

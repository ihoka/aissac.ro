import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const ORIGIN = "https://aissac.ro";
const realFetch = globalThis.fetch;
let calls; // outbound fetches: { url, body }
let turnstileOk; // what siteverify answers
let resendOk; // whether Resend accepts
let limited; // which limiter refuses

const limiter = (name) => ({
  async limit({ key }) {
    calls.push({ url: `limit:${name}`, body: key });
    return { success: limited !== name };
  },
});

const env = () => ({
  SITE_URL: "https://aissac.ro",
  ALLOWED_ORIGINS: "https://aissac.ro,https://www.aissac.ro",
  MAIL_FROM: "aissac <office@aissac.ro>",
  MAIL_TO: "office@aissac.ro",
  TURNSTILE_SECRET: "secret",
  RESEND_API_KEY: "re_test",
  CONTACT_LIMIT: limiter("CONTACT_LIMIT"),
  UNVERIFIED_LIMIT: limiter("UNVERIFIED_LIMIT"),
});

beforeEach(() => {
  calls = [];
  turnstileOk = true;
  resendOk = true;
  limited = null;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("siteverify")) {
      calls.push({ url: "siteverify", body: Object.fromEntries(init.body) });
      return Response.json({ success: turnstileOk });
    }
    if (String(url).includes("resend")) {
      calls.push({ url: "resend", body: JSON.parse(init.body) });
      return new Response(resendOk ? "{}" : "nope", { status: resendOk ? 200 : 500 });
    }
    throw new Error("unexpected fetch " + url);
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const valid = {
  name: "Maria Ionescu",
  email: "maria@northwind.example",
  company: "Northwind",
  topic: "Agents and automation",
  message: "Our support assistant answers well in demos and badly on real tickets.",
  ts: String(Date.now() - 60_000),
};

function post(fields, { json = true, origin = ORIGIN, path = "/contact", method = "POST" } = {}) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  const headers = { "CF-Connecting-IP": "203.0.113.7" };
  if (origin) headers.Origin = origin;
  if (json) headers.Accept = "application/json";
  return worker.fetch(new Request(`https://aissac-contact.example.workers.dev${path}`, { method, body: method === "POST" ? body : undefined, headers }), env(), null);
}
const emails = () => calls.filter((c) => c.url === "resend").map((c) => c.body);

// ------------------------------------------------------------ routing and CORS
test("unknown path is 404", async () => {
  assert.equal((await post(valid, { path: "/" })).status, 404);
});

test("GET is 405", async () => {
  assert.equal((await post({}, { method: "GET" })).status, 405);
});

test("preflight from the site gets CORS headers", async () => {
  const res = await worker.fetch(new Request("https://w.example/contact", { method: "OPTIONS", headers: { Origin: "https://www.aissac.ro" } }), env());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://www.aissac.ro");
});

test("preflight from elsewhere gets no CORS allowance", async () => {
  const res = await worker.fetch(new Request("https://w.example/contact", { method: "OPTIONS", headers: { Origin: "https://evil.example" } }), env());
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});

test("POST from a foreign origin is refused", async () => {
  const res = await post({ ...valid, "cf-turnstile-response": "tok" }, { origin: "https://evil.example" });
  assert.equal(res.status, 403);
  assert.equal(emails().length, 0);
});

// ------------------------------------------------------------ spam traps
test("honeypot filled: pretends success, sends nothing", async () => {
  const res = await post({ ...valid, website: "http://spam", "cf-turnstile-response": "tok" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test("submitted under 3 seconds after render: pretends success, sends nothing", async () => {
  const res = await post({ ...valid, ts: String(Date.now() - 1000), "cf-turnstile-response": "tok" });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

// ------------------------------------------------------------ Turnstile
test("fetch post without a token is rejected before anything else", async () => {
  const res = await post(valid);
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, error: "turnstile" });
  assert.equal(calls.length, 0);
});

test("invalid token is rejected and nothing is sent", async () => {
  turnstileOk = false;
  const res = await post({ ...valid, "cf-turnstile-response": "bad" });
  assert.equal(res.status, 403);
  assert.equal(calls[0].url, "siteverify");
  assert.equal(calls[0].body.secret, "secret");
  assert.equal(calls[0].body.remoteip, "203.0.113.7");
  assert.equal(emails().length, 0);
});

test("no-JS post with an invalid token is rejected back to the form", async () => {
  turnstileOk = false;
  const res = await post({ ...valid, "cf-turnstile-response": "bad" }, { json: false });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://aissac.ro/#contact");
  assert.equal(emails().length, 0);
});

// ------------------------------------------------------------ happy paths
test("verified fetch post: notification plus autoreply, JSON ok", async () => {
  const res = await post({ ...valid, "cf-turnstile-response": "tok" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.ok(calls.some((c) => c.url === "limit:CONTACT_LIMIT"));

  const [note, auto] = emails();
  assert.deepEqual(note.to, ["office@aissac.ro"]);
  assert.equal(note.reply_to, "maria@northwind.example");
  assert.equal(note.from, "aissac <office@aissac.ro>");
  assert.equal(note.subject, "New enquiry from Maria Ionescu, Northwind");
  assert.match(note.text, /Agents and automation/);
  assert.match(note.text, /Turnstile: verified/);

  assert.deepEqual(auto.to, ["maria@northwind.example"]);
  assert.equal(auto.reply_to, "office@aissac.ro");
  assert.equal(auto.subject, "Message received.");
  assert.match(auto.text, /reply within one working day/);
  assert.match(auto.text, /> Our support assistant/);
});

test("no-JS post without token: accepted, flagged, no autoreply, 303 to /thanks/", async () => {
  const { ts, ...noTs } = valid; // without JS the timestamp is empty
  const res = await post({ ...noTs, ts: "" }, { json: false });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://aissac.ro/thanks/");
  assert.ok(calls.some((c) => c.url === "limit:UNVERIFIED_LIMIT"));
  assert.ok(!calls.some((c) => c.url === "siteverify"));
  const sent = emails();
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /^\[unverified\] /);
  assert.match(sent[0].text, /NOT verified/);
});

test("no-JS post with a valid token is treated as verified", async () => {
  const res = await post({ ...valid, "cf-turnstile-response": "tok" }, { json: false });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://aissac.ro/thanks/");
  assert.equal(emails().length, 2);
});

// ------------------------------------------------------------ validation
test("invalid fields return 422 with the field names", async () => {
  const res = await post({ ...valid, name: "  ", email: "maria@northwind", message: "", "cf-turnstile-response": "tok" });
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), { ok: false, errors: { name: true, email: true, message: true } });
  assert.equal(emails().length, 0);
});

test("no-JS invalid fields go back to the form", async () => {
  const res = await post({ ...valid, email: "nope", ts: "" }, { json: false });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://aissac.ro/#contact");
});

test("header injection is neutralised in single-line fields", async () => {
  await post({ ...valid, name: "Eve\r\nBcc: victim@example.com", "cf-turnstile-response": "tok" });
  const [note] = emails();
  assert.equal(note.subject, "New enquiry from Eve Bcc: victim@example.com, Northwind");
  assert.ok(!/[\r\n]/.test(note.subject));
});

test("message is capped at 5000 characters", async () => {
  await post({ ...valid, message: "x".repeat(6000), "cf-turnstile-response": "tok" });
  const [note] = emails();
  assert.match(note.text, /x{5000}\n\[truncated\]/);
  assert.ok(!note.text.includes("x".repeat(5001)));
});

// ------------------------------------------------------------ failure modes
test("rate limited: 429 and nothing sent", async () => {
  limited = "CONTACT_LIMIT";
  const res = await post({ ...valid, "cf-turnstile-response": "tok" });
  assert.equal(res.status, 429);
  assert.equal(emails().length, 0);
});

test("Resend failure surfaces as 502 so the form shows the network error", async () => {
  resendOk = false;
  const res = await post({ ...valid, "cf-turnstile-response": "tok" });
  assert.equal(res.status, 502);
  assert.equal(emails().length, 1); // notification attempted; no autoreply after a failure
});

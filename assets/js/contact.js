// Contact form enhancement. Without this file the form is a plain POST to the
// Worker, which redirects to /thanks. With it: inline validation, Turnstile,
// fetch submission and the Submitting / error states from board 7.
// All visible text comes from the markup (and so from _data/site.yml).
(() => {
  "use strict";

  const form = document.querySelector(".contact-form");
  if (!form || !form.getAttribute("action")) return; // no endpoint configured: leave native behaviour

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const RULES = {
    name: (v) => v.trim().length > 0,
    email: (v) => EMAIL.test(v.trim()),
    message: (v) => v.trim().length > 0,
  };
  const ORDER = ["name", "email", "message"];

  const button = form.querySelector(".submit-button");
  const label = button.querySelector(".submit-label");
  const spinner = button.querySelector(".spinner");
  const alertBox = form.querySelector(".form-alert");
  const slot = form.querySelector(".turnstile-slot");
  const editable = [...form.querySelectorAll(".field")];

  form.noValidate = true; // we show our own, designed messages
  form.elements.ts.value = String(Date.now()); // render time, for the server's 3 second check

  let attempted = false;
  let busy = false;

  // ------------------------------------------------------------ field errors
  const setError = (name, invalid) => {
    const field = form.elements[name];
    const error = document.getElementById(`f-${name}-error`);
    if (!field || !error) return;
    error.hidden = !invalid;
    if (invalid) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", error.id);
    } else {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
  };

  const validate = (names) => {
    const invalid = names.filter((n) => !RULES[n](form.elements[n].value));
    names.forEach((n) => setError(n, invalid.includes(n)));
    return invalid;
  };

  // Validate on submit, then on blur.
  ORDER.forEach((name) =>
    form.elements[name].addEventListener("blur", () => {
      if (attempted && !busy) validate([name]);
    })
  );

  // ------------------------------------------------------------ Turnstile
  // Loaded lazily, when the form comes near the viewport or gets focus.
  const siteKey = slot?.dataset.sitekey;
  let widgetId = null;
  let tokenWaiters = [];
  let loadRequested = false;

  const resolveToken = (token) => {
    tokenWaiters.forEach((resolve) => resolve(token));
    tokenWaiters = [];
  };

  const loadTurnstile = () => {
    if (loadRequested || !siteKey) return;
    loadRequested = true;
    window.onAissacTurnstile = () => {
      widgetId = window.turnstile.render(slot, {
        sitekey: siteKey,
        action: slot.dataset.action,
        theme: "dark",
        size: "normal",
        callback: (token) => resolveToken(token),
        "error-callback": () => resolveToken(""),
        "expired-callback": () => window.turnstile.reset(widgetId),
      });
    };
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onAissacTurnstile&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadTurnstile();
        io.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(form);
  } else {
    loadTurnstile();
  }
  form.addEventListener("focusin", loadTurnstile, { once: true });

  const currentToken = () =>
    widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) || "" : "";

  // Wait (up to 10s) for Turnstile to finish verifying if it has not yet.
  const getToken = () => {
    if (!siteKey) return Promise.resolve("");
    const now = currentToken();
    if (now) return Promise.resolve(now);
    loadTurnstile();
    return new Promise((resolve) => {
      tokenWaiters.push(resolve);
      setTimeout(() => resolve(currentToken()), 10000);
    });
  };

  // ------------------------------------------------------------ states
  const setLabel = (key) => {
    label.textContent = button.dataset[key];
  };

  const setSubmitting = (on) => {
    busy = on;
    form.dataset.state = on ? "submitting" : "default";
    editable.forEach((el) => {
      if (el.tagName !== "SELECT") el.readOnly = on;
      else if (on) el.setAttribute("aria-readonly", "true");
      else el.removeAttribute("aria-readonly");
    });
    if (on) {
      button.setAttribute("aria-busy", "true");
      button.setAttribute("aria-disabled", "true");
      spinner.hidden = false;
      setLabel("labelSending");
    } else {
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
      spinner.hidden = true;
    }
  };

  // A read-only select must not change by keyboard either.
  form.elements.topic.addEventListener("keydown", (e) => {
    if (busy && e.key !== "Tab") e.preventDefault();
  });

  const showNetworkError = () => {
    setSubmitting(false);
    alertBox.hidden = false;
    setLabel("labelRetry");
    if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
  };

  // ------------------------------------------------------------ submit
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    attempted = true;
    alertBox.hidden = true;

    const invalid = validate(ORDER);
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      return;
    }

    setSubmitting(true);
    const token = await getToken();
    const body = new FormData(form);
    if (token) body.set("cf-turnstile-response", token);

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.assign(form.dataset.thanks);
        return;
      }
      if (res.status === 422 && data.errors) {
        // The server disagreed with a field: show it like a local error.
        setSubmitting(false);
        setLabel("labelSend");
        const names = ORDER.filter((n) => data.errors[n]);
        names.forEach((n) => setError(n, true));
        if (names.length) {
          form.elements[names[0]].focus();
          return;
        }
      }
      showNetworkError();
    } catch {
      showNetworkError();
    }
  });
})();

// Email copy. The autoreply reuses the /thanks page copy from the build spec
// (section 4) verbatim; keep the two in step if either changes.

export function notification(v, { verified, ip }) {
  const flag = verified ? "" : "[unverified] ";
  const subject = `${flag}New enquiry from ${v.name}${v.company ? `, ${v.company}` : ""}`;
  const text = [
    `Name: ${v.name}`,
    `Email: ${v.email}`,
    `Company: ${v.company || "-"}`,
    `About: ${v.topic || "-"}`,
    "",
    v.message,
    "",
    "--",
    verified
      ? "Turnstile: verified."
      : "Turnstile: NOT verified (sent without JavaScript). No autoreply was sent; treat with care.",
    `IP: ${ip}`,
  ].join("\n");
  return { subject, text };
}

export function autoreply(v) {
  const subject = "Message received.";
  const quoted = v.message.split("\n").map((l) => `> ${l}`).join("\n");
  const text = [
    `Hello ${v.name},`,
    "",
    "Message received.",
    "We read everything that comes in and reply within one working day, usually sooner. If it is urgent, email directly: office@aissac.ro",
    "",
    "aissac",
    "Cluj-Napoca, Romania",
    "",
    "Your message:",
    "",
    quoted,
  ].join("\n");
  return { subject, text };
}

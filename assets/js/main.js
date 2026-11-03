// Site behaviour: nav state, current-section marker, mobile menu, draw-in.
// Everything here is an enhancement; the page works and reads without it.
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SCROLLED_AFTER = 24; // px, spec section 5
  const ANCHOR_OFFSET = 96; // matches scroll-margin-top

  // ---------------------------------------------------------------- nav state
  const header = document.querySelector(".site-header");
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const tracked = navLinks
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter((t) => t.section);

  const updateNav = () => {
    if (header) header.toggleAttribute("data-at-top", window.scrollY <= SCROLLED_AFTER);

    // The current section is the last tracked one whose top has passed the
    // anchor line and whose bottom has not.
    const line = ANCHOR_OFFSET + 1;
    let current = null;
    for (const t of tracked) {
      const r = t.section.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = t;
    }
    for (const t of tracked) {
      if (t === current) t.link.setAttribute("aria-current", "true");
      else t.link.removeAttribute("aria-current");
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateNav();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateNav();

  // ---------------------------------------------------------------- mobile menu
  const menu = document.getElementById("mobile-menu");
  const menuButton = document.querySelector(".menu-button");

  if (menu && menuButton && typeof menu.showModal === "function") {
    const closeButton = menu.querySelector(".menu-close");
    const firstLink = menu.querySelector("nav a");
    const focusables = () =>
      [...menu.querySelectorAll("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null);

    const open = () => {
      menu.showModal();
      document.documentElement.classList.add("menu-open"); // body scroll lock
      menuButton.setAttribute("aria-expanded", "true");
      firstLink?.focus();
    };

    // `then` runs after the sheet has closed: used to scroll to a chosen link.
    const close = (then) => {
      if (!menu.open) return;
      menu.close();
      document.documentElement.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      if (typeof then === "function") then();
      else menuButton.focus();
    };

    menuButton.addEventListener("click", open);
    closeButton?.addEventListener("click", () => close());

    // Esc fires `cancel`; handle it ourselves so state and focus stay in sync.
    menu.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });

    // Trap Tab inside the sheet, including the browser chrome edge case.
    menu.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // Choosing a link closes the sheet, then scrolls.
    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const url = new URL(link.href, location.href);
      const target = url.pathname === location.pathname && url.hash && document.getElementById(url.hash.slice(1));
      if (!target) {
        close(() => {});
        return; // other pages: let the browser navigate
      }
      event.preventDefault();
      close(() => {
        history.pushState(null, "", url.hash);
        target.scrollIntoView({ block: "start" }); // CSS decides smooth vs instant
        // Move the reading position with the scroll, without a focus ring.
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      });
    });

    // Sheet only exists below 720px; close it if the viewport grows.
    window.matchMedia("(min-width: 720px)").addEventListener("change", (e) => {
      if (e.matches) close();
    });
  }

  // ---------------------------------------------------------------- draw-in
  // Joins and the rail are drawn by default. Only here, with JS running and
  // motion allowed, are they reset and drawn in once on first view.
  const drawables = document.querySelectorAll(".diagram, .rail, .gap-diagram");
  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-drawn");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.35 }
    );
    drawables.forEach((el) => {
      el.classList.add("draw-pending");
      io.observe(el);
    });
  }
})();

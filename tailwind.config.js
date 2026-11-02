/**
 * Tailwind theme. Every value here points at a custom property defined in
 * assets/css/main.css. No colour literals in this file.
 *
 * Colours use color-mix so opacity modifiers work (e.g. bg-base/92 for the
 * scrolled nav) while the token stays a plain hex in the token file.
 */
const token = (name) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

// Fluid size between the 390px mobile board and the 1440px desktop board.
const fluid = (minPx, maxPx) => {
  const slope = (maxPx - minPx) / (1440 - 390);
  const intercept = minPx - slope * 390;
  const rem = (px) => `${+(px / 16).toFixed(4)}rem`;
  return `clamp(${rem(minPx)}, ${rem(intercept)} + ${+(slope * 100).toFixed(4)}vw, ${rem(maxPx)})`;
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_layouts/**/*.html",
    "./_includes/**/*.html",
    "./*.{html,md}",
    "./_data/**/*.yml",
    "./assets/js/**/*.js",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      base: token("base"),
      surface: token("surface"),
      raised: token("raised"),
      "raised-hover": token("raised-hover"),
      rule: token("rule"),
      border: token("border"),
      muted: token("muted"),
      "text-2": token("text-2"),
      text: token("text"),
      accent: token("accent"),
      "accent-hi": token("accent-hi"),
      "accent-lo": token("accent-lo"),
      field: token("field"),
      error: token("error"),
    },
    fontFamily: {
      display: ['"Big Shoulders"', '"Arial Narrow"', "sans-serif"],
      mark: ['"Big Shoulders Stencil"', '"Arial Narrow"', "sans-serif"],
      text: ['"Atkinson Hyperlegible Next"', "system-ui", "sans-serif"],
      mono: ['"Atkinson Hyperlegible Mono"', "ui-monospace", "monospace"],
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
    fontSize: {
      // Role: [size, line-height], desktop / mobile per spec section 2.
      hero: [fluid(52, 80), { lineHeight: "1" }],
      h2: [fluid(44, 64), { lineHeight: "1" }],
      "section-h2": [fluid(32, 40), { lineHeight: "1.1" }], // 40 / 44
      h3: ["1.375rem", { lineHeight: "1.75rem" }], // 22 / 28
      body: ["1.125rem", { lineHeight: "1.875rem" }], // 18 / 30
      small: ["0.875rem", { lineHeight: "1.375rem" }], // 14 / 22
      mono: ["0.8125rem", { lineHeight: "1.25rem" }], // 13 / 20
      // Component sizes named in section 3 and 5.
      input: ["1rem", { lineHeight: "1.5rem" }], // 16, no iOS zoom
      label: ["0.9375rem", { lineHeight: "1.375rem" }], // 15
      button: ["1rem", { lineHeight: "1.25rem" }], // 15 to 17
      "work-name": ["1.625rem", { lineHeight: "1.1" }], // 26
      "menu-link": ["2.25rem", { lineHeight: "1" }], // 36
      // Wordmark: nav 36, mobile nav 30, footer 72. Letter-spacing +1%.
      "mark-nav": [fluid(30, 36), { lineHeight: "1", letterSpacing: "0.01em" }],
      "mark-footer": ["4.5rem", { lineHeight: "1", letterSpacing: "0.01em" }],
    },
    borderRadius: {
      none: "0",
      DEFAULT: "var(--radius)",
      full: "9999px", // spinner and the round error icon only
    },
    extend: {
      // Spacing scale 4 8 12 16 24 32 48 64 96 112 is Tailwind's default
      // 1 2 3 4 6 8 12 16 24 28; only the layout tokens are added.
      spacing: {
        nav: "var(--nav-h)",
        section: "var(--section-pad)",
        gutter: "var(--gutter)",
      },
      opacity: {
        92: "0.92", // scrolled nav ground
      },
      maxWidth: {
        page: "var(--container-max)",
      },
      boxShadow: {
        btn: "var(--shadow-btn)",
        "btn-pressed": "var(--shadow-btn-pressed)",
        field: "var(--shadow-field)",
        nav: "var(--shadow-nav)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        draw: "600ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease",
      },
      height: {
        btn: "3rem", // 48
        "btn-nav": "2.75rem", // 44
        "btn-submit": "3.25rem", // 52
        field: "3rem", // 48
        "field-compact": "2.75rem", // 44
        "menu-row": "4rem", // 64
      },
      scrollMargin: {
        anchor: "96px",
      },
      screens: {
        // Breakpoints named in the spec.
        nav: "720px", // mobile menu collapses below this
        work: "900px", // work row link drops under the description below this
        hero: "1080px", // hero diagram wraps under the copy below this
      },
    },
  },
  plugins: [],
};

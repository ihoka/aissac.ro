// Renders the favicon set and the OpenGraph image from the design tokens.
// Run after `npm run build:css`, with playwright-core installed ad hoc (not a
// project dependency, so CI stays lean):
//   npm i --no-save playwright-core && CHROME_PATH=/path/to/chrome node tools/brand-assets.mjs
// Colours come from assets/css/site.css (the token file), copy from _data/site.yml.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(root + "assets/css/site.css", "utf8");
const data = readFileSync(root + "_data/site.yml", "utf8");
const pick = (re) => (data.match(re) || [])[1].replace(/^"|"$/g, "");
const wordmark = pick(/^wordmark:\s*(.+)$/m);
const headline = pick(/^hero:\s*\n\s+title:\s*(.+)$/m);
const config = readFileSync(root + "_config.yml", "utf8");
const host = new URL(config.match(/^url:\s*"?([^"\n]+)"?/m)[1]).host;

const fonts =
  "https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@800&family=Big+Shoulders+Stencil:wght@800&family=Atkinson+Hyperlegible+Mono:wght@400&display=block";

// The mark: a plate with one corner cut, a stencilled "a" (board: Craft, 02 Mark).
// Below 32px the stencil bridges close up, so small sizes use the solid cut.
const mark = (size, { solid = false, ground = false } = {}) => `
  <div style="width:${size}px;height:${size}px;${ground ? "background:var(--base);" : ""}display:flex">
    <div style="width:${size}px;height:${size}px;background:var(--accent);
      clip-path:polygon(0 0,calc(100% - ${(size * 28) / 128}px) 0,100% ${(size * 28) / 128}px,100% 100%,0 100%);
      display:flex;align-items:center;justify-content:center">
      <span class="${solid ? "font-display" : "font-mark"}" style="font-weight:800;font-size:${(size * 120) / 128}px;
        line-height:1;color:var(--base);margin-top:${(-size * 14) / 128}px">a</span>
    </div>
  </div>`;

const og = `
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:var(--base);
    color:var(--text);display:flex;flex-direction:column;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:32px">
      ${mark(120)}
      <span class="font-mark" style="font-weight:800;font-size:148px;line-height:0.82;letter-spacing:0.01em">${wordmark}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px;border-top:1px solid var(--rule);padding-top:32px">
      <span class="font-display" style="font-weight:800;font-size:64px;line-height:1;max-width:960px">${headline}</span>
      <span class="font-mono" style="font-size:24px;color:var(--accent)">${host}</span>
    </div>
  </div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="${fonts}"><style>${css}
     html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`,
    { waitUntil: "load" }
  );
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  if (out) writeFileSync(root + out, buf);
  return buf;
}

await shot(og, 1200, 630, "assets/img/og.png");
await shot(mark(512), 512, 512, "assets/img/icon-512.png");
await shot(mark(192), 192, 192, "assets/img/icon-192.png");
await shot(mark(180, { ground: true }), 180, 180, "assets/img/apple-touch-icon.png");
const ico = [await shot(mark(16, { solid: true }), 16, 16), await shot(mark(32, { solid: true }), 32, 32)];
await browser.close();

// favicon.ico holding the two PNGs (16 and 32), PNG-in-ICO as browsers accept.
const header = Buffer.alloc(6 + 16 * ico.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(ico.length, 4);
let offset = header.length;
ico.forEach((png, i) => {
  const size = png.readUInt32BE(16);
  const e = 6 + 16 * i;
  header.writeUInt8(size, e);
  header.writeUInt8(size, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(root + "favicon.ico", Buffer.concat([header, ...ico]));
console.log("wrote og.png, icon-512.png, icon-192.png, apple-touch-icon.png, favicon.ico");

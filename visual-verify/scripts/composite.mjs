// Compose two screenshots into one labelled side-by-side BEFORE/AFTER image.
//
// Usage:
//   node composite.mjs --before a.png --after b.png --out c.png
//     [--title "Header at 440px"]
//     [--before-label "BEFORE — ..."] [--after-label "AFTER — ..."]
//     [--before-note "..."]           [--after-note "..."]
import { readFileSync } from "node:fs";
import { launchBrowser } from "./load-playwright.mjs";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const before = arg("--before");
const after = arg("--after");
const out = arg("--out");
if (!before || !after || !out) {
  console.error("required: --before, --after, --out");
  process.exit(2);
}
const title = arg("--title", "");
const beforeLabel = arg("--before-label", "BEFORE");
const afterLabel = arg("--after-label", "AFTER");
const beforeNote = arg("--before-note", "");
const afterNote = arg("--after-note", "");

const b64 = (f) => "data:image/png;base64," + readFileSync(f).toString("base64");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const col = (label, color, src, note) => `
  <div style="flex:1;min-width:0">
    <div style="color:${color};font-weight:700;font-size:17px;padding:6px 2px;font-family:ui-sans-serif,system-ui">${esc(label)}</div>
    <img src="${src}" style="width:100%;border:2px solid ${color};display:block"/>
    ${note ? `<div style="color:#a1a1aa;font-size:12.5px;padding:6px 2px;font-family:ui-sans-serif,system-ui">${esc(note)}</div>` : ""}
  </div>`;

const html = `<html><body style="margin:0;background:#18181b">
  ${title ? `<div style="color:#e5e5e5;font-family:ui-sans-serif,system-ui;font-weight:700;font-size:18px;padding:14px 16px 0">${esc(title)}</div>` : ""}
  <div style="display:flex;gap:16px;padding:14px 16px;align-items:flex-start">
    ${col(beforeLabel, "#f87171", b64(before), beforeNote)}
    ${col(afterLabel, "#4ade80", b64(after), afterNote)}
  </div>
</body></html>`;

const { browser } = await launchBrowser("chromium");
const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await (await page.$("body")).screenshot({ path: out });
console.log(JSON.stringify({ saved: out }));
await browser.close();

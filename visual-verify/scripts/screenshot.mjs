// Screenshot a URL in headless Chromium at a chosen viewport.
//
// Usage:
//   node screenshot.mjs --url <url> --out <path>
//     [--width 390] [--height 844] [--dpr 2] [--mobile]
//     [--wait 2000]                       wait ms after load (let SPA/hot-reload settle)
//     [--wait-until load|domcontentloaded|networkidle|commit]
//                                          nav wait strategy (default: domcontentloaded, then
//                                          best-effort networkidle with a short timeout). Pages
//                                          with an open SSE/websocket/poll never reach networkidle,
//                                          so we no longer hard-fail on it.
//     [--click "Text or selector"]        repeatable; clicks button by accessible name, else CSS selector
//     [--scroll-bottom "selector"]        scroll an element to its bottom (e.g. a scrollable modal)
//     [--eval "js"]                       run arbitrary JS in the page before the shot
//     [--clip x,y,w,h]                    clip region instead of full viewport
//     [--full]                            full-page screenshot
//
// Exits non-zero on failure. Prints a small JSON summary on success.
import { launchBrowser } from "./load-playwright.mjs";

import { readinessArg, validateReadiness, waitForReady, evaluateBounded } from "./readiness.mjs";

function parseArgs(argv) {
  const a = { clicks: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (readinessArg(a, k, v)) { i++; continue; }
    switch (k) {
      case "--url": a.url = v; i++; break;
      case "--out": a.out = v; i++; break;
      case "--width": a.width = parseInt(v, 10); i++; break;
      case "--height": a.height = parseInt(v, 10); i++; break;
      case "--dpr": a.dpr = parseFloat(v); i++; break;
      case "--mobile": a.mobile = true; break;
      case "--wait": a.wait = parseInt(v, 10); i++; break;
      case "--wait-until": a.waitUntil = v; i++; break;
      case "--click": a.clicks.push(v); i++; break;
      case "--scroll-bottom": a.scrollBottom = v; i++; break;
      case "--eval": a.eval = v; i++; break;
      case "--clip": a.clip = v.split(",").map(Number); i++; break;
      case "--full": a.full = true; break;
      default: break;
    }
  }
  return a;
}

const a = parseArgs(process.argv.slice(2));
validateReadiness(a);
if (!a.url || !a.out) {
  console.error("required: --url and --out");
  process.exit(2);
}

const { browser, where } = await launchBrowser("chromium");
try {
const ctx = await browser.newContext({
  viewport: { width: a.width ?? 390, height: a.height ?? 844 },
  deviceScaleFactor: a.dpr ?? 2,
  isMobile: !!a.mobile,
  hasTouch: !!a.mobile
});
const page = await ctx.newPage();
if (a.waitUntil) {
  // Explicit strategy requested — honour it exactly.
  await page.goto(a.url, { waitUntil: a.waitUntil });
} else {
  // Default: get the DOM up reliably, then *try* to let the network settle.
  // networkidle never fires on pages holding an SSE/websocket/poll, so it's
  // best-effort with a short bound rather than the navigation's hard gate.
  await page.goto(a.url, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // persistent connection / steady traffic — fine, carry on to --wait
  }
}
if (a.wait) await page.waitForTimeout(a.wait);

for (const target of a.clicks) {
  const byName = page.getByRole("button", { name: new RegExp(`^${escapeRe(target)}$`, "i") });
  if (await byName.count()) await byName.first().click();
  else await page.locator(target).first().click();
  await page.waitForTimeout(400);
}

if (a.scrollBottom) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollTop = el.scrollHeight;
  }, a.scrollBottom);
  await page.waitForTimeout(200);
}

if (a.eval) await evaluateBounded(page, a.eval, a['ready-timeout']);

const readiness = await waitForReady(page, a);
const opts = { path: a.out };
if (a.full) opts.fullPage = true;
if (a.clip) opts.clip = { x: a.clip[0], y: a.clip[1], width: a.clip[2], height: a.clip[3] };
await page.screenshot(opts);

console.log(JSON.stringify({ saved: a.out, width: a.width ?? 390, height: a.height ?? 844, browser: where, readiness }));
} finally { await browser.close(); }

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

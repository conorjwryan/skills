// Touch checks on an emulated phone: tap through to a state, drag with a finger,
// audit touch-target sizes, and screenshot the result.
//
// Usage:
//   node touch.mjs --device iphone|android --url <url> --out <path>
//     [--engine webkit|chromium]   default: webkit for iphone, chromium for android
//     [--wait 2000]                wait ms after load
//     [--tap "Text or selector"]   repeatable; taps a button by accessible name, else a CSS selector
//     [--drag "selector" --by dx,dy]  finger-drag from the element's centre by dx,dy CSS px
//     [--report "js expression"]   evaluated after the steps; printed in the JSON summary
//     [--targets]                  audit touch targets; undersized ones are outlined red in the shot
//     [--min 44]                   minimum target size in CSS px (default 44 iphone, 48 android)
//     [--scope "selector"]         limit the audit to part of the page
//     [--full]                     full-page screenshot (blank below the fold in apps that scroll inside a panel;
//                                  scroll that panel with --tap/--report instead)
//
// Prints a JSON summary. Always states which engine and input were really used.
import { launchBrowser, loadDevices } from "./load-playwright.mjs";

import { readinessArg, validateReadiness, waitForReady, evaluateBounded } from "./readiness.mjs";

function parseArgs(argv) {
  const a = { taps: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (readinessArg(a, k, v)) { i++; continue; }
    switch (k) {
      case "--device": a.device = v; i++; break;
      case "--engine": a.engine = v; i++; break;
      case "--url": a.url = v; i++; break;
      case "--out": a.out = v; i++; break;
      case "--wait": a.wait = parseInt(v, 10); i++; break;
      case "--tap": a.taps.push(v); i++; break;
      case "--drag": a.drag = v; i++; break;
      case "--by": a.by = v.split(",").map(Number); i++; break;
      case "--report": a.report = v; i++; break;
      case "--targets": a.targets = true; break;
      case "--min": a.min = parseInt(v, 10); i++; break;
      case "--scope": a.scope = v; i++; break;
      case "--full": a.full = true; break;
      default: break;
    }
  }
  return a;
}

const a = parseArgs(process.argv.slice(2));
validateReadiness(a);
if (!a.url || !a.out || !["iphone", "android"].includes(a.device)) {
  console.error("required: --device iphone|android, --url and --out");
  process.exit(2);
}

const devices = loadDevices();
const descriptor = a.device === "iphone"
  ? devices["iPhone 15"] ?? devices["iPhone 14"]
  : devices["Pixel 7"] ?? devices["Pixel 5"];
const notes = [];
let engine = a.engine ?? (a.device === "iphone" ? "webkit" : "chromium");
let browser;
let where;
try {
  ({ browser, where } = await launchBrowser(engine));
} catch (error) {
  if (engine !== "webkit") throw error;
  // Local WebKit needs system libraries most machines lack; Docker avoids that. Say so rather than pretend.
  notes.push(`WebKit failed: ${error.message}. This ran in ` +
    "Chromium at iPhone size. Safari-only behaviour was NOT tested. Install Docker to test in WebKit.");
  engine = "chromium";
  ({ browser, where } = await launchBrowser("chromium"));
}
try {
const { defaultBrowserType: _ignored, ...contextOptions } = descriptor;
const ctx = await browser.newContext(engine === "webkit" ? contextOptions : { ...contextOptions, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(a.url, { waitUntil: "domcontentloaded" });
try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { /* live connections never go idle */ }
if (a.wait) await page.waitForTimeout(a.wait);

for (const target of a.taps) {
  const byName = page.getByRole("button", { name: new RegExp(`^${escapeRe(target)}$`, "i") });
  const element = (await byName.count()) ? byName.first() : page.locator(target).first();
  await element.scrollIntoViewIfNeeded();
  await element.tap();
  await page.waitForTimeout(400);
}

let input = null;
if (a.drag) {
  const [dx, dy] = a.by ?? [0, 0];
  const handle = page.locator(a.drag).first();
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error(`--drag target not visible: ${a.drag}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const steps = 8;
  if (engine === "chromium") {
    // Real touch input through the browser's touch pipeline (pointer + touch events, touch-action honoured).
    const cdp = await ctx.newCDPSession(page);
    const point = (i) => [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(0) });
    for (let i = 1; i <= steps; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(i) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    input = "touch (Chromium touch pipeline)";
  } else {
    // Playwright can only tap in WebKit, so drags use the mouse there.
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps }); await page.mouse.up();
    input = "mouse (WebKit cannot drag by touch here; use --engine chromium for a touch drag)";
  }
  await page.waitForTimeout(300);
}

const readiness = await waitForReady(page, a);
let targets = null;
if (a.targets) {
  const min = a.min ?? (a.device === "iphone" ? 44 : 48);
  targets = await page.evaluate(({ min, scope }) => {
    const root = scope ? document.querySelector(scope) : document.body;
    if (!root) return { min, checked: 0, undersized: [] };
    const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [contenteditable="true"]';
    const undersized = [];
    let checked = 0;
    for (const element of root.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === "hidden" || element.closest("[hidden], [aria-hidden='true'], [inert]")) continue;
      // Off-canvas (e.g. a closed drawer): not reachable by touch right now.
      if (rect.right <= 0 || rect.left >= innerWidth) continue;
      // Links inside running text are exempt (WCAG 2.5.8).
      if (element.tagName === "A" && style.display === "inline") continue;
      checked++;
      if (rect.width >= min && rect.height >= min) continue;
      const name = (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || element.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      undersized.push({ name, tag: element.tagName.toLowerCase(), width: Math.round(rect.width), height: Math.round(rect.height) });
      // Marked on the element itself, so the outline moves with panels that scroll internally.
      element.setAttribute("data-touch-audit", `${Math.round(rect.width)}×${Math.round(rect.height)}`);
      element.style.setProperty("outline", "2px solid #e11d48", "important");
      element.style.setProperty("outline-offset", "-1px", "important");
      element.style.setProperty("box-shadow", "inset 0 0 0 999px rgba(225,29,72,.12)", "important");
    }
    return { min, checked, undersized };
  }, { min, scope: a.scope });
  notes.push("Sizes are each element's own box. A larger invisible hit area (e.g. a ::after) is not counted, so check flagged items by eye.");
}

const report = a.report ? await evaluateBounded(page, a.report, a['ready-timeout']) : undefined;
await page.screenshot({ path: a.out, fullPage: !!a.full });
notes.push("System UI (keyboard, text magnifier, callout menus, haptics) never appears in an emulated browser. Check those on a real device.");

console.log(JSON.stringify({
  saved: a.out,
  device: a.device,
  engine,
  browser: where,
  viewport: descriptor.viewport,
  input,
  report,
  targets,
  pageErrors: errors,
  readiness,
  notes,
}, null, 2));
} finally { await browser.close(); }

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

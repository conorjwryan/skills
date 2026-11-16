---
name: visual-verify
description: "Drive a real headless browser (Playwright: Chromium, or WebKit for iPhone; run in Playwright's Docker image when Docker is installed) to screenshot a running web app at a chosen device viewport, look at the result, and confirm something actually renders/works — or produce a labelled side-by-side BEFORE/AFTER composite for a visual change. Use whenever the user asks to visually verify something, see how a page/component looks, check a UI at a phone/tablet width, screenshot the app, get a before-and-after of a styling change, or test mobile touch on iOS/Android (touch-target sizes, tapping, dragging/resizing by finger). Works in any project. Uses the Playwright library via Node scripts in scripts/ — there is NO Playwright MCP here."
metadata:
  version: "1.1.0"
---

# Visual verify

Version: **1.1.0**. Versions before 1.0.0 are not tracked in this repository.

Look at the **real running app** in a headless browser and report honestly on what you see.
Two modes:

- **Verify (default)** — capture one (or a few) screenshots of the current state and *read them
  yourself* to confirm a feature renders, a fix worked, or a layout is right at a given width.
- **Before/after** — for a visual change, toggle the change off and on and produce a single
  labelled side-by-side BEFORE/AFTER composite.
- **Touch (iOS / Android)** — emulate a phone, tap and drag with a finger, and audit touch-target
  sizes. See *Mobile touch checks* below.

Pick the mode from what the user asked. "Does this look right / is it working / show me at phone
width" → verify. "Before and after / did this fix it visually" → before/after.

## When the user asks, do it

When the user asks you to **visually verify** something (or screenshot / check how it looks), that
request *is* your go-ahead — run the full check yourself: capture, read the image(s), and state
plainly whether it's right. Don't just offer and stop.

Do **not** run this unprompted on your own initiative after every change — it drives a browser and
reads images, which costs tokens. After an unrequested visual change you may *offer* it ("want a
before/after composite — mobile, desktop, or both?") and let the user decide.

## Show what you verified — every time

The user must be able to see the result without opening files. In the reply that reports the
work, **show the after image for every feature you verified** — one image per feature, so three
things checked means at least three images. Put each image next to a one-line caption saying what
it shows and whether it is right (e.g. *"Delete confirmation, phone width — focus on Cancel"*).

- Show images inline with Markdown and an absolute path, `![caption](/abs/path/to/image.png)`,
  where the client renders them. Otherwise attach them (e.g. SendUserFile). Always also give the path.
- Pick the clearest shot: crop or clip to the feature where the full page would bury it.
- For a before/after, show the composite.
- If something could not be shown honestly (system UI, safe-area), say so instead of showing a
  misleading image.

## Always look at what you captured

The screenshot is not the deliverable — your **verified judgement** is. Read every image you
capture before reporting, and before sending a composite, so you can confirm it actually shows what
you claim. If it doesn't show what you expected, investigate; don't report success off an unread shot.

## Pick the right viewport — this matters

A responsive bug often only reproduces at one specific width. **Match the user's device.**
If they sent a screenshot, derive the CSS width:

```
css_width = screenshot_pixel_width / devicePixelRatio
```

Modern iPhones are **DPR 3** (e.g. a 1320px-wide screenshot ⇒ 440 CSS px; Pro Max class).
Common Android is DPR ~2.6–3. When unsure, **sweep a few widths** (e.g. 320, 360, 390, 440) —
the screenshot script makes this cheap. Pass `--mobile` for touch/mobile emulation. For a general
design change that applies at all widths, check **both desktop and mobile**.

## The scripts (run with Bash; there is no MCP)

Don't look for a `browser_*` / Playwright MCP tool — it isn't installed. Everything runs through
plain Node scripts. Resolve the absolute directory containing this installed `SKILL.md`,
then set `VISUAL_VERIFY_DIR` to that directory in your shell. This may be a project installation
or a global installation; use the copy whose instructions you are reading, not a hardcoded
global path. Keep the working directory at the app project root. Reuse this variable in each
shell command (or set it again if shell state is not preserved):

```sh
VISUAL_VERIFY_DIR="/absolute/path/to/installed/visual-verify"
```

The bundled scripts are:

```
"$VISUAL_VERIFY_DIR/scripts/screenshot.mjs"   # capture a URL → png
"$VISUAL_VERIFY_DIR/scripts/composite.mjs"     # two pngs → labelled before/after
"$VISUAL_VERIFY_DIR/scripts/touch.mjs"         # phone touch: tap, drag, target audit
```

**Runtime and browser setup.** This skill owns an exact Playwright dependency and lockfile.
It never resolves a global or project Playwright package. Run the installer explicitly after
installing or updating the skill; normal checks never download packages, images or browsers.
Use Node.js 20+, npm and Bash. Do not install host system packages for this skill.

**Where the browser runs.** With Docker available, each launch starts its own container from
the exact matching, already installed Playwright image. Docker allocates a unique loopback
port; the helper verifies its container identity and connects to that endpoint. The skill's
installed Node dependencies are mounted read-only, so the server needs no package downloads.
Playwright forwards loopback requests to the client, allowing local app URLs without host
networking. Normal close, startup failure and handled termination clean up only that run's
container. A hard kill or host crash may leave a labelled container; inspect ownership before
explicit cleanup. No pre-existing containers are replaced or stopped. Docker Desktop/macOS
networking still requires separate validation; do not claim it from a Linux check.

Without Docker, the helper uses installed local browser binaries. Set `VISUAL_VERIFY_DOCKER=0`
to force local mode; the launch API also accepts an explicit backend. JSON output names the
actual backend and version.

### Supported launcher for project scripts

```js
// Resolve this import relative to the installed skill directory.
const { launchBrowser } = await import("<installed-skill>/scripts/load-playwright.mjs");
const { browser, where } = await launchBrowser("chromium", {
  backend: "auto", // auto, docker, local
  timeout: 30000,
  launchOptions: { headless: true },
});
try {
  // Use browser.newContext(), etc. Report `where` with the evidence.
} finally {
  await browser.close();
}
```

`launchOptions` go to local `launch` or the pinned Docker server browser-launch request. The full Playwright server enables the requested client loopback forwarding; Docker owns the server
host and port; host-specific executable paths and other machine-specific options are the
caller's responsibility. Existing `loadChromium()` and `loadBrowser(name)` exports remain
**local-only compatibility APIs**: they neither launch Docker nor repair missing browsers.
Migrate callers deliberately rather than assuming setup changes their behaviour.

Docker launches use a fresh, uniquely named server container for each call. Docker atomically
allocates a loopback port; the client validates container metadata and connects to its reported
WebSocket path. Playwright forwards client loopback traffic, preserving access to local dev apps
without host networking. Containers are removed on close, startup failure and handled termination.
This trades warm-server reuse for endpoint isolation; older shared-port containers are left alone.
A forced kill or Docker failure can leave an orphan. Inspect doctor output and verify the exact
container's ownership before explicitly removing it; never stop all matching processes/containers.
Cross-platform Docker behaviour still requires independent validation.


`screenshot.mjs` flags: `--url --out [--width 390] [--height 844] [--dpr 2] [--mobile]
[--wait 2000] [--click "Text or selector"] [--scroll-bottom "sel"] [--eval "js"]
[--clip x,y,w,h] [--full]`. `--click` is repeatable and matches a button's accessible name first,
then a CSS selector — use it to reach a state behind a tab/menu/dialog.

### One-time install (per machine)

```sh
bash "$VISUAL_VERIFY_DIR/scripts/install.sh"
```

Installs the locked dependency into this skill's own `node_modules`. The default `auto` setup
pulls the matching Docker image if Docker is available; otherwise it installs local Chromium.
Pass `docker` or `local` to the installer to select explicitly. Local WebKit is not installed
by this command. No global npm packages or system packages are changed.

Inspect prerequisites without starting browsers, pulling images or changing containers:

```sh
node "$VISUAL_VERIFY_DIR/scripts/doctor.mjs"
```

Doctor reports the skill/runtime version, runtime path, local executable presence, Docker
image availability and active Visual Verify containers/endpoints (including legacy names). Its exit status checks Chromium
prerequisites for the selected default backend; it does not prove browser launch or WebKit
availability. Installing files and successfully launching a browser are separate evidence.

Verify with:

```sh
node "$VISUAL_VERIFY_DIR/scripts/screenshot.mjs" \
  --url https://example.com --out /tmp/_vv_check.png --width 390 --height 844
```

Inspect the image and backend JSON to confirm that this smoke check worked.

## Wait for the state being checked

Screenshot and touch commands support these **post-action** options:

- `--ready-selector "<selector>"`: wait for the first matching element to be visible.
- `--ready-js "<expression>"`: poll until a page expression (including a promise) is truthy.
- `--ready-timeout 10000`: positive readiness timeout in milliseconds; shared by the
  selector and predicate waits. Also bounds `--eval` and `--report` evaluation separately.
- `--settle 0`: optional nonnegative delay after readiness for animation.

These conditions run after all clicks/taps, scrolling, evaluation and dragging, before audit
and capture. Both conditions, when provided, must pass. A failure exits nonzero and does not
write a new success screenshot (an existing output file is not removed). Choose unique output
paths. `--wait` retains its legacy pre-action delay; fixed click/drag delays remain compatibility
settles, not evidence of readiness. State what the selected condition proves.

```sh
node "$VISUAL_VERIFY_DIR/scripts/screenshot.mjs" \
  --url "<local-app-url>" --out visual-checks/search-desktop.png \
  --click "Search" --ready-selector "[data-search-results]" \
  --ready-js "document.querySelectorAll('[data-result]').length > 0"
```

Use a condition specific to the expected new state, not a stale element already on the page.
For intermediate steps requiring async results, use the launch API and Playwright locators
with assertions between actions. If waiting for a response, register the wait before triggering
its request and then assert the rendered state; a response alone does not prove rendering.
Do not treat arbitrary delays or network-idle as completion guarantees for debounced apps.

## Output location

Write generated images to a gitignored **`visual-checks/`** at the repo root (`mkdir -p
visual-checks`). If you're not in a repo, or don't want to add files to it, use a temp dir instead.
Reference the stable paths when sending files to the user.

Give every image from one run a shared `<change>` prefix describing what's shown (e.g.
`import-export-tab`, `header-nav`) — not generic `before.png`/`after.png` — so a glance at the
directory says which run a file belongs to:

```
visual-checks/<change>-<viewport>.png                 # verify mode: a single shot
visual-checks/<change>-<viewport>-before.png          # before/after mode
visual-checks/<change>-<viewport>-after.png
visual-checks/<change>-<viewport>-before-after.png    # the composite
```

where `<viewport>` is `mobile` or `desktop`.

## Workflow — verify mode

1. Make sure the app is running and you have its URL (start it the way this project runs — see
   *Running the app* below). `mkdir -p visual-checks`.
2. Capture the state to check, reaching it with `--click` / `--eval` / `--scroll-bottom` if needed:
   ```sh
   node "$VISUAL_VERIFY_DIR/scripts/screenshot.mjs" \
     --url "<running app url>" --out visual-checks/<change>-mobile.png \
     --width 440 --height 800 --mobile --wait 2000
   ```
   Sweep a few widths, or drop `--mobile` and use e.g. `--width 1280 --height 800` for desktop, as needed.
3. **Read each image** and report plainly whether it's right. If verifying a fix, confirm the
   broken thing is actually gone; if a feature, confirm it actually renders.
4. Show the relevant shot(s) in your reply — one per feature (see *Show what you verified*).

## Workflow — before/after mode

1. Confirm scope and viewport(s). `mkdir -p visual-checks`. Pick the shared `<change>` prefix.
2. **Capture AFTER** — the working tree already has the change:
   ```sh
   node "$VISUAL_VERIFY_DIR/scripts/screenshot.mjs" \
     --url "<running app url>" --out visual-checks/<change>-mobile-after.png \
     --width 440 --height 800 --mobile --wait 2000
   ```
   For desktop, drop `--mobile`, use e.g. `--width 1280 --height 800`, and the `-desktop-after.png` suffix.
3. **Capture BEFORE** — temporarily undo *only the visual change*, screenshot to
   `<change>-<viewport>-before.png`, then restore. Prefer git so you can't forget to restore:
   - Uncommitted change: `git stash push -- <file>` → screenshot → `git stash pop`
   - Committed change:   `git show HEAD~1:<path> > <path>` (or `git checkout <parent> -- <file>`)
                         → screenshot → `git checkout -- <file>`
   Wait for the dev server to hot-reload between toggle and shot (`--wait`).
4. **Composite** — same prefix, `-before-after.png` suffix:
   ```sh
   node "$VISUAL_VERIFY_DIR/scripts/composite.mjs" \
     --before visual-checks/<change>-mobile-before.png --after visual-checks/<change>-mobile-after.png \
     --out visual-checks/<change>-mobile-before-after.png \
     --title "Header at 440px (iPhone width)" \
     --before-label "BEFORE — title squished" \
     --after-label  "AFTER — title full width"
   ```
5. **Read the composite**, confirm it shows what you claim, then show it in your reply.
6. **Restore the BEFORE toggle.** Never commit or deploy with the temporary BEFORE change still
   applied — re-check `git status` / `git diff` before finishing.

## Mobile touch checks (iOS and Android)

`touch.mjs` drives a phone-shaped browser with touch input:

```sh
S="$VISUAL_VERIFY_DIR/scripts/touch.mjs"
# Touch-target audit: undersized controls outlined red, sizes listed in the JSON
node "$S" --device android --url "<url>" --out visual-checks/<change>-targets-android.png --targets
# Finger-drag a handle and read back the result
node "$S" --device android --url "<url>" --out visual-checks/<change>-drag-android.png \
  --tap "Open editor" --tap ".editor img" --drag ".resize-handle" --by -40,0 \
  --report "document.querySelector('.editor img').width"
# iPhone (Safari engine)
node "$S" --device iphone --url "<url>" --out visual-checks/<change>-iphone.png --targets
```

- `--device iphone` uses WebKit (Safari's engine) with an iPhone 15 preset; `android` uses
  Chromium with a Pixel 7 preset. `--tap` is repeatable; `--targets` takes `--min` (default 44 px
  for iPhone, 48 px for Android, the platforms' minimums) and `--scope "<selector>"`.
- **Touch drags are real only in Chromium.** WebKit drags fall back to the mouse; the JSON
  `input` field says which was used. Test drag behaviour with `--device android` (or
  `--device iphone --engine chromium` for iPhone size).
- WebKit runs in Docker. Without Docker it usually can't start (it needs system libraries most
  machines lack); the script then runs Chromium at iPhone size and says so in `notes`. Report that
  plainly — Safari-only behaviour was not tested — and suggest Docker, not system packages.
- The audit measures each element's own box. A bigger invisible hit area (e.g. a `::after`)
  is not counted, so check flagged items by eye before calling them bugs.
- Don't use `--full` in apps that scroll inside a panel: the part below the fold renders blank.
- **System UI is never visible in an emulated browser:** the on-screen keyboard, the iOS text
  magnifier, callout menus, haptics. Say these still need a real device (or the iOS Simulator on a
  Mac, or a device cloud such as BrowserStack) — don't claim them as verified.

## Honesty rules (important)

- **`env(safe-area-inset-*)` is always 0 in a headless browser** (no notch/home indicator).
  Safe-area fixes are pixel-identical before/after unless you **simulate** the inset. If you show
  one, label it plainly as simulated — don't pass it off as a device capture.
- Reproduce in the **real running app**, not a hand-built HTML mock of the UI.
- Use only local/dev data. You may freely add, edit, and seed **local dev** data to make the point
  honest and clear (populate an empty state, add fields so a modal overflows). **Never change
  production data**, and never point these screenshots at a production URL.
- If you can't show something honestly (see safe-area), say so rather than faking a mock.

## Running the app

Start the app the way this project does — check its README / CLAUDE.md / AGENTS.md / `package.json`
scripts (e.g. `npm run dev`, `pnpm dev`, a `make` target) for the dev command and the local URL/port.
Seed any fixtures the project documents. If a dev server is already running, just reuse its URL.

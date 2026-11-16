---
name: visual-verify
description: Drive a real headless browser (Playwright: Chromium, or WebKit for iPhone; run in Playwright's Docker image when Docker is installed) to screenshot a running web app at a chosen device viewport, look at the result, and confirm something actually renders/works — or produce a labelled side-by-side BEFORE/AFTER composite for a visual change. Use whenever the user asks to visually verify something, see how a page/component looks, check a UI at a phone/tablet width, screenshot the app, get a before-and-after of a styling change, or test mobile touch on iOS/Android (touch-target sizes, tapping, dragging/resizing by finger). Works in any project. Uses the Playwright library via Node scripts in scripts/ — there is NO Playwright MCP here.
---

# Visual verify

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
plain Node scripts. They live next to this file; reference them at the stable global path so the
commands work from any project:

```
~/.claude/skills/visual-verify/scripts/screenshot.mjs   # capture a URL → png
~/.claude/skills/visual-verify/scripts/composite.mjs     # two pngs → labelled before/after
~/.claude/skills/visual-verify/scripts/touch.mjs         # phone touch: tap, drag, target audit
```

**Where the browser runs.** If Docker is installed, the scripts run browsers inside Microsoft's
Playwright image (`mcr.microsoft.com/playwright:v<version>-noble`, matching the local Playwright
version). It already has Chromium, WebKit and all their system libraries, so **never install
extra system packages (e.g. `playwright install-deps`) for this skill — use Docker.** The
container is named `visual-verify-playwright-<version>`, uses host networking so it can open
`localhost` dev servers, and stays running for reuse (`docker stop` it to free memory). The first
run downloads the image (~2 GB, about a minute). Without Docker, local Playwright browsers are
used. `VISUAL_VERIFY_DOCKER=0` forces local. Every script's JSON says which was used (`browser`).

`screenshot.mjs` flags: `--url --out [--width 390] [--height 844] [--dpr 2] [--mobile]
[--wait 2000] [--click "Text or selector"] [--scroll-bottom "sel"] [--eval "js"]
[--clip x,y,w,h] [--full]`. `--click` is repeatable and matches a button's accessible name first,
then a CSS selector — use it to reach a state behind a tab/menu/dialog.

### One-time install (per machine)

```sh
bash ~/.claude/skills/visual-verify/scripts/install.sh
```

Installs the Playwright library globally (the scripts need it even when browsers run in Docker)
and, as a fallback for machines without Docker, the Chromium browser. It installs no system
packages. The scripts resolve Playwright from a local `node_modules` or the global npm root.
Verify with:

```sh
node ~/.claude/skills/visual-verify/scripts/screenshot.mjs \
  --url https://example.com --out /tmp/_vv_check.png --width 390 --height 844
```

If `/tmp/_vv_check.png` is written, you're good.

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
   node ~/.claude/skills/visual-verify/scripts/screenshot.mjs \
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
   node ~/.claude/skills/visual-verify/scripts/screenshot.mjs \
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
   node ~/.claude/skills/visual-verify/scripts/composite.mjs \
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
S=~/.claude/skills/visual-verify/scripts/touch.mjs
# Touch-target audit: undersized controls outlined red, sizes listed in the JSON
node $S --device android --url "<url>" --out visual-checks/<change>-targets-android.png --targets
# Finger-drag a handle and read back the result
node $S --device android --url "<url>" --out visual-checks/<change>-drag-android.png \
  --tap "Open editor" --tap ".editor img" --drag ".resize-handle" --by -40,0 \
  --report "document.querySelector('.editor img').width"
# iPhone (Safari engine)
node $S --device iphone --url "<url>" --out visual-checks/<change>-iphone.png --targets
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

### Appendix — if this is a Lakebed capsule (e.g. cmstron)

```sh
npx lakebed dev                                       # serves http://localhost:3000 (guest auth)
node scripts/local-dev-content.mjs seed --port 3000   # seed the Writing Lab fixture
```

**No auth toggles needed.** The local dev guest is always `guest:local`, the tracked fixture is
owned by `guest:local`, and the client treats the guest as signed-in on localhost — so a plain
`npx lakebed dev` + seed drops you into the authenticated app with seeded content visible. This
bypass is localhost-only; production still shows real guests the logged-out page, so there's nothing
to revert.

If seeding returns `{"error":"Not found"}`, the dev server booted as a different guest. Fix:
`npx lakebed auth reset`, restart `npx lakebed dev`, then seed. To enlarge seeded data without
touching the tracked fixture, copy it, add fields (keep `"ownerId": "guest:local"`), and seed the
copy: `node scripts/local-dev-content.mjs seed --port 3000 --fixture /tmp/expanded.json`.
Editor URL shape: `/sites/<siteId>/types/<typeId>/posts/<postId>` (ids via `npx lakebed db dump --port 3000`).
</content>

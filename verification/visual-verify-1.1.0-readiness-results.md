# Visual Verify 1.1.0 readiness and image verification

2026-11-16. Scope W1–W4/G1. Independent test run; no implementation fixes.

Candidate: `17f7efbd33da5d391b760dc10a5e0e9343ae3ec5`.
Baseline: `7ca31646e76c167d491f81e9285043ed7abdd3f4`.
Linux x86_64; Node v24.22.1; pinned Playwright 1.65.1; image digest `sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579`. Environment: [/tmp/vv-readiness-pfprCk/environment.txt](/tmp/vv-readiness-pfprCk/environment.txt).

## Release-facing verdict

**FAIL normal Docker launch; W1–W4/G1 end-to-end BLOCKED.** Unmodified screenshot, touch and composite CLIs fail before browser interaction. Readiness and image behaviour passes only in explicitly bypassed diagnostic runs below. No bypass is an end-to-end acceptance pass.

1. **Launch blocker:** mounted dependency `require('/runtime/playwright')` cannot resolve sibling `playwright-core`. Node searches `/runtime/node_modules`, rather than `/runtime`, for the dependency. Normal CLI errors often obscure this with `docker logs` reporting a dead/removed container. An owned foreground diagnostic container (same image, mount and launchServer expression) exposed `Cannot find module 'playwright-core'`; see [startup error](/tmp/vv-readiness-pfprCk/launch-diagnostic.log).
2. **Secondary blocker after dependency bypass:** `NODE_PATH=/runtime` permits browser launch, but a host fixture bound to `127.0.0.1` returns `net::ERR_CONNECTION_REFUSED` through the candidate's advertised loopback forwarding. Both Chromium and WebKit failed. This is an observation after the first bypass, not an independently proven root cause. See [first-run commands/results](/tmp/vv-readiness-pfprCk/loopback-attempt/results.json), [Chromium stderr](/tmp/vv-readiness-pfprCk/loopback-attempt/click-desktop.stderr), [WebKit stderr](/tmp/vv-readiness-pfprCk/loopback-attempt/drag-iphone.stderr).

Minimal primary reproduction after setup:

```bash
node /tmp/vv-readiness-pfprCk/candidate/visual-verify/scripts/screenshot.mjs --url about:blank --out /tmp/vv-readiness-pfprCk/unmodified.png
```

Exit 1; no screenshot/success JSON. [Exact unmodified commands and durations](/tmp/vv-readiness-pfprCk/unmodified-results.json), [screenshot stderr](/tmp/vv-readiness-pfprCk/unmodified-screenshot.stderr), [touch stderr](/tmp/vv-readiness-pfprCk/unmodified-touch.stderr), [composite command/duration](/tmp/vv-readiness-pfprCk/unmodified-composite.json), [composite stderr](/tmp/vv-readiness-pfprCk/unmodified-composite.stderr).

## Isolation and setup

Read verification plan and archived candidate SKILL.md plus all three CLI sources, loader and readiness helper. Archives created without worktrees:

```bash
mkdir -p /tmp/vv-readiness-pfprCk/candidate /tmp/vv-readiness-pfprCk/baseline
git -C /home/conor/code/skills archive 17f7efb | tar -x -C /tmp/vv-readiness-pfprCk/candidate
git -C /home/conor/code/skills archive 7ca3164 | tar -x -C /tmp/vv-readiness-pfprCk/baseline
bash /tmp/vv-readiness-pfprCk/candidate/visual-verify/scripts/install.sh docker > /tmp/vv-readiness-pfprCk/setup.log 2>&1
```

Setup exited 0: locked npm install (2 packages, npm reports 739ms), explicit pinned Docker pull, image already present. Total setup duration was not instrumented. [Full setup stdout/stderr](/tmp/vv-readiness-pfprCk/setup.log). No global npm/browser/system dependencies installed. All candidate source blobs still exactly match Git: [hash evidence](/tmp/vv-readiness-pfprCk/source-integrity.json).

## Diagnostic method (two explicit bypasses)

The temporary [docker wrapper](/tmp/vv-readiness-pfprCk/bin/docker) injects only `-e NODE_PATH=/runtime` into Docker run. No candidate source or dependency contents changed. After failed localhost runs were preserved under `loopback-attempt/`, the fixture was bound to Docker host bridge `172.17.0.1` on an OS-assigned port, rather than localhost. This keeps traffic on the local host bridge and avoids the forwarding failure. [Fixture HTML](/tmp/vv-readiness-pfprCk/fixture.html), [last fixture URL](/tmp/vv-readiness-pfprCk/fixture-url.txt).

The [reproducible harness](/home/conor/code/skills/verification/visual-verify-1.1.0-readiness-harness.py) starts/stops its own fixture, runs the actual unchanged CLI scripts, captures each subprocess's stdout/stderr separately, records monotonic durations and container snapshots, and applies an 85s outer guard. No outer guard fired. Run with:

```bash
python3 /home/conor/code/skills/verification/visual-verify-1.1.0-readiness-harness.py /tmp/vv-readiness-pfprCk
```

Use a fresh evidence directory/archive to preserve this run. The bridge IP is Linux-host-specific. Wrapper and explicit setup prerequisites are documented above and in the harness.

## Acceptance observations

| Scope | Normal CLI | Diagnostic observation |
| --- | --- | --- |
| W1 | BLOCKED launch | PASS: click and scroll delayed 900ms; screenshot shows CLICK READY / SCROLL READY. Async --eval awaited 700ms promise and shows EVAL READY. |
| W2 | BLOCKED for browser waits; invalid inputs PASS before launch | PASS: false predicate, missing selector, never-settling predicate/eval/report exit 1; empty stdout, no new PNG. Invalid timeouts 0, -1, NaN, Infinity, oops reject in ~0.08–0.11s. |
| W3 | BLOCKED launch | PASS: visible selector plus delayed async predicate succeeds; visible selector plus false predicate fails. Shared 1100ms condition budget leaves 589ms for never-settling predicate after delayed selector. 600ms settle captures completed 500ms animation. |
| W4 | BLOCKED launch | PASS: Android tap shows CLICK READY; Android drag reports pointerType touch and Chromium touch pipeline. Actual WebKit iPhone drag reports pointerType mouse and explicitly labels mouse provenance; no Chromium fallback. |
| G1 | BLOCKED launch | PASS diagnostics: desktop/mobile images inspected; labelled composite correct; sizes below; screenshot/touch JSON records browser/version/backend and input honestly. Composite emits only saved path, no backend provenance (existing limitation). |

Negative tests confirm no new screenshot and no success JSON. Failure cleanup evidence is container absence after each subprocess; this demonstrates no owned browser server container survives failures, rather than instrumenting whether finally called browser.close internally. Per-case containers are in results.json; each success JSON includes its unique owned name/endpoint.

## Commands, durations and raw evidence

All rows below except baseline use the two diagnostic bypasses. Exact argument vectors rendered as shell commands, exit codes and durations are preserved in [results.json](/tmp/vv-readiness-pfprCk/results.json). Each row's raw logs are linked below.

| Case | Exit | Seconds | stdout | stderr |
| --- | --- | --- | --- | --- |
| click-desktop | 0 | 5.375 | [log](/tmp/vv-readiness-pfprCk/click-desktop.stdout) | [log](/tmp/vv-readiness-pfprCk/click-desktop.stderr) |
| scroll-mobile | 0 | 4.103 | [log](/tmp/vv-readiness-pfprCk/scroll-mobile.stdout) | [log](/tmp/vv-readiness-pfprCk/scroll-mobile.stderr) |
| async-eval | 0 | 4.328 | [log](/tmp/vv-readiness-pfprCk/async-eval.stdout) | [log](/tmp/vv-readiness-pfprCk/async-eval.stderr) |
| false | 1 | 4.339 | [log](/tmp/vv-readiness-pfprCk/false.stdout) | [log](/tmp/vv-readiness-pfprCk/false.stderr) |
| never | 1 | 4.327 | [log](/tmp/vv-readiness-pfprCk/never.stdout) | [log](/tmp/vv-readiness-pfprCk/never.stderr) |
| missing | 1 | 4.165 | [log](/tmp/vv-readiness-pfprCk/missing.stdout) | [log](/tmp/vv-readiness-pfprCk/missing.stderr) |
| eval-never | 1 | 4.08 | [log](/tmp/vv-readiness-pfprCk/eval-never.stdout) | [log](/tmp/vv-readiness-pfprCk/eval-never.stderr) |
| both-false | 1 | 4.234 | [log](/tmp/vv-readiness-pfprCk/both-false.stdout) | [log](/tmp/vv-readiness-pfprCk/both-false.stderr) |
| budget | 1 | 4.817 | [log](/tmp/vv-readiness-pfprCk/budget.stdout) | [log](/tmp/vv-readiness-pfprCk/budget.stderr) |
| invalid-0 | 1 | 0.106 | [log](/tmp/vv-readiness-pfprCk/invalid-0.stdout) | [log](/tmp/vv-readiness-pfprCk/invalid-0.stderr) |
| invalid--1 | 1 | 0.088 | [log](/tmp/vv-readiness-pfprCk/invalid--1.stdout) | [log](/tmp/vv-readiness-pfprCk/invalid--1.stderr) |
| invalid-NaN | 1 | 0.087 | [log](/tmp/vv-readiness-pfprCk/invalid-NaN.stdout) | [log](/tmp/vv-readiness-pfprCk/invalid-NaN.stderr) |
| invalid-Infinity | 1 | 0.08 | [log](/tmp/vv-readiness-pfprCk/invalid-Infinity.stdout) | [log](/tmp/vv-readiness-pfprCk/invalid-Infinity.stderr) |
| invalid-oops | 1 | 0.086 | [log](/tmp/vv-readiness-pfprCk/invalid-oops.stdout) | [log](/tmp/vv-readiness-pfprCk/invalid-oops.stderr) |
| tap-android | 0 | 4.746 | [log](/tmp/vv-readiness-pfprCk/tap-android.stdout) | [log](/tmp/vv-readiness-pfprCk/tap-android.stderr) |
| drag-android | 0 | 5.156 | [log](/tmp/vv-readiness-pfprCk/drag-android.stdout) | [log](/tmp/vv-readiness-pfprCk/drag-android.stderr) |
| drag-iphone | 0 | 6.631 | [log](/tmp/vv-readiness-pfprCk/drag-iphone.stdout) | [log](/tmp/vv-readiness-pfprCk/drag-iphone.stderr) |
| touch-never | 1 | 3.426 | [log](/tmp/vv-readiness-pfprCk/touch-never.stdout) | [log](/tmp/vv-readiness-pfprCk/touch-never.stderr) |
| baseline-click | 0 | 2.409 | [log](/tmp/vv-readiness-pfprCk/baseline-click.stdout) | [log](/tmp/vv-readiness-pfprCk/baseline-click.stderr) |
| composite | 0 | 3.507 | [log](/tmp/vv-readiness-pfprCk/composite.stdout) | [log](/tmp/vv-readiness-pfprCk/composite.stderr) |

## Baseline timing reproduction

Baseline unchanged screenshot CLI ran **locally inside an explicitly owned disposable 1.65.1 image container**, with the temporary pinned runtime exposed through NODE_PATH. It did not invoke its Docker launcher: VISUAL_VERIFY_DOCKER=0. No baseline dependency/global repair or fixed-port server was used. This compares CLI timing with a common browser runtime, not historical browser pixels.

The fixture starts INITIAL, updates 900ms after click. Baseline fixed 400ms delay captures INITIAL, while candidate explicit selector + async predicate + settle captures CLICK READY. Both outputs and the labelled composite were inspected. Baseline reproduction PASS. Full command in results.json (`baseline-click`). The baseline container uses a unique name and --rm, host networking only to reach the isolated host fixture; shared port 39123 is untouched.

## Inspected images

All images listed below were opened using view_image and visually inspected. Correct state text is visible. Desktop completed animation sits at x=140 (20px left edge +120px translation). Mobile scroll/tap without settle may capture the in-progress animation, as expected; readiness is not an automatic animation completion detector. WebKit drag leaves a small text selection highlight; it is a real mouse drag and honestly labelled.

| Image | Pixel dimensions |
| --- | --- |
| [composite.png](/tmp/vv-readiness-pfprCk/composite.png) | 2000 × 1400 |
| [baseline-click.png](/tmp/vv-readiness-pfprCk/baseline-click.png) | 1000 × 650 |
| [drag-iphone.png](/tmp/vv-readiness-pfprCk/drag-iphone.png) | 1179 × 1977 |
| [drag-android.png](/tmp/vv-readiness-pfprCk/drag-android.png) | 1082 × 2202 |
| [tap-android.png](/tmp/vv-readiness-pfprCk/tap-android.png) | 1082 × 2202 |
| [async-eval.png](/tmp/vv-readiness-pfprCk/async-eval.png) | 390 × 844 |
| [scroll-mobile.png](/tmp/vv-readiness-pfprCk/scroll-mobile.png) | 390 × 700 |
| [click-desktop.png](/tmp/vv-readiness-pfprCk/click-desktop.png) | 1000 × 650 |

Composite labels clearly identify BASELINE fixed 400ms versus CANDIDATE readiness + settle, with a diagnostic-backend title. Screenshot mobile CSS 390×700 at DPR1 yields 390×700; Pixel7 CSS 412×839 at DPR2.625 yields 1082×2202; iPhone15 CSS393×659 DPR3 yields1179×1977. Desktop1000×650 DPR1 correct. Composite1000 CSS width DPR2 yields2000px width. No pixel-identity assertion across engines.

## Cleanup and limits

Preexisting container IDs retained after fixture harness: **True**. [Before](/tmp/vv-readiness-pfprCk/containers-before.jsonl), [after](/tmp/vv-readiness-pfprCk/containers-after.jsonl). Legacy shared container `fcf98a3e12eb7ecd645663468b671b8cb26bbbc157137a88144939fb382a378b` remains present. Foreground diagnostic container `vv-readiness-pfprCk-diagnose` was explicitly removed after exit; baseline container removed itself; candidate per-run containers disappear after success/failure. Fixture server shutdown and server_close execute in finally. No unrelated process/container terminated. No skill implementation, Postie, global dependencies/symlinks, Git index/history/branches, or production changed; only harness/report added to verification/. No commits or pushes.

Linux diagnostic evidence only. Native local backend and macOS not verified in this scope. W1–W4/G1 remain blocked for normal Docker CLI acceptance until the launcher is fixed and rerun; this report implements no fixes.

Final post-test snapshot: [/tmp/vv-readiness-pfprCk/containers-final.jsonl](/tmp/vv-readiness-pfprCk/containers-final.jsonl). Fixture port no longer accepts TCP: True.

Startup diagnostic exact command (container was removed afterward with `docker rm vv-readiness-pfprCk-diagnose`):

```bash
docker run --name vv-readiness-pfprCk-diagnose --init --ipc=host --user pwuser --workdir /home/pwuser --mount type=bind,source=/tmp/vv-readiness-pfprCk/candidate/visual-verify/node_modules,target=/runtime,readonly mcr.microsoft.com/playwright:v1.65.1-noble node -e "const {chromium}=require('/runtime/playwright');chromium.launchServer({headless:true,port:3000,host:'0.0.0.0'}).then(s=>console.log(s.wsEndpoint())).catch(e=>{console.error(e);process.exit(1)});" > /tmp/vv-readiness-pfprCk/launch-diagnostic.log 2>&1
```

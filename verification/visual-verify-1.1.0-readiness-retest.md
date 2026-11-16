# Visual Verify 1.1.0 fixed snapshot readiness retest

2026-11-16, independent Sol/medium test-only run. **PASS W1–W4/G1 and composite provenance on Linux Docker. No new material failures found in this scope.** This is one independent test, not a claim that two tests ran here.

Candidate is the exact uncommitted snapshot /tmp/vv-fixed-candidate-wljc4hza/visual-verify, based on 17f7efbd33da5d391b760dc10a5e0e9343ae3ec5. Baseline 7ca31646e76c167d491f81e9285043ed7abdd3f4. Read prior readiness/runtime reports and acceptance plan; historical diagnostic harness retained.

The candidate supported API and all three actual CLIs launch through the full Playwright server with the proper dependency mount. Candidate requests use an ordinary fixture bound only to host 127.0.0.1. No PATH wrapper, NODE_PATH repair, bridge IP, host-network override, or source edit was used for the candidate. Node v24.22.1, Playwright 1.65.1, mcr.microsoft.com/playwright:v1.65.1-noble, digest sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579. Exact image metadata: [image.json](/tmp/vv-retest-independent-1116b/image.json).

## Acceptance

| Scope | Result and evidence |
|---|---|
| W1 | PASS: 900ms delayed click/scroll and 700ms asynchronous eval captured CLICK READY, SCROLL READY, EVAL READY. |
| W2 | PASS: false predicate, missing selector, never-settling readiness/eval/report all exit 1, bounded; no new PNG or success JSON. Both CLIs reject timeout 0, -1, NaN, Infinity, oops before browser launch. Touch also rejects invalid settle values. |
| W3 | PASS: visible selector plus asynchronous predicate succeeds; visible selector plus false predicate fails. Shared 1100ms budget leaves 589ms for predicate after delayed selector (budget.stderr). Optional 600ms settle captures completed 500ms animation at x=140 CSS pixels. Without settle, mobile can correctly capture animation in progress. |
| W4 | PASS: delayed Android tap/drag completes. Chromium drag report contains actual pointerType touch; actual WebKit (no fallback) report contains mouse and explicitly says mouse input. |
| G1 | PASS: desktop/mobile/composite images inspected; expected states, sizes and legible labels. Composite stdout is JSON with saved path and actual Docker/Playwright backend provenance. |
| Baseline | PASS reproduction: unchanged baseline fixed 400ms click captures INITIAL while candidate captures CLICK READY. |

The baseline alone uses an explicitly labelled workaround: original baseline CLI runs local inside a uniquely owned pinned container, VISUAL_VERIFY_DOCKER=0, NODE_PATH=/runtime, read-only mounted temporary pinned dependencies and host networking to reach the same loopback fixture. No baseline fixed-port launcher was invoked; no candidate acceptance relies on this workaround. This compares readiness behavior using a common pinned browser runtime, not historical pixel identity.

## Reproduction and raw evidence

Harness: [visual-verify-1.1.0-retest-harness.py](/home/conor/code/skills/verification/visual-verify-1.1.0-retest-harness.py). It copies the uncommitted snapshot excluding node_modules, checks every source hash against its manifest, archives baseline from Git, installs pinned dependencies/image explicitly into the temporary copy, starts its owned fixture, runs supported API/CLIs, and closes fixture in finally. Run with a fresh nonexistent directory:

```bash
python3 /home/conor/code/skills/verification/visual-verify-1.1.0-retest-harness.py /tmp/visual-verify-fresh-evidence /tmp/vv-fixed-candidate-wljc4hza
```

The retained harness adds baseline-container cleanup on interruption, a fresh-directory guard, success-JSON metadata and closed-port metadata after this execution; these do not change any tested CLI arguments. Exact executed commands/durations/raw stdout/stderr paths and per-case container inventory are in [results.json](/tmp/vv-retest-independent-1116b/results.json). Post-run assertions: [assertions.json](/tmp/vv-retest-independent-1116b/assertions.json). Fixture HTML and URL retained alongside them. An 85s subprocess guard never fired.

| Case | Exit | Seconds | Raw stdout / stderr |
|---|---|---|---|
| setup | 0 | 1.418 | [setup.stdout](/tmp/vv-retest-independent-1116b/setup.stdout) / [setup.stderr](/tmp/vv-retest-independent-1116b/setup.stderr) |
| doctor | 0 | 0.819 | [doctor.stdout](/tmp/vv-retest-independent-1116b/doctor.stdout) / [doctor.stderr](/tmp/vv-retest-independent-1116b/doctor.stderr) |
| supported-api | 0 | 3.426 | [supported-api.stdout](/tmp/vv-retest-independent-1116b/supported-api.stdout) / [supported-api.stderr](/tmp/vv-retest-independent-1116b/supported-api.stderr) |
| click-desktop | 0 | 5.669 | [click-desktop.stdout](/tmp/vv-retest-independent-1116b/click-desktop.stdout) / [click-desktop.stderr](/tmp/vv-retest-independent-1116b/click-desktop.stderr) |
| scroll-mobile | 0 | 4.937 | [scroll-mobile.stdout](/tmp/vv-retest-independent-1116b/scroll-mobile.stdout) / [scroll-mobile.stderr](/tmp/vv-retest-independent-1116b/scroll-mobile.stderr) |
| async-eval | 0 | 4.389 | [async-eval.stdout](/tmp/vv-retest-independent-1116b/async-eval.stdout) / [async-eval.stderr](/tmp/vv-retest-independent-1116b/async-eval.stderr) |
| false | 1 | 4.495 | [false.stdout](/tmp/vv-retest-independent-1116b/false.stdout) / [false.stderr](/tmp/vv-retest-independent-1116b/false.stderr) |
| never | 1 | 4.532 | [never.stdout](/tmp/vv-retest-independent-1116b/never.stdout) / [never.stderr](/tmp/vv-retest-independent-1116b/never.stderr) |
| missing | 1 | 4.68 | [missing.stdout](/tmp/vv-retest-independent-1116b/missing.stdout) / [missing.stderr](/tmp/vv-retest-independent-1116b/missing.stderr) |
| eval-never | 1 | 4.761 | [eval-never.stdout](/tmp/vv-retest-independent-1116b/eval-never.stdout) / [eval-never.stderr](/tmp/vv-retest-independent-1116b/eval-never.stderr) |
| both-false | 1 | 4.721 | [both-false.stdout](/tmp/vv-retest-independent-1116b/both-false.stdout) / [both-false.stderr](/tmp/vv-retest-independent-1116b/both-false.stderr) |
| budget | 1 | 5.484 | [budget.stdout](/tmp/vv-retest-independent-1116b/budget.stdout) / [budget.stderr](/tmp/vv-retest-independent-1116b/budget.stderr) |
| invalid-0 | 1 | 0.082 | [invalid-0.stdout](/tmp/vv-retest-independent-1116b/invalid-0.stdout) / [invalid-0.stderr](/tmp/vv-retest-independent-1116b/invalid-0.stderr) |
| invalid--1 | 1 | 0.076 | [invalid--1.stdout](/tmp/vv-retest-independent-1116b/invalid--1.stdout) / [invalid--1.stderr](/tmp/vv-retest-independent-1116b/invalid--1.stderr) |
| invalid-NaN | 1 | 0.082 | [invalid-NaN.stdout](/tmp/vv-retest-independent-1116b/invalid-NaN.stdout) / [invalid-NaN.stderr](/tmp/vv-retest-independent-1116b/invalid-NaN.stderr) |
| invalid-Infinity | 1 | 0.075 | [invalid-Infinity.stdout](/tmp/vv-retest-independent-1116b/invalid-Infinity.stdout) / [invalid-Infinity.stderr](/tmp/vv-retest-independent-1116b/invalid-Infinity.stderr) |
| invalid-oops | 1 | 0.073 | [invalid-oops.stdout](/tmp/vv-retest-independent-1116b/invalid-oops.stdout) / [invalid-oops.stderr](/tmp/vv-retest-independent-1116b/invalid-oops.stderr) |
| tap-android | 0 | 5.058 | [tap-android.stdout](/tmp/vv-retest-independent-1116b/tap-android.stdout) / [tap-android.stderr](/tmp/vv-retest-independent-1116b/tap-android.stderr) |
| drag-android | 0 | 5.475 | [drag-android.stdout](/tmp/vv-retest-independent-1116b/drag-android.stdout) / [drag-android.stderr](/tmp/vv-retest-independent-1116b/drag-android.stderr) |
| drag-iphone | 0 | 6.852 | [drag-iphone.stdout](/tmp/vv-retest-independent-1116b/drag-iphone.stdout) / [drag-iphone.stderr](/tmp/vv-retest-independent-1116b/drag-iphone.stderr) |
| touch-false | 1 | 3.633 | [touch-false.stdout](/tmp/vv-retest-independent-1116b/touch-false.stdout) / [touch-false.stderr](/tmp/vv-retest-independent-1116b/touch-false.stderr) |
| touch-missing | 1 | 3.555 | [touch-missing.stdout](/tmp/vv-retest-independent-1116b/touch-missing.stdout) / [touch-missing.stderr](/tmp/vv-retest-independent-1116b/touch-missing.stderr) |
| touch-predicate-never | 1 | 3.545 | [touch-predicate-never.stdout](/tmp/vv-retest-independent-1116b/touch-predicate-never.stdout) / [touch-predicate-never.stderr](/tmp/vv-retest-independent-1116b/touch-predicate-never.stderr) |
| touch-invalid-ready-timeout-0 | 1 | 0.066 | [touch-invalid-ready-timeout-0.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-0.stdout) / [touch-invalid-ready-timeout-0.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-0.stderr) |
| touch-invalid-ready-timeout--1 | 1 | 0.073 | [touch-invalid-ready-timeout--1.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout--1.stdout) / [touch-invalid-ready-timeout--1.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout--1.stderr) |
| touch-invalid-ready-timeout-NaN | 1 | 0.074 | [touch-invalid-ready-timeout-NaN.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-NaN.stdout) / [touch-invalid-ready-timeout-NaN.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-NaN.stderr) |
| touch-invalid-ready-timeout-Infinity | 1 | 0.069 | [touch-invalid-ready-timeout-Infinity.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-Infinity.stdout) / [touch-invalid-ready-timeout-Infinity.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-Infinity.stderr) |
| touch-invalid-ready-timeout-oops | 1 | 0.072 | [touch-invalid-ready-timeout-oops.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-oops.stdout) / [touch-invalid-ready-timeout-oops.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-ready-timeout-oops.stderr) |
| touch-invalid-settle--1 | 1 | 0.076 | [touch-invalid-settle--1.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-settle--1.stdout) / [touch-invalid-settle--1.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-settle--1.stderr) |
| touch-invalid-settle-NaN | 1 | 0.072 | [touch-invalid-settle-NaN.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-settle-NaN.stdout) / [touch-invalid-settle-NaN.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-settle-NaN.stderr) |
| touch-invalid-settle-Infinity | 1 | 0.073 | [touch-invalid-settle-Infinity.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-settle-Infinity.stdout) / [touch-invalid-settle-Infinity.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-settle-Infinity.stderr) |
| touch-invalid-settle-oops | 1 | 0.075 | [touch-invalid-settle-oops.stdout](/tmp/vv-retest-independent-1116b/touch-invalid-settle-oops.stdout) / [touch-invalid-settle-oops.stderr](/tmp/vv-retest-independent-1116b/touch-invalid-settle-oops.stderr) |
| touch-report-async | 0 | 3.613 | [touch-report-async.stdout](/tmp/vv-retest-independent-1116b/touch-report-async.stdout) / [touch-report-async.stderr](/tmp/vv-retest-independent-1116b/touch-report-async.stderr) |
| touch-never | 1 | 3.67 | [touch-never.stdout](/tmp/vv-retest-independent-1116b/touch-never.stdout) / [touch-never.stderr](/tmp/vv-retest-independent-1116b/touch-never.stderr) |
| baseline-click | 0 | 2.328 | [baseline-click.stdout](/tmp/vv-retest-independent-1116b/baseline-click.stdout) / [baseline-click.stderr](/tmp/vv-retest-independent-1116b/baseline-click.stderr) |
| composite | 0 | 3.561 | [composite.stdout](/tmp/vv-retest-independent-1116b/composite.stdout) / [composite.stderr](/tmp/vv-retest-independent-1116b/composite.stderr) |

## Source integrity

Exact SHA-256 values below match the snapshot manifest before and after setup/tests, with node_modules excluded and exact source file set comparison. [Before](/tmp/vv-retest-independent-1116b/source-before.json), [after](/tmp/vv-retest-independent-1116b/source-after.json).

```json
{
  "package.json": "a130b4c55bc6b140720b2a1d1a8bccb326c8b6e1bf4fd79b1883fbc359883fe6",
  "SKILL.md": "70ff26c14eaa501f94f83ef889235142de30e023ca526c9b4778ba9c920f9067",
  "package-lock.json": "005d3a09b2180f524a14d8c5fbf4856a1eb9ef03380cc68cfebb27c3614a440d",
  "scripts/doctor.mjs": "d27ee12f37375bba00b9c403624096b3a38453b2535d3125780c94cd27b8ce7e",
  "scripts/screenshot.mjs": "849180d390abc79044684c88d3de141c140c51e9f59e0d720d8320492613a5c8",
  "scripts/install.sh": "a00b9a0c06c3fbc9f3203974834c71a0c27d34ab7cfc3c033345cbcb512fad7c",
  "scripts/load-playwright.mjs": "4ca47409353f242992b00cf49d3796e9ed2c33e027c866b689b6f55ca2cc9b4b",
  "scripts/touch.mjs": "6d01d104f77aba9be7353d5a6789943ddadeb72b3c9e43c39ce75200c9f6aaf3",
  "scripts/readiness.mjs": "015ce0b3369d1d658fb9e3305cf2183797e0f6421ddef5c9525c7b5f0e7fccc1",
  "scripts/composite.mjs": "b4c5bf493cca5cae6e6ca01244152c5acd0cb8d0a8f8cafa9079cc68e410882b"
}
```

## Inspected images

All nine PNGs were opened and visually inspected. WebKit mouse drag selects a little text, consistent with mouse provenance. Async-report-only screenshot appropriately remains INITIAL (the report returns a value without modifying the page).

| Image | Pixels |
|---|---|
| [async-eval.png](/tmp/vv-retest-independent-1116b/async-eval.png) | 390 × 844 |
| [baseline-click.png](/tmp/vv-retest-independent-1116b/baseline-click.png) | 1000 × 650 |
| [click-desktop.png](/tmp/vv-retest-independent-1116b/click-desktop.png) | 1000 × 650 |
| [composite.png](/tmp/vv-retest-independent-1116b/composite.png) | 2000 × 1400 |
| [drag-android.png](/tmp/vv-retest-independent-1116b/drag-android.png) | 1082 × 2202 |
| [drag-iphone.png](/tmp/vv-retest-independent-1116b/drag-iphone.png) | 1179 × 1977 |
| [scroll-mobile.png](/tmp/vv-retest-independent-1116b/scroll-mobile.png) | 390 × 700 |
| [tap-android.png](/tmp/vv-retest-independent-1116b/tap-android.png) | 1082 × 2202 |
| [touch-report-async.png](/tmp/vv-retest-independent-1116b/touch-report-async.png) | 1082 × 2202 |

## Cleanup and limits

All initial container IDs remain present; all owned successful launch container names are absent afterward. Each failure also records an immediate container inventory; no new failure output or success JSON exists. No own server container survives the run. Inventory: [before](/tmp/vv-retest-independent-1116b/containers-before.jsonl), [after](/tmp/vv-retest-independent-1116b/containers-after.jsonl). The fixture port is closed. Legacy and unrelated concurrent containers were not removed. This checks resource absence, not internal finally execution instrumentation.

No implementation edits, Git index/history/branch/commit/push mutations, Postie access, global dependency changes, or unrelated process termination. Only new report/harness files added under verification; existing parent changes preserved. Explicit setup changed temporary copy dependencies/cache only and requested the pinned Docker image (already available). Raw artifacts remain in /tmp.

macOS/Docker Desktop, real devices/system UI, native local WebKit and native local Chromium are unverified in this scoped retest. Linux Docker WebKit is not proof of physical iOS Safari behavior. Runtime concurrency/signal tests belong to the separate runtime retest; this report does not claim those tests.

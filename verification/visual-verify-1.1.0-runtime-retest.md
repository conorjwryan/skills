# Visual Verify v1.1.0 runtime retest

2026-11-16; independent Sol/medium test-only run; Linux x86_64 / Node v24.22.1. Scope R1–R4, C1–C4, G2, I1. **PASS for exercised Linux paths; no new material runtime failures found.** This is one independent tester's report, not evidence of completion of the second tester.

## Candidate and isolation

Tested the exact uncommitted fixed snapshot `/tmp/vv-fixed-candidate-wljc4hza/visual-verify`, not a Git archive or the live implementation. Parent record: [fixed candidate](/home/conor/code/skills/verification/visual-verify-1.1.0-fixed-candidate.json). Base `17f7efbd33da5d391b760dc10a5e0e9343ae3ec5`; comparison baseline `7ca31646e76c167d491f81e9285043ed7abdd3f4`. Read the previous runtime/readiness reports and snapshot loader/doctor/installer/instructions. Historical reports were not changed; baseline was not launched against the shared legacy endpoint.

Copied snapshot with Python shutil.copytree excluding node_modules into `/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify`. All ten source files exactly match parent source-manifest.json before and after tests. [Before hashes](/tmp/vv-runtime-retest-cdv_vr7a/hashes-before.json), [after hashes](/tmp/vv-runtime-retest-cdv_vr7a/hashes-after.json), [installed hashes](/tmp/vv-runtime-retest-cdv_vr7a/installed-hashes.json). Installed source also matches exactly. Hash manifest is reproduced below.

No source fixes, PATH wrappers, NODE_PATH, bridge IP substitution, global dependency installation, host-package installation, Postie access, Git commits/pushes/index/branches or unrelated process termination. Explicit setup only in temp. The isolated runtime-mismatch fixture changes only its copied dependency package.json version to 0.0.0; source remains untouched. Common environment: PLAYWRIGHT_BROWSERS_PATH=/tmp/vv-runtime-retest-cdv_vr7a/browsers, npm_config_cache=/tmp/vv-runtime-retest-cdv_vr7a/npm-cache, DISABLE_TELEMETRY=1. Inherited host PATH used unchanged. Fixture is an owned Python ThreadingHTTPServer bound exclusively to host 127.0.0.1:37101, closed in finally.

## Results

| Scope | Result | Evidence |
|---|---|---|
| R1 | PASS | Missing-runtime doctor and supported launch both fail with explicit skill installer guidance; no global runtime fallback. Runtime 0.0.0 mismatch doctor and launch reject pinned-version mismatch. |
| R2 | PASS | Missing doctor exit1; ready Docker exit0; forced-local missing exit1; unavailable Docker socket with missing local binary exit1; after local setup forced-local and unavailable-Docker fallback prerequisites exit0. Doctor does not request fixture, launch browsers, or install. Repeated ready/local/unavailable doctor checks leave source/dependency file sizes and mtimes unchanged. Concurrent agents prevent assuming complete container inventory equality means doctor mutation; read-only command paths additionally inspected. |
| R3 | PASS | Explicit Docker setup exits0 in 1.678s; pinned Playwright/core 1.65.1/image. Explicit local setup exits0 in 24.505s into temporary browser cache. Actual captures pass after each setup, rather than relying on doctor. |
| R4 | PASS | loadChromium().launch before local setup returns missing local executable under temporary cache, despite Docker being available. No Docker repair/launch by this legacy API. Raw upstream message suggests browser installation; no automatic installation occurs. |
| C1 | PASS | Existing visual-verify-playwright-1.65.0 remains present and running throughout; no fixed-port reuse/stop. Chromium uses 32813, WebKit32814. |
| C2 | PASS | Two concurrent supported Chromium launches allocate 32816 and32817. After first close, second loads fixture and reads expected heading. Mixed client runtime versions not exercised; old1.65.0 coexists untouched. |
| C3 | PASS exercised cases | Normal close, invalid executable during connect/remote launch, startup timeout, SIGINT130 and SIGTERM143 remove owned containers. Invalid executable error preserves `/vv-does-not-exist` and server listening log, without removed-container docker-log errors. Signal children start via hold.mjs, receive signal only after READY, and exit in 2.780/2.676s total launch+signal. |
| C4 | PASS | Unmodified supported Docker launch reaches ordinary host127.0.0.1 fixture with BOTH Chromium and WebKit; heading verified and screenshots captured. No bypass. Launch+navigation+capture+close measured 2799ms /3606ms. |
| G2 | PASS | Explicit setup, doctor, actual local Chromium screenshot CLI from installed skill path containing spaces work. Docker also launches from that path. |
| I1 | PASS | Fresh-source skills CLI1.4.5 installation into isolated project, --agent codex --copy --yes; ten matching source/runtime manifest files included and verification excluded. Then installed-path explicit Docker setup and actual installed screenshot CLI reach same loopback fixture and capture; 3.587s CLI. |

Normal checks contain no npm installation, browser download, or Docker pull call. Docker run uses --pull=never and required-image inspection; only explicitly invoked installer does downloads/pulls. Missing launch and mismatch launch fail before Docker startup. Repeated doctor tree inventory unchanged [read-only evidence](/tmp/vv-runtime-retest-cdv_vr7a/readonly-files.json). This combines observed negative checks with source inspection; no syscall/network tracer or deliberately removed matching image was used, so absence of all network traffic is not claimed.

## Timeout/error limits

Supported API timeout1ms reliably triggers server-readiness failure and returns in955ms including Docker run/inspect/log/cleanup overhead. Invalid executable connect-stage failure returns1753ms with useful underlying error. Ordinary successful launches use timeout5000ms. **Timeout is not a strict total wall-clock budget**: Docker subprocesses have their own10000ms bounds, readiness and connect each receive timeout. No stalled daemon or true transport-only WebSocket connect failure injected; invalid executable exercises the connect/remote-launch rejection path. No source monkey-patching or Docker wrappers used. A deliberately crashed run-server beyond the readiness-timeout case was not induced. Hard kill/host crash/daemon outage cleanup remains unverified, as documented by the skill.

## Images inspected

Opened all four PNGs with view_image. Chromium/WebKit1280×720 show “Runtime retest fixture” and “Host 127.0.0.1 reached.” against blue background. Local and fresh-installed CLI780×1688 images show the same text wrapped at CSS390px/DPR2. Installed/local PNG SHA256 both `45b2f804710f943cbd06f1c99ac10edf998837d964b431762313fa7d83552942`; identical fixture render, not blank/error captures.

[Docker Chromium](/tmp/vv-runtime-retest-cdv_vr7a/chromium.png), [Docker WebKit](/tmp/vv-runtime-retest-cdv_vr7a/webkit.png), [local path with spaces](/tmp/vv-runtime-retest-cdv_vr7a/local.png), [fresh installed skill](/tmp/vv-runtime-retest-cdv_vr7a/installed.png).

## Evidence and cleanup

Raw artifacts retained at [/tmp/vv-runtime-retest-cdv_vr7a](/tmp/vv-runtime-retest-cdv_vr7a). Reproducible harness [run.py](/tmp/vv-runtime-retest-cdv_vr7a/run.py), [api.mjs](/tmp/vv-runtime-retest-cdv_vr7a/api.mjs), [hold.mjs](/tmp/vv-runtime-retest-cdv_vr7a/hold.mjs), [extra.py](/tmp/vv-runtime-retest-cdv_vr7a/extra.py). Exact command vectors, overrides, exit codes, durations: [commands.json](/tmp/vv-runtime-retest-cdv_vr7a/commands.json), [extra-commands.json](/tmp/vv-runtime-retest-cdv_vr7a/extra-commands.json). Every named case has corresponding name.stdout/name.stderr. API assertions/results and preserved underlying errors: [api.stdout](/tmp/vv-runtime-retest-cdv_vr7a/api.stdout). Setup output records pinned npm/browser/image actions. [Installed files](/tmp/vv-runtime-retest-cdv_vr7a/installed-files.json).

Pre/post container and process inventories: before.stdout/after.stdout and process-before.stdout/process-after.stdout in evidence root. All initial full container IDs remain present after the harness. Third-party concurrent Visual Verify containers were observed and left untouched; final extra container `visual-verify-e155de60-1894-4500-bd40-00f46f7ba18a` is not this tester's container. All browsers closed in finally, owned signal children terminated, fixture shut down in finally. No owned candidate container remains. Temporary dependencies/artifacts intentionally retained for review. No historical report rewritten.

Unsupported macOS/Docker Desktop, real-device UI, and local WebKit remain **UNVERIFIED**. Linux WebKit via Docker is verified; it does not prove those other environments. No claim of complete W/G1/readiness retesting in this runtime scope.

## Command ledger

Common temp environment above applies to each command. Full arguments in JSON; signals use owned Popen PID (see run.py).

| Name | Exit | Seconds | Command |
|---|---:|---:|---|
| before | 0 | 0.382 | `docker ps -a --no-trunc --format '{{json .}}'` |
| process-before | 0 | 0.031 | `ps -eo pid,args` |
| missing-doctor | 1 | 0.294 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| setup-docker | 0 | 1.678 | `bash '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/install.sh' docker` |
| ready-doctor | 0 | 0.999 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| forced-local-missing | 1 | 0.978 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| docker-unavailable | 1 | 0.790 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| api | 0 | 13.658 | `node /tmp/vv-runtime-retest-cdv_vr7a/api.mjs` |
| SIGINT | 130 | 2.780 | `node /tmp/vv-runtime-retest-cdv_vr7a/hold.mjs; send SIGINT to owned PID` |
| SIGTERM | 143 | 2.676 | `node /tmp/vv-runtime-retest-cdv_vr7a/hold.mjs; send SIGTERM to owned PID` |
| setup-local | 0 | 24.505 | `bash '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/install.sh' local` |
| local-cli | 0 | 1.564 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/screenshot.mjs' --url http://127.0.0.1:37101 --out /tmp/vv-runtime-retest-cdv_vr7a/local.png --wait 0` |
| ready-local | 0 | 0.893 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| skills-install | 0 | 1.432 | `npm exec --yes --package=skills@1.4.5 -- skills add /tmp/vv-runtime-retest-cdv_vr7a/fresh-source --skill visual-verify --agent codex --copy --yes` |
| installed-setup | 0 | 1.240 | `bash /tmp/vv-runtime-retest-cdv_vr7a/project/.agents/skills/visual-verify/scripts/install.sh docker` |
| installed-cli | 0 | 3.587 | `node /tmp/vv-runtime-retest-cdv_vr7a/project/.agents/skills/visual-verify/scripts/screenshot.mjs --url http://127.0.0.1:37101 --out /tmp/vv-runtime-retest-cdv_vr7a/installed.png --wait 0` |
| runtime-mismatch | 1 | 0.349 | `node /tmp/vv-runtime-retest-cdv_vr7a/mismatch/scripts/doctor.mjs` |
| after | 0 | 0.498 | `docker ps -a --no-trunc --format '{{json .}}'` |
| process-after | 0 | 0.029 | `ps -eo pid,args` |
| missing-launch | 1 | 0.100 | `node --input-type=module -e 'const {launchBrowser}=await import("/tmp/vv-runtime-retest-cdv_vr7a/missing-runtime/scripts/load-playwright.mjs");await launchBrowser('"'"'chromium'"'"',{backend:'"'"'docker'"'"',timeout:1000})'` |
| mismatch-launch | 1 | 0.088 | `node --input-type=module -e 'const {launchBrowser}=await import("/tmp/vv-runtime-retest-cdv_vr7a/mismatch/scripts/load-playwright.mjs");await launchBrowser('"'"'chromium'"'"',{backend:'"'"'docker'"'"',timeout:1000})'` |
| readonly-containers-before | 0 | 0.480 | `docker ps -a --no-trunc --format '{{json .}}'` |
| readonly-ready | 0 | 0.919 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| readonly-local | 0 | 0.912 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| readonly-no-docker | 0 | 0.746 | `node '/tmp/vv-runtime-retest-cdv_vr7a/candidate space/visual-verify/scripts/doctor.mjs'` |
| readonly-containers-after | 0 | 0.366 | `docker ps -a --no-trunc --format '{{json .}}'` |

## Source SHA256 manifest

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

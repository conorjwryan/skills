# Visual Verify v1.1.0 runtime verification

Independent runtime/container test, 2026-11-16, Linux x86_64. Candidate **17f7efbd33da5d391b760dc10a5e0e9343ae3ec5**; baseline **7ca31646e76c167d491f81e9285043ed7abdd3f4**. No implementation fixes or Git mutations. Sources read: verification plan, candidate SKILL.md and bundled scripts/package/lock, baseline loader. All executed copies came from git archive, not worktrees.

Evidence root: [/tmp/vv-runtime-wC5BjL](/tmp/vv-runtime-wC5BjL). Each command below has separate `<name>.stdout` and `<name>.stderr` files there, including failed commands. Exact commands, environment overrides, exit codes and wall durations are also in [commands.jsonl](/tmp/vv-runtime-wC5BjL/commands.jsonl). Harness: [test.mjs](/tmp/vv-runtime-wC5BjL/test.mjs), [local.mjs](/tmp/vv-runtime-wC5BjL/local.mjs), [concurrent.mjs](/tmp/vv-runtime-wC5BjL/concurrent.mjs), Python orchestration files in that directory. Shell compound commands retain per-command stdout/stderr but final exit status only; inspect individual output as recorded below. Browser harness catches failures, so harness exit 0 alone is not a browser pass.

## Findings

1. **FAIL: Docker launch after successful explicit pinned setup.** Both Chromium and WebKit containers exit immediately; launcher reports `docker logs ... dead or marked for removal`. Minimal reproduction: archive candidate, `bash visual-verify/scripts/install.sh docker`, then import `launchBrowser` and call `launchBrowser('chromium', {backend:'docker',timeout:5000})` (see `test.mjs browsers`). `diagnostic-server` independently runs the candidate server require under the same mount/user and exposes the underlying `Cannot find module 'playwright-core'`, require stack `/runtime/playwright/index.js`. Dependencies are mounted at `/runtime`; Node's sibling dependency resolution expects a node_modules location. This prevents a normal end-to-end Docker pass. No source was altered.
2. **Diagnostic-only FAIL: Docker host-loopback forwarding.** External [docker wrapper](/tmp/vv-runtime-wC5BjL/diagnostic-bin/docker) adds only `-e NODE_PATH=/runtime` to docker run, allowing startup past finding 1. Both engines then connect successfully to separate server endpoints, but navigation to a fixture bound to host `127.0.0.1` fails with connection refused, with **zero fixture requests**. See `bypass-browsers.stdout` (Chromium startup 2787ms; WebKit 2735ms). No screenshots were produced for these failures. This isolates a second runtime problem; it is not an unmodified candidate pass.
3. **PASS: local Chromium setup and actual launch/capture from a path containing spaces.** Explicit installer `local` installed pinned Chromium only to the temporary browser cache. Actual supported launcher loads the fixture and captures [local.png](/tmp/vv-runtime-wC5BjL/local.png). Image inspected: visible heading “Runtime fixture” and paragraph “Local Chromium works in a path containing spaces.”, 1280×720, no blank/error page.

## Acceptance scope

| ID | Verdict | Observed evidence / limits |
|---|---|---|
| R1 | PASS | Before npm setup, doctor exits 1 with owned runtime missing despite global Playwright 1.65.1. No global fallback. `global-actual` confirms global version; initial hardcoded `/usr/lib` probe was incorrect and superseded. |
| R2 | PASS for exercised checks | With installed runtime/image: auto doctor exit 0; local forced with empty browser cache exit 1; unavailable Docker socket exit 1 with diagnostic. Doctor fixture observes 0 requests and identical container ID list and skill root file listing. No launch/pull/install output. Full filesystem write tracing was not performed. Legacy container is listed, but no usable legacy endpoint detail is emitted (Ports empty on host networking). |
| R3 | PARTIAL / FAIL Docker | Docker installer exits 0, npm lock resolves Playwright/core 1.65.1, exact image pull succeeds. Doctor success does not imply launch success (finding 1). Local explicit setup and supported launch pass. Missing local raw browser failure reproduced before setup. |
| R4 | PASS | Candidate raw loadChromium().launch fails on missing temporary browser executable; baseline same call also fails using global runtime. Neither starts Docker or installs. Baseline Docker launcher never invoked. |
| C1 | BLOCKED normal launch; legacy preservation PASS | Existing v1.65.0 shared-port container left running unchanged. Diagnostic-only candidate gets independent ports 32772/32773 while legacy remains. Baseline fixed-port conflict not exercised against shared container. |
| C2 | BLOCKED normal launch; diagnostic isolation succeeds | Diagnostic-only Promise.all of two Chromium launches gets ports 32786 and 32787; closing first leaves second able to create page and render “second survives”. Different-version candidate pair UNVERIFIED; no source/version edits made. |
| C3 | PARTIAL | Unmodified startup failures remove own containers. Diagnostic-only successful close, SIGINT (exit 130), SIGTERM (exit 143), and invalid executable launch remove owned containers; unrelated initial IDs preserved. Dedicated connect-failure injection and forced-kill/outage cleanup UNVERIFIED. Signal tests sent directly to owned Node PID after endpoint output; no broad kill. |
| C4 | FAIL / BLOCKED | Normal candidate blocked by finding 1; diagnostic-only Chromium and WebKit host-loopback fixture both fail (finding 2). |
| G2 | PARTIAL | Path `candidate space/visual-verify`: setup, doctor, imports and actual local capture pass. Docker capture fails as above. No CMSTron paths used. |
| I1 | PASS installation/setup only | Fresh archive installed with skills CLI **1.4.5** into isolated project via --agent codex --copy --yes. All 11 candidate skill files present, package and lock and all scripts included; verification/ excluded. Explicit Docker setup and installed-path doctor succeed. Actual installed-path Docker browser remains unverified separately; same source blocker applies. Initial install from already-prepared temp source also copied node_modules; fresh-source repeat is the authoritative clean installation test. |
| P1 | UNVERIFIED | macOS, Docker Desktop, local WebKit, real devices and system UI unavailable/not exercised; Linux results do not validate those platforms. |

## Resources and preservation

Node v24.22.1; full Docker/OS/image/port inventory in environment.stdout. Dependencies installed only under temporary copies, browser cache `/tmp/vv-runtime-wC5BjL/browsers`, CLI npm cache `/tmp/vv-runtime-wC5BjL/npm-cache`. Docker explicit setup pulls matching image (already present/up to date); no host packages/global dependencies installed. No fixture server persists: each is closed in finally. Each browser is closed in finally; signal children exit after cleanup. Diagnostic container uses --rm. No baseline Docker launcher used. No production/Postie access.

Initial legacy container ID: `fcf98a3e12eb7ecd645663468b671b8cb26bbbc157137a88144939fb382a378b`. Pre/post full IDs and status: before.stdout, cleanup-final.stdout. All initial IDs remain present: True. No owned containers remain. A transient independently named container appeared during concurrent external testing; it was never removed by this harness and was gone on later inspection. Do not attribute unrelated concurrent container activity to this run.

`source-integrity` confirms archived candidate source equals fresh candidate archive excluding installed node_modules, and repo skill implementation diff empty. Only this readable report is added in repo verification/. Artifacts intentionally retained in /tmp for parent collation. No commit/push/PR/index/history/branch changes.

## Command ledger

Raw stdout/stderr: prefix each name with `/tmp/vv-runtime-wC5BjL/`, append `.stdout` / `.stderr`. Environment overrides in commands.jsonl (notably temporary browser path and diagnostic PATH). “global” and “cli-help” are exploratory failed probes, superseded by global-actual and cli-help2. An initial `python` invocation was unavailable (exit 127); all harness scripts then ran via python3.

- **before** — exit 0; 0.890s. `docker ps -a --no-trunc --format "{{json .}}"`
- **environment** — exit 0; 0.637s. `uname -a; node -v; npm -v; docker version; docker images; npm root -g; ss -ltn`
- **archive** — exit 0; 0.015s. `mkdir -p '/tmp/vv-runtime-wC5BjL/candidate space' /tmp/vv-runtime-wC5BjL/baseline; git archive 17f7efb | tar -x -C '/tmp/vv-runtime-wC5BjL/candidate space'; git archive 7ca3164 | tar -x -C /tmp/vv-runtime-wC5BjL/baseline`
- **missing-doctor** — exit 1; 0.268s. `node '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/scripts/doctor.mjs'`
- **global** — exit 0; 0.053s. `node -e "try{console.log(require('/usr/lib/node_modules/playwright/package.json').version)}catch(e){console.error(e.message)}"`
- **setup** — exit 0; 1.115s. `bash '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/scripts/install.sh' docker`
- **doctor** — exit 0; 0.819s. `node '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/scripts/doctor.mjs'`
- **doctor** — exit 0; 2.837s. `node /tmp/vv-runtime-wC5BjL/test.mjs doctor`
- **raw** — exit 1; 0.575s. `node /tmp/vv-runtime-wC5BjL/test.mjs raw`
- **baseline** — exit 1; 0.792s. `node /tmp/vv-runtime-wC5BjL/test.mjs baseline`
- **failure** — exit 0; 1.313s. `node /tmp/vv-runtime-wC5BjL/test.mjs failure`
- **browsers** — exit 0; 2.025s. `node /tmp/vv-runtime-wC5BjL/test.mjs browsers`
- **global-actual** — exit 0; 0.233s. `node -p "require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright/package.json').version"`
- **cli-help** — exit 1; 1.185s. `npm exec --yes --package=skills@1.4.5 -- skills add --help`
- **mount-permissions** — exit 0; 0.011s. `namei -l '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/node_modules/playwright'; stat -c '%a %n' '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/node_modules'`
- **diagnostic-server** — exit 1; 0.466s. `docker run --rm --name vv-runtime-diagnostic-wC5BjL --user pwuser --mount 'type=bind,source=/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/node_modules,target=/runtime,readonly' mcr.microsoft.com/playwright:v1.65.1-noble node -e "const {chromium}=require('/runtime/playwright'); chromium.launchServer({headless:true,port:3000,host:'0.0.0.0'}).then(s=>{console.log(s.wsEndpoint());s.close()}).catch(e=>{console.error(e);process.exitCode=1})"`
- **cli-version** — exit 0; 0.551s. `npm view skills version`
- **cli-help2** — exit 0; 0.763s. `npm exec --yes --package=skills@1.4.5 -- skills --help`
- **local-setup** — exit 0; 22.614s. `bash '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify/scripts/install.sh' local`
- **bypass-browsers** — exit 0; 7.319s. `node /tmp/vv-runtime-wC5BjL/test.mjs browsers`
- **SIGINT** — exit 130; 2.180s. `node test.mjs hold; send SIGINT`
- **SIGTERM** — exit 143; 2.182s. `node test.mjs hold; send SIGTERM`
- **bypass-failure** — exit 0; 1.974s. `node /tmp/vv-runtime-wC5BjL/test.mjs failure`
- **cli-install** — exit 0; 1.007s. `mkdir -p /tmp/vv-runtime-wC5BjL/project; cd /tmp/vv-runtime-wC5BjL/project; npm exec --yes --package=skills@1.4.5 -- skills add '/tmp/vv-runtime-wC5BjL/candidate space' --skill visual-verify --agent codex --copy --yes`
- **cli-files** — exit 0; 0.010s. `find /tmp/vv-runtime-wC5BjL/project -maxdepth 6 -type f`
- **after** — exit 0; 0.585s. `docker ps -a --no-trunc --format "{{json .}}"`
- **local-capture** — exit 0; 1.097s. `node /tmp/vv-runtime-wC5BjL/local.mjs`
- **bypass-concurrent** — exit 0; 3.995s. `node /tmp/vv-runtime-wC5BjL/concurrent.mjs`
- **fresh-cli** — exit 0; 0.937s. `mkdir -p /tmp/vv-runtime-wC5BjL/fresh-source /tmp/vv-runtime-wC5BjL/fresh-project; git archive 17f7efb | tar -x -C /tmp/vv-runtime-wC5BjL/fresh-source; cd /tmp/vv-runtime-wC5BjL/fresh-project; DISABLE_TELEMETRY=1 npm exec --yes --package=skills@1.4.5 -- skills add /tmp/vv-runtime-wC5BjL/fresh-source --skill visual-verify --agent codex --copy --yes; find . -type f`
- **installed-setup** — exit 0; 1.214s. `bash /tmp/vv-runtime-wC5BjL/fresh-project/.agents/skills/visual-verify/scripts/install.sh docker`
- **installed-doctor** — exit 0; 0.891s. `node /tmp/vv-runtime-wC5BjL/fresh-project/.agents/skills/visual-verify/scripts/doctor.mjs`
- **final-containers** — exit 0; 0.463s. `docker ps -a --no-trunc --format "{{json .}}"`
- **source-integrity** — exit 0; 0.016s. `git diff -- visual-verify; git status --short; diff -r --exclude=node_modules /tmp/vv-runtime-wC5BjL/fresh-source/visual-verify '/tmp/vv-runtime-wC5BjL/candidate space/visual-verify'`
- **cleanup-final** — exit 0; 0.488s. `docker ps -a --no-trunc --format "{{json .}}"`

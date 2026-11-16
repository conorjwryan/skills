# Visual Verify v1.1.0 — final verify-changes

2026-11-16. **PASS for exercised Linux Docker and local Chromium paths. Both independent retests report no new material failures.** The reported Docker dependency and localhost blockers are resolved, and the old premature-capture regression is addressed by explicit readiness checks.

Published [final Plan Master verify-changes page](https://pm.cjri.uk/plans/62-visual-verify-reliability/verify-changes.html). Registry/R2 audit verified; human view is Access-protected.

## Exact candidate

The tested candidate is an uncommitted fixed snapshot based on `17f7efbd33da5d391b760dc10a5e0e9343ae3ec5`; it is not the unchanged committed 17f7efb build. Baseline v1.0.1 is `7ca31646e76c167d491f81e9285043ed7abdd3f4`. Both agents tested independent copies of `/tmp/vv-fixed-candidate-wljc4hza/visual-verify` with the ten source-file hashes in [fixed-candidate.json](visual-verify-1.1.0-fixed-candidate.json). Parent verified that the current working skill exactly matches that manifest after both retests. Playwright remains pinned to 1.65.1, skill version remains 1.1.0.

## Changes and resolution

- Docker dependencies now mount at `/runtime/node_modules`, preserving normal resolution of Playwright's sibling `playwright-core`. The NODE_PATH workaround is gone.
- The helper runs the pinned full Playwright server instead of a prelaunched `launchServer` browser. It supports client loopback forwarding; normal Chromium and WebKit now request a fixture bound only to host 127.0.0.1.
- Every launch retains a unique managed container, Docker-assigned loopback port and random endpoint path. No shared fixed port or existing-server takeover.
- Failed startup logs are collected before owned-container removal, preserving underlying errors rather than reporting only a dead docker-logs target.
- Composite JSON now includes actual backend/version provenance.
- The existing v1.1.0 pinning, doctor, readiness checks, bounded async evaluation, animation settling and owned-resource cleanup remain intact.

## Independent test evidence

Two new T3 delegate tasks requested Codex `gpt-6.1-sol` with `reasoningEffort=medium`, one per previous scope. They performed actual tests, not code-only review; they made no implementation edits. No candidate PATH wrapper, NODE_PATH override, bridge-address substitution or host-network override was used. The baseline comparison alone uses the documented disposable common-runtime container.

- [Runtime retest](visual-verify-1.1.0-runtime-retest.md): R1–R4, C1–C4, G2/I1.
- [Readiness/image retest](visual-verify-1.1.0-readiness-retest.md): W1–W4/G1 and composite provenance.
- [Normal-path readiness harness](visual-verify-1.1.0-retest-harness.py): reproducible test commands and fresh evidence directory setup.

The parent reviewed both reports, checked source hashes and static validation, and independently ran Chromium/WebKit localhost smoke checks. These are separate from the agent runs. Reports link exact commands, exit codes, durations, raw logs, container inventories and inspected images.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Docker Chromium and WebKit | PASS | Both load host localhost and capture the expected heading, no bypasses. Agent launch/navigation/capture/close: 2.799s / 3.606s. |
| Fresh skills CLI installation | PASS | Ten matching source/runtime files included; verification directory excluded. Installed-path setup and actual screenshot succeed. |
| Local Chromium and paths containing spaces | PASS | Explicit local setup, imports, diagnostics and actual local CLI capture succeed. |
| Runtime isolation and doctor | PASS exercised checks | Missing and mismatched owned runtime reject; no global fallback. Docker/local/unavailable-Docker diagnostics behave as expected; observed files unchanged and zero fixture requests. |
| Parallel launches and legacy server | PASS exercised checks | Concurrent new ports 32816/32817; closing one leaves the other functional. Existing 1.65.0 container remains untouched. |
| Failure and signal cleanup | PASS exercised checks | Remote launch rejection, startup timeout, close, SIGINT and SIGTERM clean owned containers; underlying invalid-executable error preserved. |
| Delayed click, scroll, async eval | PASS | 900ms delayed results and 700ms async eval captured only after expected state. |
| Negative readiness/input cases | PASS | All 24 negative cases exit nonzero, bounded, without a new PNG or success JSON. Invalid timeouts rejected before launch. |
| Combined readiness budget and animation settle | PASS | Both conditions required; shared 1100ms condition budget; 600ms settle captures completed 500ms animation. |
| Mobile touch and provenance | PASS | Chromium drag reports observed touch events; actual Docker WebKit drag reports observed mouse events, no silent fallback. |
| Images and composites | PASS | Desktop/mobile/composite outputs inspected with correct states, dimensions, labels and backend provenance. |
| Old timing regression | Reproduced and corrected in new path | Unchanged baseline fixed 400ms wait captures INITIAL; candidate explicit readiness captures CLICK READY. Common browser runtime; not a historical pixel-identity claim. |
| Current source and static checks | PASS | Skill validator, all .mjs syntax checks, Bash syntax and whitespace checks pass; source manifest exact. |

## Boundaries, not unresolved observed blockers

macOS/Docker Desktop, physical iOS/Android devices and native local WebKit were not tested. Linux Docker WebKit does not prove real-device Safari behaviour. Simultaneous new clients with different pinned runtime versions were not exercised; coexistence of new callers and the old server was observed. No stalled-daemon or transport-only WebSocket failure was injected. Hard kill/host crash/daemon outage cleanup remains unverified and can leave owned orphans as documented.

The launch `timeout` is a stage timeout, not a strict total wall-clock ceiling: Docker subprocesses have separate 10-second bounds, and readiness/connect each receive the requested budget. The 1ms readiness-timeout test returned in 955ms including Docker setup/cleanup overhead. This is bounded failure evidence, not a strict 1ms response claim.

No further material failures were reported in the tested scopes. These limits are retained rather than counted as passes.

## Preservation and final state

Agents cleaned their owned fixtures, signal children and containers; all original container IDs were retained. Parent smoke containers also closed. No Postie, production, global dependency or installed-global-skill changes. Explicit runtime setup prepared the repo-owned ignored node_modules and temporary dependencies; matching Docker image pulls found the image already available. No commits, pushes, tags, branches or index changes by these agents/parent.

Historical failed-run reports and the post-plan verification page remain a record of the first candidate. This final report supersedes their acceptance verdict only for the fixed source manifest. Implementation changes and new verification files remain for Conor to review and commit.

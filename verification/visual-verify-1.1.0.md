# Visual Verify 1.1.0 verification plan and log

Status: post-commit verification completed on 17f7efb. Docker acceptance failed; see [collated results](visual-verify-1.1.0-summary.md). Implementation fixes await Conor’s instruction.

This directory is outside `visual-verify/`, so installing that skill does not include this log or its future harness. No harness skill entrypoint belongs here.

## Scope and evidence

Compare the committed v1.1.0 candidate against the last v1.0.1 commit. Record the actual commit SHAs before testing; do not assume tags exist or create them. Run from separate temporary copies so the user's checkout and installed skills remain intact. Never run full fixture files against Postie production.

The previous Postie record is `plans/82-advanced-search/07-encountered-problems.md`, section 4, linked from issue #82. The read-only audit observed missing local Chromium for global Playwright 1.65.1, legacy local-only verification callers, a 1.65.0 container on the shared 39123 port, and 250ms search debouncing. It did not reproduce browser behaviour. The shared-port conflict was inferred, not demonstrated.

Vite/pkill, migrations and Postie feature flags are out of scope. No Postie code, global installations or symlinks have been changed by this implementation.

## Proposed post-commit process

1. Capture candidate and baseline SHAs, OS/architecture, Docker version, dependency versions, installed images, existing containers and relevant ports. Use temporary output paths; keep previous artifacts.
2. Build an explicit local fixture server in a temporary harness directory, with delayed search, click/tap states, promise-returning predicates, draggable targets and missing states. Include a request counter so doctor's lack of app requests is observable.
3. Install the candidate's locked dependencies and required browser backend explicitly as part of the test run. Log every install/pull. Do not repair global baseline dependencies silently. Record unavailable backends as blocked, not passed.
4. Use T3 orchestration to request independent Sol/medium agents after the commit: one for runtime/container behaviour and one for readiness plus regression checks. Confirm provider/model availability first; do not substitute unasked. Give each an isolated test task, raw evidence requirements and no permission to edit implementation, commit, push, stop unrelated processes or touch production. Run baseline tests serially where its shared port is involved; only candidate concurrency tests should run simultaneously.
5. Review their findings, append evidence below, and propose fixes separately if needed. End each owned container/server in a finally block. Snapshot pre/post containers to demonstrate unrelated services survived. Do not label all platforms supported based on Linux alone.

## Acceptance matrix

| ID | Claim / experiment | Expected candidate result | Baseline comparison | Status |
| --- | --- | --- | --- | --- |
| R1 | Missing skill runtime; global Playwright exists | Doctor explains missing owned runtime; no global fallback or writes | Record global resolution | Pending |
| R2 | Doctor with Docker available/unavailable and local mode | Accurate package/image/executable/container diagnostics, sensible exit status; no browser launch, app requests or container mutations | No doctor | Pending |
| R3 | Explicit setup, then supported launch API | Exact package/image versions; actual launch works; local missing binaries fail clearly | Reproduce setup/local-only mismatch in isolation | Pending |
| R4 | Legacy raw exports | Remain explicitly local-only, no hidden Docker launch or install | Same API behaviour, documented limitation | Pending |
| C1 | Old container remains on port 39123 | New run gets independent endpoint; old container unaffected | Reproduce conflict only in isolated baseline setup | Pending |
| C2 | Two concurrent candidate callers, then different runtime versions | Correct per-run endpoints and identities; neither terminates the other | Fixed-port limitation | Pending |
| C3 | Launch/connect failure, close, SIGINT and SIGTERM | Owned containers removed; unrelated containers retained; bounded errors | Record failure cleanup | Pending |
| C4 | Chromium/WebKit access a host localhost fixture | Loopback forwarding works; honest backend report | Host-network setup | Pending |
| W1 | Delayed results after click, scroll or async evaluation | Screenshot captures expected new state using explicit conditions | Document premature captures when delay is insufficient | Pending |
| W2 | Predicate false, never-settling promise, missing selector, invalid timeout | Nonzero exit; bounded wait; no new screenshot or success JSON; browser closed | No explicit readiness contract | Pending |
| W3 | Selector and predicate together, optional settle | Both conditions pass before capture; shared condition budget | Not available | Pending |
| W4 | Touch tap/drag with delayed state and readiness | Correct final state; true Chromium touch and WebKit mouse distinction retained | Record baseline results | Pending |
| G1 | Desktop/mobile captures and composites | Inspect images; labels and dimensions correct; input/backend provenance retained | Compare capabilities, not pixel identity across browser versions | Pending |
| G2 | Copy skill directory to a path containing spaces | Setup, diagnostics, imports and captures work without CMSTron/global paths | Compare portability | Pending |
| P1 | macOS/Docker Desktop and local WebKit | Separate observed results or explicitly unverified | No inferred pass | Pending |
| I1 | Install through skills CLI | Selected skill includes package/lock/scripts, excludes verification directory; setup works from installed path | Record discovery/install evidence | Pending |

## Implementation-stage checks — 2026-11-16

- Skill frontmatter validation: passed.
- `node --check` for every bundled `.mjs`: passed.
- `bash -n visual-verify/scripts/install.sh`: passed.
- `git diff --check`: passed.
- Package lock generation: succeeded; npm reported zero vulnerabilities. No dependency install or browser download was run.
- Doctor executed against the uninstalled candidate: correctly reported v1.1.0, pinned Playwright 1.65.1, missing skill-owned runtime, Docker/image availability, and exit 1. This was the missing-runtime case only, not a browser smoke test.

No browser support or behavioural success is inferred from these checks. The dedicated-container approach intentionally replaces warm-server reuse; measure startup cost during C2/G1. Forced kills and Docker outages may leave orphans and require explicit ownership-checked cleanup.

## Post-commit run log template

- Date, runner, baseline SHA, candidate SHA:
- Environment and backend:
- Case IDs and exact commands:
- Expected versus observed result:
- Exit status, duration and artifact paths:
- Images inspected and findings:
- Installs/pulls and runtime mutations:
- Pre/post container and server cleanup:
- Verdict: pass / fail / blocked / unverified:

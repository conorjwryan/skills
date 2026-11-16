# Visual Verify v1.1.0 — post-plan verification

Date: 2026-11-16. **Verdict: Docker acceptance failed; do not treat v1.1.0 as fully verified.** No implementation fixes made.

Candidate: `17f7efbd33da5d391b760dc10a5e0e9343ae3ec5` (v1.1.0).
Baseline: `7ca31646e76c167d491f81e9285043ed7abdd3f4` (v1.0.1).
Environment: Linux x86_64, Node v24.22.1, Playwright 1.65.1. macOS/Docker Desktop and local WebKit remain unverified.

Published companion: [Plan Master post-plan verification](https://pm.cjri.uk/plans/62-visual-verify-reliability/post-plan-verification.html). Registry/R2 verification succeeded; human view is Cloudflare Access-protected.

## How results were collated

Two independent Codex gpt-6.1-sol agents were requested through T3 with medium reasoning effort. The runtime agent exercised R1–R4/C1–C4/G2/I1; the readiness agent exercised W1–W4/G1. Both used archived commit copies and temporary fixtures, preserving the implementation. Their reports retain exact commands, timings, raw logs, inspected image paths and scope limitations:

- [Runtime/container report](visual-verify-1.1.0-runtime-results.md).
- [Readiness/image report](visual-verify-1.1.0-readiness-results.md).
- [Readiness harness](visual-verify-1.1.0-readiness-harness.py).

This summary merges duplicate findings, keeps normal candidate results separate from diagnostic workaround results, and distinguishes observed failures from unverified claims. No overall pass count is given because several acceptance cases are only partially exercised. The parent reviewed both reports and source-integrity evidence; it did not run an additional independent browser suite.

Detailed raw artifacts remain under `/tmp/vv-runtime-wC5BjL` and `/tmp/vv-readiness-pfprCk`; these are temporary, machine-local evidence, not committed assets. Reports/harness live outside the installable skill. The harness needs the documented temporary archives, explicit setup and diagnostic wrapper; it is not a standalone universal test runner.

## Improvements needed before accepting Docker behaviour

### 1. Fix container dependency resolution — blocking, independently reproduced

Successful setup is followed by failed Chromium and WebKit startup. The mounted Node dependencies are at `/runtime`, with the server requiring `/runtime/playwright`. Its sibling `playwright-core` is not found through normal Node module resolution. Both agents captured `Cannot find module 'playwright-core'` from the same mount and user configuration.

Suggested correction: preserve a conventional node_modules hierarchy in the mount and server require path (for example a skill root containing node_modules), rather than relying on an environment workaround. Confirm both engines start with the unmodified CLI after installation, including paths containing spaces. Also retain startup stderr before an auto-removed container disappears; the current surfaced `docker logs` error obscures the useful dependency error.

Minimal reproduction after explicit Docker setup: run the unchanged screenshot CLI with `--url about:blank --out /tmp/<unique-run>.png`. It exits 1 before capture. See reports for exact archived paths and raw stderr.

### 2. Restore host-local app access — observed after diagnostic bypass, root cause not yet established

After injecting only `NODE_PATH=/runtime` through an external Docker wrapper, the server starts and clients connect. Both agents still observed Chromium and WebKit refusing a fixture bound to host 127.0.0.1, with zero fixture requests. Thus the advertised loopback forwarding is not established for this launcher/server combination.

Suggested correction: investigate and prove the chosen server/forwarding arrangement using the ordinary launch API, or use a documented host-network strategy on supported Linux hosts with independently allocated endpoints. Retain localhost app access without hardcoded bridge addresses, shared fixed ports or stopping existing servers. Do not accept the diagnostic bridge-IP workaround as the shipped solution. Add a positive localhost request assertion for each engine.

### 3. Complete normal end-to-end acceptance after those corrections

Repeat the existing readiness, screenshot, composite, touch, concurrency and failure-cleanup cases without either diagnostic bypass. Existing Docker acceptance is blocked even where the isolated functionality passed. Different-runtime-version coexistence, explicit connect-failure injection and macOS/Docker Desktop still need coverage or an honest unverified status.

Minor follow-up: composite JSON currently reports only the saved path. Add backend/version provenance if the output contract promises it across all helpers. This is a pre-existing limitation, not a newly demonstrated image-generation failure.

## Combined result matrix

| Area | Unmodified candidate | Diagnostic-only evidence / limits |
| --- | --- | --- |
| Owned pinned runtime, missing dependency diagnostics | Pass for exercised cases | No global fallback; doctor reports missing owned runtime despite installed global Playwright. |
| Read-only doctor | Pass for observed checks | Zero fixture requests; no observed skill-file/container mutations. Not a filesystem syscall audit; success means prerequisites, not successful launch. |
| Explicit setup | Package/image preparation passes | Docker launcher still fails after successful setup. |
| Docker Chromium/WebKit startup | Fail | NODE_PATH workaround permits startup; does not fix source. |
| Host localhost navigation | Blocked by normal startup | Both engines fail after dependency workaround; zero fixture requests. |
| Local Chromium, path with spaces | Pass | Actual local capture inspected. Local WebKit unverified. |
| Legacy local-only API | Expected missing-browser failure reproduced | No automatic Docker/install; baseline same limitation. |
| CLI project installation | Pass for install/setup | Fresh source includes 11 skill files, including runtime package/lock/scripts; excludes verification/. Browser acceptance still subject to blockers. |
| Concurrent launches and legacy container preservation | Normal concurrency blocked; existing container retained | Unique ports and second-browser survival passed after dependency workaround. Different runtime versions not exercised. |
| Close, startup failure, SIGINT/SIGTERM cleanup | Unmodified startup-failure cleanup passes | Successful close/signals/invalid executable tested after dependency workaround; original container IDs preserved. |
| Delayed click/scroll/eval readiness | End-to-end blocked | Pass after dependency plus local bridge-fixture bypass. |
| False/missing/never-settling readiness and evaluation | Browser cases blocked; invalid arguments reject before launch | Bounded failures, no new image/success JSON, and owned-container cleanup pass with diagnostic bypasses. |
| Shared condition budget and animation settle | End-to-end blocked | Selector plus predicate, 1100ms shared budget, and 600ms animation settle pass diagnostically. |
| Touch and image regressions | End-to-end blocked | Inspected captures/composite pass; Chromium touch versus actual WebKit mouse provenance retained. |
| Old premature capture | Reproduced on baseline timing logic | Common pinned browser in owned disposable container: old 400ms capture shows INITIAL; candidate readiness shows CLICK READY after 900ms delayed update, with diagnostic bypasses. |

## Preservation and next decision

Both agents report their fixture processes and owned containers cleaned up, pre-existing containers preserved, and candidate source blobs unchanged. Only verification reports/harness and this summary are added; no commits, pushes, index updates, Postie changes or installed-skill changes were made.

Suggested next work for Conor to approve: fix dependency layout and surface startup errors, establish real localhost connectivity, then rerun the same two scopes without bypasses. Do not change version/history or apply fixes as part of this verification report.

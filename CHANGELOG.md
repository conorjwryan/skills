# Changelog

Changes to skills maintained in this repository are recorded here, grouped by skill and version. Add upcoming changes under Unreleased, then assign a version and date when releasing them.

## Visual Verify — 1.2.0 — 2026-11-23

- Prefer the host preview browser (e.g. T3 Code's `preview_*` tools) first, ahead of the Playwright scripts, for every check it can do; the scripts become the fallback. Avoids per-run Docker containers, pinned installs, port allocation and orphan-container cleanup.
- Document the preview-to-script mapping: capture via `preview_snapshot`, viewports via `preview_resize` presets, interaction via `preview_act`, readiness via `preview_wait_for`, plus light/dark and recording extras.
- Note the cases that still require the scripts: WebKit/Safari engine checks, the touch-target audit, full-page captures and DPR emulation. Composites run browser-free on preview screenshots.

## Visual Verify — 1.1.0 — 2026-11-16

- Pin Playwright 1.65.1 in a skill-owned package and lockfile; remove implicit global dependency resolution.
- Add explicit Docker/local setup and read-only prerequisite diagnostics, with no downloads during ordinary launch.
- Standardise `launchBrowser(name, options)` while retaining documented local-only compatibility exports.
- Replace shared-port browser servers with per-launch containers, Docker-assigned loopback ports, identity checks and owned-container cleanup. Forward client loopback traffic through Playwright.
- Add bounded post-action selector/predicate readiness and optional animation settling to screenshot and touch checks; bound asynchronous evaluation and close browsers on command failure.
- Report the actual WebKit startup error when falling back to Chromium.
- Correct the Docker mount to preserve node_modules dependency resolution and use the full Playwright server for client loopback forwarding. Retain startup logs before cleanup and report composite backend provenance.
- Add an external verification plan/log. Browser and cross-platform validation remain pending; no Postie integration is included.

## Visual Verify — 1.0.1 — 2026-11-16

- Removed the CMSTron/Lakebed appendix and its project-specific development, authentication, and fixture instructions.
- Kept app startup guidance project-agnostic.
- Updated the skill metadata, displayed version, and README to v1.0.1.

## Visual Verify — 1.0.0 — 2026-11-16

Initial baseline in this repository. Previous versions and their history are not tracked here.

- Imported the existing Visual Verify instructions and five helper scripts from the implementation shared by the local CMSTron installation and nitrogen-codex.
- Preserved screenshot capture, before/after composites, mobile touch checks, and Docker/local Playwright support.
- Replaced global Claude script paths with paths relative to the installed skill, supporting project and global installations.
- Made setup guidance and missing-Playwright errors point to the bundled scripts.
- Added version metadata and repository documentation.

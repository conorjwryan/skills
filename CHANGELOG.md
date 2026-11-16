# Changelog

Changes to skills maintained in this repository are recorded here, grouped by skill and version. Add upcoming changes under Unreleased, then assign a version and date when releasing them.

## Unreleased

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

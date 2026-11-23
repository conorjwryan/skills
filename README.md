# Skills

Custom agent skills for Claude Code, Codex, and other compatible agents.

## Visual Verify — v1.2.1

Visual Verify checks a real running web app using Playwright. It captures screenshots at desktop or mobile sizes, guides the agent to inspect the images, and reports what actually works or needs attention.

It supports:

- Screenshots of a page or component, including states reached by clicking or scrolling.
- Labelled before/after image composites for visual changes.
- iPhone and Android viewport emulation, touch-target audits, tapping, and dragging.
- Chromium and WebKit through Playwright's Docker image, with local-browser fallback.
- When the environment provides a built-in preview browser (e.g. T3 Code's preview tools), it is used first, with the Playwright scripts as fallback for what it cannot do.

Emulation cannot verify native system UI such as the on-screen keyboard. WebKit drag tests use mouse input; Chromium supports real touch drags. The skill requires honest reporting of these limits.

## Install into a project

After this repository is published as `conorjwryan/skills`, run from your project:

```sh
npx skills add conorjwryan/skills --skill visual-verify
```

Choose the agents you want to install it for. For local installation before publishing:

```sh
npx skills add /home/conor/code/skills --skill visual-verify
```

The skill lives at `visual-verify/` in this repository. Installed copies resolve their scripts relative to their own `SKILL.md`; they work independently of any particular project or global Claude installation.

## Browser setup

Requires Node.js 20+, npm, and Bash. Docker is recommended for Chromium and WebKit without installing host system libraries. Run the bundled setup once per machine, using the path of the installed skill:

```sh
VISUAL_VERIFY_DIR="/absolute/path/to/installed/visual-verify"
bash "$VISUAL_VERIFY_DIR/scripts/install.sh"
```

Setup installs the exact locked Playwright dependency inside the installed skill and pulls its matching Docker image, or installs local Chromium if Docker is unavailable. Pass `docker` or `local` to select a setup backend explicitly. No global packages or host system libraries are installed. Normal launches never download dependencies or images.

Run `node "$VISUAL_VERIFY_DIR/scripts/doctor.mjs"` for read-only prerequisite diagnostics. Docker launches use isolated containers with automatically allocated loopback ports and clean up their own containers on close. Playwright forwards local app traffic to the client; macOS/Docker Desktop still needs separate validation.

Use `launchBrowser()` when integrating with project scripts. Legacy `loadChromium().launch()` remains local-only. Screenshot and touch commands accept `--ready-selector`, `--ready-js`, `--ready-timeout`, and `--settle` to check the expected state after actions rather than guessing a delay. See the skill instructions for details.

Ask your agent to use Visual Verify against your local/dev app, for example: “Check this dialog at mobile and desktop widths” or “Show a before/after of this layout change.” See [the skill instructions](visual-verify/SKILL.md) for commands and limitations.

## Docker Container Update — v1.0.0

Docker Container Update audits compose-managed Docker apps for available updates and, only for the apps the user confirms, backs up, updates, tests and validates them.

It supports:

- A read-only audit that produces a markdown update table: pinned images, running containers, local digests vs Docker Hub, newest stable tags, and per-app versions read from inside the containers.
- A **hard stop after the audit** — the skill never updates anything until the user explicitly names the apps to update, and carries exclusions through every phase without touching excluded stacks.
- Cold backups into a dated `maintenance-YYYYMMDD` folder (named volumes, bind mounts, database dumps), verified by listing before anything is recreated.
- Version-pinned compose updates one stack at a time, shared reverse proxies last, old images retained for rollback.
- Validation from container version → startup logs → health endpoints → data intactness → live end-to-end (preview browser first, with an honest fallback), plus an indicators-of-compromise review of logs and app databases for internet-facing apps (n8n, nginx-proxy-manager, ntfy, WordPress), and integration with a project container-audit tool and its baseline workflow.

The bundled `scripts/docker-update-check.sh` is the read-only audit helper; it changes nothing and pulls nothing. Ask your agent to “check the docker apps for updates”, “update n8n and ntfy”, or “review the containers for compromise indicators”. See [the skill instructions](docker-container-update/SKILL.md) for the full workflow.

## Versions and changes

The current Visual Verify version is **v1.2.1** and the current Docker Container Update version is **v1.0.0**. Version history in this repository starts at **v1.0.0**. Earlier implementations existed elsewhere; their versions and history are not tracked here. Record future skill changes in [CHANGELOG.md](CHANGELOG.md), and keep the skill's `metadata.version` in step with releases.

## Verification records

The [v1.1.0 verification plan and log](verification/visual-verify-1.1.0.md) lives outside the installable `visual-verify/` folder. It records claims, baseline comparisons and results separately from agent instructions. The [final verification report](verification/visual-verify-1.1.0-verify-changes.md) records passing independent Linux Docker and local Chromium retests of the fixed v1.1.0 source snapshot. Platform limits and historical failures are retained in the reports.

The [Docker Container Update 1.0.0 verification record](verification/docker-container-update-1.0.0.md) documents the live update run the skill was extracted from, the audit script's checked results, the bugs fixed during verification, and the limits not exercised.

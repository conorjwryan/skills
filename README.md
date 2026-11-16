# Skills

Custom agent skills for Claude Code, Codex, and other compatible agents.

## Visual Verify — v1.1.0

Visual Verify checks a real running web app using Playwright. It captures screenshots at desktop or mobile sizes, guides the agent to inspect the images, and reports what actually works or needs attention.

It supports:

- Screenshots of a page or component, including states reached by clicking or scrolling.
- Labelled before/after image composites for visual changes.
- iPhone and Android viewport emulation, touch-target audits, tapping, and dragging.
- Chromium and WebKit through Playwright's Docker image, with local-browser fallback.

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

## Versions and changes

The current Visual Verify version is **v1.1.0**. Version history in this repository starts at **v1.0.0**. Earlier implementations existed elsewhere; their versions and history are not tracked here. Record future skill changes in [CHANGELOG.md](CHANGELOG.md), and keep the skill's `metadata.version` in step with releases.

## Verification records

The [v1.1.0 verification plan and log](verification/visual-verify-1.1.0.md) lives outside the installable `visual-verify/` folder. It records claims, baseline comparisons and results separately from agent instructions. Browser validation is pending until after the implementation commit; package and syntax checks do not establish browser behaviour.

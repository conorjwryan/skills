# Skills

Custom agent skills for Claude Code, Codex, and other compatible agents.

## Visual Verify — v1.0.1

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

Requires Node.js, npm, and Bash. Docker is recommended for Chromium and WebKit without installing host system libraries. Run the bundled setup once per machine, using the path of the installed skill:

```sh
VISUAL_VERIFY_DIR="/absolute/path/to/installed/visual-verify"
bash "$VISUAL_VERIFY_DIR/scripts/install.sh"
```

Setup installs Playwright globally and pulls its matching Docker image, or installs local Chromium if Docker is unavailable. Browser dependencies are installed separately from the skill files.

Ask your agent to use Visual Verify against your local/dev app, for example: “Check this dialog at mobile and desktop widths” or “Show a before/after of this layout change.” See [the skill instructions](visual-verify/SKILL.md) for commands and limitations.

## Versions and changes

The current Visual Verify version is **v1.0.1**. Version history in this repository starts at **v1.0.0**. Earlier implementations existed elsewhere; their versions and history are not tracked here. Record future skill changes in [CHANGELOG.md](CHANGELOG.md), and keep the skill's `metadata.version` in step with releases.

# Docker Container Update 1.0.0 — verification record

Verified 2026-11-23 on caelum (Ubuntu x86_64, Docker Compose v5.8.0, root-owned
compose data dirs, passwordless sudo). This record is evidence, not instructions.

## Scope verified

The skill was extracted from a live update run performed the same day, so the full
workflow was exercised end to end on real stacks rather than a test harness:

| App | Compose dir | Before | After |
|---|---|---|---|
| n8n | `~/code/docker/n8n` | 2.47.4 | 2.48.7 |
| nginx-proxy-manager | `~/code/docker/npm` | 2.17.0 | 2.17.1 |
| ntfy | `~/code/docker/ntfy` | v2.37.2 | v2.38.1 |

Excluded as instructed: the `ara` WordPress stack (untouched — no pull, no stop, no
restart, not present in the audit output).

## Audit script (`scripts/docker-update-check.sh`)

Ran against `~/code/docker` with `--exclude ara`; results checked against the
known post-update state:

- n8n / npm / ntfy / rustdesk reported ✅ current with correct newest Hub tags
  (2.48.7, 2.17.1, v2.38.1, 1.1.16) — all confirmed correct by the GitHub
  releases API and the same-day manual audit.
- uptime-kuma correctly reported `⬆️ pull recommended (2.5.12 published
  2026-11-17) · not running` for its `:2` rolling tag (no container exists).
- kasm (`lscr.io/linuxserver/kasm`) correctly reported `?` for the Hub tag —
  the script cannot read the lscr.io registry; documented as a limit.

Bugs found and fixed during verification (script shipped fixed):

1. `curl … || true | python3 …` — pipe binds tighter than `||`, so on success
   the raw Hub JSON bypassed the parser and leaked into the table. Fixed by
   wrapping curl in a subshell.
2. `sorted()` on tag names evaluated the version key for non-numeric tags
   (`latest`), crashing the parser (exit 1, `? ?` output). Fixed by filtering
   to numeric tags before sorting.
3. Newest-tag heuristic initially ranked a stale `v3` tag (last pushed
   2024-12-01) above `2.17.1` for nginx-proxy-manager. Fixed: numeric tags
   untouched for over a year are skipped as stale major branches.

## Workflow phases verified in the live run

- **Hard stop**: the update ran only after the user named "the n8n / npm and ntfy
  ones" following a prior-turn audit table; the ara exclusion was honoured
  throughout.
- **Backups**: dated `maintenance-20261123` folder next to the compose root; named
  volume (n8n) via alpine tar container; bind mounts (npm data + letsencrypt under
  sudo; ntfy dir) via tar; every tarball listed and checked before update; old
  images retained.
- **Update**: one stack at a time (n8n → ntfy → npm last); one-line pin edits;
  `docker compose up -d`; brief npm downtime as expected.
- **Validate**: in-container versions (`n8n --version`, `ntfy --version`, npm
  package.json), container image digests matching pinned tags, n8n DB migrations
  completing, `healthz` inside the docker network (no published host port),
  `ntfy /v1/health` healthy with all 10 users intact, NPM admin 200 on its
  Tailscale-only bind, public 200s through Cloudflare for `notify.cjri.uk` and
  `auto.cjri.uk`.
- **Compromise review**: full funnel analysis on nginx access logs (probes
  answered 301/401 only; `.env` probes returning the 4986-byte SPA shell, not
  files); n8n sqlite audit (one owner user, only attributable workflows, all
  webhook executions mapped to GitLab/GitHub hooks); ntfy 956 TLS handshake
  errors from scanners, no auth bypass; npm backend log clean since Nov 12.
  Past-incident artifacts (`evidence-20260619`, `before-password-reset-20260906`)
  left untouched.
- **Container audit**: project tool `docker/scripts/docker-container-audit.sh`
  run before (pre-existing drift reviewed and explained) and after the updates;
  diff confirmed intentional only; baseline refreshed; re-run passed clean.

## Not verified / limitations

- The preview browser was unavailable (no desktop app attached), so the live
  end-to-end check used content-level curl verification (SPA shell titles
  served through Cloudflare) instead of a rendered screenshot. The skill's
  fallback rule was exercised, not the preview path.
- The GitHub-releases cross-check of Hub tags was performed manually with curl;
  the skill instructs the agent to do this but ships no script for it.
- arm64-only hosts and non-root docker-less environments were not exercised.

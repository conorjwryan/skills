---
name: docker-container-update
description: "Audit Docker-compose apps for available updates (pinned image tags vs Docker Hub digests and upstream releases), present a markdown update table, then — only after the user confirms which apps to update — back up each stack's volumes/data, update the compose pins, recreate the containers, and test and validate the result: versions inside containers, health endpoints, logs, data intact, end-to-end through the live proxy/public URL, and an indicators-of-compromise review of logs and app databases. Use whenever the user asks to check docker apps for updates, review what needs updating, update containers or docker apps, upgrade a self-hosted stack (n8n, nginx-proxy-manager, ntfy, gitea, invoice-ninja, WordPress, RustDesk, Uptime Kuma, Kasm, databases), or check container logs for compromise indicators. Read-only until the user explicitly names the apps to update."
metadata:
  version: "1.0.0"
---

# Docker container update

Version: **1.0.0**. Versions before 1.0.0 are not tracked in this repository.

Check what needs updating across compose-managed Docker apps, update only what the user
confirms, and prove the result — including a compromise review of apps that face the internet.
Five phases, in order:

1. **Audit** (read-only) — inventory, versions, digests → markdown table.
2. **Confirm** — *hard stop*: the user names what to update.
3. **Backup** — pull new images, then cold backups of every stack in scope.
4. **Update** — re-pin, recreate, one stack at a time.
5. **Test & validate** — versions, health, logs, data, e2e, compromise review, container audit.

## The hard stop — never skip phase 2

After the audit, **stop and wait for the user to say which apps to update.** Do not infer,
do not proceed on a general "update them" from an earlier turn, do not treat the audit table
itself as approval. The user must explicitly name the apps (or approve the whole list) in a
message *after* seeing the audit.

Only exception: the user's request already names the specific apps ("update n8n and ntfy")
*and* the audit was already run in the same conversation. If the user names apps but no audit
has run yet, run the audit first anyway — the version comparison and data inventory feed the
backup and verification.

Honour exclusions exactly and carry them through every phase ("not the ara ones" means no
pull, no backup, no update, no restart of those stacks — they don't even get stopped).

## Phase 1 — Audit (read-only)

Inventory the compose roots (`~/code/docker`, `~/code/apps`, and any web roots the user
names, e.g. `/var/www`), plus `docker ps -a` (stopped stacks matter — report them). The
bundled script does the tag/digest comparison:

```sh
DCU_DIR="/absolute/path/to/installed/docker-container-update"
bash "$DCU_DIR/scripts/docker-update-check.sh" --compose-root ~/code/docker --exclude ara
```

It prints a markdown table: pinned image, running container, local digest, newest Hub tag,
status. Multiple `--compose-root` values and `--exclude` substrings are supported. Its
newest-tag heuristic ignores numeric Hub tags untouched for over a year (stale major
branches) and treats rolling tags (`latest`, `2`) by digest rather than tag name.

Script limits — cover them yourself, in this order:

- **Newest tag ≠ newest release.** Confirm every ⬆️ row against the project's GitHub
  releases (`https://api.github.com/repos/<org>/<repo>/releases/latest`) or upstream
  changelog before proposing it. Verify the release is not a prerelease.
- **Digest details.** `docker images --digests` and the Hub tags API both report the
  top-level manifest-list digest — those are comparable. Per-architecture digests are not;
  never conclude "re-pushed tag" from one of those.
- **Registries the script can't read** (`lscr.io`, `ghcr.io`) report `?` — check those
  images manually.
- **Running app version** — the script reads image tags, not the app inside. Get the real
  version per app:

  | App | Command |
  |---|---|
  | n8n | `docker exec <c> n8n --version` |
  | ntfy | `docker exec <c> ntfy --version` |
  | nginx-proxy-manager | `docker exec <c> sh -c "grep -m1 '\"version\"' /app/package.json"` |
  | Gitea | `docker exec -u <uid> <c> gitea --version` |
  | Invoice Ninja | app UI → System Settings, or the container's `VERSION` env / `composer` metadata |
  | WordPress | `docker exec <c> grep -m1 "wp_version =" /var/www/html/wp-includes/version.php` |
  | MariaDB / MySQL | `docker exec <c> mariadb --version` (or `mysqld --version`) |
  | RustDesk server | `docker logs <c> 2>&1 \| head` or `hbbs --version` |

Add a **compromise pre-check** while you are read-only (it is cheap and captures logs the
update would rotate): skim each running app's logs for indicators of compromise — see
*Phase 5 — compromise review* for what to look for. Report anything suspicious *before*
updating; an incident in progress changes the plan from "update" to "preserve evidence".

Present the table with: app, location, service/image, running version, latest available,
status. Note which images are digest-pinned, version-pinned, or floating. State clearly that
nothing was changed beyond possible image pulls (the audit script itself pulls nothing).

## Phase 2 — Confirm scope

Ask the user which apps to update and wait for the answer. Useful context to include:
risk notes (major vs minor version jumps), which stacks share a reverse proxy (their update
window affects everything behind it), and anything found in the pre-check. If the user names
exclusions, restate the final scope list — "n8n, NPM and ntfy; ara untouched" — so a mistake
is caught before anything stops.

## Phase 3 — Backup

Create a dated maintenance folder next to the compose root and keep every artifact there:

```sh
MAINT="$HOME/code/docker/maintenance-$(date +%Y%m%d)"; mkdir -p "$MAINT"
```

Per stack, in this order:

1. **Pull the new image first** (`docker compose pull <service>`) — safe, touches nothing
   running, and means the download can't fail after the container is stopped.
2. **Stop just that stack** (`docker compose stop <service>`).
3. **Cold-backup its data:**
   - Named volume: `docker run --rm -v <volume>:/data -v "$MAINT":/backup alpine \
     tar czf /backup/<volume>-pre-<newver>.tar.gz -C /data .`
   - Bind mounts: `tar czf "$MAINT/<name>-data-pre-<newver>.tar.gz" -C <dir> .`
     (use `sudo` for root-owned dirs, and keep the tarball ownership usable)
   - Databases behind an app (e.g. Invoice Ninja): also take a consistent
     `mysqldump`-style dump while the stack is stopped or explicitly quiesced.
4. **Verify the backup**: list the tarball contents and check it contains the databases and
   config you saw on disk. A backup you haven't listed is not a backup.

Name every artifact `what-pre-<newversion>` — the folder should read as a runnable rollback
plan. Retain the *old* images; they are the fastest rollback. Never delete or overwrite
existing backups, and never delete prior maintenance folders (they may hold incident
evidence).

## Phase 4 — Update

One stack at a time. For each:

1. Edit the compose file pin to the **exact new version** — never `:latest` (audit drift and
   surprise upgrades are what pins prevent). If the file already pins, this is a one-line
   change; confirm with `git diff` if the dir is versioned.
2. `docker compose up -d` (recreates only that stack's containers).
3. **Order matters:** update shared infrastructure (nginx-proxy-manager, traefik, cloudflared)
   *last*, after the apps behind it are healthy — and expect a brief outage for everything
   behind it while it restarts.

## Phase 5 — Test & validate

For each updated stack, in increasing order of ambition. Check each level before the next.

1. **Version**: run the phase-1 version command again — the app must report the *new*
   version, and the container's image digest must match the newly pinned tag
   (`docker inspect <c> --format '{{.Image}}'` vs `docker images --digests`).
2. **Logs**: startup must be clean. Distinguish real errors from benign lines — s6-overlay
   deprecation warnings, task-runner notices, debug registrations. DB migrations should run
   and finish; never stop a container mid-migration.
3. **Health endpoints**: local first (inside the docker network if no host port is
   published — `docker exec <proxy> curl http://<service>:<port>/healthz`), then through the
   reverse proxy, then the public URL.
4. **Data intact**: app-specific — n8n: workflow count, active workflows (`n8n list:workflow
   --active=true`), user list, credentials list; ntfy: `ntfy user list` against the auth
   file; NPM: proxy hosts and admin users in its database; WordPress: sites load, DB intact;
   Gitea: `gitea doctor check` / repo counts.
5. **End-to-end, live**: prefer the host preview browser (e.g. T3 Code's browser tools) to
   load the real public URL and confirm the UI actually renders — version numbers and health
   JSON don't prove the SPA works. **If no preview browser is attached, fall back to
   content-level checks** (curl the page and verify it serves the expected app shell, e.g.
   the SPA `<title>`) and **say plainly which path you used** and that the visual
   confirmation did not happen.
6. **Compromise review** — see below.
7. **Container audit** — see below.

## Phase 5a — Compromise review (internet-facing apps)

These apps have been compromised before on some machines, so review for indicators of
compromise as part of every update — before *and* after. Evidence lives in docker logs,
the app's own databases, and the proxy's access logs.

Read the **whole funnel** before judging: a request is only interesting if it got a
successful response. For each suspicious path family in nginx access logs, check what
status it actually served:

- **Benign noise**: probes answered with 301/401/403/404; TLS handshake errors from scanner
  ranges (Censys 167.94.x.x, masscan noise) that never complete; binary garbage in request
  lines; `CONNECT`/`SETROOTCERTIFICATE` odd methods getting non-2xx.
- **Indicators worth escalating**: 2xx/3xx on `.env`/`.git`/credential paths *with real
  content lengths* (SPA catch-alls also answer `.env` probes with the app shell — check the
  length is the app's index.html, not a file dump); any 200 on `/rest/login`, admin
  write APIs, or file-management endpoints; new or unexpected users, workflows, proxy hosts,
  or API keys; logins at hours you can't account for; outbound connections the app has no
  reason to make.

App-specific audit recipes:

- **n8n**: copy `database.sqlite` (plus `-wal`/`-shm`) out of the volume and inspect with
  sqlite3 — `user` (one expected owner; flag unknown emails, `disabled` state, MFA off),
  `workflow_entity` (name/active/updatedAt — flag workflows you can't attribute), 
  `credentials_entity` (type + updatedAt — flag unknown types or surprise refreshes),
  `execution_entity` joined to workflows (every `mode=webhook` execution must map to a
  workflow you recognise), and `webhook_entity`. In logs: `Received webhook "POST" for path
  …` must all resolve to those workflows.
- **nginx-proxy-manager**: its sqlite DB — `user` (active admins), `proxy_host`
  (domain_names/forward_host/enabled/is_deleted — flag new or re-enabled hosts),
  `access_list`. Backend log for auth/migration anomalies. Past-incident artifacts
  (`*.evidence-*`, `*before-password-reset*`) are preserved evidence — leave them.
- **ntfy**: `ntfy user list` against the auth file — every user should be attributable,
  anonymous should have no access, and `NTFY_AUTH_DEFAULT_ACCESS: deny-all` should be set.
  Logs: denied/forbidden (expected if a topic is probed), successful publishes to topics
  you don't recognise (not expected).
- **WordPress**: `wp-includes/version.php` version, admin users in the DB, and — on past
  compromise — plugins/themes integrity (`wp core verify-checksums` via the
  `wordpress:cli` image if available).

## Phase 5b — Container audit & baseline

If the machine has a container audit tool (e.g. `docker/scripts/docker-container-audit.sh`
with a `baseline`/`audit` pair — check `~/code/docker/scripts/` and its README), use it:

1. Run `audit` **before** touching anything; read the diff even if it fails. Pre-existing
   drift is context, not an obstacle — but confirm each line is explainable before
   proceeding (an unexplained privileged container or changed bind mount is a stop).
2. Update the stacks.
3. Run `audit` again; confirm the diff contains **only** the intentional image changes.
4. Refresh the baseline per that tool's documented workflow, then re-run to confirm it
   passes clean. Only refresh after the diff is confirmed intentional.

## Phase 6 — Report

Markdown tables: what was updated (before → after per app), where the backups are (real
paths), and verification results per level. Include the compromise-review findings — both
windows (pre- and post-update), and name the benign-noise patterns you dismissed so the
user can sanity-check the reasoning. Note honestly what was *not* verified (no preview
browser, WebKit untested, public checks behind an access proxy). Leave the rollback path
stated: old images + backup tarballs + the compose diff.

## Honesty rules (important)

- **Verify versions from inside the containers**, not from image tags — tags say what was
  pulled, not what runs.
- **Read the logs you cite.** Grep counts without reading matches are not evidence; sample
  the lines and confirm what they are.
- **A matching digest means the tag is unchanged** — not that the app is current, and not
  that the tag still points where it did when you pinned it.
- **Never fabricate a health or e2e check.** If a level can't be tested (no preview
  browser, app behind an access proxy you can't pass), say so and report what you did
  instead.
- **Don't touch excluded stacks at all** — not even a pull or a stop "while you're there".
- **Don't delete anything**: not old images, not old backups, not incident artifacts, not
  rotated logs. Deletion is the user's decision.

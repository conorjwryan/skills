#!/usr/bin/env bash
# Docker Container Update — read-only audit of compose-managed apps.
# Compares pinned image tags and local digests against Docker Hub, and finds
# newer stable tags. Prints a markdown table. Changes nothing.
#
# Usage:
#   docker-update-check.sh [--compose-root DIR]... [--exclude NAME]...
#
# Multiple --compose-root values are scanned (default: ~/code/docker).
# --exclude skips compose dirs whose name contains NAME (repeatable).
set -euo pipefail

COMPOSE_ROOTS=()
EXCLUDES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-root) COMPOSE_ROOTS+=("$2"); shift 2 ;;
    --exclude)      EXCLUDES+=("$2"); shift 2 ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
done

if [[ ${#COMPOSE_ROOTS[@]} -eq 0 ]]; then
  COMPOSE_ROOTS=("$HOME/code/docker")
fi

command -v docker >/dev/null || { echo "docker CLI not available" >&2; exit 1; }
command -v curl  >/dev/null || { echo "curl not available" >&2; exit 1; }

excluded() {
  local dir="$1" e
  for e in "${EXCLUDES[@]:-}"; do
    [[ -n "$e" && "$dir" == *"$e"* ]] && return 0
  done
  return 1
}

# Docker Hub digest for a tag (manifest-list digest, top level).
hub_digest() {
  local repo="$1" tag="$2" out
  out="$(curl -sf --max-time 20 "https://hub.docker.com/v2/repositories/${repo}/tags/${tag}" || true)"
  python3 - "$out" <<'PY' 2>/dev/null || echo "?"
import json, sys
try:
    d = json.loads(sys.argv[1])
except Exception:
    print("?"); raise SystemExit
print(d.get("digest", "?"))
PY
}

# Newest stable-looking tag on Docker Hub (numeric tags, v-prefix allowed;
# excludes arch suffixes, nightlies, rc/beta, and numeric tags untouched for
# over a year — usually stale major branches, e.g. a lone v3 next to 2.x.y).
# Prints "tag date".
hub_latest_tag() {
  local repo="$1"
  (curl -sf --max-time 25 "https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100" || true) \
  | python3 -c '
import json, re, sys, datetime
def key(t):
    return [int(x) for x in t.lstrip("v").split(".")]
try:
    d = json.load(sys.stdin)
except Exception:
    print("? ?"); raise SystemExit
cutoff = datetime.date.today() - datetime.timedelta(days=365)
cands = []
for t in d.get("results", []):
    name = t["name"]
    if not re.fullmatch(r"v?\d+(\.\d+){0,3}", name):
        continue
    cands.append((key(name), name, t.get("last_updated", "")[:10]))
best = None
for _, name, updated in sorted(cands, reverse=True):
    try:
        if datetime.date.fromisoformat(updated) < cutoff:
            continue  # stale numeric tag, skip
    except ValueError:
        pass
    best = (name, updated or "?")
    break
print(f"{best[0]} {best[1]}" if best else "? ?")
' 2>/dev/null || echo "? ?"
}

rows=()
scan_root() {
  local root="$1"
  [[ -d "$root" ]] || { echo "compose root not found: $root" >&2; return; }
  local dir
  for dir in "$root"/*/; do
    dir="${dir%/}"
    local name proj
    name="$(basename "$dir")"
    excluded "$name" && continue
    local compose_file=""
    for f in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
      [[ -f "$dir/$f" ]] && { compose_file="$dir/$f"; break; }
    done
    [[ -n "$compose_file" ]] || continue
    proj="$name"

    # Images pinned in the compose file (dollar-var images are reported unparsed).
    while read -r image; do
      [[ -n "$image" ]] || continue
      local repo tag running local_digest remote_digest latest latest_tag latest_date status
      repo="${image%%:*}"; tag="${image#*:}"
      [[ "$tag" == "$image" ]] && tag="latest"
      [[ "$image" == *'${'* ]] && { rows+=("| $name | \`$dir\` | $image | ? | ? | ? | ? | ⚠️ unparsed image |"); continue; }

      # Running container for this project (compose labels), best match on image repo.
      running="$(docker ps -a --filter "label=com.docker.compose.project=$proj" \
        --format '{{.Image}}\t{{.Names}}\t{{.Status}}' 2>/dev/null \
        | grep -F "$repo" | head -1 || true)"
      local running_img="-" running_name="-" running_status="not running"
      [[ -n "$running" ]] && {
        running_img="$(echo "$running" | cut -f1)"
        running_name="$(echo "$running" | cut -f2)"
        running_status="$(echo "$running" | cut -f3 | cut -d' ' -f1-3)"
      }

      local_digest="$(docker images --digests --format '{{.Repository}}:{{.Tag}} {{.Digest}}' | awk -v r="$repo:$tag" '$1==r{print $2}' | head -1)"
      [[ -z "$local_digest" ]] && local_digest="not pulled"
      remote_digest="$(hub_digest "$repo" "$tag")"
      latest="$(hub_latest_tag "$repo")"
      latest_tag="${latest%% *}"; latest_date="${latest#* }"

      status="✅ current"
      rolling=0
      [[ "$tag" == "latest" || "$tag" =~ ^v?[0-9]+$ ]] && rolling=1
      if (( rolling )); then
        # Rolling tag (latest / major-only): the digest decides.
        if [[ "$local_digest" == "not pulled" ]]; then
          status="⬆️ pull recommended ($latest_tag published $latest_date)"
        elif [[ "$remote_digest" != "?" && "$local_digest" != "$remote_digest" ]]; then
          status="⬆️ newer build on \`:$tag\`"
        fi
      elif [[ "$latest_tag" != "?" && "$latest_tag" != "$tag" ]]; then
        status="⬆️ $latest_tag available"
      fi
      if [[ "$local_digest" != "not pulled" && "$remote_digest" != "?" \
            && "$local_digest" != "$remote_digest" && "$tag" != "latest" ]]; then
        status="$status · pinned tag re-pushed"
      fi
      [[ "$running_img" == "-" ]] && status="$status · not running"

      rows+=("| $name | \`$dir\` | \`$image\` | $running_img ($running_name, $running_status) | ${local_digest:0:19}… | \`$latest_tag\` ($latest_date) | $status |")
    done < <(grep -hE '^[[:space:]]*image:[[:space:]]*' "$compose_file" | awk '{print $2}' | sort -u)
  done
}

for root in "${COMPOSE_ROOTS[@]}"; do scan_root "$root"; done

echo "## Docker app update audit"
echo
echo "Generated $(date -u '+%Y-%m-%d %H:%M UTC') by docker-update-check.sh (read-only)."
echo
echo "| Compose dir | Pinned image | Running | Local digest | Newest Hub tag | Status |"
echo "|---|---|---|---|---|---|"
[[ ${#rows[@]} -eq 0 ]] && echo "| (none found) | | | | | |" || printf '%s\n' "${rows[@]}"
echo
echo "Confirm newest *release* versions against upstream (GitHub releases) before updating;"
echo "a newer Hub tag can be a nightly, and a matching digest means the tag is unchanged, not that the app is current."

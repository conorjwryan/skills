#!/usr/bin/env bash
# Explicit per-installation setup. No global npm or system-package changes.
set -euo pipefail
visual_verify_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
backend="${1:-auto}"
case "$backend" in auto|docker|local) ;; *) echo 'Usage: install.sh [auto|docker|local]' >&2; exit 2 ;; esac
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix "$visual_verify_root" --ignore-scripts --no-audit --no-fund
version="$(node -p "require(process.argv[1]).dependencies.playwright" "$visual_verify_root/package.json")"
if [[ "$backend" != local ]] && docker info >/dev/null 2>&1; then
  docker pull "mcr.microsoft.com/playwright:v${version}-noble"
elif [[ "$backend" == docker ]]; then
  echo 'Docker requested but unavailable.' >&2; exit 1
else
  node "$visual_verify_root/node_modules/playwright/cli.js" install chromium
fi
printf 'Setup complete. Inspect prerequisites: node %q\n' "$visual_verify_root/scripts/doctor.mjs"
echo 'Setup does not prove a browser launch; run an explicit local-app smoke check next.'

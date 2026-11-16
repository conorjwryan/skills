#!/usr/bin/env bash
# One-time install for the visual-verify skill (run per machine).
# Installs the Playwright library globally. Browsers run in Playwright's Docker
# image when Docker is installed; otherwise a local Chromium is used.
# Never installs system packages.
set -euo pipefail

visual_verify_scripts_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Playwright (global) ..."
npm install -g playwright >/dev/null 2>&1 || npm install -g playwright

if docker info >/dev/null 2>&1; then
  version=$(node -p "require('$(npm root -g)/playwright/package.json').version")
  echo "Docker found: pulling mcr.microsoft.com/playwright:v${version}-noble (Chromium + WebKit) ..."
  docker pull "mcr.microsoft.com/playwright:v${version}-noble"
else
  echo "Docker not found: installing local Chromium as a fallback (no WebKit / iPhone engine) ..."
  npx --yes playwright install chromium
fi

echo
echo "Done. Verify with:"
printf '  node %q \\\n' "$visual_verify_scripts_dir/screenshot.mjs"
echo "    --url https://example.com --out /tmp/_vv_check.png --width 390 --height 844"

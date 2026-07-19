#!/usr/bin/env bash
# Phantom Fleet — Codespaces setup: Compact devtools 0.5.1 (compactc 0.31.1).
# Install method per MIDNIGHT-FEASIBILITY-REPORT.md §2: shell installer from
# midnightntwrk/compact releases, then `compact update`. No Docker needed.
set -euo pipefail

export PATH="$HOME/.compact/bin:$HOME/.local/bin:$PATH"

if ! command -v compact >/dev/null 2>&1; then
  echo "== installing compact devtools =="
  curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
fi

export PATH="$HOME/.compact/bin:$HOME/.local/bin:$PATH"

echo "== pinning devtools 0.5.1 (compiler 0.31.1) =="
compact update 0.5.1 || compact update

compact --version
echo "== compact devtools ready =="

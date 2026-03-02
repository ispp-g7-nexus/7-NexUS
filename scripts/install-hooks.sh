#!/usr/bin/env bash
set -euo pipefail

HOOK_DIR=".githooks"
HOOK_FILE="$HOOK_DIR/commit-msg"

if [ ! -f "$HOOK_FILE" ]; then
  echo "No hook found at $HOOK_FILE"
  exit 1
fi

chmod +x "$HOOK_FILE"
git config core.hooksPath "$HOOK_DIR"

echo "Hooks installed successfully"

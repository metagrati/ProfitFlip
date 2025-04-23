#!/usr/bin/env bash
set -euo pipefail

NAME="$1"
TARGET="bash-vault/scripts/$NAME"
META="bash-vault/metadata/${NAME%.sh}.meta.json"

[[ -f "$TARGET" ]] && { echo "❌ $NAME already exists"; exit 1; }

touch "$TARGET"
chmod +x "$TARGET"

cat > "$META" <<JSON
{
  "script": "$NAME",
  "description": "TODO: Describe what this script does",
  "created": "$(date -I)",
  "author": "$(git config user.name || echo unknown)",
  "testedOn": [],
  "appliesTo": [],
  "tags": []
}
JSON

node bash-vault/sync-index.js

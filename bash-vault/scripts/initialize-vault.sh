#!/usr/bin/env bash
# Re-initialize the vault system, patch README, and sync index

set -euo pipefail

echo "🔧 Patching README.md if needed..."
if ! grep -q "## 🧰 Bash Vault" README.md; then
  cat >> README.md <<'MARK'

---

## 🧰 Bash Vault

Reusable infrastructure scripts with metadata, stored in `bash-vault/`.

- Scripts live in [`bash-vault/scripts/`](bash-vault/scripts/)
- Metadata lives in [`bash-vault/metadata/`](bash-vault/metadata/)
- Index is auto-generated in [`bash-vault/index.md`](bash-vault/index.md)

To add and index a new script:

```bash
make new NAME=my-script.sh
make sync
```
MARK
else
  echo "ℹ️ README.md already mentions Bash Vault."
fi

echo "📄 Syncing index..."
node bash-vault/sync-index.js

echo "✅ Bash Vault is initialized."

#!/usr/bin/env bash
# post-bootstrap-ops.sh — enhances ProfitFlip after Plan B² scaffolding
# Usage: bash post-bootstrap-ops.sh

set -euo pipefail

# Assertions
assert_file_exists() {
  [[ -f "$1" ]] || { echo "❌ Missing required file: $1"; exit 1; }
}

assert_contains() {
  grep -q "$2" "$1" || { echo "❌ File $1 does not contain expected text: $2"; exit 1; }
}

echo "🔍 Checking repo state..."

# Validate required base files
assert_file_exists plan-b2.yaml
assert_file_exists docs/plan-b2.checklist.md
assert_file_exists .github/workflows/ci-status.yml

# Step 1: Trigger race-test manually (instruct user, not automated)
echo "📌 ACTION REQUIRED: Please go to GitHub → Actions → run `race-test.yml`"
echo "  Then ensure both checklist items (P2, P3) are ticked, and no conflicts occurred."
echo ""

# Step 2: Add Makefile
echo "📄 Creating Makefile..."

cat > Makefile <<'EOF'
checklist:
	node bin/gen-checklist.js > docs/plan-b2.checklist.md

lint:
	node bin/lint-checklist.js

smoke:
	bash scripts/run-green-flag.sh

tick:
	node .github/actions/tick-checklist/index.js --item="Green-flag drill"

bootstrap:
	./bootstrap-plan-b2.sh
EOF

assert_contains Makefile "checklist:"
assert_contains Makefile "lint:"

# Step 3: Expand README
echo "📝 Updating README.md..."

cat > README.md <<'EOF'
# ProfitFlip – Checklist-driven Contingency Automation

ProfitFlip turns a YAML backlog (`plan-b2.yaml`) into a GitHub-hosted Markdown checklist, then uses a custom GitHub Action to tick items off after successful smoke tests.

## Quick start

```bash
git clone https://github.com/metagrati/ProfitFlip.git
pnpm install
./bootstrap-plan-b2.sh
make checklist  # or: node bin/gen-checklist.js > docs/plan-b2.checklist.md


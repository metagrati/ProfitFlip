#!/usr/bin/env bash
set -euo pipefail

START=$(date -u +%s)
echo "🏁 Starting green-flag smoke suite at $(date -u)"

run_or_fail() {
  DESC="$1"
  CMD="$2"
  echo "::group::Running: $DESC"
  echo "+ $CMD"
  bash -c "$CMD" || { echo "❌ FAILED: $DESC"; exit 1; }
  echo "✅ PASSED: $DESC"
  echo "::endgroup::"
}

# Example smoke test invocations — replace as needed
run_or_fail "Ping demo API" "curl -fs https://demo.vercel.app/api/ping"
run_or_fail "Fly healthcheck" "curl -fs https://operator.fly.dev/healthz"

# Optional if smoke:* scripts exist
[[ -f package.json ]] && jq -e '.scripts[\"smoke:fork\"]' package.json &>/dev/null && run_or_fail "smoke:fork" "pnpm run smoke:fork" || echo "🟡 Skipping smoke:fork (not defined)"
[[ -f package.json ]] && jq -e '.scripts[\"smoke:amoy\"]' package.json &>/dev/null && run_or_fail "smoke:amoy" "pnpm run smoke:amoy" || echo "🟡 Skipping smoke:amoy (not defined)"

END=$(date -u +%s)
DUR=$((END - START))
echo "🕒 Duration: ${DUR}s"
echo "$DUR" > /tmp/stopwatch


#!/usr/bin/env bash
set -euo pipefail

START=$(date -u +%s)
echo "🏁 Starting green-flag smoke suite at $(date -u)"

MAX_RETRIES=3
RETRY_DELAY=5 # seconds

run_or_fail() {
  DESC="$1"
  CMD="$2"
  SHOULD_RETRY=${3:-false} # Default to false if third arg is not provided

  echo "::group::Running: $DESC"
  echo "+ $CMD"

  current_try=1
  while true; do
    if bash -c "$CMD"; then
      echo "✅ PASSED: $DESC"
      echo "::endgroup::"
      return 0 # Success
    fi

    # If command failed and retries are disabled or max retries reached
    if [[ "$SHOULD_RETRY" != true || $current_try -ge $MAX_RETRIES ]]; then
      echo "❌ FAILED: $DESC (after $current_try attempt(s))"
      echo "::endgroup::"
      exit 1 # Failure
    fi

    echo "🟡 Command failed. Retrying in ${RETRY_DELAY}s... (Attempt $((current_try + 1))/$MAX_RETRIES)"
    sleep $RETRY_DELAY
    current_try=$((current_try + 1))
  done
}

# Run Fly healthcheck with retries enabled
# REMOVED: run_or_fail "Fly healthcheck" "curl -fs --max-time 10 https://operator.fly.dev/healthz" true

# Optional if smoke:* scripts exist
# Note: Retries are NOT enabled by default for these pnpm scripts
[[ -f package.json ]] && jq -e '.scripts["smoke:fork\"]' package.json &>/dev/null && run_or_fail "smoke:fork" "pnpm run smoke:fork" || echo "🟡 Skipping smoke:fork (not defined)"
[[ -f package.json ]] && jq -e '.scripts["smoke:amoy\"]' package.json &>/dev/null && run_or_fail "smoke:amoy" "pnpm run smoke:amoy" || echo "🟡 Skipping smoke:amoy (not defined)"

END=$(date -u +%s)
DUR=$((END - START))
echo "🕒 Duration: ${DUR}s"
echo "$DUR" > /tmp/stopwatch


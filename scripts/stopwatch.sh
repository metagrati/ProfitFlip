#!/usr/bin/env bash
set -euo pipefail
CMD=${1:-start}; TMP=/tmp/plan_b_stopwatch
[[ "$CMD" == start ]] && { date -u +%s > "$TMP"; echo "Stopwatch started."; exit; }
[[ "$CMD" == check ]] || { echo "Usage: $0 {start|check}"; exit 1; }
[[ -f "$TMP" ]] || { echo "::error::Stopwatch not started."; exit 1; }
START=$(cat "$TMP"); NOW=$(date -u +%s); DUR=$((NOW-START)); echo "Elapsed ${DUR}s"
(( DUR > 7200 )) && { echo "::error::>2 h buffer blown"; exit 1; }

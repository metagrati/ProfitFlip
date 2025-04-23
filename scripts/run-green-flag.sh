#!/usr/bin/env bash
set -euo pipefail
pnpm run smoke:fork
pnpm run smoke:amoy
curl -fsS --max-time 5 https://demo.vercel.app/api/ping
curl -fsS --max-time 5 https://operator.fly.dev/healthz

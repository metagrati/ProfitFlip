# ----------------------------------------------
# bootstrap-plan-b2.sh
# ----------------------------------------------
set -euo pipefail
mkdir -p docs scripts bin .github/workflows .github/actions/tick-checklist
cat > docs/plan-b2.checklist.md <<"EOF"
# Plan B⁗.2 — progress tracker
<!-- Auto-updated by .github/workflows/update-checklist.yml -->
## Patches
- [ ] P1 secrets-verify committed and green in CI
- [ ] P2 Fly cold-start guard merged
## Drills
- [ ] Green-flag drill completed (`./scripts/run-green-flag.sh`)
- [ ] Live-fire rollback rehearsal completed
## Definition of Done
- [ ] Secrets-verify passes on both Fly & Vercel (ID 10)
EOF

cat > scripts/stopwatch.sh <<"EOF"
#!/usr/bin/env bash
set -euo pipefail
CMD=${1:-start}; TMP=/tmp/plan_b_stopwatch
[[ "$CMD" == start ]] && { date -u +%s > "$TMP"; echo "Stopwatch started."; exit; }
[[ "$CMD" == check ]] || { echo "Usage: $0 {start|check}"; exit 1; }
[[ -f "$TMP" ]] || { echo "::error::Stopwatch not started."; exit 1; }
START=$(cat "$TMP"); NOW=$(date -u +%s); DUR=$((NOW-START)); echo "Elapsed ${DUR}s"
(( DUR > 7200 )) && { echo "::error::>2 h buffer blown"; exit 1; }
EOF
chmod +x scripts/stopwatch.sh

cat > scripts/run-green-flag.sh <<"EOF"
#!/usr/bin/env bash
set -euo pipefail
pnpm run smoke:fork
pnpm run smoke:amoy
curl -fsS --max-time 5 https://demo.vercel.app/api/ping
curl -fsS --max-time 5 https://operator.fly.dev/healthz
EOF
chmod +x scripts/run-green-flag.sh

cat > bin/lint-checklist.js <<"EOF"
// simple duplicate checker
#!/usr/bin/env node
const fs = require('fs');
const md = fs.readFileSync(process.argv[2]||'docs/plan-b2.checklist.md','utf8').split('\n');
const dupe = md.filter(l=>/^-\s\[\s\]/.test(l)).map(l=>l.slice(6).trim())
  .filter((v,i,a)=>a.indexOf(v)!==i);
if(dupe.length){ console.error('Duplicates:',dupe); process.exit(1); }
console.log('Checklist OK, unchecked:', md.filter(l=>/^-\s\[\s\]/.test(l)).length);
EOF
chmod +x bin/lint-checklist.js

cat > .github/workflows/ci-status.yml <<"EOF"
name: CI Status
on: [push, pull_request]
jobs:
  progress:
    if: ${{ github.actor != 'github-actions[bot]' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20}
      - run: npm i -g pnpm
      - run: ./scripts/run-green-flag.sh
      - uses: ./.github/actions/tick-checklist
        with:
          checklist-path: docs/plan-b2.checklist.md
          items: |
            P1 secrets-verify committed and green in CI
            Green-flag drill completed (`./scripts/run-green-flag.sh`)
      - uses: peter-evans/create-pull-request@v6
        with:
          branch: progress-bot/${{ github.run_id }}
          delete-branch: true
          title: "chore(progress): auto-update checklist"
          commit-message: "chore(progress): auto-tick items"
EOF

mkdir -p .github/actions/tick-checklist
cat > .github/actions/tick-checklist/action.yml <<"EOF"
name: Tick Checklist
inputs:
  checklist-path: {required: true}
  items: {required: true}
runs:
  using: node20
  main: index.js
EOF

cat > .github/actions/tick-checklist/index.js <<"EOF"
const fs = require('fs'); const core = require('@actions/core');
const path = core.getInput('checklist-path'); const targets = core.getInput('items').split('\n').filter(Boolean);
const lines = fs.readFileSync(path,'utf8').split('\n'); let dirty=false;
lines.forEach((l,i)=>targets.forEach(t=>{ if(l.trim()==`- [ ] ${t}`){lines[i]=l.replace('- [ ]','- [x]'); dirty=true;} }));
dirty && fs.writeFileSync(path,lines.join('\n'));
EOF
echo ".DS_Store\nnode_modules" > .gitignore
git init && git add . && git commit -m "feat: scaffold Plan B⁗.2 launch kit"
echo "Repo ready → push to GitHub when you’re set."
# ----------------------------------------------


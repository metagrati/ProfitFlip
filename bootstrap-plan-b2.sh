#!/bin/bash
set -euo pipefail

echo "🛠 Bootstrapping Plan B checklist system..."

# 0. Requirements check
REQUIRED_CMDS=("node" "npm" "git")
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ Required command '$cmd' is not installed. Please install it and re-run."
    exit 1
  fi
done

# Ensure local Node modules folder exists
mkdir -p node_modules

# 1. Install js-yaml if not present
if ! node -e "require('js-yaml')" &>/dev/null; then
  echo "📦 Installing 'js-yaml' locally..."
  npm install js-yaml --save-dev > /dev/null
else
  echo "✅ js-yaml is already installed"
fi

# 2. Create structure
mkdir -p docs scripts bin .github/workflows .github/actions/tick-checklist

# 3. YAML source of truth
cat > plan-b2.yaml <<EOF
patches:
  P1: secrets-verify committed and green in CI
  P2: Fly cold-start guard merged
  P3: entrypoint.sh idempotent migrations
  P4: demo wallet pre-fund
  P5: rollback observability
  P6: pm2 log rotation + tmux tweaks
  P7: pnpm-store path pinned
  P8: CI gate hard-fail / timeout
drills:
  - Green-flag drill completed
  - Live-fire rollback rehearsal completed
done:
  - secrets-verify passes on Fly & Vercel
EOF

# 4. Checklist generator
cat > bin/gen-checklist.js <<'EOF'
#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');
const src = yaml.load(fs.readFileSync('plan-b2.yaml', 'utf8'));
let md = '# Plan B⁗.2 — progress tracker\n\n';
for (const [section, body] of Object.entries({
  Patches: src.patches,
  Drills:  src.drills,
  'Definition of Done': src.done
})) {
  md += `## ${section}\n`;
  if (Array.isArray(body)) {
    body.forEach(i => md += `- [ ] ${i}\n`);
  } else {
    Object.entries(body).forEach(([k,v]) => md += `- [ ] ${k} ${v}\n`);
  }
  md += '\n';
}
fs.writeFileSync('docs/plan-b2.checklist.md', md);
EOF
chmod +x bin/gen-checklist.js
node bin/gen-checklist.js

# 5. Checklist linter
cat > bin/lint-checklist.js <<'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'docs', 'plan-b2.checklist.md');
const raw = fs.readFileSync(FILE, 'utf8').split('\n');
const boxRx = /^- \[([ x])] (.+)$/;
const items = [];
let badLine = null;
raw.forEach((line, idx) => {
  const m = line.match(boxRx);
  if (m) {
    const text = m[2].trim();
    items.push({ text, idx: idx + 1 });
  } else if (line.startsWith('- [')) {
    badLine = idx + 1;
  }
});
if (badLine) { console.error(`Malformed checkbox at line ${badLine}`); process.exit(1); }
const dups = items.filter((v, i, arr) => arr.findIndex(w => w.text === v.text) !== i);
if (dups.length) { console.error('Duplicate checklist items:', dups.map(d => d.text)); process.exit(2); }
const patchIds = items.map(i => i.text.match(/^(P\d+)/)).filter(Boolean).map(m => m[1]);
if (patchIds.length) {
  const sorted = [...patchIds].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  if (patchIds.join() !== sorted.join()) {
    console.error('Patch items out of order:', patchIds.join(', '));
    process.exit(3);
  }
}
console.log('Checklist lint ✔');
EOF
chmod +x bin/lint-checklist.js

# 6. GitHub Action: tick-checklist
cat > .github/actions/tick-checklist/action.yml <<EOF
name: Tick Checklist Item
description: Mark a Markdown checklist item as done with audit trail.
runs:
  using: 'node16'
  main: 'index.js'
inputs:
  item:
    description: 'Exact text or unique substring of the checklist line'
    required: true
  path:
    description: 'Relative path to checklist file'
    default: 'docs/plan-b2.checklist.md'
EOF

cat > .github/actions/tick-checklist/index.js <<'EOF'
const core = require('@actions/core');
const fs   = require('fs');
const path = require('path');

(async () => {
  try {
    const item = core.getInput('item', { required: true });
    const file = core.getInput('path');
    const FILE = path.join(process.cwd(), file);
    let txt = fs.readFileSync(FILE, 'utf8');
    const now = new Date().toISOString().slice(0,16).replace('T',' ');
    const esc = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx  = new RegExp(`^- \\[ \\] .*${esc}.*$`, 'm');
    if (!rx.test(txt)) throw new Error(`Item not found: ${item}`);
    txt = txt.replace(rx, m =>
      m.replace('- [ ]', '- [x]')
        .concat(` <!-- done-by @${process.env.GITHUB_ACTOR || 'local'} at ${now} -->`)
    );
    fs.writeFileSync(FILE, txt);
    console.log(`✔ ticked: ${item}`);
  } catch (e) {
    core.setFailed(e.message);
  }
})();
EOF

# 7. Commit
git add .
git commit -m "feat(plan-b): scaffold checklist system, generator, linter, local action"

echo ""
echo "✅ Bootstrapped successfully!"
echo "📌 Next: review and push with:"
echo "   git push origin main"


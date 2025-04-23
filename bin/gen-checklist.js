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

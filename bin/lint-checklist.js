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

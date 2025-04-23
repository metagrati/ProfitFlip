#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const META_DIR = 'bash-vault/metadata';
const SCRIPT_DIR = 'bash-vault/scripts';
const OUTFILE = 'bash-vault/index.md';

const entries = fs.readdirSync(META_DIR).filter(f => f.endsWith('.json'));

let rows = [];

entries.forEach(file => {
  const meta = JSON.parse(fs.readFileSync(path.join(META_DIR, file), 'utf8'));
  const name = meta.script;
  const desc = meta.description || "—";
  const tags = (meta.tags || []).join(', ');
  const link = `[${name}](scripts/${name})`;
  rows.push(`| ${link} | ${desc} | ${tags} |`);
});

const out = `# Bash Vault

| Script | Description | Tags |
|--------|-------------|------|
${rows.join('\n')}
`;

fs.writeFileSync(OUTFILE, out, 'utf8');
console.log(`✅ index.md updated with ${rows.length} script(s)`);


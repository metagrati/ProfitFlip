// simple duplicate checker
#!/usr/bin/env node
const fs = require('fs');
const md = fs.readFileSync(process.argv[2]||'docs/plan-b2.checklist.md','utf8').split('\n');
const dupe = md.filter(l=>/^-\s\[\s\]/.test(l)).map(l=>l.slice(6).trim())
  .filter((v,i,a)=>a.indexOf(v)!==i);
if(dupe.length){ console.error('Duplicates:',dupe); process.exit(1); }
console.log('Checklist OK, unchecked:', md.filter(l=>/^-\s\[\s\]/.test(l)).length);

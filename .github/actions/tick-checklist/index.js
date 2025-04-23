const fs = require('fs'); const core = require('@actions/core');
const path = core.getInput('checklist-path'); const targets = core.getInput('items').split('\n').filter(Boolean);
const lines = fs.readFileSync(path,'utf8').split('\n'); let dirty=false;
lines.forEach((l,i)=>targets.forEach(t=>{ if(l.trim()==`- [ ] ${t}`){lines[i]=l.replace('- [ ]','- [x]'); dirty=true;} }));
dirty && fs.writeFileSync(path,lines.join('\n'));

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

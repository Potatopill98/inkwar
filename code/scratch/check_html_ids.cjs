const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const uiCode = fs.readFileSync('src/ui.js', 'utf8');

const idMatch = uiCode.match(/const ids = \[([\s\S]*?)\];/);
const ids = idMatch[1].replace(/[\s',]/g, ' ').split(' ').filter(Boolean);

const missing = [];
for (const id of ids) {
  const pattern1 = `id="${id}"`;
  const pattern2 = `id='${id}'`;
  if (!html.includes(pattern1) && !html.includes(pattern2)) {
    missing.push(id);
  }
}
console.log('Missing IDs count:', missing.length);
console.log('Missing IDs:', missing);

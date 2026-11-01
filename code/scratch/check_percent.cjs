const fs = require('fs');
const content = fs.readFileSync('E:/taptapgame/inkwar/code/src/dev-panel.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('isPercent') || l.includes('rawVal') || l.includes('storeVal')) {
    console.log(`${i+1}: ${l}`);
  }
});

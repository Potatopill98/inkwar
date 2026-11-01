const fs = require('fs');
const content = fs.readFileSync('E:/taptapgame/inkwar/code/src/data/heroes.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes("id: '")) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});

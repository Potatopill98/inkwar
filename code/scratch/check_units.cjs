const fs = require('fs');
const content = fs.readFileSync('E:/taptapgame/inkwar/code/src/data/units.js', 'utf8');
const units = ['trebuchet', 'repeater', 'fubing', 'archer', 'militia', 'strongbow', 'assassin'];
const lines = content.split('\n');
for (const u of units) {
  lines.forEach((l, i) => {
    if (l.includes("id: '" + u + "'")) {
      console.log(`${i+1}: ${l}`);
      for (let j = 1; j <= 5; j++) {
        if (lines[i+j] && !lines[i+j].includes("id: '")) {
          console.log(`  ${lines[i+j]}`);
        }
      }
    }
  });
}

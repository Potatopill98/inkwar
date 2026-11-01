const fs = require('fs');
const path = require('path');

const NEW_VERSION = '1.92';

// 1. Update index.html
let indexHtml = fs.readFileSync('E:/taptapgame/inkwar/code/index.html', 'utf8');
indexHtml = indexHtml.replace(/styles\.css\?v=[^"']+/g, `styles.css?v=${NEW_VERSION}`);
indexHtml = indexHtml.replace(/src\/main\.js\?v=[^"']+/g, `src/main.js?v=${NEW_VERSION}`);
fs.writeFileSync('E:/taptapgame/inkwar/code/index.html', indexHtml);
console.log('Updated index.html to v=' + NEW_VERSION);

// 2. Walk src/ and update all relative imports
function updateDir(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      updateDir(full);
    } else if (item.endsWith('.js')) {
      let content = fs.readFileSync(full, 'utf8');
      const updated = content.replace(/(from\s+['"])(\.{1,2}\/[^'"]+?\.js)(\?[^'"]*)?(['"])/g, (match, p1, p2, p3, p4) => {
        if (p2.includes('lib/')) {
          return match;
        }
        return `${p1}${p2}?v=${NEW_VERSION}${p4}`;
      });
      if (updated !== content) {
        fs.writeFileSync(full, updated);
        console.log('Updated imports in:', full);
      }
    }
  }
}

updateDir('E:/taptapgame/inkwar/code/src');
console.log('All files updated to v=' + NEW_VERSION);

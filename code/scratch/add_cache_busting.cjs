const fs = require('fs');

function addVersionToImports(filePath, version = '1.68') {
  let content = fs.readFileSync(filePath, 'utf8');
  // Match relative import paths like './...' or '../...' that end in .js
  content = content.replace(/(from\s+['"])(\.{1,2}\/[^'"]+?\.js)(['"])/g, (match, p1, p2, p3) => {
    // If already has ?v=, replace version
    if (p2.includes('?v=')) {
      return `${p1}${p2.replace(/\?v=[^'"]+/, `?v=${version}`)}${p3}`;
    }
    // Don't modify three.module.js or third party libs
    if (p2.includes('lib/')) {
      return match;
    }
    return `${p1}${p2}?v=${version}${p3}`;
  });
  fs.writeFileSync(filePath, content);
  console.log('Updated cache-busting on:', filePath);
}

addVersionToImports('E:/taptapgame/inkwar/code/src/main.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/ui.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/battle.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/scene.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/battle/combat.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/battle/hero.js');
addVersionToImports('E:/taptapgame/inkwar/code/src/battle/waves.js');

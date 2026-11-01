const fs = require('fs');
let code = fs.readFileSync('E:/taptapgame/inkwar/code/scratch/test_endless_v171.mjs', 'utf8');
code = code.replace(/wm10\.startNextWave\(\);/g, 'wm10.startEndlessWave(10);');
code = code.replace(/wm9\.startNextWave\(\);/g, 'wm9.startEndlessWave(9);');

// Also wrap the whole evaluate in try/catch to return any error
code = code.replace(`(async () => {
      const sliders = Array.from(document.querySelectorAll('.dev-field-slider'));`,
`(async () => {
    try {
      const sliders = Array.from(document.querySelectorAll('.dev-field-slider'));`);

code = code.replace(`return {
        wave10Legendary,
        wave9Legendary,
        wave10Total: wm10.spawnQueue.length,
        wave9Total: wm9.spawnQueue.length,
        tuningRatio: tuning.legendaryRatio
      };
    })()`,
`return {
        wave10Legendary,
        wave9Legendary,
        wave10Total: wm10.spawnQueue.length,
        wave9Total: wm9.spawnQueue.length,
        tuningRatio: tuning.legendaryRatio
      };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
    })()`);

fs.writeFileSync('E:/taptapgame/inkwar/code/scratch/test_endless_v171.mjs', code);
console.log('Updated test_endless_v171.mjs');

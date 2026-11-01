const fs = require('fs');
let code = fs.readFileSync('E:/taptapgame/inkwar/code/scratch/test_endless_v171.mjs', 'utf8');

const target = `      const { WaveManager } = await import('/src/battle/waves.js?v=1.71');
      const { EndlessManager } = await import('/src/data/endless-manager.js?v=1.71');
      const tuning = EndlessManager.getTuning();
      
      const wm10 = new WaveManager();
      wm10.isEndless = true;
      wm10.currentWave = 10;
      wm10.spawnQueue = [];
      wm10.startEndlessWave(10);
      
      const wm9 = new WaveManager();
      wm9.isEndless = true;
      wm9.currentWave = 9;
      wm9.spawnQueue = [];
      wm9.startEndlessWave(9);
      
      const wave10Legendary = wm10.spawnQueue.filter(s => s.type === 'trebuchet').length;
      const wave9Legendary = wm9.spawnQueue.filter(s => s.type === 'trebuchet').length;
      return {
        wave10Legendary,
        wave9Legendary,
        wave10Total: wm10.spawnQueue.length,
        wave9Total: wm9.spawnQueue.length,
        tuningRatio: tuning.legendaryRatio
      };`;

const replacement = `      const { Battle } = await import('/src/battle.js?v=1.71');
      const { EndlessManager } = await import('/src/data/endless-manager.js?v=1.71');
      const tuning = EndlessManager.getTuning();
      
      const b10 = Object.create(Battle.prototype);
      b10.spawnQueue = [];
      b10.elapsed = 0;
      b10.startEndlessWave(10);
      
      const b9 = Object.create(Battle.prototype);
      b9.spawnQueue = [];
      b9.elapsed = 0;
      b9.startEndlessWave(9);
      
      const wave10Legendary = b10.spawnQueue.filter(s => s.type === 'trebuchet').length;
      const wave9Legendary = b9.spawnQueue.filter(s => s.type === 'trebuchet').length;
      return {
        wave10Legendary,
        wave9Legendary,
        wave10Total: b10.spawnQueue.length,
        wave9Total: b9.spawnQueue.length,
        tuningRatio: tuning.legendaryRatio
      };`;

code = code.replace(target, replacement);
fs.writeFileSync('E:/taptapgame/inkwar/code/scratch/test_endless_v171.mjs', code);
console.log('Successfully updated step 6 with Battle.prototype');

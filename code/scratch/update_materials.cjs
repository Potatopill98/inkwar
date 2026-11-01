const fs = require('fs');

// --- 1. Update combat.js ---
let combat = fs.readFileSync('E:/taptapgame/inkwar/code/src/battle/combat.js', 'utf8');

combat = combat.replace(
  "import { createUnitModel, toonMaterial } from '../models.js';",
  "import { createUnitModel, toonMaterial, ghostMaterial } from '../models.js';"
);

// In createEntity
const search1 = `    if (e.stealth > 0) {
      e._stealthApplied = true;
      e.model.group.visible = true;
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          if (n.material === toonMaterial) {
            n.material = toonMaterial.clone();
          }
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m => { m.transparent = true; m.opacity = 0.35; });
        }
      });
      if (e.hpBar && e.hpBar.group) e.hpBar.group.visible = false;
    }`;

const replace1 = `    if (e.stealth > 0) {
      e._stealthApplied = true;
      e.model.group.visible = true;
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material = ghostMaterial;
        }
      });
      if (e.hpBar && e.hpBar.group) e.hpBar.group.visible = false;
    }`;

// In revealStealth
const search2 = `  revealStealth(e) {
    if (!e || e.stealth <= 0) return;
    e.stealth = 0;
    e._stealthApplied = false;
    if (e.model && e.model.group) {
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          if (n.material !== toonMaterial) {
            n.material.dispose();
            n.material = toonMaterial;
          }
          n.material.transparent = false;
          n.material.opacity = 1.0;
        }
      });
    }`;

const replace2 = `  revealStealth(e) {
    if (!e || e.stealth <= 0) return;
    e.stealth = 0;
    e._stealthApplied = false;
    if (e.model && e.model.group) {
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material = toonMaterial;
        }
      });
    }`;

// In active stealth update loop
const search3 = `          e.model.group.traverse((n) => {
            if (n.isMesh && n.material) {
              if (n.material === toonMaterial) {
                n.material = toonMaterial.clone();
              }
              const mats = Array.isArray(n.material) ? n.material : [n.material];
              mats.forEach(m => { m.transparent = true; m.opacity = 0.35; });
            }
          });`;

const replace3 = `          e.model.group.traverse((n) => {
            if (n.isMesh && n.material) {
              n.material = ghostMaterial;
            }
          });`;

function doReplace(str, s, r) {
  const sNorm = s.replace(/\r?\n/g, '\r\n');
  const rNorm = r.replace(/\r?\n/g, '\r\n');
  if (!str.includes(sNorm)) {
    // Try LF
    const sLF = s.replace(/\r?\n/g, '\n');
    const rLF = r.replace(/\r?\n/g, '\n');
    if (!str.includes(sLF)) {
      throw new Error('Target block not found:\n' + s);
    }
    return str.replace(sLF, rLF);
  }
  return str.replace(sNorm, rNorm);
}

combat = doReplace(combat, search1, replace1);
combat = doReplace(combat, search2, replace2);
combat = doReplace(combat, search3, replace3);
fs.writeFileSync('E:/taptapgame/inkwar/code/src/battle/combat.js', combat);
console.log('Successfully updated combat.js');

// --- 2. Update hero.js ---
let hero = fs.readFileSync('E:/taptapgame/inkwar/code/src/battle/hero.js', 'utf8');

hero = hero.replace(
  "import { toonMaterial } from '../models.js';",
  "import { toonMaterial, ghostMaterial } from '../models.js';"
);

// In killHero
const searchHeroDeath = `      // 模型转化为半透明英灵战跪姿态（注意克隆独立材质，绝不能污染全局共享的 toonMaterial！）
      if (this.heroModel) {
        this.heroModel.group.traverse((n) => {
          if (n.isMesh && n.material) {
            if (n.material === toonMaterial) {
              n.material = toonMaterial.clone();
            }
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => { m.transparent = true; m.opacity = 0.35; });
          }
        });`;

const replaceHeroDeath = `      // 模型转化为半透明英灵战跪姿态（使用独立 ghostMaterial，绝不污染全局共享的 toonMaterial！）
      if (this.heroModel) {
        this.heroModel.group.traverse((n) => {
          if (n.isMesh && n.material) {
            n.material = ghostMaterial;
          }
        });`;

// In reviveHero
const searchHeroRevive = `      // 恢复模型材质与站姿
      if (this.heroModel) {
        this.heroModel.group.traverse((n) => {
          if (n.isMesh && n.material) {
            if (n.material !== toonMaterial) {
              n.material.dispose();
              n.material = toonMaterial;
            }
            n.material.transparent = false;
            n.material.opacity = 1.0;
          }
        });`;

const replaceHeroRevive = `      // 恢复模型材质与站姿
      if (this.heroModel) {
        this.heroModel.group.traverse((n) => {
          if (n.isMesh && n.material) {
            n.material = toonMaterial;
          }
        });`;

hero = doReplace(hero, searchHeroDeath, replaceHeroDeath);
hero = doReplace(hero, searchHeroRevive, replaceHeroRevive);
fs.writeFileSync('E:/taptapgame/inkwar/code/src/battle/hero.js', hero);
console.log('Successfully updated hero.js');

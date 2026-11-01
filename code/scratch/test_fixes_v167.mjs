import * as THREE from '../lib/three.module.js';
import { toonMaterial, createHeroModel, createUnitModel } from '../src/models.js';
import { getHero } from '../src/data/heroes.js';
import { getUnit } from '../src/data/units.js';
import { battleCombat } from '../src/battle/combat.js';
import { battleHero } from '../src/battle/hero.js';
import { battleWaves } from '../src/battle/waves.js';
import { EndlessManager } from '../src/data/endless-manager.js';

console.log("=== 验证 3 大问题核心逻辑测试集 ===");

// 1. 验证材质独立性（杜绝全局半透明）
console.log("\n1. 验证全局共享材质独立性 (killHero / reviveHero / stealth)");
const dummyBattle = {
  heroData: getHero('zhaoyun'),
  heroLevel: 1,
  masteryLevel: 1,
  heroX: 0,
  heroZ: 0,
  heroMaxHp: 1200,
  heroHp: 1200,
  level: EndlessManager.createEndlessLevel(),
  isEndless: true,
  uid: 0,
  scene: { scene: new THREE.Scene(), screenShake() {} },
  effects: null,
  ui: null,
  entities: [],
  heroPower() { return 1.0; },
  attachHealthBar() {},
};
Object.assign(dummyBattle, battleCombat, battleHero, battleWaves);

dummyBattle.heroModel = createHeroModel(dummyBattle.heroData, 'player');
dummyBattle.scene.scene.add(dummyBattle.heroModel.group);

console.log("初始状态:");
console.log("  toonMaterial.transparent:", toonMaterial.transparent, "opacity:", toonMaterial.opacity);
if (toonMaterial.transparent !== false || toonMaterial.opacity !== 1.0) {
  throw new Error("初始状态下 toonMaterial 不应为半透明！");
}

console.log("触发 killHero() 主将力竭倒下:");
dummyBattle.killHero();

let heroMeshMaterialTransparent = false;
dummyBattle.heroModel.group.traverse(n => {
  if (n.isMesh && n.material) {
    if (n.material.transparent) heroMeshMaterialTransparent = true;
  }
});
console.log("  英雄模型网格是否进入半透明英灵状态:", heroMeshMaterialTransparent);
console.log("  全局共享 toonMaterial 是否被污染:", toonMaterial.transparent, "opacity:", toonMaterial.opacity);

if (!heroMeshMaterialTransparent) {
  throw new Error("主将倒下时英雄模型应为半透明英灵姿态！");
}
if (toonMaterial.transparent === true || toonMaterial.opacity < 1.0) {
  throw new Error("CRITICAL BUG: toonMaterial 被污染变半透明！全局所有物体都会变半透明！");
}
console.log("✓ 英雄倒下仅自身网格半透明，全局共享 toonMaterial 依然保持 100% 实体不透明！");

console.log("触发 reviveHero() 主将重聚战意复活:");
dummyBattle.reviveHero();
let heroRestoredToToon = true;
dummyBattle.heroModel.group.traverse(n => {
  if (n.isMesh && n.material) {
    if (n.material !== toonMaterial || n.material.transparent !== false) heroRestoredToToon = false;
  }
});
console.log("  英雄复活后是否安全恢复为 toonMaterial 且不透明:", heroRestoredToToon);
if (!heroRestoredToToon) {
  throw new Error("主将复活后应安全恢复为 toonMaterial！");
}
console.log("✓ 主将复活后材质完美恢复！");


// 2. 验证无尽模式数值成长公式 (Issue #2)
console.log("\n2. 验证无尽模式第 1 波与波次阶梯数值 (公式: 当前属性 = 初始属性 + (当前波 - 1) * 初始属性 * 5%)");
const swordsman = getUnit('swordsman');
const militia = getUnit('militia');
console.log(`基础属性: 民兵 HP=${militia.hp}, ATK=${militia.atk}; 剑兵 HP=${swordsman.hp}, ATK=${swordsman.atk}`);

// 第 1 波测试
dummyBattle.spawnQueue = [];
dummyBattle.elapsed = 0;
dummyBattle.startEndlessWave(1);

const wave1Queue = dummyBattle.spawnQueue.slice();
console.log(`第 1 波生成队列单位数: ${wave1Queue.length}, 属性倍率: hpMul=${wave1Queue[0].hpMul}, atkMul=${wave1Queue[0].atkMul}`);

if (wave1Queue[0].hpMul !== 1.0 || wave1Queue[0].atkMul !== 1.0) {
  throw new Error(`第 1 波倍率应为 1.0 (初始属性)，实际为 hpMul=${wave1Queue[0].hpMul}`);
}

// 模拟以 createEntity 生成第 1 波单位
const e1 = dummyBattle.createEntity({
  unit: swordsman,
  side: 'enemy',
  x: 5,
  z: 0,
  kind: 'unit',
  hpMul: wave1Queue[0].hpMul,
  atkMul: wave1Queue[0].atkMul
});
console.log(`实战生成第 1 波敌军剑兵: HP=${e1.maxHp}, ATK=${e1.atk}`);
if (e1.maxHp !== swordsman.hp || e1.atk !== swordsman.atk) {
  throw new Error(`第 1 波剑兵属性异常！期望 HP=${swordsman.hp}, ATK=${swordsman.atk}，实际 HP=${e1.maxHp}, ATK=${e1.atk}`);
}
console.log("✓ 第 1 波敌兵属性完全等同于关卡初始属性，绝不出现秒杀主将！");

// 第 2 波测试 (应该 +5%)
dummyBattle.spawnQueue = [];
dummyBattle.startEndlessWave(2);
const wave2 = dummyBattle.spawnQueue[0];
console.log(`第 2 波属性倍率: hpMul=${wave2.hpMul.toFixed(2)}, atkMul=${wave2.atkMul.toFixed(2)}`);
if (Math.abs(wave2.hpMul - 1.05) > 1e-4) {
  throw new Error(`第 2 波倍率期望 1.05，实际为 ${wave2.hpMul}`);
}
console.log("✓ 第 2 波属性倍率严格为 1.05 (+5%)！");

// 第 10 波测试 (首领波次，应该 +45%)
dummyBattle.spawnQueue = [];
dummyBattle.startEndlessWave(10);
const wave10Soldier = dummyBattle.spawnQueue[0];
const wave10Boss = dummyBattle.spawnQueue.find(q => q.isBoss);
console.log(`第 10 波小兵倍率: hpMul=${wave10Soldier.hpMul.toFixed(2)} (期望 1.45)`);
console.log(`第 10 波首领张角: HP=${wave10Boss.hpOverride} (3800 * 1.45 = ${3800 * 1.45}), atkMul=${wave10Boss.atkMul.toFixed(2)}`);

if (Math.abs(wave10Soldier.hpMul - 1.45) > 1e-4) {
  throw new Error(`第 10 波倍率期望 1.45，实际为 ${wave10Soldier.hpMul}`);
}
if (Math.abs(wave10Boss.hpOverride - 5510) > 1e-4) {
  throw new Error(`第 10 波首领张角 HP 期望 5510，实际为 ${wave10Boss.hpOverride}`);
}
console.log("✓ 第 10 波小兵与 Boss 属性严格符合阶梯公式！");

console.log("\n🎉 前两个核心场景单元测试全部 PASS 完美通过！");

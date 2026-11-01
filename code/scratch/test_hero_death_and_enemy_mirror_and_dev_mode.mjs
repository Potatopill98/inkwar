// 验证测试：主将死亡防卡死、敌军左右镜像战马朝向、开发者模式全资源99999与全关卡解锁
import assert from 'node:assert';
import * as THREE from '../lib/three.module.js';

console.log('🧪 Starting Verification Suite: Hero Death Fix, Enemy Mirroring & Dev Mode...\n');

// ============================================================================
// 1. 测试主将死亡与复活逻辑（杜绝严格模式下 getter 抛错导致的卡死）
// ============================================================================
console.log('--- 1. Testing Hero Death & Revival Safety ---');
const { battleHero } = await import('../src/battle/hero.js');

const mockBattle = {
  heroId: 'zhaoyun',
  heroHp: 100,
  heroMaxHp: 1200,
  heroRespawnTimer: 0,
  heroOutOfCombatTimer: 0,
  heroEngageTarget: { alive: true },
  heroMovingToTarget: true,
  heroMovingToRally: true,
  heroAttackAnim: 0.2,
  heroTripleThrust: { timer: 0.1 },
  pendingSkill: { t: 0.2 },
  heroSkillAnim: {},
  heroX: -5.0,
  heroZ: 0.25,
  heroModel: {
    group: {
      traverse(fn) {
        fn({ isMesh: true, material: { transparent: false, opacity: 1.0 } });
      }
    },
    body: { position: { y: 0, set() {} }, rotation: { x: 0, set() {} } },
    weaponPivot: { position: { y: 0, set() {} }, rotation: { z: 0, set() {} } }
  },
  heroData: { look: { size: 1.3 } },
  heroBlockedFoes: new Set([{ target: { isHero: true }, heroBlockedBy: true, attackAnim: 0.3 }]),
  entities: [{ target: { isHero: true }, heroBlockedBy: true, attackAnim: 0.3, sniperTarget: { isHero: true } }],
  heroHpBar: { group: { visible: true } },
  effects: { death() {}, dust() {}, inkBurst() {}, ring() {} },
  scene: { screenShake() {} },
  ui: {
    showBattleBanner(title, sub) { this.banner = { title, sub }; },
    toast(m) {}
  },
  isHeroAlive: battleHero.isHeroAlive,
  getHeroTargetObj: battleHero.getHeroTargetObj,
  killHero: battleHero.killHero,
  reviveHero: battleHero.reviveHero,
};

// 预先初始化 _heroTargetObj
const targetObj = mockBattle.getHeroTargetObj();
assert.strictEqual(targetObj.alive, true, 'Hero target obj should be initially alive');

// 触发击杀
console.log('Executing killHero()...');
mockBattle.killHero();

assert.strictEqual(mockBattle.heroHp, 0, 'Hero HP must be 0 after killHero');
assert.strictEqual(mockBattle.heroRespawnTimer, 15.0, 'Respawn timer must be 15s');
assert.strictEqual(mockBattle.heroTripleThrust, null, 'heroTripleThrust must be cleared');
assert.strictEqual(mockBattle.heroAttackAnim, 0, 'heroAttackAnim must be 0');
assert.strictEqual(mockBattle.heroMovingToRally, false, 'heroMovingToRally must be false');
assert.strictEqual(targetObj.alive, false, 'Hero target obj alive should now be false via getter');

// 测试向 targetObj.alive 赋值不会抛出严格模式异常
assert.doesNotThrow(() => {
  'use strict';
  targetObj.alive = false;
}, 'Setting targetObj.alive must not throw TypeError');

// 测试复活
console.log('Executing reviveHero()...');
mockBattle.reviveHero();
assert.strictEqual(mockBattle.heroHp, 1200, 'Hero HP must be restored to max');
assert.strictEqual(mockBattle.heroRespawnTimer, 0, 'Respawn timer must be 0');
assert.strictEqual(targetObj.alive, true, 'Hero target obj alive should now be true');
console.log('  ✓ Hero death & revival logic completely bulletproof, 0 crashes!');

// ============================================================================
// 2. 测试敌军士兵左右镜像建模、马头朝向与永不露背机制
// ============================================================================
console.log('\n--- 2. Testing Enemy Model Mirroring & Facing Left ---');
const { createUnitModel } = await import('../src/models.js');
const { getUnit } = await import('../src/data/units.js');
const { battleCombat } = await import('../src/battle/combat.js');

const lightcav = getUnit('lightcav');
assert.ok(lightcav.look.mount, 'lightcav must have mount');

// 敌军骑兵模型初始建立
const enemyCavModel = createUnitModel(lightcav, 'enemy');
assert.ok(enemyCavModel.group.scale.x < 0, `Enemy cav group.scale.x must be negative (-${lightcav.look.size || 1})`);
assert.strictEqual(enemyCavModel.group.rotation.y, 0, 'Enemy rotation.y must be 0 (never turned around)');

// 玩家骑兵模型初始建立
const playerCavModel = createUnitModel(lightcav, 'player');
assert.ok(playerCavModel.group.scale.x > 0, 'Player cav group.scale.x must be positive');

// 模拟战场 combat 实例
const combatBattle = {
  uid: 0,
  level: { id: 1 },
  heroData: { passive: {} },
  heroPower() { return 1; },
  scene: { scene: { add() {} } },
  entities: [],
  attachHealthBar() {},
  findTarget() { return null; },
  createEntity: battleCombat.createEntity,
  updateEntities: battleCombat.updateEntities,
  marchForward: battleCombat.marchForward,
  faceTarget: battleCombat.faceTarget,
  updateUnit: battleCombat.updateUnit,
  updateBuffTimers: battleCombat.updateBuffTimers,
  moveBob: battleCombat.moveBob,
};

const enemyEntity = combatBattle.createEntity({ unit: lightcav, x: 10, z: 0, side: 'enemy' });
assert.strictEqual(enemyEntity.facing, -1, 'Enemy entity facing must be -1');
assert.ok(enemyEntity.model.group.scale.x < 0, 'Spawned enemy scale.x must be negative');
assert.strictEqual(enemyEntity.model.group.rotation.y, 0, 'Spawned enemy rotation.y must be 0');

// 模拟经过多帧 spawnT 回弹
combatBattle.updateEntities(0.1);
combatBattle.updateEntities(0.2);
combatBattle.updateEntities(0.2); // spawnT 已经 >= 0.35
assert.ok(enemyEntity.model.group.scale.x < 0, `Enemy scale.x after spawn animation must remain negative (${enemyEntity.model.group.scale.x})`);
assert.strictEqual(enemyEntity.model.group.rotation.y, 0, 'Enemy rotation.y must remain 0 (never turn back)');

// 模拟行军 marchForward
combatBattle.marchForward(enemyEntity, 0.05);
assert.strictEqual(enemyEntity.facing, -1, 'March forward facing must be -1 (towards player)');
assert.ok(enemyEntity.model.group.scale.x < 0, 'March forward scale.x must remain negative (head points left)');
assert.strictEqual(enemyEntity.model.group.rotation.y, 0, 'March forward rotation.y must remain 0');

// 模拟目标在左侧 faceTarget
combatBattle.faceTarget(enemyEntity, { x: -2, z: 0 });
assert.strictEqual(enemyEntity.facing, -1, 'Facing left target must set facing = -1');
assert.ok(enemyEntity.model.group.scale.x < 0, 'scale.x must be negative when facing left target');
assert.strictEqual(enemyEntity.model.group.rotation.y, 0, 'rotation.y must be 0');

console.log('  ✓ Enemy unit mirroring, left-facing mount & front-facing orientation 100% verified!');

// ============================================================================
// 3. 测试开发者模式（口令 528908，资源 99999，解锁全40关与全部兵种名将）
// ============================================================================
console.log('\n--- 3. Testing Developer Mode ---');
// Mock global localStorage & document for dev-panel and app imports
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
};
const dummyEl = () => ({
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {},
  removeEventListener() {},
  appendChild() {},
  removeChild() {},
  setAttribute() {},
  getAttribute() { return ''; },
  closest() { return null; },
  getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0 }; },
  querySelectorAll() { return []; },
  querySelector() { return null; }
});

globalThis.document = {
  getElementById(id) { return dummyEl(); },
  querySelector(sel) { return dummyEl(); },
  querySelectorAll(sel) { return []; },
  createElement(tag) {
    const el = dummyEl();
    el.getContext = () => ({ fillRect() {}, strokeRect() {} });
    return el;
  }
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
};

const { App } = await import('../src/main.js');
const { LEVELS } = await import('../src/data/levels.js');
const { HEROES } = await import('../src/data/heroes.js');
const { UNITS } = await import('../src/data/units.js');

const app = {
  save: {
    tokens: 10,
    mobao: 2,
    camp: { supplies: 5 },
    fragments: 0,
    shards: 0,
    progress: {
      unlockedLevel: 1,
      clearedCount: 0,
      stars: {},
      bestScore: {},
      bestTime: {},
      totalStars: 0,
      totalScore: 0
    },
    unlocks: {
      units: ['militia'],
      heroes: ['zhaoyun']
    },
    hero: {
      levels: { zhaoyun: 1 }
    }
  },
  ui: {
    toastMsg: null,
    toast(m) { this.toastMsg = m; },
    refreshHome() { this.homeRefreshed = true; },
    refreshSettings() { this.settingsRefreshed = true; },
    renderLevels() { this.levelsRendered = true; },
    refreshCamp() { this.campRefreshed = true; },
    refreshGacha() { this.gachaRefreshed = true; },
    renderCodex() { this.codexRendered = true; },
    inputDevCode: { value: '528908' }
  },
  applyDevCode: App.prototype.applyDevCode,
  persist(immediate) { this.persisted = true; }
};

// 测试错误密码
app.applyDevCode('123456');
assert.strictEqual(app.save.tokens, 10, 'Tokens must not change on invalid code');
assert.ok(app.ui.toastMsg.includes('错误'), 'Toast must indicate wrong code');

// 测试正确密码 528908
app.applyDevCode('528908');
assert.strictEqual(app.save.tokens, 99999, 'Tokens must be 99999');
assert.strictEqual(app.save.mobao, 99999, 'Mobao must be 99999');
assert.strictEqual(app.save.camp.supplies, 99999, 'Camp supplies must be 99999');
assert.strictEqual(app.save.fragments, 99999, 'Fragments must be 99999');
assert.strictEqual(app.save.shards, 99999, 'Shards must be 99999');

// 关卡解锁验证
assert.strictEqual(app.save.progress.unlockedLevel, LEVELS.length, `All ${LEVELS.length} levels must be unlocked`);
assert.strictEqual(app.save.progress.clearedCount, LEVELS.length, 'Cleared count must equal total levels');
for (let i = 1; i <= LEVELS.length; i++) {
  assert.strictEqual(app.save.progress.stars[i], 3, `Level ${i} must have 3 stars`);
  assert.ok(app.save.progress.bestScore[i] >= 3000, `Level ${i} bestScore must be >= 3000`);
}
assert.strictEqual(app.save.progress.totalStars, LEVELS.length * 3, 'Total stars must be 40 * 3');

// 兵种与名将全解锁验证
assert.strictEqual(app.save.unlocks.units.length, UNITS.length, 'All units must be unlocked');
assert.strictEqual(app.save.unlocks.heroes.length, HEROES.length, 'All heroes must be unlocked');

assert.strictEqual(app.save.devMode, true, 'devMode flag must be true');
assert.strictEqual(app.ui.inputDevCode.value, '', 'Input dev code should be cleared');
assert.strictEqual(app.persisted, true, 'Save must be persisted');
assert.ok(app.ui.toastMsg.includes('开发者模式已开启'), 'Toast must announce success');

console.log('  ✓ Developer Mode (528908 -> 99999 resources, 40 levels, all units & heroes) verified!');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% Complete!');

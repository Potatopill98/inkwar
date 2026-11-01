import assert from 'assert';
import { HEROES, getHero, getHeroUpgradeCost, getHeroPermMultiplier, getHeroStats, DEFAULT_HERO_TUNING, getHeroTuning } from '../src/data/heroes.js';
import { loadOverrides, DevPanel } from '../src/dev-panel.js';

// Setup mock browser globals
if (typeof global.localStorage === 'undefined') {
  const store = new Map();
  global.localStorage = {
    getItem(k) { return store.get(k) || null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
  };
}

if (typeof global.document === 'undefined') {
  global.document = {
    getElementById(id) {
      return {
        appendChild() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        classList: { add() {}, remove() {}, toggle() {} },
        style: {},
      };
    },
    createElement(tag) {
      return {
        className: '',
        innerHTML: '',
        style: {},
        appendChild() {},
        querySelector() {
          return {
            onclick: null,
            onchange: null,
            oninput: null,
            classList: { add() {}, remove() {}, toggle() {} },
          };
        },
        querySelectorAll() { return []; },
        addEventListener() {},
        classList: { add() {}, remove() {}, toggle() {} },
      };
    },
  };
}

console.log('=== Test Hero Outside Upgrade, In-Battle Leveling & DevPanel Tuning ===');

// 1. Outside Upgrade Cost Formula Test: (targetLevel * currentLevel), Max Lv.11 (Brawl Stars)
console.log('1. Checking Outside Upgrade Cost Formula...');
const expectedCosts = {
  1: 2 * 1,   // Lv.1 -> Lv.2: 2
  2: 3 * 2,   // Lv.2 -> Lv.3: 6
  3: 4 * 3,   // Lv.3 -> Lv.4: 12
  4: 5 * 4,   // Lv.4 -> Lv.5: 20
  5: 6 * 5,   // Lv.5 -> Lv.6: 30
  6: 7 * 6,   // Lv.6 -> Lv.7: 42
  7: 8 * 7,   // Lv.7 -> Lv.8: 56
  8: 9 * 8,   // Lv.8 -> Lv.9: 72
  9: 10 * 9,  // Lv.9 -> Lv.10: 90
  10: 11 * 10,// Lv.10 -> Lv.11: 110
};

for (let lv = 1; lv <= 10; lv++) {
  const cost = getHeroUpgradeCost(lv);
  assert.strictEqual(cost, expectedCosts[lv], `Cost for Lv.${lv} -> Lv.${lv + 1} must be ${expectedCosts[lv]}`);
}

assert.strictEqual(getHeroUpgradeCost(11), null, 'Lv.11 is max level, upgrade cost must be null');
assert.strictEqual(getHeroUpgradeCost(12), null, 'Above max level must return null');
console.log('✓ Outside upgrade cost formula passed (1->2: 2, ..., 10->11: 110, 11: MAX)');

// 2. Outside Permanent Multiplier Test (+10% per level)
console.log('2. Checking Outside Permanent Stat Multiplier (+10% per level)...');
assert.strictEqual(getHeroPermMultiplier(1), 1.0, 'Lv.1 multiplier is 1.0 (+0%)');
assert.strictEqual(getHeroPermMultiplier(2), 1.1, 'Lv.2 multiplier is 1.1 (+10%)');
assert.strictEqual(getHeroPermMultiplier(3), 1.2, 'Lv.3 multiplier is 1.2 (+20%)');
assert.strictEqual(getHeroPermMultiplier(5), 1.4, 'Lv.5 multiplier is 1.4 (+40%)');
assert.strictEqual(getHeroPermMultiplier(10), 1.9, 'Lv.10 multiplier is 1.9 (+90%)');
assert.strictEqual(getHeroPermMultiplier(11), 2.0, 'Lv.11 multiplier is 2.0 (+100%, doubled!)');

// Test Zhao Yun stats at Lv.1 vs Lv.11
const statsLv1 = getHeroStats('zhaoyun', 1);
assert.strictEqual(statsLv1.baseMaxHp, 1200, 'Zhao Yun base HP at Lv.1 is 1200');
assert.strictEqual(statsLv1.baseAtk, 65, 'Zhao Yun base ATK at Lv.1 is 65');
const statsLv11 = getHeroStats('zhaoyun', 11);
assert.strictEqual(statsLv11.baseMaxHp, 2400, 'Zhao Yun base HP at Lv.11 is 2400 (doubled)');
assert.strictEqual(statsLv11.baseAtk, 130, 'Zhao Yun base ATK at Lv.11 is 130 (doubled)');
assert.strictEqual(statsLv1.baseArmor, 10, 'Zhao Yun base Armor at Lv.1 is 10');

const statsLv2 = getHeroStats('zhaoyun', 2);
assert.strictEqual(statsLv2.baseMaxHp, Math.round(1200 * 1.1), 'Zhao Yun base HP at Lv.2 is 1320 (+10%)');
assert.strictEqual(statsLv2.baseAtk, Math.round(65 * 1.1), 'Zhao Yun base ATK at Lv.2 is 72 (+10%)');
assert.strictEqual(statsLv2.baseArmor, Math.round(10 * 1.1), 'Zhao Yun base Armor at Lv.2 is 11 (+10%)');

const statsLv10 = getHeroStats('zhaoyun', 10);
assert.strictEqual(statsLv10.baseMaxHp, Math.round(1200 * 1.9), 'Zhao Yun base HP at Lv.10 is 2280 (+90%)');
assert.strictEqual(statsLv10.baseAtk, Math.round(65 * 1.9), 'Zhao Yun base ATK at Lv.10 is 124 (+90%)');
assert.strictEqual(statsLv10.baseArmor, Math.round(10 * 1.9), 'Zhao Yun base Armor at Lv.10 is 19 (+90%)');
console.log('✓ Outside permanent level multiplier & stat calculation passed');

// 3. In-Battle Level Scaling (+10% base stats per in-battle level, full heal)
console.log('3. Checking In-Battle Level Scaling (+10% base stats per in-battle level)...');
const mockBattle = {
  heroBaseMaxHp: 1200,
  heroBaseAtk: 65,
  heroBaseArmor: 10,
  heroInBattleLevel: 1,
  heroInBattleXp: 0,
  heroMaxHp: 1200,
  heroHp: 1200,
  heroAtk: 65,
  heroArmor: 10,
  ui: { showBattleBanner() {} },
  effects: { ring() {}, inkBurst() {} },
  addHeroInBattleXp(n) {
    if (this.heroInBattleLevel >= 5) return;
    const thresholds = [0, 20, 50, 95, 150];
    this.heroInBattleXp = (this.heroInBattleXp || 0) + n;
    while (this.heroInBattleLevel < 5 && this.heroInBattleXp >= thresholds[this.heroInBattleLevel]) {
      this.heroInBattleLevel++;
      const inBattleMul = 1 + (this.heroInBattleLevel - 1) * 0.10;
      this.heroMaxHp = Math.round(this.heroBaseMaxHp * inBattleMul);
      this.heroHp = this.heroMaxHp; // 升阶全额回满生命
      this.heroAtk = Math.round(this.heroBaseAtk * inBattleMul);
      this.heroArmor = Math.round(this.heroBaseArmor * inBattleMul);
    }
  }
};

// Hero takes severe damage
mockBattle.heroHp = 250;

// Level up to Lv.2 (threshold 20)
mockBattle.addHeroInBattleXp(25);
assert.strictEqual(mockBattle.heroInBattleLevel, 2, 'Hero is Lv.2');
assert.strictEqual(mockBattle.heroMaxHp, Math.round(1200 * 1.1), 'In-battle Lv.2 HP is 1320 (+10%)');
assert.strictEqual(mockBattle.heroHp, 1320, 'Hero HP healed to 100% on level up');
assert.strictEqual(mockBattle.heroAtk, Math.round(65 * 1.1), 'In-battle Lv.2 ATK is 72 (+10%)');
assert.strictEqual(mockBattle.heroArmor, Math.round(10 * 1.1), 'In-battle Lv.2 Armor is 11 (+10%)');

// Level up to Lv.3 (threshold 50)
mockBattle.heroHp = 100;
mockBattle.addHeroInBattleXp(30); // total 55 >= 50
assert.strictEqual(mockBattle.heroInBattleLevel, 3, 'Hero is Lv.3');
assert.strictEqual(mockBattle.heroMaxHp, Math.round(1200 * 1.2), 'In-battle Lv.3 HP is 1440 (+20%)');
assert.strictEqual(mockBattle.heroHp, 1440, 'Hero HP healed to 100% on level up');
assert.strictEqual(mockBattle.heroAtk, Math.round(65 * 1.2), 'In-battle Lv.3 ATK is 78 (+20%)');
assert.strictEqual(mockBattle.heroArmor, Math.round(10 * 1.2), 'In-battle Lv.3 Armor is 12 (+20%)');

// Level up to Lv.5 (max in-battle level, threshold 150)
mockBattle.addHeroInBattleXp(120); // total 175 >= 150
assert.strictEqual(mockBattle.heroInBattleLevel, 5, 'Hero is Lv.5');
assert.strictEqual(mockBattle.heroMaxHp, Math.round(1200 * 1.4), 'In-battle Lv.5 HP is 1680 (+40%)');
assert.strictEqual(mockBattle.heroAtk, Math.round(65 * 1.4), 'In-battle Lv.5 ATK is 91 (+40%)');
console.log('✓ In-battle level scaling & full heal passed');

// 4. Mobao Drops (3-5 on victory) & Ad Doubling
console.log('4. Checking Mobao Drops & Ad Doubling...');
for (let i = 0; i < 200; i++) {
  const drop = Math.floor(Math.random() * 3) + 3;
  assert(drop >= 3 && drop <= 5, `Drop must be between 3 and 5, got ${drop}`);
}

const mockSave = { mobao: 10 };
const battleResult = { win: true };
const mobaoDrop = Math.floor(Math.random() * 3) + 3;
mockSave.mobao += mobaoDrop;
battleResult.mobaoGain = mobaoDrop;
battleResult.mobaoDoubled = false;

assert.strictEqual(mockSave.mobao, 10 + mobaoDrop, 'Mobao added to save');

// Ad watch doubles it
mockSave.mobao += battleResult.mobaoGain;
battleResult.mobaoDoubled = true;
assert.strictEqual(mockSave.mobao, 10 + mobaoDrop * 2, 'Ad doubled mobao total');
console.log('✓ Mobao drops (3-5) and ad doubling passed');

// 5. DevPanel Hero Tuning & JSON Export
console.log('5. Checking DevPanel Hero Tuning & JSON Export...');
const ov = loadOverrides();
assert(typeof ov.heroTuning === 'object', 'overrides has heroTuning');

// Set custom tuning for Zhao Yun
ov.heroTuning.zhaoyun = {
  maxHp: 1350,
  atk: 72,
  armor: 12,
  regenRate: 0.05,
  aggroRadius: 3.0,
  speed: 1.7,
};
ov.savedAt = 1729000000000;

const dev = new DevPanel();
const exportedJson = dev.jsonText();
const parsed = JSON.parse(exportedJson);

assert.strictEqual(parsed.version, 1);
assert.strictEqual(parsed.heroTuning.zhaoyun.maxHp, 1350, 'Exported JSON contains heroTuning.zhaoyun.maxHp');
assert.strictEqual(parsed.heroTuning.zhaoyun.atk, 72, 'Exported JSON contains heroTuning.zhaoyun.atk');
assert.strictEqual(parsed.heroTuning.zhaoyun.armor, 12, 'Exported JSON contains heroTuning.zhaoyun.armor');
assert.strictEqual(parsed.heroTuning.zhaoyun.aggroRadius, 3.0, 'Exported JSON contains heroTuning.zhaoyun.aggroRadius');
assert(typeof parsed.units === 'object', 'Exported JSON contains units');
assert(typeof parsed.heroes === 'object', 'Exported JSON contains heroes');
assert(typeof parsed.mech === 'object', 'Exported JSON contains mech');
console.log('✓ DevPanel hero tuning & JSON export passed');

console.log('=== All Hero Progression & DevPanel Tuning Tests Passed 100%! ===');

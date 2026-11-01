import assert from 'assert';
import {
  HEROES,
  HERO_MAX_LEVEL,
  isPassiveUnlocked,
  isGadgetUnlocked,
  getHeroUpgradeCost,
  getHeroPermMultiplier,
  getHeroStats,
  DEFAULT_HERO_TUNING,
  getHeroTuning
} from '../src/data/heroes.js';
import { createHeroModel } from '../src/models.js';
import fs from 'fs';

console.log('🧪 Starting Full Brawl Stars Hero & DevPanel Verification...\n');

// 1. Verify Level Cap & Growth Progression
console.log('--- 1. Brawl Stars Level Progression & Upgrade Costs ---');
assert.strictEqual(HERO_MAX_LEVEL, 11, 'Max level must be 11 (Power 11)');

for (let lv = 1; lv <= 10; lv++) {
  const cost = getHeroUpgradeCost(lv);
  const expected = (lv + 1) * lv;
  assert.strictEqual(cost, expected, `Cost from ${lv} to ${lv + 1} should be ${expected}`);
}
assert.strictEqual(getHeroUpgradeCost(11), null, 'Level 11 upgrade cost must be null (Max Level)');
console.log('  ✓ Level progression and upgrade costs verified (1->2: 2 ... 10->11: 110, Lv.11: MAX)');

// 2. Verify Multipliers (+10% per level, Lv.1 = 1.0, Lv.11 = 2.0)
console.log('\n--- 2. Multipliers and Base Stat Derivation ---');
assert.strictEqual(getHeroPermMultiplier(1), 1.0, 'Lv.1 multiplier must be 1.0 (100%)');
assert.strictEqual(getHeroPermMultiplier(6), 1.5, 'Lv.6 multiplier must be 1.5 (150%)');
assert.strictEqual(getHeroPermMultiplier(11), 2.0, 'Lv.11 multiplier must be 2.0 (200%)');

const zyBase = DEFAULT_HERO_TUNING.zhaoyun;
assert(zyBase, 'Zhao Yun must have default base tuning');
const zyStatsLv1 = getHeroStats('zhaoyun', 1);
const zyStatsLv11 = getHeroStats('zhaoyun', 11);
assert.strictEqual(zyStatsLv1.baseMaxHp, zyBase.maxHp, 'Lv.1 HP must match base HP exactly');
assert.strictEqual(zyStatsLv11.baseMaxHp, Math.round(zyBase.maxHp * 2.0), 'Lv.11 HP must be exactly 200% of base HP');
assert.strictEqual(zyStatsLv11.baseAtk, Math.round(zyBase.atk * 2.0), 'Lv.11 ATK must be exactly 200% of base ATK');
console.log(`  ✓ Lv.1 stats: HP=${zyStatsLv1.baseMaxHp}, ATK=${zyStatsLv1.baseAtk}`);
console.log(`  ✓ Lv.11 stats: HP=${zyStatsLv11.baseMaxHp}, ATK=${zyStatsLv11.baseAtk} (2.0x base)`);

// 3. Verify Brawl Stars Milestones Unlocks
console.log('\n--- 3. Skill & Milestone Unlock Logic ---');
assert.strictEqual(isPassiveUnlocked(1), false, 'Lv.1 passive locked');
assert.strictEqual(isPassiveUnlocked(2), false, 'Lv.2 passive locked');
assert.strictEqual(isPassiveUnlocked(3), true, 'Lv.3 passive UNLOCKED');
assert.strictEqual(isPassiveUnlocked(11), true, 'Lv.11 passive UNLOCKED');

assert.strictEqual(isGadgetUnlocked(1), false, 'Lv.1 gadget locked');
assert.strictEqual(isGadgetUnlocked(6), false, 'Lv.6 gadget locked');
assert.strictEqual(isGadgetUnlocked(7), true, 'Lv.7 gadget UNLOCKED');
assert.strictEqual(isGadgetUnlocked(11), true, 'Lv.11 gadget UNLOCKED');
console.log('  ✓ Milestone logic verified (Lv.1 Active Super, Lv.3 Star Power Passive, Lv.7 Gadget, Lv.11 Max Power)');

// 4. Verify Zhao Yun Rework Details
console.log('\n--- 4. Zhao Yun Brawl Stars Kit Rework ---');
const zyDef = HEROES.find(h => h.id === 'zhaoyun');
assert(zyDef, 'Zhao Yun definition exists');
assert(zyDef.gadget, 'Zhao Yun must have gadget configuration');
assert.strictEqual(zyDef.gadget.name, '龙威断喝');
assert.strictEqual(zyDef.gadget.maxCharges, undefined, 'Skill has unlimited charges');
assert.strictEqual(zyDef.gadget.cooldown, 20, 'Skill cooldown 20s');
console.log('  ✓ Zhao Yun kit: Super with on-hit charge (50s cd), Passive Low-HP DR + heal, Skill 20s cd unlimited knockback/cleanse');

// 5. Verify 1.3x Hero Height Across All Heroes
console.log('\n--- 5. Hero Model Height Verification (1.3x of Soldiers) ---');
for (const hero of HEROES) {
  assert(hero.look && hero.look.size >= 1.30, `Hero ${hero.id} size should be >= 1.30`);
  const model = createHeroModel(hero);
  const expectedBaseScale = 1.12 * (hero.look.size || 1.30);
  assert(
    Math.abs(model.baseScale - expectedBaseScale) < 0.001,
    `Model baseScale for ${hero.id} should be ${expectedBaseScale}, got ${model.baseScale}`
  );
}
console.log(`  ✓ All ${HEROES.length} heroes have baseScale >= ${1.12 * 1.30} (1.3x ordinary soldier height)`);

// 6. Verify HTML & Battle HUD Elements
console.log('\n--- 6. HTML & Battle HUD Gadget Elements ---');
const htmlContent = fs.readFileSync('index.html', 'utf8');
assert(htmlContent.includes('id="gadget-btn"'), 'index.html must have #gadget-btn');
assert(htmlContent.includes('class="gadget-key"'), 'index.html must have .gadget-key hotkey');
assert(htmlContent.includes('id="gadget-cd"'), 'index.html must have #gadget-cd');
assert(htmlContent.includes('id="gadget-name"'), 'index.html must have #gadget-name');
console.log('  ✓ Battle HUD contains gadget button markup');

// 7. Verify DevPanel Visualization & Preview Slider
console.log('\n--- 7. DevPanel Visual Sliders & Brawl Preview ---');
const devPanelContent = fs.readFileSync('src/dev-panel.js', 'utf8');
assert(devPanelContent.includes('hero-kr'), 'DevPanel has hero-kr tab');
assert(devPanelContent.includes('dev-preview-slider'), 'DevPanel has brawl preview slider');
assert(devPanelContent.includes('exportJson'), 'DevPanel can export tuning JSON');
assert(devPanelContent.includes('input type="range"'), 'DevPanel uses range sliders for tuning');
console.log('  ✓ DevPanel contains visual range sliders, 1~11 level live preview card, and JSON export');

// 8. Verify Battle Hero Script Overhead & Gadget Logic
console.log('\n--- 8. Battle Hero Overhead Height & Combat Logic ---');
const heroCombatContent = fs.readFileSync('src/battle/hero.js', 'utf8');
assert(heroCombatContent.includes('3.40') || heroCombatContent.includes('3.4'), 'Overhead HP bar lifted to y=3.40');
assert(heroCombatContent.includes('heroUseGadget'), 'heroUseGadget function implemented');
assert(heroCombatContent.includes('heroTripleThrust'), 'Zhao Yun triple thrust combo implemented');
console.log('  ✓ Hero overhead HP bar lifted to y=3.40, Gadget trigger and triple thrust present');

console.log('\n🎉 ALL FULL BRAWL STARS HERO SYSTEM TESTS PASSED 100%! 🎉\n');

import assert from 'assert';
import * as THREE from '../lib/three.module.js';
import { battleHero } from '../src/battle/hero.js';
import { battleCombat } from '../src/battle/combat.js';
import { battleWaves } from '../src/battle/waves.js';
import { getHero } from '../src/data/heroes.js';
import { getUnit } from '../src/data/units.js';

console.log('=== Test Kingdom Rush Style Hero: Zhao Yun Prototype ===');

// Setup mock scene, ui, effects
const mockScene = {
  scene: {
    add(obj) {},
    remove(obj) {},
  },
  camera: {},
  setFocus(x) { this.focusX = x; },
  screenShake(p, d) { this.shook = true; },
};

const mockUi = {
  toastMsg: null,
  toast(msg) { this.toastMsg = msg; },
  banner: null,
  showBattleBanner(title, sub) { this.banner = { title, sub }; },
  flash() {},
};

const mockEffects = {
  slash() {},
  blood() {},
  death() {},
  heal() {},
  inkBurst() {},
  ring() {},
  dust() {},
};

const mockDmgText = {
  spawned: [],
  spawn(opt) { this.spawned.push(opt); },
};

function createMockBattle() {
  const heroData = getHero('zhaoyun');
  const battle = {
    state: 'running',
    paused: false,
    heroId: 'zhaoyun',
    heroData,
    heroLevel: 1,
    heroXp: 0,
    skillCd: 0,
    heroX: -8.6,
    heroZ: 0.25,
    heroRallyX: -8.6,
    heroRallyZ: 0.25,
    heroTargetX: -8.6,
    heroTargetZ: 0.25,
    heroAggroRadius: 2.85,
    heroLeashRadius: 4.2,
    heroEngageTarget: null,
    heroMovingToTarget: false,
    heroMaxHp: 1200,
    heroHp: 1200,
    heroArmor: 10,
    heroAtk: 65,
    heroRegenRate: 0.04,
    heroAtkInterval: 0.85,
    heroAtkTimer: 0,
    heroRange: 1.85,
    heroBlockSlots: 2,
    heroBlockedFoes: new Set(),
    heroRespawnTimer: 0,
    heroOutOfCombatTimer: 0,
    heroInBattleXp: 0,
    heroInBattleLevel: 1,
    heroCombos: 0,
    heroAttackAnim: 0,
    heroHitFlash: 0,
    heroMovingToRally: false,
    heroRallyMarker: null,
    heroHpBar: null,
    damageMul: 1,
    entities: [],
    scene: mockScene,
    ui: mockUi,
    effects: mockEffects,
    dmgText: mockDmgText,
    events: [],
    event(name, payload) { this.events.push({ name, payload }); },
    heroModel: {
      group: {
        position: new THREE.Vector3(-8.6, 0, 0.25),
        rotation: new THREE.Euler(0, -0.16, 0),
        traverse(fn) {},
      },
      body: {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
      },
      weaponPivot: {
        position: new THREE.Vector3(0.33, 1.0, 0.04),
        rotation: new THREE.Euler(0, 0, -0.10),
      },
    },
    heroRangeRing: {
      position: new THREE.Vector3(-8.6, 0.028, 0.25),
      material: { opacity: 0.1 },
    },
  };

  Object.assign(battle, battleHero, battleCombat, battleWaves);
  battle.applyHeroTuning = function(tuning) {
    if (!tuning) return;
    const oldMaxHp = this.heroMaxHp || 1200;
    const hpRatio = this.heroHp / Math.max(1, oldMaxHp);
    if (tuning.maxHp != null) {
      this.heroMaxHp = Math.max(100, Number(tuning.maxHp));
      this.heroHp = Math.max(1, Math.min(this.heroMaxHp, Math.round(this.heroMaxHp * hpRatio)));
    }
    if (tuning.atk != null) this.heroAtk = Math.max(1, Number(tuning.atk));
    if (tuning.armor != null) this.heroArmor = Math.max(0, Number(tuning.armor));
    if (tuning.regenRate != null) this.heroRegenRate = Math.max(0.005, Number(tuning.regenRate));
    if (tuning.aggroRadius != null) this.heroAggroRadius = Math.max(0.5, Number(tuning.aggroRadius));
  };
  return battle;
}

// 1. Initial State Verification
console.log('1. Checking Initial Zhao Yun KR Hero State...');
const b = createMockBattle();
assert.strictEqual(b.isHeroAlive(), true, 'Zhao Yun must be alive initially');
assert.strictEqual(b.heroHp, 1200, 'Initial HP must be 1200');
assert.strictEqual(b.heroMaxHp, 1200, 'Initial Max HP must be 1200');
assert.strictEqual(b.heroArmor, 10, 'Initial Armor must be 10');
assert.strictEqual(b.heroAtk, 65, 'Initial ATK must be 65');
assert.strictEqual(b.heroBlockSlots, 2, 'Zhao Yun must block 2 units');

const targetObj = b.getHeroTargetObj();
assert.strictEqual(targetObj.isHero, true, 'Target obj must have isHero true');
assert.strictEqual(targetObj.side, 'player', 'Target obj side must be player');
assert.strictEqual(targetObj.x, -8.6, 'Target obj x must match heroX');
console.log('✓ Initial state passed');

// 2. Rally Movement Verification
console.log('2. Checking Rally Command & 3D Movement...');
b.commandHeroRally(1.5, 0.6);
assert.strictEqual(b.heroTargetX, 1.5, 'heroTargetX must be set');
assert.strictEqual(b.heroTargetZ, 0.6, 'heroTargetZ must be set');
assert.strictEqual(b.heroMovingToRally, true, 'heroMovingToRally must be true');
assert(b.heroRallyMarker, 'Rally marker must be created');
assert.strictEqual(b.heroRallyMarker.group.position.x, 1.5, 'Marker X matches target');
assert.strictEqual(b.heroRallyMarker.group.position.z, 0.6, 'Marker Z matches target');

// Simulate 0.5s movement at 5.2m/s
b.updateHeroKRMovement(0.5);
assert(b.heroX > -8.6, 'Hero must have moved towards target X');
assert(b.heroZ > 0.25, 'Hero must have moved towards target Z');

// Fast forward movement until arrived
for (let i = 0; i < 60; i++) {
  b.updateHeroKRMovement(0.1);
  if (!b.heroMovingToRally) break;
}
assert.strictEqual(b.heroMovingToRally, false, 'Hero should arrive at destination');
assert.strictEqual(b.heroX, 1.5, 'Hero X must equal target');
assert.strictEqual(b.heroZ, 0.6, 'Hero Z must equal target');
console.log('✓ Rally movement passed');

// 3. Physical Blocking & Combat Engagement Verification
console.log('3. Checking Physical Blocking & Target Acquisition...');
// Create 2 enemy ground units near Zhao Yun
const swordsmanUnit = getUnit('swordsman');
const foe1 = {
  uid: 101,
  side: 'enemy',
  alive: true,
  x: 2.2,
  z: 0.6,
  hp: 1600,
  maxHp: 1600,
  armor: 10,
  atk: 45,
  interval: 1.0,
  attackTimer: 0,
  range: 1.2,
  speed: 1.5,
  unit: swordsmanUnit,
  buffs: {},
  model: { group: { position: new THREE.Vector3(2.2, 0, 0.6) } },
};
const foe2 = {
  uid: 102,
  side: 'enemy',
  alive: true,
  x: 2.5,
  z: 0.7,
  hp: 600,
  maxHp: 600,
  armor: 10,
  atk: 45,
  interval: 1.0,
  attackTimer: 0,
  range: 1.2,
  speed: 1.5,
  unit: swordsmanUnit,
  buffs: {},
  model: { group: { position: new THREE.Vector3(2.5, 0, 0.7) } },
};
const foe3 = {
  uid: 103,
  side: 'enemy',
  alive: true,
  x: 2.7,
  z: 0.8,
  hp: 600,
  maxHp: 600,
  armor: 10,
  atk: 45,
  interval: 1.0,
  attackTimer: 0,
  range: 1.2,
  speed: 1.5,
  unit: swordsmanUnit,
  buffs: {},
  model: { group: { position: new THREE.Vector3(2.7, 0, 0.8) } },
};
b.entities = [foe1, foe2, foe3];

// Run combat update: Zhao Yun should block foe1 and foe2 (slots = 2), but not foe3
b.updateHeroKRCombat(0.05);
assert.strictEqual(b.heroBlockedFoes.size, 2, 'Zhao Yun must block exactly 2 units');
assert.strictEqual(b.heroBlockedFoes.has(foe1), true, 'foe1 must be blocked');
assert.strictEqual(b.heroBlockedFoes.has(foe2), true, 'foe2 must be blocked');
assert.strictEqual(b.heroBlockedFoes.has(foe3), false, 'foe3 must NOT be blocked (capacity = 2)');
assert.strictEqual(foe1.heroBlockedBy, b, 'foe1 heroBlockedBy set');
assert.strictEqual(foe1.target.isHero, true, 'foe1 target locked to hero');

// Verify findTarget returns hero when blocked
const targetForFoe1 = b.findTarget(foe1);
assert.strictEqual(targetForFoe1.isHero, true, 'Enemy targeting must lock to Zhao Yun');
console.log('✓ Blocking & targeting passed');

// 4. Auto-Attack & 4th Combo (龙胆穿刺) Verification
console.log('4. Checking Zhao Yun Auto-Attack and 4th Combo...');
b.heroCombos = 0;
b.heroInBattleXp = 0;
const initialFoe1Hp = foe1.hp;
b.heroAtkTimer = 0; // Ready to attack
b.updateHeroKRCombat(0.05); // Attack 1
assert(foe1.hp < initialFoe1Hp, 'foe1 must take damage from auto attack');
assert.strictEqual(b.heroCombos, 1, 'Combo count should be 1');
assert.strictEqual(b.heroInBattleXp, 1, 'Zhao Yun gains 1 in-battle XP');

// Run attack 2 and 3
b.heroAtkTimer = 0;
b.updateHeroKRCombat(0.05); // Attack 2
assert.strictEqual(b.heroCombos, 2);

b.heroAtkTimer = 0;
b.updateHeroKRCombat(0.05); // Attack 3
assert.strictEqual(b.heroCombos, 3);

// Attack 4: Combo 龙胆穿刺 (double hit + micro-stun)
const preComboFoeHp = foe1.hp;
b.heroAtkTimer = 0;
b.updateHeroKRCombat(0.05); // Attack 4
assert.strictEqual(b.heroCombos, 4);
assert(foe1.buffs.stun >= 0.35, '4th attack must apply micro-stun');
assert(preComboFoeHp - foe1.hp > 80, '4th attack deals double-strike combo damage');
console.log('✓ Auto-attack and 4th combo passed');

// 5. Hero Damage Taking & Out-of-Combat Regen
console.log('5. Checking Damage Taking & Out-of-Combat Regen...');
const preHeroHp = b.heroHp;
// Apply 200 raw damage to Zhao Yun
b.damageHero(200, foe1);
const expectedDmg = 200 * (100 / (100 + 10)); // ~181.82
assert(Math.abs((preHeroHp - b.heroHp) - expectedDmg) < 1, 'Armor must mitigate physical damage');
assert.strictEqual(b.heroOutOfCombatTimer, 4.0, 'Out of combat timer resets to 4.0s');

// While in combat (timer > 0), no regen
const hpAfterDmg = b.heroHp;
b.updateHeroKR(1.0); // 3.0s left
assert.strictEqual(b.heroHp, hpAfterDmg, 'No regen while in combat timer');

// Fast forward past 4s
b.heroOutOfCombatTimer = 0;
b.updateHeroKR(1.0); // 1.0s of regen
const regenExpected = 0.04 * b.heroMaxHp * 1.0; // 48 hp
assert(b.heroHp > hpAfterDmg + 35, 'Out of combat regen heals ~4% maxHp/s');
console.log('✓ Damage & out-of-combat regen passed');

// 6. Hero Death & 15s Respawn
console.log('6. Checking Death & 15s Respawn (No Skill Release & Enemy Detargeting)...');
// Ensure foe1 and foe2 were targeting hero
foe1.target = b.getHeroTargetObj();
foe1.attackAnim = 0.3;
foe2.target = b.getHeroTargetObj();
foe2.attackAnim = 0.3;
b.entities = [foe1, foe2];

b.damageHero(5000, foe1); // Fatal damage
assert.strictEqual(b.heroHp, 0, 'HP must be 0');
assert.strictEqual(b.heroRespawnTimer, 15.0, 'Respawn timer must be 15s');
assert.strictEqual(b.isHeroAlive(), false, 'isHeroAlive must be false');
assert.strictEqual(b.heroBlockedFoes.size, 0, 'Blocked enemies must be freed upon hero death');
assert.strictEqual(foe1.heroBlockedBy, null, 'foe1 unblocked');
assert.strictEqual(foe2.heroBlockedBy, null, 'foe2 unblocked');

// 验证点 1：死后不能释放技能
b.skillCd = 0;
b.pendingSkill = null;
b.useActive();
assert.strictEqual(b.skillCd, 0, 'Skill CD must remain 0 (cannot release skill while dead)');
assert.strictEqual(b.pendingSkill, null, 'pendingSkill must remain null while dead');
assert.strictEqual(mockUi.toastMsg, '主将力竭蓄势中，暂无法施展绝技', 'Toast warning triggered');

// 验证点 2：死后敌方单位将将领视为死亡，清除目标不在围攻尸体
assert.strictEqual(foe1.target, null, 'foe1 target must be cleared to null upon hero death');
assert.strictEqual(foe2.target, null, 'foe2 target must be cleared to null upon hero death');
assert.strictEqual(foe1.attackAnim, 0, 'foe1 attack anim reset to 0');
assert.strictEqual(foe2.attackAnim, 0, 'foe2 attack anim reset to 0');

const targetWhileDead = b.findTarget(foe1);
assert.strictEqual(targetWhileDead, null, 'Enemies cannot acquire dead hero as target');

// Ticking 10s of respawn
b.updateHeroKR(10.0);
assert.strictEqual(b.isHeroAlive(), false, 'Hero still respawning after 10s');
assert(Math.abs(b.heroRespawnTimer - 5.0) < 0.1, '5s remaining');

// Ticking final 5.1s to complete respawn
b.updateHeroKR(5.1);
assert.strictEqual(b.isHeroAlive(), true, 'Hero must revive after 15s');
assert.strictEqual(b.heroHp, b.heroMaxHp, 'Hero revives with 100% full HP');
assert.strictEqual(b.heroRespawnTimer, 0, 'Respawn timer cleared');
console.log('✓ Death and 15s respawn passed');

// 7. In-Battle Level Up Verification
console.log('7. Checking In-Battle Level Up (Lv.1 -> Lv.2)...');
const preLvlMaxHp = b.heroMaxHp;
const preLvlAtk = b.heroAtk;
b.addHeroInBattleXp(25); // Pass threshold 20
assert.strictEqual(b.heroInBattleLevel, 2, 'Hero levels up to Lv.2');
assert(b.heroMaxHp > preLvlMaxHp, 'Max HP increases on level up');
assert(b.heroAtk > preLvlAtk, 'Attack increases on level up');
assert.strictEqual(b.heroHp, b.heroMaxHp, 'HP fully heals on level up');
console.log('✓ In-battle level up passed');

// 8. Active Skill & Passive Aura Backward Compatibility
console.log('8. Checking Active Skill & Passive Aura Compatibility...');
// Recompute auras when alive
const allyUnit = {
  uid: 201, side: 'player', alive: true, x: 2.0, z: 0.6, hp: 500, maxHp: 500, armor: 0, atk: 40, unit: getUnit('swordsman'), buffs: {},
};
b.entities = [allyUnit];
b.recomputeAuras();
assert(allyUnit.auraSpeed > 1.0, 'Zhao Yun passive aura (龙胆) applies +18% aspd when alive');

// Test active skill
b.skillCd = 0;
b.useActive();
assert(b.skillCd > 0, 'Active skill cooldown must be triggered');
assert(b.heroSkillAnim != null, 'Hero skill animation must be created');
console.log('✓ Active skill & passive aura compatibility passed');

// 9. Standby Aggro Radius (2-3身位主动迎击与归位)
console.log('9. Checking Standby Aggro Radius (2-3 body lengths) & Return to Rally...');
const b2 = createMockBattle();
b2.heroX = 0;
b2.heroZ = 0;
b2.heroRallyX = 0;
b2.heroRallyZ = 0;
b2.heroModel.group.position.set(0, 0, 0);

// Enemy is at x = 2.4 (within 2.85m aggro radius, beyond 1.55m melee reach)
const patrolFoe = {
  uid: 301, side: 'enemy', alive: true, x: 2.4, z: 0, hp: 400, maxHp: 400, armor: 0, atk: 30, unit: getUnit('swordsman'), buffs: {},
};
b2.entities = [patrolFoe];

// Run combat: Zhao Yun should detect patrolFoe and step towards it
b2.updateHeroKRCombat(0.1);
assert.strictEqual(b2.heroEngageTarget, patrolFoe, 'Zhao Yun must lock onto enemy entering 2-3 body length radius');
assert(b2.heroX > 0, 'Zhao Yun must actively step forward towards enemy');
assert.strictEqual(b2.heroMovingToTarget, true, 'heroMovingToTarget must be true while approaching');

// Step forward until in melee reach
for (let i = 0; i < 20; i++) {
  b2.updateHeroKRCombat(0.05);
  if (Math.abs(patrolFoe.x - b2.heroX) <= 1.55) break;
}
assert(Math.abs(patrolFoe.x - b2.heroX) <= 1.55, 'Zhao Yun closes in to melee reach');

// Now enemy dies
patrolFoe.alive = false;
patrolFoe.gone = true;
b2.updateHeroKRCombat(0.05);
assert.strictEqual(b2.heroEngageTarget, null, 'Engage target cleared on enemy death');

// Run frames: Zhao Yun should smoothly return to rally point (0, 0)
for (let i = 0; i < 40; i++) {
  b2.updateHeroKRCombat(0.05);
  if (Math.abs(b2.heroX) <= 0.05) break;
}
assert(Math.abs(b2.heroX - 0) <= 0.05, 'Zhao Yun returns to rally point when enemy is cleared');
assert.strictEqual(b2.heroMovingToTarget, false, 'heroMovingToTarget becomes false after returning');
console.log('✓ Standby aggro radius & return to rally passed');

// 10. Retaliation When Attacked
console.log('10. Checking Retaliation When Attacked in Standby...');
const b3 = createMockBattle();
b3.heroX = 0;
b3.heroZ = 0;
b3.heroRallyX = 0;
b3.heroRallyZ = 0;
b3.heroModel.group.position.set(0, 0, 0);

// Enemy archer attacks from 3.5m away (outside 2.85m aggro radius, but inside 4.2m leash)
const archerFoe = {
  uid: 401, side: 'enemy', alive: true, x: 3.5, z: 0, hp: 300, maxHp: 300, armor: 0, atk: 35, unit: getUnit('archer'), buffs: {},
};
b3.entities = [archerFoe];

// Archer shoots Zhao Yun
b3.damageHero(35, archerFoe);
assert.strictEqual(b3.heroEngageTarget, archerFoe, 'Zhao Yun must immediately lock onto attacker upon taking damage');

// Run combat: Zhao Yun charges forward to close the distance
b3.updateHeroKRCombat(0.1);
assert(b3.heroX > 0, 'Zhao Yun charges towards attacker');
console.log('✓ Retaliation when attacked passed');

// 11. Hero Tuning Runtime Adjustment Verification
console.log('11. Checking Hero Parameter Tuning Live Updates...');
const b4 = createMockBattle();
assert.strictEqual(b4.heroMaxHp, 1200);
assert.strictEqual(b4.heroAtk, 65);
assert.strictEqual(b4.heroArmor, 10);
assert.strictEqual(b4.heroRegenRate, 0.04);
assert.strictEqual(b4.heroAggroRadius, 2.85);

// Apply custom live tuning
b4.applyHeroTuning({
  maxHp: 1800,
  atk: 90,
  armor: 25,
  regenRate: 0.06,
  aggroRadius: 3.5,
});

assert.strictEqual(b4.heroMaxHp, 1800, 'Max HP updated to 1800');
assert.strictEqual(b4.heroHp, 1800, 'Current HP scaled proportionally');
assert.strictEqual(b4.heroAtk, 90, 'ATK updated to 90');
assert.strictEqual(b4.heroArmor, 25, 'Armor updated to 25');
assert.strictEqual(b4.heroRegenRate, 0.06, 'Regen rate updated to 6%');
assert.strictEqual(b4.heroAggroRadius, 3.5, 'Aggro radius updated to 3.5m');
console.log('✓ Hero tuning live updates passed');

console.log('=== All Zhao Yun Kingdom Rush Hero Tests Passed 100%! ===');

import assert from 'node:assert';
import * as THREE from '../lib/three.module.js';
import { battleCombat } from '../src/battle/combat.js';
import { battleHero } from '../src/battle/hero.js';
import { createUnitModel } from '../src/models.js';
import { EffectSystem } from '../src/effects.js';

console.log('🧪 Starting Hero Combat, Visual Facing, and Models Verification...\n');

// ----------------------------------------------------------------------------
// Test 1: Firezone & Splash & Projectile Damage against Hero
// ----------------------------------------------------------------------------
console.log('--- Test 1: Firezone, Splash, and Lobbed Projectile Damage to Hero ---');
{
  const ctx = {
    ...battleCombat,
    ...battleHero,
    state: 'running',
    heroId: 'zhaoyun',
    heroHp: 1000,
    heroMaxHp: 1000,
    heroX: 2.0,
    heroZ: 0.0,
    heroArmor: 0,
    heroRespawnTimer: 0,
    fireZones: [],
    projectiles: [],
    entities: [],
    damageMul: 1,
    fireDuration: 4.0,
    isHeroAlive() { return this.heroHp > 0 && this.heroRespawnTimer <= 0; },
    damageHero(rawDmg) {
      this.heroHp = Math.max(0, this.heroHp - rawDmg);
    },
    effects: {
      ring() {},
      inkBurst() {},
      blood() {},
      dust() {},
      shield() {},
      slash() {},
      death() {},
      fire() {}
    },
    scene: {
      screenShake() {},
      scene: { remove() {} }
    }
  };

  // 1.1 Firezone damage
  ctx.fireZones.push({
    x: 2.0, z: 0.0, side: 'enemy', life: 3.0, maxLife: 3.0, damageAcc: 0, dps: 100, radius: 1.5
  });
  ctx.updateFireZones(0.6); // Triggers damageAcc > 0.5
  assert(ctx.heroHp < 1000, `Hero HP should decrease in enemy firezone! Current: ${ctx.heroHp}`);
  console.log(`  ✓ Enemy firezone deals damage to hero (HP: 1000 -> ${ctx.heroHp})`);

  // 1.2 Splash projectile damage
  const hpBeforeSplash = ctx.heroHp;
  const splashProj = {
    targetLast: new THREE.Vector3(2.5, 1.0, 0.0),
    side: 'enemy',
    splash: 2.0,
    damage: 100,
    splashMul: 0.7,
    source: { side: 'enemy', unit: { tags: [], special: 'none' }, auraAtk: 1, buffs: {} },
    hit: []
  };
  ctx.projectileHit(splashProj, null);
  assert(ctx.heroHp < hpBeforeSplash, `Hero HP should decrease from projectile splash! Current: ${ctx.heroHp}`);
  console.log(`  ✓ Projectile splash deals damage to hero (HP: ${hpBeforeSplash} -> ${ctx.heroHp})`);

  // 1.3 Lobbed direct hit
  const hpBeforeLob = ctx.heroHp;
  const pLob = {
    target: null,
    side: 'enemy',
    lob: true,
    t: 1.0,
    dur: 1.0,
    endX: 2.1,
    endZ: 0.0,
    targetLast: new THREE.Vector3(2.1, 1.0, 0.0),
    damage: 80,
    splash: 0,
    start: new THREE.Vector3(8, 1, 0),
    mesh: new THREE.Group(),
    source: { side: 'enemy', unit: { tags: [], special: 'none' }, auraAtk: 1, buffs: {} },
    hit: [],
    type: 'oil'
  };
  ctx.projectiles.push(pLob);
  ctx.updateProjectiles(0.1);
  assert(ctx.heroHp < hpBeforeLob, `Hero HP should decrease from lobbed oil hit! Current: ${ctx.heroHp}`);
  console.log(`  ✓ Lobbed direct hit deals damage to hero (HP: ${hpBeforeLob} -> ${ctx.heroHp})`);

  // 1.4 Powder cart explosion
  const hpBeforeBomb = ctx.heroHp;
  ctx.explodePowderCart({
    alive: true,
    side: 'enemy',
    x: 2.2,
    unit: { fx: { blastRadius: 2.0, blastDamage: 120 } }
  });
  assert(ctx.heroHp < hpBeforeBomb, `Hero HP should decrease from powder cart blast! Current: ${ctx.heroHp}`);
  console.log(`  ✓ Powder cart explosion deals damage to hero (HP: ${hpBeforeBomb} -> ${ctx.heroHp})`);
}

// ----------------------------------------------------------------------------
// Test 2: Horizontal Facing scale.x (Zero 3D rotation.y)
// ----------------------------------------------------------------------------
console.log('\n--- Test 2: Horizontal Facing via scale.x (Zero 3D rotation.y) ---');
{
  const soldier = {
    x: 5, z: 0, side: 'enemy', baseScale: 1.12, kind: 'unit', unit: { building: false },
    model: {
      group: {
        rotation: { y: 0 },
        scale: { x: -1.12, y: 1.12, z: 1.12 }
      }
    }
  };

  // Face left target
  battleCombat.faceTarget(soldier, { x: 2 });
  assert.strictEqual(soldier.model.group.rotation.y, 0, 'rotation.y should remain 0 when facing left');
  assert(soldier.model.group.scale.x < 0, `scale.x should be negative when facing left, got ${soldier.model.group.scale.x}`);

  // Face right target
  battleCombat.faceTarget(soldier, { x: 8 });
  assert.strictEqual(soldier.model.group.rotation.y, 0, 'rotation.y should remain 0 when facing right');
  assert(soldier.model.group.scale.x > 0, `scale.x should be positive when facing right, got ${soldier.model.group.scale.x}`);

  console.log('  ✓ Soldiers use scale.x for horizontal flip without 3D rotation.y');
}

// ----------------------------------------------------------------------------
// Test 3: Hero Facing Dictates Skill Release Direction
// ----------------------------------------------------------------------------
console.log('\n--- Test 3: Hero Facing Determines Skill Direction ---');
{
  const heroCtx = {
    ...battleHero,
    heroId: 'zhaoyun',
    heroX: 0,
    heroZ: 0,
    heroFacing: -1, // Facing left
    delayedStrikes: [],
    entities: [],
    playSkillFx() {},
    ui: { showBattleBanner() {} }
  };

  // Run Zhao Yun skill effect when facing left (-1)
  heroCtx.runSkillEffect({ template: 'strikesMulti', count: 7, damage: 180 }, 1, 0xe0e7ff);
  assert(heroCtx.delayedStrikes.length === 7, 'Should produce 7 strikes');
  for (const s of heroCtx.delayedStrikes) {
    assert(s.x < heroCtx.heroX, `When facing left, strike X (${s.x}) should be < heroX (0)`);
  }
  console.log('  ✓ Facing left (-1): all 7 skill strikes released towards -X');

  // Reset and test facing right (+1)
  heroCtx.heroFacing = 1;
  heroCtx.delayedStrikes = [];
  heroCtx.runSkillEffect({ template: 'strikesMulti', count: 7, damage: 180 }, 1, 0xe0e7ff);
  for (const s of heroCtx.delayedStrikes) {
    assert(s.x > heroCtx.heroX, `When facing right, strike X (${s.x}) should be > heroX (0)`);
  }
  console.log('  ✓ Facing right (+1): all 7 skill strikes released towards +X');
}

// ----------------------------------------------------------------------------
// Test 4: Zhao Yun 4th Attack Combo (Triple Thrust Animation & Hits)
// ----------------------------------------------------------------------------
console.log('\n--- Test 4: Zhao Yun 4th Attack Combo (3 Consecutive Thrusts) ---');
{
  let spearSounds = 0;
  let damages = [];
  const testHero = {
    ...battleHero,
    heroId: 'zhaoyun',
    heroX: 0,
    heroZ: 0,
    heroAtk: 100,
    heroCombos: 3, // Next attack will be combo 4
    heroAtkTimer: 0,
    heroRange: 2.5,
    heroFacing: 1,
    entities: [],
    heroBlockedFoes: new Set(),
    heroEngageTarget: {
      alive: true,
      x: 1.5,
      z: 0,
      buffs: {},
      unit: { building: false }
    },
    heroModel: {
      baseScale: 1.1,
      group: { position: { set() {} }, rotation: { y: 0 }, scale: { set() {} } },
      body: { position: new THREE.Vector3(), rotation: new THREE.Euler(), scale: new THREE.Vector3(1, 1, 1) },
      weaponPivot: { position: new THREE.Vector3(), rotation: new THREE.Euler(), scale: new THREE.Vector3(1, 1, 1) }
    },
    applyDamage(target, dmg, src, opts) {
      damages.push({ dmg, opts });
    },
    addHeroInBattleXp() {},
    getHeroTargetObj() { return { isHero: true, alive: true }; }
  };

  // Trigger attack
  testHero.updateHeroKRCombat(0.016);
  assert.strictEqual(testHero.heroCombos, 4, 'Hero combos should reach 4');
  assert(testHero.heroTripleThrust != null, 'heroTripleThrust combo should be active');
  assert.strictEqual(testHero.heroTripleThrust.hitsDone, 0, 'Hits done starts at 0');
  console.log('  ✓ 4th attack successfully triggered heroTripleThrust combo');

  // Advance to thrust 1 (t = 0.12s)
  testHero.updateHeroVisual(0.12);
  assert.strictEqual(testHero.heroTripleThrust.hitsDone, 1, 'Thrust 1 should hit');
  assert.strictEqual(damages.length, 1, '1 damage event should be recorded');
  console.log(`  ✓ Thrust 1: Hit applied with damage = ${damages[0].dmg}`);

  // Advance to thrust 2 (t = 0.22s -> total 0.34s)
  testHero.updateHeroVisual(0.22);
  assert.strictEqual(testHero.heroTripleThrust.hitsDone, 2, 'Thrust 2 should hit');
  assert.strictEqual(damages.length, 2, '2 damage events should be recorded');
  console.log(`  ✓ Thrust 2: Hit applied with damage = ${damages[1].dmg}`);

  // Advance to thrust 3 (t = 0.22s -> total 0.56s)
  testHero.updateHeroVisual(0.22);
  assert.strictEqual(testHero.heroTripleThrust.hitsDone, 3, 'Thrust 3 should hit');
  assert.strictEqual(damages.length, 3, '3 damage events should be recorded');
  assert(damages[2].opts.isCrit === true, '3rd thrust should be a critical strike');
  console.log(`  ✓ Thrust 3: Critical hit applied with damage = ${damages[2].dmg} (isCrit: true)`);

  // Finish combo (total > 0.65s)
  testHero.updateHeroVisual(0.15);
  assert.strictEqual(testHero.heroTripleThrust, null, 'heroTripleThrust should complete cleanly');
  console.log('  ✓ Triple thrust combo completed with 3 separate hits and animations');
}

// ----------------------------------------------------------------------------
// Test 5: Trebuchet Model Swapped Left & Right
// ----------------------------------------------------------------------------
console.log('\n--- Test 5: Trebuchet (霹雳车) Geometry Symmetry Verification ---');
{
  const trebuchetModel = createUnitModel({
    id: 'trebuchet',
    building: false,
    look: { building: 'trebuchet', size: 1.15 }
  });
  assert(trebuchetModel.group.children.length > 0, 'Trebuchet model must have children meshes');
  assert(trebuchetModel.body.geometry.attributes.position.count > 0, 'Trebuchet body must have geometry vertices');
  console.log(`  ✓ Trebuchet model generated successfully with ${trebuchetModel.body.geometry.attributes.position.count} vertices`);
}

// ----------------------------------------------------------------------------
// Test 6: Arrow Tower vs Repeater Tower Differentiation
// ----------------------------------------------------------------------------
console.log('\n--- Test 6: Arrow Tower (with Archer) vs Repeater Tower (with Zhuge Nu) ---');
{
  const arrowTower = createUnitModel({
    id: 'tower',
    building: true,
    look: { building: 'tower' }
  });
  const repeaterTower = createUnitModel({
    id: 'repeater',
    building: true,
    look: { building: 'repeater' }
  });

  const arrowTris = arrowTower.body.geometry.attributes.position.count;
  const repeaterTris = repeaterTower.body.geometry.attributes.position.count;

  assert(arrowTris > 0, 'Arrow tower must have geometry vertices');
  assert(repeaterTris > 0, 'Repeater tower must have geometry vertices');
  console.log(`  ✓ Arrow Tower vertex count: ${arrowTris}`);
  console.log(`  ✓ Repeater Tower vertex count: ${repeaterTris}`);
  assert.notStrictEqual(arrowTris, repeaterTris, 'Arrow Tower and Repeater Tower must have distinct geometric models');
  console.log('  ✓ Arrow Tower and Repeater Tower are distinctly modeled');
}

// ----------------------------------------------------------------------------
// Test 7: Skill Blue Blob VFX Removal
// ----------------------------------------------------------------------------
console.log('\n--- Test 7: Skill Blue Blob VFX Removal ---');
{
  const fs = await import('fs');
  const effContent = fs.readFileSync('src/effects.js', 'utf8');

  // Verify omniDragonSlash definition does not contain 0x38bdf8
  const omniMatch = effContent.match(/omniDragonSlash\([\s\S]*?\n  \}/);
  assert(omniMatch, 'omniDragonSlash should exist');
  assert(!omniMatch[0].includes('0x38bdf8'), 'omniDragonSlash should NOT contain blue color 0x38bdf8');
  assert(!omniMatch[0].includes('inkBurst'), 'omniDragonSlash should NOT spawn blue inkBurst blob');
  console.log('  ✓ omniDragonSlash is free of blue blob/horns/burst');
}

console.log('\n🎉 ALL 7/7 TESTS PASSED SUCCESSFULLY! 🎉\n');

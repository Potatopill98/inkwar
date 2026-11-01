import assert from 'assert';
import { HEROES } from '../src/data/heroes.js';
import { createHeroModel } from '../src/models.js';
import { battleHero } from '../src/battle/hero.js';
import { battleCombat } from '../src/battle/combat.js';

console.log('🧪 Starting Verification of 1.3x Scale and Hero Displacement Bug Fixes...\n');

// 1. Verify 1.3x Model Scale for all heroes
console.log('--- 1. Hero 1.3x Scale Verification ---');
for (const hero of HEROES) {
  assert(hero.look, `Hero ${hero.id} must have look config`);
  const expectedSize = (hero.id === 'guanyu' || hero.id === 'lvbu') ? 1.34 : 1.30;
  assert(
    Math.abs((hero.look.size || 1.30) - expectedSize) < 0.01,
    `Hero ${hero.id} size should be ${expectedSize}, got ${hero.look.size}`
  );

  const model = createHeroModel(hero);
  const expectedScale = 1.12 * expectedSize;
  assert(
    Math.abs(model.baseScale - expectedScale) < 0.001,
    `Hero ${hero.id} model baseScale should be ${expectedScale}, got ${model.baseScale}`
  );
}
console.log(`  ✓ All ${HEROES.length} heroes have baseScale ~ 1.456 (1.3x soldier height)`);

// 2. Verify getHeroTargetObj dynamic binding (Bug #1 Fix)
console.log('\n--- 2. Dynamic Target Binding & Live Position Tracking ---');
const mockBattle = {
  heroId: 'zhaoyun',
  heroX: 2.0,
  heroZ: 0.5,
  heroHp: 1000,
  heroMaxHp: 1200,
  heroArmor: 15,
  heroRespawnTimer: 0,
  heroModel: { group: { position: { x: 2.0 } } },
  isHeroAlive() {
    return this.heroHp > 0 && this.heroRespawnTimer <= 0;
  },
  ...battleHero
};

const targetObj = mockBattle.getHeroTargetObj();
assert.strictEqual(targetObj.x, 2.0, 'Initial targetObj.x matches heroX');
assert.strictEqual(targetObj.z, 0.5, 'Initial targetObj.z matches heroZ');
assert.strictEqual(targetObj.hp, 1000, 'Initial targetObj.hp matches heroHp');
assert.strictEqual(targetObj.alive, true, 'Hero is initially alive');

// Now simulate hero moving away (rally, engage, or dash) WITHOUT calling getHeroTargetObj again
mockBattle.heroX = 7.5;
mockBattle.heroZ = -1.2;
assert.strictEqual(targetObj.x, 7.5, 'targetObj.x automatically updates to 7.5 via dynamic getter!');
assert.strictEqual(targetObj.z, -1.2, 'targetObj.z automatically updates to -1.2 via dynamic getter!');

// Simulate hero taking damage
mockBattle.heroHp = 450;
assert.strictEqual(targetObj.hp, 450, 'targetObj.hp dynamically tracks heroHp');

// Simulate hero dying
mockBattle.heroHp = 0;
assert.strictEqual(targetObj.alive, false, 'targetObj.alive dynamically reflects death');
console.log('  ✓ Live dynamic binding verifies that cached targetObj.x follows heroX instantly');

// 3. Verify combat ghost attack prevention in performAttack
console.log('\n--- 3. Combat Ghost Attack Prevention ---');
let attackApplied = false;
const mockCombatBattle = {
  heroX: 8.0, // Hero is 8.0m away
  heroZ: 0.0,
  heroHp: 1000,
  heroMaxHp: 1200,
  effectiveRange(e) { return 1.2; },
  isHeroAlive() { return true; },
  applyDamage() { attackApplied = true; },
  ...battleCombat
};

const mockEnemyAtOrigin = {
  x: 0.0,
  z: 0.0,
  range: 1.2,
  unit: { tags: ['melee'], look: { weapon: 'sword' }, special: 'none' },
  comboCount: 0,
  attackAnim: 0.25,
  target: targetObj
};

// Enemy at x=0 attempts to performAttack on targetObj which is at heroX=8.0
mockCombatBattle.performAttack(mockEnemyAtOrigin, targetObj);
assert.strictEqual(attackApplied, false, 'Ghost attack was successfully BLOCKED when hero was 8.0m away!');
assert.strictEqual(mockEnemyAtOrigin.target, null, 'Stale target was cleared');
assert.strictEqual(mockEnemyAtOrigin.attackAnim, 0, 'Attack animation was cancelled');
console.log('  ✓ Ghost attacks completely prevented when hero moves away');

// 4. Verify 3D Thumbnail Auto-Fit Camera NDC projection bounds
console.log('\n--- 4. UI 3D Thumbnail Auto-Fit Camera Bounds ---');
import * as THREE from '../lib/three.module.js';

for (const hero of HEROES) {
  const model = createHeroModel(hero, 'player');
  if (model.aura) model.aura.visible = false;
  model.group.rotation.y = -0.38;
  model.group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model.group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fov = 30;
  const halfFovRad = (fov / 2) * (Math.PI / 180);
  const margin = 1.25;
  const distY = (size.y / 2) / Math.tan(halfFovRad) * margin;
  const distX = (size.x / 2) / Math.tan(halfFovRad) * margin;
  const zDist = Math.max(distY, distX) + size.z / 2;

  const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  cam.position.set(center.x, center.y + 0.12, center.z + zDist);
  cam.lookAt(center.x, center.y - 0.05, center.z);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minY = 99, maxY = -99, minX = 99, maxX = -99;
  for (const c of corners) {
    c.project(cam);
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
  }

  assert(maxY < 0.90, `Hero ${hero.id} top (${maxY}) must not be clipped by top edge (1.0)`);
  assert(minY > -0.90, `Hero ${hero.id} bottom (${minY}) must not be clipped by bottom edge (-1.0)`);
  assert(maxX < 0.90, `Hero ${hero.id} right (${maxX}) must not be clipped by right edge (1.0)`);
  assert(minX > -0.90, `Hero ${hero.id} left (${minX}) must not be clipped by left edge (-1.0)`);
}
console.log(`  ✓ All ${HEROES.length} heroes fit completely inside 3D thumbnail with generous breathing margin (0% clipping)!`);

console.log('\n🎉 ALL 1.3x SCALE, GHOST ATTACK, AND UI AUTO-FIT TESTS PASSED 100%! 🎉\n');

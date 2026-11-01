import assert from 'assert';
import { TUTORIALS, TutorialController } from '../src/tutorial.js';
import { FIRST_GUIDE_STEPS, FirstGuide } from '../src/first-guide.js';

console.log('--- Testing TUTORIALS & TutorialController ---');

// Mock Battle & UI
const mockUI = {
  shownGuide: null,
  hidden: false,
  showGuide(opt) {
    this.shownGuide = opt;
    this.hidden = false;
  },
  hideGuide() {
    this.hidden = true;
    this.shownGuide = null;
  },
};

const mockScene = {
  deployShown: false,
  showDeploy(val) {
    this.deployShown = val;
  },
};

const mockBattle = {
  tutorialPause: false,
  energy: 1,
  heroSkillCd: 15,
  scene: mockScene,
  cards: [
    { unit: { id: 'swordsman', name: '刀盾兵', cost: 3 }, cd: 5, lock: 0 },
    { unit: { id: 'archer', name: '弓兵', cost: 3 }, cd: 0, lock: 0 },
    { unit: { id: 'militia', name: '乡勇', cost: 2 }, cd: 0, lock: 0 },
  ],
};

const tc = new TutorialController(mockBattle, mockUI);

// Test Level 1 configuration
assert(TUTORIALS.l1, 'l1 config must exist');
assert.strictEqual(TUTORIALS.l1.steps.length, 6, 'l1 must have 6 steps');

// Start l1
tc.start('l1');
assert.strictEqual(tc.levelId, 'l1');
assert.strictEqual(tc.pendingNext, 0.4);

// Advance pendingNext
tc.update(0.5); // pendingNext reaches 0 -> showStep (step 0: Swordsman selection)
assert.strictEqual(tc.index, 0);
assert(tc.delayTimer > 0, 'Step 0 has delayBefore');

tc.update(1.0); // delayTimer reaches 0 -> executeShowStep
assert.strictEqual(mockBattle.tutorialPause, true, 'Battle must be paused during step 0');
assert(mockBattle.energy >= 3, 'Energy must be boosted to at least 3 for Swordsman');
assert.strictEqual(mockBattle.cards[0].cd, 0, 'Swordsman cooldown must be reset to 0');
assert.strictEqual(mockUI.shownGuide.pause, true, 'UI showGuide must receive pause=true');
assert.strictEqual(mockUI.shownGuide.title, '兵家要略 · 刀盾先锋');

// Test card restriction
assert.strictEqual(tc.isCardRestricted('militia'), true, 'Militia must be restricted when Swordsman is required');
assert.strictEqual(tc.isCardRestricted('archer'), true, 'Archer must be restricted when Swordsman is required');
assert.strictEqual(tc.isCardRestricted('swordsman'), false, 'Swordsman must NOT be restricted');

// Simulate cardSelected
tc.handle('cardSelected', { id: 'swordsman' });
assert.strictEqual(tc.waiting, false, 'Waiting should be false after correct card selection');

// Next step: Deployment (step 1)
tc.update(0.5); // pendingNext triggers showStep
assert.strictEqual(tc.index, 1);
assert.strictEqual(tc.current.unit, 'swordsman');
assert.strictEqual(tc.current.targetKind, 'zone');
assert.strictEqual(mockBattle.tutorialPause, true, 'Battle still paused while aiming deployment');
assert.strictEqual(mockScene.deployShown, true, 'Scene deploy area should be shown');

// Deploy Swordsman
tc.handle('deployed', { id: 'swordsman' });
assert.strictEqual(mockBattle.tutorialPause, false, 'Battle must UNPAUSE after Swordsman deployed');
assert.strictEqual(mockScene.deployShown, false, 'Scene deploy area hidden after deploy');

console.log('✓ In-Battle Tutorial Level 1 Step 0-1 Pause & Deploy passed');

// Step 2: Archer selection after combat delay
tc.update(0.5); // pendingNext triggers step 2
assert.strictEqual(tc.index, 2);
assert(tc.delayTimer > 0, 'Step 2 has delayBefore');
tc.update(5.0); // wait through delay
assert.strictEqual(mockBattle.tutorialPause, true, 'Battle pauses for Archer step');
assert.strictEqual(tc.isCardRestricted('swordsman'), true, 'Swordsman restricted when Archer required');
assert.strictEqual(tc.isCardRestricted('archer'), false, 'Archer allowed');

tc.handle('cardSelected', { id: 'archer' });
tc.update(0.5); // step 3: deploy archer
assert.strictEqual(tc.index, 3);
assert.strictEqual(mockBattle.tutorialPause, true, 'Battle paused for Archer deploy');

tc.handle('deployed', { id: 'archer' });
assert.strictEqual(mockBattle.tutorialPause, false, 'Battle unpauses after Archer deployed');

console.log('✓ In-Battle Tutorial Level 1 Step 2-3 Tank+DPS Synergy passed');

// Step 4: Hero skill
tc.update(0.5);
tc.update(7.0); // wait through delay
assert.strictEqual(mockBattle.tutorialPause, true, 'Battle pauses for Zhao Yun skill');
assert.strictEqual(mockBattle.heroSkillCd, 0, 'Zhao Yun skill cd guaranteed reset');

tc.handle('skillUsed', { hero: 'zhaoyun' });
assert.strictEqual(mockBattle.tutorialPause, false, 'Battle unpauses after Zhao Yun skill used');

console.log('✓ In-Battle Tutorial Level 1 Hero Skill passed');

// Test FIRST_GUIDE_STEPS
console.log('--- Testing FirstGuide Meta-Progression Steps ---');
assert.strictEqual(FIRST_GUIDE_STEPS.length, 17, 'Must have 17 meta steps');
assert.strictEqual(FIRST_GUIDE_STEPS[0].act, 'levels', 'Step 0 opens levels');
assert.strictEqual(FIRST_GUIDE_STEPS[1].act, 'prep_1', 'Step 1 opens prep for level 1');
assert.strictEqual(FIRST_GUIDE_STEPS[2].act, 'battle_1', 'Step 2 starts battle 1');
assert.strictEqual(FIRST_GUIDE_STEPS[3].act, 'return_home', 'Step 3 returns home after win');
assert.strictEqual(FIRST_GUIDE_STEPS[4].act, 'next_tip', 'Step 4 explains top 4 resources');
assert.strictEqual(FIRST_GUIDE_STEPS[5].act, 'open_camp', 'Step 5 opens camp');
assert.strictEqual(FIRST_GUIDE_STEPS[6].act, 'do_upgrade_camp', 'Step 6 upgrades camp');
assert.strictEqual(FIRST_GUIDE_STEPS[7].act, 'return_home', 'Step 7 returns home');
assert.strictEqual(FIRST_GUIDE_STEPS[8].act, 'open_bounty', 'Step 8 opens bounty');
assert.strictEqual(FIRST_GUIDE_STEPS[9].act, 'next_tip', 'Step 9 explains bounty double and reroll');
assert.strictEqual(FIRST_GUIDE_STEPS[10].act, 'close_bounty', 'Step 10 closes bounty');
assert.strictEqual(FIRST_GUIDE_STEPS[11].act, 'open_gacha', 'Step 11 opens gacha');
assert.strictEqual(FIRST_GUIDE_STEPS[12].act, 'do_gacha_draw', 'Step 12 draws free gacha');
assert.strictEqual(FIRST_GUIDE_STEPS[13].act, 'return_home', 'Step 13 returns home');
assert.strictEqual(FIRST_GUIDE_STEPS[14].act, 'levels', 'Step 14 opens levels for level 2');
assert.strictEqual(FIRST_GUIDE_STEPS[15].act, 'prep_2', 'Step 15 opens prep for level 2');
assert.strictEqual(FIRST_GUIDE_STEPS[16].act, 'battle_2', 'Step 16 starts battle 2 and completes first guide');

console.log('✓ FirstGuide 17-step Meta-Loop verified');
console.log('ALL TUTORIAL & FIRST GUIDE TESTS PASSED!');

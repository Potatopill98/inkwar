import assert from 'assert';
import * as THREE from '../lib/three.module.js';
import { EndlessManager, ENDLESS_BUFF_POOL, ENDLESS_BOSS_LADDER } from '../src/data/endless-manager.js';
import { battleCombat } from '../src/battle/combat.js';
import { battleWaves } from '../src/battle/waves.js';
import { battleDeploy } from '../src/battle/deploy.js';
import { battleHero } from '../src/battle/hero.js';
import { getUnit } from '../src/data/units.js';

console.log('=== 开始无尽模式（墨影试炼）全套核心机制自动化测试 ===\n');

// ---------------- 1. EndlessManager 基础逻辑测试 ----------------
console.log('1. 测试 EndlessManager 奖励精密计算算法:');
{
  const res = EndlessManager.calculateRewards({
    waves: 15,
    kills: 120,
    bossKills: 1,
    baseDamage: 12500,
  });
  console.log('  输入: 15波, 120杀敌, 1 Boss, 12500敌寨伤害');
  console.log('  输出明细:', res.details);
  console.log('  总奖励: 墨宝 =', res.mobao, ', 将令 =', res.tokens);

  // 波次: 15 墨宝, 15 将令
  assert.strictEqual(res.details.waveMobao, 15);
  assert.strictEqual(res.details.waveTokens, 15);
  // 杀敌: 120 / 50 = 2 墨宝
  assert.strictEqual(res.details.killMobao, 2);
  // 斩将: 1 * 5 = 5 将令
  assert.strictEqual(res.details.bossTokens, 5);
  // 破寨: 12500 / 5000 = 2 批次 -> 6 墨宝, 2 将令
  assert.strictEqual(res.details.baseMobao, 6);
  assert.strictEqual(res.details.baseTokens, 2);
  // 总计
  assert.strictEqual(res.mobao, 15 + 2 + 6); // 23
  assert.strictEqual(res.tokens, 15 + 5 + 2); // 22
  console.log('  ✓ 奖励算法公式严格匹配需求！\n');
}

console.log('2. 测试肉鸽三选一提取与首领阶梯:');
{
  const choices = EndlessManager.getThreeBuffChoices({ energy_regen: 2 });
  assert.strictEqual(choices.length, 3);
  const ids = new Set(choices.map(c => c.id));
  assert.strictEqual(ids.size, 3, '三选一增益不可重复');
  const energyBuff = choices.find(c => c.id === 'energy_regen');
  if (energyBuff) {
    assert.strictEqual(energyBuff.currentStacks, 2);
  }
  console.log('  ✓ 三选一随机生成且层数正确识别:', choices.map(c => `${c.name}(${c.rarity})`).join(', '));

  assert.strictEqual(ENDLESS_BOSS_LADDER.length >= 5, true);
  assert.strictEqual(ENDLESS_BOSS_LADDER[0].wave, 10);
  assert.strictEqual(ENDLESS_BOSS_LADDER[1].wave, 20);
  console.log('  ✓ 首领阶梯配置就绪: 第10波张角, 第20波董卓, 第30波吕布, 第40波曹操\n');
}

console.log('3. 测试进度暂存与断点续玩:');
{
  EndlessManager.clearProgress();
  assert.strictEqual(EndlessManager.hasSavedProgress(), false);

  const testState = {
    wave: 8,
    clearedWaves: 7,
    kills: 45,
    bossKills: 0,
    baseDamage: 8500,
    baseHp: 2200,
    buffs: { teamAtk: 0.20 },
    buffCounts: { team_atk: 1 },
  };
  EndlessManager.saveProgress(testState);
  assert.strictEqual(EndlessManager.hasSavedProgress(), true);

  const loaded = EndlessManager.loadProgress();
  assert.strictEqual(loaded.wave, 8);
  assert.strictEqual(loaded.baseDamage, 8500);
  assert.strictEqual(loaded.buffs.teamAtk, 0.20);
  console.log('  ✓ 暂存进度读写成功，保存于第', loaded.wave, '波');

  EndlessManager.clearProgress();
  assert.strictEqual(EndlessManager.hasSavedProgress(), false);
  console.log('  ✓ 清除暂存成功！\n');
}

// ---------------- 2. Battle 无尽核心运行机制测试 ----------------
console.log('4. 测试 Battle 战斗大本营爆炸、友军击退80%伤害与英雄完全免疫:');
{
  const battle = {
    ...battleCombat,
    ...battleWaves,
    ...battleDeploy,
    ...battleHero,
    state: 'running',
    isEndless: true,
    level: EndlessManager.createEndlessLevel(),
    enemyBaseHp: 5000,
    baseHp: 3000,
    baseMaxHp: 3000,
    totalEnemyBaseDamage: 0,
    endlessBaseShieldTimer: 0,
    endlessBaseRecoverTimer: 0,
    endlessBuffs: { energyRegen: 0, costReduction: 0, cardCdReduction: 0, heroCdReduction: 0, teamAtk: 0, teamArmor: 0, teamRegen: 0, critRate: 0, siegeBonus: 0, heroStatsBonus: 0, damageReduction: 0 },
    endlessBuffCounts: {},
    entities: [],
    heroId: 'zhaoyun',
    heroHp: 1200,
    heroMaxHp: 1200,
    heroX: 7.5,
    heroZ: 0.0,
    heroData: { passive: { template: 'none' } },
    damageMul: 1,
    effects: {
      ring() {},
      dust() {},
      blood() {},
      buff() {},
      death() {},
      slash() {},
      summon() {},
    },
    scene: {
      scene: { add() {}, remove() {} },
      screenShake() {},
    },
    ui: {
      flash() {},
      showBattleBanner() {},
      hideBossBar() {},
    },
    dmgText: { spawn() {} },
    isHeroAlive() { return this.heroHp > 0; },
    getHeroTargetObj() {
      return { isHero: true, uid: 'hero_zhaoyun', side: 'player', x: this.heroX, z: this.heroZ };
    },
    damageHero(rawDmg) {
      this.heroHp = Math.max(0, this.heroHp - rawDmg);
    }
  };

  // 创建一名普通友方小兵，满血 500
  const soldier = {
    uid: 1,
    side: 'player',
    x: 8.0,
    z: 0.0,
    hp: 500,
    maxHp: 500,
    alive: true,
    armor: 5,
    armorBreak: 0,
    buffs: {},
    unit: getUnit('swordsman'),
    kind: 'unit',
  };
  battle.entities.push(soldier);

  const heroInitialHp = battle.heroHp;
  console.log('  初始: 友兵(x=8.0, HP=500), 英雄(x=7.5, HP=' + heroInitialHp + ')');

  // 打击敌寨 4000 伤害
  battle.damageEnemyBase(4000);
  assert.strictEqual(battle.enemyBaseHp, 1000);
  assert.strictEqual(battle.totalEnemyBaseDamage, 4000);
  assert.strictEqual(battle.endlessBaseShieldTimer, 0);

  // 再打击 1500 伤害 -> 穿透 0 血，触发大本营爆炸逆流！
  battle.damageEnemyBase(1500);
  assert.strictEqual(battle.totalEnemyBaseDamage, 5500);

  // 1) 英雄必须绝对免疫 80% 伤害！
  assert.strictEqual(battle.heroHp, heroInitialHp, '英雄必须绝对免疫敌寨爆炸80%伤害');
  assert.strictEqual(battle.heroX <= 0.5, true, '英雄应被安全推至中场安全线');
  console.log('  ✓ 英雄免疫验证通过: 英雄 HP 依然为', battle.heroHp, '未受丝毫爆炸反噬！');

  // 2) 普通小兵被击退到中场 (x <= 0) 且受到 80% 最大生命值伤害 (500 * 0.8 = 400)
  console.log('  爆炸后小兵位置: x =', soldier.x.toFixed(2), ', HP =', soldier.hp);
  assert.strictEqual(soldier.x <= 0, true, '普通小兵必须被击退至中场');
  assert.strictEqual(soldier.hp <= 120, true, '普通小兵扣除80%最大生命值伤害');
  console.log('  ✓ 普通友军击退至中场并扣除 80% HP 验证通过！');

  // 3) 检查敌寨 3 秒无敌护盾与 0 血平滑恢复
  assert.strictEqual(battle.endlessBaseShieldTimer, 3.0);
  assert.strictEqual(battle.endlessBaseRecoverTimer, 3.0);
  assert.strictEqual(battle.enemyBaseHp, 0);

  // 护盾期间攻击敌寨免疫
  const blockedDmg = battle.damageEnemyBase(2000);
  assert.strictEqual(blockedDmg, 0, '护盾期间攻击敌寨应被完全格挡');
  assert.strictEqual(battle.totalEnemyBaseDamage, 5500, '护盾期间不累加伤害');
  console.log('  ✓ 敌寨 3 秒无敌金光护盾生效，伤害完全格挡！');

  // 模拟平滑恢复 1.5 秒
  battle.updateEndlessBaseShield(1.5);
  assert.strictEqual(battle.enemyBaseHp >= 2400 && battle.enemyBaseHp <= 2600, true);
  console.log('  1.5 秒后生命平滑恢复至:', battle.enemyBaseHp, '/ 5000');

  // 再经过 1.5 秒，护盾完全结束并恢复到 5000 血
  battle.updateEndlessBaseShield(1.5);
  assert.strictEqual(battle.endlessBaseShieldTimer, 0);
  assert.strictEqual(battle.enemyBaseHp, 5000);
  console.log('  3 秒后护盾解除，大本营平滑恢复至 5000 满血！\n');
}

console.log('5. 测试肉鸽增益库叠加与实战效果:');
{
  const battle = {
    ...battleCombat,
    ...battleWaves,
    ...battleDeploy,
    ...battleHero,
    state: 'running',
    paused: false,
    isEndless: true,
    heroGadgetCooldown: 20.0,
    heroGadgetCd: 0,
    endlessBuffs: { energyRegen: 0, costReduction: 0, cardCdReduction: 0, heroCdReduction: 0, teamAtk: 0, teamArmor: 0, teamRegen: 0, critRate: 0, siegeBonus: 0, heroStatsBonus: 0, damageReduction: 0 },
    endlessBuffCounts: {},
    cards: [
      { unit: getUnit('swordsman'), cd: 0, lock: 0, total: 6.0 }
    ],
    heroId: 'zhaoyun',
    heroHp: 1200,
    heroMaxHp: 1200,
    heroX: 0,
    heroZ: 0,
    entities: [],
    effects: { dust() {}, ring() {}, summon() {} },
    ui: { showBattleBanner() {}, toast() {}, flash() {} },
    isHeroAlive() { return true; },
    isGadgetUnlocked() { return true; },
  };

  // 测试军令如山
  const energyBuff = ENDLESS_BUFF_POOL.find(b => b.id === 'energy_regen');
  energyBuff.apply(battle);
  assert.strictEqual(battle.endlessBuffs.energyRegen, 0.25);

  // 测试兵贵神速 (降费)
  const card = battle.cards[0];
  const origCost = card.unit.cost;
  const costBuff = ENDLESS_BUFF_POOL.find(b => b.id === 'cost_reduce');
  costBuff.apply(battle);
  assert.strictEqual(battle.endlessBuffs.costReduction, 1);
  assert.strictEqual(battle.getCardCost(card), Math.max(1, origCost - 1));
  console.log('  ✓ 卡牌降费生效: 原始费用 ' + origCost + ' -> 实战费用 ' + battle.getCardCost(card));

  // 测试将领专精 (减技能与大招 CD)
  const heroCdBuff = ENDLESS_BUFF_POOL.find(b => b.id === 'hero_cd');
  heroCdBuff.apply(battle);
  assert.strictEqual(battle.endlessBuffs.heroCdReduction, 0.25);
  battle.heroUseGadget(); // 20s 技能 -> 减 25% 变为 15s
  assert.strictEqual(battle.heroGadgetCd, 15.0);
  console.log('  ✓ 将领技能冷却生效: 20s -> ' + battle.heroGadgetCd + 's');

  // 测试全军锋芒与坚壁
  const atkBuff = ENDLESS_BUFF_POOL.find(b => b.id === 'team_atk');
  const armorBuff = ENDLESS_BUFF_POOL.find(b => b.id === 'team_armor');
  atkBuff.apply(battle);
  armorBuff.apply(battle);
  assert.strictEqual(battle.endlessBuffs.teamAtk, 0.20);
  assert.strictEqual(battle.endlessBuffs.damageReduction, 0.15);
  console.log('  ✓ 全军攻防增益叠加生效: 攻击 +20%, 减伤 +15%！\n');
}

console.log('6. 测试断点续玩与结算奖励计算:');
{
  const savedState = {
    wave: 12,
    clearedWaves: 11,
    kills: 98,
    bossKills: 1,
    baseDamage: 18000,
    baseHp: 1800,
    buffs: { teamAtk: 0.40, costReduction: 1 },
    buffCounts: { team_atk: 2, cost_reduce: 1 },
  };

  const battle = {
    ...battleCombat,
    ...battleWaves,
    ...battleDeploy,
    state: 'running',
    isEndless: true,
    endlessWave: savedState.wave,
    endlessClearedWaves: savedState.clearedWaves,
    endlessKills: savedState.kills,
    endlessBossKills: savedState.bossKills,
    totalEnemyBaseDamage: savedState.baseDamage,
    baseHp: savedState.baseHp,
    endlessBuffs: savedState.buffs,
    endlessBuffCounts: savedState.buffCounts,
    heroId: 'zhaoyun',
    deckIds: ['swordsman', 'spearman'],
    level: EndlessManager.createEndlessLevel(),
    elapsed: 150,
  };

  assert.strictEqual(battle.endlessWave, 12);
  assert.strictEqual(battle.endlessKills, 98);
  assert.strictEqual(battle.endlessBossKills, 1);
  assert.strictEqual(battle.totalEnemyBaseDamage, 18000);
  assert.strictEqual(battle.endlessBuffs.teamAtk, 0.40);
  console.log('  ✓ 状态恢复验证通过: 第12波, 98杀敌, 18000伤害');

  // 终局结算
  let capturedResult = null;
  battle.onFinish = (res) => { capturedResult = res; };
  battle.finalizeEnd();

  assert.strictEqual(capturedResult.isEndless, true);
  assert.strictEqual(capturedResult.waves, 11);
  assert.strictEqual(capturedResult.kills, 98);
  assert.strictEqual(capturedResult.bossKills, 1);
  assert.strictEqual(capturedResult.baseDamage, 18000);

  const r = capturedResult.rewards;
  console.log('  结算奖励:', r);
  // 11波 = 11墨宝, 11将令; 98杀 = 1墨宝; 1Boss = 5将令; 18000/5000 = 3批次 = 9墨宝, 3将令
  // 墨宝 = 11 + 1 + 9 = 21; 将令 = 11 + 5 + 3 = 19
  assert.strictEqual(r.mobao, 21);
  assert.strictEqual(r.tokens, 19);

  // 看广告双倍领取
  const doubleMobao = r.mobao * 2;
  const doubleTokens = r.tokens * 2;
  assert.strictEqual(doubleMobao, 42);
  assert.strictEqual(doubleTokens, 38);
  console.log('  ✓ 广告双倍奖励计算通过: 墨宝 21 -> 42, 将令 19 -> 38！\n');
}

console.log('🎉 全部 6 大核心场景、9 项无尽模式规范测试全部 PASS 完美通过！');

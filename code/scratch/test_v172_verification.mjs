import { BountyManager } from '../src/data/bounty-manager.js';
import { EndlessManager } from '../src/data/endless-manager.js';
import { TUTORIALS, TutorialController } from '../src/tutorial.js';
import { FIRST_GUIDE_STEPS, FirstGuide } from '../src/first-guide.js';

console.log('=== V1.72 全量系统与教程重构自动化回归测试 ===\n');

// ---------------- 1. 悬赏系统校验 ----------------
console.log('1. 验证悬赏系统 (难度*2, 奖励*0.5, 2次免费刷新, 广告+3刷新, 双倍领赏)');
const mockSave = {
  tokens: 0,
  mobao: 0,
  camp: { supplies: 0 },
};

// 确保存档初始化
BountyManager.ensureState(mockSave);

// 模拟达成第1个每日任务
mockSave.bounties.daily[0].current = mockSave.bounties.daily[0].target;
const targetBountyId = mockSave.bounties.daily[0].id;
const refreshTargetId = mockSave.bounties.daily[1].id;

const summary = BountyManager.getSummary(mockSave);
console.log('  待领取悬赏数:', summary.unclaimedCount);
console.log('  可用每日刷新次数:', summary.dailyRefreshCount);

if (summary.unclaimedCount !== 1) {
  throw new Error(`待领取数量异常: 预期 1，实际 ${summary.unclaimedCount}`);
}
if (summary.dailyRefreshCount !== 2) {
  throw new Error(`刷新次数异常: 预期 2，实际 ${summary.dailyRefreshCount}`);
}

// 刷新任务测试
console.log('  测试换一换任务...');
const refRes = BountyManager.refreshDaily(mockSave, refreshTargetId);
console.log('  换一换结果:', refRes.success, '新任务:', refRes.newBounty?.name, '剩余刷新:', mockSave.bounties.dailyRefreshCount);
if (!refRes.success || mockSave.bounties.dailyRefreshCount !== 1) {
  throw new Error('换一换任务扣除或替换失败');
}

// 广告增加 3 次刷新测试
console.log('  测试观摩广告 +3 次刷新...');
const adRefRes = BountyManager.addAdRefreshes(mockSave);
const countAfter = adRefRes.count ?? mockSave.bounties.dailyRefreshCount;
console.log('  加次数后剩余刷新:', countAfter);
if (countAfter !== 4) {
  throw new Error(`广告加次数失败: 预期 4，实际 ${countAfter}`);
}

// 双倍领赏测试
console.log('  测试看广告双倍领赏...');
const originalRewards = { ...mockSave.bounties.daily[0].rewards };
const claimRes = BountyManager.claim(mockSave, targetBountyId, true);
console.log('  双倍领赏结果:', claimRes.success, '原始奖励:', originalRewards, '实际发放物资:', claimRes.rewards);
if (claimRes.rewards.mobao !== (originalRewards.mobao || 0) * 2 ||
    claimRes.rewards.tokens !== (originalRewards.tokens || 0) * 2 ||
    claimRes.rewards.supplies !== (originalRewards.supplies || 0) * 2) {
  throw new Error(`双倍领赏数值翻倍异常: ${JSON.stringify(claimRes.rewards)}`);
}
if (mockSave.mobao !== claimRes.rewards.mobao || mockSave.tokens !== claimRes.rewards.tokens || mockSave.camp.supplies !== claimRes.rewards.supplies) {
  throw new Error(`存档入库数值异常: mobao=${mockSave.mobao}, tokens=${mockSave.tokens}`);
}
console.log('  ✓ 悬赏系统校验 100% 通过！\n');

// ---------------- 2. 无尽模式第20关门禁与门票系统 ----------------
console.log('2. 验证无尽模式第20关门禁与门票机制');
const lowLvlSave = { progress: { unlockedLevel: 15, stars: {} } };
const highLvlSave = { progress: { unlockedLevel: 21, stars: { 20: 3 } } };

console.log('  第15关玩家是否解锁无尽模式:', EndlessManager.isUnlocked(lowLvlSave));
console.log('  第21关玩家是否解锁无尽模式:', EndlessManager.isUnlocked(highLvlSave));

if (EndlessManager.isUnlocked(lowLvlSave) !== false) {
  throw new Error('未通关第20关的玩家不得解锁无尽模式！');
}
if (EndlessManager.isUnlocked(highLvlSave) !== true) {
  throw new Error('已通关第20关的玩家必须解锁无尽模式！');
}

// 门票机制验证
console.log('  测试每日2张门票与消耗...');
const tInit = EndlessManager.getRemainingTickets(highLvlSave);
console.log('  初始门票数:', tInit);
if (tInit !== 2) throw new Error(`初始门票应为2张，实际: ${tInit}`);

const c1 = EndlessManager.consumeTicket(highLvlSave);
console.log('  消耗第1张门票:', c1.success, '剩余:', c1.remaining);
const c2 = EndlessManager.consumeTicket(highLvlSave);
console.log('  消耗第2张门票:', c2.success, '剩余:', c2.remaining);
const c3 = EndlessManager.consumeTicket(highLvlSave);
console.log('  无门票时消耗:', c3.success, '剩余:', c3.remaining);
if (c3.success !== false) throw new Error('门票耗尽时不应允许消耗！');

console.log('  测试观摩广告补充门票（不限次数，看一次得一次）...');
const adT1 = EndlessManager.addAdTicket(highLvlSave);
console.log('  看广告+1张门票后剩余:', adT1.remaining);
if (adT1.remaining !== 1) throw new Error('广告加门票失败！');
console.log('  ✓ 无尽模式第20关门禁与门票系统 100% 通过！\n');

// ---------------- 3. 局内教程（Level 1-4）与赵云荒野大招充能 ----------------
console.log('3. 验证局内教程 (赵云大招充能 100%、防误触屏障、落兵区域校验)');
const mockBattle = {
  energy: 0,
  heroSuperCharge: 0,
  skillCd: 50,
  heroSkillCd: 50,
  tutorialPause: false,
  cards: [
    { unit: { id: 'swordsman' }, cd: 10, lock: 0 },
    { unit: { id: 'archer' }, cd: 10, lock: 0 },
  ],
  scene: { showDeploy() {} },
};
const mockUI = {
  lastGuide: null,
  toastMsg: null,
  showGuide(opt) { this.lastGuide = opt; },
  hideGuide() { this.lastGuide = null; },
  toast(msg) { this.toastMsg = msg; },
  updateBattleHUD(battle) {
    // 模拟 HUD 更新
    this.hudCharged = (battle.heroSuperCharge >= 100 && battle.skillCd <= 0);
  }
};

const ctrl = new TutorialController(mockBattle, mockUI);
ctrl.start('l1');

// Step 1: 推进启动与 delayTimer
ctrl.update(0.5); // 触发 showStep
ctrl.update(0.6); // 消耗 delayBefore 并执行 executeShowStep

console.log('  Step 1 卡牌指引:', ctrl.current.title, '要求卡牌:', ctrl.current.unit);
console.log('    是否全局暂停:', mockBattle.tutorialPause);
console.log('    刀盾兵是否冷却完毕:', mockBattle.cards[0].cd === 0);
console.log('    军令是否补足:', mockBattle.energy >= 3);
console.log('    选弓兵是否被拦截:', ctrl.isCardRestricted('archer'));
console.log('    选刀盾兵是否放行:', !ctrl.isCardRestricted('swordsman'));

if (!mockBattle.tutorialPause) throw new Error('教程放置前必须全局暂停！');
if (!ctrl.isCardRestricted('archer') || ctrl.isCardRestricted('swordsman')) {
  throw new Error('防乱点拦截失败：必须严格限制只能选刀盾兵！');
}

// 模拟选中刀盾兵
ctrl.handle('cardSelected', { id: 'swordsman' });
ctrl.update(0.4); // 推进至 Step 2

// Step 2: 刀盾兵落位
console.log('  Step 2 阵位指引:', ctrl.current.title, '目标类型:', ctrl.current.targetKind);
console.log('    在敌阵落兵(x=5)是否被拦截:', ctrl.isZoneRestricted('swordsman', 5, 0));
console.log('    在前沿落兵(x=-2)是否放行:', !ctrl.isZoneRestricted('swordsman', -2, 0));

if (!ctrl.isZoneRestricted('swordsman', 5, 0) || ctrl.isZoneRestricted('swordsman', -2, 0)) {
  throw new Error('落兵区域校验异常！');
}

// 模拟部署成功
ctrl.handle('deployed', { id: 'swordsman' });
ctrl.update(0.4); // 触发下一阶段
ctrl.update(3.6); // 消耗 delayBefore: 3.5

// Step 3: 弓兵选卡
console.log('  Step 3 弓兵指引:', ctrl.current.title, '要求卡牌:', ctrl.current.unit);
ctrl.handle('cardSelected', { id: 'archer' });
ctrl.update(0.4);

// Step 4: 弓兵落位
console.log('  Step 4 弓兵后排落位:', ctrl.current.title);
console.log('    在最前线(x=-1)是否被拦截:', ctrl.isZoneRestricted('archer', -1, 0));
console.log('    在后排安全区(x=-6)是否放行:', !ctrl.isZoneRestricted('archer', -6, 0));
ctrl.handle('deployed', { id: 'archer' });
ctrl.update(0.4);
ctrl.update(5.0); // 消耗 delayBefore: 4.8

// Step 5: 赵云大招绝技触发（核心修复点！）
console.log('  Step 5 赵云大招绝技:');
console.log('    标题:', ctrl.current.title);
console.log('    目标按钮:', ctrl.current.target);
console.log('    赵云荒野乱斗充能值:', mockBattle.heroSuperCharge);
console.log('    大招冷却 Cd:', mockBattle.skillCd);
console.log('    HUD 大招按钮是否金色流光就绪:', mockUI.hudCharged);

if (ctrl.current.target !== '#skill-btn') {
  throw new Error(`大招指引目标应为 #skill-btn，实际: ${ctrl.current.target}`);
}
if (mockBattle.heroSuperCharge !== 100 || mockBattle.skillCd !== 0) {
  throw new Error('CRITICAL BUG: 赵云大招必须由教程直接充能至 100% 且冷却为 0！');
}
if (!mockUI.hudCharged) {
  throw new Error('HUD 大招按钮未处于就绪状态！');
}

// 模拟释放大招
ctrl.handle('skillUsed', { hero: 'zhaoyun' });
console.log('  大招释放完成，成功推进！');
console.log('  ✓ 局内教程与赵云荒野大招充能 100% 通过！\n');

// ---------------- 4. 全局新手指引与第20关通关盛大解锁 ----------------
console.log('4. 验证局外全局引导 (FirstGuide & Level 20 Endless Guidance)');
console.log('  总引导步骤数:', FIRST_GUIDE_STEPS.length);
FIRST_GUIDE_STEPS.forEach((s, i) => {
  console.log(`    [${i+1}/${FIRST_GUIDE_STEPS.length}] ${s.title} -> ${s.target}`);
});

let unlockModalOpened = false;
const fgMockApp = {
  save: highLvlSave,
  ui: {
    openEndlessUnlockModal() { unlockModalOpened = true; }
  }
};
const fg = new FirstGuide(fgMockApp);
fg.triggerEndlessUnlockGuide();
console.log('  通关第20关盛大解锁弹窗触发:', unlockModalOpened);
if (!unlockModalOpened) throw new Error('第20关盛大解锁无尽模式弹窗未被正确打开！');

console.log('  ✓ 局外全局引导 100% 通过！\n');

console.log('=============================================');
console.log('🎉🎉🎉 V1.72 全部功能与测试点 100% 验证通过！');
console.log('=============================================');

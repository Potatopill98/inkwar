import assert from 'node:assert';
import {
  BountyManager,
  DAILY_BOUNTY_TEMPLATES,
  WEEKLY_BOUNTY_TEMPLATES,
  getTodayKey,
  getWeekKey,
  getDailyResetCountdown,
  getWeeklyResetCountdown,
} from '../src/data/bounty-manager.js';

console.log('=== 开始测试山河悬赏系统（每日任务 & 每周任务） ===\n');

// 1. 测试日期与倒计时格式
console.log('1. 测试日期与倒计时:');
const todayKey = getTodayKey();
const weekKey = getWeekKey();
console.log('  今日标记:', todayKey);
console.log('  本周标记:', weekKey);
assert.match(todayKey, /^\d{4}-\d{2}-\d{2}$/);
assert.match(weekKey, /^\d{4}-W\d{2}$/);

const dailyTimer = getDailyResetCountdown();
const weeklyTimer = getWeeklyResetCountdown();
console.log('  日赏倒计时:', dailyTimer.text, `(${dailyTimer.diffSec}s)`);
console.log('  周赏倒计时:', weeklyTimer.text, `(${weeklyTimer.diffSec}s)`);
assert(dailyTimer.diffSec >= 0);
assert(weeklyTimer.diffSec >= 0);
assert.match(dailyTimer.text, /^\d{2}:\d{2}:\d{2}$/);
console.log('  ✓ 日期与重置倒计时算法验证通过！\n');

// 2. 测试存档初始化与任务抽取
console.log('2. 测试悬赏初始化:');
const mockSave = {
  tokens: 10,
  mobao: 5,
  camp: { supplies: 20 },
  fragments: 0,
  bounties: null,
};

const bState = BountyManager.ensureState(mockSave);
assert(bState !== null);
assert.strictEqual(bState.daily.length, 3, '日赏应抽取 3 个');
assert.strictEqual(bState.weekly.length, 4, '周赏应抽取 4 个');
console.log('  已抽取日赏: ', bState.daily.map(d => `${d.name}(${d.type}: ${d.target})`).join(', '));
console.log('  已抽取周赏: ', bState.weekly.map(w => `${w.name}(${w.type}: ${w.target})`).join(', '));
console.log('  ✓ 悬赏库随机抽取与初始化验证通过！\n');

// 3. 测试事件驱动进度推进
console.log('3. 测试事件驱动任务进度更新:');
// 查找击杀类任务
const killBounties = [...bState.daily, ...bState.weekly].filter(x => x.type === 'kills');
assert(killBounties.length > 0, '应存在击杀类悬赏');

const targetKillBounty = killBounties[0];
const origCurrent = targetKillBounty.current;
console.log(`  推进前【${targetKillBounty.name}】进度: ${origCurrent} / ${targetKillBounty.target}`);

const res = BountyManager.onEvent(mockSave, 'kills', 15);
assert.strictEqual(res.updated, true);
assert.strictEqual(targetKillBounty.current, origCurrent + 15);
console.log(`  斩获 15 杀后进度: ${targetKillBounty.current} / ${targetKillBounty.target}`);
console.log('  ✓ 击杀事件正确累计到相关日赏/周赏！\n');

// 4. 测试任务达成判定与单项领取
console.log('4. 测试悬赏达成与单项领取:');
// 强制将日赏第一个任务进度推进至达标
const testDaily = bState.daily[0];
BountyManager.onEvent(mockSave, testDaily.type, testDaily.target + 10);
assert(testDaily.current >= testDaily.target);
assert.strictEqual(testDaily.claimed, false);

const preMobao = mockSave.mobao;
const preTokens = mockSave.tokens;
const preSupplies = mockSave.camp.supplies;

const claimRes = BountyManager.claim(mockSave, testDaily.id);
assert.strictEqual(claimRes.success, true);
assert.strictEqual(testDaily.claimed, true);

assert.strictEqual(mockSave.mobao, preMobao + testDaily.rewards.mobao);
assert.strictEqual(mockSave.tokens, preTokens + testDaily.rewards.tokens);
assert.strictEqual(mockSave.camp.supplies, preSupplies + testDaily.rewards.supplies);
console.log(`  领取【${testDaily.name}】成功:`);
console.log(`  获得墨宝 +${testDaily.rewards.mobao} (总计: ${mockSave.mobao})`);
console.log(`  获得将令 +${testDaily.rewards.tokens} (总计: ${mockSave.tokens})`);
console.log(`  获得军需 +${testDaily.rewards.supplies} (总计: ${mockSave.camp.supplies})`);

// 重复领取应当失败
const reClaimRes = BountyManager.claim(mockSave, testDaily.id);
assert.strictEqual(reClaimRes.success, false);
console.log('  ✓ 重复领取安全拦截生效！\n');

// 5. 测试一键领赏功能 (Brawl Stars 招牌)
console.log('5. 测试一键领赏 (claimAll):');
// 将剩余所有任务（日赏+周赏）强制拉满进度
for (const d of bState.daily) {
  d.current = d.target;
}
for (const w of bState.weekly) {
  w.current = w.target;
}

const summaryBefore = BountyManager.getSummary(mockSave);
console.log('  一键领赏前待领数量:', summaryBefore.unclaimedCount);
assert(summaryBefore.unclaimedCount > 0);

const allRes = BountyManager.claimAll(mockSave);
assert.strictEqual(allRes.success, true);
console.log(`  成功一键领取 ${allRes.count} 项悬赏！`);
console.log('  合并发放奖励明细:', allRes.rewards);

const summaryAfter = BountyManager.getSummary(mockSave);
assert.strictEqual(summaryAfter.unclaimedCount, 0, '一键领赏后待领数量应为 0');
console.log('  一键领赏后待领数量:', summaryAfter.unclaimedCount);
console.log('  ✓ 一键领赏与批量合并发放完全正常！\n');

// 6. 测试各维度核心事件流全面驱动 (大招、技能、部署、军令、无尽波次、攻寨伤害)
console.log('6. 测试战斗全流程事件响应:');
const freshSave = { bounties: null };
BountyManager.ensureState(freshSave);

const eventTypes = [
  { event: 'hero_super', val: 2 },
  { event: 'hero_gadget', val: 3 },
  { event: 'deploy', val: 12 },
  { event: 'energy', val: 35 },
  { event: 'base_damage', val: 4500 },
  { event: 'endless_wave', val: 8 },
  { event: 'wins', val: 1 },
  { event: 'stars', val: 3 },
  { event: 'battles', val: 1 },
];

for (const { event, val } of eventTypes) {
  const r = BountyManager.onEvent(freshSave, event, val);
  console.log(`  事件上报 [${event} +${val}]: updated=${r.updated}`);
}
console.log('  ✓ 战斗全事件驱动验证通过！\n');

console.log('🎉 山河悬赏系统（每日任务 & 每周任务）全部核心测试通过！');

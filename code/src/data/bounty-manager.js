// 墨阵山河 - 悬赏系统 (每日悬赏·日赏 & 每周悬赏·周赏)
// 参考《荒野乱斗》任务系统体系：每日24h刷新、每周一重置、可视化进度条、可叠加领取与一键领赏
// v1.72: 难度强化(每日*2/每周*3)、奖励精细平衡(*0.5)、支持看广告双倍领赏、每日免费刷新2次+看广告+3次

// 获取本地当天标记 YYYY-MM-DD
export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取本地本周标记 YYYY-Wxx (以周一为每周起始日)
export function getWeekKey() {
  const d = new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // 周一为 0，周日为 6
  target.setDate(target.getDate() - dayNr + 3); // 移至本周周四
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNr = 1 + Math.ceil((firstThursday - target) / (7 * 24 * 3600 * 1000));
  return `${d.getFullYear()}-W${String(weekNr).padStart(2, '0')}`;
}

// 每日重置倒计时（至次日 00:00:00）
export function getDailyResetCountdown() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffSec = Math.max(0, Math.floor((midnight - now) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return {
    diffSec,
    text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

// 每周重置倒计时（至下周一 00:00:00）
export function getWeeklyResetCountdown() {
  const now = new Date();
  const target = new Date(now);
  const dayNr = (now.getDay() + 6) % 7; // 0=周一, 6=周日
  const daysUntilNextMon = 7 - dayNr;
  target.setDate(target.getDate() + daysUntilNextMon);
  target.setHours(0, 0, 0, 0);
  const diffSec = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(diffSec / 86400);
  const h = Math.floor((diffSec % 86400) / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  return {
    diffSec,
    text: `${days}天 ${String(h).padStart(2, '0')}时${String(m).padStart(2, '0')}分`,
  };
}

// ---------------- 每日悬赏模版库 (难度*2，奖励*0.5) ----------------
export const DAILY_BOUNTY_TEMPLATES = [
  {
    id: 'daily_kills_60',
    type: 'kills',
    name: '扫荡群寇',
    desc: '在任意战斗中累计击杀 60 名敌军',
    icon: '⚔️',
    target: 60,
    rewards: { mobao: 25, tokens: 5, supplies: 10 },
  },
  {
    id: 'daily_battles_4',
    type: 'battles',
    name: '出师立威',
    desc: '完成任意 4 场战斗对局（胜负皆可）',
    icon: '🚩',
    target: 4,
    rewards: { mobao: 20, tokens: 5, supplies: 12 },
  },
  {
    id: 'daily_victory_2',
    type: 'wins',
    name: '连战皆捷',
    desc: '在关卡或试炼中取得 2 场胜利',
    icon: '🏆',
    target: 2,
    rewards: { mobao: 25, tokens: 8, supplies: 10 },
  },
  {
    id: 'daily_deploy_40',
    type: 'deploy',
    name: '调兵遣将',
    desc: '在战斗中累计部署 40 次士兵或战器',
    icon: '🛡️',
    target: 40,
    rewards: { mobao: 22, tokens: 5, supplies: 10 },
  },
  {
    id: 'daily_skills_4',
    type: 'hero_gadget',
    name: '身经百战',
    desc: '在战斗中施展 4 次名将专属技能',
    icon: '⚡',
    target: 4,
    rewards: { mobao: 20, tokens: 5, supplies: 8 },
  },
  {
    id: 'daily_super_2',
    type: 'hero_super',
    name: '龙骧虎步',
    desc: '在战斗中释放 2 次名将主动大招',
    icon: '🔥',
    target: 2,
    rewards: { mobao: 25, tokens: 8, supplies: 10 },
  },
  {
    id: 'daily_energy_80',
    type: 'energy',
    name: '粮草先行',
    desc: '在战斗中累计消耗 80 点军令',
    icon: '🌾',
    target: 80,
    rewards: { mobao: 20, tokens: 5, supplies: 10 },
  },
  {
    id: 'daily_endless_6',
    type: 'endless_wave',
    name: '试炼破阵',
    desc: '在「墨影试炼」无尽模式坚守突破至第 6 波',
    icon: '🌀',
    target: 6,
    rewards: { mobao: 30, tokens: 8, supplies: 12 },
  },
  {
    id: 'daily_base_dmg_6000',
    type: 'base_damage',
    name: '攻寨摧城',
    desc: '在战斗中对敌寨累计造成 6000 点伤害',
    icon: '💥',
    target: 6000,
    rewards: { mobao: 25, tokens: 6, supplies: 10 },
  },
];

// ---------------- 每周悬赏模版库 (难度*3，奖励*0.5) ----------------
export const WEEKLY_BOUNTY_TEMPLATES = [
  {
    id: 'weekly_kills_600',
    type: 'kills',
    name: '千军辟易',
    desc: '累计击杀 600 名敌军（横扫千军）',
    icon: '☠️',
    target: 600,
    rewards: { mobao: 130, tokens: 25, supplies: 50, fragments: 5 },
  },
  {
    id: 'weekly_wins_15',
    type: 'wins',
    name: '百战不殆',
    desc: '在关卡征战中累计斩获 15 场胜局',
    icon: '👑',
    target: 15,
    rewards: { mobao: 110, tokens: 20, supplies: 40, fragments: 4 },
  },
  {
    id: 'weekly_stars_24',
    type: 'stars',
    name: '威震山河',
    desc: '在关卡战役中累计斩获 24 颗战星',
    icon: '⭐',
    target: 24,
    rewards: { mobao: 120, tokens: 22, supplies: 45, fragments: 5 },
  },
  {
    id: 'weekly_endless_30',
    type: 'endless_wave',
    name: '孤胆镇渊',
    desc: '在「墨影试炼」无尽模式坚守突破至第 30 波',
    icon: '🐉',
    target: 30,
    rewards: { mobao: 160, tokens: 30, supplies: 60, fragments: 8 },
  },
  {
    id: 'weekly_base_dmg_60000',
    type: 'base_damage',
    name: '摧枯拉朽',
    desc: '对敌方大寨或试炼敌寨累计造成 60000 伤害',
    icon: '🏰',
    target: 60000,
    rewards: { mobao: 125, tokens: 25, supplies: 50, fragments: 5 },
  },
  {
    id: 'weekly_super_24',
    type: 'hero_super',
    name: '战神降世',
    desc: '累计释放 24 次名将主动大招',
    icon: '⚡',
    target: 24,
    rewards: { mobao: 100, tokens: 20, supplies: 40, fragments: 4 },
  },
  {
    id: 'weekly_deploy_240',
    type: 'deploy',
    name: '百万雄师',
    desc: '在战场中累计部署 240 次任意卡牌',
    icon: '🚩',
    target: 240,
    rewards: { mobao: 110, tokens: 22, supplies: 45, fragments: 4 },
  },
  {
    id: 'weekly_energy_480',
    type: 'energy',
    name: '统帅三军',
    desc: '在各战役中累计调度消耗 480 军令',
    icon: '📜',
    target: 480,
    rewards: { mobao: 100, tokens: 20, supplies: 40, fragments: 4 },
  },
];

// 伪随机洗牌选取 N 个不重复任务
function pickRandomTemplates(templates, count, seedStr = '', excludeIds = new Set()) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const pool = templates.filter(t => !excludeIds.has(t.id));
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280.0;
    const j = Math.floor(rnd * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export class BountyManager {
  // 确保存档中的悬赏状态完整有效（支持跨天、跨周平滑重置，每日2次免费刷新）
  static ensureState(save) {
    if (!save) return null;
    const today = getTodayKey();
    const week = getWeekKey();

    let b = save.bounties;
    if (!b || typeof b !== 'object') {
      b = {
        dailyDate: '',
        weeklyWeek: '',
        daily: [],
        weekly: [],
        dailyRefreshCount: 2,
        dailyAdRefreshCount: 0,
        refreshDate: today,
      };
      save.bounties = b;
    }

    // 每日刷新次数重置
    if (b.refreshDate !== today) {
      b.dailyRefreshCount = 2;
      b.dailyAdRefreshCount = 0;
      b.refreshDate = today;
    } else {
      if (b.dailyRefreshCount === undefined) b.dailyRefreshCount = 2;
      if (b.dailyAdRefreshCount === undefined) b.dailyAdRefreshCount = 0;
    }

    // 每日悬赏重置检测
    if (b.dailyDate !== today || !Array.isArray(b.daily) || b.daily.length === 0) {
      const selected = pickRandomTemplates(DAILY_BOUNTY_TEMPLATES, 3, today);
      b.daily = selected.map(tpl => ({
        id: tpl.id,
        category: 'daily',
        name: tpl.name,
        desc: tpl.desc,
        icon: tpl.icon,
        type: tpl.type,
        current: 0,
        target: tpl.target,
        rewards: { ...tpl.rewards },
        claimed: false,
      }));
      b.dailyDate = today;
    }

    // 每周悬赏重置检测
    if (b.weeklyWeek !== week || !Array.isArray(b.weekly) || b.weekly.length === 0) {
      const selected = pickRandomTemplates(WEEKLY_BOUNTY_TEMPLATES, 4, week);
      b.weekly = selected.map(tpl => ({
        id: tpl.id,
        category: 'weekly',
        name: tpl.name,
        desc: tpl.desc,
        icon: tpl.icon,
        type: tpl.type,
        current: 0,
        target: tpl.target,
        rewards: { ...tpl.rewards },
        claimed: false,
      }));
      b.weeklyWeek = week;
    }

    return b;
  }

  // 获取剩余刷新次数
  static getRefreshCount(save) {
    const b = this.ensureState(save);
    return b ? (b.dailyRefreshCount ?? 2) : 0;
  }

  // 内部：替换单个每日任务（不扣次数）
  static _replaceDaily(b, bountyId) {
    const idx = (b.daily || []).findIndex(x => x.id === bountyId);
    if (idx < 0) return { success: false, msg: '未找到该每日任务' };
    if (b.daily[idx].claimed) return { success: false, msg: '已领取的任务不可刷新' };

    const currentIds = new Set(b.daily.map(x => x.id));
    const available = DAILY_BOUNTY_TEMPLATES.filter(t => !currentIds.has(t.id));
    if (available.length === 0) return { success: false, msg: '暂无其他可选每日任务' };

    const newTpl = available[Math.floor(Math.random() * available.length)];
    b.daily[idx] = {
      id: newTpl.id,
      category: 'daily',
      name: newTpl.name,
      desc: newTpl.desc,
      icon: newTpl.icon,
      type: newTpl.type,
      current: 0,
      target: newTpl.target,
      rewards: { ...newTpl.rewards },
      claimed: false,
    };
    return { success: true, newBounty: b.daily[idx] };
  }

  // 刷新单个每日任务 (消耗1次免费刷新次数)
  static refreshDaily(save, bountyId) {
    const b = this.ensureState(save);
    if (!b) return { success: false, msg: '悬赏未初始化' };
    if ((b.dailyRefreshCount ?? 0) <= 0) {
      return { success: false, msg: '今日免费刷新次数已用完，可点任务上的 🎬 看广告刷新' };
    }

    const res = this._replaceDaily(b, bountyId);
    if (!res.success) return res;

    b.dailyRefreshCount = Math.max(0, (b.dailyRefreshCount ?? 2) - 1);
    return {
      success: true,
      newBounty: res.newBounty,
      remainingRefreshes: b.dailyRefreshCount,
    };
  }

  // 看广告刷新单个每日任务（每日最多 3 次，不消耗免费次数）
  static refreshDailyWithAd(save, bountyId) {
    const b = this.ensureState(save);
    if (!b) return { success: false, msg: '悬赏未初始化' };
    if ((b.dailyAdRefreshCount ?? 0) >= 3) {
      return { success: false, msg: '今日广告刷新已达 3 次，明日再来' };
    }

    const res = this._replaceDaily(b, bountyId);
    if (!res.success) return res;

    b.dailyAdRefreshCount = (b.dailyAdRefreshCount ?? 0) + 1;
    return {
      success: true,
      newBounty: res.newBounty,
      remainingAd: 3 - b.dailyAdRefreshCount,
    };
  }

  // 推动任务进度
  static onEvent(save, eventType, amount = 1) {
    const b = this.ensureState(save);
    if (!b || !amount) return { updated: false, newlyCompleted: [] };

    let updated = false;
    const newlyCompleted = [];

    const checkList = [...(b.daily || []), ...(b.weekly || [])];
    for (const item of checkList) {
      if (item.claimed) continue;
      if (item.type !== eventType) continue;

      const wasCompleted = item.current >= item.target;
      if (eventType === 'endless_wave') {
        item.current = Math.max(item.current, amount);
      } else {
        item.current = Math.min(item.target, item.current + amount);
      }

      if (item.current > 0) updated = true;

      const isNowCompleted = item.current >= item.target;
      if (!wasCompleted && isNowCompleted) {
        newlyCompleted.push(item);
      }
    }

    return { updated, newlyCompleted };
  }

  // 单项领赏 (支持 doubleReward = true 看广告双倍领取)
  static claim(save, bountyId, doubleReward = false) {
    const b = this.ensureState(save);
    if (!b) return { success: false, msg: '悬赏未初始化' };

    const checkList = [...(b.daily || []), ...(b.weekly || [])];
    const target = checkList.find(x => x.id === bountyId);
    if (!target) return { success: false, msg: '未找到该悬赏' };
    if (target.claimed) return { success: false, msg: '该悬赏已领赏' };
    if (target.current < target.target) return { success: false, msg: '悬赏目标尚未达成' };

    target.claimed = true;
    const mul = doubleReward ? 2 : 1;

    // 发放奖励
    const r = target.rewards || {};
    const mobao = (r.mobao || 0) * mul;
    const tokens = (r.tokens || 0) * mul;
    const supplies = (r.supplies || 0) * mul;
    const fragments = (r.fragments || 0) * mul;

    if (mobao > 0) save.mobao = (save.mobao || 0) + mobao;
    if (tokens > 0) save.tokens = (save.tokens || 0) + tokens;
    if (supplies > 0) {
      if (!save.camp) save.camp = {};
      save.camp.supplies = (save.camp.supplies || 0) + supplies;
    }
    if (fragments > 0) save.fragments = (save.fragments || 0) + fragments;

    return {
      success: true,
      bounty: target,
      isDouble: doubleReward,
      rewards: { mobao, tokens, supplies, fragments },
    };
  }

  // 一键领赏（批量领取全部已达成的悬赏，支持 doubleReward = true）
  static claimAll(save, doubleReward = false) {
    const b = this.ensureState(save);
    if (!b) return { success: false, count: 0, rewards: {} };

    const checkList = [...(b.daily || []), ...(b.weekly || [])];
    const claimable = checkList.filter(x => !x.claimed && x.current >= x.target);

    if (claimable.length === 0) {
      return { success: false, count: 0, msg: '暂无已达成可领取的悬赏' };
    }

    const mul = doubleReward ? 2 : 1;
    let totalMobao = 0;
    let totalTokens = 0;
    let totalSupplies = 0;
    let totalFragments = 0;

    for (const item of claimable) {
      item.claimed = true;
      const r = item.rewards || {};
      totalMobao += (r.mobao || 0) * mul;
      totalTokens += (r.tokens || 0) * mul;
      totalSupplies += (r.supplies || 0) * mul;
      totalFragments += (r.fragments || 0) * mul;
    }

    if (totalMobao > 0) save.mobao = (save.mobao || 0) + totalMobao;
    if (totalTokens > 0) save.tokens = (save.tokens || 0) + totalTokens;
    if (totalSupplies > 0) {
      if (!save.camp) save.camp = {};
      save.camp.supplies = (save.camp.supplies || 0) + totalSupplies;
    }
    if (totalFragments > 0) save.fragments = (save.fragments || 0) + totalFragments;

    return {
      success: true,
      count: claimable.length,
      bounties: claimable,
      isDouble: doubleReward,
      rewards: {
        mobao: totalMobao,
        tokens: totalTokens,
        supplies: totalSupplies,
        fragments: totalFragments,
      },
    };
  }

  // 统计概览（用于红点与主界面展示）
  static getSummary(save) {
    const b = this.ensureState(save);
    if (!b) return { dailyCompleted: 0, dailyTotal: 0, weeklyCompleted: 0, weeklyTotal: 0, unclaimedCount: 0, dailyRefreshCount: 0 };

    const daily = b.daily || [];
    const weekly = b.weekly || [];

    const dailyCompleted = daily.filter(x => x.current >= x.target).length;
    const weeklyCompleted = weekly.filter(x => x.current >= x.target).length;

    const unclaimedDaily = daily.filter(x => !x.claimed && x.current >= x.target).length;
    const unclaimedWeekly = weekly.filter(x => !x.claimed && x.current >= x.target).length;

    return {
      dailyCompleted,
      dailyTotal: daily.length,
      weeklyCompleted,
      weeklyTotal: weekly.length,
      unclaimedCount: unclaimedDaily + unclaimedWeekly,
      dailyRefreshCount: b.dailyRefreshCount ?? 2,
      daily,
      weekly,
    };
  }
}

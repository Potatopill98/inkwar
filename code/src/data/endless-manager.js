// 墨阵山河 - 无尽模式（墨影试炼）核心管理器 (EndlessManager)
// 包含波次递增强化、肉鸽三选一增益库、首领配置、大本营防爆结算、战后精细统计与双倍奖励
// 支持全量数值在【数值调校】面板中实时微调与持久化

const _memStorage = new Map();
function getStorage() {
  if (typeof localStorage !== 'undefined' && localStorage.getItem) return localStorage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage && globalThis.localStorage.getItem) return globalThis.localStorage;
  return {
    getItem: (k) => _memStorage.get(k) ?? null,
    setItem: (k, v) => _memStorage.set(k, String(v)),
    removeItem: (k) => _memStorage.delete(k),
  };
}

// ---------------- 无尽模式数值调校配置定义 ----------------
export const ENDLESS_TUNING_FIELDS = [
  // 1. 波次与敌军属性成长
  {
    group: 'waves',
    groupName: '🌊 波次刷新与敌军属性成长',
    fields: [
      { key: 'waveStatGrowth', label: '每波敌军属性增益', desc: '每一波敌人生命与攻击的递增比例（第1波为1.0倍）', step: 0.5, min: 0.5, max: 30, isPercent: true, unit: '%' },
      { key: 'waveBaseSoldiers', label: '初始出兵数量 (第1波)', desc: '第1波生成的普通敌军总数', step: 1, min: 1, max: 20, unit: '人' },
      { key: 'waveSoldierStep', label: '出兵增加阶梯 (波次)', desc: '每过多少波次出兵数量上升一次', step: 1, min: 1, max: 20, unit: '波' },
      { key: 'waveSoldierIncrement', label: '每次增加出兵数量', desc: '满足阶梯波次后，每批敌军额外增加的人数', step: 1, min: 1, max: 10, unit: '人' },
      { key: 'waveInterval', label: '波次推进时间间隔', desc: '无需等前一波杀绝，每隔指定秒数准时推进下一波', step: 1, min: 5, max: 60, unit: 's' },
      { key: 'legendaryUnlockWave', label: '敌方传奇卡解锁波次', desc: '敌军开始允许刷出霹雳车/传奇卡的最低波次', step: 1, min: 1, max: 50, unit: '波' },
      { key: 'legendaryRatio', label: '每波传奇卡比例上限', desc: '每波敌方传奇卡出兵数量不得高于当前波次的倍数', step: 0.01, min: 0, max: 1.0, isPercent: false, unit: '倍' },
    ]
  },
  // 2. 敌军大本营机制数值
  {
    group: 'base',
    groupName: '🏰 敌方大本营反噬与重生机制',
    fields: [
      { key: 'enemyBaseMaxHp', label: '敌寨大本营血量', desc: '敌军大本营生命值上限，打空后触发爆破并重生', step: 500, min: 1000, max: 30000, unit: 'HP' },
      { key: 'enemyBaseReboundRatio', label: '敌寨爆破反噬伤害', desc: '敌寨被击破时对附近我方单位造成最大生命值的伤害比例', step: 5, min: 0, max: 100, isPercent: true, unit: '%' },
      { key: 'enemyBaseInvincibleTime', label: '敌寨无敌与回血时间', desc: '大本营击破后无敌护盾持续并重组回血的秒数', step: 0.5, min: 1.0, max: 10.0, unit: 's' },
    ]
  },
  // 3. 肉鸽增益数值调校
  {
    group: 'buffs',
    groupName: '🎴 肉鸽三选一增益数值',
    fields: [
      { key: 'buffEnergyRegen', label: '【军令如山】军令积攒速度', desc: '军令恢复速度加成比例', step: 5, min: 5, max: 100, isPercent: true, unit: '%' },
      { key: 'buffCostReduction', label: '【兵贵神速】全卡消耗降低', desc: '全卡牌部署军令扣减值（最低1费）', step: 1, min: 1, max: 5, unit: '点' },
      { key: 'buffCardCdReduction', label: '【神机妙算】卡牌冷却缩减', desc: '全卡牌部署冷却时间降低比例', step: 5, min: 5, max: 80, isPercent: true, unit: '%' },
      { key: 'buffHeroSkillCd', label: '【运筹帷幄】主将技能冷却缩减', desc: '主将专属技能冷却降低比例', step: 5, min: 5, max: 80, isPercent: true, unit: '%' },
      { key: 'buffHeroSuperCd', label: '【运筹帷幄】主将大招冷却缩减', desc: '主将荒野大招冷却降低比例', step: 5, min: 5, max: 80, isPercent: true, unit: '%' },
      { key: 'buffBaseHealAmount', label: '【固若金汤】帅帐即刻回血量', desc: '选牌后我方帅帐即刻恢复的生命值', step: 200, min: 200, max: 5000, unit: 'HP' },
      { key: 'buffBaseMaxBonus', label: '【固若金汤】帅帐生命上限永久加成', desc: '我方帅帐最大生命永久增加值', step: 100, min: 100, max: 3000, unit: 'HP' },
      { key: 'buffTeamAtk', label: '【三军用命】全军基础攻击加成', desc: '场上所有我方单位攻击力提升比例', step: 5, min: 5, max: 100, isPercent: true, unit: '%' },
      { key: 'buffTeamArmor', label: '【金戈铁甲】全军护甲提升', desc: '全军护甲增加点数', step: 1, min: 1, max: 20, unit: '点' },
      { key: 'buffDamageReduction', label: '【金戈铁甲】全队免伤比例', desc: '全军受击伤害减免比例', step: 5, min: 5, max: 80, isPercent: true, unit: '%' },
      { key: 'buffTeamRegen', label: '【枯木逢春】全军每秒持续回血', desc: '场上所有我方单位每秒恢复最大生命的百分比', step: 0.5, min: 0.5, max: 15, isPercent: true, unit: '%/s' },
      { key: 'buffCritRate', label: '【破阵陷阵】全军暴击率', desc: '全军所有单位暴击触发几率', step: 5, min: 5, max: 100, isPercent: true, unit: '%' },
      { key: 'buffSiegeBonus', label: '【破阵陷阵】对敌寨攻城伤害加成', desc: '全军对敌方大本营造成的伤害额外加成', step: 5, min: 10, max: 200, isPercent: true, unit: '%' },
      { key: 'buffHeroStats', label: '【万夫莫敌】主将攻防神威加成', desc: '主将生命与攻击额外提升比例', step: 5, min: 5, max: 150, isPercent: true, unit: '%' },
    ]
  },
  // 4. 终局赏赐换算
  {
    group: 'rewards',
    groupName: '🎁 终局墨宝将令赏赐换算',
    fields: [
      { key: 'rewardWaveMobao', label: '每坚持1波奖励墨宝', desc: '每成功通过一波发放的墨宝数', step: 1, min: 1, max: 10, unit: '墨宝' },
      { key: 'rewardWaveTokens', label: '每坚持1波奖励将令', desc: '每成功通过一波发放的将令数', step: 1, min: 1, max: 10, unit: '将令' },
      { key: 'rewardKillMobaoStep', label: '杀敌换墨宝阈值 (人)', desc: '每斩杀多少名敌方士兵奖 1 墨宝', step: 5, min: 10, max: 200, unit: '人' },
      { key: 'rewardBossTokens', label: '击杀首领奖励将令', desc: '每击败一位无尽强敌首领奖励的将令数', step: 1, min: 1, max: 50, unit: '将令' },
      { key: 'rewardBaseDamageStep', label: '对敌寨伤害兑奖档位', desc: '对敌方大本营每造成多少累计伤害可领一档赏赐', step: 500, min: 1000, max: 20000, unit: '伤害' },
      { key: 'rewardBaseMobao', label: '敌寨伤害档位奖励墨宝', desc: '达成一档敌寨伤害奖励的墨宝数', step: 1, min: 1, max: 20, unit: '墨宝' },
      { key: 'rewardBaseTokens', label: '敌寨伤害档位奖励将令', desc: '达成一档敌寨伤害奖励的将令数', step: 1, min: 1, max: 10, unit: '将令' },
    ]
  }
];

export const DEFAULT_ENDLESS_TUNING = {
  // 波次与敌军属性成长
  waveStatGrowth: 0.05,
  waveBaseSoldiers: 5,
  waveSoldierStep: 5,
  waveSoldierIncrement: 2,
  waveInterval: 20.0,
  legendaryUnlockWave: 10,
  legendaryRatio: 0.10,

  // 敌军大本营机制数值
  enemyBaseMaxHp: 5000,
  enemyBaseReboundRatio: 0.80,
  enemyBaseInvincibleTime: 3.0,

  // 肉鸽增益数值调校
  buffEnergyRegen: 0.10,
  buffCostReduction: 1,
  buffCardCdReduction: 0.10,
  buffHeroSkillCd: 0.10,
  buffHeroSuperCd: 0.10,
  buffBaseHealAmount: 1500,
  buffBaseMaxBonus: 500,
  buffTeamAtk: 0.10,
  buffTeamArmor: 2,
  buffDamageReduction: 0.05,
  buffTeamRegen: 0.005,
  buffCritRate: 0.10,
  buffSiegeBonus: 0.20,
  buffHeroStats: 0.15,

  // 终局赏赐换算
  rewardWaveMobao: 1,
  rewardWaveTokens: 1,
  rewardKillMobaoStep: 50,
  rewardBossTokens: 5,
  rewardBaseDamageStep: 5000,
  rewardBaseMobao: 3,
  rewardBaseTokens: 1,
};

// ---------------- 肉鸽增益池 (Roguelike Buff Pool) ----------------
export const ENDLESS_BUFF_POOL = [
  {
    id: 'energy_regen',
    name: '军令如山',
    icon: '⚡',
    tag: '资源强化',
    getDesc: (t) => `军令积攒速度 +${Math.round((t.buffEnergyRegen ?? DEFAULT_ENDLESS_TUNING.buffEnergyRegen) * 100)}%（可叠加）`,
    rarity: 'rare',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.energyRegen = (b.endlessBuffs.energyRegen || 0) + (t.buffEnergyRegen ?? DEFAULT_ENDLESS_TUNING.buffEnergyRegen);
    }
  },
  {
    id: 'cost_reduce',
    name: '兵贵神速',
    icon: '📜',
    tag: '消耗降低',
    getDesc: (t) => `全卡牌部署军令消耗 -${t.buffCostReduction ?? DEFAULT_ENDLESS_TUNING.buffCostReduction}（最低 1 费）`,
    rarity: 'epic',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.costReduction = (b.endlessBuffs.costReduction || 0) + (t.buffCostReduction ?? DEFAULT_ENDLESS_TUNING.buffCostReduction);
    }
  },
  {
    id: 'card_cd',
    name: '神机妙算',
    icon: '⏳',
    tag: '节奏加速',
    getDesc: (t) => `全卡牌部署冷却时间 -${Math.round((t.buffCardCdReduction ?? DEFAULT_ENDLESS_TUNING.buffCardCdReduction) * 100)}%（可叠加）`,
    rarity: 'rare',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.cardCdReduction = (b.endlessBuffs.cardCdReduction || 0) + (t.buffCardCdReduction ?? DEFAULT_ENDLESS_TUNING.buffCardCdReduction);
    }
  },
  {
    id: 'hero_cd',
    name: '运筹帷幄',
    icon: '👑',
    tag: '将领专精',
    getDesc: (t) => `主将技能冷却 -${Math.round((t.buffHeroSkillCd ?? DEFAULT_ENDLESS_TUNING.buffHeroSkillCd) * 100)}%，大招冷却 -${Math.round((t.buffHeroSuperCd ?? DEFAULT_ENDLESS_TUNING.buffHeroSuperCd) * 100)}%（可叠加）`,
    rarity: 'epic',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.heroCdReduction = (b.endlessBuffs.heroCdReduction || 0) + (t.buffHeroSkillCd ?? DEFAULT_ENDLESS_TUNING.buffHeroSkillCd);
      b.endlessBuffs.heroSuperCdReduction = (b.endlessBuffs.heroSuperCdReduction || 0) + (t.buffHeroSuperCd ?? DEFAULT_ENDLESS_TUNING.buffHeroSuperCd);
    }
  },
  {
    id: 'base_heal',
    name: '固若金汤',
    icon: '🏯',
    tag: '驻地坚壁',
    getDesc: (t) => `帅帐即刻恢复 ${t.buffBaseHealAmount ?? DEFAULT_ENDLESS_TUNING.buffBaseHealAmount} HP，生命上限永久 +${t.buffBaseMaxBonus ?? DEFAULT_ENDLESS_TUNING.buffBaseMaxBonus}`,
    rarity: 'legendary',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      const heal = t.buffBaseHealAmount ?? DEFAULT_ENDLESS_TUNING.buffBaseHealAmount;
      const maxBonus = t.buffBaseMaxBonus ?? DEFAULT_ENDLESS_TUNING.buffBaseMaxBonus;
      b.endlessBuffs.baseMaxBonus = (b.endlessBuffs.baseMaxBonus || 0) + maxBonus;
      b.baseMaxHp = (b.baseMaxHp || 3000) + maxBonus;
      b.baseHp = Math.min(b.baseMaxHp, b.baseHp + heal);
      // 恢复特效统一规范：脚下绿色光环
      if (b.effects) {
        b.effects.ring(-14, 0, 0x22c55e, 1.2, 5.0, 0.85, 0.9);
        b.effects.heal(-14, 0.8, 0);
      }
    }
  },
  {
    id: 'team_atk',
    name: '三军用命',
    icon: '⚔️',
    tag: '全军锋芒',
    getDesc: (t) => `全军所有单位基础攻击力 +${Math.round((t.buffTeamAtk ?? DEFAULT_ENDLESS_TUNING.buffTeamAtk) * 100)}%（可叠加）`,
    rarity: 'rare',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.teamAtk = (b.endlessBuffs.teamAtk || 0) + (t.buffTeamAtk ?? DEFAULT_ENDLESS_TUNING.buffTeamAtk);
    }
  },
  {
    id: 'team_armor',
    name: '金戈铁甲',
    icon: '🛡️',
    tag: '全军重铠',
    getDesc: (t) => `全军护甲 +${t.buffTeamArmor ?? DEFAULT_ENDLESS_TUNING.buffTeamArmor}，全队受伤害降低 ${Math.round((t.buffDamageReduction ?? DEFAULT_ENDLESS_TUNING.buffDamageReduction) * 100)}%（可叠加）`,
    rarity: 'rare',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.teamArmor = (b.endlessBuffs.teamArmor || 0) + (t.buffTeamArmor ?? DEFAULT_ENDLESS_TUNING.buffTeamArmor);
      b.endlessBuffs.damageReduction = (b.endlessBuffs.damageReduction || 0) + (t.buffDamageReduction ?? DEFAULT_ENDLESS_TUNING.buffDamageReduction);
    }
  },
  {
    id: 'team_regen',
    name: '枯木逢春',
    icon: '🌿',
    tag: '生机不绝',
    getDesc: (t) => `场上所有我方单位每秒持续恢复 ${(Number(t.buffTeamRegen ?? DEFAULT_ENDLESS_TUNING.buffTeamRegen) * 100).toFixed(1)}% 最大生命值（可叠加）`,
    rarity: 'epic',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.teamRegen = (b.endlessBuffs.teamRegen || 0) + (t.buffTeamRegen ?? DEFAULT_ENDLESS_TUNING.buffTeamRegen);
    }
  },
  {
    id: 'siege_crit',
    name: '破阵陷阵',
    icon: '💥',
    tag: '破壁拔寨',
    getDesc: (t) => `全军暴击率 +${Math.round((t.buffCritRate ?? DEFAULT_ENDLESS_TUNING.buffCritRate) * 100)}%，对敌寨大本营伤害额外 +${Math.round((t.buffSiegeBonus ?? DEFAULT_ENDLESS_TUNING.buffSiegeBonus) * 100)}%（可叠加）`,
    rarity: 'epic',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      b.endlessBuffs.critRate = (b.endlessBuffs.critRate || 0) + (t.buffCritRate ?? DEFAULT_ENDLESS_TUNING.buffCritRate);
      b.endlessBuffs.siegeBonus = (b.endlessBuffs.siegeBonus || 0) + (t.buffSiegeBonus ?? DEFAULT_ENDLESS_TUNING.buffSiegeBonus);
    }
  },
  {
    id: 'hero_surge',
    name: '万夫莫敌',
    icon: '🔥',
    tag: '主将神威',
    getDesc: (t) => `主将生命与攻击额外 +${Math.round((t.buffHeroStats ?? DEFAULT_ENDLESS_TUNING.buffHeroStats) * 100)}%，普攻与刺击范围 +25%（可叠加）`,
    rarity: 'legendary',
    apply: (b) => {
      const t = EndlessManager.getTuning();
      const bonus = t.buffHeroStats ?? DEFAULT_ENDLESS_TUNING.buffHeroStats;
      b.endlessBuffs.heroStatsBonus = (b.endlessBuffs.heroStatsBonus || 0) + bonus;
      if (b.heroMaxHp) b.heroMaxHp = Math.round(b.heroMaxHp * (1 + bonus));
      if (b.heroHp) b.heroHp = Math.min(b.heroMaxHp, Math.round(b.heroHp * (1 + bonus)));
    }
  }
];

// ---------------- 首领阶梯配置 (Boss Ladder) ----------------
export const ENDLESS_BOSS_LADDER = [
  { wave: 10, type: 'boss_qu', name: '黄巾天公 · 张角', title: '大贤良师', hp: 4200, atk: 50, skills: ['summon', 'wind'] },
  { wave: 20, type: 'boss_huaxiong', name: '西凉猛将 · 华雄', title: '铁骑冲阵', hp: 6500, atk: 70, skills: ['charge', 'crescent'] },
  { wave: 30, type: 'boss_lvbu', name: '无双修罗 · 吕布', title: '飞将鬼神', hp: 9800, atk: 95, skills: ['charge', 'crescent', 'wind'] },
  { wave: 40, type: 'boss_caocao', name: '魏武枭雄 · 曹操', title: '乱世奸雄', hp: 13500, atk: 120, skills: ['summon', 'charge', 'crescent'] },
  { wave: 50, type: 'boss_lvbu', name: '血月修罗 · 狂暴吕布', title: '神魔一体', hp: 18000, atk: 150, skills: ['charge', 'crescent', 'wind', 'summon'] },
];

export class EndlessManager {
  // ---------------- 数值调校读取、保存与重置 ----------------
  static getTuning() {
    try {
      const raw = getStorage().getItem('mozhen_endless_tuning_v1');
      if (!raw) return { ...DEFAULT_ENDLESS_TUNING };
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.legendaryRatio === 0.005 || parsed.legendaryRatio === undefined)) {
        parsed.legendaryRatio = 0.10;
        this.saveTuning({ ...DEFAULT_ENDLESS_TUNING, ...parsed });
      }
      return { ...DEFAULT_ENDLESS_TUNING, ...parsed };
    } catch {
      return { ...DEFAULT_ENDLESS_TUNING };
    }
  }

  static saveTuning(tuning) {
    try {
      getStorage().setItem('mozhen_endless_tuning_v1', JSON.stringify(tuning));
      return true;
    } catch {
      return false;
    }
  }

  static resetTuning() {
    try {
      getStorage().removeItem('mozhen_endless_tuning_v1');
      return true;
    } catch {
      return false;
    }
  }

  // ---------------- 无尽模式开放条件检测 (第20关通关) ----------------
  static isUnlocked(save) {
    if (!save || !save.progress) return false;
    const p = save.progress;
    if (p.unlockedLevel > 20) return true;
    if (p.stars && (p.stars[20] > 0 || p.stars['20'] > 0)) return true;
    return false;
  }

  // ---------------- 每日试炼门票机制 (每日2次免费，看广告可无限补充) ----------------
  static ensureTickets(save) {
    if (!save) return { freeLeft: 2, adTickets: 0 };
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!save.endlessTickets || typeof save.endlessTickets !== 'object') {
      save.endlessTickets = {
        date: today,
        freeLeft: 2,
        adTickets: 0,
      };
    }
    // 跨日自动恢复 2 次免费机会
    if (save.endlessTickets.date !== today) {
      save.endlessTickets.date = today;
      save.endlessTickets.freeLeft = 2;
    }
    if (save.endlessTickets.freeLeft === undefined) save.endlessTickets.freeLeft = 2;
    if (save.endlessTickets.adTickets === undefined) save.endlessTickets.adTickets = 0;
    return save.endlessTickets;
  }

  static getRemainingTickets(save) {
    const t = this.ensureTickets(save);
    return (t.freeLeft || 0) + (t.adTickets || 0);
  }

  static consumeTicket(save) {
    const t = this.ensureTickets(save);
    if ((t.freeLeft || 0) > 0) {
      t.freeLeft--;
      return { success: true, usedFree: true, remaining: this.getRemainingTickets(save) };
    }
    if ((t.adTickets || 0) > 0) {
      t.adTickets--;
      return { success: true, usedFree: false, remaining: this.getRemainingTickets(save) };
    }
    return { success: false, msg: '试炼次数已用尽' };
  }

  static addAdTicket(save) {
    const t = this.ensureTickets(save);
    t.adTickets = (t.adTickets || 0) + 1;
    return { success: true, remaining: this.getRemainingTickets(save) };
  }

  // 历史最高波次
  static getMaxWave() {
    return parseInt(getStorage().getItem('inkwar_endless_max_wave') || '0', 10);
  }

  static saveMaxWave(wave) {
    const cur = this.getMaxWave();
    if (wave > cur) {
      getStorage().setItem('inkwar_endless_max_wave', String(wave));
      return true;
    }
    return false;
  }

  // ---------------- 存档挂起与断点续玩 ----------------
  static saveProgress(state) {
    try {
      getStorage().setItem('inkwar_endless_save_state', JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }));
      return true;
    } catch {
      return false;
    }
  }

  static loadProgress() {
    try {
      const raw = getStorage().getItem('inkwar_endless_save_state');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static clearProgress() {
    try {
      getStorage().removeItem('inkwar_endless_save_state');
    } catch {}
  }

  static hasSavedProgress() {
    const s = this.loadProgress();
    return !!(s && s.wave >= 1);
  }

  // ---------------- 肉鸽 3 选 1 随机提取 ----------------
  static getThreeBuffChoices(existingBuffCounts = {}) {
    const tuning = this.getTuning();
    const pool = ENDLESS_BUFF_POOL.slice();
    // 随机洗牌
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, 3);
    return selected.map(b => {
      let dynamicDesc = b.desc;
      if (typeof b.getDesc === 'function') {
        dynamicDesc = b.getDesc(tuning);
      }
      return {
        ...b,
        desc: dynamicDesc,
        currentStacks: existingBuffCounts[b.id] || 0
      };
    });
  }

  // ---------------- 终局奖励精密计算 ----------------
  static calculateRewards({ waves = 0, kills = 0, bossKills = 0, baseDamage = 0 }) {
    const t = this.getTuning();
    const waveMobao = Math.max(0, waves) * (t.rewardWaveMobao ?? 1);
    const waveTokens = Math.max(0, waves) * (t.rewardWaveTokens ?? 1);

    const killStep = Math.max(1, t.rewardKillMobaoStep ?? 50);
    const killMobao = Math.floor(Math.max(0, kills) / killStep);

    const bossTokens = Math.max(0, bossKills) * (t.rewardBossTokens ?? 5);

    const dmgStep = Math.max(1, t.rewardBaseDamageStep ?? 5000);
    const baseBatches = Math.floor(Math.max(0, baseDamage) / dmgStep);
    const baseMobao = baseBatches * (t.rewardBaseMobao ?? 3);
    const baseTokens = baseBatches * (t.rewardBaseTokens ?? 1);

    const totalMobao = waveMobao + killMobao + baseMobao;
    const totalTokens = waveTokens + bossTokens + baseTokens;

    return {
      mobao: totalMobao,
      tokens: totalTokens,
      details: {
        waves,
        waveMobao,
        waveTokens,
        kills,
        killMobao,
        bossKills,
        bossTokens,
        baseDamage,
        baseBatches,
        baseMobao,
        baseTokens,
      }
    };
  }

  // ---------------- 无尽模式专属关卡配置 ----------------
  static createEndlessLevel() {
    const t = this.getTuning();
    const baseHp = t.enemyBaseMaxHp ?? 5000;
    return {
      id: 999,
      chapter: 99,
      name: '墨影试炼 · 无尽之阵',
      quote: '群墨翻涌，山河无终。唯有名将力挽狂澜！',
      isEndless: true,
      weather: 'clear',
      enemyBaseHp: baseHp,      // 敌方大本营固定血量，不可被彻底摧毁
      enemyBaseMaxHp: baseHp,
      energyRegenMul: 1.0,
      deployMinX: -14,
      deployMaxX: -3,
      enemyTowers: [],
      waves: [],
      boss: null,
      tip: '无尽模式：敌人越战越强，每5波肉鸽三选一！击破敌寨触发震荡逆流，每击破一次获丰厚墨宝将令！'
    };
  }
}

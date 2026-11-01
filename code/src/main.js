// 主流程与存档：启动、解锁、战功、排行榜、界面调度
import { UI } from './ui.js?v=1.93';
import { Platform } from './platform.js?v=1.93';
import { Battle } from './battle.js?v=1.93';
import { audio } from './audio.js?v=1.93';
import { UNITS, getUnit } from './data/units.js?v=1.93';
import { HEROES, getHero } from './data/heroes.js?v=1.93';
import { LEVELS, getLevel, CHAPTERS } from './data/levels.js?v=1.93';
import { CAMP_MAX_LEVEL, CAMP_DAILY_SUPPLIES, campCost, campEnergyMax, campRegen, campSuppliesForWin, BARRACKS_MAX_LEVEL, WORKSHOP_MAX_LEVEL, barracksCost, workshopCost, barracksAtkBonus, workshopBuildingHpBonus, workshopCdReduction } from './data/camp.js?v=1.93';
import { initQuestState, progressQuest, isQuestCompleted, DAILY_QUEST_TEMPLATES, WEEKLY_CHEST_CONFIG, DAILY_FIRST_WIN_TOKENS } from './data/daily-quests.js?v=1.93';
import { getAdvisorBonus, ARCHETYPE_TALENTS, getHeroUpgradeCost, getHeroPermMultiplier, DEFAULT_HERO_TUNING, getHeroTuning } from './data/heroes.js?v=1.93';
import { applyBalanceOverrides, DevPanel } from './dev-panel.js?v=1.93';
import { FirstGuide } from './first-guide.js?v=1.93';
import { EndlessManager } from './data/endless-manager.js?v=1.93';
import { BountyManager } from './data/bounty-manager.js?v=1.93';

const STORAGE_VERSION = 1;

function defaultSave() {
  return {
    version: STORAGE_VERSION,
    updatedAt: 0,
    player: { name: '墨阵师', createdAt: Date.now(), playTime: 0 },
    progress: {
      unlockedLevel: 1,
      stars: {},
      bestTime: {},
      bestScore: {},
      totalScore: 0,
      totalStars: 0,
      clearedCount: 0,
    },
    unlocks: {
      units: ['militia', 'swordsman', 'archer', 'huichun'],
      heroes: ['zhaoyun'],
    },
    deck: ['swordsman', 'militia', 'archer', 'huichun'],
    hero: { selected: 'zhaoyun', advisor: null, levels: { zhaoyun: 1 }, mastery: { zhaoyun: 1 }, masteryXp: {}, talents: {} },
    settings: {
      music: true,
      sfx: true,
      quality: 'auto',
      tutorialDone: false,
      tourDone: false,
      tourPending: false,
      firstGuideDone: false,
      heroGuidePending: false,
      heroGuideDone: false,
      heroTuning: {
        maxHp: 1200,
        atk: 65,
        armor: 10,
        regenRate: 0.04,
        aggroRadius: 2.85,
      },
    },
    stats: { battles: 0, wins: 0, kills: 0, maxWave: 0 },
    tokens: 0,
    mobao: 0,
    gacha: { date: '', freeUsed: false, adUsed: 0, firstBoost: false },
    camp: { level: 0, barracksLevel: 0, workshopLevel: 0, supplies: 0, lastClaim: '' },
    dailyQuests: null,
    bounties: null,
    cloudArchiveUUID: '',
    leaderboardBest: 0,
  };
}

function deckBonusLabels(deckIds) {
  const tags = { melee: 0, ranged: 0, cavalry: 0, building: 0, support: 0 };
  for (const id of deckIds) {
    const u = getUnit(id);
    if (u.tags.includes('cavalry')) tags.cavalry++;
    else if (u.tags.includes('ranged') && !u.building) tags.ranged++;
    else if (u.building) tags.building++;
    else tags.melee++;
    if (u.tags.includes('support')) tags.support++;
  }
  const labels = [];
  if (tags.melee >= 3) labels.push('步卒同心');
  if (tags.ranged >= 3) labels.push('万箭齐发');
  if (tags.cavalry >= 2) labels.push('铁骑纵横');
  if (tags.building >= 2) labels.push('固若金汤');
  if (tags.melee >= 1 && tags.ranged >= 1 && tags.support >= 1) labels.push('奇正相生');
  return labels.slice(0, 3);
}

export class App {
  // ---------------- 阶段二：双将与成长体系 ----------------
  isAdvisorUnlocked() {
    const s = this.save;
    return (s.progress.clearedCount >= 8) || (s.camp && s.camp.level >= 3);
  }

  selectAdvisor(heroId) {
    if (!this.isAdvisorUnlocked()) {
      this.ui.toast('大本营 3 级或通关第 8 关解锁军师位');
      return;
    }
    if (heroId === this.save.hero.selected) {
      this.ui.toast('不可与主将同名');
      return;
    }
    const h = getHero(heroId);
    if (!h || !h.canAdvisor) {
      this.ui.toast('该英雄不可任军师（仅限主将）');
      return;
    }
    this.save.hero.advisor = heroId;
    this.persist();
    if (this.ui) this.ui.renderHeroPick();
  }

  removeAdvisor() {
    this.save.hero.advisor = null;
    this.persist();
    if (this.ui) this.ui.renderHeroPick();
  }

  selectTalent(heroId, tier, choiceIndex) {
    if (!this.save.hero.talents) this.save.hero.talents = {};
    if (!this.save.hero.talents[heroId]) this.save.hero.talents[heroId] = {};
    this.save.hero.talents[heroId][tier] = choiceIndex;
    this.persist();
  }

  upgradeBarracks() {
    const c = this.save.camp;
    const cur = c.barracksLevel || 0;
    if (cur >= BARRACKS_MAX_LEVEL) {
      this.ui.toast('演武场已达最高等级');
      return;
    }
    const cost = barracksCost(cur);
    if (c.supplies < cost) {
      this.ui.toast(`军需不足（需要 ${cost}）`);
      return;
    }
    c.supplies -= cost;
    c.barracksLevel = cur + 1;
    this.persist();
    if (this.ui) this.ui.refreshCamp();
    this.ui.toast(`演武场升级！全军攻击 +${Math.round(barracksAtkBonus(c.barracksLevel) * 100)}%`);
  }

  upgradeWorkshop() {
    const c = this.save.camp;
    const cur = c.workshopLevel || 0;
    if (cur >= WORKSHOP_MAX_LEVEL) {
      this.ui.toast('工坊已达最高等级');
      return;
    }
    const cost = workshopCost(cur);
    if (c.supplies < cost) {
      this.ui.toast(`军需不足（需要 ${cost}）`);
      return;
    }
    c.supplies -= cost;
    c.workshopLevel = cur + 1;
    this.persist();
    if (this.ui) this.ui.refreshCamp();
    this.ui.toast(`工坊升级！建筑生命 +${Math.round(workshopBuildingHpBonus(c.workshopLevel) * 100)}%，卡牌冷却 -${Math.round(workshopCdReduction(c.workshopLevel) * 100)}%`);
  }

  claimDailyQuest(questId) {
    const dq = this.save.dailyQuests;
    if (!dq) return;
    const q = dq.quests.find((x) => x.id === questId);
    const tpl = DAILY_QUEST_TEMPLATES.find((x) => x.id === questId);
    if (q && tpl && q.current >= tpl.target && !q.claimed) {
      q.claimed = true;
      this.save.camp.supplies = (this.save.camp.supplies || 0) + tpl.supplies;
      this.save.tokens = (this.save.tokens || 0) + tpl.tokens;
      this.persist();
      if (this.ui) this.ui.refreshCamp();
      this.ui.toast(`已领取【${tpl.name}】：军需 +${tpl.supplies}，将令 +${tpl.tokens}`);
    }
  }

  claimWeeklyChest() {
    const dq = this.save.dailyQuests;
    if (!dq || dq.weeklyClaimed) return;
    if ((dq.weeklyWins || 0) < WEEKLY_CHEST_CONFIG.targetWins) {
      this.ui.toast(`本周胜场不足（当前 ${dq.weeklyWins || 0}/${WEEKLY_CHEST_CONFIG.targetWins}）`);
      return;
    }
    dq.weeklyClaimed = true;
    this.save.camp.supplies = (this.save.camp.supplies || 0) + WEEKLY_CHEST_CONFIG.supplies;
    this.save.tokens = (this.save.tokens || 0) + WEEKLY_CHEST_CONFIG.tokens;
    this.persist();
    if (this.ui) this.ui.refreshCamp();
    this.ui.toast(`开启每周宝箱：军需 +${WEEKLY_CHEST_CONFIG.supplies}，将令 +${WEEKLY_CHEST_CONFIG.tokens}！`);
  }

  // ---------------- 山河悬赏系统（每日悬赏 & 每周悬赏） ----------------

  reportBountyProgress(type, amount = 1) {
    if (!this.save) return;
    const res = BountyManager.onEvent(this.save, type, amount);
    if (res.updated) {
      this.persist();
      if (this.ui) {
        if (this.ui.renderHomeBounties) this.ui.renderHomeBounties();
        if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
          this.ui.renderBountyModalList();
        }
      }
    }
    if (res.newlyCompleted && res.newlyCompleted.length > 0) {
      audio.drum(null, true, 0.4);
      audio.gong(null, 1.2);
      for (const item of res.newlyCompleted) {
        this.ui.toast(`🎉 悬赏达成【${item.name}】！可前往主页领赏！`);
      }
    }
  }

  claimBounty(bountyId, doubleReward = false) {
    const res = BountyManager.claim(this.save, bountyId, doubleReward);
    if (!res.success) {
      this.ui.toast(res.msg || '无法领取该悬赏');
      return;
    }
    this.persist();
    audio.drum(null, true, 0.5);
    audio.gong(null, 1.3);
    const r = res.rewards;

    // 荒野乱斗级 · 战功嘉奖大展台展示
    if (this.ui && this.ui.showRewardModal) {
      this.ui.showRewardModal({
        title: doubleReward ? '🎬 观摩双倍 · 犒赏三军' : '战 功 嘉 奖',
        subtitle: doubleReward ? '军情犒赏翻倍，全军振奋！' : '军功赫赫，即刻犒赏！',
        seal: doubleReward ? '倍' : '犒',
        rewards: r,
        isDouble: doubleReward,
        canDouble: !doubleReward,
        onDoubleAd: () => {
          this.claimBountyWithAd(bountyId);
        },
        onConfirm: () => {
          this.ui.refreshHome();
          if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
            this.ui.renderBountyModalList();
          }
        }
      });
    }

    if (this.ui) {
      this.ui.refreshHome();
      if (this.ui.refreshCamp) this.ui.refreshCamp();
      if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
        this.ui.renderBountyModalList();
      }
    }
  }

  async claimBountyWithAd(bountyId) {
    await this.platform.showAdWithFallback(
      'bounty_double',
      () => {
        this.claimBounty(bountyId, true);
      },
      () => {
        this.claimBounty(bountyId, true);
      }
    );
  }

  claimAllBounties(doubleReward = false) {
    const res = BountyManager.claimAll(this.save, doubleReward);
    if (!res.success) {
      this.ui.toast(res.msg || '暂无已达成可领取的悬赏');
      return;
    }
    this.persist();
    audio.drum(null, true, 0.6);
    audio.gong(null, 1.4);
    const r = res.rewards;

    if (this.ui && this.ui.showRewardModal) {
      this.ui.showRewardModal({
        title: doubleReward ? '🎬 观摩双倍 · 一键全领' : '战 功 嘉 奖 · 一 键 全 领',
        subtitle: `一键大犒三军（共达成 ${res.count} 项悬赏）！`,
        seal: doubleReward ? '倍' : '犒',
        rewards: r,
        isDouble: doubleReward,
        canDouble: !doubleReward,
        onDoubleAd: () => {
          this.claimAllBountiesWithAd();
        },
        onConfirm: () => {
          this.ui.refreshHome();
          if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
            this.ui.renderBountyModalList();
          }
        }
      });
    }

    if (this.ui) {
      this.ui.refreshHome();
      if (this.ui.refreshCamp) this.ui.refreshCamp();
      if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
        this.ui.renderBountyModalList();
      }
    }
  }

  async claimAllBountiesWithAd() {
    await this.platform.showAdWithFallback(
      'bounty_double_all',
      () => {
        this.claimAllBounties(true);
      },
      () => {
        this.claimAllBounties(true);
      }
    );
  }

  // ---------------- 11.1 返回键与历史栈 ----------------
  setupHistoryStack() {
    this.currentScreen = 'screen-title';
    if (typeof window === 'undefined') return;

    window.addEventListener('popstate', (e) => {
      this.handleHardwareBack(e);
    });

    // 初始状态
    try {
      history.replaceState({ screen: 'screen-title' }, '');
    } catch (e) {}
  }

  handleHardwareBack(e) {
    // 1. 若结算页打开，返回 = 回关卡列表，不重复结算
    if (this.ui && this.ui.resultModal && this.ui.resultModal.classList.contains('show')) {
      this.ui.hideResult();
      this.openLevels();
      this.pushScreenHistory('screen-levels');
      return;
    }

    // 2. 战斗中返回 = 打开/退出暂停，不退出战斗
    if (this.battle && !this.battle.isDestroyed && this.currentScreen === 'screen-battle') {
      this.battle.togglePause();
      this.pushScreenHistory('screen-battle');
      return;
    }

    // 3. 根界面二次确认退出
    if (this.currentScreen === 'screen-home' || this.currentScreen === 'screen-title') {
      this.pushScreenHistory(this.currentScreen);
      this.ui.showConfirm('退出游戏', '确定要离开墨阵山河吗？', () => {
        try { window.close(); } catch (err) {}
      });
      return;
    }

    // 4. 战前准备 -> 回关卡列表
    if (this.currentScreen === 'screen-prep') {
      this.openLevels();
      return;
    }

    // 5. 其它子页面 -> 回主界面
    this.goBack('home');
  }

  pushScreenHistory(screenId) {
    this.currentScreen = screenId;
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      try {
        window.history.pushState({ screen: screenId }, '');
      } catch (e) {}
    }
  }

  constructor() {
    applyBalanceOverrides();
    this.platform = new Platform();
    this.ui = new UI();
    this.ui.setApp(this);
    this.save = defaultSave();
    this.currentLevelId = null;
    this.currentLevel = null;
    this.selectedHeroId = 'zhaoyun';
    this.workingDeck = [];
    this.battle = null;
    this.lastBattleConfig = null;
    this._saveTimer = null;
    this.devPanel = null;
    this.tour = null;
    this.firstGuide = null;
  }

  // 数值调校面板：需调校口令，避免玩家误入手改数值
  openDevPanel(code) {
    const v = String(code == null ? '' : code).trim();
    if (v !== '528908') {
      audio.click();
      this.ui.toast(v ? '调校口令错误' : '请输入调校口令');
      return;
    }
    if (!this.devPanel) this.devPanel = new DevPanel();
    this.devPanel.open();
  }

  // 开发者模式：输入口令 528908，全资源 99999，解锁全关卡（满星满分）、全兵种与将领
  applyDevCode(code) {
    const v = String(code == null ? '' : code).trim();
    if (v !== '528908') {
      audio.click();
      this.ui.toast(v ? '开发者口令错误' : '请输入开发者口令');
      return;
    }

    // 1. 全资源直接 99999
    this.save.tokens = 99999;
    this.save.mobao = 99999;
    if (!this.save.camp) this.save.camp = {};
    this.save.camp.supplies = 99999;
    this.save.fragments = 99999;
    this.save.shards = 99999;

    // 2. 解锁所有关卡（全40关，全部满3星，最高分）
    const totalLevels = LEVELS.length;
    this.save.progress.unlockedLevel = totalLevels;
    this.save.progress.clearedCount = totalLevels;
    for (let i = 1; i <= totalLevels; i++) {
      this.save.progress.stars[i] = 3;
      this.save.progress.bestScore[i] = Math.max(Number(this.save.progress.bestScore[i]) || 0, 3000);
      if (!this.save.progress.bestTime[i]) this.save.progress.bestTime[i] = 45;
    }
    this.save.progress.totalStars = totalLevels * 3;
    this.save.progress.totalScore = totalLevels * 3000;

    // 3. 解锁全部兵种
    const allUnitIds = UNITS.map((u) => u.id);
    for (const uid of allUnitIds) {
      if (!this.save.unlocks.units.includes(uid)) {
        this.save.unlocks.units.push(uid);
      }
    }

    // 4. 解锁全部名将
    const allHeroIds = HEROES.map((h) => h.id);
    for (const hid of allHeroIds) {
      if (!this.save.unlocks.heroes.includes(hid)) {
        this.save.unlocks.heroes.push(hid);
      }
      if (!this.save.hero.levels[hid]) {
        this.save.hero.levels[hid] = 1;
      }
    }

    this.save.devMode = true;
    BountyManager.ensureState(this.save);
    this.persist(true);

    // 5. 刷新界面
    if (this.ui.inputDevCode) this.ui.inputDevCode.value = '';
    this.ui.refreshHome();
    this.ui.refreshSettings();
    if (this.ui.renderLevels) this.ui.renderLevels();
    if (this.ui.refreshCamp) this.ui.refreshCamp();
    if (this.ui.refreshGacha) this.ui.refreshGacha();
    if (this.ui.renderCodex) this.ui.renderCodex();

    // 6. 音效与通知
    audio.gong(null, 1.25);
    audio.victory();
    this.ui.toast('开发者模式已开启：全资源 99999，已解锁全部 40 关（满星）与全部名将兵种！');
  }

  async boot() {
    const bar = document.querySelector('.loading-bar span');
    if (bar) bar.classList.add('run');
    try {
      const loaded = await this.platform.load(defaultSave());
      this.save = this.normalizeSave(loaded);
      this.selectedHeroId = this.save.hero.selected;
      if (this.save._loadedFromCloud) {
        this.ui.cloudHint.textContent = '云存档已读取';
      }
      audio.musicOn = !!this.save.settings.music;
      audio.sfxOn = !!this.save.settings.sfx;
      this.ui.refreshHome();
      this.ui.refreshSettings();
      setTimeout(() => {
        this.ui.showScreen('screen-title');
        if (bar) bar.classList.remove('run');
      }, 420);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.persist();
      });
      window.addEventListener('beforeunload', () => this.persist(true));
    } catch (e) {
      console.error(e);
      this.ui.showScreen('screen-title');
    }
  }

  normalizeSave(raw) {
    const d = defaultSave();
    const s = { ...d, ...(raw || {}) };
    s.player = { ...d.player, ...(raw && raw.player) };
    s.progress = { ...d.progress, ...(raw && raw.progress) };
    s.progress.stars = { ...((raw && raw.progress && raw.progress.stars) || {}) };
    s.progress.bestTime = { ...((raw && raw.progress && raw.progress.bestTime) || {}) };
    s.progress.bestScore = { ...((raw && raw.progress && raw.progress.bestScore) || {}) };
    s.unlocks = { ...d.unlocks, ...(raw && raw.unlocks) };
    s.unlocks.units = Array.isArray(s.unlocks.units) ? [...new Set(s.unlocks.units)] : [...d.unlocks.units];
    s.unlocks.heroes = Array.isArray(s.unlocks.heroes) ? [...new Set(s.unlocks.heroes)] : [...d.unlocks.heroes];
    for (const base of d.unlocks.units) if (!s.unlocks.units.includes(base)) s.unlocks.units.push(base);
    // 十二将重构：清理旧存档中已下架英雄的解锁记录
    const knownHeroIds = new Set(HEROES.map((h) => h.id));
    s.unlocks.heroes = s.unlocks.heroes.filter((id) => knownHeroIds.has(id));
    for (const base of d.unlocks.heroes) if (!s.unlocks.heroes.includes(base)) s.unlocks.heroes.push(base);
    s.hero = { ...d.hero, ...(raw && raw.hero) };
    s.hero.levels = { ...((raw && raw.hero && raw.hero.levels) || {}) };
    s.hero.mastery = { ...d.hero.mastery, ...((raw && raw.hero && raw.hero.mastery) || {}) };
    s.hero.masteryXp = { ...((raw && raw.hero && raw.hero.masteryXp) || {}) };
    s.settings = { ...d.settings, ...(raw && raw.settings) };
    s.settings.heroTuning = {
      ...d.settings.heroTuning,
      ...((raw && raw.settings && raw.settings.heroTuning) || {}),
    };
    s.stats = { ...d.stats, ...(raw && raw.stats) };
    s.tokens = Math.max(0, Math.floor(Number(s.tokens) || 0));
    s.mobao = Math.max(0, Math.floor(Number(s.mobao) || 0));
    s.gacha = { ...d.gacha, ...(raw && raw.gacha) };
    s.gacha.adUsed = Math.max(0, Math.min(3, Number(s.gacha.adUsed) || 0));
    s.gacha.freeUsed = !!s.gacha.freeUsed;
    s.gacha.firstBoost = !!s.gacha.firstBoost;
    s.camp = { ...d.camp, ...(raw && raw.camp) };
    s.camp.level = Math.max(0, Math.min(CAMP_MAX_LEVEL, Math.floor(Number(s.camp.level) || 0)));
    s.camp.supplies = Math.max(0, Math.floor(Number(s.camp.supplies) || 0));
    s.camp.lastClaim = typeof s.camp.lastClaim === 'string' ? s.camp.lastClaim : '';
    // v1.1 补发：已通关但更新前未解锁的关卡英雄
    for (const lv of LEVELS) {
      if ((s.progress.stars[lv.id] || 0) > 0) {
        for (const hid of (lv.unlocks && lv.unlocks.heroes) || []) {
          if (!s.unlocks.heroes.includes(hid)) s.unlocks.heroes.push(hid);
        }
      }
    }
    s.deck = Array.isArray(s.deck) ? s.deck : [...d.deck];
    s.progress.unlockedLevel = Math.max(1, Math.min(LEVELS.length, Number(s.progress.unlockedLevel) || 1));
    for (const id of Object.keys(s.progress.stars)) {
      const n = Number(id);
      if (n < 1 || n > LEVELS.length) delete s.progress.stars[id];
      else s.progress.stars[id] = Math.max(0, Math.min(3, Number(s.progress.stars[id]) || 0));
    }
    s.deck = [...new Set(s.deck)].filter((id) => s.unlocks.units.includes(id));
    if (!s.deck.length) s.deck = [...d.deck].filter((id) => s.unlocks.units.includes(id));
    if (s.deck.length > 6) s.deck = s.deck.slice(0, 6);
    if (!s.unlocks.heroes.includes(s.hero.selected)) s.hero.selected = s.unlocks.heroes[0] || 'zhaoyun';
    for (const h of HEROES) {
      s.hero.levels[h.id] = Math.max(1, Math.min(11, Math.floor(Number(s.hero.levels[h.id]) || 1)));
      s.hero.mastery[h.id] = Math.max(1, Math.min(10, Number(s.hero.mastery[h.id]) || 1));
      s.hero.masteryXp[h.id] = Math.max(0, Math.min(4, Number(s.hero.masteryXp[h.id]) || 0));
    }
    this.recomputeTotals(s);
    s.bounties = BountyManager.ensureState(s);
    if (s.leaderboardBest < s.progress.totalScore) s.leaderboardBest = s.progress.totalScore;
    return s;
  }

  recomputeTotals(s = this.save) {
    let stars = 0;
    let cleared = 0;
    let best = 0;
    for (let id = 1; id <= LEVELS.length; id++) {
      const st = Number(s.progress.stars[id] || 0);
      if (st > 0) { stars += st; cleared++; }
      best += Number(s.progress.bestScore[id] || 0);
    }
    let mastery = 0;
    for (const h of HEROES) {
      if (s.unlocks.heroes.includes(h.id)) mastery += Math.max(0, Number(s.hero.mastery[h.id] || 1) - 1);
    }
    s.progress.totalStars = stars;
    s.progress.clearedCount = cleared;
    s.progress.totalScore = Math.round(best + mastery * 20);
  }

  // ---------------- 入口 / 导航 ----------------
  enterGame() {
    audio.unlock();
    audio.setMusicEnabled(!!this.save.settings.music);
    audio.setSfxEnabled(!!this.save.settings.sfx);
    audio.startMusic('menu');
    audio.gong(null, 1.05);
    this.ui.refreshHome();
    this.ui.showScreen('screen-home');
    this.maybeStartFirstGuide();
    
  }

  // ---------------- 首进强制指引（design §2.4） ----------------
  maybeStartFirstGuide() {
    if (this.firstGuide) return;
    this.firstGuide = new FirstGuide(this);
    if (this.firstGuide.shouldStart()) this.firstGuide.start();
  }

  // ---------------- 军府巡礼（design §5.7） ----------------
  maybeStartTour() {
    if (!this.save.settings.tourPending || this.tour) return;
    this.save.settings.tourPending = false;
    this.persist();
    setTimeout(() => {
      const home = document.querySelector('#screen-home');
      if (!this.tour && home && home.classList.contains('active')) this.startTour();
    }, 520);
  }

  startTour() {
    if (this.tour) return;
    this.tour = new Tour(this);
    this.tour.start();
  }

  startTourFromResult() {
    this.ui.hideResult();
    this.save.settings.tourPending = false;
    this.persist();
    this.ui.refreshHome();
    this.ui.showScreen('screen-home');
    this.startMenuMusic();
    this.startTour();
  }

  replayTour() {
    this.ui.refreshHome();
    this.ui.showScreen('screen-home');
    this.startMenuMusic();
    this.startTour();
  }

  onTourFinished(skipped) {
    this.tour = null;
    this.save.settings.tourDone = true;
    this.save.settings.tourPending = false;
    this.persist();
    this.ui.refreshSettings();
    if (!skipped) this.ui.toast('军府巡礼完成 · 随时可在设置里重看');
  }

  // 巡礼中玩家自己进了战斗：收起讲解，保留「待触发」，回主界面会重新走一遍
  onTourPaused() {
    this.tour = null;
    this.save.settings.tourPending = true;
    this.persist();
  }

  openLevels() {
    this.pushScreenHistory("screen-levels");
    this.ui.openLevels(Math.min(CHAPTERS.length, Math.floor((this.save.progress.unlockedLevel - 1) / 10) + 1));
    this.startMenuMusic();
  }

  openPrep(levelId) {
    this.pushScreenHistory("screen-prep");
    const level = getLevel(levelId);
    if (!level) {
      this.ui.toast('此关暂未开放');
      return;
    }
    if (levelId > this.save.progress.unlockedLevel) {
      this.ui.toast(`请先通关第 ${levelId - 1} 关`);
      return;
    }
    this.currentLevelId = levelId;
    this.currentLevel = level;
    if (level.fixedHero) {
      this.selectedHeroId = level.fixedHero;
    } else {
      this.selectedHeroId = this.save.hero.selected;
    }
    if (!this.save.unlocks.heroes.includes(this.selectedHeroId)) this.selectedHeroId = 'zhaoyun';
    this.workingDeck = level.fixedDeck ? level.fixedDeck.slice() : this.normalizeDeck(this.save.deck.slice());
    this.ui.renderPrep(level);
    this.startMenuMusic();
  }

  openCodex(tab) {
    this.pushScreenHistory("screen-codex");
    this.ui.openCodex(tab || 'units');
    this.startMenuMusic();
  }

  openLeaderboardScreen() {
    this.ui.refreshLeaderboard();
    this.ui.showScreen('screen-leaderboard');
    this.startMenuMusic();
  }

  openSettings() {
    this.ui.refreshSettings();
    this.ui.showScreen('screen-settings');
    this.startMenuMusic();
  }


  goBack(target) {
    if (this.currentLevel && this.currentLevel.isEndless) {
      this._pendingEndlessSavedState = null;
    }
    if (target === 'home') {
      this.ui.refreshHome();
      this.ui.showScreen('screen-home');
      this.startMenuMusic();
      
    } else if (target === 'levels') {
      this.openLevels();
    } else {
      this.ui.refreshHome();
      this.ui.showScreen('screen-home');
    }
  }

  startMenuMusic() {
    if (!this.battle) audio.startMusic('menu');
  }

  // ---------------- 卡组 ----------------
  normalizeDeck(deck) {
    const seen = new Set();
    const out = [];
    let spells = 0;
    for (const id of deck) {
      if (seen.has(id)) continue;
      if (!this.save.unlocks.units.includes(id)) continue;
      if (getUnit(id).spell) {
        if (spells >= 2) continue; // 术法卡最多带 2 张（design §3.3.1）
        spells++;
      }
      seen.add(id);
      out.push(id);
      if (out.length >= 6) break;
    }
    if (!out.length) {
      out.push('swordsman');
      if (this.save.unlocks.units.includes('militia')) out.push('militia');
      if (this.save.unlocks.units.includes('archer')) out.push('archer');
    }
    return out;
  }

  getDeckForLevel(level) {
    if (level && level.fixedDeck) return level.fixedDeck.slice();
    return this.normalizeDeck(this.save.deck.slice());
  }

  getWorkingDeck(level, keep = false) {
    if (keep) return this.workingDeck.slice();
    if (level && level.fixedDeck) return level.fixedDeck.slice();
    return this.workingDeck.slice();
  }

  putDeckCard(id, slot) {
    const level = this.currentLevel;
    if (!level || level.fixedDeck) return;
    if (!this.save.unlocks.units.includes(id)) return;
    if (this.workingDeck.includes(id)) {
      this.ui.toast('该卡已在卡组中');
      return;
    }
    if (getUnit(id).spell && !this.workingDeck.includes(id)) {
      const spellCount = this.workingDeck.filter((x) => getUnit(x).spell).length;
      const replacingSpell = slot !== null && slot !== undefined && slot >= 0 && slot < this.workingDeck.length && getUnit(this.workingDeck[slot]).spell;
      if (spellCount >= 2 && !replacingSpell) {
        this.ui.toast('术法卡最多携带 2 张');
        return;
      }
    }
    if (slot !== null && slot !== undefined && slot >= 0 && slot < 6) {
      if (slot < this.workingDeck.length) this.workingDeck[slot] = id;
      else this.workingDeck.push(id);
    } else if (this.workingDeck.length < 6) {
      this.workingDeck.push(id);
    } else {
      this.ui.toast('卡组已满，先移除一张');
      return;
    }
    this.workingDeck = [...new Set(this.workingDeck)].slice(0, 6);
    this.save.deck = this.workingDeck.slice();
    this.scheduleSave();
  }

  removeDeckCard(index) {
    if (!this.currentLevel || this.currentLevel.fixedDeck) return;
    if (index >= 0 && index < this.workingDeck.length) {
      this.workingDeck.splice(index, 1);
      this.save.deck = this.workingDeck.slice();
      this.ui.refreshPrepAfterDeck();
      this.scheduleSave();
    }
  }

  clearDeck() {
    if (!this.currentLevel || this.currentLevel.fixedDeck) return;
    this.workingDeck = [];
    this.save.deck = [];
    this.ui.refreshPrepAfterDeck();
    this.scheduleSave();
  }

  recommendDeck() {
    const level = this.currentLevel;
    if (!level || level.fixedDeck) return;
    const unlockedAll = this.save.unlocks.units.map(getUnit);
    // 默认只选近战/远程/建筑，但如果关卡 tip 提到了「术法」或 id≥4（本关起可带术法），则把法术卡也纳入候选
    const tipMentionsSpell = (level.tip || '').includes('术法') || (level.tutorial || '').includes('spell') || level.id >= 4;
    const unlocked = unlockedAll.filter((u) => tipMentionsSpell || !u.spell);
    const unlockedSpells = unlockedAll.filter((u) => u.spell && this.save.unlocks.units.includes(u.id));
    const enemyTags = new Set();
    let enemyCav = 0;
    for (const w of level.waves || []) {
      for (const g of w.units) {
        const u = getUnit(g.type);
        for (const t of u.tags) enemyTags.add(t);
        if (u.tags.includes('cavalry')) enemyCav += g.count;
      }
    }
    const picked = [];
    const pick = (u) => {
      if (!u) return false;
      if (!this.save.unlocks.units.includes(u.id)) return false;
      if (picked.includes(u.id)) return false;
      picked.push(u.id);
      return true;
    };
    const find = (ids, pool = unlocked) => {
      for (const id of ids) {
        const u = pool.find((x) => x.id === id);
        if (u) return u;
      }
      return null;
    };
    const tank = find(['heavyguard', 'swordshield', 'shield', 'spearman', 'swordsman']);
    pick(tank);
    const dps = find(['modao', 'swordsman', 'trapbattalion', 'swordshield']);
    pick(dps);
    pick(find(['archer', 'crossbow', 'strongbow', 'javelineer', 'fireoil', 'axethrower']));
    if (enemyCav >= 3) pick(find(['spearman', 'barricade', 'heavyguard']));
    pick(find(['arrowtower', 'repeater', 'trebuchet', 'drum', 'tent']));
    // 法术卡：如果关卡提示了术法，优先推荐一张（箭雨/雷霆/火龙/离间）
    if (tipMentionsSpell && unlockedSpells.length) {
      const spell = find(['jianyu', 'jinglei', 'liaoyuan', 'fubing', 'huichun'], unlockedSpells);
      if (spell) pick(spell);
    } else {
      pick(find(['lightcav', 'cataphract', 'whitehorse', 'assassin', 'standard', 'medic', 'strategist']));
    }
    const fallback = [...unlocked].sort((a, b) => (b.unlockLevel || 1) - (a.unlockLevel || 1));
    for (const u of fallback) {
      if (picked.length >= 6) break;
      pick(u);
    }
    // 如果还没满 6 张且有可用法术卡，补一张
    if (picked.length < 6 && unlockedSpells.length) {
      const spell = find(['jianyu', 'jinglei', 'liaoyuan', 'fubing', 'huichun'], unlockedSpells);
      pick(spell);
    }
    this.workingDeck = picked.slice(0, 6);
    this.save.deck = this.workingDeck.slice();
    this.ui.refreshPrepAfterDeck();
    this.ui.toast('已按敌情推荐卡组');
    this.scheduleSave();
  }

  deckBonusLabels(deck) {
    return deckBonusLabels(deck || []);
  }

  selectHero(id) {
    if (!this.save.unlocks.heroes.includes(id)) return;
    this.save.hero.selected = id;
    this.selectedHeroId = id;
    this.scheduleSave();
  }

  // ---------------- 战斗 ----------------
  beginBattleFromPrep() {
    this.pushScreenHistory("screen-battle");
    if (!this.currentLevel) return;
    const level = this.currentLevel;
    if (level.fixedDeck) {
      this.startBattle(level, level.fixedHero || this.selectedHeroId, level.fixedDeck.slice());
      return;
    }
    const deck = this.normalizeDeck(this.workingDeck);
    if (deck.length < 2) {
      this.ui.toast('至少选择 2 张卡');
      return;
    }
    this.save.deck = deck.slice();
    this.save.hero.selected = this.selectedHeroId;
    if (level.isEndless) {
      const extraOpts = { savedEndlessState: this._pendingEndlessSavedState || null };
      this._pendingEndlessSavedState = null;
      this.startBattle(level, this.selectedHeroId, deck, extraOpts);
    } else {
      this.startBattle(level, this.selectedHeroId, deck);
    }
  }

  openEndlessPrep(continueSaved = false) {
    this.pushScreenHistory("screen-prep");
    const level = EndlessManager.createEndlessLevel();
    this.currentLevelId = 999;
    this.currentLevel = level;
    let savedState = null;
    if (continueSaved) {
      savedState = EndlessManager.loadProgress();
    }
    this._pendingEndlessSavedState = savedState;

    if (savedState && savedState.heroId && this.save.unlocks.heroes.includes(savedState.heroId)) {
      this.selectedHeroId = savedState.heroId;
    } else {
      this.selectedHeroId = this.save.hero.selected || 'zhaoyun';
    }
    if (!this.save.unlocks.heroes.includes(this.selectedHeroId)) this.selectedHeroId = 'zhaoyun';

    if (savedState && savedState.deckIds && Array.isArray(savedState.deckIds) && savedState.deckIds.length >= 2) {
      this.workingDeck = this.normalizeDeck(savedState.deckIds);
    } else {
      this.workingDeck = this.normalizeDeck(this.save.deck.slice());
    }
    if (this.workingDeck.length < 2) {
      this.workingDeck = ['swordsman', 'spearman', 'archer', 'shield', 'cavalry', 'arrowtower'];
    }
    this.ui.renderPrep(level);
    this.startMenuMusic();
  }

  startEndlessMode(continueSaved = false) {
    if (!EndlessManager.isUnlocked(this.save)) {
      this.ui.toast('墨影试炼尚未解锁，需通关主线第20关方可开启！');
      return;
    }
    if (!continueSaved && EndlessManager.getRemainingTickets(this.save) <= 0) {
      this.ui.openEndlessTicketModal();
      return;
    }
    // 遵照用户指示：进入无尽模式前先进入点将台（出战卡组与主将选择界面）
    this.openEndlessPrep(continueSaved);
  }

  startDailyChallenge(info) {
    const level = DailyChallengeManager.createBattleLevel(info.levelId, info.modifiers);
    const deck = this.save.deck && this.save.deck.length === 6 ? this.save.deck : ['swordsman', 'spearman', 'archer', 'shield', 'cavalry', 'arrowtower'];
    this.startBattle(level, this.selectedHeroId, deck);
  }

  async refreshDailyChallenge() {
    const ok = await this.platform.showAdWithFallback(
      'daily_refresh',
      () => {
        DailyChallengeManager.refreshModifiers();
        this.ui.toast('词条刷新成功！');
        this.ui.renderDailyView();
      },
      () => {
        DailyChallengeManager.refreshModifiers();
        this.ui.toast('已为您发放保底刷新！');
        this.ui.renderDailyView();
      }
    );
  }

  startBattle(level, heroId, deck, extraOpts = {}) {
    if (this.firstGuide) this.firstGuide.hide();
    
    this.destroyBattle();
    this.ui.hidePause();
    this.ui.hideResult();
    this.ui.showScreen('screen-battle');
    this.lastBattleConfig = { levelId: level.id, heroId, deck: deck.slice(), extraOpts };
    if (level.isEndless && (!extraOpts || !extraOpts.savedEndlessState)) {
      EndlessManager.consumeTicket(this.save);
      this.persist();
      this.ui.refreshHome();
    }
    this.persist();
    const launch = () => {
      try {
        this.battle = new Battle({
          canvas: document.getElementById('battle-canvas'),
          ui: this.ui,
          level,
          heroId,
          advisorId: this.save.hero.advisor || null,
          deck,
          save: this.save,
          onFinish: (result) => this.handleBattleFinish(result),
          onRestart: () => this.restartBattle(),
          onRetreat: () => this.retreatBattle(),
          onBountyEvent: (type, amt) => this.reportBountyProgress(type, amt),
          ...extraOpts,
        });
      } catch (e) {
        console.error('Battle initialization error:', e);
        if (level && level.isEndless) {
          this.openEndlessPrep();
        } else if (level && level.id) {
          this.openPrep(level.id);
        } else {
          this.ui.showScreen('screen-home');
        }
        this.ui.toast('战场加载异常，已返回点将台');
      }
    };
    setTimeout(launch, 30);
    audio.stopMusic();
  }

  handleBattleFinish(result) {
    const save = this.save;
    const level = result.level;
    save.stats.battles = (save.stats.battles || 0) + 1;
    save.player.playTime = (save.player.playTime || 0) + (result.time || 0);
    save.stats.kills = (save.stats.kills || 0) + (result.kills || 0);

    // 推进山河悬赏进度（日赏与周赏）
    this.reportBountyProgress('battles', 1);
    if (result.kills) this.reportBountyProgress('kills', result.kills);
    if (result.win) this.reportBountyProgress('wins', 1);
    if (result.stars) this.reportBountyProgress('stars', result.stars);
    if (result.isEndless) this.reportBountyProgress('endless_wave', result.waves || 0);
    if (result.baseDamage) this.reportBountyProgress('base_damage', result.baseDamage);
    // 机制关额外奖励结算（design §5.2）
    if (result.win) {
      if (level && level.id === 20 && !save.guide?.endlessUnlockedModalShown) {
        save.guide = save.guide || {};
        save.guide.endlessUnlockedModalShown = true;
        this.persist();
        setTimeout(() => {
          if (this.firstGuide) this.firstGuide.triggerEndlessUnlockGuide();
          else if (this.ui) this.ui.openEndlessUnlockModal();
        }, 600);
      }
      if (result.bonusTokens) {
        save.tokens = (save.tokens || 0) + result.bonusTokens;
        this.ui.toast(`机制关额外奖赏：+${result.bonusTokens} 将令`);
      }
      if (result.bonusSupplies) {
        save.camp.supplies = (save.camp.supplies || 0) + result.bonusSupplies;
        this.ui.toast(`坚守阵地奖赏：+${result.bonusSupplies} 军需`);
      }
      if (result.bonusFragments) {
        save.fragments = (save.fragments || 0) + result.bonusFragments;
        this.ui.toast(`夜袭捷报赏赐：+${result.bonusFragments} 墨迹碎片`);
      }
    }

    // 无尽模式（墨影试炼）结算
    if (result.isEndless) {
      const isNewRecord = EndlessManager.saveMaxWave(result.waves || 0);
      const r = result.rewards || EndlessManager.calculateRewards(result);
      result.rewards = r;
      if (r.mobao > 0) save.mobao = (save.mobao || 0) + r.mobao;
      if (r.tokens > 0) save.tokens = (save.tokens || 0) + r.tokens;
      this.persist();
      this.ui.toast(`墨影试炼结算：坚持 ${result.waves || 0} 波${isNewRecord ? '（新纪录！）' : ''}，获得 ${r.mobao || 0} 墨宝、${r.tokens || 0} 将令！`);
      this.ui.showResult(result);
      return;
    }

    // 每日挑战结算
    if (level.isDailyChallenge && result.win) {
      DailyChallengeManager.markCompleted();
      save.camp.supplies = (save.camp.supplies || 0) + 30;
      save.tokens = (save.tokens || 0) + 10;
      save.fragments = (save.fragments || 0) + 5;
      this.ui.toast('每日挑战大捷！获得 30 军需、10 将令、5 墨迹碎片！');
    }

    const firstClear = result.win && !(save.progress.stars[level.id] > 0);
    // 推进日常任务与每周胜场（design §6.2）
    if (save.dailyQuests) {
      if (result.win) {
        progressQuest(save.dailyQuests, 'win_battle', 1);
        save.dailyQuests.weeklyWins = (save.dailyQuests.weeklyWins || 0) + 1;
        if (!save.dailyQuests.firstWinClaimed) {
          save.dailyQuests.firstWinClaimed = true;
          save.tokens = (save.tokens || 0) + DAILY_FIRST_WIN_TOKENS;
          result.firstWinTokens = DAILY_FIRST_WIN_TOKENS;
        }
      }
      progressQuest(save.dailyQuests, 'deploy_units', result.unitsDeployed || 10);
      progressQuest(save.dailyQuests, 'cast_skills', 1);
    }
    // 主将与军师增加熟练度
    const mHero = save.hero.selected;
    const aHero = save.hero.advisor;
    if (mHero) {
      save.hero.mastery = save.hero.mastery || {};
      save.hero.mastery[mHero] = Math.min(10, (save.hero.mastery[mHero] || 1) + (result.win ? 1 : 0));
    }
    if (aHero) {
      save.hero.mastery = save.hero.mastery || {};
      save.hero.mastery[aHero] = Math.min(10, (save.hero.mastery[aHero] || 1) + (result.win ? 1 : 0));
    }
    let newUnits = [];
    let newHeroes = [];
    let totalGain = 0;
    let suppliesGain = 0;

    if (result.win) {
      save.stats.wins = (save.stats.wins || 0) + 1;
      const prevStars = save.progress.stars[level.id] || 0;
      save.progress.stars[level.id] = Math.max(prevStars, result.stars);
      if (!save.progress.bestTime[level.id] || result.time < save.progress.bestTime[level.id]) {
        save.progress.bestTime[level.id] = result.time;
      }
      if (firstClear) {
        for (const uid of (level.unlocks && level.unlocks.units) || []) {
          if (!save.unlocks.units.includes(uid)) {
            save.unlocks.units.push(uid);
            newUnits.push(uid);
          }
        }
        for (const hid of (level.unlocks && level.unlocks.heroes) || []) {
          if (!save.unlocks.heroes.includes(hid)) {
            save.unlocks.heroes.push(hid);
            newHeroes.push(hid);
          }
        }
        // 首通 +5 将令（#8，结算可看广告双倍）
        save.tokens = (save.tokens || 0) + 5;
      }
      // 大本营军需：首通 20+关卡号，重复通关固定 5（design §11.7）
      suppliesGain = campSuppliesForWin(level.id, firstClear);
      save.camp.supplies = (save.camp.supplies || 0) + suppliesGain;
      // 墨宝掉落：每一关都会掉落 3-5 个墨宝（局外升级将领必备，广告可双倍）
      const mobaoGain = Math.floor(Math.random() * 3) + 3;
      save.mobao = (save.mobao || 0) + mobaoGain;
      result.mobaoGain = mobaoGain;
      result.mobaoDoubled = false;
      // 第 4 关首通后进入军府巡礼（design §5.7）
      if (level.id === 4 && firstClear && !save.settings.tourDone) {
        save.settings.tourPending = true;
        result.showTour = true;
      }
      // 第 3 关首通后：回主城时引导去点将台升阶主将
      if (level.id === 3 && firstClear && !save.settings.heroGuideDone) {
        save.settings.heroGuidePending = true;
      }
      const score = (result.baseScore || 0) + (firstClear ? 100 : 0);
      const prevBest = save.progress.bestScore[level.id] || 0;
      if (score > prevBest) {
        save.progress.bestScore[level.id] = score;
        totalGain = score - prevBest;
      }
      save.progress.unlockedLevel = Math.min(LEVELS.length, Math.max(save.progress.unlockedLevel, level.id + 1));
      // 英雄熟练度
      const hid = result.heroId;
      const curLv = save.hero.mastery[hid] || 1;
      if (curLv < 10) {
        const xp = (save.hero.masteryXp[hid] || 0) + 1;
        if (xp >= 5) {
          save.hero.mastery[hid] = curLv + 1;
          save.hero.masteryXp[hid] = 0;
        } else {
          save.hero.masteryXp[hid] = xp;
        }
      }
      if (!level.fixedDeck) {
        save.deck = result.deck.slice();
      }
      save.progress.maxWave = Math.max(save.progress.maxWave || 0, 0);
    } else {
      save.progress.maxWave = save.progress.maxWave || 0;
    }

    this.recomputeTotals(save);
    if (save.progress.totalScore > (save.leaderboardBest || 0)) {
      save.leaderboardBest = save.progress.totalScore;
      this.platform.submitScore(save.progress.totalScore).catch(() => {});
    }
    const nextId = result.win && level.id < LEVELS.length && level.id + 1 <= save.progress.unlockedLevel
      ? level.id + 1 : null;
    result.firstClear = firstClear;
    result.newUnits = newUnits;
    result.newHeroes = newHeroes;
    result.tokensGain = firstClear ? 5 : 0;
    result.tokensDoubled = false;
    result.suppliesGain = suppliesGain;
    result.totalGain = totalGain;
    result.nextId = nextId;
    result.score = save.progress.bestScore[level.id] || 0;
    this.ui.showResult(result);
    this.persist();
    this.ui.refreshHome();
    this.ui.refreshLeaderboard();
    if (this.firstGuide && !this.firstGuide.done && result.win && result.level && result.level.id === 1) {
      setTimeout(() => {
        if (this.firstGuide) this.firstGuide.show(3);
      }, 420);
    }
  }

  restartBattle() {
    if (!this.lastBattleConfig) return;
    let lv = getLevel(this.lastBattleConfig.levelId);
    if (!lv && this.lastBattleConfig.levelId === 999) {
      lv = EndlessManager.createEndlessLevel();
    }
    if (!lv) return;
    this.ui.hideResult();
    this.ui.hidePause();
    this.startBattle(lv, this.lastBattleConfig.heroId, this.lastBattleConfig.deck, this.lastBattleConfig.extraOpts);
  }

  // ---------------- 祈将台 / 将令（#8，design §11.4） ----------------
  gachaState() {
    const today = new Date().toLocaleDateString('zh-CN');
    const g = this.save.gacha;
    if (g.date !== today) {
      g.date = today;
      g.freeUsed = false;
      g.adUsed = 0;
    }
    return g;
  }

  openGacha() {
    this.startMenuMusic();
    this.ui.openGacha();
  }

  // 祈愿：免费 1 次/天；广告额外 3 次/天；每次随机 1–50 将令
  async drawGacha(isAd) {
    const g = this.gachaState();
    if (!isAd && g.freeUsed) {
      this.ui.toast('今日免费祈愿已用完');
      return null;
    }
    if (isAd && g.adUsed >= 3) {
      this.ui.toast('今日广告祈愿次数已用完');
      return null;
    }
    if (isAd) {
      const ok = await this.platform.showRewardedAd();
      if (!ok) {
        this.ui.toast('广告未完整观看，祈愿无效');
        return null;
      }
      g.adUsed++;
    } else {
      g.freeUsed = true;
    }
    // 首次祈愿额外馈赠：固定 100 将令
    let n = 1 + Math.floor(Math.random() * 50);
    if (!this.save.gacha.firstBoost) {
      this.save.gacha.firstBoost = true;
      n = 100;
    }
    this.save.tokens = (this.save.tokens || 0) + n;
    this.persist();
    return n;
  }

  // 以令召将：100 将令指定召唤一位奖池英雄
  redeemHero(id) {
    const hero = getHero(id);
    if (!hero || !hero.gacha) return false;
    if (this.save.unlocks.heroes.includes(id)) return false;
    if ((this.save.tokens || 0) < 100) {
      this.ui.toast('将令不足 100');
      return false;
    }
    this.save.tokens -= 100;
    this.save.unlocks.heroes.push(id);
    this.persist();
    this.recomputeTotals(this.save);
    return true;
  }

  // 点兵池：以令点募关卡无法获取的兵种（死士 / 半仙）
  redeemUnit(id) {
    const unit = getUnit(id);
    if (!unit || !unit.gachaUnit) return false;
    if (this.save.unlocks.units.includes(id)) return false;
    if ((this.save.tokens || 0) < 100) {
      this.ui.toast('将令不足 100');
      return false;
    }
    this.save.tokens -= 100;
    this.save.unlocks.units.push(id);
    this.persist();
    return true;
  }

  // 胜利结算广告双倍（将令与墨宝）
  async doubleResultTokens(result) {
    if (!result || result.tokensDoubled) return false;
    let tokensGain = result.tokensGain || 0;
    let mobaoGain = result.mobaoGain || 0;
    if (result.isEndless && result.rewards) {
      tokensGain = result.rewards.tokens || 0;
      mobaoGain = result.rewards.mobao || 0;
    }
    if (!tokensGain && !mobaoGain) return false;
    const ok = await this.platform.showAdWithFallback(
      'win_double',
      () => {
        result.tokensDoubled = true;
        result.mobaoDoubled = true;
        if (result.tokensGain) this.save.tokens = (this.save.tokens || 0) + result.tokensGain;
        if (result.mobaoGain) this.save.mobao = (this.save.mobao || 0) + result.mobaoGain;
        this.persist();
        this.ui.toast('奖励（墨宝与将令）已成功翻倍！');
        if (this.ui.refreshResultTokens) this.ui.refreshResultTokens();
      },
      () => {
        result.tokensDoubled = true;
        result.mobaoDoubled = true;
        const halfTokens = result.tokensGain ? Math.max(1, Math.floor(result.tokensGain * 0.5)) : 0;
        const halfMobao = result.mobaoGain ? Math.max(1, Math.floor(result.mobaoGain * 0.5)) : 0;
        if (halfTokens) this.save.tokens = (this.save.tokens || 0) + halfTokens;
        if (halfMobao) this.save.mobao = (this.save.mobao || 0) + halfMobao;
        this.persist();
        this.ui.toast(`广告未填充，已发放 50% 保底奖励`);
        if (this.ui.refreshResultTokens) this.ui.refreshResultTokens();
      }
    );
    return ok;
  }

  // ---------------- 局外英雄永久升级（消耗墨宝） ----------------
  upgradeHeroOutside(heroId) {
    const h = getHero(heroId);
    if (!h) return { success: false, reason: '未找到该英雄' };
    if (!this.save.unlocks.heroes.includes(heroId)) {
      return { success: false, reason: '英雄尚未解锁' };
    }
    const curLv = Math.max(1, Math.min(11, Math.floor(Number(this.save.hero.levels?.[heroId]) || 1)));
    if (curLv >= 11) {
      return { success: false, reason: '已达到最高阶（满级 11 级 满阶战神）' };
    }
    const cost = getHeroUpgradeCost(curLv);
    const curMobao = this.save.mobao || 0;
    if (curMobao < cost) {
      return { success: false, reason: `墨宝不足，需 ${cost} 墨宝（当前 ${curMobao}）`, cost, needed: cost - curMobao };
    }
    this.save.mobao = curMobao - cost;
    this.save.hero.levels[heroId] = curLv + 1;
    this.persist();
    return {
      success: true,
      heroId,
      newLevel: curLv + 1,
      cost,
      remainingMobao: this.save.mobao,
    };
  }

  // ---------------- 大本营（军令营，design §11.7） ----------------
  openCamp() {
    this.ui.refreshCamp();
    this.ui.showScreen('screen-camp');
    this.startMenuMusic();
  }

  campState() {
    const camp = this.save.camp;
    const maxed = camp.level >= CAMP_MAX_LEVEL;
    return {
      level: camp.level,
      max: CAMP_MAX_LEVEL,
      energyMax: campEnergyMax(camp.level),
      nextEnergyMax: maxed ? campEnergyMax(camp.level) : campEnergyMax(camp.level + 1),
      regen: campRegen(camp.level),
      nextRegen: maxed ? campRegen(camp.level) : campRegen(camp.level + 1),
      cost: maxed ? 0 : campCost(camp.level),
      supplies: camp.supplies,
      maxed,
      daily: CAMP_DAILY_SUPPLIES,
      claimedToday: camp.lastClaim === new Date().toLocaleDateString('zh-CN'),
    };
  }

  upgradeCamp() {
    const st = this.campState();
    if (st.maxed) {
      this.ui.toast('大本营已满级');
      return;
    }
    if (st.supplies < st.cost) {
      this.ui.toast(`军需不足，还差 ${st.cost - st.supplies}`);
      return;
    }
    this.save.camp.supplies -= st.cost;
    this.save.camp.level += 1;
    audio.gong(null, 1.15);
    this.persist();
    this.ui.refreshCamp();
    this.ui.refreshHome();
    this.ui.toast(`大本营升至 ${this.save.camp.level} 级 · 军令上限 ${campEnergyMax(this.save.camp.level)}`);
  }

  claimDailySupplies() {
    const st = this.campState();
    if (st.claimedToday) {
      this.ui.toast('今日军需已领取');
      return;
    }
    this.save.camp.lastClaim = new Date().toLocaleDateString('zh-CN');
    this.save.camp.supplies += CAMP_DAILY_SUPPLIES;
    audio.gong(null, 1.0);
    this.persist();
    this.ui.refreshCamp();
    this.ui.toast(`领取军需 +${CAMP_DAILY_SUPPLIES}`);
  }

  nextBattle(nextId) {
    if (!nextId) return;
    this.destroyBattle();
    this.openPrep(nextId);
  }

  retreatBattle() {
    this.destroyBattle();
    this.openLevels();
  }

  returnHome() {
    this.ui.showScreen('screen-home');
    this.ui.refreshHome();
    this.startMenuMusic();
    this.maybeStartHeroGuide();
  }

  // 第三关通关后的点将升阶引导（回到主城时触发）
  maybeStartHeroGuide() {
    const s = this.save.settings;
    if (!s.heroGuidePending || s.heroGuideDone) return;
    s.heroGuidePending = false;
    this.persist();
    setTimeout(() => {
      if (this.firstGuide) this.firstGuide.startHeroUpgradeGuide();
    }, 260);
  }

  returnToLevels() {
    this.destroyBattle();
    if (this.firstGuide && !this.firstGuide.done && this.firstGuide.step === 3) {
      this.returnHome();
      setTimeout(() => {
        if (this.firstGuide) this.firstGuide.show(4);
      }, 120);
      return;
    }
    // 第三关首通：先回主城，再点将升阶
    if (this.save.settings.heroGuidePending) {
      this.returnHome();
      return;
    }
    this.openLevels();
  }

  destroyBattle() {
    if (this.battle) {
      try { this.battle.destroy(); } catch (e) { console.error(e); }
      this.battle = null;
    }
    this.ui.destroyBattleUI();
  }

  // ---------------- 设置 / 排行榜 ----------------
  toggleMusic() {
    const s = this.save.settings;
    s.music = !s.music;
    audio.setMusicEnabled(s.music);
    if (s.music && !this.battle) audio.startMusic('menu');
    this.ui.syncSettingsUI();
    this.ui.syncPauseSettings();
    this.persist();
    audio.click();
  }

  toggleSfx() {
    const s = this.save.settings;
    s.sfx = !s.sfx;
    audio.setSfxEnabled(s.sfx);
    this.ui.syncSettingsUI();
    this.ui.syncPauseSettings();
    this.persist();
    audio.click();
  }

  setQuality(q) {
    this.save.settings.quality = q;
    if (this.battle && this.battle.scene) this.battle.scene.setQuality(q);
    this.ui.syncSettingsUI();
    this.persist();
    this.ui.toast('画质将在下一帧生效');
  }

  openNativeLeaderboard() {
    if (!this.platform.hasLeaderboard) {
      this.ui.toast('请在 TapTap 客户端中查看全服排行');
      return;
    }
    audio.click();
    this.platform.openLeaderboard().then((ok) => {
      if (!ok) this.ui.toast('排行榜打开失败，请稍后再试');
    });
  }

  confirmResetSave() {
    this.ui.confirm('清空存档', '将清除关卡通度、卡牌解锁、战功与卡组。此操作不可撤销。', () => {
      const oldUuid = this.save.cloudArchiveUUID;
      this.save = defaultSave();
      this.save.cloudArchiveUUID = oldUuid || '';
      this.save.updatedAt = Date.now();
      this.selectedHeroId = 'zhaoyun';
      this.workingDeck = [];
      this.ui.hideConfirm();
      this.ui.refreshHome();
      this.ui.refreshSettings();
      this.ui.showScreen('screen-home');
      this.persist();
      this.ui.toast('存档已清空');
      this.startMenuMusic();
    });
  }

  cloudStatusText() {
    if (this.save._loadedFromCloud) {
      return this.platform.hasCloud ? '云存档已同步' : '本地存档';
    }
    if (!this.platform.isTap) return '浏览器预览 · 本地存档';
    if (this.platform.cloudStatus === 'synced') return '云存档已同步';
    if (this.platform.cloudStatus === 'error') return '云同步失败 · 已本地保存';
    return 'TapTap · 本地存档';
  }

  scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.persist();
    }, 500);
  }

  persist(immediate = false) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this.save.updatedAt = Date.now();
    this.platform.save(this.save, { cloud: immediate ? true : false }).then(() => {
      this.ui.syncSettingsUI();
      if (this.ui.homeCloud) this.ui.homeCloud.textContent = this.cloudStatusText();
    }).catch(() => {});
  }
}

const app = new App();
window.__MOZHEN_APP__ = app;
app.boot();

// 界面：主界面、关卡、卡组、战斗 HUD、图鉴、结算、排行榜、设置
import * as THREE from '../lib/three.module.js';
import { UNITS, RARITY, getUnit } from './data/units.js?v=1.93';
import { HEROES, GACHA_HEROES, getHero, getAdvisorBonus } from './data/heroes.js?v=1.93';
import { BARRACKS_MAX_LEVEL, WORKSHOP_MAX_LEVEL, barracksCost, workshopCost, barracksAtkBonus, workshopBuildingHpBonus, workshopCdReduction } from './data/camp.js?v=1.93';
import { DAILY_QUEST_TEMPLATES, WEEKLY_CHEST_CONFIG } from './data/daily-quests.js?v=1.93';
import { CHAPTERS, LEVELS, LEVEL_NAMES, getLevel } from './data/levels.js?v=1.93';
import { createUnitModel, createHeroModel } from './models.js?v=1.93';
import { audio } from './audio.js?v=1.93';
import { EndlessManager } from './data/endless-manager.js?v=1.93';
import { BountyManager, getDailyResetCountdown, getWeeklyResetCountdown } from './data/bounty-manager.js?v=1.93';
// ---- 功能模块（按界面职责拆分）----
import { uiBattleHud } from './ui/battle-hud.js?v=1.93';
import { uiGacha } from './ui/gacha.js?v=1.93';
import { uiCodex } from './ui/codex.js?v=1.93';
import { uiCounters } from './ui/counters-ui.js?v=1.93';

import { HERO_XP, TAG_NAMES, pct, fmtTime } from './ui/helpers.js?v=1.93';
import { specialText } from './ui/card-text.js?v=1.93';

export class UI {
  constructor() {
    this.app = null;
    this.battle = null;
    this.hudCards = new Map();
    this.thumbCache = new Map();
    this.thumbRenderer = null;
    this.thumbScene = null;
    this.thumbCamera = null;
    this.bannerTimer = null;
    this.guideTarget = null;
    this.codexTab = 'units';
    this.codexSelected = { units: 'swordsman', heroes: 'zhaoyun' };
    this.activeChapter = 1;
    this.selectedLevelId = 1;
    this.workingDeck = [];
    this.activeSlot = null;
    this.currentPrepLevel = null;
    this.resultNextId = null;
    this.confirmAction = null;
    this.cache();
    this.bindStatic();
  }

  setApp(app) {
    this.app = app;
  }

  $(id) {
    return document.getElementById(id);
  }

  cache() {
    const ids = [
      'screen-loading', 'screen-title', 'screen-home', 'screen-levels', 'screen-prep',
      'screen-battle', 'screen-codex', 'screen-leaderboard', 'screen-settings',
      'cloud-hint', 'home-player', 'home-score', 'home-stars', 'home-cleared',
      'home-chapter', 'home-next-level', 'home-hero-art', 'home-hero-name',
      'home-hero-title', 'home-hero-passive', 'home-cloud', 'home-hero-showcase',
      'chapter-tabs', 'level-path', 'level-detail', 'prep-title', 'prep-enemy', 'prep-tip',
      'prep-heroes', 'deck-slots', 'deck-count', 'deck-bonus', 'card-pool',
      'btn-start-battle', 'btn-recommend', 'btn-clear-deck', 'codex-grid', 'codex-detail',
      'tab-units', 'tab-heroes', 'lb-score', 'lb-stats', 'lb-note', 'btn-open-leaderboard',
      'switch-music', 'switch-sfx', 'quality-btns', 'settings-cloud',
      'battle-canvas', 'weather-overlay', 'card-tray', 'base-player-fill', 'base-enemy-fill',
      'base-player-text', 'base-enemy-text', 'wave-index', 'wave-label', 'boss-bar', 'wave-timeline',
      'boss-name', 'boss-fill', 'hero-panel', 'hero-seal', 'hud-hero-name', 'hud-hero-level',
      'hero-xp-fill', 'hud-hero-passive', 'energy-fill', 'energy-text', 'deck-bonus-hud',
      'gadget-btn', 'gadget-name', 'gadget-charges', 'gadget-cd',
      'skill-btn', 'skill-name', 'skill-cd', 'pause-btn', 'speed-btn', 'battle-banner',
      'banner-main', 'banner-sub', 'guide-tip', 'guide-text', 'zone-hint', 'battle-flash',
      'pause-modal', 'result-modal', 'result-title', 'result-stars', 'result-quote',
      'result-stats', 'result-unlocks', 'btn-result-retry', 'btn-result-next', 'btn-result-back',
      'btn-resume', 'btn-restart', 'btn-retreat', 'btn-pause-music', 'btn-pause-sfx',
      'toast-layer', 'confirm-modal', 'confirm-title', 'confirm-text', 'btn-confirm-cancel',
      'btn-confirm-ok', 'btn-enter', 'btn-campaign', 'btn-heroes', 'btn-codex',
      'btn-leaderboard-top', 'btn-settings-top', 'btn-replay-tutorial', 'btn-reset-save',
      'screen-gacha', 'btn-gacha', 'gacha-tokens', 'gacha-grid', 'gacha-roll-num',
      'gacha-roll-label', 'gacha-free-left', 'gacha-ad-left', 'btn-gacha-free', 'btn-gacha-ad',
      'gacha-ink', 'gacha-tabs', 'gacha-unit-grid', 'gacha-pool-hero-title', 'gacha-pool-unit-title', 'btn-result-double', 'hero-reveal', 'reveal-art', 'reveal-name', 'reveal-title',
      'reveal-quote', 'btn-reveal-close', 'btn-dev-panel', 'input-balance-code', 'input-dev-code', 'btn-dev-code', 'prep-hero-skill', 'pool-detail', 'hud-hero-skill',
      'btn-hero-toggle', 'prep-hero-current',
      'btn-result-tour', 'btn-replay-tour',
      'btn-camp', 'screen-camp', 'camp-level', 'camp-max', 'camp-supplies', 'camp-progress-fill',
      'camp-energy', 'camp-energy-next', 'camp-regen', 'camp-regen-next', 'camp-cost', 'camp-upgrade',
      'camp-daily', 'camp-hint',
      'hud-hero-hp-track', 'hud-hero-hp-fill', 'hud-hero-hp-text',
      'slider-hero-hp', 'val-hero-hp', 'slider-hero-atk', 'val-hero-atk', 'slider-hero-armor', 'val-hero-armor',
      'slider-hero-regen', 'val-hero-regen', 'slider-hero-aggro', 'val-hero-aggro', 'btn-reset-hero-tuning',
      'btn-toggle-pause-tune', 'pause-tune-content',
      'pslider-hero-hp', 'pval-hero-hp', 'pslider-hero-atk', 'pval-hero-atk', 'pslider-hero-armor', 'pval-hero-armor',
      'pslider-hero-regen', 'pval-hero-regen', 'pslider-hero-aggro', 'pval-hero-aggro', 'pbtn-reset-hero-tuning',
      'val-codex-mobao',
      'home-bounty-section', 'home-bounty-summary', 'btn-home-claim-all', 'btn-open-bounty-all', 'home-bounty-list',
      'btn-bounty', 'home-bounty-badge', 'bounty-modal', 'btn-close-bounty', 'tab-bounty-daily', 'tab-bounty-weekly',
      'bounty-daily-timer', 'bounty-weekly-timer', 'bounty-modal-list', 'btn-modal-claim-all', 'btn-modal-close-bounty',
      'bounty-footer-hint',
      'top-res-supplies', 'top-res-mobao', 'top-res-tokens', 'top-res-tickets', 'btn-top-add-ticket',
      'btn-toggle-bounty-collapse', 'home-bounty-collapsed-bar', 'home-bounty-collapsed-summary', 'btn-expand-bounty', 'btn-collapsed-claim-all',
      'endless-home-badge', 'endless-home-lock', 'endless-ticket-modal', 'btn-close-ticket-modal', 'btn-ticket-cancel', 'btn-ticket-watch-ad',
      'endless-unlock-modal', 'btn-go-endless-first',
      'bounty-refresh-bar', 'bounty-refresh-count', 'btn-bounty-ad-refresh', 'btn-modal-claim-all-double',
      'reward-showcase-modal', 'reward-showcase-title', 'reward-showcase-sub', 'reward-showcase-seal', 'reward-items-container', 'reward-double-badge', 'btn-claim-reward-normal', 'btn-claim-reward-double',
    ];
    for (const id of ids) {
      const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this[key] = this.$(id);
    }
    this.screens = ['screen-loading', 'screen-title', 'screen-home', 'screen-levels', 'screen-prep', 'screen-battle', 'screen-codex', 'screen-leaderboard', 'screen-settings', 'screen-gacha', 'screen-camp'];
  }

  bindStatic() {
    this.btnEnter.onclick = () => this.app.enterGame();
    this.appBtn = {
      campaign: this.btnCampaign,
    };
    this.btnCampaign.onclick = () => this.app.openLevels();
    this.btnHeroes.onclick = () => this.app.openCodex('heroes');
    this.btnCodex.onclick = () => this.app.openCodex('units');
    this.btnGacha.onclick = () => this.app.openGacha();

    const triggerEndless = () => {
      // 1. 检测第20关通关解锁条件
      if (!EndlessManager.isUnlocked(this.app.save)) {
        this.toast('🔒 尚未解锁：需先荡平主线前20关，方可踏入墨影无尽试炼！');
        return;
      }
      // 2. 检测门票与每日试炼次数
      const tickets = EndlessManager.getRemainingTickets(this.app.save);
      if (tickets <= 0) {
        this.openEndlessTicketModal();
        return;
      }

      const saved = EndlessManager.loadProgress();
      if (saved && saved.wave >= 1) {
        this.confirm(
          '恢复墨影试炼进度',
          `检测到有暂存的试炼战局（第 ${saved.wave} 波，击杀 ${saved.kills || 0} 敌）。\n点击“确定”继续挑战，点击“取消”重新开启新试炼。`,
          () => {
            this.app.startEndlessMode(true);
          }
        );
        const cancelBtn = this.$('btn-confirm-cancel');
        if (cancelBtn) {
          const oldCancel = cancelBtn.onclick;
          cancelBtn.onclick = () => {
            EndlessManager.clearProgress();
            this.hideConfirm();
            this.app.startEndlessMode(false);
            cancelBtn.onclick = oldCancel;
          };
        }
      } else {
        this.app.startEndlessMode(false);
      }
    };
    this.triggerEndless = triggerEndless;

    const btnHomeEndless = document.getElementById('btn-home-endless');
    if (btnHomeEndless) btnHomeEndless.onclick = triggerEndless;
    const btnOpenEndless = document.getElementById('btn-open-endless');
    if (btnOpenEndless) btnOpenEndless.onclick = triggerEndless;

    // 顶部加号补门票
    if (this.btnTopAddTicket) {
      this.btnTopAddTicket.onclick = (e) => {
        e.stopPropagation();
        this.openEndlessTicketModal();
      };
    }
    const pillTickets = document.getElementById('pill-tickets');
    if (pillTickets) {
      pillTickets.onclick = () => this.openEndlessTicketModal();
    }

    // 悬赏折叠/展开按钮绑定
    if (this.btnToggleBountyCollapse) {
      this.btnToggleBountyCollapse.onclick = () => this.toggleHomeBountyCollapse();
    }
    if (this.btnExpandBounty) {
      this.btnExpandBounty.onclick = () => this.toggleHomeBountyCollapse(false);
    }
    if (this.btnCollapsedClaimAll) {
      this.btnCollapsedClaimAll.onclick = () => this.app.claimAllBounties();
    }

    // 门票弹窗关闭与看广告补票
    if (this.btnCloseTicketModal) this.btnCloseTicketModal.onclick = () => this.hideEndlessTicketModal();
    if (this.btnTicketCancel) this.btnTicketCancel.onclick = () => this.hideEndlessTicketModal();
    if (this.btnTicketWatchAd) {
      this.btnTicketWatchAd.onclick = async () => {
        const ok = await this.app.platform.showAdWithFallback(
          'endless_ticket',
          () => {
            EndlessManager.addAdTicket(this.app.save);
            this.app.persist();
            this.toast('🎉 观摩战阵完毕，已补充 1 次墨影试炼门票！');
            this.hideEndlessTicketModal();
            this.refreshHome();
            this.app.startEndlessMode(false);
          },
          () => {
            EndlessManager.addAdTicket(this.app.save);
            this.app.persist();
            this.toast('已为您发放保底试炼门票！');
            this.hideEndlessTicketModal();
            this.refreshHome();
            this.app.startEndlessMode(false);
          }
        );
      };
    }

    // 20关通关解锁弹窗
    if (this.btnGoEndlessFirst) {
      this.btnGoEndlessFirst.onclick = () => {
        if (this.endlessUnlockModal) this.endlessUnlockModal.style.display = 'none';
        triggerEndless();
      };
    }

    if (this.btnBounty) this.btnBounty.onclick = () => this.openBountyModal('daily');
    if (this.btnOpenBountyAll) this.btnOpenBountyAll.onclick = () => this.openBountyModal('daily');
    if (this.btnHomeClaimAll) this.btnHomeClaimAll.onclick = () => this.app.claimAllBounties();
    if (this.btnModalClaimAll) this.btnModalClaimAll.onclick = () => this.app.claimAllBounties();
    if (this.btnCloseBounty) this.btnCloseBounty.onclick = () => this.hideBountyModal();
    if (this.btnModalCloseBounty) this.btnModalCloseBounty.onclick = () => this.hideBountyModal();
    if (this.tabBountyDaily) this.tabBountyDaily.onclick = () => this.switchBountyTab('daily');
    if (this.tabBountyWeekly) this.tabBountyWeekly.onclick = () => this.switchBountyTab('weekly');
    if (this.bountyModal) {
      this.bountyModal.onclick = (e) => {
        if (e.target === this.bountyModal) this.hideBountyModal();
      };
    }

    // 手机端主将区默认收起，点「换将」展开/收起
    if (this.btnHeroToggle) {
      this.btnHeroToggle.onclick = (e) => {
        e.stopPropagation();
        const block = this.btnHeroToggle.closest('.prep-hero');
        if (!block) return;
        block.classList.toggle('open');
        this.btnHeroToggle.textContent = block.classList.contains('open') ? '收起' : '换将';
      };
    }
    this.btnCamp.onclick = () => this.app.openCamp();
    this.campUpgrade.onclick = () => this.app.upgradeCamp();
    this.campDaily.onclick = () => this.app.claimDailySupplies();
    this.btnGachaFree.onclick = () => this.gachaDraw(false);
    this.btnGachaAd.onclick = () => this.gachaDraw(true);
    if (this.gachaTabs) {
      for (const btn of this.gachaTabs.querySelectorAll('[data-gacha-tab]')) {
        btn.onclick = () => this.setGachaTab(btn.dataset.gachaTab);
      }
    }
    this.btnRevealClose.onclick = () => this.hideHeroReveal();
    this.heroReveal.onclick = (e) => { if (e.target === this.heroReveal) this.hideHeroReveal(); };
    if (this.btnDevPanel) this.btnDevPanel.onclick = () => this.app.openDevPanel(this.inputBalanceCode ? this.inputBalanceCode.value : '');
    if (this.inputBalanceCode) {
      this.inputBalanceCode.onkeydown = (e) => {
        if (e.key === 'Enter') this.app.openDevPanel(this.inputBalanceCode.value);
      };
    }
    if (this.btnDevCode) this.btnDevCode.onclick = () => this.app.applyDevCode(this.inputDevCode ? this.inputDevCode.value : '');
    if (this.inputDevCode) {
      this.inputDevCode.onkeydown = (e) => {
        if (e.key === 'Enter') this.app.applyDevCode(this.inputDevCode.value);
      };
    }
    this.btnLeaderboardTop.onclick = () => this.app.openLeaderboardScreen();
    this.btnSettingsTop.onclick = () => this.app.openSettings();
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.onclick = () => {
        audio.click();
        this.app.goBack(btn.dataset.back);
      };
    });
    this.btnStartBattle.onclick = () => this.app.beginBattleFromPrep();
    this.btnRecommend.onclick = () => this.app.recommendDeck();
    this.btnClearDeck.onclick = () => this.app.clearDeck();
    this.tabUnits.onclick = () => { this.codexTab = 'units'; this.renderCodex(); };
    this.tabHeroes.onclick = () => { this.codexTab = 'heroes'; this.renderCodex(); };
    this.btnOpenLeaderboard.onclick = () => this.app.openNativeLeaderboard();
    this.switchMusic.onclick = () => this.app.toggleMusic();
    this.switchSfx.onclick = () => this.app.toggleSfx();
    this.btnReplayTutorial.onclick = () => this.app.openPrep(1);
    this.btnReplayTour.onclick = () => this.app.replayTour();
    this.btnResetSave.onclick = () => this.app.confirmResetSave();
    this.qualityBtns.querySelectorAll('button').forEach((b) => {
      b.onclick = () => this.app.setQuality(b.dataset.q);
    });
    this.pauseBtn.onclick = () => this.battle && this.battle.togglePause();
    this.speedBtn.onclick = () => {
      if (!this.battle) return;
      const s = this.battle.toggleSpeed();
      this.speedBtn.textContent = `${s}×`;
      audio.click();
    };
    if (this.gadgetBtn) this.gadgetBtn.onclick = () => this.battle && this.battle.useGadget();
    this.skillBtn.onclick = () => this.battle && this.battle.useActive();
    this.btnResume.onclick = () => this.battle && this.battle.resume();
    this.btnRestart.onclick = () => this.app.restartBattle();
    this.btnRetreat.onclick = () => this.app.retreatBattle();
    this.btnPauseMusic.onclick = () => { this.app.toggleMusic(); this.syncPauseSettings(); };
    this.btnPauseSfx.onclick = () => { this.app.toggleSfx(); this.syncPauseSettings(); };

    // 👑 英雄参数调校事件绑定
    const getTuning = () => {
      const s = this.app.save.settings;
      if (!s.heroTuning) {
        s.heroTuning = { maxHp: 1200, atk: 65, armor: 10, regenRate: 0.04, aggroRadius: 2.85 };
      }
      return s.heroTuning;
    };

    const updateTuningField = (field, val) => {
      const t = getTuning();
      t[field] = val;
      this.app.persist();
      if (this.battle && this.battle.applyHeroTuning) {
        this.battle.applyHeroTuning(t);
      }
      this.syncSettingsUI();
      this.syncPauseSettings();
    };

    if (this.sliderHeroHp) {
      this.sliderHeroHp.oninput = (e) => updateTuningField('maxHp', Number(e.target.value));
    }
    if (this.sliderHeroAtk) {
      this.sliderHeroAtk.oninput = (e) => updateTuningField('atk', Number(e.target.value));
    }
    if (this.sliderHeroArmor) {
      this.sliderHeroArmor.oninput = (e) => updateTuningField('armor', Number(e.target.value));
    }
    if (this.sliderHeroRegen) {
      this.sliderHeroRegen.oninput = (e) => updateTuningField('regenRate', Number(e.target.value) / 100);
    }
    if (this.sliderHeroAggro) {
      this.sliderHeroAggro.oninput = (e) => updateTuningField('aggroRadius', Number(e.target.value));
    }
    if (this.btnResetHeroTuning) {
      this.btnResetHeroTuning.onclick = () => {
        const s = this.app.save.settings;
        s.heroTuning = { maxHp: 1200, atk: 65, armor: 10, regenRate: 0.04, aggroRadius: 2.85 };
        this.app.persist();
        if (this.battle && this.battle.applyHeroTuning) this.battle.applyHeroTuning(s.heroTuning);
        this.syncSettingsUI();
        this.syncPauseSettings();
        this.toast('英雄参数已恢复默认');
      };
    }

    // 👑 局内暂停面板调校事件
    if (this.btnTogglePauseTune) {
      this.btnTogglePauseTune.onclick = () => {
        if (!this.pauseTuneContent) return;
        const hidden = this.pauseTuneContent.style.display === 'none';
        this.pauseTuneContent.style.display = hidden ? 'flex' : 'none';
        this.btnTogglePauseTune.textContent = hidden ? '收起调校 ▴' : '展开调校 ▾';
      };
    }
    if (this.psliderHeroHp) {
      this.psliderHeroHp.oninput = (e) => updateTuningField('maxHp', Number(e.target.value));
    }
    if (this.psliderHeroAtk) {
      this.psliderHeroAtk.oninput = (e) => updateTuningField('atk', Number(e.target.value));
    }
    if (this.psliderHeroArmor) {
      this.psliderHeroArmor.oninput = (e) => updateTuningField('armor', Number(e.target.value));
    }
    if (this.psliderHeroRegen) {
      this.psliderHeroRegen.oninput = (e) => updateTuningField('regenRate', Number(e.target.value) / 100);
    }
    if (this.psliderHeroAggro) {
      this.psliderHeroAggro.oninput = (e) => updateTuningField('aggroRadius', Number(e.target.value));
    }
    if (this.pbtnResetHeroTuning) {
      this.pbtnResetHeroTuning.onclick = () => {
        const s = this.app.save.settings;
        s.heroTuning = { maxHp: 1200, atk: 65, armor: 10, regenRate: 0.04, aggroRadius: 2.85 };
        this.app.persist();
        if (this.battle && this.battle.applyHeroTuning) this.battle.applyHeroTuning(s.heroTuning);
        this.syncSettingsUI();
        this.syncPauseSettings();
        this.toast('英雄参数已恢复默认');
      };
    }
    this.btnResultRetry.onclick = () => this.app.restartBattle();
    this.btnResultNext.onclick = () => this.app.nextBattle(this.resultNextId);
    this.btnResultBack.onclick = () => this.app.returnToLevels();
    this.btnResultTour.onclick = () => this.app.startTourFromResult();
    this.btnResultDouble.onclick = async () => {
      if (!this.lastResult) return;
      this.btnResultDouble.disabled = true;
      this.btnResultDouble.textContent = '广告播放中…';
      const ok = await this.app.doubleResultTokens(this.lastResult);
      this.refreshResultTokens();
      audio.click();
    };
    this.btnConfirmCancel.onclick = () => this.hideConfirm();
    this.btnConfirmOk.onclick = () => {
      const fn = this.confirmAction;
      this.hideConfirm();
      if (fn) fn();
    };
    this.battleCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------------- 屏幕 ----------------

  showScreen(id) {
    for (const sid of this.screens) {
      const el = this.$(sid);
      if (el) el.classList.toggle('active', sid === id);
    }
    if (id !== 'screen-battle') {
      this.hideGuide();
    }
    if (id !== 'screen-prep') {
      this.hidePoolDetail();
    }
  }

  // ---------------- 缩略图 ----------------

  ensureThumbRenderer() {
    if (this.thumbRenderer) return true;
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(320, 320, false);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      this.thumbRenderer = renderer;
      this.thumbScene = new THREE.Scene();
      const hemi = new THREE.HemisphereLight(0xfff7e6, 0x7a7468, 2.2);
      this.thumbScene.add(hemi);
      const dir = new THREE.DirectionalLight(0xfff2d6, 2.4);
      dir.position.set(-2, 4, 5);
      this.thumbScene.add(dir);
      const fill = new THREE.DirectionalLight(0x9ab0b0, 0.9);
      fill.position.set(3, 2, -3);
      this.thumbScene.add(fill);
      this.thumbCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      return true;
    } catch (e) {
      this.thumbRenderer = null;
      return false;
    }
  }

  thumb(type, id) {
    const key = `${type}:${id}`;
    if (this.thumbCache.has(key)) return this.thumbCache.get(key);
    if (!this.ensureThumbRenderer()) return '';
    let model;
    let isBuilding = false;
    let mounted = false;
    if (type === 'hero') {
      const hero = getHero(id);
      model = createHeroModel(hero, 'player');
    } else {
      const unit = getUnit(id);
      model = createUnitModel(unit, 'player');
      isBuilding = !!unit.building || unit.look.building === 'cart' || unit.look.building === 'trebuchet' || unit.look.building === 'ram';
      mounted = !!unit.look.mount;
    }
    model.group.rotation.y = isBuilding ? -0.25 : -0.5;
    this.thumbScene.add(model.group);
    const cam = this.thumbCamera;
    const isHero = type === 'hero';
    if (isHero) {
      // 名将专属画幅：采用 384x576 黄金纵向画幅 (2:3)，匹配立绘卡与展台比例
      this.thumbRenderer.setSize(384, 576, false);
      cam.aspect = 384 / 576;
      cam.fov = 28;

      if (model.aura) model.group.remove(model.aura);
      model.group.rotation.y = -0.28;

      // 名将持握武器英姿微调（握持重心与自然倾角，避免长兵刺破天际）
      if (model.weapon) {
        model.weapon.position.y = -0.36;
      }
      if (model.weaponPivot) {
        model.weaponPivot.rotation.z = -0.16;
        model.weaponPivot.rotation.x = -0.10;
        model.weaponPivot.position.x = 0.38 * (model.baseScale || 1.30);
      }
      model.group.updateMatrixWorld(true);

      const totalBox = new THREE.Box3().setFromObject(model.group);
      const center = new THREE.Vector3();
      totalBox.getCenter(center);
      const size = new THREE.Vector3();
      totalBox.getSize(size);

      const fovY = (28 / 2) * (Math.PI / 180);
      const marginY = 1.08; // 上下留出 8% 黄金呼吸裕度，确保冠缨红缨与战靴完全无损完整呈现
      const marginX = 1.10;

      const distY = (size.y / 2) / Math.tan(fovY) * marginY;
      const distX = (size.x / 2) / (Math.tan(fovY) * cam.aspect) * marginX;
      const zDist = Math.max(distY, distX) + size.z / 2;

      const targetY = center.y + 0.05;
      cam.position.set(center.x, targetY, center.z + zDist);
      cam.lookAt(center.x, targetY, center.z);
    } else {
      this.thumbRenderer.setSize(320, 320, false);
      cam.aspect = 1;
      cam.fov = 30;
      // 空中单位（纸鸢）：模型悬吊重心偏下，单独取景避免吊篮被裁
      const isAir = !!(model.unit && model.unit.air);
      const targetY = isAir ? 0.55 : isBuilding ? 1.3 : mounted ? 1.25 : 0.95;
      const z = isAir ? 6.4 : isBuilding ? 7.4 : mounted ? 6.6 : 4.9;
      const camX = isAir ? -0.45 : 0;
      cam.position.set(camX, targetY + 0.7, z);
      cam.lookAt(camX, targetY, 0);
    }
    cam.updateProjectionMatrix();
    this.thumbRenderer.clear();
    this.thumbRenderer.render(this.thumbScene, cam);
    let data = '';
    try {
      data = this.thumbRenderer.domElement.toDataURL('image/png');
    } catch {
      data = '';
    }
    this.thumbScene.remove(model.group);
    this.thumbCache.set(key, data);
    return data;
  }

  unitThumb(unit) {
    if (unit.spell) return this.spellThumb(unit);
    return this.thumb('unit', unit.id);
  }

  // 术法卡 2D 符纸缩略图：朱砂符纸 + 主色环 + 诀字

  spellThumb(spell) {
    const key = `spell:${spell.id}`;
    if (this.thumbCache.has(key)) return this.thumbCache.get(key);
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const hex = `#${(spell.color || 0xb23a2f).toString(16).padStart(6, '0')}`;
    // 符纸底
    g.fillStyle = '#e8dfc8';
    g.fillRect(24, 8, 80, 112);
    g.strokeStyle = 'rgba(42,42,36,0.65)';
    g.lineWidth = 3;
    g.strokeRect(24, 8, 80, 112);
    // 上下符头墨线
    g.strokeStyle = hex;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(34, 22);
    g.lineTo(94, 22);
    g.moveTo(34, 106);
    g.lineTo(94, 106);
    g.stroke();
    // 主色圆环
    g.beginPath();
    g.arc(64, 62, 26, 0, Math.PI * 2);
    g.strokeStyle = hex;
    g.lineWidth = 5;
    g.stroke();
    // 诀字
    g.fillStyle = hex;
    g.font = 'bold 34px "KaiTi", "STKaiti", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(spell.glyph || '术', 64, 63);
    // 四角墨点
    g.fillStyle = 'rgba(42,42,36,0.8)';
    for (const [dx, dy] of [[30, 14], [98, 14], [30, 110], [98, 110]]) {
      g.beginPath();
      g.arc(dx, dy, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    const data = c.toDataURL('image/png');
    this.thumbCache.set(key, data);
    return data;
  }

  heroThumb(hero) {
    return this.thumb('hero', hero.id);
  }

  // ---------------- 主界面 ----------------

  refreshHome() {
    const save = this.app.save;
    const hero = getHero(save.hero.selected);
    this.homePlayer.textContent = save.player.name || '墨阵师';
    this.homeScore.textContent = save.progress.totalScore || 0;
    this.homeStars.textContent = save.progress.totalStars || 0;
    this.homeCleared.textContent = save.progress.clearedCount || 0;
    this.homeHeroArt.style.backgroundImage = `url("${this.heroThumb(hero)}")`;
    this.homeHeroName.textContent = hero.name;
    this.homeHeroTitle.textContent = hero.title;
    this.homeHeroPassive.textContent = `${hero.passive.name} · ${hero.passive.desc.replace(/。$/, '')}`;
    const chapterId = Math.min(10, Math.floor((save.progress.unlockedLevel - 1) / 10) + 1);
    const chapter = CHAPTERS[chapterId - 1];
    this.homeChapter.textContent = `第${'一二三四五六七八九十'[chapterId - 1]}章 · ${chapter.name}`;
    const clearedAll = (save.progress.stars[LEVELS.length] || 0) > 0;
    const nextLevel = Math.min(LEVELS.length, save.progress.unlockedLevel);
    const lv = getLevel(nextLevel);
    this.homeNextLevel.textContent = clearedAll
      ? '全部关卡已复，山河待续'
      : `下一战：第 ${nextLevel} 关 · ${lv ? lv.name : LEVEL_NAMES[nextLevel] || ''}`;
    this.homeCloud.textContent = this.app.cloudStatusText();
    this.cloudHint.textContent = this.app.cloudStatusText();
    // 荒野乱斗级顶部常驻资源状态栏同步
    if (this.topResSupplies) this.topResSupplies.textContent = save.camp?.supplies || 0;
    if (this.topResMobao) this.topResMobao.textContent = save.mobao || 0;
    if (this.topResTokens) this.topResTokens.textContent = save.tokens || 0;
    if (this.topResTickets) {
      const tickets = EndlessManager.getRemainingTickets(save);
      this.topResTickets.textContent = `${tickets}/2`;
    }

    // 无尽模式入口按钮状态同步
    const isEndlessOpen = EndlessManager.isUnlocked(save);
    const tickets = EndlessManager.getRemainingTickets(save);
    if (this.endlessHomeLock) {
      this.endlessHomeLock.style.display = isEndlessOpen ? 'none' : 'inline-block';
    }
    if (this.endlessHomeBadge) {
      this.endlessHomeBadge.style.display = isEndlessOpen ? 'inline-block' : 'none';
      this.endlessHomeBadge.textContent = tickets > 0 ? `免 ${tickets}次` : '0次(补)';
      this.endlessHomeBadge.style.background = tickets > 0 ? '#22c55e' : '#f59e0b';
    }

    this.syncSettingsUI();
    this.renderHomeBounties();
  }

  // ---------------- 山河悬赏令 ----------------

  toggleHomeBountyCollapse(forceState = null) {
    if (!this.homeBountySection) return;
    const isCurrentlyCollapsed = this.homeBountySection.classList.contains('is-collapsed');
    const newState = forceState !== null ? forceState : !isCurrentlyCollapsed;
    
    if (newState) {
      this.homeBountySection.classList.add('is-collapsed');
      if (this.homeBountyList) this.homeBountyList.style.display = 'none';
      if (this.homeBountyCollapsedBar) this.homeBountyCollapsedBar.style.display = 'flex';
      if (this.btnToggleBountyCollapse) this.btnToggleBountyCollapse.textContent = '展开';
      localStorage.setItem('inkwar_home_bounty_collapsed', 'true');
    } else {
      this.homeBountySection.classList.remove('is-collapsed');
      if (this.homeBountyList) this.homeBountyList.style.display = 'flex';
      if (this.homeBountyCollapsedBar) this.homeBountyCollapsedBar.style.display = 'none';
      if (this.btnToggleBountyCollapse) this.btnToggleBountyCollapse.textContent = '收起';
      localStorage.setItem('inkwar_home_bounty_collapsed', 'false');
    }
  }

  renderHomeBounties() {
    if (!this.homeBountyList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);

    // 同步折叠状态
    const isCollapsedSaved = localStorage.getItem('inkwar_home_bounty_collapsed') === 'true';
    if (isCollapsedSaved) {
      this.toggleHomeBountyCollapse(true);
    }

    if (this.homeBountySummary) {
      this.homeBountySummary.textContent = `日赏 ${summary.dailyCompleted}/${summary.dailyTotal} · 周赏 ${summary.weeklyCompleted}/${summary.weeklyTotal}`;
    }
    if (this.homeBountyCollapsedSummary) {
      this.homeBountyCollapsedSummary.textContent = `日赏 ${summary.dailyCompleted}/${summary.dailyTotal}${summary.unclaimedCount > 0 ? ` (可领 ${summary.unclaimedCount})` : ''}`;
    }

    if (this.homeBountyBadge) {
      if (summary.unclaimedCount > 0) {
        this.homeBountyBadge.style.display = 'inline-flex';
        this.homeBountyBadge.textContent = summary.unclaimedCount;
        this.homeBountyBadge.classList.add('pulse');
      } else {
        this.homeBountyBadge.style.display = 'none';
        this.homeBountyBadge.classList.remove('pulse');
      }
    }

    if (this.btnHomeClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnHomeClaimAll.style.display = 'inline-flex';
        this.btnHomeClaimAll.textContent = `一键领赏 (${summary.unclaimedCount})`;
      } else {
        this.btnHomeClaimAll.style.display = 'none';
      }
    }
    if (this.btnCollapsedClaimAll) {
      this.btnCollapsedClaimAll.style.display = summary.unclaimedCount > 0 ? 'inline-block' : 'none';
    }

    // 优先展示可领取的，其次按进度倒序
    const all = [...(summary.daily || []), ...(summary.weekly || [])];
    all.sort((a, b) => {
      const aReady = !a.claimed && a.current >= a.target;
      const bReady = !b.claimed && b.current >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
      const aRatio = Math.min(1, a.current / a.target);
      const bRatio = Math.min(1, b.current / b.target);
      return bRatio - aRatio;
    });

    const displayList = all.slice(0, 3);
    this.homeBountyList.innerHTML = '';

    for (const b of displayList) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));
      const isWeekly = b.category === 'weekly';

      const item = document.createElement('div');
      item.className = `home-bounty-item ${isReady ? 'ready-claim' : ''} ${isClaimed ? 'claimed' : ''}`;
      item.innerHTML = `
        <div class="bounty-badge-tag ${isWeekly ? 'tag-weekly' : 'tag-daily'}">
          ${isWeekly ? '周赏' : '日赏'}
        </div>
        <div class="bounty-item-icon">${b.icon || '⚔️'}</div>
        <div class="bounty-item-info">
          <div class="bounty-item-name">${b.name} <span class="bounty-item-desc">${b.desc}</span></div>
          <div class="bounty-progress-wrap">
            <div class="bounty-progress-fill ${isReady ? 'fill-gold' : ''}" style="width: ${ratio}%"></div>
            <div class="bounty-progress-text">${b.current} / ${b.target} (${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-item-rewards">
          ${b.rewards.mobao ? `<span class="rw-tag mobao">+${b.rewards.mobao} 墨宝</span>` : ''}
          ${b.rewards.tokens ? `<span class="rw-tag tokens">+${b.rewards.tokens} 将令</span>` : ''}
          ${b.rewards.supplies ? `<span class="rw-tag supplies">+${b.rewards.supplies} 军需</span>` : ''}
        </div>
        <div class="bounty-item-action">
          ${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? `<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-claim-bounty">领 赏</button>
                   <button class="btn btn-sm btn-gold-pulse btn-double-bounty">🎬 双倍</button>
                 </div>`
              : `<button class="btn btn-sm btn-paper btn-go-bounty">前往</button>`
          }
        </div>
      `;

      const claimBtn = item.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = (e) => {
          e.stopPropagation();
          this.app.claimBounty(b.id, false);
        };
      }
      const doubleBtn = item.querySelector('.btn-double-bounty');
      if (doubleBtn) {
        doubleBtn.onclick = (e) => {
          e.stopPropagation();
          this.app.claimBountyWithAd(b.id);
        };
      }

      const goBtn = item.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = (e) => {
          e.stopPropagation();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      item.onclick = () => {
        this.openBountyModal(b.category);
      };

      this.homeBountyList.appendChild(item);
    }
  }

  openBountyModal(tab = 'daily') {
    this.bountyModalTab = tab;
    if (this.bountyModal) {
      this.bountyModal.style.display = 'flex';
      this.bountyModal.classList.add('show');
    }
    this.switchBountyTab(tab);
    this.startBountyTimer();
    audio.click();
  }

  hideBountyModal() {
    if (this.bountyModal) {
      this.bountyModal.classList.remove('show');
      this.bountyModal.style.display = 'none';
    }
    this.stopBountyTimer();
    this.renderHomeBounties();
    audio.click();
  }

  switchBountyTab(tab) {
    this.bountyModalTab = tab;
    if (this.tabBountyDaily) this.tabBountyDaily.classList.toggle('active', tab === 'daily');
    if (this.tabBountyWeekly) this.tabBountyWeekly.classList.toggle('active', tab === 'weekly');
    this.renderBountyModalList();
    this.updateBountyTimers();
  }

  startBountyTimer() {
    this.stopBountyTimer();
    this.updateBountyTimers();
    this._bountyTimerInterval = setInterval(() => this.updateBountyTimers(), 1000);
  }

  stopBountyTimer() {
    if (this._bountyTimerInterval) {
      clearInterval(this._bountyTimerInterval);
      this._bountyTimerInterval = null;
    }
  }

  updateBountyTimers() {
    const dailyTimer = getDailyResetCountdown();
    const weeklyTimer = getWeeklyResetCountdown();
    if (this.bountyDailyTimer) this.bountyDailyTimer.textContent = `距次日刷新：${dailyTimer.text}`;
    if (this.bountyWeeklyTimer) this.bountyWeeklyTimer.textContent = `距周一重置：${weeklyTimer.text}`;
  }

  renderBountyModalList() {
    if (!this.bountyModalList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);
    const tab = this.bountyModalTab || 'daily';
    const list = tab === 'weekly' ? (summary.weekly || []) : (summary.daily || []);

    // 每日刷新栏：只显示剩余免费次数，广告刷新已并入每个任务的小按钮
    if (this.bountyRefreshBar) {
      this.bountyRefreshBar.style.display = tab === 'daily' ? 'flex' : 'none';
      if (this.bountyRefreshCount) {
        this.bountyRefreshCount.textContent = summary.dailyRefreshCount ?? 2;
      }
    }
    const refreshLeft = summary.dailyRefreshCount ?? 2;

    if (this.btnModalClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnModalClaimAll.style.display = 'inline-flex';
        this.btnModalClaimAll.textContent = `一键领赏 (${summary.unclaimedCount})`;
        this.btnModalClaimAll.onclick = () => {
          this.app.claimAllBounties(false);
          this.renderBountyModalList();
        };
      } else {
        this.btnModalClaimAll.style.display = 'none';
      }
    }
    if (this.btnModalClaimAllDouble) {
      if (summary.unclaimedCount > 0) {
        this.btnModalClaimAllDouble.style.display = 'inline-flex';
        this.btnModalClaimAllDouble.onclick = () => {
          this.app.claimAllBountiesWithAd();
          this.renderBountyModalList();
        };
      } else {
        this.btnModalClaimAllDouble.style.display = 'none';
      }
    }

    this.bountyModalList.innerHTML = '';

    const sorted = list.slice().sort((a, b) => {
      const aReady = !a.claimed && a.current >= a.target;
      const bReady = !b.claimed && b.current >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
      return (b.current / b.target) - (a.current / a.target);
    });

    for (const b of sorted) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));

      const card = document.createElement('div');
      card.className = `bounty-card-large ${isReady ? 'ready-claim' : ''} ${isClaimed ? 'claimed' : ''}`;
      card.innerHTML = `
        <div class="bounty-large-icon">${b.icon || '⚔️'}</div>
        <div class="bounty-large-content">
          <div class="bounty-large-title-row">
            <span class="bounty-badge-tag ${b.category === 'weekly' ? 'tag-weekly' : 'tag-daily'}">
              ${b.category === 'weekly' ? '每周悬赏' : '每日悬赏'}
            </span>
            <span class="bounty-large-title">${b.name}</span>
            <span class="bounty-large-desc">${b.desc}</span>
          </div>
          <div class="bounty-large-progress">
            <div class="bounty-large-fill ${isReady ? 'fill-gold' : ''}" style="width: ${ratio}%"></div>
            <div class="bounty-large-prog-text">${b.current} / ${b.target} (${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-large-rewards">
          ${b.rewards.mobao ? `<span class="rw-tag mobao">+${b.rewards.mobao} 墨宝</span>` : ''}
          ${b.rewards.tokens ? `<span class="rw-tag tokens">+${b.rewards.tokens} 将令</span>` : ''}
          ${b.rewards.supplies ? `<span class="rw-tag supplies">+${b.rewards.supplies} 军需</span>` : ''}
        </div>
        <div class="bounty-large-action">
          ${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? `<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-claim-bounty">领 赏</button>
                   <button class="btn btn-sm btn-gold-pulse btn-double-bounty">🎬 双倍</button>
                 </div>`
              : `<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-go-bounty">前 往</button>
                   ${tab === 'daily'
                     ? `<button class="btn btn-sm ${refreshLeft > 0 ? 'btn-paper' : 'btn-gold-pulse'} btn-refresh-single-bounty" data-ad="${refreshLeft > 0 ? '0' : '1'}" title="${refreshLeft > 0 ? '消耗 1 次免费刷新换一个任务' : '看广告换一个任务'}">${refreshLeft > 0 ? '🔄 换' : '🎬 换'}</button>`
                     : ''}
                 </div>`
          }
        </div>
      `;

      const claimBtn = card.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = () => {
          this.app.claimBounty(b.id, false);
          this.renderBountyModalList();
        };
      }
      const doubleBtn = card.querySelector('.btn-double-bounty');
      if (doubleBtn) {
        doubleBtn.onclick = () => {
          this.app.claimBountyWithAd(b.id);
          this.renderBountyModalList();
        };
      }

      const refreshSingleBtn = card.querySelector('.btn-refresh-single-bounty');
      if (refreshSingleBtn) {
        refreshSingleBtn.onclick = () => {
          if (refreshSingleBtn.dataset.ad === '1') {
            this.refreshBountyWithAd(b.id);
            return;
          }
          const res = BountyManager.refreshDaily(this.app.save, b.id);
          if (res.success) {
            this.app.persist();
            this.toast(`任务已更换为：${res.newBounty.name}！`);
            this.renderBountyModalList();
            this.renderHomeBounties();
          } else {
            this.toast(res.msg || '无法刷新该任务');
          }
        };
      }

      const goBtn = card.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = () => {
          this.hideBountyModal();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      this.bountyModalList.appendChild(card);
    }
  }

  // 单个任务看广告刷新（不消耗免费次数，每日 3 次）
  refreshBountyWithAd(bountyId) {
    const doRefresh = () => {
      const res = BountyManager.refreshDailyWithAd(this.app.save, bountyId);
      if (!res.success) {
        this.toast(res.msg || '今日广告刷新次数已用完');
        return;
      }
      this.app.persist();
      this.toast(`📜 观演换令：新任务「${res.newBounty.name}」`);
      this.renderBountyModalList();
      this.renderHomeBounties();
    };
    if (this.app.platform && this.app.platform.showAdWithFallback) {
      this.app.platform.showAdWithFallback('bounty_refresh', doRefresh, doRefresh);
    } else {
      doRefresh();
    }
  }

  // ---------------- 荒野乱斗级 · 全局通用资源获取大展台 ----------------
  showRewardModal({ title = '战 功 嘉 奖', subtitle = '山河定鼎，犒赏三军', seal = '犒', rewards = {}, isDouble = false, canDouble = true, onDoubleAd = null, onConfirm = null }) {
    if (!this.rewardShowcaseModal) return;
    this.rewardShowcaseModal.style.display = 'flex';
    if (this.rewardShowcaseTitle) this.rewardShowcaseTitle.textContent = title;
    if (this.rewardShowcaseSub) this.rewardShowcaseSub.textContent = subtitle;
    if (this.rewardShowcaseSeal) this.rewardShowcaseSeal.textContent = seal;
    if (this.rewardDoubleBadge) this.rewardDoubleBadge.style.display = isDouble ? 'inline-block' : 'none';

    if (this.rewardItemsContainer) {
      this.rewardItemsContainer.innerHTML = '';
      const items = [];
      if (rewards.supplies) items.push({ icon: '🪙', name: '军饷', count: rewards.supplies, color: '#fde047' });
      if (rewards.mobao) items.push({ icon: '💎', name: '墨宝', count: rewards.mobao, color: '#67e8f9' });
      if (rewards.tokens) items.push({ icon: '🎟️', name: '将令', count: rewards.tokens, color: '#fca5a5' });
      if (rewards.fragments) items.push({ icon: '📜', name: '残页', count: rewards.fragments, color: '#d8b4fe' });

      items.forEach((it, idx) => {
        const box = document.createElement('div');
        box.className = 'reward-item-box';
        box.style.animationDelay = `${idx * 0.08}s`;
        box.innerHTML = `
          <div class="reward-item-icon">${it.icon}</div>
          <div class="reward-item-name">${it.name}</div>
          <div class="reward-item-count" style="color:${it.color}">+${it.count}</div>
        `;
        this.rewardItemsContainer.appendChild(box);
      });
    }

    if (canDouble && onDoubleAd && !isDouble) {
      if (this.btnClaimRewardDouble) {
        this.btnClaimRewardDouble.style.display = 'inline-flex';
        this.btnClaimRewardDouble.onclick = () => {
          this.rewardShowcaseModal.style.display = 'none';
          onDoubleAd();
        };
      }
    } else {
      if (this.btnClaimRewardDouble) this.btnClaimRewardDouble.style.display = 'none';
    }

    if (this.btnClaimRewardNormal) {
      this.btnClaimRewardNormal.onclick = () => {
        this.rewardShowcaseModal.style.display = 'none';
        if (onConfirm) onConfirm();
        this.refreshHome();
      };
    }
  }

  // 门票不足弹窗
  openEndlessTicketModal() {
    if (this.endlessTicketModal) {
      this.endlessTicketModal.style.display = 'flex';
    }
  }

  hideEndlessTicketModal() {
    if (this.endlessTicketModal) {
      this.endlessTicketModal.style.display = 'none';
    }
  }

  // 第20关通关盛大解锁弹窗
  openEndlessUnlockModal() {
    if (this.endlessUnlockModal) {
      this.endlessUnlockModal.style.display = 'flex';
    }
  }

  // ---------------- 大本营（军令营） ----------------

  refreshCamp() {
    const st = this.app.campState();
    const save = this.app.save;
    const camp = save.camp || {};
    this.campLevel.textContent = st.level;
    this.campMax.textContent = st.max;
    this.campSupplies.textContent = st.supplies;
    this.campProgressFill.style.width = `${(st.level / st.max) * 100}%`;
    this.campEnergy.textContent = st.energyMax;
    this.campEnergyNext.textContent = st.maxed ? '已满级' : `下一级 ${st.nextEnergyMax}`;
    this.campRegen.textContent = st.regen.toFixed(2);
    this.campRegenNext.textContent = st.maxed ? '已满级' : `下一级 ${st.nextRegen.toFixed(2)}`;
    this.campCost.textContent = st.maxed ? '—' : st.cost;
    this.campUpgrade.textContent = st.maxed ? '已 满 级' : '升 级 军 令 营';
    this.campUpgrade.disabled = st.maxed || st.supplies < st.cost;
    this.campDaily.textContent = st.claimedToday ? '今日军需已领取' : `领取今日军需 +${st.daily}`;
    this.campDaily.disabled = st.claimedToday;

    // 渲染新增两条并行小线：演武场 (全军攻击) + 工坊 (建筑生命/冷却)
    let extraCamp = document.getElementById('camp-extra-lines');
    if (!extraCamp) {
      extraCamp = document.createElement('div');
      extraCamp.id = 'camp-extra-lines';
      extraCamp.className = 'camp-extra-lines';
      if (this.campHint && this.campHint.parentNode) {
        this.campHint.parentNode.insertBefore(extraCamp, this.campHint);
      }
    }

    const bLvl = camp.barracksLevel || 0;
    const bMaxed = bLvl >= BARRACKS_MAX_LEVEL;
    const bCost = barracksCost(bLvl);
    const bBonus = Math.round(barracksAtkBonus(bLvl) * 100);

    const wLvl = camp.workshopLevel || 0;
    const wMaxed = wLvl >= WORKSHOP_MAX_LEVEL;
    const wCost = workshopCost(wLvl);
    const wHp = Math.round(workshopBuildingHpBonus(wLvl) * 100);
    const wCd = Math.round(workshopCdReduction(wLvl) * 100);

    // 渲染日常任务
    const dq = save.dailyQuests || {};
    let questsHtml = '';
    for (const q of (dq.quests || [])) {
      const tpl = DAILY_QUEST_TEMPLATES.find((x) => x.id === q.id);
      if (!tpl) continue;
      const isDone = q.current >= tpl.target;
      const btnText = q.claimed ? '已领取' : isDone ? '领 取' : `${q.current}/${tpl.target}`;
      questsHtml += `
        <div class="quest-row">
          <div class="qr-info">
            <b>${tpl.name}</b><span>${tpl.desc}（+${tpl.supplies}军需 +${tpl.tokens}将令）</span>
          </div>
          <button class="btn-quest-claim ${isDone && !q.claimed ? 'claimable' : ''}" data-qid="${q.id}" ${q.claimed || !isDone ? 'disabled' : ''}>${btnText}</button>
        </div>
      `;
    }

    const wWins = dq.weeklyWins || 0;
    const wTarget = WEEKLY_CHEST_CONFIG.targetWins;
    const wClaimed = dq.weeklyClaimed;

    extraCamp.innerHTML = `
      <div class="camp-sub-line">
        <div class="csl-card">
          <div class="csl-title"><b>演武场</b><span>Lv.${bLvl}/${BARRACKS_MAX_LEVEL}</span></div>
          <div class="csl-effect">全军攻击 +${bBonus}% (封顶 +10%)</div>
          <button class="btn-camp-sub" id="btn-upgrade-barracks" ${bMaxed || st.supplies < bCost ? 'disabled' : ''}>${bMaxed ? '已满级' : `升级 (${bCost}军需)`}</button>
        </div>
        <div class="csl-card">
          <div class="csl-title"><b>天工坊</b><span>Lv.${wLvl}/${WORKSHOP_MAX_LEVEL}</span></div>
          <div class="csl-effect">建筑生命 +${wHp}% · 卡牌冷却 -${wCd}%</div>
          <button class="btn-camp-sub" id="btn-upgrade-workshop" ${wMaxed || st.supplies < wCost ? 'disabled' : ''}>${wMaxed ? '已满级' : `升级 (${wCost}军需)`}</button>
        </div>
      </div>

      <div class="camp-quests-card">
        <div class="cqc-head">
          <b>每日军令台</b>
          <span>每周宝箱: ${wWins}/${wTarget} 胜 ${wClaimed ? '(已领)' : ''}</span>
          ${wWins >= wTarget && !wClaimed ? '<button class="btn-weekly-chest" id="btn-claim-weekly">领宝箱</button>' : ''}
        </div>
        <div class="cqc-list">${questsHtml}</div>
      </div>
    `;

    // 绑定演武场与工坊升级按钮
    const btnBarracks = document.getElementById('btn-upgrade-barracks');
    if (btnBarracks) btnBarracks.onclick = () => this.app.upgradeBarracks();
    const btnWorkshop = document.getElementById('btn-upgrade-workshop');
    if (btnWorkshop) btnWorkshop.onclick = () => this.app.upgradeWorkshop();
    const btnWeekly = document.getElementById('btn-claim-weekly');
    if (btnWeekly) btnWeekly.onclick = () => this.app.claimWeeklyChest();

    extraCamp.querySelectorAll('.btn-quest-claim.claimable').forEach((btn) => {
      btn.onclick = () => this.app.claimDailyQuest(btn.dataset.qid);
    });

    this.campHint.textContent = '大本营三线齐发：军令营扩容军令、演武场精炼全军、天工坊加固器械。';
  }

  // ---------------- 关卡 ----------------

  openLevels(chapterId) {
    this.activeChapter = chapterId || Math.floor((this.app.save.progress.unlockedLevel - 1) / 10) + 1;
    this.renderChapterTabs();
    this.renderLevelPath();
    const first = (this.activeChapter - 1) * 10 + 1;
    const lastId = this.activeChapter * 10;
    this.selectedLevelId = Math.max(first, Math.min(lastId, this.app.save.progress.unlockedLevel));
    this.selectLevelDetail(this.selectedLevelId);
    this.showScreen('screen-levels');
  }

    renderChapterTabs() {
    this.chapterTabs.innerHTML = '';
    // 主线前 4 章
    for (const ch of CHAPTERS.slice(0, 4)) {
      const btn = document.createElement('button');
      btn.className = 'chapter-tab';
      if (ch.id === this.activeChapter) btn.classList.add('active');
      btn.textContent = `第${'一二三四'[ch.id - 1]}章 · ${ch.name}`;
      btn.onclick = () => {
        audio.click();
        this.activeChapter = ch.id;
        this.renderChapterTabs();
        this.renderLevelPath();
        const first = (ch.id - 1) * 10 + 1;
        this.selectLevelDetail(first);
      };
      this.chapterTabs.appendChild(btn);
    }

    // 墨影试炼 (无尽模式)
    const endlessBtn = document.createElement('button');
    endlessBtn.className = 'chapter-tab' + (this.activeChapter === 'endless' ? ' active' : '');
    endlessBtn.textContent = '墨影试炼 · 无尽';
    endlessBtn.onclick = () => {
      audio.click();
      this.activeChapter = 'endless';
      this.renderChapterTabs();
      this.renderEndlessView();
    };
    this.chapterTabs.appendChild(endlessBtn);

    // 每日挑战
    const dailyBtn = document.createElement('button');
    dailyBtn.className = 'chapter-tab' + (this.activeChapter === 'daily' ? ' active' : '');
    dailyBtn.textContent = '每日挑战 · 词条';
    dailyBtn.onclick = () => {
      audio.click();
      this.activeChapter = 'daily';
      this.renderChapterTabs();
      this.renderDailyView();
    };
    this.chapterTabs.appendChild(dailyBtn);
  }

  renderEndlessView() {
    this.levelPath.innerHTML = `
      <div class="mode-intro-card">
        <div class="scroll-seal">试 炼</div>
        <h3>墨 影 试 炼</h3>
        <p>「群墨翻涌，山河无尽」</p>
        <div class="mode-rule-list">
          <div>· 敌军波次无上限涌现，属性随波次递增</div>
          <div>· 敌寨常驻 5000 血，被打空触发防爆冲击（英雄免疫反噬）</div>
          <div>· 敌寨护盾无敌 3 秒并平滑回满 5000 血</div>
          <div>· 每 5 波肉鸽战法三选一，每 10 波出击专属强力首领</div>
          <div>· 多维战报结算：波次、斩将、杀敌、敌寨伤害，广告双倍领取</div>
        </div>
      </div>
    `;
    const maxWave = EndlessManager.getMaxWave();
    this.levelDetail.innerHTML = `
      <div class="detail-kicker">无 尽 模 式</div>
      <div class="detail-name">墨影试炼</div>
      <p class="detail-quote">山河破碎墨染天，唯有名将镇四方。</p>
      <div class="detail-row"><span class="dr-label">历史最佳</span><span class="dr-val" style="color:var(--jade-bright);font-weight:bold;">第 ${maxWave} 波</span></div>
      <div class="detail-row"><span class="dr-label">肉鸽战法</span><span class="dr-val">每5波三选一 · 自由叠加</span></div>
      <div class="detail-row"><span class="dr-label">首领阶梯</span><span class="dr-val">每10波 Boss 突袭</span></div>
      <div class="detail-row"><span class="dr-label">战报奖赏</span><span class="dr-val">墨宝 · 将令 · 广告双倍</span></div>
      <div class="detail-actions" style="margin-top:20px;">
        <button class="btn btn-seal" id="btn-enter-endless" style="width:100%;">踏 入 试 炼</button>
      </div>
    `;
    const btn = this.$('btn-enter-endless');
    if (btn) btn.onclick = () => {
      if (this.triggerEndless) this.triggerEndless();
      else this.app.startEndlessMode();
    };
  }

  renderDailyView() {
    const info = DailyChallengeManager.getTodayInfo(this.app.save.progress.unlockedLevel);
    const modsHtml = info.modifiers.map(m => `
      <div class="modifier-badge">
        <span class="mod-name">${m.name}</span>
        <span class="mod-desc">${m.desc}</span>
      </div>
    `).join('');

    this.levelPath.innerHTML = `
      <div class="mode-intro-card">
        <div class="scroll-seal">日 练</div>
        <h3>今 日 战 役</h3>
        <p>「${info.date} 战书」</p>
        <div class="modifier-box">
          <div style="font-weight:bold;margin-bottom:8px;">本日战场异象（词条）：</div>
          ${modsHtml}
        </div>
      </div>
    `;

    const adUsage = this.app.platform.getAdUsage('daily_refresh');
    this.levelDetail.innerHTML = `
      <div class="detail-kicker">每 日 挑 战 · ${info.date}</div>
      <div class="detail-name">挑战战役 (第 ${info.levelId} 关)</div>
      <p class="detail-quote">每日随机 1 关附带 2 项异象词条，破阵可得厚赏。</p>
      <div class="detail-row"><span class="dr-label">今日通关</span><span class="dr-val" style="color:${info.completed ? 'var(--jade-bright)' : '#e06060'};font-weight:bold;">${info.completed ? '已达成 (奖赏已领)' : '未完成'}</span></div>
      <div class="detail-row"><span class="dr-label">通关重赏</span><span class="dr-val">30 军需 · 10 将令 · 5 墨迹碎片</span></div>
      <div class="detail-actions" style="margin-top:16px;display:flex;gap:10px;flex-direction:column;">
        <button class="btn ${info.completed ? 'btn-ghost' : 'btn-seal'}" id="btn-enter-daily" ${info.completed ? 'disabled' : ''}>${info.completed ? '今 日 已 通 关' : '即 刻 迎 战'}</button>
        ${info.canRefresh ? `<button class="btn btn-paper" id="btn-refresh-daily">刷新词条 (剩余 ${adUsage.remaining} 次)</button>` : ''}
      </div>
    `;
    const btnEnter = this.$('btn-enter-daily');
    if (btnEnter && !info.completed) {
      btnEnter.onclick = () => this.app.startDailyChallenge(info);
    }
    const btnRefresh = this.$('btn-refresh-daily');
    if (btnRefresh) {
      btnRefresh.onclick = () => this.app.refreshDailyChallenge();
    }
  }

  chapterLevels(chapterId) {
    const real = LEVELS.filter((l) => l.chapter === chapterId);
    if (real.length) return real;
    const arr = [];
    for (let i = (chapterId - 1) * 10 + 1; i <= chapterId * 10; i++) {
      arr.push({ id: i, name: LEVEL_NAMES[i] || `第 ${i} 关`, placeholder: true, chapter: chapterId });
    }
    return arr;
  }

  renderLevelPath() {
    const levels = this.chapterLevels(this.activeChapter);
    this.levelPath.innerHTML = '';
    const unlocked = this.app.save.progress.unlockedLevel;
    for (const lv of levels) {
      const id = lv.id;
      const stars = this.app.save.progress.stars[id] || 0;
      const cleared = stars > 0;
      const playable = !lv.placeholder;
      const isCurrent = id === unlocked && playable;
      const locked = !playable || id > unlocked;
      const btn = document.createElement('button');
      btn.className = 'level-node';
      btn.dataset.id = id;
      if (cleared) btn.classList.add('cleared');
      if (isCurrent) btn.classList.add('current');
      if (locked) btn.classList.add('locked');
      if (id % 10 === 0) btn.classList.add('boss');
      btn.innerHTML = `
        <span class="node-id">${id}</span>
        <span class="node-name">${lv.name}</span>
        <span class="node-stars">${stars ? '★'.repeat(stars) : (locked ? '' : '· · ·')}</span>
      `;
      btn.onclick = () => {
        audio.click();
        this.selectLevelDetail(id);
      };
      this.levelPath.appendChild(btn);
    }
    // §5.7 40关之后外域筹备卷轴占位
    if (this.activeChapter === 4) {
      const scrollCard = document.createElement('div');
      scrollCard.className = 'outland-seal-card';
      scrollCard.innerHTML = `
        <div class="scroll-seal">封</div>
        <div class="outland-title">外 域 筹 备 中</div>
        <div class="outland-desc">前四十章主线已告捷。墨煞残余潜入外域，敬请期待后续章节！</div>
        <button class="btn btn-sm btn-paper" id="btn-goto-endless-fast">前往【墨影试炼】无尽挑战 →</button>
      `;
      this.levelPath.appendChild(scrollCard);
      const fastBtn = scrollCard.querySelector('#btn-goto-endless-fast');
      if (fastBtn) fastBtn.onclick = () => {
        this.activeChapter = 'endless';
        this.renderChapterTabs();
        this.renderEndlessView();
      };
    }
  }

  enemySummary(level) {
    const counts = new Map();
    for (const w of level.waves || []) {
      for (const g of w.units) {
        counts.set(g.type, (counts.get(g.type) || 0) + g.count);
      }
    }
    const parts = [...counts.entries()].map(([id, n]) => `${getUnit(id).name}×${n}`);
    return parts.join(' · ');
  }

  selectLevelDetail(id) {
    this.selectedLevelId = id;
    const lv = getLevel(id);
    const unlocked = this.app.save.progress.unlockedLevel;
    const stars = this.app.save.progress.stars[id] || 0;
    this.renderLevelPath();
    if (!lv) {
      this.levelDetail.innerHTML = `
        <div class="detail-kicker">未 开 放</div>
        <div class="detail-name">${LEVEL_NAMES[id] || `第 ${id} 关`}</div>
        <p class="detail-quote">此段山河尚在墨渊深处，后续版本开启。</p>
        <div class="detail-row"><span class="dr-label">章节</span><span class="dr-val">第${'一二三四五六七八九十'[Math.floor((id - 1) / 10)]}章</span></div>
        <div class="detail-row"><span class="dr-label">状态</span><span class="dr-val">${id <= unlocked ? '已解锁 · 待开放' : '尚未解锁'}</span></div>
        <div class="detail-actions"><button class="btn btn-paper" disabled>敬 请 期 待</button></div>
      `;
      return;
    }
    const locked = id > unlocked;
    const unlockNames = [];
    for (const uid of (lv.unlocks && lv.unlocks.units) || []) unlockNames.push(getUnit(uid).name);
    for (const hid of (lv.unlocks && lv.unlocks.heroes) || []) unlockNames.push(getHero(hid).name);
    const boss = lv.boss ? `<div class="detail-row"><span class="dr-label">首领</span><span class="dr-val">${lv.boss.name}</span></div>` : '';
    this.levelDetail.innerHTML = `
      <div class="detail-kicker">第 ${id} 关 · ${CHAPTERS[lv.chapter - 1].name}</div>
      <div class="detail-name">${lv.name}</div>
      <p class="detail-quote">${lv.quote}</p>
      <div class="detail-stars">${[1, 2, 3].map((n) => `<span style="opacity:${stars >= n ? 1 : 0.18}">★</span>`).join('')}</div>
      <div class="detail-row"><span class="dr-label">敌情</span><span class="dr-val">${this.enemySummary(lv)}</span></div>
      ${boss}
      <div class="detail-row"><span class="dr-label">机制</span><span class="dr-val">${(lv.tags || []).join(' · ') || '常规战'}</span></div>
      ${lv.mechanicDesc ? `<div class="detail-row" style="color:var(--gold);"><span class="dr-label">机制目标</span><span class="dr-val">${lv.mechanicDesc}</span></div>` : ''}
      ${lv.tacticalTip ? `<div class="detail-row tactical-tip-box"><span class="dr-label">锦囊妙计</span><span class="dr-val">${lv.tacticalTip}</span></div>` : ''}
      ${this.levelCounterHint(lv)}
      ${unlockNames.length ? `<div class="detail-unlock">首通解锁：${unlockNames.join('、')}</div>` : ''}
      ${lv.tip ? `<p class="detail-tip">${lv.tip}</p>` : ''}
      <div class="detail-actions">
        <button class="btn ${locked ? 'btn-ghost' : 'btn-seal'}" id="btn-level-go" ${locked ? 'disabled' : ''}>${locked ? `需先通关第 ${id - 1} 关` : (stars ? '再 战' : '出 征')}</button>
      </div>
    `;
    // 切换关卡后详情回到顶部；「出征」按钮由底部吸附条常驻，短屏也不会被推出视口
    try { this.levelDetail.scrollTop = 0; } catch (e) {}
    const go = this.$('btn-level-go');
    if (go && !locked) {
      go.onclick = () => { audio.click(); this.app.openPrep(id); };
    }
  }

  // ---------------- 战前准备 ----------------

  renderPrep(level) {
    this.currentPrepLevel = level;
    this.workingDeck = this.app.getWorkingDeck(level);
    this.activeSlot = null;
    this.prepTitle.textContent = level.isEndless ? level.name : `第 ${level.id} 关 · ${level.name}`;
    if (this.btnHeroToggle) {
      const block = this.btnHeroToggle.closest('.prep-hero');
      if (block) block.classList.remove('open');
      this.btnHeroToggle.textContent = '换将';
    }
    if (level.isEndless) {
      this.prepEnemy.innerHTML = `<span class="enemy-chip">墨影大军 · 波次无尽涌现</span><span class="enemy-chip boss">每10波强敌首领</span><span class="enemy-chip" style="color:var(--jade-bright);font-weight:bold;">每波属性递增 +5%</span>`;
    } else {
      const bossChip = level.boss ? `<span class="enemy-chip boss">首领 · ${level.boss.name}</span>` : '';
      this.prepEnemy.innerHTML = `<span class="enemy-chip">${this.enemySummary(level)}</span>${bossChip}${this.levelCounterHint(level)}`;
    }
    this.prepTip.textContent = level.tip || '';
    if (this.btnStartBattle) {
      this.btnStartBattle.textContent = level.isEndless ? '踏入试炼' : '出 战';
    }
    this.renderHeroPick();
    this.renderDeckSlots();
    this.renderCardPool();
    this.showScreen('screen-prep');
  }

  renderHeroPick() {
    const level = this.currentPrepLevel;
    const save = this.app.save;
    const selectedMain = level.fixedHero || save.hero.selected;
    const selectedAdvisor = save.hero.advisor;
    this.prepHeroes.innerHTML = '';
    const mainHero = getHero(selectedMain);
    const advisorHero = selectedAdvisor ? getHero(selectedAdvisor) : null;

    if (mainHero) {
      this.renderDualHeroDetail(mainHero, advisorHero);
      if (this.prepHeroCurrent) {
        this.prepHeroCurrent.textContent = advisorHero ? `主将:${mainHero.name} | 军师:${advisorHero.name}` : `主将:${mainHero.name}`;
      }
    }

    // 双将切换标签（选择主将 / 选择军师）
    this.heroSelectSlot = this.heroSelectSlot || 'main';

    for (const hero of HEROES) {
      const unlocked = save.unlocks.heroes.includes(hero.id);
      const isMain = hero.id === selectedMain;
      const isAdvisor = hero.id === selectedAdvisor;
      const card = document.createElement('button');
      card.className = 'hero-pick';
      if (isMain) card.classList.add('selected');
      if (isAdvisor) card.classList.add('selected-advisor');
      if (!unlocked) card.classList.add('locked');

      let badge = '';
      if (isMain) badge = '<span class="hp-badge hp-badge-main">主将</span>';
      else if (isAdvisor) badge = '<span class="hp-badge hp-badge-adv">军师</span>';
      else if (!hero.canAdvisor) badge = '<span class="hp-badge hp-badge-mainonly">限主将</span>';

      card.title = `${hero.name} · ${hero.title}\n原型：${hero.archetype || '无'}\n主动：${hero.active.name}\n被动：${hero.passive.name}`;
      card.innerHTML = `
        <span class="hp-art" style="background-image:url('${unlocked ? this.heroThumb(hero) : ''}')"></span>
        <span class="hp-name">${hero.name}</span>
        ${badge}
        ${!unlocked ? `<span class="hp-lock">第 ${hero.unlockLevel} 关解锁</span>` : ''}
      `;

      card.onclick = () => {
        if (!unlocked) {
          audio.error();
          this.toast(`第 ${hero.unlockLevel} 关解锁`);
          return;
        }
        audio.select();
        // 若点击的是当前主将 -> 切换选军师
        if (this.heroSelectSlot === 'advisor') {
          if (hero.id === selectedMain) {
            this.toast('该英雄已任主将，不可兼任军师');
            return;
          }
          if (!hero.canAdvisor) {
            this.toast('该英雄技能特殊，只能作为主将出征');
            return;
          }
          if (hero.id === selectedAdvisor) {
            // 再次点击卸下
            this.app.removeAdvisor();
            this.toast(`已卸下军师【${hero.name}】`);
          } else {
            this.app.selectAdvisor(hero.id);
            this.toast(`军师任命：【${hero.name}】`);
          }
        } else {
          if (level.fixedHero) {
            this.toast('本关主将已定');
            return;
          }
          if (hero.id === selectedAdvisor) {
            this.app.removeAdvisor();
          }
          this.app.selectHero(hero.id);
        }
        this.renderHeroPick();
      };
      this.prepHeroes.appendChild(card);
    }
  }

  // 战前双将详情面板（design §4.8）
  renderDualHeroDetail(mainHero, advisorHero) {
    if (!this.prepHeroSkill) return;
    const isAdvUnlocked = this.app.isAdvisorUnlocked();
    const advBonus = advisorHero ? getAdvisorBonus(advisorHero, mainHero) : null;

    let advHtml = '';
    if (!isAdvUnlocked) {
      advHtml = `<div class="dual-hero-cell locked"><span class="dh-tag">军师位</span><span>通关第 8 关或大本营 3 级解锁</span></div>`;
    } else if (advisorHero && advBonus) {
      const synClass = advBonus.isSameArchetype ? 'synergy' : '';
      advHtml = `
        <div class="dual-hero-cell active ${synClass}">
          <div class="dh-head">
            <span class="dh-tag">军师：${advisorHero.name}</span>
            <span class="dh-syn">${advBonus.isSameArchetype ? '★ 同原型契合(60%)' : '折算(50%)'}</span>
            <button class="dh-btn-remove" id="btn-remove-adv" title="卸下军师">✕</button>
          </div>
          <div class="dh-desc">${advBonus.name}：${advBonus.desc}</div>
        </div>
      `;
    } else {
      advHtml = `
        <div class="dual-hero-cell empty" id="btn-slot-advisor">
          <span class="dh-tag">军师位 (空)</span>
          <span class="dh-hint">点击下方英雄任命军师 (提供 50% 被动)</span>
        </div>
      `;
    }

    const slotToggles = `
      <div class="dh-slot-toggles">
        <button class="dh-toggle ${this.heroSelectSlot !== 'advisor' ? 'active' : ''}" id="btn-toggle-main">选择主将</button>
        ${isAdvUnlocked ? `<button class="dh-toggle ${this.heroSelectSlot === 'advisor' ? 'active' : ''}" id="btn-toggle-adv">任命军师</button>` : ''}
      </div>
    `;

    this.prepHeroSkill.innerHTML = `
      ${slotToggles}
      <div class="dual-hero-card">
        <div class="hs-head">
          <b>主将 · ${mainHero.name}</b>
          <span>主动 · 冷却 ${mainHero.active.cooldown}s</span>
        </div>
        <p class="hs-desc">${mainHero.active.desc}</p>
        <div class="hs-passive"><b>${mainHero.passive.name}</b>${mainHero.passive.desc}</div>
        ${mainHero.gadget ? `<div class="hs-passive" style="border-left-color: #10b981; margin-top: 4px;"><b>⚡ 专属技能【${mainHero.gadget.name}】</b>${mainHero.gadget.desc}</div>` : ''}
        ${advHtml}
      </div>
    `;

    // 绑定事件
    const btnMain = document.getElementById('btn-toggle-main');
    if (btnMain) btnMain.onclick = (e) => {
      e.stopPropagation();
      this.heroSelectSlot = 'main';
      this.renderHeroPick();
    };
    const btnAdv = document.getElementById('btn-toggle-adv');
    if (btnAdv) btnAdv.onclick = (e) => {
      e.stopPropagation();
      this.heroSelectSlot = 'advisor';
      this.renderHeroPick();
    };
    const btnRemove = document.getElementById('btn-remove-adv');
    if (btnRemove) btnRemove.onclick = (e) => {
      e.stopPropagation();
      this.app.removeAdvisor();
    };
  }

  // 战前主将技能详情（#4：看清主动/被动再选将）
  renderHeroSkillDetail(hero) {
    if (!this.prepHeroSkill) return;
    this.prepHeroSkill.innerHTML = `
      <div class="hs-head"><b>${hero.active.name}</b><span>主动 · 冷却 ${hero.active.cooldown}s</span></div>
      <p class="hs-desc">${hero.active.desc}</p>
      <div class="hs-passive"><b>${hero.passive.name}</b>${hero.passive.desc}</div>
      ${hero.gadget ? `<div class="hs-passive" style="border-left-color: #10b981; margin-top: 4px;"><b>⚡ 专属技能【${hero.gadget.name}】</b>${hero.gadget.desc}</div>` : ''}
    `;
  }

  renderDeckSlots() {
    const level = this.currentPrepLevel;
    const fixed = !!level.fixedDeck;
    this.deckSlots.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'deck-slot';
      const id = this.workingDeck[i];
      if (id) {
        const unit = getUnit(id);
        slot.classList.add('filled');
        slot.style.setProperty('--rarity', RARITY[unit.rarity].color);
        slot.innerHTML = `
          <span class="uc-art" style="background-image:url('${this.unitThumb(unit)}')"></span>
          <span class="uc-name">${unit.name}</span>
          ${unit.spell ? '<span class="uc-spell">术</span>' : ''}
          ${fixed ? '' : '<button class="ds-remove" title="移除">×</button>'}
        `;
        const rm = slot.querySelector('.ds-remove');
        if (rm) rm.onclick = (e) => {
          e.stopPropagation();
          this.app.removeDeckCard(i);
        };
      } else {
        slot.innerHTML = '<span class="ds-empty">＋</span>';
      }
      if (i === this.activeSlot) slot.classList.add('active');
      slot.onclick = () => {
        if (fixed) return;
        this.activeSlot = this.activeSlot === i ? null : i;
        this.renderDeckSlots();
        this.renderCardPool();
        audio.click();
      };
      this.deckSlots.appendChild(slot);
    }
    this.deckCount.textContent = `${this.workingDeck.length}/6`;
    const labels = this.app.deckBonusLabels(this.workingDeck);
    this.deckBonus.textContent = labels.length ? `军阵加成：${labels.join(' · ')}` : '军阵加成：无';
  }

  renderCardPool() {
    const level = this.currentPrepLevel;
    const fixed = !!level.fixedDeck;
    const save = this.app.save;
    const trial = new Set(level.trialUnits || []);
    // 触屏设备用长按看详情；有 hover 的设备才响应 mouseenter，避免「松手后详情不消失」
    const canHover = !window.matchMedia || window.matchMedia('(hover: hover)').matches;
    this.cardPool.innerHTML = '';
    this.hidePoolDetail();
    const list = [...UNITS].filter((u) => !u.summonOnly).sort((a, b) => (a.unlockLevel || 99) - (b.unlockLevel || 99));
    for (const unit of list) {
      const unlocked = save.unlocks.units.includes(unit.id) || trial.has(unit.id);
      const inDeck = this.workingDeck.includes(unit.id);
      const card = document.createElement('button');
      card.className = `unit-card rarity-${unit.rarity}`;
      if (!unlocked) card.classList.add('locked');
      if (inDeck) card.classList.add('selected');
      card.innerHTML = `
        <span class="uc-art" style="background-image:url('${unlocked ? this.unitThumb(unit) : this.unitThumb(unit)}')"></span>
        <span class="uc-cost">${unit.cost}</span>
        <span class="uc-rarity"></span>
        <span class="uc-name">${unit.name}</span>
        ${unit.spell ? '<span class="uc-spell">术</span>' : ''}
        ${!unlocked ? `<span class="uc-lock">${unit.gachaUnit ? '点兵池获取' : `第 ${unit.unlockLevel} 关`}</span>` : ''}
      `;
      // 桌面：悬停即看详情，移开即隐（触屏设备没有 hover，只走长按）
      card.onmouseenter = () => {
        if (!canHover || this.tipFromTouch) return;
        this.showPoolDetail(unit, card);
      };
      card.onmouseleave = () => {
        if (!canHover || this.tipFromTouch) return;
        this.hidePoolDetail();
      };
      // 手机：长按看详情，松手即隐（短按仍是入组）
      card.ontouchstart = () => {
        this.tipFromTouch = false;
        clearTimeout(this.tipTimer);
        this.tipTimer = setTimeout(() => {
          this.tipFromTouch = true;
          this.showPoolDetail(unit, card);
          audio.select();
        }, 420);
      };
      card.ontouchmove = () => {
        clearTimeout(this.tipTimer);
        if (this.tipFromTouch) {
          this.tipFromTouch = false;
          this.hidePoolDetail();
        }
      };
      const releaseTouch = () => {
        clearTimeout(this.tipTimer);
        this.hidePoolDetail();
        if (this.tipFromTouch) this.tipFromTouch = 'swallow';
      };
      card.ontouchend = releaseTouch;
      card.ontouchcancel = releaseTouch;
      card.onclick = () => {
        if (this.tipFromTouch === 'swallow') {
          this.tipFromTouch = false;
          return;
        }
        if (fixed) {
          this.toast('教学关卡组已固定');
          return;
        }
        if (!unlocked) {
          audio.error();
          this.toast(unit.gachaUnit ? '该兵种需在「点兵点将」点募' : `第 ${unit.unlockLevel} 关解锁`);
          return;
        }
        this.app.putDeckCard(unit.id, this.activeSlot);
        this.activeSlot = null;
        this.refreshPrepAfterDeck();
        audio.select();
      };
      this.cardPool.appendChild(card);
    }
  }

  // 兵册详情：v1.14 改为浮动提示，跟随卡片定位（悬停 / 长按触发）
  renderPoolDetail(unit) {
    if (!this.poolDetail) return;
    const rarity = RARITY[unit.rarity] ? RARITY[unit.rarity].name : unit.rarity;
    const isSpell = !!unit.spell;
    this.poolDetail.innerHTML = `
      <div class="pd-head"><b>${unit.name}</b><span>${unit.role || '兵种'} · ${rarity}${isSpell ? ' · 术法' : ''}</span></div>
      <div class="pd-stats">
        <span>军令 <b>${unit.cost}</b></span>
        <span>冷却 <b>${unit.cooldown}s</b></span>
        ${isSpell
          ? `<span>范围 <b>${(unit.spellFx && unit.spellFx.radius) || 0}</b></span>`
          : `<span>生命 <b>${unit.hp}</b></span><span>攻击 <b>${unit.atk}</b></span>${unit.building ? '' : `<span>移速 <b>${unit.speed}</b></span>`}`}
      </div>
      <p class="pd-special">${specialText(unit)}</p>
      ${this.counterChips(unit)}
    `;
  }

  showPoolDetail(unit, anchor) {
    if (!this.poolDetail) return;
    this.renderPoolDetail(unit);
    const tip = this.poolDetail;
    tip.style.visibility = 'hidden';
    tip.classList.add('show');
    const r = anchor.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(6, Math.min(vw - w - 6, left));
    let top = r.top - h - 6;
    if (top < 6) top = Math.min(vh - h - 6, r.bottom + 6);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(6, top)}px`;
    tip.style.visibility = '';
  }

  hidePoolDetail() {
    if (this.poolDetail) this.poolDetail.classList.remove('show');
  }

  renderDeckBonus() {
    const labels = this.app.deckBonusLabels(this.workingDeck);
    this.deckBonus.textContent = labels.length ? `军阵加成：${labels.join(' · ')}` : '军阵加成：无';
  }

  refreshPrepAfterDeck() {
    this.workingDeck = this.app.getWorkingDeck(this.currentPrepLevel, true);
    this.renderDeckSlots();
    this.renderCardPool();
    this.renderDeckBonus();
  }

  // ---------------- 战斗 HUD ----------------

  toast(text) {
    if (!text) return;
    // 叠放重合：若已有提示未消失，立即替换并重置计时，避免重复点击时向上堆叠成列
    if (this._activeToast && this._activeToast.parentNode) {
      this._activeToast.remove();
      if (this._toastTimerOut) clearTimeout(this._toastTimerOut);
      if (this._toastTimerRemove) clearTimeout(this._toastTimerRemove);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.toastLayer.appendChild(el);
    this._activeToast = el;
    this._toastTimerOut = setTimeout(() => el.classList.add('out'), 1200);
    this._toastTimerRemove = setTimeout(() => {
      if (this._activeToast === el) this._activeToast = null;
      el.remove();
    }, 1500);
  }

  confirm(title, text, onOk) {
    this.confirmTitle.textContent = title;
    this.confirmText.textContent = text;
    this.confirmAction = onOk;
    this.confirmModal.classList.add('show');
  }

  hideConfirm() {
    this.confirmModal.classList.remove('show');
    this.confirmAction = null;
  }
}

// ---- 挂载模块方法 ----
Object.assign(UI.prototype, uiBattleHud, uiGacha, uiCodex, uiCounters);


// 战斗核心：军令、卡槽、兵线、英雄、波次、首领、结算
import * as THREE from '../lib/three.module.js';
import { BattleScene, PADS } from './scene.js?v=1.93';
import { EffectSystem } from './effects.js?v=1.93';
import { DamageTextManager } from './battle/damage-text.js?v=1.93';
import { createUnitModel, createHeroModel, createBuildingModel, toonMaterial, ghostMaterial } from './models.js?v=1.93';
import { audio } from './audio.js?v=1.93';
import { getUnit } from './data/units.js?v=1.93';
import { getHero, getAdvisorBonus, COMBAT_BUFF_CAPS, getHeroTuning, getHeroCombat } from './data/heroes.js?v=1.93';
import { barracksAtkBonus, workshopBuildingHpBonus, workshopCdReduction } from './data/camp.js?v=1.93';
import { TutorialController } from './tutorial.js?v=1.93';
import { MechanicsController } from './battle/mechanics-controller.js?v=1.93';

// ---- 功能模块（拆分自原单文件，按职责归位）----
import { battleCombat } from './battle/combat.js?v=1.93';
import { battleDeploy } from './battle/deploy.js?v=1.93';
import { battleHero } from './battle/hero.js?v=1.93';
import { battleWaves } from './battle/waves.js?v=1.93';
import { CAMP_MAX_LEVEL, campEnergyMax, campRegen } from './data/camp.js?v=1.93';
import { EndlessManager } from './data/endless-manager.js?v=1.93';
import { PLAYER_BASE_X, ENEMY_BASE_X, ENEMY_SPAWN_X, HERO_MIN, HERO_MAX, PLAYER_BASE_MAX, START_ENERGY, MAX_UNITS_PER_SIDE, HERO_XP, arrowGeo, boltGeo, javelinGeo, axeGeo, stoneGeo, oilGeo, talismanGeo, arrowMat, boltMat, stoneMat, oilMat, talismanMat, HPBAR_BG_GEO, HPBAR_FILL_GEO, HPBAR_BOSS_BG_GEO, HPBAR_BOSS_FILL_GEO, HPBAR_BG_MAT, HPBAR_GREEN_MAT, HPBAR_RED_MAT } from './battle/constants.js?v=1.93';

export class Battle {
  constructor({ canvas, ui, level, heroId, advisorId, deck, save, onFinish, onRestart, onRetreat, savedEndlessState, onBountyEvent }) {
    // 确保通用模型材质恢复 100% 不透明，防止残存半透明或深度缓冲写入异常
    toonMaterial.transparent = false;
    toonMaterial.opacity = 1.0;
    toonMaterial.depthWrite = true;
    toonMaterial.depthTest = true;
    toonMaterial.needsUpdate = true;

    this.canvas = canvas;
    this.ui = ui;
    this.level = level;
    this.heroId = heroId;
    this.heroData = getHero(heroId);
    this.onBountyEvent = onBountyEvent || null;
    this.advisorId = advisorId || null;
    this.advisorData = advisorId ? getHero(advisorId) : null;
    this.advisorBonus = this.advisorData ? getAdvisorBonus(this.advisorData, this.heroData) : null;

    // 大本营成长加成（design §6.1）
    const campData = (save && save.camp) || {};
    this.barracksAtkBonus = barracksAtkBonus(campData.barracksLevel || 0);
    this.workshopBuildingHpBonus = workshopBuildingHpBonus(campData.workshopLevel || 0);
    this.workshopCdReduction = workshopCdReduction(campData.workshopLevel || 0);
    this.deckIds = deck.slice(0, 6);
    this.deckUnits = this.deckIds.map((id) => getUnit(id));
    this.save = save;
    this.onFinish = onFinish;
    this.onRestart = onRestart;
    this.onRetreat = onRetreat;

    this.masteryLevel = Math.min(10, Math.max(1, (save.hero.mastery && save.hero.mastery[heroId]) || 1));
    this.speed = 1;
    this.state = 'intro';
    this.paused = false;
    this.tutorialPause = false; // 新手教程全局暂停标志（皇室战争模式）
    this.introT = 3.2;
    this.countdownShown = 0;
    this.elapsed = 0;
    this.hudTimer = 0;
    this.kills = 0;
    this.baseHp = PLAYER_BASE_MAX;
    this.enemyBaseHp = level.enemyBaseHp;
    this.energy = START_ENERGY;
    this.selectedCard = null;
    this.entities = [];
    this.projectiles = [];
    this.heroArrowProjectiles = [];
    this.fireZones = [];
    this.spawnQueue = [];
    this.pendingBoss = [];
    this.delayedStrikes = [];
    this.waveIndex = -1;
    this.wavesTriggered = new Set();
    this.boss = null;
    this.bossSpawned = false;

    // 英雄数值调校与基础属性初始化
    const hid = this.heroId || (this.heroData && this.heroData.id) || 'zhaoyun';
    const outsideLevel = Math.max(1, Math.min(11, Math.floor(Number(this.save?.hero?.levels?.[hid]) || 1)));
    this.heroOutsideLevel = outsideLevel;
    // 局外永久加成：荒野乱斗体系每级基础属性提升 10% 永久 (Lv.1: 1.0, Lv.11: 2.0)
    this.heroPermMultiplier = 1 + (outsideLevel - 1) * 0.10;

    const tuning = getHeroTuning(hid, (this.save && this.save.settings && this.save.settings.heroTuning) || null);
    this.heroCombat = getHeroCombat(hid);
    this.heroSuperCooldown = Number(this.heroData.active?.cooldown) || Number(tuning.superCooldown) || 50.0;
    this.heroSuperCharge = 0; // 大招开局不可用，需攻击充能至 100%
    this.heroLevel = 1;
    this.heroXp = 0;
    this.skillCd = 0;
    this.heroX = -8.6;
    // Kingdom Rush 风格英雄（赵云原型验证）
    this.heroZ = 0.25;
    this.heroRallyX = this.heroX;
    this.heroRallyZ = this.heroZ;
    this.heroTargetX = this.heroX;
    this.heroTargetZ = this.heroZ;

    this.heroAggroRadius = this.heroCombat.ranged
      ? this.heroCombat.range + 0.6
      : (Number(tuning.aggroRadius) || 2.85);
    this.heroLeashRadius = 4.2;  // 最大追击回防拉扯距离
    this.heroEngageTarget = null;
    this.heroMovingToTarget = false;

    // 基础属性（经局外永久升级加成）
    this.heroBaseMaxHp = Math.round((Number(tuning.maxHp) || 1200) * this.heroPermMultiplier);
    this.heroBaseAtk = Math.round((Number(tuning.atk) || 65) * this.heroPermMultiplier);
    this.heroBaseArmor = Math.round((tuning.armor != null ? Number(tuning.armor) : 10) * this.heroPermMultiplier);
    this.heroRegenRate = Number(tuning.regenRate) || 0.04;
    this.heroSpeed = this.heroCombat.speed || Number(tuning.speed) || 1.6;

    // 专属技能（原妙具更名：7级解锁，冷却 20s，不限次数）
    this.heroGadgetCd = 0;
    this.heroGadgetCooldown = Number(tuning.gadgetCooldown) || 20.0;
    this.heroGadgetSpeedBuff = 0;
    this.heroGadgetRadius = Number(tuning.gadgetRadius) || 3.5;
    this.heroGadgetKnockback = Number(tuning.gadgetKnockback) || 2.2;

    // 局内初始为 1 级（局内每级提升基础数值的 10%）
    this.heroInBattleXp = 0;
    this.heroInBattleLevel = 1;
    this.heroMaxHp = this.heroBaseMaxHp;
    this.heroHp = this.heroMaxHp;
    this.heroArmor = this.heroBaseArmor;
    this.heroAtk = this.heroBaseAtk;
    this.heroAtkInterval = this.heroCombat.atkInterval || Number(tuning.atkInterval) || 0.85;
    this.heroAtkTimer = 0;
    this.heroRange = this.heroCombat.range;
    this.heroBlockSlots = this.heroCombat.block;
    this.heroStealthT = 0;
    this.heroChargeT = 0;
    this.heroWuzetianStele = null;
    this.heroBlockedFoes = new Set();
    this.heroRespawnTimer = 0;
    this.heroOutOfCombatTimer = 0;
    this.heroCombos = 0;
    this.heroAttackAnim = 0;
    this.heroHitFlash = 0;
    this.heroMovingToRally = false;
    this.heroRallyMarker = null;
    this.heroHpBar = null;
    this.dragging = false;
    this.lastHeroMoveEvent = 0;
    this.uid = 0;
    this.endT = 0;
    this.smokeTimer = 0;
    this.auraTimer = 0;
    this.damageMul = (level.tags || []).includes('血战') ? 1.2 : 1;
    // 天气机制（v1.2 #16）：各天气有独立手感，参考死亡突围但更轻量
    const w = level.weather || 'clear';
    this.rangeMul = w === 'fog' ? 0.75 : w === 'night' ? 0.88 : w === 'rain' ? 0.92 : 1;
    this.speedMulWeather = w === 'snow' ? 0.9 : w === 'rain' ? 0.92 : 1;
    this.aspdMulWeather = w === 'snow' ? 0.92 : 1;
    this.energyRegenMul = (level.energyRegenMul || 1) * (w === 'night' ? 0.92 : 1);
    this.fireDuration = w === 'rain' ? 1.6 : 3.0;
    // 大本营成长（design §11.7）：只加法，不乘算
    this.campLevel = Math.max(0, Math.min(CAMP_MAX_LEVEL, Number(save.camp && save.camp.level) || 0));
    this.baseEnergyMax = campEnergyMax(this.campLevel);
    this.campRegen = campRegen(this.campLevel);
    this.energyMax = this.baseEnergyMax;
    this.energyTickT = 0;
    this.pendingSkill = null;
    this.pendingCasts = [];
    this.spellCastT = 0;
    this.skillZones = [];
    this.ambushSpawners = [];
    this.bossDash = null;
    // 无尽模式属性初始化
    this.isEndless = !!level.isEndless;
    this.endlessWave = 1;
    this.endlessClearedWaves = 0;
    this.endlessKills = 0;
    this.endlessBossKills = 0;
    this.totalEnemyBaseDamage = 0;
    this.endlessBuffs = {
      energyRegen: 0,
      costReduction: 0,
      cardCdReduction: 0,
      heroCdReduction: 0,
      teamAtk: 0,
      teamArmor: 0,
      teamRegen: 0,
      critRate: 0,
      siegeBonus: 0,
      heroStatsBonus: 0,
      damageReduction: 0,
      baseMaxBonus: 0,
    };
    this.endlessBuffCounts = {};
    this.endlessBaseShieldTimer = 0;
    this.endlessBaseRecoverTimer = 0;
    this.endlessBuffSelecting = false;

    // 断点续玩载入
    if (this.isEndless && savedEndlessState) {
      this.endlessWave = savedEndlessState.wave || 1;
      this.endlessClearedWaves = savedEndlessState.clearedWaves || (this.endlessWave > 1 ? this.endlessWave - 1 : 0);
      this.endlessKills = savedEndlessState.kills || 0;
      this.endlessBossKills = savedEndlessState.bossKills || 0;
      this.totalEnemyBaseDamage = savedEndlessState.baseDamage || 0;
      if (savedEndlessState.baseHp) this.baseHp = Math.min(this.baseMaxHp, savedEndlessState.baseHp);
      if (savedEndlessState.buffs) Object.assign(this.endlessBuffs, savedEndlessState.buffs);
      if (savedEndlessState.buffCounts) Object.assign(this.endlessBuffCounts, savedEndlessState.buffCounts);
    }


    this.computeDeckBonus();
    this.applyHeroEnergy();
    this.scene = new BattleScene(canvas);
    this.scene.setQuality(save.settings.quality || 'auto');
    this.scene.setWeather(level.weather || 'clear');
    this.scene.showIntro();
    this.effects = new EffectSystem(this.scene.scene, this.scene.camera);
    this.effects.onShake = (i, d) => this.scene.screenShake(i, d);
    this.dmgText = new DamageTextManager(document.getElementById('dmg-layer'));
    this.setupCards();
    this.spawnEnemyTowers();
    this.spawnHero();
    this.createBossShield();
    this.bindPointer();

    this.tutorial = new TutorialController(this, ui);
    this.mechanics = new MechanicsController(this);
    this.ui.setupBattleHUD(this);
    this.ui.setWeather(level.weather || 'clear');

    audio.startMusic('battle');
    this.showCountdown();
    this.loop = this.loop.bind(this);
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.ui.updateBattleHUD(this);
  }

  // ---------- 初始化 ----------

  computeDeckBonus() {
    const tags = { melee: 0, ranged: 0, cavalry: 0, building: 0, support: 0 };
    for (const u of this.deckUnits) {
      if (u.tags.includes('cavalry')) tags.cavalry++;
      else if (u.tags.includes('ranged') && !u.building) tags.ranged++;
      else if (u.building) tags.building++;
      else if (u.tags.includes('support')) tags.support++;
      else tags.melee++;
      if (u.tags.includes('support')) tags.support++;
    }
    this.deckBonus = {
      meleeHp: tags.melee >= 3 ? 1.15 : 1,
      rangedAtk: tags.ranged >= 3 ? 1.15 : 1,
      cavalrySpeed: tags.cavalry >= 2 ? 1.2 : 1,
      buildingHp: tags.building >= 2 ? 1.25 : 1,
      energy: tags.melee >= 1 && tags.ranged >= 1 && tags.support >= 1 ? 1.1 : 1,
      labels: [],
    };
    if (tags.melee >= 3) this.deckBonus.labels.push('步卒同心');
    if (tags.ranged >= 3) this.deckBonus.labels.push('万箭齐发');
    if (tags.cavalry >= 2) this.deckBonus.labels.push('铁骑纵横');
    if (tags.building >= 2) this.deckBonus.labels.push('固若金汤');
    if (tags.melee >= 1 && tags.ranged >= 1 && tags.support >= 1) this.deckBonus.labels.push('奇正相生');
    this.deckBonus.labels = this.deckBonus.labels.slice(0, 3);
  }


  applyHeroEnergy() {
    const p = this.heroData.passive;
    if (!p) return;
    if (p.template === 'energyRegen') this.energyRegenMul *= 1 + p.value;
    if (p.template === 'energyCap') this.energyMax = this.baseEnergyMax + p.value;
    if (p.template === 'energyTick') this.energyTickT = p.interval;
  }


  setupCards() {
    const p = this.heroData.passive;
    const cdCut = p && p.template === 'cdCut' ? 1 - p.value : 1.0;
    this.cards = this.deckUnits.map((u) => ({
      unit: u,
      cd: 0,
      total: u.cooldown * cdCut,
      lock: u.spell ? 12 : 0, // 术法开局蓄势 12 秒（design §3.3.1）
    }));
  }


  spawnHero() {
    const model = createHeroModel(this.heroData, 'player');
    model.group.position.set(this.heroX, 0, this.heroZ || 0.25);
    model.group.rotation.y = -0.16;
    model.group.scale.multiplyScalar(1.08);
    this.scene.scene.add(model.group);
    this.heroModel = model;
    const ringGeo = new THREE.RingGeometry(7.82, 8.0, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4b7a6a, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false,
    });
    this.heroRangeRing = new THREE.Mesh(ringGeo, ringMat);
    this.heroRangeRing.rotation.x = -Math.PI / 2;
    this.heroRangeRing.position.set(this.heroX, 0.028, this.heroZ || 0.25);
    this.scene.scene.add(this.heroRangeRing);
    if (this.attachHeroHealthBar) {
      this.attachHeroHealthBar();
    }
  }


  bindPointer() {
    this.onPointerDown = (e) => {
      if (this.state !== 'running' || this.paused) return;
      e.preventDefault();
      const p = this.scene.projectPointer(e.clientX, e.clientY);
      if (!p) return;
      if (this.selectedCard) {
        this.deployAt(p.x, p.z);
      } else if (this.commandHeroRally) {
        this.commandHeroRally(p.x, p.z);
      }
    };
    this.onPointerMove = () => {};
    this.onPointerUp = () => { this.dragging = false; };
    this.onKeyDown = (e) => {
      if (this.state !== 'running') return;
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (this.paused) return;
      if (e.key >= '1' && e.key <= '6') {
        const card = this.cards[Number(e.key) - 1];
        if (card) this.selectCard(card.unit.id);
      } else if (e.key === 'a' || e.key === 'A') {
        if (this.commandHeroRally) this.commandHeroRally(this.heroX - 1.5, this.heroZ);
      } else if (e.key === 'd' || e.key === 'D') {
        if (this.commandHeroRally) this.commandHeroRally(this.heroX + 1.5, this.heroZ);
      } else if (e.key === 'w' || e.key === 'W') {
        if (this.commandHeroRally) this.commandHeroRally(this.heroX, this.heroZ - 0.8);
      } else if (e.key === 's' || e.key === 'S') {
        if (this.commandHeroRally) this.commandHeroRally(this.heroX, this.heroZ + 0.8);
      } else if (e.key === 'q' || e.key === 'Q') {
        this.useActive();
      } else if (e.key === 'e' || e.key === 'E') {
        this.useGadget();
      }
    };
    this.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  // ---------- 主循环 ----------

  loop(now) {
    const raw = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    const dt = Math.min(0.05, Math.max(0, raw));
    const simDt = (this.paused || this.tutorialPause) ? 0 : dt;
    if (!this.paused && this.state !== 'ended') {
      this.update(simDt * (this.state === 'ending' ? 0.6 : this.speed));
    }
    this.scene.update(dt * 0.5);
    this.effects.update(simDt);
    if (this.dmgText) {
      this.dmgText.update(simDt, this.scene.camera, this.canvas.clientWidth, this.canvas.clientHeight);
    }
    if (!this.paused) this.tutorial.update(dt);
    this.hudTimer += dt;
    if (this.hudTimer > 0.09 && this.state !== 'ended') {
      this.hudTimer = 0;
      this.ui.updateBattleHUD(this);
    }
    this.scene.render();
    this.raf = requestAnimationFrame(this.loop);
  }


  update(dt) {
    if (this.state === 'intro') {
      this.introT -= dt;
      this.showCountdown();
      if (this.introT <= 0) {
        this.state = 'running';
        this.ui.showBattleBanner('战', '列阵迎敌', 900);
        audio.drum(null, true, 0.3);
        if (this.level.tutorial) this.tutorial.start(this.level.tutorial);
      }
      return;
    }
    if (this.state === 'ending') {
      this.endT -= dt;
      this.updateProjectiles(dt);
      this.effects.update(dt);
      if (this.endT <= 0) this.finalizeEnd();
      return;
    }
    if (this.state !== 'running') return;

    this.elapsed += dt;
    const endlessRegenMul = (this.isEndless && this.endlessBuffs && this.endlessBuffs.energyRegen) ? (1 + this.endlessBuffs.energyRegen) : 1;
    this.energy = Math.min(this.energyMax, this.energy + this.campRegen * this.energyRegenMul * this.deckBonus.energy * endlessRegenMul * dt);
    // 武则天「垂拱」类：周期性额外军令
    if (this.energyTickT > 0) {
      this.energyTickT -= dt;
      if (this.energyTickT <= 0) {
        const p = this.heroData.passive;
        this.energyTickT = p.interval;
        this.energy = Math.min(this.energyMax, this.energy + p.amount);
        this.effects.ring(this.heroX, 0.25, 0xc9a25e, 0.4, 2.0, 0.5, 0.5);
      }
    }
    // 英雄技能起手式（0.35s 举武器前摇后释放）
    if (this.pendingSkill && typeof this.pendingSkill.t === 'number') {
      if (this.isHeroAlive && !this.isHeroAlive()) {
        this.pendingSkill = null;
        this.heroSkillAnim = null;
      } else {
        this.pendingSkill.t -= dt;
        if (this.pendingSkill.t <= 0) {
          this.pendingSkill = null;
          this.runSkill();
        }
      }
    }
    for (const c of this.cards) {
      if (c.cd > 0) c.cd = Math.max(0, c.cd - dt);
      if (c.lock > 0) c.lock = Math.max(0, c.lock - dt);
    }
    if (this.spellCastT > 0) this.spellCastT -= dt;
    if (this.pendingCasts.length) {
      for (let i = this.pendingCasts.length - 1; i >= 0; i--) {
        const c = this.pendingCasts[i];
        c.t -= dt;
        if (c.t <= 0) {
          this.pendingCasts.splice(i, 1);
          this.applySpell(c.spell, c.x, c.z);
        }
      }
    }
    if (this.skillCd > 0) this.skillCd = Math.max(0, this.skillCd - dt);
    if (this.heroGadgetCd > 0) this.heroGadgetCd = Math.max(0, this.heroGadgetCd - dt);
    if (this.heroGadgetSpeedBuff > 0) this.heroGadgetSpeedBuff = Math.max(0, this.heroGadgetSpeedBuff - dt);

    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = 0.22;
      this.recomputeAuras();
    }

    if (this.isEndless) {
      this.updateEndlessWaves(dt);
      this.updateEndlessBaseShield(dt);
      this.updateEndlessRegen(dt);
    } else {
      this.updateWaves();
    }
    this.updateEntities(dt);
    if (this.mechanics) this.mechanics.update(dt);
    this.updateHealthBars(dt);
    this.updateProjectiles(dt);
    this.updateFireZones(dt);
    this.updateSkillZones(dt);
    this.updateAmbushSpawners(dt * (this.paused ? 0 : 1));
    this.updatePendingBoss(dt);
    this.updateDelayedStrikes(dt);
    if (this.updateHeroKR) this.updateHeroKR(dt);
    this.updateHeroVisual(dt);
    this.updateBaseVisual(dt);
    this.separateUnits();
    this.updateAudioIntensity();

    if (this.baseHp <= 0) this.finish(false);
    else if (!this.isEndless && this.enemyBaseHp <= 0) this.finish(true);
  }

  // ---------- 倒计时 ----------

  showCountdown() {
    if (this.state !== 'intro') return;
    const stage = Math.ceil(this.introT / 0.8);
    if (stage !== this.countdownShown) {
      this.countdownShown = stage;
      if (stage === 4) this.ui.showBattleBanner('三', '黄巾蔽野，列阵', 620);
      else if (stage === 3) this.ui.showBattleBanner('二', '点卡落兵，静候号令', 620);
      else if (stage === 2) this.ui.showBattleBanner('一', '主将就位', 620);
      else if (stage === 1) this.ui.showBattleBanner('战', '杀', 700);
    }
  }

  // ---------- 卡牌与部署 ----------

  togglePause() {
    if (this.state === 'ended' || this.state === 'ending') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.ui.showPause();
      this.dragging = false;
    } else {
      this.ui.hidePause();
    }
  }


  resume() {
    if (this.paused) {
      this.paused = false;
      this.ui.hidePause();
    }
  }


  requestRestart() {
    if (this.onRestart) this.onRestart();
  }


  requestRetreat() {
    if (this.onRetreat) this.onRetreat();
  }


  setSpeed(speed) {
    this.speed = speed === 2 ? 2 : 1;
  }


  toggleSpeed() {
    this.setSpeed(this.speed === 1 ? 2 : 1);
    return this.speed;
  }


  event(name, payload = {}) {
    this.tutorial.handle(name, payload);
  }


  isPassiveUnlocked() {
    return (this.heroOutsideLevel || 1) >= 3;
  }

  isGadgetUnlocked() {
    return (this.heroOutsideLevel || 1) >= 7;
  }

  useGadget() {
    if (this.heroUseGadget) {
      return this.heroUseGadget();
    }
  }

  applyHeroTuning(tuning) {
    if (!tuning) return;
    const oldMaxHp = this.heroMaxHp || 1200;
    const hpRatio = this.heroHp / Math.max(1, oldMaxHp);
    const permMul = this.heroPermMultiplier || 1;
    const inBattleMul = 1 + ((this.heroInBattleLevel || 1) - 1) * 0.10;
    if (tuning.maxHp != null) {
      this.heroBaseMaxHp = Math.round(Math.max(100, Number(tuning.maxHp)) * permMul);
      this.heroMaxHp = Math.round(this.heroBaseMaxHp * inBattleMul);
      this.heroHp = Math.max(1, Math.min(this.heroMaxHp, Math.round(this.heroMaxHp * hpRatio)));
    }
    if (tuning.atk != null) {
      this.heroBaseAtk = Math.round(Math.max(1, Number(tuning.atk)) * permMul);
      this.heroAtk = Math.round(this.heroBaseAtk * inBattleMul);
    }
    if (tuning.armor != null) {
      this.heroBaseArmor = Math.round(Math.max(0, Number(tuning.armor)) * permMul);
      this.heroArmor = Math.round(this.heroBaseArmor * inBattleMul);
    }
    if (tuning.atkInterval != null) this.heroAtkInterval = Math.max(0.4, Number(tuning.atkInterval));
    if (tuning.speed != null) this.heroSpeed = Math.max(0.2, Number(tuning.speed));
    if (tuning.regenRate != null) this.heroRegenRate = Math.max(0.005, Number(tuning.regenRate));
    if (tuning.aggroRadius != null) this.heroAggroRadius = Math.max(0.5, Number(tuning.aggroRadius));
    if (tuning.gadgetRadius != null) this.heroGadgetRadius = Math.max(1.0, Number(tuning.gadgetRadius));
    if (tuning.gadgetKnockback != null) this.heroGadgetKnockback = Math.max(0.2, Number(tuning.gadgetKnockback));
    if (tuning.gadgetCooldown != null) this.heroGadgetCooldown = Math.max(2.0, Number(tuning.gadgetCooldown));
    if (tuning.superCooldown != null) this.heroSuperCooldown = Math.max(5.0, Number(tuning.superCooldown));
    if (this.updateHeroHealthBar) this.updateHeroHealthBar(0.016);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.tutorial) {
      try { this.tutorial.stop(); } catch (e) {}
    }
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    audio.stopMusic();
    if (this.dmgText) this.dmgText.clear();
    if (this.heroHpBar && this.heroHpBar.group) {
      this.scene.scene.remove(this.heroHpBar.group);
    }
    if (this.heroRallyMarker && this.heroRallyMarker.group) {
      this.scene.scene.remove(this.heroRallyMarker.group);
    }
    if (this.heroBlockedFoes) {
      this.heroBlockedFoes.forEach((e) => { e.heroBlockedBy = null; });
      this.heroBlockedFoes.clear();
    }
    this.scene.dispose();
    this.entities = [];
    this.projectiles = [];
  }


  saveEndlessAndExit() {
    if (!this.isEndless) return;
    EndlessManager.saveProgress({
      wave: this.endlessWave,
      clearedWaves: this.endlessClearedWaves,
      kills: this.endlessKills,
      bossKills: this.endlessBossKills,
      baseDamage: this.totalEnemyBaseDamage,
      baseHp: this.baseHp,
      buffs: this.endlessBuffs,
      buffCounts: this.endlessBuffCounts,
      heroId: this.heroId,
      deckIds: this.deckIds,
    });
    audio.stopMusic();
    this.state = 'ended';
    if (this.onRetreat) this.onRetreat();
  }

  settleEndlessEarly() {
    if (!this.isEndless) return;
    this.finish(false);
    this.finalizeEnd();
  }

}

Object.assign(Battle.prototype, battleCombat, battleDeploy, battleHero, battleWaves);


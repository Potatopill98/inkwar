import * as THREE from '../../lib/three.module.js';
import { PLAYER_BASE_X, ENEMY_BASE_X, ENEMY_SPAWN_X, PLAYER_BASE_MAX, MAX_UNITS_PER_SIDE } from './constants.js?v=1.93';
import { getUnit } from '../data/units.js?v=1.93';
import { audio } from '../audio.js?v=1.93';
import { EndlessManager, ENDLESS_BOSS_LADDER } from '../data/endless-manager.js?v=1.93';
// 战斗 · 波次/首领/冲刺/胜负结算/基地表现
export const battleWaves = {
  spawnEnemyTowers() {
    for (const t of (this.level.enemyTowers || [])) {
      const unit = getUnit(t.type);
      const e = this.createEntity({
        unit, side: 'enemy', x: t.x, z: t.z, kind: 'building',
        hpMul: t.hpMul || 1,
        atkMul: 1,
      });
      e.isTower = true;
    }
  }
,


  updateWaves() {
    const waves = this.level.waves || [];
    while (this.waveIndex + 1 < waves.length && this.elapsed >= waves[this.waveIndex + 1].t) {
      this.waveIndex++;
      const wave = waves[this.waveIndex];
      this.ui.showBattleBanner(`第 ${this.waveIndex + 1} 波`, wave.label || '', 1700);
      audio.drum(null, true, 0.22);
      let groupIndex = 0;
      for (const group of wave.units) {
        for (let i = 0; i < group.count; i++) {
          this.spawnQueue.push({
            at: this.elapsed + groupIndex * 0.25 + i * (group.gap || 1.0),
            type: group.type,
            hpMul: group.hpMul || 1,
            atkMul: group.atkMul || 1,
          });
        }
        groupIndex += 1;
      }
      if (this.waveIndex >= 0) audio.setIntensity(1);
    }
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.elapsed >= item.at) {
        const liveEnemies = this.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit.building).length;
        if (liveEnemies < MAX_UNITS_PER_SIDE) {
          const unit = getUnit(item.type);
          const x = ENEMY_SPAWN_X + (Math.random() - 0.5) * 0.9;
          this.createEntity({
            unit, side: 'enemy', x, z: (Math.random() - 0.5) * 2.4, kind: 'unit',
            hpMul: item.hpMul, atkMul: item.atkMul,
          });
          this.effects.dust(x, 0, 2, 0.6);
        }
        this.spawnQueue.splice(i, 1);
      }
    }
    if (this.level.boss && !this.bossSpawned && this.elapsed >= this.level.boss.spawnT) {
      this.spawnBoss();
    }
  }
,


  createBossShield() {
    if (!this.level.boss) return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.55, 2.85, 24),
      new THREE.MeshBasicMaterial({ color: 0xb23a2f, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ENEMY_BASE_X, 0.06, 0);
    this.scene.scene.add(ring);
    this.bossShield = ring;
  }
,


  removeBossShield() {
    if (!this.bossShield) return;
    this.scene.scene.remove(this.bossShield);
    this.bossShield.geometry.dispose();
    this.bossShield.material.dispose();
    this.bossShield = null;
    this.ui.showBattleBanner('墨盾已破', '敌寨再无庇护', 1600);
  }
,


  spawnBoss() {
    const cfg = this.level.boss;
    this.bossSpawned = true;
    const unit = getUnit(cfg.type);
    const boss = this.createEntity({
      unit, side: 'enemy', x: 13.0, z: 0, kind: 'unit', isBoss: true, hpOverride: cfg.hp, hpMul: 1, atkMul: 1,
    });
    boss.bossSkills = (cfg.skills || []).slice();
    boss.skillTimers = {};
    for (const s of boss.bossSkills) {
      if (s === 'summon') boss.skillTimers.summon = 8;
      if (s === 'wind') boss.skillTimers.wind = 5;
      if (s === 'charge') boss.skillTimers.charge = 7;
      if (s === 'crescent') boss.skillTimers.crescent = 5;
    }
    this.boss = boss;
    boss.chargesLeft = 3;
    this.ui.showBossBar(cfg.name, cfg.hp, cfg.hp);
    this.ui.showBattleBanner(`${cfg.name} 登场`, '先破首领，再破敌寨', 2200);
    audio.bossRoar();
    this.ui.flash('boss');
    this.scene.screenShake(0.35, 0.5);
    this.effects.ring(13, 0, 0xb23a2f, 0.6, 4.5, 1.2, 0.8);
    this.effects.pillar(13, 0, 0xb23a2f, 6);
    audio.setBoss(true);
  }
,

  // ---------- 光环 / 治疗 / 减速 ----------

  // 首领冲锋：限次、限位、快速滑行（非瞬移），撞到建筑会被挡停（v1.2 #11）
  bossCharge(boss, distance, damage) {
    if (!boss.alive || this.bossDash) return;
    if (boss.chargesLeft === undefined) boss.chargesLeft = 3;
    if (boss.chargesLeft <= 0 || boss.x < -8.5) {
      this.queueBossCrescent(boss);
      return;
    }
    const rawEndX = boss.x - distance;
    let stopX = Math.max(-10.5, Math.min(12.5, rawEndX));
    let blocker = null;
    for (const e of this.entities) {
      if (!e.alive || e.side !== 'player') continue;
      if (!(e.unit.building || (e.unit.look && e.unit.look.building))) continue;
      if (e.x <= boss.x && e.x >= stopX - 0.6) {
        if (!blocker || e.x > blocker.x) blocker = e;
      }
    }
    if (blocker) stopX = Math.min(boss.x, blocker.x + 0.9);
    boss.chargesLeft--;
    if (boss.x - stopX < 1.2) {
      if (blocker) {
        this.applyDamage(blocker, damage * 1.2, boss);
        this.effects.slash(blocker.x + 0.5, 0.8, 0, 'red', 2.2);
        this.scene.screenShake(0.25, 0.3);
        this.ui.showBattleBanner('拒马挡锋', '首领冲锋被阻', 1200);
      }
      return;
    }
    this.bossDash = { boss, x0: boss.x, x1: stopX, t: 0, dur: 0.4, dmg: damage, blocker, hit: new Set() };
    this.ui.showBattleBanner('赤兔突阵', blocker ? '拒马可挡锋芒' : '闪避冲锋', 900);
    this.effects.ring(boss.x, 0.3, 0xb23a2f, 0.5, 3.5, 0.6, 0.8);
    audio.charge();
  },


  queueBossCrescent(boss) {
    const x = boss.x - 3.2;
    this.pendingBoss.push({ x, z: 0, time: 1.2, damage: 300, radius: 2.5, boss });
    this.effects.ring(x, 0, 0xb23a2f, 0.5, 3.0, 1.2, 0.7);
    this.ui.showBattleBanner('戟气斩', '朱砂圈内，速避', 1100);
    audio.bossRoar();
  }
,


  updatePendingBoss(dt) {
    // 冲锋位移（快速滑行，非瞬移）
    if (this.bossDash) {
      const dash = this.bossDash;
      const b = dash.boss;
      dash.t += dt;
      const k = Math.min(1, dash.t / dash.dur);
      const ease = 1 - Math.pow(1 - k, 3);
      const nx = dash.x0 + (dash.x1 - dash.x0) * ease;
      for (const e of this.entities) {
        if (!e.alive || e.side !== 'player' || dash.hit.has(e)) continue;
        if (e.x <= dash.x0 + 0.3 && e.x >= nx - 0.8) {
          dash.hit.add(e);
          this.applyDamage(e, dash.dmg, b);
          e.x = Math.min(13.2, e.x + 0.9);
          if (e.model) e.model.group.position.x = e.x;
          this.effects.inkBurst(e.x, 0.9, e.z, 6, 0x2a2a24, 1.0);
        }
      }
      b.x = nx;
      if (b.model) b.model.group.position.x = nx;
      if (Math.random() < 0.65) this.effects.dust(nx + 0.8, (Math.random() - 0.5) * 1.4, 3, 1.1);
      if (k >= 1) {
        if (dash.blocker && dash.blocker.alive) {
          this.applyDamage(dash.blocker, dash.dmg * 1.3, b);
          this.effects.slash(dash.blocker.x + 0.6, 0.8, 0, 'red', 2.4);
          this.ui.showBattleBanner('拒马挡锋', '首领冲锋被阻', 1200);
          audio.explosion();
        }
        this.scene.screenShake(0.26, 0.3);
        this.bossDash = null;
      }
      return;
    }
    for (let i = this.pendingBoss.length - 1; i >= 0; i--) {
      const p = this.pendingBoss[i];
      p.time -= dt;
      if (p.time <= 0) {
        for (const e of this.entities) {
          if (e.alive && e.side === 'player' && Math.abs(e.x - p.x) <= p.radius) {
            this.applyDamage(e, p.damage, p.boss);
          }
        }
        this.effects.slash(p.x, 0.9, 0, 'red', 3.2);
        this.effects.ring(p.x, 0, 0xb23a2f, 0.5, 3.2, 0.4, 0.8);
        this.scene.screenShake(0.25, 0.3);
        audio.explosion();
        this.pendingBoss.splice(i, 1);
      }
    }
    // 首领技能计时
    const boss = this.boss;
    if (!boss || !boss.alive || !boss.skillTimers) return;
    for (const key of Object.keys(boss.skillTimers)) {
      boss.skillTimers[key] -= dt;
      if (boss.skillTimers[key] > 0) continue;
      if (key === 'summon') {
        boss.skillTimers.summon = 14;
        for (let k = 0; k < 4; k++) {
          this.createEntity({
            unit: getUnit('militia'), side: 'enemy', x: boss.x - 1.2 + (k - 1.5) * 0.4,
            z: (Math.random() - 0.5) * 1.2, hpMul: 1, atkMul: 1,
          });
        }
        this.effects.summon(boss.x - 1.2, 0, 0x6a8a5a);
        this.ui.showBattleBanner('黄巾召来', '妖道再起', 1200);
      } else if (key === 'wind') {
        boss.skillTimers.wind = 10;
        for (const e of this.entities) {
          if (e.alive && e.side === 'player' && Math.abs(e.x - boss.x) <= 8) {
            e.buffs.slow = Math.max(e.buffs.slow, 3);
            e.buffs.slowFactor = Math.max(e.buffs.slowFactor, 0.4);
          }
        }
        this.effects.ring(boss.x - 3, 0, 0x6a8a5a, 1, 7, 0.9, 0.5);
        this.ui.showBattleBanner('妖风', '军阵迟滞', 1200);
      } else if (key === 'charge') {
        boss.skillTimers.charge = 12;
        this.bossCharge(boss, boss.unit.id === 'boss_lvbu' ? 8 : 5, boss.unit.id === 'boss_lvbu' ? 220 : 150);
      } else if (key === 'crescent') {
        boss.skillTimers.crescent = 9;
        this.queueBossCrescent(boss);
      }
    }
  }
,


  recomputeAuras() {
    for (const e of this.entities) {
      if (!e.alive) continue;
      e.auraAtk = 1;
      e.auraSpeed = 1;
      e.auraMove = 1;
      e.auraHeal = 0;
      e.auraRegen = 0;
      e.auraDamageTaken = 1;
      e.auraCrit = 0;
    }
    for (const s of this.entities) {
      if (!s.alive) continue;
      const sp = s.unit.special;
      const side = s.side;
      if (s.unit.building && sp === 'healAura') {
        for (const e of this.entities) {
          if (e.alive && e.side === side && e.kind !== 'building' && Math.abs(e.x - s.x) <= 5) {
            e.auraHeal += 12;
          }
        }
      } else if (s.unit.building && sp === 'auraSpeed') {
        for (const e of this.entities) {
          if (e.alive && e.side === side && !e.unit.building && Math.abs(e.x - s.x) <= 6) e.auraSpeed *= 1.2;
        }
      } else if (sp === 'auraAtk') {
        for (const e of this.entities) {
          if (e.alive && e.side === side && !e.unit.building && Math.abs(e.x - s.x) <= 5) e.auraAtk *= 1.12;
        }
      } else if (sp === 'eliteAura') {
        for (const e of this.entities) {
          if (e.alive && e.side === side && e.unit.tags.includes('infantry') && Math.abs(e.x - s.x) <= 5) {
            e.auraAtk *= 1.15;
            e.auraDamageTaken *= 0.9;
          }
        }
      } else if (sp === 'barricade') {
        for (const e of this.entities) {
          if (e.alive && e.side !== side && !e.unit.building && Math.abs(e.x - s.x) <= 2.5) {
            e.buffs.slow = Math.max(e.buffs.slow, 0.35);
            e.buffs.slowFactor = Math.max(e.buffs.slowFactor, 0.3);
          }
        }
      }
    }
    // 英雄光环（数据驱动，按 passive.template 分发）
    const hp = this.heroPower();
    const p = this.heroData.passive;
    let countAtkBonus = 0;
    if (p && p.template === 'countAtk') {
      const n = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building).length;
      countAtkBonus = Math.min(p.cap, Math.floor(n / p.per) * p.value) * hp;
    }
    // 李靖「六花阵」：兵种多样性加成
    let formationBonus = 0;
    if (p && p.template === 'formation') {
      const kinds = new Set(this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building).map((e) => e.unit.id)).size;
      formationBonus = Math.min(p.cap, kinds * p.per) * hp;
    }
    // 白起「人屠」：击杀叠攻速
    const rampage = (p && p.template === 'killRampage') ? (this.rampage || 0) : 0;
    for (const e of this.entities) {
      if (!e.alive || !p) continue;
      if (this.isHeroAlive && !this.isHeroAlive()) continue;
      if (this.isPassiveUnlocked && !this.isPassiveUnlocked()) continue;
      const d = Math.abs(e.x - this.heroX);
      if (e.side === 'player') {
        if (p.template === 'auraAspd' && d <= p.radius && !e.unit.building) {
          e.auraSpeed *= 1 + p.value * hp;
          if (p.regen) e.auraRegen += p.regen * hp;
        }
        if (p.template === 'radiusAtk' && d <= p.radius && !e.unit.building) {
          e.auraAtk *= 1 + p.value * hp;
        }
        if (p.template === 'baseHpTrigger' && this.baseHp / PLAYER_BASE_MAX < p.threshold && !e.unit.building) {
          e.auraAtk *= 1 + p.atk * hp;
        }
        if (p.template === 'globalAspd' && !e.unit.building) e.auraSpeed *= 1 + p.value * hp;
        if (p.template === 'tagAspd' && !e.unit.building && e.unit.tags.includes(p.tag)) e.auraSpeed *= 1 + p.value * hp;
        if (p.template === 'critAura' && !e.unit.building) e.auraCrit = Math.min(0.35, p.chance);
        if (countAtkBonus && !e.unit.building) e.auraAtk *= 1 + countAtkBonus;
        if (formationBonus && !e.unit.building) e.auraAtk *= 1 + formationBonus;
        if (rampage && !e.unit.building) e.auraSpeed *= 1 + rampage;
      } else {
        if (p.template === 'auraAtkDown' && d <= p.radius) {
          e.buffs.atkDebuff = Math.min(e.buffs.atkDebuff || 1, 1 - p.value * hp);
          e.buffs.atkDebuffTime = 0.35;
        }
        if (p.template === 'enemyAspdDown' && !e.unit.building) e.auraSpeed *= Math.max(0.4, 1 - p.value * hp);
        if (p.template === 'enemySpdDown' && !e.unit.building) e.auraMove *= Math.max(0.4, 1 - p.value * hp);
      }
    }
    // 诸葛亮「八阵」：周期护盾
    if (p && p.template === 'shieldRegen') {
      this.shieldRegenAcc = (this.shieldRegenAcc || 0) + 0.22;
      if (this.shieldRegenAcc >= p.interval) {
        this.shieldRegenAcc -= p.interval;
        for (const e of this.entities) {
          if (!e.alive || e.side !== 'player' || e.unit.building) continue;
          e.shield = Math.max(e.shield, e.maxHp * p.value * hp);
          e.buffs.shieldTime = 6;
        }
        this.effects.ring(this.heroX, 0.3, 0x8a8478, 0.4, 6, 0.6, 0.6);
      }
    }
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.auraHeal > 0) {
        e.hp = Math.min(e.maxHp, e.hp + e.auraHeal * 0.22);
        if (Math.random() < 0.06) this.effects.heal(e.x, 0.9, e.z);
      }
      if (e.auraRegen > 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.auraRegen * 0.22);
    }
  }
,

  // ---------- 实体更新 ----------

  updateAudioIntensity() {
    if (this.enemyBaseHp / this.level.enemyBaseHp < 0.4) audio.setIntensity(2);
  }
,


  updateBaseVisual(dt) {
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.9;
      if (this.enemyBaseHp / this.level.enemyBaseHp < 0.75) {
        this.effects.dust(ENEMY_BASE_X + 2.5, 1.8, 2, 1.2);
      }
      if (this.baseHp / PLAYER_BASE_MAX < 0.75) {
        this.effects.dust(PLAYER_BASE_X - 2.5, 1.8, 2, 1.2);
      }
    }
    if (this.bossShield) {
      const t = performance.now() * 0.001;
      this.bossShield.material.opacity = 0.24 + Math.sin(t * 2.2) * 0.1;
      this.bossShield.rotation.z = t * 0.25;
    }
  }
,

  // ---------- 结束 ----------

  finish(win) {
    if (this.state !== 'running') return;
    this.state = 'ending';
    this.won = win;
    this.endT = 0.95;
    this.selectedCard = null;
    this.scene.showDeploy(false);
    this.event('victory');
    if (win) {
      audio.victory();
      this.ui.flash('victory');
      this.scene.screenShake(0.2, 0.4);
      this.effects.ring(ENEMY_BASE_X, 0, 0xc9a25e, 1, 10, 1.2, 0.8);
      this.ui.showBattleBanner('敌寨已破', '山河重光', 1800);
    } else {
      audio.defeat();
      this.ui.flash('defeat');
      this.ui.showBattleBanner('帅帐失守', '胜败乃兵家常事', 1800);
    }
  }
,


  
  // ==========================================================================
  // 无尽模式（墨影试炼）核心逻辑
  // ==========================================================================

  // 1. 敌方大本营打到 0 血触发大爆炸：击退非英雄单位至中场并扣除 80% 最大生命值，英雄完全免疫！
  triggerEndlessBaseExplosion() {
    if (this._inExplosion) return;
    this._inExplosion = true;
    setTimeout(() => { this._inExplosion = false; }, 200);

    // 震撼全场音效与画面反馈
    audio.explosion();
    audio.gong(null, 1.2);
    this.scene?.screenShake?.(0.65, 0.7);
    this.ui?.flash?.('victory');
    this.ui?.showBattleBanner?.('敌寨逆流暴击', '破寨逆流震荡！我军速退中场，主将神威护体！', 2200);

    // 爆炸视觉粒子
    if (this.effects) {
      if (this.effects.nuke) this.effects.nuke(ENEMY_BASE_X, 0, 0);
      else if (this.effects.bossDeath) this.effects.bossDeath(ENEMY_BASE_X, 1.5, 0);
      this.effects.ring?.(ENEMY_BASE_X, 0, 0xb23a2f, 1.5, 14.0, 1.2, 0.9);
      this.effects.ring?.(ENEMY_BASE_X, 0, 0xc9a25e, 0.8, 10.0, 0.8, 0.9);
      this.effects.dust?.(ENEMY_BASE_X, 1.5, 12, 3.5);
    }

    // 1) 英雄绝对免疫该 80% 伤害！金光护体，身姿不倒，推至中场安全线
    if (this.isHeroAlive && this.isHeroAlive()) {
      if (this.effects?.buff) this.effects.buff(this.heroX, 1.0, this.heroZ || 0, 'gold');
      if (this.heroX > 0.5) {
        this.heroX = 0.5;
        if (this.heroModel?.group) this.heroModel.group.position.x = 0.5;
      }
    }

    // 2) 普通友方单位：击退至中场 (-3.0 ~ -0.5) 并受到可调反噬伤害
    const tuning = EndlessManager.getTuning();
    const reboundRatio = tuning.enemyBaseReboundRatio ?? 0.80;
    const invincibleTime = tuning.enemyBaseInvincibleTime ?? 3.0;

    for (const u of this.entities) {
      if (!u.alive || u.side !== 'player') continue;
      if (u.unit?.building) continue;

      const isHeroUnit = u.isHero || u === this.getHeroTargetObj?.() || (u.unit && u.unit.hero);
      if (!isHeroUnit) {
        const targetMidX = -1.0 - Math.random() * 2.5;
        u.x = Math.min(u.x, targetMidX);
        if (u.mesh) u.mesh.position.x = u.x;
        const dmg = Math.round(u.maxHp * reboundRatio);
        this.applyDamage(u, dmg, null, { isBaseExplosion: true });
        if (this.effects?.blood) this.effects.blood(u.x, 1.0, u.z, 3);
      }
    }

    // 启动敌寨无敌金光护盾与平滑回血动画 (0 -> maxBaseHp)
    this.endlessBaseShieldTimer = invincibleTime;
    this.endlessBaseRecoverTimer = invincibleTime;
    this.enemyBaseHp = 0;
    this.createEndlessBaseShield();
  },

  // 敌寨无敌护盾 3D 呈现（敌军大本营保持金光护盾，不用改动）
  createEndlessBaseShield() {
    this.removeEndlessBaseShield();
    const ringGeo = new THREE.RingGeometry(2.6, 3.2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc9a25e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shield = new THREE.Mesh(ringGeo, ringMat);
    shield.rotation.x = -Math.PI / 2;
    shield.position.set(ENEMY_BASE_X, 0.45, 0);
    this.scene.scene.add(shield);
    this.endlessBaseShieldMesh = shield;
  },

  removeEndlessBaseShield() {
    if (this.endlessBaseShieldMesh) {
      this.scene.scene.remove(this.endlessBaseShieldMesh);
      this.endlessBaseShieldMesh.geometry?.dispose();
      this.endlessBaseShieldMesh.material?.dispose();
      this.endlessBaseShieldMesh = null;
    }
  },

  updateEndlessBaseShield(dt) {
    if (this.endlessBaseShieldTimer > 0) {
      const tuning = EndlessManager.getTuning();
      const maxBaseHp = tuning.enemyBaseMaxHp ?? 5000;
      const totalInvincible = tuning.enemyBaseInvincibleTime ?? 3.0;

      this.endlessBaseShieldTimer = Math.max(0, this.endlessBaseShieldTimer - dt);
      this.endlessBaseRecoverTimer = Math.max(0, this.endlessBaseRecoverTimer - dt);

      // 平滑恢复至 maxBaseHp 血
      const p = 1 - (this.endlessBaseRecoverTimer / Math.max(0.1, totalInvincible));
      this.enemyBaseHp = Math.min(maxBaseHp, Math.round(p * maxBaseHp));

      if (this.endlessBaseShieldMesh) {
        const t = performance.now() * 0.003;
        this.endlessBaseShieldMesh.material.opacity = 0.5 + Math.sin(t * 8) * 0.35;
        this.endlessBaseShieldMesh.rotation.z = t * 1.5;
        const scalePulse = 1.0 + Math.sin(t * 12) * 0.08;
        this.endlessBaseShieldMesh.scale.set(scalePulse, scalePulse, 1);
      }
      if (Math.random() < 0.25) {
        this.effects?.summon?.(ENEMY_BASE_X + (Math.random() - 0.5) * 1.5, 0, 0x4ade80);
      }
      if (this.endlessBaseShieldTimer <= 0) {
        this.removeEndlessBaseShield();
        this.enemyBaseHp = maxBaseHp;
        this.ui?.showBattleBanner?.('敌寨重生', `大本营护盾消散，${maxBaseHp}血量重整！`, 1600);
      }
    }
  },

  // 2. 无尽模式波次刷新逻辑
  updateEndlessWaves(dt) {
    if (this.state !== 'running') return;
    this.endlessWave = this.endlessWave || 1;
    this.endlessClearedWaves = this.endlessClearedWaves || 0;

    // 如果处于肉鸽选牌状态或全局暂停，阻断波次流转 (#6)
    if (this.endlessBuffSelecting || this.paused) return;

    // 波次初始化启动
    if (!this._endlessWaveStarted) {
      this._endlessWaveStarted = true;
      this._endlessWaveTimer = 0;
      this.startEndlessWave(this.endlessWave);
    }

    // 处理待生成队列
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.elapsed >= item.at) {
        const liveEnemies = this.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit?.building).length;
        if (liveEnemies < MAX_UNITS_PER_SIDE || item.isBoss) {
          const unit = getUnit(item.type);
          if (unit) {
            const x = item.x !== undefined ? item.x : (ENEMY_SPAWN_X + (Math.random() - 0.5) * 0.9);
            const ent = this.createEntity({
              unit,
              side: 'enemy',
              x,
              z: item.z !== undefined ? item.z : ((Math.random() - 0.5) * 2.4),
              kind: 'unit',
              isBoss: !!item.isBoss,
              hpOverride: item.hpOverride,
              hpMul: item.hpMul || 1,
              atkMul: item.atkMul || 1,
            });
            if (item.isBoss) {
              this.setupEndlessBoss(ent, item.bossConfig);
            }
            this.effects?.dust?.(x, 0, 2, 0.6);
          }
        }
        this.spawnQueue.splice(i, 1);
      }
    }

    // 和关卡模式一样：固定间隔时间推进下一波（从调校面板读取数值）(#3)
    const tuning = EndlessManager.getTuning();
    const ENDLESS_WAVE_INTERVAL = tuning.waveInterval ?? 20.0;
    this._endlessWaveTimer = (this._endlessWaveTimer || 0) + dt;

    if (this._endlessWaveTimer >= ENDLESS_WAVE_INTERVAL) {
      this._endlessWaveTimer = 0;
      const justClearedWave = this.endlessWave;
      this.endlessClearedWaves = justClearedWave;
      this.endlessWave++;

      // 每过 5 个波次（第 5, 10, 15, 20... 波结束）：全局暂停并弹出肉鸽三选一增益 (#6)
      if (justClearedWave % 5 === 0) {
        this.endlessBuffSelecting = true;
        this.paused = true;
        if (this.ui?.showEndlessBuffSelection) {
          this.ui.showEndlessBuffSelection(this);
        }
      }

      this.startEndlessWave(this.endlessWave);
      if (this.ui?.updateBattleHUD) this.ui.updateBattleHUD(this);
    }
  },

  setupEndlessBoss(boss, cfg) {
    if (!boss || !cfg) return;
    this.boss = boss;
    boss.name = cfg.name;
    boss.bossSkills = (cfg.skills || []).slice();
    boss.skillTimers = {};
    for (const s of boss.bossSkills) {
      if (s === 'summon') boss.skillTimers.summon = 8;
      if (s === 'wind') boss.skillTimers.wind = 5;
      if (s === 'charge') boss.skillTimers.charge = 7;
      if (s === 'crescent') boss.skillTimers.crescent = 5;
    }
    boss.chargesLeft = 5;
    this.ui?.showBossBar?.(cfg.name, boss.maxHp, boss.maxHp);
    this.ui?.showBattleBanner?.(`${cfg.name} 降临！`, cfg.title ? `第 ${this.endlessWave} 波 · ${cfg.title}` : `第 ${this.endlessWave} 波首领现世，斩将夺魁！`, 2400);
    audio.bossRoar();
    this.ui?.flash?.('boss');
    this.scene?.screenShake?.(0.35, 0.5);
    this.effects?.ring?.(13, 0, 0xb23a2f, 0.6, 4.5, 1.2, 0.8);
    this.effects?.pillar?.(13, 0, 0xb23a2f, 6);
    audio.setBoss(true);
  },

  startEndlessWave(wave) {
    const isBossWave = (wave % 10 === 0);
    const tuning = EndlessManager.getTuning();
    // 遵照调校数值公式：敌人当前属性 = 初始属性 + (当前波波次数 - 1) * 初始属性 * waveStatGrowth
    const statGrowth = tuning.waveStatGrowth ?? 0.05;
    const waveMul = 1.0 + (wave - 1) * statGrowth;
    const hpMul = waveMul;
    const atkMul = waveMul;

    this.ui?.showBattleBanner?.(
      isBossWave ? `第 ${wave} 波 · 强敌降临` : `第 ${wave} 波`,
      isBossWave ? '首领现世，斩将夺魁！' : '敌军兵锋递增，坚守阵线！',
      2000
    );
    audio.drum(null, true, 0.4);

    // 敌人出兵数量限制：由数值调校面板配置
    const baseSoldiers = tuning.waveBaseSoldiers ?? 5;
    const stepWaves = tuning.waveSoldierStep ?? 5;
    const stepInc = tuning.waveSoldierIncrement ?? 2;
    const totalSoldiers = baseSoldiers + Math.floor((wave - 1) / stepWaves) * stepInc;

    // 敌方传奇卡（霹雳车）出兵限制
    const unlockWave = tuning.legendaryUnlockWave ?? 10;
    const canHaveLegendary = (wave >= unlockWave);
    const maxLegendary = canHaveLegendary ? Math.floor(wave * (tuning.legendaryRatio ?? 0.10)) : 0;

    let legendaryCount = 0;
    const spawnInterval = 16.0 / Math.max(1, totalSoldiers);

    for (let i = 0; i < totalSoldiers; i++) {
      let type;
      const allowLegendary = (canHaveLegendary && legendaryCount < maxLegendary);
      if (allowLegendary && Math.random() < 0.25) {
        type = 'trebuchet';
        legendaryCount++;
      } else {
        const pool = ['militia', 'swordsman'];
        if (wave >= 3) pool.push('archer');
        if (wave >= 5) pool.push('shield');
        if (wave >= 7) pool.push('spearman');
        if (wave >= 9) pool.push('cavalry');
        type = pool[Math.floor(Math.random() * pool.length)];
      }

      this.spawnQueue.push({
        at: this.elapsed + 0.5 + i * spawnInterval,
        type,
        hpMul,
        atkMul,
      });
    }

    // 每 10 波出击专属强力首领 (#3)
    if (isBossWave) {
      const bossConfig = this.getEndlessBossForWave(wave);
      if (bossConfig) {
        const bossUnit = getUnit(bossConfig.type);
        const baseBossAtk = (bossUnit && bossUnit.atk) || 45;
        this.spawnQueue.push({
          at: this.elapsed + 2.0,
          type: bossConfig.type,
          x: 13.0,
          z: 0,
          hpOverride: Math.round(bossConfig.hp * waveMul),
          atkMul: (bossConfig.atk / baseBossAtk) * waveMul,
          isBoss: true,
          bossConfig,
        });
      }
    }
  },

  getEndlessBossForWave(wave) {
    const ladder = ENDLESS_BOSS_LADDER;
    const match = ladder.find(b => b.wave === wave);
    if (match) return match;
    const idx = (Math.floor(wave / 10) - 1) % ladder.length;
    return ladder[idx >= 0 ? idx : 0];
  },

  // 3. 肉鸽增益持续生效：全队回血（恢复特效统一为脚下绿色光环）
  updateEndlessRegen(dt) {
    if (!this.endlessBuffs?.teamRegen) return;
    this._endlessRegenTick = (this._endlessRegenTick || 0) + dt;
    if (this._endlessRegenTick >= 1.0) {
      this._endlessRegenTick -= 1.0;
      const regenRate = this.endlessBuffs.teamRegen;
      for (const e of this.entities) {
        if (e.alive && e.side === 'player' && !e.unit?.building) {
          const heal = Math.round(e.maxHp * regenRate);
          e.hp = Math.min(e.maxHp, e.hp + heal);
          // 恢复特效统一为脚下绿色光环
          if (this.effects?.heal && Math.random() < 0.25) {
            this.effects.heal(e.x, 0, e.z);
          }
        }
      }
      if (this.isHeroAlive?.()) {
        const heroHeal = Math.round(this.heroMaxHp * regenRate);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heroHeal);
        if (this.effects?.heal) {
          this.effects.heal(this.heroX, 0, this.heroZ);
        }
      }
    }
  },


  finalizeEnd() {
    if (this.state === 'ended') return;
    this.state = 'ended';
    const baseRatio = this.baseHp / PLAYER_BASE_MAX;
    const stars = this.won ? (baseRatio >= 0.75 ? 3 : baseRatio >= 0.4 ? 2 : 1) : 0;
    const time = Math.floor(this.elapsed);
    const speedBonus = Math.min(160, Math.max(0, 240 - time) * 2);
    const baseScore = this.won ? this.level.id * 20 + stars * 80 + speedBonus : 0;

    // 无尽模式专属结算
    if (this.isEndless) {
      const summary = {
        isEndless: true,
        win: false,
        waves: this.endlessClearedWaves || (this.endlessWave > 1 ? this.endlessWave - 1 : 0),
        kills: this.endlessKills || this.kills || 0,
        bossKills: this.endlessBossKills || 0,
        baseDamage: this.totalEnemyBaseDamage || 0,
        time,
        heroId: this.heroId,
        deck: this.deckIds,
        level: this.level,
      };
      const rewards = EndlessManager.calculateRewards(summary);
      summary.rewards = rewards;
      EndlessManager.saveMaxWave(summary.waves);
      EndlessManager.clearProgress();
      audio.stopMusic();
      if (this.onFinish) this.onFinish(summary);
      return;
    }

    const result = {
      win: this.won, levelId: this.level.id, stars, baseRatio, time, kills: this.kills,
      baseScore, score: baseScore, heroId: this.heroId, deck: this.deckIds,
      level: this.level,
    };
    audio.stopMusic();
    if (this.onFinish) this.onFinish(result);
  }
,

  // ---------- 公共控制 ----------
};


import * as THREE from '../../lib/three.module.js';
import { PLAYER_BASE_X, ENEMY_BASE_X, arrowGeo, boltGeo, javelinGeo, axeGeo, stoneGeo, oilGeo, talismanGeo, powderGeo, powderMat, arrowMat, boltMat, stoneMat, oilMat, talismanMat, HPBAR_BORDER_GEO, HPBAR_BORDER_MAT, HPBAR_BG_GEO, HPBAR_FILL_GEO, HPBAR_SHIELD_GEO, HPBAR_SHIELD_MAT, HPBAR_BOSS_BORDER_GEO, HPBAR_BOSS_BG_GEO, HPBAR_BOSS_FILL_GEO, HPBAR_BOSS_SHIELD_GEO, HPBAR_BG_MAT, HPBAR_GREEN_MAT, HPBAR_RED_MAT } from './constants.js?v=1.93';
import { audio } from '../audio.js?v=1.93';
import { createUnitModel, toonMaterial, ghostMaterial } from '../models.js?v=1.93';
import { getUnit } from '../data/units.js?v=1.93';
import { counterMul, getCounterMatch } from '../data/counters.js?v=1.93';
import { COMBAT_BUFF_CAPS } from '../data/heroes.js?v=1.93';
import { getAttackStyle, getAttackDuration, updateAttackAnimation, applyIdlePose } from './combat-anims.js?v=1.93';
// 战斗 · 单位实体/伤害/投射物/死亡/血条/光环结算
export const battleCombat = {
  playerHpMul(unit) {
    const p = this.heroData.passive;
    const ap = this.advisorBonus;
    const hp = this.heroPower();
    if (unit.building) {
      let m = this.deckBonus.buildingHp;
      if (this.workshopBuildingHpBonus) m *= (1 + this.workshopBuildingHpBonus);
      if (p && p.template === 'buildingHp') m *= 1 + p.value * hp;
      if (ap && ap.template === 'buildingHp') m *= 1 + ap.value;
      return m;
    }
    let m = unit.tags.includes('melee') ? this.deckBonus.meleeHp : 1;
    let bonus = 0;
    if (p && p.template === 'hpBuff' && (!p.tag || unit.tags.includes(p.tag))) bonus += p.value * hp;
    if (ap && ap.template === 'hpBuff' && (!ap.tag || unit.tags.includes(ap.tag))) bonus += ap.value;
    m *= (1 + bonus);
    return m;
  }
,


  playerAtkMul(unit) {
    const p = this.heroData.passive;
    const ap = this.advisorBonus;
    const hp = this.heroPower();
    let m = 1;
    if (this.deckBonus.rangedAtk !== 1 && unit.tags.includes('ranged') && !unit.building) m *= this.deckBonus.rangedAtk;
    if (this.barracksAtkBonus) m *= (1 + this.barracksAtkBonus);

    let bonus = 0;
    if (p && p.template === 'tagAtk' && !unit.building) {
      const tagOk = !p.tag || unit.tags.includes(p.tag);
      const wOk = !p.weapon || (unit.look && unit.look.weapon === p.weapon);
      if (tagOk && wOk) bonus += p.value * hp;
    }
    if (ap && ap.template === 'tagAtk' && !unit.building) {
      const tagOk = !ap.tag || unit.tags.includes(ap.tag);
      if (tagOk) bonus += ap.value;
    }
    if (p && p.template === 'buildingAtk' && unit.building) bonus += p.value * hp;
    if (ap && ap.template === 'buildingAtk' && unit.building) bonus += ap.value;

    // 攻击封顶（design §4.1.2：最多 +60%）
    bonus = Math.min(COMBAT_BUFF_CAPS.atk, bonus);
    m *= (1 + bonus);

    // 雨天火伤 -30%（design §5.3 天气规则化）
    if (this.level.weather === 'rain' && (unit.id === 'fireoil' || (unit.tags && unit.tags.includes('fire')))) {
      m *= 0.70;
    }

    return m;
  }
,


  playerSpeedMul(unit) {
    if (unit.tags.includes('cavalry') && this.deckBonus.cavalrySpeed !== 1) return this.deckBonus.cavalrySpeed;
    return 1;
  }
,

  // ---------- 实体 ----------

  createEntity({ unit, side, x, z, kind, hpMul = 1, atkMul = 1, isBoss = false, bossHp = 0, hpOverride = 0, summoned = false, summonStyle = 'emerge' }) {
    // 关卡成长只作用于主线常规敌军；无尽模式（isEndless）敌军属性由波次公式严格控制，杜绝 level.id=999 的 61 倍数值爆炸！
    const levelScale = (side === 'enemy' && !this.isEndless) ? 1 + (this.level.id - 1) * 0.06 : 1;
    const maxHp = hpOverride || unit.hp * (isBoss ? 1 : levelScale) * hpMul;
    let hp = maxHp;
    let atk = unit.atk * (isBoss ? 1 : levelScale) * atkMul;
    if (isBoss) atk = unit.atk * (this.isEndless ? 1 : (1 + (this.level.id - 1) * 0.05));
    const p = this.heroData.passive;
    const shield = (side === 'player' && p && p.template === 'deployShield' && !unit.building) ? maxHp * p.value * this.heroPower() : 0;

    const isBuilding = !!unit.building;
    const isEnemy = side === 'enemy';
    const initialFacing = isEnemy ? -1 : 1;
    let model;
    if (isBuilding || unit.look.building === 'cart') {
      model = createUnitModel({ ...unit, building: true }, side);
    } else {
      model = createUnitModel(unit, side);
    }
    const unitScale = (unit.look && unit.look.size) || 1;
    const bs = isBuilding ? unitScale : unitScale * 1.12;
    model.baseScale = bs;
    model.facing = initialFacing;
    model.group.position.set(x, 0, z);
    model.group.rotation.y = 0;
    model.group.scale.set(initialFacing * bs, bs, bs);
    this.scene.scene.add(model.group);

    const e = {
      uid: ++this.uid, unit, side, kind, x, z, y: 0, alive: true,
      facing: initialFacing, baseScale: bs,
      maxHp, hp, shield, atk, armor: unit.armor, range: unit.range,
      interval: unit.interval, speed: unit.speed, attackTimer: 0.4 + Math.random() * 0.4,
      model, weaponPivot: model.weaponPivot, body: model.body,
      attackAnim: 0, bobPhase: Math.random() * Math.PI * 2,
      comboCount: 0, currentAttackStyle: 'slash', attackDuration: 0.25,
      target: null, isBoss, chargeReady: true, stealth: unit.special === 'assassin' ? 2.5 : 0,
      shotCount: 0, rallyTime: 0, armorBreak: 0, fearOnChargeT: 0, auraCrit: 0, sniperTarget: null,
      buffs: {
        slow: 0, slowFactor: 0, stun: 0, mark: 0, atkDebuff: 0, atkDebuffTime: 0,
        atkUp: 0, atkUpT: 0, aspdUp: 0, aspdUpT: 0, spdUp: 0, spdUpT: 0,
        defUp: 0, defUpT: 0, thorns: 0, thornsT: 0, noSlowT: 0, shieldTime: 0,
        lifesteal: 0, lifestealT: 0, crit: 0, critT: 0, killEnergy: 0, killEnergyT: 0,
        vuln: 0, vulnT: 0,
      },
      auraAtk: 1, auraSpeed: 1, auraMove: 1, auraHeal: 0, auraRegen: 0, auraDamageTaken: 1,
      summoner: side, bossHpMax: hpOverride || 0,
      isTower: false, hitFlash: 0, spawnT: 0,
      boostAtk: 0, boostT: 0, timedLife: 0, dying: 0, gone: false, summonAnim: summoned ? { t: 0, dur: 0.45, style: summonStyle } : null,
      form: null, airForm: false, airHeight: 0, kiteT: 0, fallT: 0, fallDur: 1.0, invulnT: 0,
      spawnHpMul: hpMul, spawnAtkMul: atkMul,
    };
    // 纸鸢：首个空中单位，入场即为飞行形态，悬停于敌军头顶之上
    if (unit.special === 'kite') {
      const kfx = unit.fx || {};
      e.airForm = true;
      e.form = 'kite';
      e.airHeight = kfx.airHeight ?? 1.8;
      e.atk = 0;
      model.group.position.y = e.airHeight;
    }
    // 破城：首次出手仅蓄力 4 秒，其后每撞蓄力 8 秒；同目标连撞伤害递增
    if (unit.special === 'ram') {
      e.attackTimer = (unit.fx && unit.fx.firstDelay) || 4.0;
      e.ramKey = null;
      e.ramStacks = 0;
    }
    // 壁垒：反伤被动与震撼计数（累积半血之伤触发一次，至多两次）
    if (unit.special === 'bulwark') {
      e.shockAcc = 0;
      e.shocksUsed = 0;
      e.shockT = 0;
    }
    // 被动：部署护盾 / 护甲 / 福星增幅
    if (side === 'player' && p) {
      if (p.template === 'tagArmor' && (!p.tag || unit.tags.includes(p.tag))) e.armor += p.value;
      if (p.template === 'deployBoost' && !unit.building) {
        e.boostAtk = p.value * this.heroPower();
        e.boostT = p.duration;
      }
    }
    if (isBoss) {
      e.bossName = this.level.boss ? this.level.boss.name : unit.name;
      e.bossHpMax = maxHp;
      const ringGeo = new THREE.RingGeometry(1.0, 1.18, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xb23a2f, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.04, 0);
      ring.name = 'bossAura';
      model.group.add(ring);
      e.bossAura = ring;
    }
    if (unit.special === 'assassin' && side === 'player') {
      const candidates = this.entities.filter((o) => o.alive && o.side === 'enemy' && (o.kind === 'building' || o.unit.tags.includes('ranged')));
      if (candidates.length) {
        const far = candidates.reduce((a, b) => (Math.abs(b.x - ENEMY_BASE_X) > Math.abs(a.x - ENEMY_BASE_X) ? b : a), candidates[0]);
        e.x = Math.max(3, far.x - 2.0);
        model.group.position.x = e.x;
        this.effects.summon(e.x, e.z, 0xb23a2f);
      }
      model.group.visible = false;
    }
    if (e.stealth > 0) {
      e._stealthApplied = true;
      e.model.group.visible = true;
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material = ghostMaterial;
        }
      });
      if (e.hpBar && e.hpBar.group) e.hpBar.group.visible = false;
    }
    if (side === 'player' && this.weiqingBuffT > 0 && !isBuilding) {
      const isMelee = (unit.tags?.includes('melee') || unit.tags?.includes('cavalry') || unit.tags?.includes('anticav') || unit.role === '近战' || unit.role === '骑兵');
      if (isMelee) {
        e.giantT = this.weiqingBuffT;
        e.giantScale = 1.6;
      }
    }
    if (side === 'player' && this.sunwuStealthT > 0 && !isBuilding) {
      e.stealth = this.sunwuStealthT;
    }
    this.attachHealthBar(e, isBoss);
    this.entities.push(e);
    return e;
  },

  // 隐匿解除：现出原形，恢复正常不透明度与血条，并喷涌水墨消散烟尘
  revealStealth(e) {
    if (!e || e.stealth <= 0) return;
    e.stealth = 0;
    e._stealthApplied = false;
    if (e.model && e.model.group) {
      e.model.group.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material = toonMaterial;
        }
      });
    }
    if (e.hpBar && e.hpBar.group) {
      e.hpBar.group.visible = true;
    }
    if (this.effects) {
      this.effects.inkBurst(e.x, 0.5, e.z || 0, 8, 0x1e293b, 0.6);
    }
  },

  // 头顶血条：挂场景根（避免父组旋转/缩放影响），每帧跟随单位位置
  attachHealthBar(e, isBoss) {
    const g = new THREE.Group();
    // 1. 高对比象牙白外边框（消除水墨深色背景下的血条模糊）
    const border = new THREE.Mesh(isBoss ? HPBAR_BOSS_BORDER_GEO : HPBAR_BORDER_GEO, HPBAR_BORDER_MAT);
    border.renderOrder = 997;
    // 2. 浓墨黑底槽
    const bg = new THREE.Mesh(isBoss ? HPBAR_BOSS_BG_GEO : HPBAR_BG_GEO, HPBAR_BG_MAT);
    bg.renderOrder = 998;
    bg.position.z = 0.001;
    // 3. 生命值高饱和实色主填充（我军纯正鲜明翠绿 / 敌军纯正警示亮红）
    const fill = new THREE.Mesh(isBoss ? HPBAR_BOSS_FILL_GEO : HPBAR_FILL_GEO, e.side === 'player' ? HPBAR_GREEN_MAT : HPBAR_RED_MAT);
    fill.renderOrder = 999;
    fill.position.x = isBoss ? -1.12 : -0.63;
    fill.position.z = 0.002;
    // 4. 金色高不透明护盾覆层
    const shieldFill = new THREE.Mesh(isBoss ? HPBAR_BOSS_SHIELD_GEO : HPBAR_SHIELD_GEO, HPBAR_SHIELD_MAT);
    shieldFill.renderOrder = 1000;
    shieldFill.position.x = isBoss ? -1.12 : -0.63;
    shieldFill.position.z = 0.003;
    shieldFill.visible = false;

    g.add(border);
    g.add(bg);
    g.add(fill);
    g.add(shieldFill);
    g.rotation.x = -0.42;
    g.visible = false;

    const look = e.unit.look || {};
    let barY;
    if (e.unit.building || look.building) {
      const b = look.building;
      barY = { cart: 1.9, barricade: 1.7, drum: 2.7, tent: 2.7, tower: 3.4, repeater: 3.1, trebuchet: 3.6 }[b] || 2.9;
    } else {
      barY = (look.mount ? 2.6 : 2.1) * (look.size || 1);
      if (e.airForm) barY = (e.airHeight || 1.8) + 2.3 * (look.size || 1);
      if (isBoss) barY += 0.45;
    }
    e.barY = barY;
    e.hpBar = { group: g, fill, shieldFill, shown: 1, shownShield: 0 };
    g.position.set(e.x, barY, e.z);
    this.scene.scene.add(g);
  }
,


  updateHealthBars(dt) {
    const k = Math.min(1, dt / 0.12);
    for (const e of this.entities) {
      const bar = e.hpBar;
      if (!bar) continue;
      if (!e.alive) {
        bar.group.visible = false;
        continue;
      }
      const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
      bar.shown += (pct - bar.shown) * k;

      // 护盾比例
      const shieldPct = Math.max(0, Math.min(1, (e.shield || 0) / e.maxHp));
      bar.shownShield += (shieldPct - bar.shownShield) * k;

      // 只要受到伤害、拥有护盾、受击闪白、交战中或为首领时，以纯黑边框高不透明度清晰显示血条
      const damaged = pct < 0.999;
      const hasShield = shieldPct > 0.01;
      const hit = e.hitFlash > 0;
      const fighting = e.attackAnim > 0 || e.target != null;
      const vis = (damaged || hasShield || hit || fighting || e.isBoss) && e.model && e.model.group.visible !== false;

      bar.group.visible = vis;
      if (vis) {
        bar.group.position.set(e.x, e.barY, e.z);
        bar.fill.scale.x = Math.max(0.001, Math.min(1, bar.shown));
        if (bar.shieldFill) {
          bar.shieldFill.visible = bar.shownShield > 0.01;
          bar.shieldFill.scale.x = Math.max(0.001, Math.min(1, bar.shownShield));
        }
      }
    }
  }
,

  // 死亡演出：单位先缩小消散（dying 计时），再由 removeEntity 真正移除

  startDeath(e) {
    if (!e.alive) return;
    e.alive = false;
    e.dying = e.isBoss ? 0.6 : 0.38;
    if (e.hpBar) e.hpBar.group.visible = false;
    if (e.body) {
      e.body.position.set(0, 0, 0);
      e.body.rotation.set(0, 0, 0);
      e.body.scale.set(1, 1, 1);
    }
    if (e.weaponPivot) {
      const scale = (e.unit.look && e.unit.look.size) || 1;
      e.weaponPivot.position.set(0.33 * scale, 1.0 * scale, 0.04);
      e.weaponPivot.rotation.set(0, 0, -0.10);
    }
    e.attackAnim = 0;
  }
,


  removeEntity(e) {
    if (e.gone) return;
    e.gone = true;
    e.alive = false;
    if (e.model) {
      this.scene.scene.remove(e.model.group);
    }
    if (e.hpBar) this.scene.scene.remove(e.hpBar.group);
    if (e.isBoss && this.boss === e) {
      this.boss = null;
      this.ui.hideBossBar();
    }
  }
,

  // ---------- 波次 ----------

  updateEntities(dt) {
    for (const e of this.entities) {
      // 死亡消散动画：缩小 + 下沉，结束后真正移除
      if (!e.alive) {
        if (e.dying > 0 && !e.gone) {
          e.dying -= dt;
          const k = Math.max(0, e.dying / (e.isBoss ? 0.6 : 0.38));
          if (e.model) {
            const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
            const curScale = Math.max(0.01, e.baseScale * (0.35 + 0.65 * k));
            e.model.group.scale.set(facing * curScale, curScale, curScale);
            e.model.group.position.y = -(1 - k) * 0.35;
          }
          if (e.dying <= 0) this.removeEntity(e);
        }
        continue;
      }
      this.updateBuffTimers(e, dt);
      if (!e.alive) continue;
      if (e.invulnT > 0) e.invulnT -= dt;
      // 纸鸢坠落：1 秒落地动画期间无敌，动画结束切换为火铳形态
      if (e.form === 'falling') {
        this.updateKiteFall(e, dt);
        continue;
      }
      if (e.summonAnim) {
        e.summonAnim.t += dt;
        const p = Math.min(1, e.summonAnim.t / e.summonAnim.dur);
        const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
        if (e.summonAnim.style === 'emerge') {
          const ease = 1 - Math.pow(1 - p, 3);
          e.model.group.position.y = -0.85 * (1 - ease);
          const sc = p < 0.65 ? 0.25 + (p / 0.65) * 0.90 : 1.15 - ((p - 0.65) / 0.35) * 0.15;
          const curScale = e.baseScale * sc;
          e.model.group.scale.set(facing * curScale, curScale, curScale);
        }
        if (p >= 1) {
          e.summonAnim = null;
          e.spawnT = 0.35;
          e.model.group.position.y = 0;
          e.model.group.scale.set(facing * e.baseScale, e.baseScale, e.baseScale);
          this.effects.ring(e.x, e.z, e.side === 'player' ? 0x4b7a6a : 0xb23a2f, 0.2, 1.3, 0.35, 0.75);
          this.effects.inkBurst(e.x, 0.2, e.z, 6, 0x17150f, 0.6);
        } else {
          continue;
        }
      }
      // 登场回弹（easeOutBack）
      if (e.spawnT >= 0 && e.spawnT < 0.35) {
        e.spawnT += dt;
        const t = Math.min(1, e.spawnT / 0.35);
        const c1 = 1.70158;
        const ease = 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
        const curScale = e.baseScale * (0.55 + 0.45 * ease);
        e.model.group.scale.set(facing * curScale, curScale, curScale);
      }
      // 受击挤压 / 建筑晃动
      if (e.model && e.body) {
        if (e.hitFlash > 0) {
          const f = e.hitFlash;
          if (e.kind === 'building') {
            e.model.group.rotation.z = Math.sin(f * 22) * 0.035 * f;
          } else {
            e.body.scale.set(1 + 0.1 * f, 1 - 0.14 * f, 1 + 0.1 * f);
          }
        } else {
          if (e.kind === 'building' && e.model.group.rotation.z !== 0) e.model.group.rotation.z = 0;
          if (e.body.scale.x !== 1) e.body.scale.set(1, 1, 1);
        }
      }
      // 刺客与孙武风林火山水墨幽影半透明隐匿状态 (#6)
      if (e.model && e.stealth > 0) {
        e.stealth -= dt;
        e.model.group.visible = true;
        if (!e._stealthApplied) {
          e._stealthApplied = true;
          e.model.group.traverse((n) => {
            if (n.isMesh && n.material) {
              n.material = ghostMaterial;
            }
          });
          if (e.hpBar && e.hpBar.group) e.hpBar.group.visible = false;
        }
        if (e.stealth <= 0) {
          this.revealStealth(e);
        }
      }

      // 卫青大将军印：友军近战体型显著放大 1.6 倍，并附带脚底金色大将威仪光环 (#14)
      if (e.giantT > 0) {
        e.giantT -= dt;
        const targetScale = e.baseScale * (e.giantScale || 1.6);
        if (!e._giantApplied) {
          e._giantApplied = true;
          if (!e.giantAura && e.model && e.model.group) {
            const auraGeo = new THREE.RingGeometry(0.8, 1.05, 16);
            const auraMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
            const auraMesh = new THREE.Mesh(auraGeo, auraMat);
            auraMesh.rotation.x = -Math.PI / 2;
            auraMesh.position.set(0, 0.03, 0);
            e.model.group.add(auraMesh);
            e.giantAura = auraMesh;
          }
        }
        // 平滑放大到 1.6 倍超霸气军威体型
        if (e.model && e.model.group && e.spawnT >= 0.35) {
          const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
          const cur = Math.abs(e.model.group.scale.x);
          const next = cur + (targetScale - cur) * Math.min(1, dt * 8.0);
          e.model.group.scale.set(facing * next, next, next);
        }
        if (e.giantAura) {
          e.giantAura.rotation.z += dt * 2.5;
        }
        if (e.giantT <= 0 && e._giantApplied) {
          e._giantApplied = false;
          if (e.giantAura && e.model && e.model.group) {
            e.model.group.remove(e.giantAura);
            if (e.giantAura.geometry) e.giantAura.geometry.dispose();
            if (e.giantAura.material) e.giantAura.material.dispose();
            e.giantAura = null;
          }
          if (e.model && e.model.group) {
            const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
            e.model.group.scale.set(facing * e.baseScale, e.baseScale, e.baseScale);
          }
        }
      }
      if (e.buffs.stun > 0) {
        e.attackTimer = Math.max(e.attackTimer, 0.2);
        continue;
      }
      if (e.kind === 'building') {
        this.updateBuilding(e, dt);
        continue;
      }
      this.updateUnit(e, dt);
    }
    // 清理死亡
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.gone) this.entities.splice(i, 1);
    }
    this.updateNecroSpawns(dt);
  }
,

  // 半仙魂印复生：延迟 0.5 秒后从地下爬出我方僵尸
  scheduleNecroZombie(e) {
    this.necroSpawns = this.necroSpawns || [];
    this.necroSpawns.push({ x: e.x, z: e.z || 0, t: 0.5 });
  }
,

  updateNecroSpawns(dt) {
    if (!this.necroSpawns || this.necroSpawns.length === 0) return;
    for (let i = this.necroSpawns.length - 1; i >= 0; i--) {
      const s = this.necroSpawns[i];
      s.t -= dt;
      if (s.t > 0) continue;
      this.necroSpawns.splice(i, 1);
      const unit = getUnit('zombie');
      const zn = this.createEntity({
        unit, side: 'player', x: THREE.MathUtils.clamp(s.x, -11.5, 11.0), z: THREE.MathUtils.clamp(s.z, -2.2, 2.2),
        kind: 'unit', hpMul: this.playerHpMul(unit), atkMul: this.playerAtkMul(unit),
        summoned: true, summonStyle: 'emerge',
      });
      if (this.effects) {
        this.effects.ring(zn.x, zn.z, 0x6a7a8a, 0.3, 1.6, 0.5, 0.7);
        this.effects.inkBurst(zn.x, 0.4, zn.z, 10, 0x3f4a5a, 0.9);
      }
      audio.gong(null, 0.55);
    }
  }
,


  updateBuffTimers(e, dt) {
    if (e.buffs.slow > 0) e.buffs.slow -= dt;
    if (e.buffs.stun > 0) e.buffs.stun -= dt;
    if (e.buffs.mark > 0) e.buffs.mark -= dt;
    if (e.buffs.atkDebuffTime > 0) {
      e.buffs.atkDebuffTime -= dt;
      if (e.buffs.atkDebuffTime <= 0) e.buffs.atkDebuff = 0;
    }
    // 英雄技能增益计时
    if (e.buffs.atkUpT > 0) { e.buffs.atkUpT -= dt; if (e.buffs.atkUpT <= 0) e.buffs.atkUp = 0; }
    if (e.buffs.aspdUpT > 0) { e.buffs.aspdUpT -= dt; if (e.buffs.aspdUpT <= 0) e.buffs.aspdUp = 0; }
    if (e.buffs.spdUpT > 0) { e.buffs.spdUpT -= dt; if (e.buffs.spdUpT <= 0) e.buffs.spdUp = 0; }
    if (e.buffs.defUpT > 0) { e.buffs.defUpT -= dt; if (e.buffs.defUpT <= 0) e.buffs.defUp = 0; }
    if (e.buffs.thornsT > 0) { e.buffs.thornsT -= dt; if (e.buffs.thornsT <= 0) e.buffs.thorns = 0; }
    if (e.buffs.lifestealT > 0) { e.buffs.lifestealT -= dt; if (e.buffs.lifestealT <= 0) e.buffs.lifesteal = 0; }
    if (e.buffs.critT > 0) { e.buffs.critT -= dt; if (e.buffs.critT <= 0) e.buffs.crit = 0; }
    if (e.buffs.killEnergyT > 0) { e.buffs.killEnergyT -= dt; if (e.buffs.killEnergyT <= 0) e.buffs.killEnergy = 0; }
    if (e.buffs.vulnT > 0) { e.buffs.vulnT -= dt; if (e.buffs.vulnT <= 0) e.buffs.vuln = 0; }
    if (e.buffs.noSlowT > 0) e.buffs.noSlowT -= dt;
    if (e.fearOnChargeT > 0) e.fearOnChargeT -= dt;
    if (e.boostT > 0) e.boostT -= dt;
    // 限时屏障（蒙恬「墨笔长城」）
    if (e.timedLife > 0) {
      e.timedLife -= dt;
      if (e.timedLife <= 0) {
        this.effects.dust(e.x, e.z, 6, 1.2);
        this.startDeath(e);
        return;
      }
    }
    if (e.rallyTime > 0) e.rallyTime -= dt;
    if (e.dot && e.dot.time > 0) {
      e.dot.time -= dt;
      e.hp -= e.dot.dps * dt;
      if (Math.random() < 0.15) this.effects.inkBurst(e.x, 0.6, e.z, 1, 0xd06a32, 0.3);
      if (e.hp <= 0) this.killEntity(e, null);
    }
    if (e.attackAnim > 0) e.attackAnim = Math.max(0, e.attackAnim - dt);
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
  }
,

  // 攻速系数（光环 × 技能增益）

  aspdMul(e) {
    let m = e.auraSpeed || 1;
    if (e.buffs.aspdUpT > 0) m *= 1 + e.buffs.aspdUp;
    return m * (this.aspdMulWeather || 1);
  },

  // 移速系数（敌军减速光环 × 技能加速）

  buffSpd(e) {
    let m = e.auraMove || 1;
    if (e.buffs.spdUpT > 0) m *= 1 + e.buffs.spdUp;
    return m;
  }
,


  updateBuilding(e, dt) {
    const sp = e.unit.special;
    if (sp === 'healAura' || sp === 'auraSpeed' || sp === 'auraAtk' || sp === 'barricade') return;
    if (sp === 'medic' || sp === 'debuff') {
      this.updateSupportAction(e, dt);
      return;
    }
    // 塔类攻击
    if (e.atk > 0 && e.range > 0) {
      const range = this.effectiveRange(e);
      const target = this.findTarget(e, range);
      if (target && Math.abs(target.x - e.x) <= range + 0.2) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.interval / this.aspdMul(e);
          this.performAttack(e, target);
        }
      }
    }
  }
,


  updateSupportAction(e, dt) {
    const sp = e.unit.special;
    if (sp === 'medic') {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval;
        const allies = this.entities.filter((o) => o.alive && o.side === e.side && !o.unit.building && o.hp < o.maxHp && Math.abs(o.x - e.x) <= 4);
        if (allies.length) {
          const t = allies.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
          const healVal = e.unit.fx?.healAmount ?? 45;
          t.hp = Math.min(t.maxHp, t.hp + healVal);
          this.effects.heal(t.x, 0.9, t.z);
          if (this.dmgText) this.dmgText.spawn({ x: t.x, y: (t.y || 0) + 0.8, z: t.z, unit: t, amount: healVal, type: 'heal' });
          audio.heal();
        }
      }
      return;
    }
    if (sp === 'debuff') {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval;
        const targets = this.entities.filter((o) => o.alive && o.side !== e.side && !o.unit.building && Math.abs(o.x - e.x) <= 6);
        if (targets.length) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          const dfx = e.unit.fx || {};
          t.buffs.atkDebuff = 1 - (dfx.atkDown ?? 0.25);
          t.buffs.atkDebuffTime = dfx.debuffDur ?? 5;
          this.effects.ring(t.x, t.z, 0x5a6a8a, 0.3, 1.2, 0.4, 0.5);
        }
      }
      return;
    }
  }
,


  updateMedic(e, dt) {
    if (!e || !e.alive) return;

    // 1. 寻找友军核心主力战斗单位（非建筑、非英雄、非其他军医）
    const friends = this.entities.filter((o) =>
      o.alive && o.side === e.side && o !== e && !o.unit.building && o.kind === 'unit' && o.unit.special !== 'medic'
    );

    // 优先跟随血量不满的友军（伤势越近越先照看），全员满血时再随最近主力
    const woundedFriends = friends.filter((f) => f.hp < f.maxHp);
    const followPool = woundedFriends.length > 0 ? woundedFriends : friends;
    let followTarget = null;
    let bestDist = 1e9;
    for (const f of followPool) {
      const d = Math.abs(f.x - e.x);
      if (d < bestDist) {
        bestDist = d;
        followTarget = f;
      }
    }

    const isPlayer = e.side === 'player';
    const forwardDir = isPlayer ? 1 : -1;

    // 目标跟随位置：保持在主力后方 2.2m 左右安全中等距离
    let desiredX;
    if (followTarget) {
      desiredX = followTarget.x - forwardDir * 2.2;
    } else {
      // 场上没有其他主力士兵时，退守大本营阵前
      desiredX = isPlayer ? (PLAYER_BASE_X + 2.5) : (ENEMY_BASE_X - 2.5);
    }

    const distToDesired = desiredX - e.x;
    let isMoving = false;
    if (Math.abs(distToDesired) > 0.35) {
      const moveDir = Math.sign(distToDesired);
      const moveSpd = e.speed * (this.buffSpd ? this.buffSpd(e) : 1) * (this.weatherSpeed ? this.weatherSpeed() : 1) * (this.slowMul ? this.slowMul(e) : 1);
      e.x += moveDir * moveSpd * dt;
      e.x = Math.max(-14, Math.min(13.5, e.x));
      if (e.model) {
        e.model.group.position.x = e.x;
        if (moveDir !== 0) {
          e.model.group.rotation.y = 0;
          const bs = Math.abs(e.baseScale || 1.12);
          e.facing = moveDir > 0 ? 1 : -1;
          e.model.group.scale.set(e.facing * bs, bs, bs);
        }
      }
      isMoving = true;
    } else {
      if (e.model) {
        e.model.group.rotation.y = 0;
        const bs = Math.abs(e.baseScale || 1.12);
        e.facing = forwardDir > 0 ? 1 : -1;
        e.model.group.scale.set(e.facing * bs, bs, bs);
      }
    }

    this.moveBob(e, dt, isMoving);

    // 2. 治疗逻辑：全场侦测，持续为血量比例最低的友军回血
    e.attackTimer = (e.attackTimer || 0) - dt;
    if (e.attackTimer <= 0) {
      e.attackTimer = e.interval || 2.0;
      const wounded = this.entities.filter((o) =>
        o.alive && o.side === e.side && !o.unit.building && o.hp < o.maxHp
      );
      if (wounded.length > 0) {
        const target = wounded.reduce((min, cur) => (cur.hp / cur.maxHp < min.hp / min.maxHp ? cur : min));
        const healAmt = e.unit.fx?.healAmount ?? 55;
        target.hp = Math.min(target.maxHp, target.hp + healAmt);
        if (this.effects) {
          this.effects.heal(target.x, 0.9, target.z);
          this.effects.ring(target.x, target.z, 0x16a34a, 0.25, 1.2, 0.4, 0.6);
        }
        audio.heal();
        if (this.playCombatAnim) {
          this.playCombatAnim(e, 'CAST_SUPPORT');
        }
      }
    }
  },

  updateUnit(e, dt) {
    const special = e.unit.special;
    // 隐匿单位可正常行军与索敌攻击，敌军无法发现，造成伤害或受击时现身

    // 出手动作必须完整播完（即使目标当场阵亡或被击退），期间原地不动
    if (e.attackAnim > 0) {
      this.moveBob(e, dt, false);
      return;
    }

    // 纸鸢飞行形态：空中巡航、投火药、持续自损（落地后转常规火铳 AI）
    if (special === 'kite' && e.form !== 'gunner') {
      this.updateKite(e, dt);
      return;
    }

    // 破城 & 壁垒：只攻建筑与大本营的重型单位，无视一切敌兵
    if (special === 'ram' || special === 'bulwark') {
      this.updateSiegeBreaker(e, dt);
      return;
    }

    if (special === 'suicide') {
      // 火药车：冲向最近敌人并自爆
      const target = this.findTarget(e, 15);
      const tx = target ? target.x : (e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X);
      const dir = Math.sign(tx - e.x) || (e.side === 'enemy' ? -1 : 1);
      e.facing = dir;
      if (e.model) {
        e.model.group.rotation.y = 0;
        const bs = Math.abs(e.baseScale || 1.12);
        e.model.group.scale.set(dir * bs, bs, bs);
      }
      e.x += dir * e.speed * this.buffSpd(e) * this.weatherSpeed() * dt;
      e.model.group.position.x = e.x;
      this.moveBob(e, dt, true);
      if (target && Math.abs(target.x - e.x) < 1.8) this.explodePowderCart(e);
      else if ((e.side === 'player' && e.x >= ENEMY_BASE_X - 2.0) || (e.side === 'enemy' && e.x <= PLAYER_BASE_X + 2.0)) this.explodePowderCart(e);
      return;
    }

    // 军医：不盲目向前送死，而是跟随友军战斗单位并在中距护航治疗
    if (special === 'medic') {
      this.updateMedic(e, dt);
      return;
    }

    // 死士：背负火药直扑敌军后排与建筑，触敌自爆一换一
    if (special === 'martyr') {
      this.updateMartyr(e, dt);
      return;
    }

    if (e.atk <= 0) {
      // 纯辅助单位跟随兵线，不攻击
      this.marchForward(e, dt);
      return;
    }

    const isSiege = e.unit.tags && e.unit.tags.includes('siege');
    const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    const baseRange = isSiege ? this.effectiveRange(e) : 1.5;
    const inBaseRange = Math.abs(baseX - e.x) <= baseRange + 0.6;
    const baseAttackable = !(e.side === 'player' && this.bossShield);

    // 攻城重器（霹雳车等）：进入大本营射程后，优先轰炸敌方基地核心！
    if (isSiege && inBaseRange) {
      const nearThreat = this.entities.find((o) => o.alive && o.side !== e.side && Math.abs(o.x - e.x) <= 2.2);
      if (!nearThreat || baseAttackable) {
        e.target = null;
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.interval / this.aspdMul(e);
          this.performAttack(e, null, true);
        }
        this.faceTarget(e, { x: baseX, z: 0 });
        this.moveBob(e, dt, false);
        return;
      }
    }

    // 原目标若已隐匿或阵亡，立即丢失目标；已出手的挥砍动画仍照常播完
    const heroDead = this.isHeroAlive && !this.isHeroAlive();
    if (e.target && (!e.target.alive || e.target.stealth > 0 || (e.target.isHero && heroDead))) {
      e.target = null;
      if (e.heroBlockedBy) e.heroBlockedBy = null;
    }
    // 被赵云拦截时强制锁定赵云（仅当英雄存活且物理近身时）
    if (e.heroBlockedBy && this.heroId === 'zhaoyun' && !heroDead) {
      const bDist = Math.hypot(this.heroX - e.x, ((this.heroZ || 0) - e.z) * 1.35);
      if (bDist > 2.5) {
        e.heroBlockedBy = null;
        if (this.heroBlockedFoes) this.heroBlockedFoes.delete(e);
      } else {
        e.target = this.getHeroTargetObj();
      }
    } else if (e.heroBlockedBy && heroDead) {
      e.heroBlockedBy = null;
    }
    // 若当前目标为英雄但英雄已移动脱离近身追击（且未被肉身拦截），立即解除锁定避免原地挥空
    if (e.target && e.target.isHero && !e.heroBlockedBy) {
      const hDist = Math.hypot(this.heroX - e.x, ((this.heroZ || 0) - e.z) * 1.35);
      if (hDist > (e.unit.tags?.includes('ranged') ? this.effectiveRange(e) + 1.0 : 3.2)) {
        e.target = null;
      }
    }
    const target = e.target || this.findTarget(e, e.range + (e.unit.tags.includes('ranged') ? e.range : 3.2));
    if (target) {
      e.target = target;
      const dx = Math.abs(target.x - e.x);
      const range = this.effectiveRange(e);
      if (dx <= range + 0.2) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.interval / this.aspdMul(e);
          this.performAttack(e, target);
        }
        this.faceTarget(e, target);
        this.moveBob(e, dt, false);
        return;
      }
      // 靠近目标
      const dir = Math.sign(target.x - e.x) || (e.side === 'enemy' ? -1 : 1);
      e.facing = dir;
      if (e.model && !e.unit.building && e.kind !== 'building') {
        e.model.group.rotation.y = 0;
        const bs = Math.abs(e.baseScale || 1.12);
        e.model.group.scale.set(dir * bs, bs, bs);
      }
      const spdMul = (e.auraSpeed || 1) * (this.buffSpd ? this.buffSpd(e) : 1) * (this.weatherSpeed ? this.weatherSpeed() : 1) * (this.slowMul ? this.slowMul(e) : 1);
      e.x += dir * e.speed * spdMul * dt;
      e.model.group.position.x = e.x;
      this.moveBob(e, dt, true);
      return;
    }

    // 无目标：推进 / 攻击基地
    if (Math.abs(baseX - e.x) <= baseRange + 0.6) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval / this.aspdMul(e);
        this.performAttack(e, null, true);
      }
      this.faceTarget(e, { x: baseX, z: 0 });
      this.moveBob(e, dt, false);
      return;
    }
    this.marchForward(e, dt);
  }
,


  // ---------- 破城 & 壁垒：只攻建筑与大本营 ----------
  // 无视一切敌兵与英雄，缓步推进；射程内优先锤击挡路建筑，其次大本营
  updateSiegeBreaker(e, dt) {
    // 壁垒震撼爆发中：定身 0.5 秒，巨躯膨胀脉动
    if (e.shockT > 0) {
      e.shockT -= dt;
      const fx = e.unit.fx || {};
      const dur = fx.shockAnim || 0.5;
      const k = Math.max(0, e.shockT / dur);
      const pulse = 1 + 0.16 * Math.sin((1 - k) * Math.PI);
      const facing = e.facing || (e.side === 'enemy' ? -1 : 1);
      const bs = Math.abs(e.baseScale || 1.12) * pulse;
      e.model.group.scale.set(facing * bs, bs, bs);
      this.moveBob(e, dt, false);
      return;
    }

    const range = this.effectiveRange(e);
    const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    const baseAttackable = !(e.side === 'player' && this.bossShield);

    // 最近的敌方建筑实体（箭塔/拒马/城墙等）
    let bTarget = null;
    let bDist = Infinity;
    for (const o of this.entities) {
      if (!o.alive || o.side === e.side) continue;
      if (o.kind !== 'building' && !o.unit.building) continue;
      const d = Math.abs(o.x - e.x);
      if (d < bDist) { bDist = d; bTarget = o; }
    }

    // 射程内的挡路建筑：原地蓄力锤击
    if (bTarget && bDist <= range + 0.2) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval / this.aspdMul(e);
        this.performAttack(e, bTarget);
      }
      this.faceTarget(e, bTarget);
      this.moveBob(e, dt, false);
      return;
    }

    // 大本营已进入射程（且无敌方护盾）：直接锤击基地核心
    const inBaseRange = Math.abs(baseX - e.x) <= range + 0.6;
    if (inBaseRange && baseAttackable) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval / this.aspdMul(e);
        this.performAttack(e, null, true);
      }
      this.faceTarget(e, { x: baseX, z: 0 });
      this.moveBob(e, dt, false);
      return;
    }

    // 逼近目标建筑 / 无建筑时径直推进至大本营
    if (bTarget) {
      const dir = Math.sign(bTarget.x - e.x) || (e.side === 'enemy' ? -1 : 1);
      e.facing = dir;
      if (e.model && !e.unit.building && e.kind !== 'building') {
        e.model.group.rotation.y = 0;
        const bs = Math.abs(e.baseScale || 1.12);
        e.model.group.scale.set(dir * bs, bs, bs);
      }
      const spdMul = (e.auraSpeed || 1) * (this.buffSpd ? this.buffSpd(e) : 1) * (this.weatherSpeed ? this.weatherSpeed() : 1) * (this.slowMul ? this.slowMul(e) : 1);
      e.x += dir * e.speed * spdMul * dt;
      e.model.group.position.x = e.x;
      this.moveBob(e, dt, true);
      return;
    }
    this.marchForward(e, dt);
  }
,


  // ---------- 纸鸢：飞行形态 ----------
  // 悬空巡飞（自损 3%/秒）→ 飞抵敌首上方投下火药 → 生命耗尽坠地 1 秒无敌 → 站起持火铳再战
  updateKite(e, dt) {
    const fx = e.unit.fx || {};
    e.kiteT += dt;
    // 1. 自损：每秒扣除 3% 最大生命（直接扣血，不经过任何减伤/免疫结算）
    e.hp -= (fx.selfDecay ?? 0.03) * e.maxHp * dt;
    if (e.hp <= 0) {
      this.startKiteFall(e);
      return;
    }
    // 2. 悬浮呼吸：上下浮沉 + 轻微摆尾
    const hover = e.airHeight + Math.sin(e.kiteT * 2.2) * 0.14;
    e.model.group.position.y = hover;
    e.model.group.rotation.z = Math.sin(e.kiteT * 1.3) * 0.06;
    if (e.body) e.body.rotation.y = Math.sin(e.kiteT * 1.6) * 0.05;

    // 3. 索敌：越过所有地面兵种，飞至敌军头顶投弹
    if (e.target && (!e.target.alive || e.target.stealth > 0)) e.target = null;
    const target = e.target || this.findTarget(e, 14);
    if (target) {
      e.target = target;
      const dx = Math.abs(target.x - e.x);
      const dz = Math.abs((target.z || 0) - e.z);
      if (dx <= Math.max(e.range, 2.4) && dz <= 2.4) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.interval;
          this.dropKiteBomb(e, target);
        }
        // 抵达敌首上空后悬停投弹
        this.moveKiteTo(e, e.facing || (e.side === 'player' ? 1 : -1), 0, dt, true);
        return;
      }
      const dir = Math.sign(target.x - e.x) || (e.side === 'player' ? 1 : -1);
      this.moveKiteTo(e, dir, (target.z || 0) - e.z, dt);
      return;
    }
    // 4. 无敌可打：径直飞至敌寨上空投弹
    const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    const goal = baseX + (e.side === 'player' ? -2.4 : 2.4);
    const dir = e.side === 'player' ? 1 : -1;
    if ((dir > 0 && e.x < goal) || (dir < 0 && e.x > goal)) {
      this.moveKiteTo(e, dir, 0, dt);
    } else {
      this.moveKiteTo(e, e.facing || dir, 0, dt, true);
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.interval;
        this.dropKiteBomb(e, { x: baseX, z: 0 });
      }
    }
  }
,

  // 纸鸢平移：缓慢（speed=2）滑翔，转向靠镜像翻转
  moveKiteTo(e, dir, dz, dt, stay = false) {
    e.facing = dir || e.facing || 1;
    e.model.group.rotation.y = 0;
    const bs = Math.abs(e.baseScale || 1.12);
    e.model.group.scale.set(e.facing * bs, bs, bs);
    if (!stay) {
      e.x += e.facing * e.speed * dt;
      if (Math.abs(dz) > 0.1) e.z += Math.sign(dz) * Math.min(Math.abs(dz), e.speed * 0.8 * dt);
    }
    e.model.group.position.x = e.x;
    e.model.group.position.z = e.z;
  }
,

  // 投下火药：抛物线落至敌军头顶，范围爆伤
  dropKiteBomb(e, target) {
    const fx = e.unit.fx || {};
    const start = new THREE.Vector3(e.x + (e.facing || 1) * 0.25, e.model.group.position.y + 0.1, e.z);
    const mesh = new THREE.Mesh(powderGeo, powderMat);
    mesh.position.copy(start);
    this.scene.scene.add(mesh);
    const speed = 9;
    const p = {
      mesh, type: 'powder', side: e.side, start,
      target: null, targetLast: new THREE.Vector3(target.x, 0.9, target.z || 0),
      speed, damage: fx.bombDamage ?? 170, source: e, life: 5, hit: [], pierce: 1,
      splash: fx.bombSplash ?? 2.2, splashMul: fx.bombSplashMul ?? 1.0,
      buildingBonus: 1.5, lob: true, armorPierce: 0,
      t: 0, dur: Math.max(0.4, Math.abs(target.x - e.x) / speed + 0.3),
      endX: target.x, endZ: target.z || 0, arc: 0.5,
      slow: 0, root: 0, spin: 0, canPierce: false,
    };
    this.projectiles.push(p);
    audio.javelin();
  }
,

  // 生命耗尽：坠地动画开始，期间无敌
  startKiteFall(e) {
    const fx = e.unit.fx || {};
    e.form = 'falling';
    e.fallT = 0;
    e.fallDur = fx.fallDuration ?? 1.0;
    e.invulnT = e.fallDur + 0.05;
    e.hp = 0;
    e.atk = 0;
    e.target = null;
    e.attackAnim = 0;
    e.attackTimer = 0.5;
    this.effects.ring(e.x, e.z, 0xb23a2f, 0.3, 1.8, 0.5, 0.7);
    this.effects.inkBurst(e.x, e.airHeight, e.z, 8, 0x2a2418, 0.9);
    audio.fire();
  }
,

  updateKiteFall(e, dt) {
    const dur = e.fallDur || 1.0;
    e.fallT = Math.min(dur, e.fallT + dt);
    const k = e.fallT / dur;
    if (e.model) {
      e.model.group.position.x = e.x;
      e.model.group.position.z = e.z;
      e.model.group.position.y = e.airHeight * (1 - k * k);
      e.model.group.rotation.z = k * 0.55 * (e.facing || 1);
      if (e.body) e.body.rotation.y = k * 0.8;
    }
    if (k >= 1) this.landKite(e);
  }
,

  // 落地：换装火铳形态，恢复本体生命与低伤范围攻击
  landKite(e) {
    const unit = e.unit;
    const g = unit.ground || {};
    const groundLook = unit.groundLook || unit.look;
    const gm = createUnitModel({ ...unit, id: `${unit.id}_gunner`, look: groundLook }, e.side);
    if (e.body && gm.body) e.body.geometry = gm.body.geometry;
    if (gm.weaponPivot && e.model) {
      e.model.group.add(gm.weaponPivot);
      e.weaponPivot = gm.weaponPivot;
      e.weapon = gm.weapon;
    }
    e.form = 'gunner';
    e.airForm = false;
    e.maxHp = (g.hp ?? 300) * (e.spawnHpMul || 1);
    e.hp = e.maxHp;
    e.atk = (g.atk ?? 34) * (e.spawnAtkMul || 1);
    e.range = g.range ?? 4.2;
    e.interval = g.interval ?? 1.8;
    e.speed = g.speed ?? 0.9;
    e.projectile = 'powder';
    e.target = null;
    e.attackTimer = 0.5;
    e.kiteT = 0;
    const size = groundLook.size || 1;
    e.barY = 2.1 * size;
    if (e.hpBar) {
      e.hpBar.shown = 1;
      e.hpBar.group.position.set(e.x, e.barY, e.z);
      e.hpBar.group.visible = true;
    }
    if (e.model) {
      const facing = e.facing || 1;
      const bs = Math.abs(e.baseScale || 1.12);
      e.model.group.scale.set(facing * bs, bs, bs);
      e.model.group.rotation.z = 0;
      e.model.group.position.set(e.x, 0, e.z);
    }
    this.effects.dust(e.x, e.z, 10, 2.0);
    this.effects.ring(e.x, e.z, 0x8a8578, 0.5, 2.6, 0.45, 0.8);
    this.scene.screenShake(0.16, 0.18);
  }
,

  // 火铳形态阵亡：原地燃起 3 秒火坑持续灼烧
  createKiteFirePit(e) {
    const fx = e.unit.fx || {};
    const dur = fx.fireDuration ?? 3.0;
    this.fireZones.push({
      x: e.x, z: e.z || 0, side: e.side, life: dur, maxLife: dur, damageAcc: 0,
      dps: (fx.fireDps ?? 50) * (this.fireDamageMul || 1), radius: fx.fireRadius ?? 2.0,
    });
    this.effects.fire(e.x, e.z || 0, dur);
  }
,

  marchForward(e, dt) {
    const dir = e.side === 'player' ? 1 : -1;
    e.facing = dir;
    if (e.model && !e.unit.building && e.kind !== 'building') {
      e.model.group.rotation.y = 0;
      const bs = Math.abs(e.baseScale || 1.12);
      e.model.group.scale.set(dir * bs, bs, bs);
    }
    const baseX = e.side === 'player' ? ENEMY_BASE_X - 1.2 : PLAYER_BASE_X + 1.2;
    if ((dir > 0 && e.x < baseX) || (dir < 0 && e.x > baseX)) {
      const spdMul = (e.auraSpeed || 1) * (this.buffSpd ? this.buffSpd(e) : 1) * (this.weatherSpeed ? this.weatherSpeed() : 1) * (this.slowMul ? this.slowMul(e) : 1);
      e.x += dir * e.speed * spdMul * dt;
      e.model.group.position.x = e.x;
      this.moveBob(e, dt, true);
    } else {
      this.moveBob(e, dt, false);
    }
  }
,


  moveBob(e, dt, moving) {
    if (!e.model) return;
    // 攻击动画进行中：由武道动作系统全权驱动姿态，避免与行走摇摆冲突
    // （置于攻城器械分支之前：破城撞车虽为重底盘，仍需驱动吊锤撞击动画）
    if (e.attackAnim > 0) {
      const total = e.attackDuration || 0.25;
      const progress = Math.min(1, Math.max(0, 1 - (e.attackAnim / total)));
      updateAttackAnimation(e, progress);
      return;
    }
    // 霹雳车/攻城器械重型底盘平稳滑行，绝不上浮颠簸摇晃 (#8)
    const isSiege = (e.unit.id === 'trebuchet' || e.unit.type === 'trebuchet' || e.unit.building || (e.unit.look && (e.unit.look.building === 'trebuchet' || e.unit.look.building === 'cart' || e.unit.look.building === 'ram')));
    if (isSiege) {
      if (e.model.body) {
        e.model.body.position.y = 0;
        e.model.body.rotation.z = 0;
        e.model.body.rotation.y = 0;
      }
      return;
    }

    const speed = moving ? 7 : 2.4;
    e.bobPhase += dt * speed;
    const bob = Math.sin(e.bobPhase) * (moving ? 0.045 : 0.018);
    if (e.model.body) {
      e.model.body.position.y = bob;
      const mounted = !!(e.unit.look && e.unit.look.mount);
      const sway = mounted ? 0 : (moving ? 1 : 0.25);
      e.model.body.rotation.z = Math.sin(e.bobPhase) * 0.085 * sway;
      e.model.body.rotation.y = Math.sin(e.bobPhase * 0.5) * 0.05 * sway;
    }
    if (e.weaponPivot) {
      applyIdlePose(e, dt, moving);
    }
  }
,


  faceTarget(e, target) {
    // 建筑保持摆放朝向，不随目标翻转
    if (e.kind === 'building' || e.unit.building) return;
    const dir = Math.sign(target.x - e.x) || (e.side === 'enemy' ? -1 : 1);
    e.facing = dir;
    // 士兵和将领均不进行 3D Y 轴转身，纯通过 scale.x 镜像翻转左右朝向，永不露出背面
    e.model.group.rotation.y = 0;
    const bs = Math.abs(e.baseScale || 1.12);
    e.model.group.scale.set(dir * bs, bs, bs);
  }
,


  weatherSpeed() {
    return this.speedMulWeather ?? 1;
  }
,


  slowMul(e) {
    if (e.buffs.noSlowT > 0) return 1;
    if (e.buffs.slow > 0) return 1 - (e.buffs.slowFactor || 0.3);
    return 1;
  }
,


  effectiveRange(e) {
    let r = e.range;
    const rMul = this.rangeMul ?? 1;
    if (e.unit.tags.includes('ranged') && !e.unit.building) r *= rMul;
    if (e.unit.building) r *= rMul;
    // 黄忠「神射」类：远程射程加成
    const p = this.heroData.passive;
    if (e.side === 'player' && p && p.template === 'rangedRange' && e.unit.tags.includes('ranged') && !e.unit.building) r += p.value;
    return r;
  }
,


  // 飞行单位只有弓弩箭矢与术法可及，其余近战兵种无从索敌
  canHitAir(attacker) {
    if (!attacker) return false;
    if (attacker.isHero) return true;
    const u = attacker.unit || {};
    const tags = u.tags || [];
    if (tags.includes('ranged') || tags.includes('spell')) return true;
    const proj = u.projectile || attacker.projectile;
    return proj === 'arrow' || proj === 'bolt' || proj === 'talisman' || proj === 'javelin' || proj === 'powder';
  }
,

  findTarget(e, aggro = 3) {
    // 隐匿单位敌军无法发现 (敌军索敌时完全忽略 stealth > 0 的目标)
    const airOk = this.canHitAir(e);
    const foes = this.entities.filter((o) => o.alive && o.side !== e.side && (!o.stealth || o.stealth <= 0) && (!o.airForm || airOk));
    // Kingdom Rush 风格：赵云作为地面英雄参战，若敌军被赵云拦截则直接锁定赵云；否则在索敌范围内加入候选目标
    if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive()) {
      const heroTarget = this.getHeroTargetObj();
      if (e.heroBlockedBy) return heroTarget;
      foes.push(heroTarget);
    }
    if (!foes.length) return null;
    // 神臂弓：先锁定目标，击败后才重新选择视野内血量最低的敌人
    if (e.unit.special === 'sniper') {
      if (e.sniperTarget && e.sniperTarget.alive) return e.sniperTarget;
      const inView = foes.filter((o) => Math.abs(o.x - e.x) <= aggro + (o.kind === 'building' ? 0 : 0.3));
      if (!inView.length) return null;
      const next = inView.reduce((a, b) => (b.hp < a.hp ? b : a), inView[0]);
      e.sniperTarget = next;
      return next;
    }
    // 嘲讽
    if (e.unit.special !== 'assassin') {
      const taunt = foes.find((o) => o.alive && o.unit.special === 'taunt' && Math.abs(o.x - e.x) <= 3);
      if (taunt) return taunt;
    }
    let list = foes.filter((o) => Math.abs(o.x - e.x) <= aggro + (o.kind === 'building' ? 0 : 0.3));
    if (!list.length) return null;
    if (e.unit.special === 'towerPriorityRanged') {
      const ranged = list.filter((o) => o.unit.tags.includes('ranged') && !o.unit.building);
      if (ranged.length) list = ranged;
    } else if (e.unit.special === 'assassin') {
      const back = list.filter((o) => o.kind === 'building' || o.unit.tags.includes('ranged'));
      if (back.length) list = back;
    }
    let best = list[0];
    let bestD = Math.abs(list[0].x - e.x);
    for (const o of list) {
      const d = Math.abs(o.x - e.x);
      if (d < bestD) { best = o; bestD = d; }
    }
    return best;
  }
,


  performAttack(e, target, onBase = false) {
    if (!target && !onBase) return;
    if (target && (!target.alive || (target.isHero && this.isHeroAlive && !this.isHeroAlive()))) {
      e.target = null;
      return;
    }
    // 目标为英雄时，校验距离是否已脱离近战范围（防止英雄位移后敌军原地隔空攻击扣血）
    if (target && target.isHero) {
      const curDist = Math.hypot(this.heroX - e.x, ((this.heroZ || 0) - e.z) * 1.35);
      const maxReach = this.effectiveRange(e) + 0.45;
      if (curDist > maxReach && !e.unit.tags?.includes('ranged')) {
        e.target = null;
        return;
      }
    }
    e.comboCount = (e.comboCount || 0) + 1;
    e.currentAttackStyle = getAttackStyle(e);
    e.attackDuration = getAttackDuration(e.currentAttackStyle, e);
    e.attackAnim = e.attackDuration;
    // 落地火铳形态的投射类型由实体自身覆盖（飞行形态为 none）
    const projKind = e.projectile || e.unit.projectile;
    const projAlways = projKind && projKind !== 'none';
    const weapon = e.unit.look.weapon;
    if (weapon === 'bow') audio.bow();
    else if (weapon === 'crossbow') audio.bow();
    else if (weapon === 'javelin') audio.javelin();
    else if (weapon === 'spear' || weapon === 'glaive') audio.spear();
    else if (weapon === 'staff' || weapon === 'fan') audio.heal();
    else if (weapon === 'sword' || weapon === 'axe' || weapon === 'dagger') audio.sword();
    if (e.form === 'gunner') audio.javelin();

    if (onBase) {
      if (e.stealth > 0) this.revealStealth(e);
      const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
      const proj = e.projectile || e.unit.projectile;
      if (proj && proj !== 'none') {
        this.spawnBaseProjectile(e, baseX);
      } else {
        this.attackBase(e);
      }
      return;
    }

    const special = e.unit.special;
    if (special === 'medic' || special === 'debuff' || special === 'auraAtk') return;

    // 破城：对同一建筑连撞，每次伤害递增 500（换目标后重新起算）
    if (special === 'ram' && target) {
      const step = (e.unit.fx && e.unit.fx.rampStep) || 500;
      if (e.ramKey !== target.uid) { e.ramKey = target.uid; e.ramStacks = 0; }
      const rDamage = (e.atk + step * (e.ramStacks || 0)) * (e.auraAtk || 1) * this.damageMul;
      e.ramStacks = (e.ramStacks || 0) + 1;
      this.applyDamage(target, rDamage, e);
      this.effects.dust(target.x, target.z, 6, 1.4);
      this.effects.inkBurst(target.x, 0.8, target.z, 8, 0x17150f, 1.0);
      this.scene.screenShake(0.25, 0.25);
      audio.baseHit();
      return;
    }

    if (projAlways) {
      e.shotCount = (e.shotCount || 0) + 1;
      this.spawnProjectile(e, target);
    } else {
      // 近战伤害
      let damage = this.calcDamage(e, target, e.atk);
      // 张辽「先登」类：骑兵冲锋伤害加成
      const cp = this.heroData.passive;
      const weatherCavMul = this.cavalryChargeMul || 1;
      const cavChargeMul = ((e.side === 'player' && cp && cp.template === 'cavCharge' && e.unit.tags.includes('cavalry'))
        ? 1 + cp.value * this.heroPower() : 1) * weatherCavMul;
      let charged = false;
      if (special === 'charge' && e.chargeReady) {
        damage *= 2 * cavChargeMul;
        charged = true;
        e.chargeReady = false;
        audio.charge();
        this.effects.ring(target.x, target.z, 0xb23a2f, 0.4, 1.8, 0.4, 0.5);
      } else if (special === 'heavyCharge' && e.chargeReady) {
        damage *= 1.6 * cavChargeMul;
        charged = true;
        e.chargeReady = false;
        audio.charge();
        const splash = this.entities.filter((o) => o.alive && o.side !== e.side && Math.abs(o.x - target.x) <= 2.0);
        for (const o of splash) if (o !== target) this.applyDamage(o, damage * 0.5, e, { splash: true });
        if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive() && (!target || !target.isHero)) {
          if (Math.abs(this.heroX - target.x) <= 2.0) {
            this.applyDamage(this.getHeroTargetObj(), damage * 0.5, e, { splash: true });
          }
        }
        this.scene.screenShake(0.2, 0.2);
      } else if (special === 'legendCharge' && e.chargeReady) {
        damage *= 2 * cavChargeMul;
        charged = true;
        e.chargeReady = false;
        audio.charge();
        const behind = this.entities.filter((o) => o.alive && o.side !== e.side && Math.abs(o.x - target.x) <= 2.6 && o !== target);
        for (const o of behind) this.applyDamage(o, damage * 0.55, e, { splash: true });
        if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive() && (!target || !target.isHero)) {
          if (Math.abs(this.heroX - target.x) <= 2.6) {
            this.applyDamage(this.getHeroTargetObj(), damage * 0.55, e, { splash: true });
          }
        }
      }
      if (charged && e.unit.tags.includes('cavalry')) {
        // 建筑（拒马/箭塔等）固定不动，骑兵冲锋不能击退建筑
        const immovable = target.kind === 'building' || target.unit.building;
        if (!immovable) {
          const kb = 0.8;
          target.x += (e.side === 'player' ? kb : -kb);
          target.model.group.position.x = target.x;
        }
      }
      if (special === 'infantryBonus') {
        // 陌刀兵：一刀横扫身前两个身位内的所有敌军（不衰减，逐个结算对近战翻倍）
        const facing = e.facing || (e.side === 'player' ? 1 : -1);
        const reach = 2.2;
        const victims = this.entities.filter((o) =>
          o.alive && o.side !== e.side && o.kind !== 'building' && !o.unit.building &&
          (o.x - e.x) * facing >= -0.25 && Math.abs(o.x - e.x) <= reach &&
          Math.abs((o.z || 0) - e.z) <= 1.4
        );
        if (victims.length === 0) this.applyDamage(target, damage, e);
        for (const o of victims) {
          const dmg = o === target ? damage : this.calcDamage(e, o, e.atk);
          this.applyDamage(o, dmg, e);
          if (o !== target && this.effects) this.effects.dust(o.x, o.z, 4, 1.0);
        }
      } else {
        this.applyDamage(target, damage, e);
      }
      if (charged && e.side === 'player' && e.fearOnChargeT > 0 && target.alive) {
        this.applyFear(target, 1.5, 0.6);
      }
      const sx = (e.x + target.x) / 2;
      // 陌刀兵克制提示：命中近战单位时刀光转为赤红并炸开克制墨纹
      const meleeBreak = special === 'infantryBonus' && target.unit && target.unit.tags.includes('melee');
      const color = meleeBreak ? 'red' : (e.side === 'player' ? 'jade' : 'red');
      this.effects.slash(sx, 0.95, target.z, Math.random() * 1.2, color, (meleeBreak ? 1.35 : 0.9) + Math.random() * 0.3);
      if (meleeBreak) {
        this.effects.ring(target.x, target.z, 0xb23a2f, 0.28, 1.5, 0.55, 0.9);
        this.effects.inkBurst(target.x, 1.05, target.z, 8, 0xb23a2f, 0.95);
      }
      if (special === 'cleave2' || special === 'cleave3') {
        const nearby = this.entities.filter((o) => o.alive && o.side !== e.side && o !== target && Math.abs(o.x - target.x) <= 1.2);
        if (nearby.length) {
          const extra = special === 'cleave3' ? 0.5 : 0.45;
          for (const o of nearby.slice(0, special === 'cleave3' ? 2 : 1)) this.applyDamage(o, damage * extra, e);
        }
        if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive() && (!target || !target.isHero)) {
          if (Math.abs(this.heroX - target.x) <= 1.2) {
            const extra = special === 'cleave3' ? 0.5 : 0.45;
            this.applyDamage(this.getHeroTargetObj(), damage * extra, e, { splash: true });
          }
        }
      }
    }
  }
,


  damageEnemyBase(dmg, source = null) {
    if (this.bossShield) {
      if (this.effects?.ring) this.effects.ring(ENEMY_BASE_X, 0, 0xb23a2f, 1.2, 3.2, 0.5, 0.6);
      if (!this._shieldHintT || this.elapsed - this._shieldHintT > 8) {
        this._shieldHintT = this.elapsed;
        this.ui?.showBattleBanner?.('墨盾护寨', '先破首领，再破敌寨', 1400);
      }
      return 0;
    }
    // 无尽模式下，大本营 3 秒无敌护盾期间免疫一切伤害
    if (this.isEndless && this.endlessBaseShieldTimer > 0) {
      if (this.effects?.ring) {
        this.effects.ring(ENEMY_BASE_X, 0, 0xc9a25e, 1.2, 3.5, 0.3, 0.8);
      }
      return 0;
    }

    // 肉鸽增益：对敌寨额外攻城增伤
    if (this.isEndless && this.endlessBuffs?.siegeBonus) {
      dmg *= (1 + this.endlessBuffs.siegeBonus);
    }
    // 肉鸽增益：全军暴击率作用于敌寨
    if (this.isEndless && this.endlessBuffs?.critRate && Math.random() < this.endlessBuffs.critRate) {
      dmg *= 1.5;
    }

    dmg = Math.round(dmg);
    if (this.onBountyEvent && dmg > 0) {
      this.onBountyEvent('base_damage', dmg);
    }

    if (this.isEndless) {
      this.totalEnemyBaseDamage = (this.totalEnemyBaseDamage || 0) + dmg;
      this.enemyBaseHp = Math.max(0, (this.enemyBaseHp ?? 5000) - dmg);
      this.effects?.dust?.(ENEMY_BASE_X, 0, 3, 1.2);
      if (this.dmgText) this.dmgText.spawn({ x: ENEMY_BASE_X, y: 1.2, z: 0, amount: dmg, isBuilding: true });
      if (Math.random() < 0.3) audio.baseHit();

      // 当敌寨生命被打到 0 时，触发大本营爆炸逆流！
      if (this.enemyBaseHp <= 0) {
        this.triggerEndlessBaseExplosion();
      }
    } else {
      this.enemyBaseHp = Math.max(0, this.enemyBaseHp - dmg);
      this.effects?.dust?.(ENEMY_BASE_X, 0, 3, 1.2);
      if (this.dmgText) this.dmgText.spawn({ x: ENEMY_BASE_X, y: 1.2, z: 0, amount: dmg, isBuilding: true });
      if (Math.random() < 0.3) audio.baseHit();
    }
    return dmg;
  },

  attackBase(e) {
    const side = e.side;
    const baseX = side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    let dmg;
    if (e.unit.special === 'ram') {
      // 破城：大本营同属建筑，连撞递增 500（与建筑目标各自独立计档）
      const step = (e.unit.fx && e.unit.fx.rampStep) || 500;
      if (e.ramKey !== 'base') { e.ramKey = 'base'; e.ramStacks = 0; }
      dmg = (e.atk + step * (e.ramStacks || 0)) * (e.auraAtk || 1) * this.damageMul * (e.rallyTime > 0 ? 1.35 : 1);
      e.ramStacks = (e.ramStacks || 0) + 1;
    } else {
      dmg = e.atk * (e.auraAtk || 1) * this.damageMul * (e.rallyTime > 0 ? 1.35 : 1);
      // 攻城加成（霹雳车等攻城武器对建筑与大本营额外 50% 巨额破坏伤害）
      if (e.unit.fx && e.unit.fx.buildingBonus) {
        dmg *= e.unit.fx.buildingBonus;
      } else if (e.unit.tags && e.unit.tags.includes('siege')) {
        dmg *= 1.5;
      }
    }
    if (side === 'player') {
      this.damageEnemyBase(dmg, e);
    } else {
      // 秦琼「护宅」类：帅帐减伤
      const p = this.heroData.passive;
      const finalDmg = (p && p.template === 'baseGuard') ? dmg * (1 - p.value) : dmg;
      this.baseHp = Math.max(0, this.baseHp - finalDmg);
      this.effects.dust(baseX, 0, 3, 1.2);
      this.scene.damagePulse();
      this.ui.flash('damage');
      audio.baseHit();
    }
    this.effects.slash(baseX + (side === 'player' ? -0.3 : 0.3), 1.1, 0, side === 'player' ? 'jade' : 'red', 1.1);
  }
,


  // ---------- 壁垒：震撼爆发 ----------
  // 巨躯崩解般的水墨冲击波：攻击半径内所有敌军承受其半血之伤，定身 0.5 秒
  releaseBulwarkShock(e) {
    const fx = e.unit.fx || {};
    const radius = fx.shockRadius ?? 2.0;
    const dmg = e.maxHp * (fx.shockDamage ?? 0.5) * this.damageMul;
    e.shockT = fx.shockAnim ?? 0.5;
    const foes = this.entities.filter((o) => o.alive && o.side !== e.side && !o.airForm
      && Math.abs(o.x - e.x) <= radius + 0.3 && Math.abs((o.z || 0) - (e.z || 0)) <= radius);
    for (const o of foes) this.applyDamage(o, dmg, e, { splash: true });
    if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive() && Math.abs(this.heroX - e.x) <= radius + 0.3) {
      this.applyDamage(this.getHeroTargetObj(), dmg, e, { splash: true });
    }
    this.effects.ring(e.x, e.z, 0xb23a2f, 0.5, radius * 1.9, 0.5, 0.85);
    this.effects.inkBurst(e.x, 0.7, e.z, 14, 0x17150f, 1.5);
    this.effects.dust(e.x, e.z, 8, 1.6);
    this.scene.screenShake(0.35, 0.35);
    audio.baseHit();
  }
,


  calcDamage(attacker, target, baseAtk) {
    let atk = baseAtk * (attacker.auraAtk || 1);
    if (this.isEndless && this.endlessBuffs && attacker && attacker.side === 'player') {
      if (this.endlessBuffs.teamAtk) atk *= (1 + this.endlessBuffs.teamAtk);
    }
    if (attacker.buffs.atkDebuff) atk *= attacker.buffs.atkDebuff;
    if (attacker.buffs.atkUpT > 0) atk *= 1 + attacker.buffs.atkUp;
    if (attacker.boostT > 0) atk *= 1 + (attacker.boostAtk || 0);
    if (attacker.rallyTime > 0) atk *= 1 + 0.35 * this.heroPower();
    const tags = attacker.unit.tags;
    let mult = 1;
    if (attacker.unit.special === 'anticav' && target.unit.tags.includes('cavalry')) {
      // 长枪兵专属（v1.3）：对骑兵首次命中 ×10，之后 ×5
      if (attacker.unit.id === 'spearman') {
        if (!attacker.anticavFirstCavHit) {
          attacker.anticavFirstCavHit = true;
          mult *= 10;
        } else {
          mult *= 5;
        }
      } else {
        mult *= 2;
      }
    }
    if (attacker.unit.special === 'infantryBonus' && target.unit.tags.includes('melee')) mult *= 2;
    if (attacker.unit.special === 'heavyCharge' && target.unit.tags.includes('ranged')) mult *= 1.5;
    if (attacker.unit.special === 'assassin' && (target.unit.tags.includes('ranged') || target.kind === 'building')) mult *= 2;
    if (target.buffs.mark > 0) mult *= 1.2;
    if (attacker.unit.special === 'sniper') {
      const fx = attacker.unit.fx || {};
      mult *= fx.sniperMul ?? 1.1;
      const hpRatio = target.maxHp > 0 ? target.hp / target.maxHp : 1;
      if (hpRatio < (fx.lowHpThreshold ?? 0.5)) mult *= 1 + (fx.lowHpBonus ?? 1);
    }
    if (tags.includes('elite') && target.unit.tags.includes('infantry')) mult *= 1.05;
    // 克制链（design §3.6 & 规划 v1.0 §2.4）：source === 'mul' 才乘算，记录克制情报
    const counterMatch = getCounterMatch(attacker.unit, target.unit);
    attacker.lastCounter = counterMatch;
    mult *= counterMul(attacker.unit, target.unit);
    // 暴击（马超「西凉锦骑」被动 / 技能暴击）
    const critChance = (attacker.auraCrit || 0) + (attacker.buffs.critT > 0 ? attacker.buffs.crit : 0);
    if (critChance > 0 && Math.random() < critChance) {
      mult *= (attacker.buffs.critMul || 2);
      attacker.lastCrit = true;
    } else {
      attacker.lastCrit = false;
    }
    return atk * mult * this.damageMul;
  }
,

  // ---------- 伤害 ----------

  applyDamage(target, raw, attacker, opts = {}) {
    if (!target || !target.alive) return;
    // 纸鸢飞行形态：唯弓弩箭矢与术法可及，近战刀斧无法触及高空
    if (target.airForm && !this.canHitAir(attacker)) {
      if (this.effects) this.effects.ring(target.x, target.z, 0x8a8578, 0.14, 0.7, 0.3, 0.35);
      return;
    }
    // 坠地 1 秒无敌：任何伤害都无法命中
    if (target.invulnT > 0) return;
    if (target.isHero && this.damageHero) {
      this.damageHero(raw, attacker, opts);
      return;
    }
    // 受到攻击或造成伤害现出原形 (#6)
    if (target.stealth > 0) {
      this.revealStealth(target);
    }
    if (attacker && attacker.stealth > 0) {
      this.revealStealth(attacker);
    }
    const p = this.heroData.passive;
    const isPlayerHit = !!attacker && attacker.side === 'player' && target.side === 'enemy';
    const fromPlayerUnit = isPlayerHit && !!attacker.uid && !attacker.unit.building;
    let amount = raw;
    if (this.isEndless && this.endlessBuffs) {
      if (target.side === 'player' && this.endlessBuffs.damageReduction) {
        amount *= (1 - this.endlessBuffs.damageReduction);
      }
      if (attacker && attacker.side === 'player' && this.endlessBuffs.teamAtk) {
        amount *= (1 + this.endlessBuffs.teamAtk);
      }
    }
    // 破甲（李广「飞将」）：命中先叠破甲，本场累积
    if (fromPlayerUnit && p && p.template === 'armorBreakAura' && !target.unit.building) {
      target.armorBreak = Math.min(p.cap, (target.armorBreak || 0) + p.value);
    }
    const armor = opts.ignoreArmor ? 0 : Math.max(0, target.armor - (target.armorBreak || 0)) * (opts.armorPierce ? 0.5 : 1);
    amount *= 100 / (100 + armor);
    if (target.unit.special === 'rangedReduce' && opts.projectile) amount *= 0.7;
    if (target.unit.special === 'taunt') amount *= 0.85;
    amount *= target.auraDamageTaken || 1;
    if (target.buffs.defUpT > 0) amount *= 1 - target.buffs.defUp;
    if (target.buffs.stun > 0) amount *= 1.0;
    // 易伤（孙武/貂蝉/姜子牙等）
    if (target.buffs.vulnT > 0) amount *= 1 + target.buffs.vuln;
    // 反伤（戚继光「鸳鸯阵」类）：仅近战触发，反伤按投射处理避免连环反弹
    if (target.buffs.thornsT > 0 && target.buffs.thorns > 0 && attacker && attacker.alive && !opts.projectile) {
      this.applyDamage(attacker, amount * target.buffs.thorns, null, { projectile: true });
    }
    if (target.shield > 0 && !opts.pierceShield) {
      const absorbed = Math.min(target.shield, amount);
      target.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount <= 0) {
      this.effects.shield(target.x, 0.9, target.z);
      return;
    }
    target.hp -= amount;
    target.hitFlash = 1;
    this.effects.blood(target.x, 1.0, target.z, 2 + Math.floor(Math.random() * 2));

    // 飘字水墨反馈 (Planning §2.3)
    if (this.dmgText) {
      const isCounter = opts.isCounter ?? (attacker?.lastCounter != null);
      const isBreak = opts.isBreak || false;
      const isExecute = opts.isExecute || false;
      const isReduced = (target.unit?.special === 'rangedReduce' && opts.projectile) || (target.buffs?.defUpT > 0);
      const isBuilding = target.kind === 'building';
      this.dmgText.spawn({
        x: target.x,
        y: (target.y || 0) + 0.8,
        z: target.z,
        unit: target,
        amount,
        type: 'normal',
        isCounter,
        isCrit: attacker?.lastCrit || false,
        isBreak,
        isExecute,
        isReduced,
        isBuilding,
      });
    }

    // 统计兵种与波次伤害（规划 §2.6 失败复盘）
    if (attacker && attacker.side === 'player' && attacker.unit) {
      this.stats = this.stats || { damageByUnit: {}, waveDamageTaken: {} };
      this.stats.damageByUnit = this.stats.damageByUnit || {};
      const uid = attacker.unit.id;
      this.stats.damageByUnit[uid] = (this.stats.damageByUnit[uid] || 0) + amount;
    }
    if (target && target.side === 'player') {
      this.stats = this.stats || { damageByUnit: {}, waveDamageTaken: {} };
      this.stats.waveDamageTaken = this.stats.waveDamageTaken || {};
      const wIdx = Math.max(0, this.waveIndex);
      this.stats.waveDamageTaken[wIdx] = (this.stats.waveDamageTaken[wIdx] || 0) + amount;
    }
    // 吸血（典韦「恶来」/ 赵云「龙吟破阵」/ 程咬金「三板斧」）
    if (fromPlayerUnit && attacker.maxHp) {
      let ls = 0;
      if (p && p.template === 'lifestealAura') ls += p.value;
      if (attacker.buffs.lifestealT > 0) ls += attacker.buffs.lifesteal;
      if (ls > 0 && attacker.alive) {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + amount * ls);
        if (Math.random() < 0.18) this.effects.heal(attacker.x, 1.0, attacker.z);
      }
    }
    // 壁垒：受创即将一半伤害反还敌手；每累积半血之伤释放一次半血范围震撼（至多两次）
    if (target.unit.special === 'bulwark' && target.alive) {
      const bfx = target.unit.fx || {};
      if (attacker && attacker.side !== target.side) {
        const refl = amount * (bfx.reflect ?? 0.5);
        // 反伤按投射处理，避免与反伤类效果连环互弹
        if (attacker.isHero) {
          if (this.damageHero) this.damageHero(refl, null, { projectile: true });
        } else if (attacker.alive) {
          this.applyDamage(attacker, refl, null, { projectile: true });
        }
      }
      const threshold = target.maxHp * (bfx.shockThreshold ?? 0.5);
      target.shockAcc = (target.shockAcc || 0) + amount;
      while ((target.shocksUsed || 0) < (bfx.maxShocks ?? 2) && target.shockAcc >= threshold) {
        target.shockAcc -= threshold;
        target.shocksUsed = (target.shocksUsed || 0) + 1;
        this.releaseBulwarkShock(target);
      }
    }
    if (target.hp <= 0) {
      this.killEntity(target, attacker);
      return;
    }
    // 处决光环（黄忠「神射」）：真实单位攻击将非首领打至阈值以下直接斩杀
    if (fromPlayerUnit && p && p.template === 'executeAura'
      && !target.isBoss && !target.unit.building && target.hp / target.maxHp <= p.threshold) {
      this.executeKill(target, attacker);
    }
  }
,


  killEntity(e, killer) {
    if (!e.alive) return;
    const isBoss = e.isBoss;
    // 纸鸢火铳形态阵亡：枪膛余火泼洒，原地燃起 3 秒火坑
    if (e.unit.special === 'kite' && e.form === 'gunner') this.createKiteFirePit(e);
    // 半仙魂印：被烙印的敌军阵亡，0.5 秒后尸身破土化为我方僵尸
    if (e.side === 'enemy' && !isBoss && (e.buffs.mark || 0) > 0) {
      this.scheduleNecroZombie(e);
    }
    this.effects.death(e.x, 1.0, e.z, isBoss ? 0xb23a2f : 0x2a2a24, isBoss);
    this.startDeath(e);
    if (this.heroBlockedFoes && this.heroBlockedFoes.has(e)) {
      this.heroBlockedFoes.delete(e);
      e.heroBlockedBy = null;
    }
    if (killer && (killer.side === 'player' || killer.isHero)) {
      if (killer.isHero && this.addHeroInBattleXp) {
        this.addHeroInBattleXp(isBoss ? 20 : 5);
      }
      // 白起「人屠」类：击杀额外军令
      const p = this.heroData.passive;
      let gain = isBoss ? 20 : 2;
      if (this.killEnergyBonus && !isBoss) gain += this.killEnergyBonus;
      if (p && p.template === 'killEnergy' && !isBoss) gain += p.value;
      if (killer.buffs && killer.buffs.killEnergyT > 0 && killer.buffs.killEnergy) gain += killer.buffs.killEnergy;
      this.energy = Math.min(this.energyMax, this.energy + gain);
      this.addHeroXp(isBoss ? 12 : 1);
      this.kills++;
      if (this.isEndless) {
        if (isBoss || e.isBoss) {
          this.endlessBossKills = (this.endlessBossKills || 0) + 1;
        } else {
          this.endlessKills = (this.endlessKills || 0) + 1;
        }
      }
      if (p && p.template === 'killRampage') this.rampage = Math.min(p.cap, (this.rampage || 0) + p.per);
      if (killer.unit.special === 'legendCharge') killer.chargeReady = true;
      if (e.kind === 'building' && !isBoss) this.energy = Math.min(this.energyMax, this.energy + 8);
    }
    if (isBoss) {
      this.ui.hideBossBar();
      // 首领死亡给 20 军令 + 主将升 1 级（design §5.4）
      this.energy = Math.min(this.energyMax || 30, (this.energy || 0) + 20);
      this.heroLevel = Math.min(5, (this.heroLevel || 1) + 1);
      this.ui.showBattleBanner('斩将夺魁', '敌首伏诛，全军欢呼！军令 +20，主将升阶！', 2400);
      audio.gong(null, 1.0);
      this.scene.screenShake(0.4, 0.5);
      audio.setMood('battle');
      this.removeBossShield();
    }
  }
,

  // ---------- 投射物 ----------

  spawnBaseProjectile(e, baseX) {
    const type = e.projectile || e.unit.projectile;
    const ufx = e.unit.fx || {};
    const side = e.side;
    const start = new THREE.Vector3(e.x + (side === 'player' ? 0.6 : -0.6), 1.6, e.z);
    let mesh;
    let speed = type === 'stone' ? 9.5 : 17;
    if (type === 'stone') mesh = new THREE.Mesh(stoneGeo, stoneMat);
    else if (type === 'bolt') mesh = new THREE.Mesh(boltGeo, boltMat);
    else if (type === 'arrow') mesh = new THREE.Mesh(arrowGeo, arrowMat);
    else if (type === 'powder') { mesh = new THREE.Mesh(powderGeo, powderMat); speed = 10; }
    else mesh = new THREE.Mesh(stoneGeo, stoneMat);
    mesh.position.copy(start);
    this.scene.scene.add(mesh);

    const baseZ = e.z * 0.25;
    const p = {
      mesh, type, side, start,
      target: null, targetLast: new THREE.Vector3(baseX, 1.0, baseZ),
      speed, damage: e.atk, source: e, life: 6, hit: [],
      splash: type === 'stone' ? (ufx.splashRadius ?? 3.0) : type === 'powder' ? (e.unit.ground?.splash ?? 2.0) : 0,
      splashMul: ufx.splashMul ?? 0.7,
      buildingBonus: type === 'stone' ? (ufx.buildingBonus ?? 1.5) : type === 'powder' ? 1.0 : 1.0,
      lob: type === 'stone' || type === 'oil' || type === 'powder',
      t: 0, dur: Math.abs(baseX - e.x) / speed + 0.25,
      endX: baseX, endZ: baseZ,
      arc: type === 'stone' ? 3.8 : type === 'powder' ? 1.2 : 1.6,
      isBaseAttack: true,
    };
    if (type === 'stone') {
      audio.javelin();
    }
    this.projectiles.push(p);
  },

  spawnProjectile(e, target) {
    const type = e.projectile || e.unit.projectile;
    const ufx = e.unit.fx || {};
    const side = e.side;
    const start = new THREE.Vector3(e.x + (side === 'player' ? 0.4 : -0.4), e.unit.look.mount ? 1.7 : 1.15, e.z);
    let mesh;
    let speed = 17;
    if (type === 'arrow') mesh = new THREE.Mesh(arrowGeo, arrowMat);
    else if (type === 'bolt') mesh = new THREE.Mesh(boltGeo, boltMat);
    else if (type === 'javelin') { mesh = new THREE.Mesh(javelinGeo, arrowMat); speed = 14; }
    else if (type === 'axe') { mesh = new THREE.Mesh(axeGeo, new THREE.MeshBasicMaterial({ color: 0x6a5a42 })); speed = 11; }
    else if (type === 'stone') { mesh = new THREE.Mesh(stoneGeo, stoneMat); speed = 9; }
    else if (type === 'oil') { mesh = new THREE.Mesh(oilGeo, oilMat); speed = 10; }
    else if (type === 'talisman') { mesh = new THREE.Mesh(talismanGeo, talismanMat); speed = 12; }
    else if (type === 'powder') { mesh = new THREE.Mesh(powderGeo, powderMat); speed = 10; }
    else mesh = new THREE.Mesh(arrowGeo, arrowMat);
    mesh.position.copy(start);
    this.scene.scene.add(mesh);

    const damage = this.calcDamage(e, target, e.atk);
    const gSplash = e.unit.ground?.splash;
    const p = {
      mesh, type, side, start, target, targetLast: new THREE.Vector3(target.x, 1.0, target.z),
      speed, damage, source: e, life: 4, hit: [], pierce: type === 'javelin' ? 2 : 1,
      splash: type === 'axe' ? (ufx.splashRadius ?? 1.3)
        : type === 'stone' ? (ufx.splashRadius ?? 2.4)
        : type === 'powder' ? (gSplash ?? ufx.bombSplash ?? 1.8)
        : (e.unit.special === 'necro' ? (ufx.splashRadius ?? 2.2) : 0),
      lob: type === 'oil' || type === 'stone' || type === 'powder',
      splashMul: type === 'powder' ? (e.unit.ground?.splashMul ?? 0.8) : (ufx.splashMul ?? 0.7),
      buildingBonus: type === 'stone' ? (ufx.buildingBonus ?? 1.5) : 0, armorPierce: type === 'bolt' ? 0.5 : 0,
      t: 0, dur: 0, arc: type === 'stone' ? 3.2 : 1.6,
      slow: type === 'talisman' ? 0.4 : 0, root: 0, spin: 0,
      canPierce: type === 'javelin',
    };
    if (p.lob) {
      p.dur = Math.abs(target.x - e.x) / speed + 0.25;
      p.endX = target.x;
      p.endZ = target.z;
    }
    this.projectiles.push(p);
  }
,


  // 射箭将领箭矢物理飞行与接触碰撞伤害系统 (黄忠、李广等射箭将领与士兵类似：只有箭头触碰到敌人时才结算伤害与击退)
  updateHeroArrowProjectiles(dt) {
    if (!this.heroArrowProjectiles || !this.heroArrowProjectiles.length) return;
    const enemies = this.entities.filter((e) => e.alive && e.side === 'enemy');
    const ENEMY_BASE_X = 13.5;

    for (let i = this.heroArrowProjectiles.length - 1; i >= 0; i--) {
      const p = this.heroArrowProjectiles[i];

      // 处理多箭先后连发延迟 (如李广 6 支狼牙箭按序依次呼啸射出)
      if (p.delay && p.age < p.delay) {
        p.age += dt;
        continue;
      }

      p.life -= dt;
      p.prevX = p.currentX;
      p.currentX += p.speed * dt;

      // 1. 逐帧检测与场上敌方单位的物理接触碰撞 (只有触碰到敌人才扣血！)
      for (const e of enemies) {
        if (!e.alive || p.hitUids.has(e.uid)) continue;

        // 单位体型碰撞半径：普通步兵/远程约 0.6，骑兵/重装约 0.9，首领与建筑物约 1.5~2.0
        const radius = e.isBoss ? 1.6 : (e.kind === 'building' || (e.unit && e.unit.building) ? 1.4 : (e.unit?.tags?.includes('cavalry') || e.unit?.tags?.includes('heavy') ? 0.9 : 0.6));
        const zDist = Math.abs(e.z - (p.z || 0));

        // 箭头行进轨迹段与敌军体积相交判定
        const hitX = (p.currentX >= e.x - radius && p.prevX <= e.x + radius);
        const hitZ = zDist <= (p.widthZ || 1.2);

        if (hitX && hitZ) {
          p.hitUids.add(e.uid);

          // 箭头接触瞬间精准结算伤害与增伤倍率
          let dmg = p.damage;
          if (p.pierceRatio) dmg *= (1 + (e.x - p.startX) * p.pierceRatio);
          if (p.bossPercent && e.isBoss) dmg += e.maxHp * p.bossPercent;

          this.applyDamage(e, dmg, p.src, { projectile: true, ignoreArmor: p.ignoreArmor || false });

          // 物理击退 (建筑与首领不吃击退)
          if (p.knockback && e.alive && !e.unit.building && e.kind !== 'building') {
            e.x += p.knockback;
            if (e.model) e.model.group.position.x = e.x;
          }

          // 眩晕判定
          if (p.stun && e.alive) {
            e.buffs.stun = Math.max(e.buffs.stun || 0, p.stun);
          }

          // 破甲与易伤判定
          if (p.vuln && e.alive) {
            e.buffs.vuln = Math.max(e.buffs.vuln || 0, p.vuln);
            e.buffs.vulnT = Math.max(e.buffs.vulnT || 0, p.vulnDur || 6);
          }

          // 斩首处决判定 (非首领且生命低于阈值一击斩首)
          if (p.execute && e.alive && !e.isBoss && !e.unit.building && (e.hp / e.maxHp) <= p.execute) {
            this.executeKill(e, p.src);
          }

          // 触碰打击感：顿挫打击光芒、水墨碎屑与碰撞音效
          if (p.heroId === 'huangzhong') {
            this.effects?.slash?.(e.x, 1.4, e.z, -0.4, 0xf59e0b, 3.2, 0.25);
            this.effects?.inkBurst?.(e.x, 1.0, e.z, 14, 0xf59e0b, 1.5);
            this.scene?.screenShake?.(0.18, 0.15);
          } else if (p.heroId === 'liguang') {
            this.effects?.dust?.(e.x, 1.2, e.z, 4, 0xd97706);
            this.effects?.slash?.(e.x, 1.2, e.z, 0.35, 0xd97706, 1.8, 0.2);
          }
        }
      }

      // 2. 箭头推进至敌方大本营判定
      if (!p.hitBase && p.currentX >= ENEMY_BASE_X - 1.2) {
        p.hitBase = true;
        this.damageEnemyBase(p.damage, p);
      }

      // 3. 飞行超出射程、超时或飞出屏幕后注销自毁
      if (p.currentX - p.startX >= p.maxRange || p.life <= 0 || p.currentX > ENEMY_BASE_X + 2.0) {
        this.heroArrowProjectiles.splice(i, 1);
      }
    }
  },

  updateProjectiles(dt) {
    this.updateHeroArrowProjectiles(dt);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.lob) {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        const x = THREE.MathUtils.lerp(p.start.x, p.endX, k);
        const z = THREE.MathUtils.lerp(p.start.z, p.endZ, k);
        const y = p.start.y + Math.sin(k * Math.PI) * p.arc - k * p.start.y;
        p.mesh.position.set(x, y, z);
        p.mesh.rotation.x += dt * 8;
        if (k >= 1) {
          if (p.isBaseAttack) {
            this.attackBase(p.source);
            if (this.effects) {
              this.effects.dust(p.endX, 0, 6, 2.2);
              this.effects.ring(p.endX, p.endZ, 0x9a8a6a, 0.4, 2.8, 0.5, 0.6);
            }
          } else {
            let directTarget = p.target && p.target.alive ? p.target : null;
            if (!directTarget && p.side === 'enemy' && this.isHeroAlive && this.isHeroAlive()) {
              if (Math.hypot(this.heroX - p.endX, ((this.heroZ || 0) - p.endZ) * 1.4) <= 1.25) {
                directTarget = this.getHeroTargetObj();
              }
            }
            this.projectileHit(p, directTarget || { x: p.endX, z: p.endZ, alive: false, armor: 0, buffs: {} });
          }
          this.scene.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
        continue;
      }
      if (p.target && p.target.alive) p.targetLast.set(p.target.x, 1.0, p.target.z);
      const dir = new THREE.Vector3().subVectors(p.targetLast, p.mesh.position);
      const dist = dir.length();
      if (dist < 0.35) {
        if (p.isBaseAttack) {
          this.attackBase(p.source);
          if (this.effects) {
            this.effects.dust(p.targetLast.x, 0, 4, 1.4);
          }
          this.scene.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
        this.projectileHit(p, p.target);
        if (p.pierce > 1 && p.canPierce) {
          p.pierce--;
          p.target = null;
          // 继续向前
          p.targetLast.x += p.side === 'player' ? 2.5 : -2.5;
        } else {
          this.scene.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        dir.normalize();
        p.mesh.position.addScaledVector(dir, p.speed * dt);
        if (p.type !== 'stone' && p.type !== 'oil') {
          p.mesh.lookAt(p.targetLast.x, p.targetLast.y, p.targetLast.z);
        }
        p.mesh.rotation.z += dt * 6;
      }
      // 穿透矛/穿云弩的次级命中
      if (p.canPierce && p.pierce > 0) {
        for (const o of this.entities) {
          if (!o.alive || o.side === p.side || p.hit.includes(o.uid)) continue;
          if (Math.abs(o.x - p.mesh.position.x) < 0.6) {
            p.hit.push(o.uid);
            this.applyDamage(o, p.damage, p.source, { projectile: true });
            if (p.pierce-- <= 0) { this.scene.scene.remove(p.mesh); this.projectiles.splice(i, 1); break; }
          }
        }
        if (p.side === 'enemy' && this.isHeroAlive && this.isHeroAlive() && !p.hit.includes('hero_zhaoyun')) {
          if (Math.abs(this.heroX - p.mesh.position.x) < 0.6 && Math.abs((this.heroZ || 0) - p.mesh.position.z) < 0.8) {
            p.hit.push('hero_zhaoyun');
            this.applyDamage(this.getHeroTargetObj(), p.damage, p.source, { projectile: true });
            if (p.pierce-- <= 0) { this.scene.scene.remove(p.mesh); this.projectiles.splice(i, 1); }
          }
        }
      }
    }
  }
,


  projectileHit(p, target) {
    if (target && target.alive && target.uid) p.hit.push(target.uid);
    if (p.splash > 0) {
      for (const o of this.entities) {
        if (!o.alive || o.side === p.side) continue;
        const sDx = o.x - p.targetLast.x;
        const sDz = (o.z - p.targetLast.z) * 1.4;
        if (sDx * sDx + sDz * sDz <= p.splash * p.splash) {
          let dmg = o === target ? p.damage : p.damage * (p.splashMul ?? 0.7);
          if (p.buildingBonus && o.kind === 'building') dmg *= p.buildingBonus;
          this.applyDamage(o, dmg, p.source, { projectile: true, armorPierce: p.armorPierce });
        }
      }
      if (p.side === 'enemy' && this.isHeroAlive && this.isHeroAlive()) {
        const hDx = this.heroX - p.targetLast.x;
        const hDz = ((this.heroZ || 0) - p.targetLast.z) * 1.4;
        if (hDx * hDx + hDz * hDz <= p.splash * p.splash) {
          const heroObj = this.getHeroTargetObj();
          let dmg = (target && target.isHero) ? p.damage : p.damage * (p.splashMul ?? 0.7);
          this.applyDamage(heroObj, dmg, p.source, { projectile: true, armorPierce: p.armorPierce });
        }
      }
      this.effects.ring(p.targetLast.x, p.targetLast.z, 0x9a8a6a, 0.3, 1.8, 0.4, 0.5);
      // 半仙符火：范围内烙下魂印（被烙印敌军阵亡后化为我方僵尸）
      if (p.source && p.source.unit && p.source.unit.special === 'necro') {
        const markDur = p.source.unit.fx?.markDur ?? 5;
        for (const o of this.entities) {
          if (!o.alive || o.side === p.side) continue;
          const mDx = o.x - p.targetLast.x;
          const mDz = (o.z - p.targetLast.z) * 1.4;
          if (mDx * mDx + mDz * mDz <= p.splash * p.splash) {
            o.buffs.mark = Math.max(o.buffs.mark || 0, markDur);
            if (this.effects) this.effects.ring(o.x, o.z, 0x3f4a5a, 0.22, 1.05, 0.45, 0.6);
          }
        }
      }
    } else if (target && target.alive) {
      let dmg = p.damage;
      if (p.buildingBonus && target.kind === 'building') dmg *= p.buildingBonus;
      this.applyDamage(target, dmg, p.source, { projectile: true, armorPierce: p.armorPierce });
      if (p.slow && target.alive) {
        target.buffs.slow = Math.max(target.buffs.slow, 2.0);
        target.buffs.slowFactor = Math.max(target.buffs.slowFactor, p.slow);
        this.effects.ring(target.x, target.z, 0x5a6a8a, 0.2, 0.9, 0.3, 0.5);
      }
      // 谋士符咒命中：触发削弱攻击负面效果
      if (p.source && p.source.unit && p.source.unit.special === 'debuff' && target.alive) {
        const dfx = p.source.unit.fx || {};
        target.buffs.atkDebuff = 1 - (dfx.atkDown ?? 0.25);
        target.buffs.atkDebuffTime = dfx.debuffDur ?? 5;
        this.effects.ring(target.x, target.z, 0x5a6a8a, 0.3, 1.2, 0.4, 0.5);
      }
      if (p.source && p.source.unit && p.source.unit.special === 'slowRoot' && target.alive) {
        if (!p.source.hasRooted) {
          p.source.hasRooted = true;
          // 术士首发攻击：强力定身 3 秒！
          target.buffs.stun = Math.max(target.buffs.stun, 3.0);
          if (this.effects) {
            this.effects.ring(target.x, target.z, 0xb23a2f, 0.4, 1.8, 0.6, 0.95);
            this.effects.inkBurst(target.x, 1.0, target.z, 8, 0x5a6a8a, 1.0);
          }
        } else {
          p.source.shotCount = (p.source.shotCount || 0) + 1;
          if (p.source.shotCount % 3 === 0) {
            target.buffs.stun = Math.max(target.buffs.stun, 1.2);
            if (this.effects) this.effects.ring(target.x, target.z, 0xb23a2f, 0.3, 1.1, 0.35, 0.6);
          }
        }
      }
      if (p.source.unit.special === 'mark') {
        target.buffs.mark = 4;
      }
    }
    const hitX = p.targetLast ? p.targetLast.x : (p.endX ?? 0);
    const hitZ = p.targetLast ? p.targetLast.z : (p.endZ ?? 0);
    if (p.type === 'oil') {
      this.createFireZone(hitX, hitZ, p.side, p.source.unit);
      audio.fire();
    }
    if (p.type === 'stone') {
      this.scene.screenShake(0.16, 0.2);
      audio.explosion();
    }
    // 纸鸢火药 / 火铳硝烟爆裂演出
    if (p.type === 'powder') {
      this.scene.screenShake(0.14, 0.18);
      audio.explosion();
      this.effects.ring(hitX, hitZ, 0xd06a32, 0.5, p.splash ? p.splash : 2.0, 0.45, 0.8);
      this.effects.inkBurst(hitX, 0.7, hitZ, 10, 0x6a3a24, 1.0);
      this.effects.dust(hitX, hitZ, 6, 1.6);
    }
    this.effects.inkBurst(hitX, 1.0, hitZ, 3, 0x2a2a24, 0.7);
  }
,


  createFireZone(x, z, side, unit) {
    const fx = (unit && unit.fx) || {};
    this.fireZones.push({
      x, z, side, life: this.fireDuration, maxLife: this.fireDuration, damageAcc: 0,
      dps: (fx.fireDps ?? 20) * (this.fireDamageMul || 1), radius: fx.fireRadius ?? 1.5,
    });
    this.effects.fire(x, z, this.fireDuration);
  }
,


  updateFireZones(dt) {
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const f = this.fireZones[i];
      f.life -= dt;
      f.damageAcc += dt;
      while (f.damageAcc > 0.5) {
        f.damageAcc -= 0.5;
        for (const e of this.entities) {
          if (!e.alive || e.side === f.side) continue;
          if (Math.abs(e.x - f.x) <= (f.radius ?? 1.5)) {
            this.applyDamage(e, (f.dps ?? 20) * 0.5, { side: f.side, unit: { tags: [], special: 'none' }, auraAtk: 1, buffs: {} }, {});
          }
        }
        if (f.side === 'enemy' && this.isHeroAlive && this.isHeroAlive()) {
          const hDist = Math.hypot(this.heroX - f.x, ((this.heroZ || 0) - f.z) * 1.4);
          if (hDist <= (f.radius ?? 1.5)) {
            this.applyDamage(this.getHeroTargetObj(), (f.dps ?? 20) * 0.5, { side: f.side, unit: { tags: ['fire'], special: 'none' }, auraAtk: 1, buffs: {} }, {});
          }
        }
      }
      if (f.life <= 0) this.fireZones.splice(i, 1);
    }
  }
,


  // 死士：无视前排，直扑敌方后排远程与建筑，抵近即自爆
  updateMartyr(e, dt) {
    if (!e.alive) return;
    const foes = this.entities.filter((o) => o.alive && o.side !== e.side);
    const deep = (o) => (e.side === 'player' ? o.x : -o.x);
    const backline = foes.filter((o) => o.kind === 'building' || o.unit.building || (o.unit.tags || []).includes('ranged'));
    let target = null;
    if (backline.length) {
      target = backline.reduce((a, b) => (deep(b) > deep(a) ? b : a));
    } else if (foes.length) {
      target = foes.reduce((a, b) => (Math.abs(b.x - e.x) < Math.abs(a.x - e.x) ? b : a));
    }

    const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    if (target) {
      const dist = Math.hypot(target.x - e.x, ((target.z || 0) - e.z) * 1.2);
      if (dist <= (e.range || 1.0) + 0.3) {
        this.martyrDetonate(e, target);
        return;
      }
    }
    // 抵近敌寨即炸（与常规攻城单位的贴寨距离一致，避免卡在墙外走不到）
    if (Math.abs(baseX - e.x) <= 2.2) {
      this.martyrDetonate(e, null);
      return;
    }

    const goalX = target ? target.x : baseX;
    const goalZ = target ? (target.z || 0) : 0;
    const dir = Math.sign(goalX - e.x) || (e.side === 'player' ? 1 : -1);
    e.facing = dir;
    const spd = (e.speed || 4) * this.buffSpd(e) * this.weatherSpeed() * (this.slowMul ? this.slowMul(e) : 1);
    e.x += dir * spd * dt;
    const dz = goalZ - e.z;
    if (Math.abs(dz) > 0.15) e.z += Math.sign(dz) * Math.min(Math.abs(dz), spd * 0.6 * dt);
    e.x = Math.max(-14, Math.min(13.8, e.x));
    if (e.model) {
      e.model.group.position.set(e.x, 0, e.z);
      e.model.group.rotation.y = 0;
      const bs = Math.abs(e.baseScale || 1.12);
      e.model.group.scale.set(e.facing * bs, bs, bs);
    }
    this.moveBob(e, dt, true);
  }
,

  martyrDetonate(e, target) {
    if (!e.alive) return;
    const fx = e.unit.fx || {};
    if (target) {
      if (target.kind === 'building' || target.unit.building) {
        this.applyDamage(target, fx.buildingDamage ?? 800, e, { splash: true, ignoreArmor: true });
      } else if (target.isBoss) {
        this.applyDamage(target, fx.buildingDamage ?? 800, e, { splash: true, ignoreArmor: true });
      } else {
        // 一换一：以命换命，直接带走目标
        this.applyDamage(target, target.hp + (target.shield || 0) + 1, e, { splash: true, ignoreArmor: true, pierceShield: true });
      }
    }
    const baseX = e.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X;
    if (e.side === 'player' && Math.abs(baseX - e.x) <= 3.0) {
      this.damageEnemyBase(fx.baseDamage ?? 500, e);
    }
    this.effects.death(e.x, 1.0, e.z, 0x2a2a24, false);
    this.effects.ring(e.x, e.z, 0xd06a32, 0.4, 3.2, 0.6, 0.9);
    this.effects.inkBurst(e.x, 0.9, e.z, 12, 0x2a2a24, 1.1);
    audio.explosion();
    this.scene.screenShake(0.3, 0.28);
    this.removeEntity(e);
    this.energy = Math.min(this.energyMax, this.energy + 2);
  }
,


  explodePowderCart(e) {
    if (!e.alive) return;
    const fx = e.unit.fx || {};
    const blastRadius = fx.blastRadius ?? 2.4;
    const blastDamage = fx.blastDamage ?? 260;
    const victims = this.entities.filter((o) => o.alive && o.side !== e.side && Math.abs(o.x - e.x) <= blastRadius);
    for (const o of victims) {
      let dmg = blastDamage;
      if (o.kind === 'building') dmg *= (fx.blastBuildingMul ?? 2);
      this.applyDamage(o, dmg, e, { splash: true });
    }
    if (e.side === 'enemy' && this.isHeroAlive && this.isHeroAlive()) {
      if (Math.abs(this.heroX - e.x) <= blastRadius) {
        this.applyDamage(this.getHeroTargetObj(), blastDamage, e, { splash: true });
      }
    }
    if (e.side === 'player' && Math.abs(e.x - ENEMY_BASE_X) <= 3.0) {
      this.damageEnemyBase(fx.blastBaseDamage ?? 380, e);
    }
    this.effects.death(e.x, 1.0, e.z, 0xb23a2f, true);
    this.effects.ring(e.x, e.z, 0xd06a32, 0.4, 3.2, 0.6, 0.9);
    audio.explosion();
    this.scene.screenShake(0.3, 0.3);
    this.removeEntity(e);
    this.energy = Math.min(this.energyMax, this.energy + 2);
  }
,

  // ---------- 碰撞分离 ----------

  separateUnits() {
    const arr = this.entities.filter((e) => e.alive && !e.unit.building && !e.airForm);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i];
        const b = arr[j];
        if (a.side !== b.side) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        if (Math.abs(dx) < 0.72 && Math.abs(dz) < 0.82) {
          const overlap = 0.82 - Math.abs(dz);
          const push = (Math.sign(dz) || (Math.random() > 0.5 ? 1 : -1)) * overlap * 0.12;
          b.z += push;
          a.z -= push;
          b.z = THREE.MathUtils.clamp(b.z, -2.3, 2.3);
          a.z = THREE.MathUtils.clamp(a.z, -2.3, 2.3);
          a.model.group.position.z = a.z;
          b.model.group.position.z = b.z;
        }
      }
    }
  }
,

  // ---------- 英雄 ----------
};


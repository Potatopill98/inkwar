import * as THREE from '../../lib/three.module.js';
import { HERO_MIN, HERO_MAX, HERO_XP, PLAYER_BASE_MAX, HPBAR_BOSS_BORDER_GEO, HPBAR_BOSS_BG_GEO, HPBAR_BOSS_FILL_GEO, HPBAR_BG_MAT, HPBAR_GREEN_MAT } from './constants.js?v=1.93';
import { getUnit } from '../data/units.js?v=1.93';
import { audio } from '../audio.js?v=1.93';
import { toonMaterial, ghostMaterial } from '../models.js?v=1.93';
import { createHeroSkillAnim, updateHeroSkillPose, applyHeroIdlePose } from './hero-anims.js?v=1.93';
// 战斗 · 主将：光环威力、主动技能执行、XP、施法动作
export const battleHero = {
  heroPower() {
    const hl = this.heroLevel || 1;
    const ml = this.masteryLevel || 1;
    return (1 + 0.08 * (hl - 1)) * (1 + 0.02 * (ml - 1));
  }
,


  moveHeroTo(x) {
    const target = THREE.MathUtils.clamp(x, HERO_MIN, HERO_MAX);
    const moved = Math.abs(target - this.heroX);
    this.heroX = target;
    if (this.heroModel) this.heroModel.group.position.x = this.heroX;
    if (this.heroRangeRing) this.heroRangeRing.position.x = this.heroX;
    this.scene.setFocus(this.heroX);
    if (moved > 0.35) {
      const now = performance.now();
      if (now - this.lastHeroMoveEvent > 400) {
        this.lastHeroMoveEvent = now;
        this.event('heroMoved', { x: this.heroX });
      }
    }
  }
,


  updateHeroVisual(dt) {
    if (!this.heroModel) return;
    const g = this.heroModel.group;
    const t = performance.now() * 0.001;

    // 武道技能三段式完整驱动：起手蓄势 -> 暴击顿挫定格 -> 从容还刃
    if (this.heroSkillAnim) {
      const res = updateHeroSkillPose(this.heroModel, this.heroSkillAnim, dt);
      const lunge = this.heroSkillAnim.lungeX || 0;
      const lift = this.heroSkillAnim.liftY || 0;
      const scaleMul = this.heroSkillAnim.scaleMul || 1.0;
      const baseScale = this.heroModel.baseScale || (this.heroData.look.size || 1.1) * 1.02;

      const facing = this.heroFacing || 1;
      g.position.x = this.heroX + lunge * facing;
      g.position.y = lift;
      g.position.z = this.heroZ || 0.25;
      g.rotation.y = 0;
      g.scale.set(facing * baseScale * scaleMul, baseScale * scaleMul, baseScale * scaleMul);

      if (res.triggerSkill) {
        this.runSkill();
      }
      if (res.subImpact) {
        // 多段武道打击子拍联动（赵云7突刺、程咬金3板斧、梁红玉5雷鼓、典韦6双戟等）
        if (this.heroId === 'zhaoyun') {
          audio.spear();
          const facing = this.heroFacing || 1;
          if (this.effects) this.effects.slash(this.heroX + (lunge + 1.2) * facing, 0.95, 0, Math.random() * 0.6 - 0.3, 'jade', 1.0);
        } else if (this.heroId === 'chengyaojin') {
          audio.sword();
          if (this.effects) {
            this.effects.dust(this.heroX + lunge + 0.8, 0, 4, 1.2);
            this.effects.slash(this.heroX + lunge + 0.8, 0.8, 0, -0.4, 'red', 1.2);
          }
        } else if (this.heroId === 'lianghongyu') {
          audio.gong(null, 0.6);
          if (this.effects) this.effects.ring(this.heroX + lunge + 0.6, 0, 0xd06a32, 0.3, 2.5 + res.subImpact.beat * 0.8, 0.3, 0.6);
        } else if (this.heroId === 'dianwei') {
          audio.sword();
          if (this.effects) this.effects.slash(this.heroX + lunge + 0.8, 0.9, 0, Math.random() * 1.0 - 0.5, 'red', 1.1);
        }
      }
      if (res.finished) {
        this.heroSkillAnim = null;
        this.pendingSkill = null;
        g.position.set(this.heroX, 0, this.heroZ || 0.25);
        const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
        g.scale.set((this.heroFacing || 1) * bScale, bScale, bScale);
      }
    } else {
      g.position.set(this.heroX, 0, this.heroZ);
      g.rotation.y = 0;
      const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
      g.scale.set((this.heroFacing || 1) * bScale, bScale, bScale);

      if (this.heroRespawnTimer > 0) {
        // 全英雄阵亡英灵战跪/调息姿态保持（保持原色实体不透明）
        if (this.heroModel.body) {
          this.heroModel.body.position.y = -0.32;
          this.heroModel.body.rotation.x = 0.45;
        }
        if (this.heroModel.weaponPivot) {
          this.heroModel.weaponPivot.position.y = 0.35;
          this.heroModel.weaponPivot.rotation.z = -1.45;
        }
      } else if (this.heroTripleThrust || this.heroAttackAnim > 0) {
        // 优先驱动第 4 击连续三枪专属武道动作
        if (this.heroTripleThrust) {
          const tt = this.heroTripleThrust;
          tt.timer += dt;
          const durPerThrust = tt.totalDuration / 3;
          const currentIdx = Math.min(2, Math.floor(tt.timer / durPerThrust));
          const subProgress = (tt.timer - currentIdx * durPerThrust) / durPerThrust;
          const thrust = Math.sin(subProgress * Math.PI);

          if (this.heroModel.body) {
            this.heroModel.body.position.x = thrust * 0.26;
            this.heroModel.body.rotation.z = thrust * 0.14;
          }
          if (this.heroModel.weaponPivot) {
            this.heroModel.weaponPivot.rotation.z = -1.57;
            this.heroModel.weaponPivot.position.x = 0.33 * 1.30 + thrust * 0.70;
            this.heroModel.weaponPivot.position.y = 1.15 + (currentIdx === 1 ? 0.14 : (currentIdx === 2 ? -0.08 : 0));
          }

          // 三段枪刺逐段判定点（约 0.10s, 0.32s, 0.53s）
          const hitThresholds = [0.10, durPerThrust + 0.10, durPerThrust * 2 + 0.10];
          for (let h = 0; h < 3; h++) {
            if (tt.hitsDone === h && tt.timer >= hitThresholds[h]) {
              tt.hitsDone = h + 1;
              let tgt = tt.target;
              if (!tgt || !tgt.alive) {
                tgt = this.entities.find(e => e.alive && e.side === 'enemy' && Math.hypot(e.x - this.heroX, ((e.z || 0) - this.heroZ) * 1.4) <= (this.heroRange || 2.2));
                tt.target = tgt;
              }
              if (tgt && tgt.alive) {
                const isLast = (h === 2);
                const dmg = isLast ? this.heroAtk * 1.4 : this.heroAtk * 0.85;
                const opts = isLast ? { isCrit: true } : {};
                if (isLast && tgt.buffs) {
                  tgt.buffs.stun = Math.max(tgt.buffs.stun || 0, 0.35);
                }
                this.applyDamage(tgt, dmg, this.getHeroTargetObj(), opts);
                // 荒野乱斗大招充能机制：每次攻击命中提供 5% 充能（大招期间攻击不算充能）
                if (!this.heroSkillAnim && (this.heroSuperCharge || 0) < 100) {
                  this.heroSuperCharge = Math.min(100, (this.heroSuperCharge || 0) + 5);
                }
                // 荒野乱斗专属被动【一身是胆】（3级解锁）：破阵三连戳伤害 30% 转化为吸血治疗
                if (this.isPassiveUnlocked && this.isPassiveUnlocked() && dmg > 0) {
                  const heal = dmg * 0.30;
                  this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heal);
                  if (this.effects) this.effects.heal(this.heroX, 1.2, this.heroZ);
                }
                audio.spear();
                if (this.effects) {
                  const sx = (this.heroX + tgt.x) / 2;
                  const angle = h === 0 ? 0.35 : (h === 1 ? -0.35 : 0.0);
                  const slashSize = isLast ? 1.4 : 1.0;
                  this.effects.slash(sx, 1.2 + (h - 1) * 0.18, tgt.z || 0, angle, 'jade', slashSize);
                  if (isLast) {
                    this.effects.inkBurst(tgt.x, 1.2, tgt.z || 0, 10, 0x7fb3a5, 1.2);
                    this.scene.screenShake(0.14, 0.18);
                  }
                }
              } else {
                audio.spear();
              }
            }
          }

          if (tt.timer >= tt.totalDuration) {
            this.heroTripleThrust = null;
            this.addHeroInBattleXp(2);
          }
        } else {
          // 通用普攻动作：根据英雄武器形态呈现不同武道动势
          this.heroAttackAnim = Math.max(0, this.heroAttackAnim - dt);
          const p = 1 - (this.heroAttackAnim / 0.35);
          const action = Math.sin(p * Math.PI);
          const weapon = this.heroData?.look?.weapon || 'sword';

          if (weapon === 'spear') {
            // 枪矛：直刺突击
            if (this.heroModel.body) {
              this.heroModel.body.position.x = action * 0.18;
              this.heroModel.body.rotation.z = action * 0.10;
            }
            if (this.heroModel.weaponPivot) {
              this.heroModel.weaponPivot.rotation.z = -1.57;
              this.heroModel.weaponPivot.position.x = 0.33 * 1.30 + action * 0.55;
            }
          } else if (weapon === 'glaive' || weapon === 'halberd') {
            // 大刀/画戟：大开大合破空重力劈扫
            if (this.heroModel.body) {
              this.heroModel.body.position.x = action * 0.15;
              this.heroModel.body.rotation.z = -action * 0.25;
            }
            if (this.heroModel.weaponPivot) {
              this.heroModel.weaponPivot.rotation.z = -0.50 - action * 2.20;
              this.heroModel.weaponPivot.position.x = 0.25 + action * 0.35;
            }
          } else if (weapon === 'fan' || weapon === 'staff') {
            // 羽扇/法杖：凌虚引法挥毫
            if (this.heroModel.body) {
              this.heroModel.body.position.y = action * 0.12;
            }
            if (this.heroModel.weaponPivot) {
              this.heroModel.weaponPivot.rotation.z = -0.60 - action * 0.85;
              this.heroModel.weaponPivot.position.y = 1.15 + action * 0.20;
            }
          } else {
            // 剑/短兵：迅捷回转疾斩
            if (this.heroModel.body) {
              this.heroModel.body.position.x = action * 0.12;
              this.heroModel.body.rotation.z = action * 0.18;
            }
            if (this.heroModel.weaponPivot) {
              this.heroModel.weaponPivot.rotation.z = -1.10 + action * 1.75;
              this.heroModel.weaponPivot.position.x = 0.25 + action * 0.25;
            }
          }
        }
      } else if (this.heroMovingToRally || this.heroMovingToTarget) {
        // 全英雄通用奔跑动势：腿部与身躯起伏、武器随动
        if (this.heroModel.body) {
          this.heroModel.body.position.y = Math.abs(Math.sin(t * 14)) * 0.12;
          this.heroModel.body.rotation.z = Math.sin(t * 14) * 0.08;
        }
        if (this.heroModel.weaponPivot) {
          this.heroModel.weaponPivot.rotation.z = -0.45 + Math.sin(t * 14) * 0.22;
        }
      } else {
        applyHeroIdlePose(this.heroModel, t, dt);
        // 术法卡施法微动（抬手引符）
        if (this.heroModel.weaponPivot && this.spellCastT > 0) {
          this.heroModel.weaponPivot.rotation.z += (-0.95 - this.heroModel.weaponPivot.rotation.z) * Math.min(1, dt * 10);
        }
      }
    }

    if (this.heroRangeRing) {
      this.heroRangeRing.material.opacity = this.dragging ? 0.22 : 0.08 + Math.sin(t * 1.3) * 0.02;
    }
  }
,

  // ---------- 英雄专属技能与主动大招（荒野乱斗体系） ----------

  heroUseGadget() {
    if (this.state !== 'running' || this.paused) return false;
    if (this.isHeroAlive && !this.isHeroAlive()) {
      audio.error();
      this.ui.toast('主将力竭蓄势中，暂无法使用技能');
      return false;
    }
    if (this.isGadgetUnlocked && !this.isGadgetUnlocked()) {
      audio.error();
      this.ui.toast('专属技能将在 7 级解锁');
      return false;
    }
    if ((this.heroGadgetCd || 0) > 0) {
      audio.error();
      this.ui.toast(`技能冷却中 (${Math.ceil(this.heroGadgetCd)}s)`);
      return false;
    }

    const heroId = this.heroId || 'zhaoyun';
    const gadget = this.heroData?.gadget || {};
    const baseGadgetCd = Number(this.heroGadgetCooldown) || Number(gadget.cooldown) || 20.0;
    this.heroGadgetCd = (this.isEndless && this.endlessBuffs?.heroCdReduction) ? Math.max(5.0, baseGadgetCd * (1 - this.endlessBuffs.heroCdReduction)) : baseGadgetCd;

    // 解除自身被阻挡状态并冲散包围
    if (this.heroBlockedFoes) {
      for (const foe of this.heroBlockedFoes) {
        foe.heroBlockedBy = null;
      }
      this.heroBlockedFoes.clear();
    }

    const facing = this.heroFacing || 1;
    const heroX = this.heroX;
    const heroZ = this.heroZ || 0;

    switch (heroId) {
      case 'zhaoyun': {
        this.heroGadgetSpeedBuff = 3.0; // 3 秒内移速提升 60%
        this.heroCombos = 3; // 下一次普攻直接触发第 4 击破阵三连戳！
        audio.drum(null, true, 0.8);
        audio.gong(null, 1.35);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0x10b981, 1.2, 5.5, 0.9, 0.95);
          if (this.effects.inkBurst) this.effects.inkBurst(heroX, 1.2, heroZ, 24, 0x34d399, 2.4);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 12, 2.2);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.24, 0.28);
        if (this.ui?.flash) this.ui.flash('skill');
        const radius = 3.5, kb = 2.2;
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const dist = Math.hypot(e.x - heroX, ((e.z || 0) - heroZ) * 1.35);
              if (dist <= radius) {
                const dir = (e.x >= heroX ? 1 : -1);
                e.x = Math.max(-11.5, Math.min(11.5, e.x + dir * kb));
                if (e.buffs) {
                  e.buffs.slow = Math.max(e.buffs.slow || 0, 0.50);
                  e.buffs.slowDur = Math.max(e.buffs.slowDur || 0, 3.0);
                  e.buffs.vuln = Math.max(e.buffs.vuln || 0, 0.30);
                  e.buffs.vulnDur = Math.max(e.buffs.vulnDur || 0, 3.0);
                }
                if (this.effects) this.effects.slash(e.x, 1.1, e.z || 0, 0, 'jade', 1.3);
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 龙威断喝', '暴喝震退四方敌军！解除围困并蓄满破阵枪势！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'hanxin': {
        this.energy = Math.min(this.energyMax, (this.energy || 0) + 10);
        this.heroGadgetSpeedBuff = 4.0;
        audio.drum(null, true, 0.9);
        audio.gong(null, 1.5);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0x3a5a7a, 1.5, 6.0, 1.0, 0.95);
          if (this.effects.inkBurst) this.effects.inkBurst(heroX, 1.2, heroZ, 20, 0x60a5fa, 2.2);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 10, 2.0);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'player') {
              if (e.buffs) {
                e.buffs.slow = 0;
                e.buffs.slowDur = 0;
                e.buffs.stun = 0;
              }
              if (Math.hypot(e.x - heroX, (e.z || 0) - heroZ) <= 4.5) {
                if (!e.buffs) e.buffs = {};
                e.buffs.crit = 1.0;
                e.buffs.critDur = 4.0;
                e.buffs.speedBoost = 0.50;
                e.buffs.speedDur = 4.0;
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 背水一击', '临危受命恢复 10 点军令！解除全军负面效果，激发背水决死暴击！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'guanyu': {
        this.heroX = Math.max(-12.5, Math.min(10.0, heroX - 2.0 * facing));
        this.guanyuStacks = 2;
        audio.sword();
        audio.drum(null, true, 0.85);
        audio.skill();
        if (this.effects) {
          if (this.effects.slash) {
            this.effects.slash(this.heroX, 1.2, heroZ, 0.4, 'glaive', 1.8);
            this.effects.slash(this.heroX, 1.2, heroZ, -0.4, 'glaive', 1.8);
          }
          if (this.effects.dust) this.effects.dust(this.heroX, heroZ, 14, 2.5);
          if (this.effects.ring) this.effects.ring(this.heroX, 0.3, 0x3f8a5a, 1.2, 5.0, 0.8, 0.95);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.28, 0.30);
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const dist = Math.hypot(e.x - this.heroX, ((e.z || 0) - heroZ) * 1.3);
              if (dist <= 4.0) {
                this.applyDamage(e, 380, this.getHeroTargetObj(), { isCrit: true });
                if (e.buffs) {
                  e.buffs.blind = 3.0;
                  e.buffs.stun = Math.max(e.buffs.stun || 0, 0.8);
                }
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 拖刀回斩', '青龙偃月回马一刀！横扫身周致盲敌军，刀意拉满蓄势待斩！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'zhugeliang': {
        audio.gong(null, 1.25);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX + facing * 2.0, 0.3, 0x8a8478, 1.5, 7.0, 1.0, 0.95);
          if (this.effects.inkBurst) this.effects.inkBurst(heroX + facing * 2.5, 1.2, heroZ, 22, 0xd8d8d8, 2.5);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.22, 0.25);
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const dx = (e.x - heroX) * facing;
              const dz = Math.abs((e.z || 0) - heroZ);
              if (dx >= -0.5 && dx <= 8.0 && dz <= 3.2) {
                e.x = Math.max(-11.5, Math.min(11.5, e.x + facing * 4.5));
                if (e.buffs) e.buffs.stun = Math.max(e.buffs.stun || 0, 1.5);
              }
            } else if (e.alive && e.side === 'player') {
              if (!e.buffs) e.buffs = {};
              e.buffs.speedBoost = 0.30;
              e.buffs.speedDur = 5.0;
            }
          }
        }
        this.ui.showBattleBanner('技能 · 东风狂岚', '羽扇纶巾借得天风！狂岚推开全线敌军，全军踏风疾行！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'lvbu': {
        audio.bow();
        audio.drum(null, true, 1.0);
        audio.skill();
        if (this.effects) {
          if (this.effects.slash) this.effects.slash(heroX + facing * 4.0, 1.2, heroZ, 0, 'red', 2.5);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 12, 2.2);
          if (this.effects.inkBurst) this.effects.inkBurst(heroX + facing * 3.0, 1.2, heroZ, 20, 0xb23a2f, 2.2);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.32, 0.35);
        if (this.ui?.flash) this.ui.flash('skill');
        this.heroGadgetSpeedBuff = 5.0;
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const dx = (e.x - heroX) * facing;
              if (dx >= 0 && Math.abs((e.z || 0) - heroZ) <= 2.2) {
                this.applyDamage(e, 520, this.getHeroTargetObj(), { isCrit: true });
                if (e.buffs) e.buffs.stun = Math.max(e.buffs.stun || 0, 2.0);
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 辕门射戟', '百步穿杨惊破万军！重戟穿线贯穿眩晕敌寇，温侯狂暴嗜血！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'libai': {
        this.heroX = Math.max(-12.0, Math.min(11.0, heroX + facing * 4.5));
        audio.sword();
        audio.skill();
        if (this.effects) {
          if (this.effects.slash) {
            this.effects.slash(heroX + facing * 2.2, 1.2, heroZ, 0, 'jade', 2.0);
            this.effects.slash(this.heroX, 1.2, heroZ, 0.35, 'jade', 1.4);
          }
          if (this.effects.inkBurst) this.effects.inkBurst(this.heroX, 1.2, heroZ, 18, 0xd8dce8, 2.0);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        this.heroGadgetSpeedBuff = 3.0;
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const minX = Math.min(heroX, this.heroX) - 1.0;
              const maxX = Math.max(heroX, this.heroX) + 1.0;
              if (e.x >= minX && e.x <= maxX && Math.abs((e.z || 0) - heroZ) <= 2.0) {
                this.applyDamage(e, 350, this.getHeroTargetObj(), { isCrit: true });
                if (e.buffs) {
                  e.buffs.slow = Math.max(e.buffs.slow || 0, 0.95);
                  e.buffs.slowDur = Math.max(e.buffs.slowDur || 0, 1.5);
                }
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 将进酒', '十步一人剑影横空！瞬步贯通定身强敌，化作醉仙剑影！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'sunwu': {
        this.heroStealthT = 3.5;
        audio.gong(null, 0.9);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0x7a9a7a, 1.2, 6.0, 0.8, 0.95);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 14, 2.2);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'player' && Math.hypot(e.x - heroX, (e.z || 0) - heroZ) <= 6.0) {
              if (!e.buffs) e.buffs = {};
              e.buffs.dmgReduction = Math.max(e.buffs.dmgReduction || 0, 0.40);
              e.buffs.dmgRedDur = Math.max(e.buffs.dmgRedDur || 0, 4.0);
            }
          }
        }
        this.ui.showBattleBanner('技能 · 其徐如林', '兵圣阵图隐匿敛息！主将伏击蓄势，全军不动如山免伤坚守！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'weiqing': {
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + this.heroMaxHp * 0.15);
        audio.drum(null, true, 0.9);
        audio.gong(null, 1.4);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0x4b7a6a, 1.2, 6.5, 0.9, 0.95);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 12, 2.0);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'player') {
              const shieldVal = Math.round((e.maxHp || e.hp || 300) * 0.25);
              e.shield = Math.max(e.shield || 0, shieldVal);
              e.shieldDur = Math.max(e.shieldDur || 0, 5.0);
              if (this.effects) this.effects.heal(e.x, 1.1, e.z || 0);
            }
          }
        }
        this.ui.showBattleBanner('技能 · 整军备战', '大将军挥旗号令全军！三军将士金戈坚甲护体，御敌当关！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'huoqubing': {
        this.heroX = Math.max(-12.0, Math.min(11.0, heroX + facing * 5.0));
        this.heroChargeT = 2.0;
        audio.spear();
        audio.drum(null, true, 1.1);
        audio.skill();
        if (this.effects) {
          if (this.effects.slash) this.effects.slash(heroX + facing * 2.5, 1.2, heroZ, 0, 'gold', 2.2);
          if (this.effects.dust) this.effects.dust(this.heroX, heroZ, 16, 2.5);
          if (this.effects.inkBurst) this.effects.inkBurst(this.heroX, 1.2, heroZ, 20, 0xc9a25e, 2.2);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.30, 0.32);
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const minX = Math.min(heroX, this.heroX) - 1.0;
              const maxX = Math.max(heroX, this.heroX) + 1.0;
              if (e.x >= minX && e.x <= maxX && Math.abs((e.z || 0) - heroZ) <= 2.2) {
                this.applyDamage(e, 300, this.getHeroTargetObj(), { isCrit: true });
                e.x = Math.max(-11.5, Math.min(11.5, e.x + facing * 2.5));
                if (e.buffs) e.buffs.stun = Math.max(e.buffs.stun || 0, 1.0);
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 长驱直入', '骠骑铁蹄狂飙贯敌！冲锋践踏破阵，三倍毁灭暴击蓄满！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'wuzetian': {
        this.energyRegenBonus = (this.energyRegenBonus || 0) + 1.0;
        setTimeout(() => { this.energyRegenBonus = Math.max(0, (this.energyRegenBonus || 0) - 1.0); }, 6000);
        audio.gong(null, 1.6);
        audio.skill();
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0xd8b25a, 1.2, 7.0, 1.0, 0.95);
          if (this.effects.inkBurst) this.effects.inkBurst(heroX, 1.2, heroZ, 24, 0xd8b25a, 2.5);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              if (!e.buffs) e.buffs = {};
              e.buffs.atkDown = Math.max(e.buffs.atkDown || 0, 0.35);
              e.buffs.atkDownDur = Math.max(e.buffs.atkDownDur || 0, 4.0);
            }
          }
        }
        this.ui.showBattleBanner('技能 · 天授神权', '女皇天威浩荡！全场军令极速恢复，天威压迫削弱敌军三成攻势！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'mengtian': {
        audio.bow();
        audio.drum(null, true, 0.9);
        audio.skill();
        if (this.effects) {
          if (this.effects.slash) this.effects.slash(heroX + facing * 2.5, 1.2, heroZ, 0, 'dust', 2.0);
          if (this.effects.dust) this.effects.dust(heroX, heroZ, 14, 2.2);
        }
        if (this.scene?.screenShake) this.scene.screenShake(0.25, 0.28);
        if (this.ui?.flash) this.ui.flash('skill');
        this.heroDamageReduction = 0.30;
        setTimeout(() => { this.heroDamageReduction = 0; }, 6000);
        if (this.entities) {
          for (const e of this.entities) {
            if (e.alive && e.side === 'enemy') {
              const dx = (e.x - heroX) * facing;
              if (dx >= 0 && dx <= 7.0 && Math.abs((e.z || 0) - heroZ) <= 3.0) {
                this.applyDamage(e, 320, this.getHeroTargetObj(), { isCrit: true });
                e.x = Math.max(-11.5, Math.min(11.5, e.x + facing * 3.5));
                if (e.buffs) {
                  e.buffs.bleed = 40;
                  e.buffs.bleedDur = 4.0;
                }
              }
            }
          }
        }
        this.ui.showBattleBanner('技能 · 秦弩重阵', '大秦重弩齐射！穿甲重矢破阵退敌，长城将军横槊固若金汤！(冷却 20s · 不限次数)', 2200);
        break;
      }
      case 'diaochan': {
        audio.gong(null, 1.0);
        audio.skill();
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + this.heroMaxHp * 0.35);
        if (this.effects) {
          if (this.effects.ring) this.effects.ring(heroX, 0.3, 0xe0d8e8, 1.2, 5.5, 0.8, 0.95);
          if (this.effects.heal) this.effects.heal(heroX, 1.2, heroZ);
        }
        if (this.ui?.flash) this.ui.flash('skill');
        if (this.entities) {
          const targets = this.entities.filter(e => e.alive && e.side === 'player').sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp)).slice(0, 3);
          for (const t of targets) {
            t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.35);
            if (!t.buffs) t.buffs = {};
            t.buffs.regen = Math.max(t.buffs.regen || 0, 0.03);
            t.buffs.regenDur = Math.max(t.buffs.regenDur || 0, 4.0);
            if (this.effects) this.effects.heal(t.x, 1.1, t.z || 0);
          }
        }
        this.ui.showBattleBanner('技能 · 红袖添香', '流云水袖飞燕起舞！甘霖回春急救伤卒，全军生机焕发！(冷却 20s · 不限次数)', 2200);
        break;
      }
      default: {
        this.heroGadgetSpeedBuff = 3.0;
        audio.skill();
        if (this.ui?.flash) this.ui.flash('skill');
        this.ui.showBattleBanner(`技能 · ${gadget.name || '专属技能'}`, gadget.desc || '施展主将专属技能！(冷却 20s · 不限次数)', 2200);
        break;
      }
    }

    if (this.onBountyEvent) this.onBountyEvent('hero_gadget', 1);
    return true;
  },

  useActive() {
    if (this.state !== 'running' || this.paused) return;
    if (this.isHeroAlive && !this.isHeroAlive()) {
      audio.error();
      this.ui.toast('主将力竭蓄势中，暂无法施展大招');
      return;
    }
    // 荒野乱斗大招机制：开局不可用，需攻击充能至 100%
    if ((this.heroSuperCharge || 0) < 100) {
      audio.error();
      this.ui.toast(`大招充能中 (${Math.floor(this.heroSuperCharge || 0)}%/100%)，请持续攻击充能`);
      return;
    }
    // 50s 冷却校验：充能完且冷却结束方可释放
    if ((this.skillCd || 0) > 0 || this.pendingSkill) {
      audio.error();
      this.ui.toast(`大招冷却中 (${Math.ceil(this.skillCd)}s)`);
      return;
    }
    const active = this.heroData.active;
    let cd = Number(this.heroSuperCooldown) || Number(active.cooldown) || 50.0;
    if (this.isEndless && this.endlessBuffs?.heroCdReduction) {
      cd = Math.max(10.0, cd * (1 - this.endlessBuffs.heroCdReduction));
    }
    this.skillCd = cd;
    this.heroSuperCharge = 0; // 释放大招后充能归零，50s 冷却期间可继续攻击充能
    this.heroSkillAnim = createHeroSkillAnim(this.heroData);
    this.pendingSkill = this.heroSkillAnim;
    this.ui.flash('skill');
    audio.skill();
    this.event('skillUsed', { hero: this.heroId });
    if (this.onBountyEvent) this.onBountyEvent('hero_super', 1);
    audio.vibrate(18);
  },

  // 起手式结束，正式释放

  runSkill() {
    if (this.isHeroAlive && !this.isHeroAlive()) return;
    const active = this.heroData.active;
    const power = this.heroPower();
    const theme = (active.fx && active.fx.color) || this.heroData.theme || 0x4b7a6a;
    // 战意墨环扩散至全屏，伴随顿挫强震与墨浪爆发
    this.effects.ring(this.heroX, 0.3, theme, 0.8, 6.5, 0.9, 0.9);
    this.effects.inkBurst(this.heroX + 0.8, 1.2, 0, 16, theme, 1.8);
    this.scene.screenShake(0.18, 0.28);
    this.playSkillFx(active, theme);

    // 孙武技能：全军隐匿半透明 4.5 秒 (#6)
    // 隐匿期间敌军无法发现，士兵可正常移动与攻击，造成伤害或受到攻击时现出原形
    if (this.heroId === 'sunwu') {
      this.sunwuStealthT = 4.5;
      const allies = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building);
      for (const e of allies) {
        e.stealth = 4.5;
        e._stealthApplied = false;
        if (this.effects) {
          this.effects.inkBurst(e.x, 0.5, e.z || 0, 6, 0x334155, 0.6);
        }
      }
    }

    // 卫青技能：近战与骑兵友军体型显著放大 1.6 倍，附带大将军汉金光环，持续 9 秒 (#14)
    if (this.heroId === 'weiqing') {
      this.weiqingBuffT = 9.0;
      const allies = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building);
      for (const e of allies) {
        const isMelee = (e.unit.tags?.includes('melee') || e.unit.tags?.includes('cavalry') || e.unit.tags?.includes('anticav') || e.unit.role === '近战' || e.unit.role === '骑兵');
        if (isMelee) {
          e.giantT = 9.0;
          e.giantScale = 1.6;
          if (this.effects) {
            this.effects.ring(e.x, e.z || 0, 0xf59e0b, 0.4, 2.2, 0.5, 0.85);
            this.effects.inkBurst(e.x, 0.6, e.z || 0, 10, 0xf59e0b, 0.9);
          }
        }
      }
    }

    // 针对飞行/下坠类技能延迟伤害生效，确保弹道/重鼎命中敌军时才结算伤害 (#10)
    // 针对下坠重击类技能延迟伤害生效，确保神鼎/战镰/巨刀落地瞬间才结算伤害 (#10)
    // 射箭将领（黄忠、李广）已重构为真实物理弹道碰撞系统，箭矢触碰敌人时才结算伤害！
    // 所有多段及天降延迟结算已统一交由 updateDelayedStrikes 在游戏循环内部帧级结算
    for (const fx of active.effects) this.runSkillEffect(fx, power, theme);
    if (active.banner) this.ui.showBattleBanner(active.banner[0], active.banner[1], 1500);
  }
,

  // 主题演出特效（#6：按英雄主题色定制形状与规模）

  playSkillFx(active, theme) {
    const type = active.fx ? active.fx.type : 'ring';
    const hx = this.heroX;
    if (typeof this.effects[type] === 'function') {
      this.effects[type](hx, 0, theme, this.heroFacing || 1);
    } else if (type === 'giantSlash') {
      this.effects.giantSlash(hx + 2.8, 1.7, 0, -0.45, theme, 6.4, 0.55);
      this.effects.inkBurst(hx + 1.5, 1.2, 0, 10, theme, 1.4);
    } else if (type === 'sunWheel') {
      this.effects.sunWheel(hx + 1.6, 2.6, 0, theme);
    } else if (type === 'pillar') {
      this.effects.pillar(hx, 0.25, theme, 5);
    } else if (type === 'fireField') {
      this.effects.fireField(hx + 4, 0, 8, 3, 4, theme, 0xb23a2f);
    } else {
      this.effects.ring(hx, 0.25, theme, 0.8, 5.5, 0.9, 0.7);
    }
  },


  skillDamageSource() {
    return { side: 'player', unit: { tags: [], special: 'none' }, auraAtk: 1, buffs: {} };
  }
,


  // 处决：无视护盾与减伤，直接结算死亡（技能与处决光环共用）
  executeKill(target, src) {
    if (!target || !target.alive) return;
    this.effects.ring(target.x, target.z, 0xb23a2f, 0.3, 1.8, 0.45, 0.9);
    this.effects.inkBurst(target.x, 1.0, target.z, 10, 0xc9a25e, 1.2);
    audio.explosion();
    this.killEntity(target, src);
  }
,


  // 恐惧：向后退并短时间减速（首领/建筑免疫）
  applyFear(e, dist, dur) {
    if (!e || !e.alive || e.isBoss || e.kind === 'building' || e.unit.building) return;
    const back = e.side === 'player' ? -1 : 1;
    e.x = Math.max(-14, Math.min(13.2, e.x + back * dist));
    if (e.model) e.model.group.position.x = e.x;
    e.buffs.slow = Math.max(e.buffs.slow, dur);
    e.buffs.slowFactor = Math.max(e.buffs.slowFactor, 0.30);
  }
,


  runSkillEffect(fx, power, theme) {
    const allies = this.entities.filter((e) => e.alive && e.side === 'player');
    const enemies = this.entities.filter((e) => e.alive && e.side === 'enemy');
    const src = this.skillDamageSource();
    switch (fx.template) {
      case 'vacuumPull': {
        const cx = fx.centerX !== undefined ? (this.heroX + fx.centerX) : (this.heroX + 3.2);
        const radius = fx.radius || 5.5;
        const strength = fx.pullStrength || 2.4;
        for (const e of enemies) {
          const dist = Math.abs(e.x - cx);
          if (dist <= radius) {
            this.applyDamage(e, fx.damage * power, src);
            if (e.kind !== 'building' && !e.unit.building) {
              const dir = (cx - e.x);
              e.x += Math.sign(dir) * Math.min(Math.abs(dir), strength);
              if (e.model) e.model.group.position.x = e.x;
            }
            if (fx.stun && e.alive) e.buffs.stun = Math.max(e.buffs.stun, fx.stun);
            if (fx.vuln && e.alive) { e.buffs.vuln = Math.max(e.buffs.vuln, fx.vuln); e.buffs.vulnT = fx.vulnDur || 6; }
            if (fx.armorBreak && e.alive) e.armorBreak = Math.min(24, (e.armorBreak || 0) + fx.armorBreak);
          }
        }
        break;
      }
      case 'giantArrowStrike': {
        // 射箭将领物理箭矢碰撞：生成穿透全图的落日神箭物理弹道，随箭头飞行碰触敌人实时结算伤害
        const startX = this.heroX + 1.2;
        if (!this.heroArrowProjectiles) this.heroArrowProjectiles = [];
        this.heroArrowProjectiles.push({
          heroId: 'huangzhong',
          type: 'giantArrow',
          startX,
          currentX: startX,
          prevX: startX,
          speed: 32.0,
          maxRange: fx.length || fx.range || 26.0,
          z: 0,
          widthZ: 2.2,
          damage: (fx.damage || 1200) * power,
          pierceRatio: fx.pierceRatio || 0.02,
          knockback: fx.knockback || 3.5,
          execute: fx.execute || 0.35,
          bossPercent: fx.bossPercent || 0.15,
          vuln: fx.vuln || 0.3,
          vulnDur: fx.vulnDur || 8,
          stun: fx.stun || 0,
          ignoreArmor: fx.ignoreArmor || false,
          src,
          hitUids: new Set(),
          hitBase: false,
          life: 1.2,
        });
        break;
      }
      case 'buffAll': {
        for (const e of allies) {
          if (fx.meleeOnly && !e.unit.tags.includes('melee')) continue;
          if (!e.buffs) e.buffs = {};
          if (fx.atk) { e.buffs.atkUp = Math.max(e.buffs.atkUp || 0, fx.atk * power); e.buffs.atkUpT = fx.duration; }
          if (fx.aspd) { e.buffs.aspdUp = Math.max(e.buffs.aspdUp || 0, fx.aspd * power); e.buffs.aspdUpT = fx.duration; }
          if (fx.spd) { e.buffs.spdUp = Math.max(e.buffs.spdUp || 0, fx.spd * power); e.buffs.spdUpT = fx.duration; }
          if (fx.def) { e.buffs.defUp = Math.max(e.buffs.defUp || 0, fx.def * power); e.buffs.defUpT = fx.duration; }
          if (fx.thorns) { e.buffs.thorns = Math.max(e.buffs.thorns || 0, fx.thorns); e.buffs.thornsT = fx.duration; }
          if (fx.lifesteal) { e.buffs.lifesteal = Math.max(e.buffs.lifesteal || 0, fx.lifesteal * power); e.buffs.lifestealT = fx.duration; }
          if (fx.crit) { e.buffs.crit = Math.max(e.buffs.crit || 0, fx.crit); e.buffs.critT = fx.duration; }
          if (fx.killEnergy) { e.buffs.killEnergy = fx.killEnergy; e.buffs.killEnergyT = fx.duration; }
          if (fx.immuneSlow) e.buffs.noSlowT = fx.duration;
          if (fx.heal) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * fx.heal * power);
          if (fx.shield) {
            e.shield = Math.max(e.shield, e.maxHp * fx.shield * power);
            e.buffs.shieldTime = fx.duration;
          }
          if (fx.cleanse) { e.buffs.slow = 0; e.buffs.slowFactor = 0; e.buffs.stun = 0; }
          this.effects.ring(e.x, e.z, theme, 0.3, 1.3, 0.5, 0.4);
        }
        break;
      }
      case 'skySwords': {
        // 李白 · 青莲剑界：18 支水墨飞剑自九天俯冲先后插地，每把剑落地精准结算该把飞剑的独立伤害与顿挫
        const count = fx.count || 18;
        const totalDamage = (fx.damage || 980) * power;
        const baseDmg = Math.floor(totalDamage / count);
        const remainder = Math.round(totalDamage - baseDmg * count);

        for (let i = 0; i < count; i++) {
          // 飞剑先后下落时间与 3D 动画 skySwords 完全对齐：
          // fallDelay = i * 0.065, startY = 12.0 + i * 0.5, vy = -32
          // 真实触地时刻 t = fallDelay + (startY - 0.08) / 32
          const fallDelay = i * 0.065;
          const startY = 12.0 + i * 0.5;
          const fallDuration = (startY - 0.08) / 32.0;
          const hitTime = fallDelay + fallDuration; // 0.37s ~ 1.74s 依序扎地

          const targetX = this.heroX + 1.2 + (i / count) * 10.5;
          const targetZ = ((i % 3) - 1) * 0.9;
          const swordDmg = baseDmg + (i < remainder ? 1 : 0);

          this.delayedStrikes.push({
            t: hitTime,
            x: targetX,
            z: targetZ,
            zr: 1.8,
            area: 1.8,
            side: 'player',
            damage: swordDmg,
            stun: 0.12,
            knockback: fx.knockback || 0.15,
            color: 0x38bdf8,
            isSkySword: true,
            swordIndex: i,
            src
          });
        }
        audio.spear();
        break;
      }
      case 'strikeLine': {
        if (this.heroId === 'libai') {
          // 容错：若李白仍走 strikeLine，自动转为 18 剑分段扎地结算
          const count = 18;
          const totalDamage = (fx.damage || 980) * power;
          const baseDmg = Math.floor(totalDamage / count);
          const remainder = Math.round(totalDamage - baseDmg * count);

          for (let i = 0; i < count; i++) {
            const fallDelay = i * 0.065;
            const startY = 12.0 + i * 0.5;
            const hitTime = fallDelay + (startY - 0.08) / 32.0;
            const targetX = this.heroX + 1.2 + (i / count) * 10.5;
            const targetZ = ((i % 3) - 1) * 0.9;
            const swordDmg = baseDmg + (i < remainder ? 1 : 0);

            this.delayedStrikes.push({
              t: hitTime,
              x: targetX,
              z: targetZ,
              zr: 1.8,
              area: 1.8,
              side: 'player',
              damage: swordDmg,
              stun: 0.12,
              knockback: fx.knockback || 0.15,
              color: 0x38bdf8,
              isSkySword: true,
              swordIndex: i,
              src
            });
          }
          audio.spear();
          break;
        }

        // 天降重击技能：随模型劈地时刻精准生效 (关羽 0.32s 偃月开天、白起 0.28s 巨镰横斩、曹操 0.25s 双剑合璧)
        let impactDelay = 0;
        if (this.heroId === 'guanyu') impactDelay = 0.32;
        else if (this.heroId === 'baiqi') impactDelay = 0.28;
        else if (this.heroId === 'caocao') impactDelay = 0.25;
        else if (this.heroId === 'weiqing') impactDelay = 0.30;

        if (impactDelay > 0) {
          const facing = this.heroFacing || 1;
          const x1 = this.heroX + facing * fx.length;
          this.delayedStrikes.push({
            t: impactDelay,
            x: this.heroX + facing * fx.length * 0.5,
            z: 0,
            area: fx.length * 0.55,
            side: 'player',
            damage: fx.damage * power,
            knockback: fx.knockback || 0,
            vuln: fx.vuln || 0,
            vulnDur: fx.vulnDur || 0,
            execute: fx.execute || 0,
            color: theme,
            shake: { power: 0.35, duration: 0.35 },
            sound: 'spear',
            src
          });
        } else {
          const x1 = this.heroX + fx.length;
          for (const e of enemies) {
            if (e.x >= this.heroX - 1 && e.x <= x1 + 0.6) {
              this.applyDamage(e, fx.damage * power, src);
              if (fx.knockback && e.kind !== 'building' && !e.unit.building) {
                e.x += fx.knockback;
                if (e.model) e.model.group.position.x = e.x;
              }
              if (fx.vuln && e.alive) { e.buffs.vuln = Math.max(e.buffs.vuln, fx.vuln); e.buffs.vulnT = fx.vulnDur || 6; }
              if (fx.execute && e.alive && !e.isBoss && !e.unit.building && e.hp / e.maxHp <= fx.execute) {
                this.executeKill(e, src);
              }
            }
          }
          this.effects.giantSlash(this.heroX + fx.length * 0.45, 1.5, 0, -0.4, theme, 6.0, 0.5);
          this.effects.ring(this.heroX + 2, 0, theme, 0.5, 4.0, 0.6, 0.7);
          this.scene.screenShake(0.22, 0.3);
          audio.spear();
        }
        break;
      }
      case 'strikesMulti': {
        if (this.heroId === 'liguang') {
          // 李广疾风六星连珠：生成 6 支独立穿甲重箭物理弹道，依序呼啸射出并在碰触敌人时结算伤害与控制
          if (!this.heroArrowProjectiles) this.heroArrowProjectiles = [];
          const count = fx.count || 6;
          const baseDamage = (fx.damage || 420) * power;
          for (let i = 0; i < count; i++) {
            this.heroArrowProjectiles.push({
              heroId: 'liguang',
              type: 'streamArrow',
              arrowIndex: i,
              delay: i * 0.085,
              age: 0,
              startX: this.heroX + 1.2,
              currentX: this.heroX + 1.2,
              prevX: this.heroX + 1.2,
              speed: 36.0 + i * 2.0,
              maxRange: 24.0,
              z: (i - 2.5) * 0.35,
              widthZ: 1.2,
              damage: baseDamage,
              stun: fx.stun || 1.5,
              vuln: fx.vuln || 0.25,
              vulnDur: fx.vulnDur || 6,
              knockback: 0.6,
              src,
              hitUids: new Set(),
              hitBase: false,
              life: 1.5,
            });
          }
          break;
        }

        if (this.heroId === 'zhugeliang') {
          // 诸葛亮奇门八阵：八卦大阵展开期间，连落 3 颗天火流星逐颗轰炸阵内敌军
          const meteors = [
            { t: 0.35, x: this.heroX + 3.0, dmg: (fx.damage || 450) * power, stun: 1.5, area: 2.8 },
            { t: 1.05, x: this.heroX + 5.5, dmg: (fx.damage || 450) * power, stun: 1.5, area: 2.8 },
            { t: 1.75, x: this.heroX + 8.0, dmg: (fx.damage || 450) * power, stun: 1.5, area: 2.8 },
          ];
          for (const m of meteors) {
            this.delayedStrikes.push({
              t: m.t, x: m.x, z: 0, zr: m.area, area: m.area, side: 'player',
              damage: m.dmg, stun: m.stun, isMeteor: true, color: 0x38bdf8,
              shake: { power: 0.35, duration: 0.3 }, src
            });
          }
          break;
        }

        if (this.heroId === 'chengyaojin') {
          // 程咬金混世魔王 · 宣花天罡三板斧：劈脑袋(380)、鬼剔牙(450)、掏耳朵(600)逐斧斩击
          const axes = [
            { t: 0.20, x: this.heroX + 2.0, dmg: 380 * power, stun: 0.8, knockback: 0.5, armorBreak: 0, area: 2.2 },
            { t: 0.52, x: this.heroX + 3.4, dmg: 450 * power, stun: 0, knockback: 1.2, armorBreak: 12, area: 2.4 },
            { t: 0.88, x: this.heroX + 4.8, dmg: 600 * power, stun: 0.5, knockback: 2.2, armorBreak: 0, area: 3.2, shake: { power: 0.4, duration: 0.35 } }
          ];
          for (const a of axes) {
            this.delayedStrikes.push({
              t: a.t, x: a.x, z: 0, area: a.area, side: 'player',
              damage: a.dmg, stun: a.stun, knockback: a.knockback, armorBreak: a.armorBreak,
              color: 0xd97706, shake: a.shake, sound: 'spear', src
            });
          }
          break;
        }

        if (this.heroId === 'yuchigong') {
          // 尉迟恭黑煞门神 · 雌雄双鞭三绝：第1鞭击飞(350)、第2鞭破甲眩晕(450)、第3鞭黑雷爆裂易伤(650)
          const whips = [
            { t: 0.18, x: this.heroX + 2.0, dmg: 350 * power, stun: 0, knockback: 2.0, armorBreak: 0, vuln: 0, area: 2.2 },
            { t: 0.46, x: this.heroX + 3.2, dmg: 450 * power, stun: 1.2, knockback: 0.5, armorBreak: 12, vuln: 0, area: 2.4 },
            { t: 0.78, x: this.heroX + 4.5, dmg: 650 * power, stun: 0.6, knockback: 1.5, armorBreak: 0, vuln: 0.4, vulnDur: 6, area: 3.0, shake: { power: 0.38, duration: 0.3 } }
          ];
          for (const w of whips) {
            this.delayedStrikes.push({
              t: w.t, x: w.x, z: 0, area: w.area, side: 'player',
              damage: w.dmg, stun: w.stun, knockback: w.knockback, armorBreak: w.armorBreak, vuln: w.vuln, vulnDur: w.vulnDur,
              color: 0x3b82f6, shake: w.shake, sound: 'spear', src
            });
          }
          break;
        }

        if (this.heroId === 'lianghongyu') {
          // 梁红玉金山战鼓 · 破金震天怒涛：5 波水墨音爆浪潮沿兵线狂暴推移逐波结算
          const waveCount = fx.count || 5;
          const waveDmg = (fx.damage || 180) * power;
          for (let i = 0; i < waveCount; i++) {
            this.delayedStrikes.push({
              t: 0.15 + i * 0.21,
              x: this.heroX + 1.8 + i * 1.5,
              z: 0,
              area: fx.area || 2.4,
              side: 'player',
              damage: waveDmg,
              knockback: fx.knockback || 1.2,
              isDrumWave: true,
              waveIndex: i,
              color: 0xdc2626,
              src
            });
          }
          break;
        }

        if (this.heroId === 'luban') {
          // 鲁班机关玄鸟机巧轰炸：木鸟掠空连投 6 枚机巧雷弹，向前沿兵线逐枚落地爆炸
          const bombCount = fx.count || 6;
          const bombDmg = (fx.damage || 380) * power;
          for (let i = 0; i < bombCount; i++) {
            this.delayedStrikes.push({
              t: 0.22 + i * 0.18,
              x: this.heroX + 2.2 + i * 2.0,
              z: ((i % 2) - 0.5) * 1.2,
              area: fx.area || 3.5,
              side: 'player',
              damage: bombDmg,
              armorBreak: fx.armorBreak || 8,
              dot: { dps: 50, time: 5 },
              isBomb: true,
              color: 0x06b6d4,
              src
            });
          }
          break;
        }

        if (this.heroId === 'zhaoyun') {
          // 赵云白龙破阵 · 七进七出：向前 7 段瞬影折返刺击逐段穿透浮空（朝向决定技能方向）
          const count = fx.count || 7;
          const thrustDmg = (fx.damage || 180) * power;
          const facing = this.heroFacing || 1;
          for (let i = 0; i < count; i++) {
            this.delayedStrikes.push({
              t: 0.24 + i * 0.11,
              x: this.heroX + facing * (1.5 + (i / Math.max(1, count - 1)) * 7.5),
              z: Math.sin(i * 1.5) * 1.0,
              area: fx.area || 2.2,
              side: 'player',
              damage: thrustDmg,
              stun: 0.25,
              color: 0xe0e7ff,
              sound: 'spear',
              src
            });
          }
          break;
        }

        // 通用多段打击 fallback
        if (fx.strategy === 'frontStep') {
          const count = fx.count || (fx.damages ? fx.damages.length : 1);
          const ds = fx.damages || Array(count).fill(fx.damage);
          ds.forEach((dmg, i) => {
            const facing = this.heroFacing || 1;
            this.delayedStrikes.push({
              t: 0.10 + i * 0.22, x: this.heroX + facing * (1.8 + i * 1.7), z: 0, side: 'player',
              damage: (dmg || 100) * power, stun: fx.stun || 0, area: fx.area || 1.9, color: theme,
              knockback: fx.knockback || 0, vuln: fx.vuln || 0, vulnDur: fx.vulnDur || 0, armorBreak: fx.armorBreak || 0,
              src
            });
          });
        } else {
          const n = fx.count || 5;
          for (let i = 0; i < n; i++) {
            const facing = this.heroFacing || 1;
            const x = this.heroX + facing * (2.0 + (i / Math.max(1, n - 1)) * 14.0);
            this.delayedStrikes.push({
              t: 0.12 * i, x, z: (Math.random() - 0.5) * 2.5, side: 'player',
              damage: (fx.damage || 100) * power, slow: fx.slow || 0, duration: fx.slowDur || 0,
              area: fx.area || 2.0, color: theme,
              vuln: fx.vuln || 0, vulnDur: fx.vulnDur || 0, armorBreak: fx.armorBreak || 0,
              src
            });
          }
        }
        break;
      }
      case 'aoeAround': {
        // 天降重型砸地技能：随动画模型落地瞬间精准结算伤害与控制 (项羽神鼎 0.32s、武则天无字碑 0.35s、秦始皇黄金拳 0.30s)
        let groundImpactDelay = 0;
        if (this.heroId === 'xiangyu') groundImpactDelay = 0.32;
        else if (this.heroId === 'wuzetian') groundImpactDelay = 0.35;
        else if (this.heroId === 'qinshihuang') groundImpactDelay = 0.30;

        const hits = fx.hits || 1;
        if (this.heroId === 'lvbu') {
          // 吕布修罗双煞龙卷：前 3 段割裂内聚牵引，第 4 段终结一击巨震击退与长眩晕
          for (let h = 0; h < 4; h++) {
            const isFinish = (h === 3);
            this.delayedStrikes.push({
              t: 0.15 + h * 0.25, x: this.heroX + 1.2, z: 0, side: 'player', followHero: true,
              damage: (fx.damage || 300) * power, area: fx.radius || 7.5,
              stun: isFinish ? (fx.stun || 1.8) : 0.3,
              knockback: isFinish ? (fx.knockback || 2.5) : -0.2,
              color: 0xdc2626,
              shake: isFinish ? { power: 0.45, duration: 0.4 } : { power: 0.2, duration: 0.15 },
              sound: isFinish ? 'explosion' : 'spear',
              src
            });
          }
        } else if (this.heroId === 'dianwei') {
          // 典韦古之恶来 · 双铁戟交错狂斩 6 段
          const count = 6;
          for (let h = 0; h < count; h++) {
            this.delayedStrikes.push({
              t: 0.14 + h * 0.18, x: this.heroX + 1.2, z: 0, side: 'player', followHero: true,
              damage: (fx.damage || 220) * power, area: fx.radius || 5.5,
              stun: 0.15, knockback: 0.2, color: 0xb91c1c,
              shake: { power: 0.25, duration: 0.18 },
              sound: 'spear',
              src
            });
          }
        } else if (groundImpactDelay > 0) {
          // 天降重锤落地瞬间触发伤害与冲击波
          this.delayedStrikes.push({
            t: groundImpactDelay, x: this.heroX + 2.5, z: 0, side: 'player',
            damage: fx.damage * power, area: fx.radius, stun: fx.stun || 0,
            knockback: fx.knockback || 0, fear: fx.fear || 0, color: theme,
            shake: { power: 0.45, duration: 0.4 }, sound: 'explosion',
            src
          });
        } else if (hits > 1) {
          for (let h = 0; h < hits; h++) {
            this.delayedStrikes.push({
              t: 0.15 + h * 0.26, x: this.heroX, z: 0, side: 'player', followHero: true,
              damage: fx.damage * power, area: fx.radius, stun: fx.stun || 0, color: theme,
              knockback: fx.knockback || 0, fear: fx.fear || 0, src
            });
          }
        } else {
          for (const e of enemies) {
            if (Math.abs(e.x - this.heroX) <= fx.radius) {
              this.applyDamage(e, fx.damage * power, src);
              if (fx.stun) e.buffs.stun = Math.max(e.buffs.stun, fx.stun);
              if (fx.knockback && e.kind !== 'building' && !e.unit.building) {
                e.x += fx.knockback;
                if (e.model) e.model.group.position.x = e.x;
              }
              if (fx.fear) this.applyFear(e, 1.6, fx.fear);
            }
          }
          this.effects.giantSlash(this.heroX + 1.4, 1.4, 0, -0.6, theme, 5.2, 0.5);
          this.effects.ring(this.heroX, 0.3, theme, 0.5, 5.0, 0.7, 0.8);
          this.scene.screenShake(0.3, 0.3);
        }
        break;
      }
      case 'burnAll': {
        for (const e of enemies) {
          if (!e.alive) continue;
          const isBoss = e.isBoss || (e.unit && e.unit.boss) || e.kind === 'boss';
          // 首领敌军持续灼烧 10s，其余普通敌军遭受烈火永久灼烧直至消亡
          const burnTime = isBoss ? 10.0 : 999999;
          const dps = (fx.dps || 260) * power;
          e.dot = { dps, time: burnTime, isEternal: !isBoss };
          if (fx.slow) {
            e.buffs.slow = Math.max(e.buffs.slow, burnTime);
            e.buffs.slowFactor = Math.max(e.buffs.slowFactor, fx.slow);
          }
          this.effects.inkBurst(e.x, 0.8, e.z, 6, 0xef4444, 0.8);
        }
        break;
      }
      case 'fieldDot': {
        if (fx.mode === 'global') {
          for (const e of enemies) {
            if (fx.slow) {
              e.buffs.slow = Math.max(e.buffs.slow, fx.duration);
              e.buffs.slowFactor = Math.max(e.buffs.slowFactor, fx.slow);
            }
            if (fx.dps) e.dot = { dps: fx.dps * power, time: fx.duration };
            
          }
          
        } else {
          // 区域型：zone（主将前方） / zoneAtTarget（最强敌人脚下）
          let cx = this.heroX + 1 + fx.length / 2;
          if (fx.mode === 'zoneAtTarget') {
            const t = enemies.filter((e) => !e.unit.building).sort((a, b) => b.hp - a.hp)[0] || enemies[0];
            if (t) cx = t.x;
          }
          this.skillZones.push({
            x: cx, z: 0, rx: fx.length / 2, rz: fx.width / 2,
            dps: (fx.dps || 0) * power, slow: fx.slow || 0, life: fx.duration, acc: 0,
          });
          this.effects.fireField(cx, 0, fx.length, fx.width, fx.duration, theme, 0xb23a2f);
        }
        break;
      }
      case 'summonUnits': {
        const unit = getUnit(fx.unit);
        const p = this.heroData.passive;
        const boost = (p && p.template === 'summonBoost') ? 1 + p.value * power : 1;
        const emp = (fx.empower || 1) * boost;
        for (let i = 0; i < fx.count; i++) {
          let x;
          let z = (i - (fx.count - 1) / 2) * 0.7;
          if (fx.at === 'enemyBack') x = 12.5 + (i % 2) * 0.8;
          else if (fx.at === 'leftWing') { x = -12.5 + (i % 2) * 0.6; z = -1.8 + (i % 3) * 0.4; }
          else if (fx.at === 'rightWing') { x = -12.5 + (i % 2) * 0.6; z = 1.8 + (i % 3) * 0.4; }
          else if (fx.at === 'front') { x = this.heroX + 2.2 + (i % 3) * 0.7; z = (i - (fx.count - 1) / 2) * 0.6; }
          else x = this.heroX - 1 + i * 0.9;
          const e = this.createEntity({
            unit, side: 'player', x, z, kind: 'unit',
            hpMul: this.playerHpMul(unit) * emp, atkMul: this.playerAtkMul(unit) * emp,
            summoned: true, summonStyle: 'emerge',
          });
          if (fx.lifetime) e.timedLife = fx.lifetime;
          this.effects.summon(x, z, theme);
        }
        break;
      }
      case 'healShield': {
        for (const e of allies) {
          if (fx.heal) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * fx.heal * power);
          if (fx.shield) {
            e.shield = Math.max(e.shield, e.maxHp * fx.shield * power);
            e.buffs.shieldTime = fx.duration;
          }
          if (fx.cleanse) { e.buffs.slow = 0; e.buffs.slowFactor = 0; e.buffs.stun = 0; }
          this.effects.heal(e.x, 1.0, e.z);
        }
        audio.heal();
        break;
      }
      case 'gainEnergy': {
        this.energy = Math.min(this.energyMax, this.energy + fx.amount);
        this.effects.ring(this.heroX, 0.25, 0xc9a25e, 0.4, 2.4, 0.6, 0.7);
        break;
      }
      case 'resetCooldowns': {
        for (const c of this.cards) c.cd = 0;
        this.ui.flash('skill');
        break;
      }
      case 'nukeHighest': {
        const t = enemies.filter((e) => !e.unit.building).sort((a, b) => b.hp - a.hp)[0] || enemies[0];
        if (t) {
          this.effects.skyThunder(t.x, t.z, theme);
          this.effects.inkBurst(t.x, 1.2, t.z, 14, theme, 1.4);
          this.applyDamage(t, fx.damage * power, src);
          if (fx.vuln && t.alive) { t.buffs.vuln = Math.max(t.buffs.vuln, fx.vuln); t.buffs.vulnT = fx.vulnDur || 8; }
          this.scene.screenShake(0.28, 0.3);
          audio.explosion();
        }
        break;
      }
      case 'execute': {
        // 优先狙杀非首领强敌；全场只剩首领/建筑时才打首领
        const normal = enemies.filter((e) => !e.unit.building && !e.isBoss);
        const pool = normal.length ? normal : enemies.filter((e) => !e.unit.building);
        const t = pool.sort((a, b) => b.hp - a.hp)[0] || enemies[0];
        if (!t) break;
        this.effects.skyThunder(t.x, t.z, theme);
        this.effects.inkBurst(t.x, 1.2, t.z, 16, 0xc9a25e, 1.6);
        this.scene.screenShake(0.35, 0.35);
        const canExec = !t.isBoss && !t.unit.building
          && (fx.threshold === undefined || t.hp / t.maxHp <= fx.threshold);
        if (canExec) {
          this.executeKill(t, src);
          this.ui.showBattleBanner('一击必杀', '定军神射', 1200);
          audio.gong(null, 1.1);
        } else {
          // 首领：按最大生命百分比扣血（无视护甲，仍可被护盾吸收）
          const pct = fx.bossPercent ?? fx.damage ?? 0;
          const raw = t.isBoss ? t.maxHp * pct : (fx.damage || 0) * power;
          this.applyDamage(t, raw, src, { ignoreArmor: true });
          if (fx.vuln && t.alive) { t.buffs.vuln = Math.max(t.buffs.vuln, fx.vuln); t.buffs.vulnT = fx.vulnDur || 8; }
          audio.explosion();
        }
        break;
      }
      case 'chainBolt': {
        // 司马懿 · 冢虎冥雷：九天紫电在 8 名敌军之间连续跳跃连锁折射 (按 0.085s 依次连跳雷击)
        const hit = [];
        let from = { x: this.heroX, z: 0 };
        let dmg = (fx.damage || 950) * power;
        const maxJumps = fx.count || 8;
        const jumpList = [];

        for (let i = 0; i < maxJumps; i++) {
          let next = null;
          let best = 1e9;
          for (const e of enemies) {
            if (!e.alive || e.unit.building || hit.includes(e)) continue;
            const d = Math.abs(e.x - from.x) + Math.abs((e.z || 0) - (from.z || 0)) * 0.5;
            if (d < best) { best = d; next = e; }
          }
          if (!next) break;
          if (i > 0 && best > (fx.jump || 5.5)) break;
          hit.push(next);
          jumpList.push({ target: next, jumpIndex: i, damage: dmg });
          from = next;
          dmg *= (fx.falloff || 0.88);
        }

        // 依序安排延迟冥雷打击
        jumpList.forEach(({ target, jumpIndex, damage }) => {
          this.delayedStrikes.push({
            t: jumpIndex * 0.085,
            x: target.x,
            z: target.z || 0,
            zr: 1.2,
            area: 1.2,
            side: 'player',
            damage,
            stun: fx.stun || 1.5,
            slow: fx.slow || 0.5,
            duration: fx.slowDur || 6,
            vuln: 0.35,
            vulnDur: 6,
            isChainLightning: true,
            color: 0x9333ea,
            src
          });
        });

        audio.explosion();
        break;
      }
      case 'bloodPact': {
        const cost = PLAYER_BASE_MAX * (fx.baseCost || 0);
        this.baseHp = Math.max(1, this.baseHp - cost);
        this.energy = Math.min(this.energyMax, this.energy + (fx.energy || 0));
        if (fx.atk) {
          for (const e of allies) {
            e.buffs.atkUp = Math.max(e.buffs.atkUp, fx.atk * power);
            e.buffs.atkUpT = fx.duration;
          }
        }
        this.effects.ring(this.heroX, 0.3, 0xb23a2f, 0.6, 5.5, 0.8, 0.9);
        this.ui.flash('skill');
        break;
      }
      case 'wallAt': {
        // 蒙恬神将技能：彻底告别简陋木拒马，拔地而起巍峨水墨古长城金汤关隘城楼
        const unit = getUnit('greatwall');
        const wx = Math.min(this.heroX + 2.5, 12);
        const wall = this.createEntity({
          unit, side: 'player', x: wx, z: 0, kind: 'building',
          hpOverride: fx.hp || 3500, hpMul: 1, atkMul: 1,
        });
        wall.timedLife = fx.duration || 18;
        // 呼应长城拔地而起的雄浑视听特效
        if (this.effects) {
          if (typeof this.effects.greatWall === 'function') this.effects.greatWall(wx - 3.2, 0, theme);
          if (typeof this.effects.dust === 'function') this.effects.dust(wx, 0, 16, 3.5);
          if (typeof this.effects.ring === 'function') this.effects.ring(wx, 0, theme, 0.8, 5.5, 0.9, 0.85);
        }
        if (this.scene && typeof this.scene.screenShake === 'function') this.scene.screenShake(0.35, 0.45);
        audio.gong(null, 1.25);
        break;
      }
      case 'debuffAll': {
        const list = fx.frontOnly ? enemies.filter((e) => e.x <= 6) : enemies;
        for (const e of list) {
          if (fx.damage) this.applyDamage(e, fx.damage * power, src);
          if (fx.stun) e.buffs.stun = Math.max(e.buffs.stun, fx.stun);
          if (fx.atkDown) {
            e.buffs.atkDebuff = 1 - fx.atkDown;
            e.buffs.atkDebuffTime = fx.duration || 6;
          }
          if (fx.vuln) { e.buffs.vuln = Math.max(e.buffs.vuln, fx.vuln); e.buffs.vulnT = fx.duration || 8; }
          if (fx.armorBreak) e.armorBreak = Math.min(24, (e.armorBreak || 0) + fx.armorBreak);
          if (fx.fear) this.applyFear(e, 1.8, fx.duration || 1);
          this.effects.ring(e.x, e.z, theme, 0.3, 1.3, 0.5, 0.5);
        }
        break;
      }
      case 'massCharge': {
        for (const e of allies) {
          if (!e.unit.tags.includes('cavalry')) continue;
          e.chargeReady = true;
          e.buffs.spdUp = Math.max(e.buffs.spdUp, fx.spd);
          e.buffs.spdUpT = fx.duration;
          if (fx.atk) { e.buffs.atkUp = Math.max(e.buffs.atkUp, fx.atk * power); e.buffs.atkUpT = fx.duration; }
          if (fx.fear) e.fearOnChargeT = fx.duration;
          this.effects.ring(e.x, e.z, theme, 0.3, 1.4, 0.5, 0.5);
        }
        audio.charge();
        break;
      }
      case 'charm': {
        // 貂蝉「闭月」：策反射程内最强的三名非首领敌军——原敌被魅惑定身，同时原地反戈生成属性翻倍的我方幻影
        const radius = fx.radius || 6;
        const dur = fx.duration || 15;
        const count = fx.count || 3;
        const emp = fx.empower || 2;
        const pool = enemies.filter((e) => !e.isBoss && e.kind !== 'building' && !e.unit.building
          && Math.hypot(e.x - this.heroX, (e.z || 0) - this.heroZ) <= radius);
        // 按生命与攻击的综合战力排序，取最强的三名
        const targets = pool
          .slice()
          .sort((a, b) => (b.maxHp + b.atk * 8) - (a.maxHp + a.atk * 8))
          .slice(0, count);
        targets.forEach((t, i) => {
          t.buffs.stun = Math.max(t.buffs.stun || 0, dur);
          const mirror = this.createEntity({
            unit: t.unit,
            side: 'player',
            x: Math.max(-11.5, t.x - 1.0 - i * 0.4),
            z: Math.max(-2.0, Math.min(2.0, (t.z || 0) + (i - 1) * 0.7)),
            kind: 'unit',
            // 严格按被魅惑单位自身的属性翻倍，不吃我方军阵加成
            hpOverride: Math.round(t.maxHp * emp),
            atkMul: t.unit.atk > 0 ? (t.atk * emp) / t.unit.atk : 1,
            summoned: true,
            summonStyle: 'emerge',
          });
          mirror.timedLife = dur;
          if (this.effects) {
            this.effects.ring(t.x, t.z, 0xd86a78, 0.4, 3.0, 0.7, 0.75);
            this.effects.inkBurst(t.x, 0.9, t.z, 12, 0xd86a78, 1.1);
            this.effects.ring(mirror.x, mirror.z, 0xd86a78, 0.4, 2.0, 0.6, 0.7);
          }
        });
        break;
      }
      default:
        break;
    }
  }
,

  // 技能区域（周瑜火海 / 姜子牙减速圈等）
  // ---------- 术法卡效果（design §3.3.1） ----------

  addHeroXp(n) {
    if (this.heroLevel >= 5) return;
    const p = this.heroData.passive;
    if (p && p.template === 'xpBoost') n *= 1 + p.value;
    this.heroXp += n;
    while (this.heroLevel < 5 && this.heroXp >= HERO_XP[this.heroLevel]) {
      this.heroLevel++;
      this.ui.showBattleBanner(`战意 Lv.${this.heroLevel}`, '主将威势提升', 1500);
      audio.gong(null, 1 + this.heroLevel * 0.06);
      const allies = this.entities.filter((e) => e.alive && e.side === 'player');
      for (const e of allies) {
        if (Math.abs(e.x - this.heroX) <= 8) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15);
      }
      this.effects.ring(this.heroX, 0.3, 0xc9a25e, 0.5, 6, 0.8, 0.8);
    }
  }
,

  // =========================================================================
  // Kingdom Rush 风格英雄体系（以赵云为核心验证原型）
  // 自由调遣·肉身拦截·自动平A·独立血条·脱战回血·15秒复活·局内升级
  // =========================================================================

  isHeroAlive() {
    return (this.heroHp > 0) && (this.heroRespawnTimer <= 0);
  },

  getHeroTargetObj() {
    if (!this._heroTargetObj) {
      const hd = this.heroData || {};
      this._heroTargetObj = {
        isHero: true,
        uid: `hero_${hd.id || 'hero'}`,
        name: hd.name || '主将',
        side: 'player',
        kind: 'hero',
        unit: {
          id: `hero_${hd.id || 'hero'}`,
          name: hd.name || '主将',
          tags: ['melee', 'hero'],
          look: (hd.look && hd.look) || { weapon: 'spear', size: 1.16 },
          special: 'none',
        },
        buffs: {},
      };
      // 动态属性绑定：始终实时同步真实英雄位置与生死状态，彻底消除敌军攻击幽灵虚空坐标的 Bug
      Object.defineProperty(this._heroTargetObj, 'x', {
        get: () => this.heroX,
        set: (v) => { this.heroX = v; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'y', {
        get: () => 0,
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'z', {
        get: () => (this.heroZ || 0),
        set: (v) => { this.heroZ = v; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'hp', {
        get: () => this.heroHp,
        set: (v) => { this.heroHp = v; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'maxHp', {
        get: () => this.heroMaxHp,
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'armor', {
        get: () => (this.heroArmor != null ? this.heroArmor : 10),
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'alive', {
        get: () => this.isHeroAlive(),
        set: (v) => { if (!v) this.heroHp = 0; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'model', {
        get: () => this.heroModel,
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this._heroTargetObj, 'stealth', {
        get: () => (this.heroStealthT || 0),
        set: (v) => { this.heroStealthT = v || 0; },
        enumerable: true,
        configurable: true
      });
    }
    return this._heroTargetObj;
  },

  commandHeroRally(x, z) {
    if (this.state !== 'running' || this.paused) return;
    if (!this.isHeroAlive()) {
      this.ui.toast('主将重聚战意中，暂无法调遣');
      return;
    }
    // 限制在可通行战场范围内
    const targetX = THREE.MathUtils.clamp(x, -11.5, 11.0);
    const targetZ = THREE.MathUtils.clamp(z, -1.8, 1.8);
    this.heroRallyX = targetX;
    this.heroRallyZ = targetZ;
    this.heroTargetX = targetX;
    this.heroTargetZ = targetZ;
    this.heroMovingToRally = true;
    this.heroEngageTarget = null;
    this.heroMovingToTarget = false;

    // 若调遣目标点距离当前位置较远，脱离当前阻挡的敌军，实现灵活战术拉扯
    const d = Math.hypot(targetX - this.heroX, targetZ - this.heroZ);
    if (d > 1.8 && this.heroBlockedFoes && this.heroBlockedFoes.size > 0) {
      for (const foe of this.heroBlockedFoes) {
        foe.heroBlockedBy = null;
      }
      this.heroBlockedFoes.clear();
    }

    this.showRallyMarker(targetX, targetZ);
    audio.select();

    const now = performance.now();
    if (now - this.lastHeroMoveEvent > 350) {
      this.lastHeroMoveEvent = now;
      this.event('heroMoved', { x: targetX, z: targetZ });
    }
  },

  showRallyMarker(x, z) {
    if (!this.heroRallyMarker) {
      const group = new THREE.Group();
      // 外层金色兵符圆环
      const outerGeo = new THREE.RingGeometry(0.68, 0.82, 16);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false,
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      outerMesh.rotation.x = -Math.PI / 2;
      group.add(outerMesh);

      // 内层阵心光圈
      const innerGeo = new THREE.RingGeometry(0.12, 0.28, 16);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfffbeb, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.rotation.x = -Math.PI / 2;
      group.add(innerMesh);

      this.scene.scene.add(group);
      this.heroRallyMarker = { group, outerMesh, innerMesh, outerMat, innerMat, t: 0, life: 2.5 };
    }
    const rm = this.heroRallyMarker;
    rm.group.position.set(x, 0.032, z);
    rm.group.visible = true;
    rm.outerMat.opacity = 0.85;
    rm.innerMat.opacity = 0.9;
    rm.t = 0;
    rm.life = 2.5;
  },

  updateRallyMarker(dt) {
    const rm = this.heroRallyMarker;
    if (!rm || !rm.group || !rm.group.visible) return;
    rm.t += dt;
    rm.life -= dt;
    // 阵心呼吸与旋转
    rm.outerMesh.rotation.z += dt * 1.8;
    const pulse = 1.0 + Math.sin(rm.t * 8.0) * 0.12;
    rm.outerMesh.scale.setScalar(pulse);
    if (rm.life <= 0.8) {
      const alpha = Math.max(0, rm.life / 0.8);
      rm.outerMat.opacity = alpha * 0.85;
      rm.innerMat.opacity = alpha * 0.9;
    }
    if (rm.life <= 0) {
      rm.group.visible = false;
    }
  },

  attachHeroHealthBar() {
    const group = new THREE.Group();
    // 金色外框，突出英雄华丽尊贵地位，并按战场视角 (-0.42 rad) 倾斜直接面向镜头
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xd97706, depthTest: false, depthWrite: false, transparent: false,
    });
    const border = new THREE.Mesh(HPBAR_BOSS_BORDER_GEO, borderMat);
    border.renderOrder = 997;
    border.position.z = 0;
    group.add(border);

    const bg = new THREE.Mesh(HPBAR_BOSS_BG_GEO, HPBAR_BG_MAT);
    bg.renderOrder = 998;
    bg.position.z = 0.001;
    group.add(bg);

    const fill = new THREE.Mesh(HPBAR_BOSS_FILL_GEO, HPBAR_GREEN_MAT);
    fill.renderOrder = 999;
    fill.position.x = -1.12;
    fill.position.z = 0.002;
    group.add(fill);

    group.rotation.x = -0.42;
    group.position.set(this.heroX, 2.85, this.heroZ);
    this.scene.scene.add(group);
    this.heroHpBar = { group, fill, border, shown: 1.0 };
  },

  updateHeroHealthBar(dt) {
    if (!this.heroHpBar) return;
    const bar = this.heroHpBar;
    if (!this.isHeroAlive()) {
      bar.group.visible = false;
      return;
    }
    bar.group.visible = true;
    bar.group.position.set(this.heroX, 2.85, this.heroZ);
    const targetPct = Math.max(0, Math.min(1, this.heroHp / this.heroMaxHp));
    const k = Math.min(1, dt * 12);
    bar.shown += (targetPct - bar.shown) * k;
    bar.fill.scale.x = Math.max(0.001, bar.shown);
  },

  updateHeroKR(dt) {
    // 0. 武则天「无字天碑」：阵亡后原地留碑继续震击（碑在人在，碑碎则止）
    if (this.heroWuzetianStele) {
      const st = this.heroWuzetianStele;
      st.t -= dt;
      st.tick -= dt;
      if (st.tick <= 0) {
        st.tick = 0.5;
        const src = this.skillDamageSource ? this.skillDamageSource() : null;
        for (const e of this.entities) {
          if (!e.alive || e.side !== 'enemy') continue;
          if (Math.hypot(e.x - st.x, (e.z || 0) - st.z) <= 4.0) {
            this.applyDamage(e, 200 * this.heroPower(), src);
            e.buffs.slow = Math.max(e.buffs.slow, 1.6);
            e.buffs.slowFactor = Math.max(e.buffs.slowFactor, 0.3);
          }
        }
        if (this.effects) this.effects.ring(st.x, st.z, 0xd8b25a, 0.5, 4.2, 0.55, 0.55);
      }
      if (st.t <= 0) this.heroWuzetianStele = null;
    }

    // 1. 死亡与复活倒计时
    if (this.heroRespawnTimer > 0) {
      this.heroRespawnTimer -= dt;
      if (this.heroRespawnTimer <= 0) {
        this.reviveHero();
      }
      return;
    }

    // 2. 脱战回血机制（脱战 4 秒后，每秒回复 heroRegenRate 最大生命）
    if (this.heroPushCd > 0) this.heroPushCd = Math.max(0, this.heroPushCd - dt);
    const regenRate = this.heroRegenRate || 0.04;
    if (this.heroOutOfCombatTimer > 0) {
      this.heroOutOfCombatTimer -= dt;
    } else if (this.heroHp < this.heroMaxHp) {
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + regenRate * this.heroMaxHp * dt);
      this.heroRegenFxTimer = (this.heroRegenFxTimer || 0) + dt;
      if (this.heroRegenFxTimer >= 0.5) {
        this.heroRegenFxTimer = 0;
        if (this.effects) this.effects.heal(this.heroX, 1.0, this.heroZ);
      }
    }

    // 2.5 孙武「隐遁」：脱战自动潜行（敌军索敌忽略），出手或受击现形
    if (this.heroCombat && this.heroCombat.stealth) {
      const wantStealth = this.heroOutOfCombatTimer <= 0;
      if (wantStealth && this.heroStealthT <= 0) {
        this.heroStealthT = 1;
        if (this.effects) this.effects.inkBurst(this.heroX, 0.5, this.heroZ, 8, 0x334155, 0.7);
      } else if (!wantStealth) {
        this.heroStealthT = 0;
      }
    }
    // 2.6 霍去病「奔袭」：连续移动蓄势，下一击 3 倍暴击
    if (this.heroCombat && this.heroCombat.chargeCrit) {
      if (this.heroMovingToRally || this.heroMovingToTarget) {
        this.heroChargeT = Math.min(3, (this.heroChargeT || 0) + dt);
      }
    }

    // 3. 行军位移
    this.updateHeroKRMovement(dt);

    // 4. 肉身拦截与普攻战斗
    this.updateHeroKRCombat(dt);

    // 5. 兵符与血条
    this.updateRallyMarker(dt);
    this.updateHeroHealthBar(dt);
  },

  updateHeroKRMovement(dt) {
    if (!this.heroMovingToRally && !this.heroSkillAnim) return;
    if (this.heroSkillAnim) return; // 施展大招期间由武道动作接管

    const dx = this.heroTargetX - this.heroX;
    const dz = this.heroTargetZ - this.heroZ;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.10) {
      const baseSpd = (this.heroSpeed || 1.6) * 3.25; // 敏捷迅猛的赵云奔跑速度
      const spdMul = (this.heroGadgetSpeedBuff > 0) ? 1.60 : 1.0;
      const speed = baseSpd * spdMul;
      const step = Math.min(dist, speed * dt);
      this.heroX += (dx / dist) * step;
      this.heroZ += (dz / dist) * step;

      if (this.heroModel) {
        this.heroModel.group.position.set(this.heroX, 0, this.heroZ);
        if (Math.abs(dx) >= 0.05) {
          this.heroFacing = dx >= 0 ? 1 : -1;
        }
        this.heroModel.group.rotation.y = 0;
        const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
        if (this.heroModel.group.scale) {
          if (typeof this.heroModel.group.scale.set === 'function') {
            this.heroModel.group.scale.set(this.heroFacing * bScale, bScale, bScale);
          } else {
            this.heroModel.group.scale.x = this.heroFacing * bScale;
            this.heroModel.group.scale.y = bScale;
            this.heroModel.group.scale.z = bScale;
          }
        }
      }
      if (this.heroRangeRing) {
        this.heroRangeRing.position.set(this.heroX, 0.028, this.heroZ);
      }
      this.scene.setFocus(this.heroX);
    } else {
      this.heroX = this.heroTargetX;
      this.heroZ = this.heroTargetZ;
      this.heroRallyX = this.heroTargetX;
      this.heroRallyZ = this.heroTargetZ;
      this.heroMovingToRally = false;
      this.heroMovingToTarget = false;
      if (this.heroRallyMarker && this.heroRallyMarker.life > 0.4) {
        this.heroRallyMarker.life = 0.4; // 到达后光圈平滑消隐
      }
    }
  },

  updateHeroKRCombat(dt) {
    if (this.heroSkillAnim) return;

    // 玩家调遣行军期间，优先执行玩家位移指令
    if (this.heroMovingToRally) return;

    // 1. 清理已阵亡或超出范围的阻挡敌军
    if (this.heroBlockedFoes) {
      for (const foe of Array.from(this.heroBlockedFoes)) {
        if (!foe.alive || foe.gone || Math.hypot(foe.x - this.heroX, (foe.z || 0) - this.heroZ) > 3.2) {
          foe.heroBlockedBy = null;
          this.heroBlockedFoes.delete(foe);
        }
      }
    } else {
      this.heroBlockedFoes = new Set();
    }

    // 2. 检查当前交战目标有效性及追击距离（防止被敌军无限拉扯远走）
    const rallyX = this.heroRallyX ?? this.heroX;
    const rallyZ = this.heroRallyZ ?? this.heroZ;
    if (this.heroEngageTarget) {
      if (!this.heroEngageTarget.alive || this.heroEngageTarget.gone || (this.heroEngageTarget.stealth > 0)) {
        this.heroEngageTarget = null;
      } else {
        const distFromRally = Math.hypot(this.heroEngageTarget.x - rallyX, ((this.heroEngageTarget.z || 0) - rallyZ) * 1.35);
        if (distFromRally > (this.heroLeashRadius || 4.2)) {
          // 敌军脱离警戒交战半径，主将回防集结点
          this.heroEngageTarget = null;
        }
      }
    }

    // 3. 待命警戒半径索敌（约 2-3 个身位半径，2.85m）：敌军进入警戒圈主动迎击
    if (!this.heroEngageTarget) {
      const candidatesInAggro = this.entities.filter((e) =>
        e.alive &&
        e.side === 'enemy' &&
        (!e.stealth || e.stealth <= 0) &&
        Math.hypot(e.x - rallyX, ((e.z || 0) - rallyZ) * 1.35) <= (this.heroAggroRadius || 2.85)
      );
      if (candidatesInAggro.length > 0) {
        this.heroEngageTarget = candidatesInAggro.reduce((a, b) =>
          Math.hypot(a.x - this.heroX, (a.z || 0) - this.heroZ) < Math.hypot(b.x - this.heroX, (b.z || 0) - this.heroZ) ? a : b
        );
      }
    }

    // 4. 待命状态的主动迎击移动与归位回防
    if (this.heroEngageTarget) {
      const tX = this.heroEngageTarget.x;
      const tZ = this.heroEngageTarget.z || 0;
      const dx = tX - this.heroX;
      const dz = tZ - this.heroZ;
      const dist = Math.hypot(dx, dz);
      // 接近到自身攻击射程内即停步
      const stopDist = Math.max(0.9, (this.heroRange || 1.75) - 0.22);
      if (dist > stopDist) {
        const baseSpd = (this.heroSpeed || 1.6) * 3.0;
        const spdMul = (this.heroGadgetSpeedBuff > 0) ? 1.60 : 1.0;
        const speed = baseSpd * spdMul;
        const step = Math.min(dist - stopDist, speed * dt);
        this.heroX += (dx / dist) * step;
        this.heroZ += (dz / dist) * step;
        this.heroMovingToTarget = true;
        if (this.heroModel) {
          this.heroModel.group.position.set(this.heroX, 0, this.heroZ);
          if (Math.abs(dx) >= 0.05) this.heroFacing = dx >= 0 ? 1 : -1;
          this.heroModel.group.rotation.y = 0;
          const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
          this.heroModel.group.scale.x = this.heroFacing * bScale;
          this.heroModel.group.scale.y = bScale;
          this.heroModel.group.scale.z = bScale;
        }
        if (this.heroRangeRing) this.heroRangeRing.position.set(this.heroX, 0.028, this.heroZ);
      } else {
        this.heroMovingToTarget = false;
      }

      // 进入肉身拦截距离：仅近战且有阻挡名额时生效（远程/零阻挡英雄只输出不拦人）
      if (this.heroBlockSlots > 0 && !this.heroCombat?.ranged &&
          dist <= (this.heroRange || 1.75) + 0.15 && this.heroBlockedFoes.size < this.heroBlockSlots) {
        if (!this.heroEngageTarget.unit.building && this.heroEngageTarget.kind !== 'building') {
          this.heroBlockedFoes.add(this.heroEngageTarget);
          this.heroEngageTarget.heroBlockedBy = this;
          this.heroEngageTarget.target = this.getHeroTargetObj();
        }
      }
    } else if (this.heroBlockedFoes.size === 0) {
      // 警戒范围内无敌人且无阻挡：自动平滑回到集结点驻守
      const distToRally = Math.hypot(rallyX - this.heroX, rallyZ - this.heroZ);
      if (distToRally > 0.12) {
        const baseSpd = (this.heroSpeed || 1.6) * 2.6;
        const spdMul = (this.heroGadgetSpeedBuff > 0) ? 1.60 : 1.0;
        const speed = baseSpd * spdMul;
        const step = Math.min(distToRally, speed * dt);
        const rdx = rallyX - this.heroX;
        const rdz = rallyZ - this.heroZ;
        this.heroX += (rdx / distToRally) * step;
        this.heroZ += (rdz / distToRally) * step;
        this.heroMovingToTarget = true;
        if (this.heroModel) {
          this.heroModel.group.position.set(this.heroX, 0, this.heroZ);
          if (Math.abs(rdx) >= 0.05) this.heroFacing = rdx >= 0 ? 1 : -1;
          this.heroModel.group.rotation.y = 0;
          const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
          this.heroModel.group.scale.x = this.heroFacing * bScale;
          this.heroModel.group.scale.y = bScale;
          this.heroModel.group.scale.z = bScale;
        }
        if (this.heroRangeRing) this.heroRangeRing.position.set(this.heroX, 0.028, this.heroZ);
      } else {
        this.heroX = rallyX;
        this.heroZ = rallyZ;
        this.heroMovingToTarget = false;
        if (this.heroModel) this.heroModel.group.position.set(this.heroX, 0, this.heroZ);
        if (this.heroRangeRing) this.heroRangeRing.position.set(this.heroX, 0.028, this.heroZ);
      }
    } else {
      this.heroMovingToTarget = false;
    }

    // 5. 扫描近身地面敌军并阻挡（仅近战且有阻挡名额）
    const reach = this.heroRange || 1.75;
    if (this.heroBlockSlots > 0 && !this.heroCombat?.ranged && this.heroBlockedFoes.size < this.heroBlockSlots) {
      const candidates = this.entities.filter((e) =>
        e.alive &&
        e.side === 'enemy' &&
        !e.unit.building &&
        e.kind !== 'building' &&
        !e.heroBlockedBy &&
        (!e.stealth || e.stealth <= 0) &&
        Math.abs(e.x - this.heroX) <= reach &&
        Math.abs((e.z || 0) - this.heroZ) <= 1.2
      );
      for (const c of candidates) {
        if (this.heroBlockedFoes.size >= (this.heroBlockSlots || 2)) break;
        this.heroBlockedFoes.add(c);
        c.heroBlockedBy = this;
        c.target = this.getHeroTargetObj();
      }
    }

    // 6. 普攻目标选取：优先攻击阻挡列表中的敌人，其次是正在交战的目标，最后是射程内敌人
    let target = null;
    if (this.heroBlockedFoes.size > 0) {
      target = Array.from(this.heroBlockedFoes).find((f) => f.alive);
    }
    if (!target && this.heroEngageTarget && this.heroEngageTarget.alive) {
      const dist = Math.hypot(this.heroEngageTarget.x - this.heroX, ((this.heroEngageTarget.z || 0) - this.heroZ) * 1.4);
      if (dist <= (this.heroRange || 1.85)) {
        target = this.heroEngageTarget;
      }
    }
    if (!target) {
      const inRange = this.entities.filter((e) =>
        e.alive &&
        e.side === 'enemy' &&
        (!e.stealth || e.stealth <= 0) &&
        Math.hypot(e.x - this.heroX, ((e.z || 0) - this.heroZ) * 1.4) <= (this.heroRange || 1.85)
      );
      if (inRange.length > 0) {
        target = inRange.reduce((a, b) =>
          Math.abs(a.x - this.heroX) < Math.abs(b.x - this.heroX) ? a : b
        );
      }
    }

    if (target) {
      // 战斗朝向
      if (this.heroModel) {
        this.heroFacing = target.x >= this.heroX ? 1 : -1;
        this.heroModel.group.rotation.y = 0;
        const bScale = Math.abs(this.heroModel.baseScale || (1.12 * 1.30));
        if (this.heroModel.group.scale) {
          if (typeof this.heroModel.group.scale.set === 'function') {
            this.heroModel.group.scale.set(this.heroFacing * bScale, bScale, bScale);
          } else {
            this.heroModel.group.scale.x = this.heroFacing * bScale;
            this.heroModel.group.scale.y = bScale;
            this.heroModel.group.scale.z = bScale;
          }
        }
      }

      this.heroAtkTimer = (this.heroAtkTimer || 0) - dt;
      if (this.heroAtkTimer <= 0) {
        this.heroAtkTimer = this.heroAtkInterval || 0.85;
        this.heroCombos = (this.heroCombos || 0) + 1;
        this.heroOutOfCombatTimer = 4.0;
        this.heroAttackAnim = 0.35;

        const isCombo = this.heroCombat?.tripleThrust && (this.heroCombos % 4 === 0);
        if (isCombo) {
          // 赵云专属：第 4 击连捅三枪
          this.heroTripleThrust = {
            target,
            timer: 0,
            totalDuration: 0.65,
            hitsDone: 0
          };
          this.heroAtkTimer = 0.95;
          this.heroAttackAnim = 0;
        } else {
          this.heroAttackAnim = 0.35;
          this.heroBasicAttack(target);
        }
      }
    }
  },

  // 十二将通用普攻：近战/远程、顺劈、穿透、减速、吸血、处决、击杀回令
  heroBasicAttack(target) {
    if (!target || !target.alive) return;
    const c = this.heroCombat || {};
    const src = this.getHeroTargetObj();
    const wasStealth = (this.heroStealthT || 0) > 0;
    let mul = 1;

    // 孙武：潜行首击背刺
    if (wasStealth && c.stealth && c.backstab > 1) mul *= c.backstab;
    // 霍去病：连续移动蓄势后的冲锋重击
    if (c.chargeCrit && (this.heroChargeT || 0) >= 1.5) {
      mul *= c.chargeCrit;
      this.heroChargeT = 0;
      if (this.ui && this.ui.toast) this.ui.toast('奔袭蓄势 · 三倍暴击');
    }
    // 关羽：三刀一刀意，拖刀斩
    if (this.heroId === 'guanyu') {
      this.guanyuStacks = (this.guanyuStacks || 0) + 1;
      if (this.guanyuStacks >= 3) {
        mul *= 2;
        this.guanyuStacks = 0;
        if (this.effects) this.effects.dust(target.x, target.z, 8, 1.4);
      }
    }

    const dmg = this.heroAtk * mul;
    const wasAlive = target.alive;
    this.applyDamage(target, dmg, src);

    // 顺劈（关羽）：目标周围一圈分担
    if (c.cleave) {
      for (const e of this.entities) {
        if (!e.alive || e.side !== 'enemy' || e === target || e.stealth > 0) continue;
        if (Math.hypot(e.x - target.x, (e.z || 0) - (target.z || 0)) <= c.cleave) {
          this.applyDamage(e, dmg * (c.cleaveRatio || 0.6), src);
        }
      }
    }
    // 穿透（李白）：沿目标方向再穿 N 个
    if (c.pierce) {
      const list = this.entities
        .filter((e) => e.alive && e.side === 'enemy' && e !== target && e.stealth <= 0)
        .filter((e) => Math.hypot(e.x - this.heroX, (e.z || 0) - this.heroZ) <= (c.range + 1.5))
        .sort((a, b) => Math.abs(a.x - this.heroX) - Math.abs(b.x - this.heroX))
        .slice(0, c.pierce);
      for (const e of list) this.applyDamage(e, dmg * 0.8, src);
    }
    // 减速（貂蝉）
    if (c.slow && target.alive) {
      target.buffs.slow = Math.max(target.buffs.slow || 0, 2.0);
      target.buffs.slowFactor = Math.max(target.buffs.slowFactor || 0, c.slow);
    }
    // 吸血（吕布）
    if (c.lifesteal) {
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + dmg * c.lifesteal);
      if (this.effects) this.effects.heal(this.heroX, 1.0, this.heroZ);
    }
    // 击杀回令（韩信）
    if (!target.alive && wasAlive && c.killEnergy) {
      this.energy = Math.min(this.energyMax, this.energy + c.killEnergy);
    }

    this.heroStealthT = 0;
    this.heroOutOfCombatTimer = 4.0;
    this.addHeroInBattleXp(1);
    if (!this.heroSkillAnim && (this.heroSuperCharge || 0) < 100) {
      this.heroSuperCharge = Math.min(100, (this.heroSuperCharge || 0) + 5);
    }

    const VFX = { jade: 0x7fb3a5, red: 0xb23a2f, gold: 0xc9a25e, dust: 0x8a7a5a, pink: 0xd86a78, glaive: 0x3f8a5a, ink: 0x2a2a24 };
    const col = VFX[c.vfx] || 0x7fb3a5;
    if (this.effects) {
      const px = (this.heroX + target.x) / 2;
      this.effects.slash(px, 1.15, target.z || 0, Math.random() * 0.4 - 0.2, col, c.ranged ? 1.25 : 1.0);
    }
    if (c.audio === 'bow') audio.bow();
    else if (c.audio === 'gong') audio.gong(null, 0.8);
    else if (c.audio === 'spear') audio.spear();
    else audio.sword();
  },

  damageHero(rawDmg, attacker, opts = {}) {
    if (!this.isHeroAlive()) {
      if (attacker && attacker.target && (attacker.target.isHero || attacker.target === this._heroTargetObj)) {
        attacker.target = null;
        attacker.attackAnim = 0;
      }
      return;
    }
    this.heroOutOfCombatTimer = 4.0;

    // 待命状态受到攻击主动迎战反击：将攻击者锁定为交战目标迎击
    if (attacker && attacker.alive && attacker.side === 'enemy' && !this.heroMovingToRally) {
      const rallyX = this.heroRallyX ?? this.heroX;
      const rallyZ = this.heroRallyZ ?? this.heroZ;
      const distFromRally = Math.hypot(attacker.x - rallyX, ((attacker.z || 0) - rallyZ) * 1.35);
      if (distFromRally <= (this.heroLeashRadius || 4.2)) {
        this.heroEngageTarget = attacker;
      }
    }

    const armor = opts.ignoreArmor ? 0 : Math.max(0, this.heroArmor != null ? this.heroArmor : 10);
    let amount = rawDmg * (100 / (100 + armor));
    this.heroStealthT = 0;

    const combat = this.heroCombat || {};
    // 蒙恬「坚壁」：自带 20% 减伤护体
    if (combat.shield) amount *= (1 - combat.shield);
    // 武则天「无字碑」：近战攻击者受到 30% 真实反伤
    if (combat.thorns && attacker && attacker.alive && attacker.side === 'enemy'
        && Math.hypot(attacker.x - this.heroX, (attacker.z || 0) - this.heroZ) <= 2.6) {
      this.applyDamage(attacker, amount * combat.thorns, this.getHeroTargetObj(), { projectile: true });
      if (this.effects) this.effects.shield(this.heroX, 1.0, this.heroZ, 0xd8b25a);
    }
    // 诸葛亮「拂袖」：近身者被弹开 3 格并减速，6 秒内置冷却
    if (combat.meleePush && attacker && attacker.alive && (this.heroPushCd || 0) <= 0
        && Math.hypot(attacker.x - this.heroX, (attacker.z || 0) - this.heroZ) <= 2.4) {
      this.heroPushCd = 6.0;
      const dir = attacker.x >= this.heroX ? 1 : -1;
      attacker.x = Math.min(12.5, attacker.x + dir * combat.meleePush);
      attacker.buffs.slow = Math.max(attacker.buffs.slow || 0, 3.0);
      attacker.buffs.slowFactor = Math.max(attacker.buffs.slowFactor || 0, 0.5);
      if (this.effects) this.effects.inkBurst(this.heroX, 1.0, this.heroZ, 10, 0x8a8478, 1.0);
    }

    // 荒野乱斗专属被动【一身是胆】（3级解锁）：生命低于 50% 时受到伤害降低 25%
    if (this.isPassiveUnlocked && this.isPassiveUnlocked()) {
      if ((this.heroHp / Math.max(1, this.heroMaxHp)) <= 0.50) {
        amount *= 0.75;
      }
    }

    this.heroHp = Math.max(0, this.heroHp - amount);
    this.heroHitFlash = 1.0;

    if (this.effects) {
      this.effects.blood(this.heroX, 1.3, this.heroZ, 2);
    }
    if (this.dmgText) {
      this.dmgText.spawn({
        x: this.heroX,
        y: 2.10, // 抬高至 1.3 倍英雄头顶飘字
        z: this.heroZ,
        amount,
        type: 'normal',
        isReduced: armor > 0,
      });
    }
    if (amount > 180) {
      this.scene.screenShake(0.12, 0.15);
    }

    if (this.heroHp <= 0) {
      this.killHero();
    }
  },

  killHero() {
    try {
      this.heroHp = 0;
      this.heroRespawnTimer = 15.0; // 15秒倒计时
      this.heroEngageTarget = null;
      this.heroMovingToTarget = false;
      this.heroMovingToRally = false;
      this.heroAttackAnim = 0;
      this.heroTripleThrust = null;
      this.pendingSkill = null;
      this.heroSkillAnim = null;

      if (this._heroTargetObj) {
        try {
          this._heroTargetObj.hp = 0;
        } catch (e) {}
      }

      // 释放阻挡的所有敌军并彻底清除对英雄的锁定与攻击动作，避免围着尸体空砍
      if (this.heroBlockedFoes) {
        for (const foe of this.heroBlockedFoes) {
          foe.heroBlockedBy = null;
          if (foe.target && (foe.target.isHero || foe.target === this._heroTargetObj)) {
            foe.target = null;
            foe.attackAnim = 0;
          }
        }
        this.heroBlockedFoes.clear();
      }

      // 战场所有敌方实体视英雄为死亡，解除锁定并重寻目标向前推进
      if (this.entities) {
        for (const e of this.entities) {
          if (e.heroBlockedBy) e.heroBlockedBy = null;
          if (e.target && (e.target.isHero || e.target === this._heroTargetObj)) {
            e.target = null;
            e.attackAnim = 0;
          }
          if (e.sniperTarget && (e.sniperTarget.isHero || e.sniperTarget === this._heroTargetObj)) {
            e.sniperTarget = null;
          }
        }
      }

      // 模型转化为战跪力竭姿态（按指示保持100%实体不透明，不使用半透明）
      if (this.heroModel) {
        if (this.heroModel.body) {
          this.heroModel.body.position.y = -0.32;
          this.heroModel.body.rotation.x = 0.45;
        }
        if (this.heroModel.weaponPivot) {
          this.heroModel.weaponPivot.position.y = 0.35;
          this.heroModel.weaponPivot.rotation.z = -1.45;
        }
      }

      if (this.heroHpBar && this.heroHpBar.group) {
        this.heroHpBar.group.visible = false;
      }

      if (this.effects) {
        this.effects.death(this.heroX, 1.0, this.heroZ, 0x64748b, false);
        this.effects.dust(this.heroX, this.heroZ, 10, 1.8);
      }
      // 武则天「无字天碑」：阵亡后原地留碑，8 秒内持续震击
      if (this.heroCombat && this.heroCombat.deathStele) {
        this.heroWuzetianStele = { x: this.heroX, z: this.heroZ, t: 8, tick: 0.5 };
        if (this.effects) {
          this.effects.ring(this.heroX, 0.2, 0xd8b25a, 0.5, 4.5, 0.8, 0.9);
          this.effects.inkBurst(this.heroX, 1.0, this.heroZ, 14, 0xd8b25a, 1.4);
        }
      }
      audio.explosion();
      if (this.ui && this.ui.showBattleBanner) {
        const nm = (this.heroData && this.heroData.name) || '主将';
        this.ui.showBattleBanner('力竭退场', `${nm}退场蓄势，15秒后重聚战意！`, 2200);
      }
    } catch (err) {
      console.error('killHero error caught:', err);
    }
  },

  reviveHero() {
    try {
      this.heroHp = this.heroMaxHp;
      this.heroRespawnTimer = 0;
      this.heroOutOfCombatTimer = 4.0;
      this.heroEngageTarget = null;
      this.heroMovingToTarget = false;
      this.heroMovingToRally = false;
      this.heroAttackAnim = 0;
      this.heroTripleThrust = null;

      if (this._heroTargetObj) {
        try {
          this._heroTargetObj.hp = this.heroMaxHp;
        } catch (e) {}
      }

      // 恢复模型材质与站姿
      if (this.heroModel) {
        this.heroModel.group.traverse((n) => {
          if (n.isMesh && n.material) {
            n.material = toonMaterial;
          }
        });
        if (this.heroModel.body) {
          this.heroModel.body.position.set(0, 0, 0);
          this.heroModel.body.rotation.set(0, 0, 0);
        }
        if (this.heroModel.weaponPivot) {
          const scale = (this.heroData.look && this.heroData.look.size) || 1.30;
          this.heroModel.weaponPivot.position.set(0.33 * scale, 1.0 * scale, 0.04);
          this.heroModel.weaponPivot.rotation.set(0, 0, -0.10);
        }
      }

      audio.gong(null, 1.25);
      audio.drum(null, true, 0.5);
      if (this.effects) {
        this.effects.inkBurst(this.heroX, 1.2, this.heroZ, 20, 0xc9a25e, 2.2);
        this.effects.ring(this.heroX, this.heroZ, 0xc9a25e, 0.8, 5.0, 0.8, 0.95);
      }
      this.scene.screenShake(0.28, 0.35);
      if (this.ui && this.ui.showBattleBanner) {
        this.ui.showBattleBanner('真龙再临', '常山赵子龙重返沙场！', 2200);
      }
    } catch (err) {
      console.error('reviveHero error caught:', err);
    }
  },

  addHeroInBattleXp(n) {
    if (this.heroInBattleLevel >= 5) return;
    const thresholds = [0, 20, 50, 95, 150];
    this.heroInBattleXp = (this.heroInBattleXp || 0) + n;
    while (this.heroInBattleLevel < 5 && this.heroInBattleXp >= thresholds[this.heroInBattleLevel]) {
      this.heroInBattleLevel++;
      // 局内每级提升基础数值的 10%
      const inBattleMul = 1 + (this.heroInBattleLevel - 1) * 0.10;
      this.heroMaxHp = Math.round(this.heroBaseMaxHp * inBattleMul);
      this.heroHp = this.heroMaxHp; // 升阶瞬间回满生命
      this.heroAtk = Math.round(this.heroBaseAtk * inBattleMul);
      this.heroArmor = Math.round(this.heroBaseArmor * inBattleMul);
      if (this.effects) {
        this.effects.ring(this.heroX, this.heroZ, 0xc9a25e, 0.8, 5.5, 0.8, 0.95);
        this.effects.inkBurst(this.heroX, 1.2, this.heroZ, 16, 0xc9a25e, 1.8);
      }
      audio.gong(null, 1.1 + this.heroInBattleLevel * 0.05);
      this.ui.showBattleBanner(`战阵升阶 Lv.${this.heroInBattleLevel}`, `${this.heroData?.name || '主将'}攻防生命跃升 (+${(this.heroInBattleLevel - 1) * 10}%)！生命值已全额回满！`, 2200);
      if (this.updateHeroHealthBar) this.updateHeroHealthBar(0.016);
    }
  }
,

  // ---------- 首领技能 ----------
};


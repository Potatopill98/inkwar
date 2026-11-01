import * as THREE from '../../lib/three.module.js';
import { MAX_UNITS_PER_SIDE } from './constants.js?v=1.93';
import { getUnit } from '../data/units.js?v=1.93';
import { audio } from '../audio.js?v=1.93';
import { PADS } from '../scene.js?v=1.93';
// 战斗 · 出阵：卡牌选择、落点校验、术法释放、延迟打击
export const battleDeploy = {
  getCardCost(card) {
    if (!card || !card.unit) return 0;
    let cost = card.unit.cost;
    if (this.isEndless && this.endlessBuffs && this.endlessBuffs.costReduction) {
      cost = Math.max(1, cost - this.endlessBuffs.costReduction);
    }
    return cost;
  },

  getCardCooldown(card) {
    if (!card || !card.total) return 0;
    let cd = card.total;
    if (this.isEndless && this.endlessBuffs && this.endlessBuffs.cardCdReduction) {
      cd = Math.max(1.0, cd * (1 - this.endlessBuffs.cardCdReduction));
    }
    return cd;
  },

  selectCard(id) {
    if (this.state !== 'running' || this.paused) return false;
    if (this.tutorial && this.tutorial.isCardRestricted && this.tutorial.isCardRestricted(id)) {
      const tip = this.tutorial.getRestrictedTip(id);
      if (tip) this.ui.toast(tip);
      if (audio.error) audio.error();
      return false;
    }
    const card = this.cards.find((c) => c.unit.id === id);
    if (!card) return false;
    if (this.selectedCard === id) {
      this.selectedCard = null;
      this.scene.showDeploy(false);
      audio.click();
      return true;
    }
    if (card.lock > 0) {
      audio.error();
      this.ui.toast(`术法蓄势中（${Math.ceil(card.lock)}s）`);
      return false;
    }
    if (card.cd > 0) {
      audio.error();
      this.ui.toast('这张卡还在冷却');
      return false;
    }
    if (this.energy < this.getCardCost(card)) {
      audio.error();
      this.ui.toast('军令不足');
      return false;
    }
    this.selectedCard = id;
    this.scene.showDeploy(true, !!card.unit.building, !!card.unit.spell);
    audio.select();
    this.event('cardSelected', { id });
    return true;
  },


  deployAt(x, z) {
    const card = this.cards.find((c) => c.unit.id === this.selectedCard);
    if (!card) return;
    if (card.cd > 0 || card.lock > 0 || this.energy < this.getCardCost(card)) {
      audio.error();
      return;
    }
    const unit = card.unit;
    if (unit.spell) {
      // 术法：全场任意点释放（design §3.3.1），朱砂法阵预警 0.3s 后生效
      const cx = THREE.MathUtils.clamp(x, -15, 14.5);
      const cz = THREE.MathUtils.clamp(z, -3.2, 3.2);
      const actualCost = this.getCardCost ? this.getCardCost(card) : unit.cost;
      this.energy -= actualCost;
      card.cd = this.getCardCooldown ? this.getCardCooldown(card) : card.total;
      this.selectedCard = null;
      this.scene.showDeploy(false);
      this.spellCastT = 0.42;
      const r = (unit.spellFx && unit.spellFx.radius) || 2.5;
      this.effects.ring(cx, cz, 0xb23a2f, 0.4, r * 0.9, 0.42, 0.8);
      this.pendingCasts.push({ t: 0.3, spell: unit, x: cx, z: cz });
      audio.skill();
      this.event('spellCast', { id: unit.id });
      if (this.onBountyEvent) {
        this.onBountyEvent('deploy', 1);
        this.onBountyEvent('energy', actualCost);
      }
      audio.vibrate(12);
      return;
    }
    if (unit.building) {
      let best = null;
      let bestDist = 2.3;
      for (const p of PADS) {
        const d = Math.abs(p.x - x) + Math.abs(p.z - z) * 0.5;
        if (d < bestDist && !this.padOccupied(p)) {
          best = p;
          bestDist = d;
        }
      }
      if (!best) {
        audio.error();
        this.ui.toast('请选择空置的军阵位');
        return;
      }
      this.spawnPlayerBuilding(unit, best);
      this.effects.ring(best.x, best.z, 0xc9a25e, 0.5, 2.2, 0.6);
    } else {
      if (x > this.level.deployMaxX + 1.2 || x < this.level.deployMinX - 1.2) {
        audio.error();
        this.ui.toast('只能在左侧布阵区落兵');
        return;
      }
      // 新手教程智能吸附与宽容部署：若处于引导出兵环节且兵种匹配，自动对齐到推荐阵位，绝不卡死玩家
      if (this.tutorial && this.tutorial.waiting && this.tutorial.current && this.tutorial.current.targetKind === 'zone') {
        const tutStep = this.tutorial.current;
        if (tutStep.unit && tutStep.unit === unit.id) {
          // 智能吸附到推荐坐标
          if (tutStep.targetWorld) {
            x = tutStep.targetWorld.x;
            z = tutStep.targetWorld.z || 0;
          }
        } else if (this.tutorial.isZoneRestricted && this.tutorial.isZoneRestricted(unit.id, x, z)) {
          if (audio.error) audio.error();
          return;
        }
      } else if (this.tutorial && this.tutorial.isZoneRestricted && this.tutorial.isZoneRestricted(unit.id, x, z)) {
        if (audio.error) audio.error();
        return;
      }
      const liveTroops = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building).length;
      if (liveTroops >= MAX_UNITS_PER_SIDE) {
        audio.error();
        this.ui.toast('兵力已满，先让前线接敌');
        return;
      }
      const cx = THREE.MathUtils.clamp(x, this.level.deployMinX, this.level.deployMaxX);
      this.spawnPlayerTroops(unit, cx, THREE.MathUtils.clamp(z, -2.4, 2.4));
      this.spawnNecroEscorts(unit, cx, THREE.MathUtils.clamp(z, -2.4, 2.4));
      this.effects.ring(cx, z, 0x4b7a6a, 0.4, 1.8, 0.5, 0.5);
    }
    const actualCost = this.getCardCost ? this.getCardCost(card) : unit.cost;
    this.energy -= actualCost;
    card.cd = this.getCardCooldown ? this.getCardCooldown(card) : card.total;
    this.selectedCard = null;
    this.scene.showDeploy(false);
    audio.deploy(!!unit.building);
    this.event('deployed', { id: unit.id });
    if (this.onBountyEvent) {
      this.onBountyEvent('deploy', 1);
      this.onBountyEvent('energy', actualCost);
    }
    audio.vibrate(8);
  },


  padOccupied(pad) {
    return this.entities.some((e) => e.alive && e.kind === 'building' && e.side === 'player'
      && Math.abs(e.x - pad.x) < 0.6 && Math.abs(e.z - pad.z) < 0.6);
  },


  spawnPlayerTroops(unit, x, z) {
    const count = unit.count || 1;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 1.0;
      const zOffset = count > 1 ? (i % 2 === 0 ? -0.7 : 0.7) : 0;
      this.createEntity({
        unit, side: 'player', x: x + offset - 0.3, z: z + zOffset + (Math.random() - 0.5) * 0.35,
        hpMul: this.playerHpMul(unit), atkMul: this.playerAtkMul(unit), kind: 'unit',
      });
    }
  },


  // 半仙出阵：随行三名僵尸护卫（属性等同乡勇）
  spawnNecroEscorts(unit, x, z) {
    if (!unit || unit.special !== 'necro') return;
    const zu = getUnit(unit.fx?.zombie || 'zombie');
    const n = unit.fx?.zombieCount ?? 3;
    for (let i = 0; i < n; i++) {
      this.createEntity({
        unit: zu, side: 'player', x: x - 0.8 + i * 0.8, z: z + (i - 1) * 0.7,
        hpMul: this.playerHpMul(zu), atkMul: this.playerAtkMul(zu), kind: 'unit', summoned: true,
      });
    }
    if (this.effects) this.effects.inkBurst(x, 0.5, z, 10, 0x3f4a5a, 0.9);
  }
,

  spawnPlayerBuilding(unit, pad) {
    this.createEntity({
      unit, side: 'player', x: pad.x, z: pad.z, kind: 'building',
      hpMul: this.playerHpMul(unit), atkMul: this.playerAtkMul(unit), kindBuilding: true,
    });
  },


  applySpell(spell, x, z) {
    const fx = spell.spellFx || {};
    const color = spell.color || 0xb23a2f;
    const src = this.skillDamageSource();
    switch (fx.type) {
      case 'heal': {
        this.effects.ring(x, z, color, 0.5, fx.radius, 0.8, 0.9);
        this.effects.sunWheel(x, 1.6, z, color);
        for (const e of this.entities) {
          if (!e.alive || e.side !== 'player') continue;
          if (Math.hypot(e.x - x, e.z - z) > fx.radius) continue;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (fx.heal || 0.35));
          e.buffs.slow = 0;
          e.buffs.slowFactor = 0;
          this.effects.inkBurst(e.x, 1.4, e.z, 5, 0x7fb3a5, 0.7);
        }
        audio.heal();
        break;
      }
      case 'arrowrain': {
        const waves = fx.waves || 3;
        for (let w = 0; w < waves; w++) {
          this.delayedStrikes.push({
            t: 0.05 + w * 0.42, x, z, side: 'player',
            damage: fx.damage || 140, area: fx.radius || 4, zr: fx.radius || 4,
            color: 0x3a5a6a,
          });
        }
        audio.bow();
        break;
      }
      case 'burn': {
        this.skillZones.push({
          x, z, rx: fx.radius || 3.5, rz: (fx.radius || 3.5) * 0.8,
          dps: fx.dps || 60, slow: fx.slow || 0, life: fx.duration || 6, acc: 0,
        });
        this.effects.fireField(x, z, fx.radius || 3.5, (fx.radius || 3.5) * 0.8, fx.duration || 6, 0xd06a32, 0xc94f3d);
        this.effects.ring(x, z, color, 0.4, fx.radius || 3.5, 0.7, 0.8);
        audio.fire();
        break;
      }
      case 'thunder': {
        this.effects.strikeBeam(x, z, color);
        this.scene.screenShake(0.25, 0.35);
        for (const e of this.entities) {
          if (!e.alive || e.side !== 'enemy') continue;
          if (Math.hypot(e.x - x, e.z - z) > (fx.radius || 2.5)) continue;
          this.applyDamage(e, fx.damage || 500, src);
          if (fx.stun) e.buffs.stun = Math.max(e.buffs.stun, fx.stun);
        }
        audio.bossRoar();
        break;
      }
      case 'ambush': {
        const unit = getUnit(fx.unit || 'swordsman');
        const count = fx.count || 6;
        const radius = fx.radius || 2.8;
        const duration = 3.0; // 3 秒内持续出现
        this.effects.ring(x, z, color, 0.6, radius * 1.2, duration, 0.9);
        this.effects.pillar(x, z, 0x2a2a24, 4.5);
        this.ambushSpawners.push({
          x, z, radius, unit, total: count, spawned: 0,
          timer: 0, interval: duration / count, duration, side: 'player'
        });
        audio.deploy(false);
        break;
      }
      default:
        break;
    }
  },

    updateAmbushSpawners(dt) {
    if (!this.ambushSpawners) return;
    for (let i = this.ambushSpawners.length - 1; i >= 0; i--) {
      const sp = this.ambushSpawners[i];
      sp.timer += dt;
      sp.duration -= dt;
      while (sp.timer >= sp.interval && sp.spawned < sp.total) {
        sp.timer -= sp.interval;
        sp.spawned++;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * sp.radius;
        const sx = THREE.MathUtils.clamp(sp.x + Math.cos(angle) * dist, -14, 13);
        const sz = THREE.MathUtils.clamp(sp.z + Math.sin(angle) * dist * 0.6, -2.4, 2.4);
        this.createEntity({
          unit: sp.unit, side: sp.side, x: sx, z: sz, kind: 'unit',
          hpMul: this.playerHpMul(sp.unit), atkMul: this.playerAtkMul(sp.unit),
          summoned: true, summonStyle: 'emerge'
        });
        this.effects.summon(sx, sz, 0x2a2a24);
        audio.deploy(false);
      }
      if (sp.spawned >= sp.total || sp.duration <= 0) {
        this.ambushSpawners.splice(i, 1);
      }
    }
  },

updateSkillZones(dt) {
    for (let i = this.skillZones.length - 1; i >= 0; i--) {
      const zn = this.skillZones[i];
      zn.life -= dt;
      zn.acc += dt;
      while (zn.acc >= 0.5) {
        zn.acc -= 0.5;
        for (const e of this.entities) {
          if (!e.alive || e.side !== 'enemy') continue;
          if (Math.abs(e.x - zn.x) <= zn.rx && Math.abs(e.z - zn.z) <= zn.rz + 0.9) {
            if (zn.dps) this.applyDamage(e, zn.dps * 0.5, this.skillDamageSource());
            if (zn.slow) {
              e.buffs.slow = Math.max(e.buffs.slow, 0.7);
              e.buffs.slowFactor = Math.max(e.buffs.slowFactor, zn.slow);
            }
          }
        }
      }
      if (zn.life <= 0) this.skillZones.splice(i, 1);
    }
  },


  updateDelayedStrikes(dt) {
    for (let i = this.delayedStrikes.length - 1; i >= 0; i--) {
      const s = this.delayedStrikes[i];
      s.t -= dt;
      if (s.t <= 0) {
        if (s.followHero) s.x = this.heroX;
        const area = s.area || 1.6;
        for (const e of this.entities) {
          if (!e.alive || e.side === s.side) continue;
          const inRange = s.zr
            ? Math.hypot(e.x - s.x, e.z - s.z) <= s.zr
            : Math.abs(e.x - s.x) <= area;
          if (!inRange) continue;
          this.applyDamage(e, s.damage, { side: s.side, unit: { tags: [], special: 'none' }, auraAtk: 1, buffs: {} });
          if (s.slow) {
            e.buffs.slow = Math.max(e.buffs.slow, s.duration || 2);
            e.buffs.slowFactor = Math.max(e.buffs.slowFactor, s.slow);
          }
          if (s.stun) e.buffs.stun = Math.max(e.buffs.stun, s.stun);
          if (s.vuln && e.alive) {
            e.buffs.vuln = Math.max(e.buffs.vuln, s.vuln);
            e.buffs.vulnT = s.vulnDur || 4;
          }
          if (s.armorBreak && e.alive && !e.unit.building) {
            e.armorBreak = Math.min(24, (e.armorBreak || 0) + s.armorBreak);
          }
          if (s.knockback && e.alive && !e.unit.building && e.kind !== 'building') {
            e.x += s.side === 'player' ? s.knockback : -s.knockback;
            if (e.model) e.model.group.position.x = e.x;
          }
          if (s.fear) this.applyFear(e, 1.6, s.fear);
        }
        this.effects.slash(s.x, 1.2, s.z, 1.2, s.color || 'ink', s.color ? 2.4 : 1.5);
        this.effects.ring(s.x, s.z, typeof s.color === 'number' ? s.color : 0x4b7a6a, 0.2, 1.4, 0.35, 0.5);
        this.delayedStrikes.splice(i, 1);
      }
    }
  },

};


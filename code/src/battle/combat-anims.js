// 战斗单位攻击动作模块化驱动系统
// 为不同武器、兵种与攻击类型提供差异鲜明、动势强劲的国风武艺动画
import * as THREE from '../../lib/three.module.js';

export const ATTACK_STYLES = {
  THRUST: 'thrust',           // 迅猛直线突刺（长枪兵、陷阵营、兵马俑）
  CLEAVE: 'cleave',           // 大范围半月横扫（剑兵第3连斩、刀盾兵、刀盾首领）
  HEAVY_SLASH: 'heavySlash',  // 关羽式重型挥砍（陌刀兵：高举过顶、力劈华山）
  SLASH: 'slash',             // 斜劈斩击（剑兵常规、刀盾兵、乡勇、普通斧兵）
  SHIELD_BASH: 'shieldBash',  // 沉山盾击冲撞（盾兵、重甲盾卫）
  DUAL_DAGGER: 'dualDagger',  // 双刃伏击连刺（刺客、斥候）
  BOW_SHOOT: 'bowShoot',      // 侧身开弓搭箭回震（弓兵）
  CROSSBOW: 'crossbow',       // 强弩平射与强力后坐力（弩手、神臂弓手）
  THROW: 'throw',             // 弓身大臂后引前甩（投矛手、掷斧手、火油兵）
  CAST: 'cast',               // 名士拂扇施法（道士、谋士、军医）
  CHARGE_LANCE: 'chargeLance', // 骑兵长枪冲锋贯阵（轻骑兵、重骑兵、白马义从）
  RAM_SWING: 'ramSwing'       // 破城撞车吊锤后荡蓄力、万钧前撞（挂点为横梁 weaponPivot）
};

/** 破城撞杆挂点（与 models.js ramlog / createUnitModel 对齐） */
const RAM_PIVOT_Y = 1.52;

/**
 * 判定单位当前攻击所使用的动作类型
 */
export function getAttackStyle(e) {
  if (!e || !e.unit) return ATTACK_STYLES.SLASH;
  const unit = e.unit;
  const look = unit.look || {};
  const weapon = look.weapon;
  const special = unit.special;
  const tags = unit.tags || [];

  // 1. 骑兵冲锋阶段
  if (tags.includes('cavalry') && e.chargeReady) {
    return ATTACK_STYLES.CHARGE_LANCE;
  }

  // 纸鸢落地火铳形态：平举火铳射击（复用强弩平射后坐动作）
  if (special === 'kite' && e.form === 'gunner') {
    return ATTACK_STYLES.CROSSBOW;
  }

  // 破城撞车：吊锤摆动撞击
  if (special === 'ram') {
    return ATTACK_STYLES.RAM_SWING;
  }

  // 壁垒：巨躯重卫的沉猛锤击（仿力劈华山）
  if (special === 'bulwark') {
    return ATTACK_STYLES.HEAVY_SLASH;
  }

  // 2. 重型挥砍判定：陌刀兵（关羽式力劈华山）
  if (special === 'infantryBonus') {
    return ATTACK_STYLES.HEAVY_SLASH;
  }
  // 大范围横扫判定：剑兵第3连击(cleave3)、刀盾兵横扫(cleave2)、偃月刀首领
  if (special === 'cleave2') {
    return ATTACK_STYLES.CLEAVE;
  }
  if (special === 'cleave3' && e.comboCount && e.comboCount % 3 === 0) {
    return ATTACK_STYLES.CLEAVE;
  }
  if (weapon === 'glaive') {
    return ATTACK_STYLES.CLEAVE;
  }

  // 3. 长枪/长矛直线突刺判定
  if (weapon === 'spear' || weapon === 'halberd' || special === 'anticav') {
    return ATTACK_STYLES.THRUST;
  }

  // 4. 重盾冲撞防御判定
  if (weapon === 'shield' || special === 'taunt' || special === 'rangedReduce') {
    return ATTACK_STYLES.SHIELD_BASH;
  }

  // 5. 刺客双刃连刺判定
  if (weapon === 'dagger' || special === 'assassin' || special === 'mark') {
    return ATTACK_STYLES.DUAL_DAGGER;
  }

  // 6. 强反曲战弓
  if (weapon === 'bow') {
    return ATTACK_STYLES.BOW_SHOOT;
  }

  // 7. 机械弩/神臂弩判定
  if (weapon === 'crossbow' || special === 'sniper' || special === 'armorPierce') {
    return ATTACK_STYLES.CROSSBOW;
  }

  // 8. 投掷类武器（标枪、飞斧、陶罐）
  if (weapon === 'javelin' || unit.projectile === 'axe' || unit.projectile === 'oil' || look.offhand === 'pot') {
    return ATTACK_STYLES.THROW;
  }

  // 9. 策士施法/摇扇/符文
  if (weapon === 'staff' || weapon === 'fan' || special === 'medic' || special === 'slowRoot' || special === 'debuff') {
    return ATTACK_STYLES.CAST;
  }

  // 10. 默认单手刀剑斩击
  return ATTACK_STYLES.SLASH;
}

/**
 * 获取每类攻击动作的最佳时长（秒）
 */
export function getAttackDuration(style, e) {
  // 兵种数据可覆盖：陌刀兵出手 0.8 秒
  if (e && e.unit && e.unit.attackDuration) return e.unit.attackDuration;
  // 纸鸢火铳：开火顿挫干脆
  if (e && e.form === 'gunner') return 0.4;
  switch (style) {
    case ATTACK_STYLES.THRUST: return 0.28;
    case ATTACK_STYLES.CLEAVE: return 0.35;
    case ATTACK_STYLES.HEAVY_SLASH: return 0.8;
    case ATTACK_STYLES.SLASH: return 0.24;
    case ATTACK_STYLES.SHIELD_BASH: return 0.30;
    case ATTACK_STYLES.DUAL_DAGGER: return 0.22;
    case ATTACK_STYLES.BOW_SHOOT: return 0.32;
    case ATTACK_STYLES.CROSSBOW: return 0.25;
    case ATTACK_STYLES.THROW: return 0.32;
    case ATTACK_STYLES.CAST: return 0.34;
    case ATTACK_STYLES.CHARGE_LANCE: return 0.36;
    default: return 0.25;
  }
}

/**
 * 缓动工具函数
 */
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}
function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/**
 * 核心驱动：在攻击动画生命周期内，精确更新 weaponPivot 与 body 的空间坐标与旋转
 * @param {object} e 战斗实体
 * @param {number} p 归一化进度 [0, 1]
 */
export function updateAttackAnimation(e, p) {
  if (!e.weaponPivot || !e.model || !e.model.body) return;

  const style = e.currentAttackStyle || ATTACK_STYLES.SLASH;
  const scale = (e.unit.look && e.unit.look.size) || 1;
  const wp = e.weaponPivot;
  const body = e.model.body;

  // 基准挂点位置
  const baseX = 0.33 * scale;
  const baseY = 1.0 * scale;
  const baseZ = 0.04;

  switch (style) {
    // ------------------------------------------------------------------------
    // 1. 突刺（THRUST）：后收引枪 → 闪电般暴刺穿心 → 顿笔微震 → 从容收枪
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.THRUST: {
      if (p < 0.25) {
        // 阶段一：长枪迅速压平，向后收枪蓄势
        const t = p / 0.25;
        wp.rotation.z = -0.10 + (-1.57 - (-0.10)) * easeOutQuad(t);
        wp.rotation.y = 0;
        wp.rotation.x = 0;
        wp.position.x = baseX - 0.16 * scale * t;
        wp.position.y = baseY;
        wp.position.z = baseZ;
        body.position.x = -0.08 * t;
        body.rotation.y = -0.18 * t;
        body.rotation.z = 0.05 * t;
      } else if (p < 0.55) {
        // 阶段二：雷霆一刺！长枪凶猛向前贯穿伸出超过半米
        const t = (p - 0.25) / 0.30;
        const et = easeOutQuad(t);
        wp.rotation.z = -1.57;
        wp.position.x = (baseX - 0.16 * scale) + (0.76 * scale) * et;
        wp.position.y = baseY;
        wp.position.z = baseZ;
        // 身体弓步大步前冲送胯
        body.position.x = -0.08 + 0.36 * et;
        body.rotation.y = -0.18 + 0.42 * et;
        body.rotation.z = 0.05 - 0.18 * et;
      } else if (p < 0.70) {
        // 阶段三：刺中极点，顿笔微震
        const t = (p - 0.55) / 0.15;
        const jitter = Math.sin(t * Math.PI * 4) * 0.025;
        wp.rotation.z = -1.57 + jitter;
        wp.position.x = baseX + 0.60 * scale;
        body.position.x = 0.28;
      } else {
        // 阶段四：从容收枪，由水平平滑归位
        const t = (p - 0.70) / 0.30;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.57 + (-0.10 - (-1.57)) * et;
        wp.position.x = (baseX + 0.60 * scale) - (0.60 * scale) * et;
        wp.position.y = baseY;
        body.position.x = 0.28 * (1 - et);
        body.rotation.y = 0.24 * (1 - et);
        body.rotation.z = -0.13 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 2. 大横扫（CLEAVE）：刀擎右后上方 → 180度半月狂澜腰斩 → 沉步回旋
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.CLEAVE: {
      if (p < 0.28) {
        // 阶段一：高举引刀蓄势
        const t = p / 0.28;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 + 0.55 * et;
        wp.rotation.y = -0.85 * et;
        wp.rotation.x = -0.30 * et;
        wp.position.x = baseX - 0.12 * scale * et;
        wp.position.y = baseY + 0.14 * scale * et;
        body.position.y = -0.06 * et; // 沉腰蓄势
        body.position.x = -0.06 * et;
        body.rotation.y = -0.45 * et;
      } else if (p < 0.65) {
        // 阶段二：腰马合一，怒扫千军！横向划出大半圆弧面
        const t = (p - 0.28) / 0.37;
        const et = easeOutQuad(t);
        wp.rotation.z = 0.45 - 1.80 * et; // 自上斜下劈斩
        wp.rotation.y = -0.85 + 2.05 * et; // 自后向前猛烈横扫 120 度！
        wp.rotation.x = -0.30 + 0.50 * et;
        wp.position.x = (baseX - 0.12 * scale) + 0.42 * scale * et;
        wp.position.y = (baseY + 0.14 * scale) - 0.22 * scale * et;
        body.position.x = -0.06 + 0.32 * et;
        body.position.y = -0.06 + 0.02 * et;
        body.rotation.y = -0.45 + 0.95 * et; // 身体大回旋
        body.rotation.z = -0.12 * Math.sin(t * Math.PI);
      } else {
        // 阶段三：借斩势平稳收刀
        const t = (p - 0.65) / 0.35;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.35 + (-0.10 - (-1.35)) * et;
        wp.rotation.y = 1.20 * (1 - et);
        wp.rotation.x = 0.20 * (1 - et);
        wp.position.x = (baseX + 0.30 * scale) - 0.30 * scale * et;
        wp.position.y = (baseY - 0.08 * scale) + 0.08 * scale * et;
        body.position.x = 0.26 * (1 - et);
        body.position.y = -0.04 * (1 - et);
        body.rotation.y = 0.50 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 3. 重盾撞击（SHIELD_BASH）：盾牌微收贴身 → 坚壁怒撞 → 顿挫轰击
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.SHIELD_BASH: {
      if (p < 0.25) {
        const t = p / 0.25;
        wp.position.x = baseX - 0.12 * scale * t;
        wp.rotation.z = -0.10 - 0.15 * t;
        body.position.x = -0.08 * t;
        body.position.y = -0.05 * t; // 屈膝蓄势
      } else if (p < 0.60) {
        const t = (p - 0.25) / 0.35;
        const et = easeOutQuad(t);
        // 整面重盾凶悍前推 +0.55m
        wp.position.x = (baseX - 0.12 * scale) + 0.58 * scale * et;
        wp.position.y = baseY;
        wp.rotation.z = -0.25;
        wp.rotation.y = 0.15 * Math.sin(t * Math.PI);
        body.position.x = -0.08 + 0.34 * et; // 身随盾撞
        body.position.y = -0.05 + 0.03 * et;
        body.rotation.z = -0.10 * et;
      } else {
        const t = (p - 0.60) / 0.40;
        const et = easeInOutQuad(t);
        wp.position.x = (baseX + 0.46 * scale) - 0.46 * scale * et;
        wp.rotation.z = -0.25 + 0.15 * et;
        body.position.x = 0.26 * (1 - et);
        body.rotation.z = -0.10 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 4. 双刃连刺（DUAL_DAGGER）：身形下潜潜伏 → 疾速刺抹双连杀
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.DUAL_DAGGER: {
      if (p < 0.20) {
        const t = p / 0.20;
        body.position.y = -0.12 * t; // 骤降重心
        body.position.x = -0.05 * t;
        wp.position.x = baseX - 0.10 * scale * t;
        wp.rotation.z = -0.10;
      } else if (p < 0.50) {
        // 第一击：直刺心窝
        const t = (p - 0.20) / 0.30;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 - 1.45 * et;
        wp.position.x = (baseX - 0.10 * scale) + 0.48 * scale * et;
        body.position.x = -0.05 + 0.28 * et;
        body.position.y = -0.12 + 0.08 * et;
      } else if (p < 0.75) {
        // 第二击：反手交错斜划
        const t = (p - 0.50) / 0.25;
        wp.rotation.z = -1.55 + 0.65 * Math.sin(t * Math.PI);
        wp.rotation.x = 0.60 * Math.sin(t * Math.PI);
        wp.position.x = baseX + 0.38 * scale - 0.10 * Math.sin(t * Math.PI);
        body.rotation.y = 0.30 * Math.sin(t * Math.PI);
      } else {
        const t = (p - 0.75) / 0.25;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.55 + 1.45 * et;
        wp.position.x = (baseX + 0.38 * scale) - 0.38 * scale * et;
        body.position.x = 0.23 * (1 - et);
        body.position.y = -0.04 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 5. 开弓搭箭（BOW_SHOOT）：侧身挺立瞄准 → 引弦拉满 → 撒放震颤回弹
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.BOW_SHOOT: {
      if (p < 0.50) {
        // 侧身引弓瞄准
        const t = p / 0.50;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 - 0.75 * et; // 弓臂侧斜指向前方
        wp.rotation.y = 0.38 * et;
        wp.position.x = baseX + 0.08 * scale * et;
        body.rotation.y = -0.32 * et; // 侧身拉弓站位
        body.position.x = -0.04 * et;
      } else if (p < 0.65) {
        // 撒放瞬间！弓臂受反弹力向前微震并抖动
        const t = (p - 0.50) / 0.15;
        const recoil = Math.sin(t * Math.PI * 4) * 0.06;
        wp.rotation.z = -0.85 + recoil;
        wp.position.x = baseX + 0.08 * scale + 0.08 * Math.sin(t * Math.PI);
        body.position.x = -0.04 + 0.04 * t;
      } else {
        // 抽箭复位
        const t = (p - 0.65) / 0.35;
        const et = easeInOutQuad(t);
        wp.rotation.z = -0.85 + 0.75 * et;
        wp.rotation.y = 0.38 * (1 - et);
        wp.position.x = (baseX + 0.08 * scale) - 0.08 * scale * et;
        body.rotation.y = -0.32 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 6. 强弩平射（CROSSBOW）：平端稳如磐石 → 扣发剧烈后坐力弹跳 → 稳重复位
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.CROSSBOW: {
      if (p < 0.20) {
        // 稳稳平端
        const t = p / 0.20;
        wp.rotation.z = -0.10 - 1.35 * t; // 水平端正
        wp.position.x = baseX + 0.05 * scale * t;
      } else if (p < 0.45) {
        // 扣发！强烈反作用力使弩机向后震退，枪口跳起
        const t = (p - 0.20) / 0.25;
        const kick = Math.sin(t * Math.PI);
        wp.rotation.z = -1.45 + 0.35 * kick;
        wp.position.x = baseX - 0.18 * scale * kick; // 猛烈后退
        body.position.x = -0.08 * kick;              // 身体后仰承受后坐力
        body.rotation.z = 0.06 * kick;
      } else {
        // 重新推入箭矢复位
        const t = (p - 0.45) / 0.55;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.45 + 1.35 * et;
        wp.position.x = baseX;
        body.position.x = 0;
        body.rotation.z = 0;
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 7. 投掷武器（THROW）：身躯后仰大步引拉 → 全身爆发向前甩投
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.THROW: {
      if (p < 0.35) {
        // 重心后拉，矛头指向斜后上方
        const t = p / 0.35;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 + 0.95 * et;
        wp.position.x = baseX - 0.22 * scale * et;
        wp.position.y = baseY + 0.12 * scale * et;
        body.position.x = -0.10 * et;
        body.rotation.z = 0.22 * et; // 舒展大后仰
        body.rotation.y = -0.25 * et;
      } else if (p < 0.65) {
        // 怒涛般向前甩射！
        const t = (p - 0.35) / 0.30;
        const et = easeOutQuad(t);
        wp.rotation.z = 0.85 - 2.25 * et; // 猛掷至前下
        wp.position.x = (baseX - 0.22 * scale) + 0.56 * scale * et;
        wp.position.y = (baseY + 0.12 * scale) - 0.24 * scale * et;
        body.position.x = -0.10 + 0.36 * et; // 顺势大跨步前倾
        body.rotation.z = 0.22 - 0.38 * et;
        body.rotation.y = -0.25 + 0.45 * et;
      } else {
        const t = (p - 0.65) / 0.35;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.40 + 1.30 * et;
        wp.position.x = (baseX + 0.34 * scale) - 0.34 * scale * et;
        wp.position.y = (baseY - 0.12 * scale) + 0.12 * scale * et;
        body.position.x = 0.26 * (1 - et);
        body.rotation.z = -0.16 * (1 - et);
        body.rotation.y = 0.20 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 8. 名士施法/摇扇（CAST）：衣袂飘飘长杖高扬 → 灵动拂拂拂开法阵
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.CAST: {
      if (p < 0.45) {
        const t = p / 0.45;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 - 0.65 * et;
        wp.rotation.y = 0.30 * et;
        wp.position.y = baseY + 0.15 * scale * et;
        body.position.y = 0.08 * et; // 仙风飘然凌虚起浮
        body.rotation.y = -0.20 * et;
      } else if (p < 0.75) {
        const t = (p - 0.45) / 0.30;
        const et = easeInOutQuad(t);
        wp.rotation.z = -0.75 - 0.55 * et; // 灵动前点
        wp.rotation.y = 0.30 - 0.60 * et;
        wp.position.x = baseX + 0.20 * scale * et;
        body.position.y = 0.08 - 0.04 * et;
        body.rotation.y = -0.20 + 0.45 * et;
      } else {
        const t = (p - 0.75) / 0.25;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.30 + 1.20 * et;
        wp.rotation.y = -0.30 * (1 - et);
        wp.position.x = baseX + 0.20 * scale * (1 - et);
        wp.position.y = baseY + 0.04 * (1 - et);
        body.position.y = 0.04 * (1 - et);
        body.rotation.y = 0.25 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 9. 骑兵冲锋刺（CHARGE_LANCE）：长枪放平死死锁定前方，连人带马极速贯阵
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.CHARGE_LANCE: {
      const thrust = Math.sin(Math.min(1, p * 1.5) * Math.PI);
      wp.rotation.z = -1.57; // 笔直水平挺枪
      wp.position.x = baseX + 0.75 * scale * thrust;
      wp.position.y = baseY - 0.06 * scale;
      body.position.x = 0.25 * thrust;
      body.rotation.z = -0.15 * thrust; // 骑手下俯疾驰
      break;
    }

    // ------------------------------------------------------------------------
    // 10. 重型挥砍（HEAVY_SLASH）：陌刀兵仿关羽「力劈华山」——高举过顶蓄势，全身前压贯落，沉刀收势
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.HEAVY_SLASH: {
      if (p < 0.42) {
        // 阶段一：双手举刀过顶，身体后仰蓄力（0.8 秒出手，慢而沉）
        const t = p / 0.42;
        const et = easeOutQuad(t);
        wp.rotation.z = -0.10 + 1.05 * et;
        wp.rotation.x = -0.28 * et;
        wp.rotation.y = 0.35 * et;
        wp.position.x = baseX - 0.16 * scale * et;
        wp.position.y = baseY + 0.34 * scale * et;
        body.position.x = -0.10 * et;
        body.position.y = -0.06 * et;
        body.rotation.z = 0.14 * et;
        body.rotation.y = -0.28 * et;
      } else if (p < 0.72) {
        // 阶段二：力劈华山！刀锋自上而下贯落，腰马前压
        const t = (p - 0.42) / 0.30;
        const et = easeOutQuad(t);
        wp.rotation.z = 0.95 - 3.30 * et;
        wp.rotation.x = -0.28 + 0.45 * et;
        wp.rotation.y = 0.35 - 0.60 * et;
        wp.position.x = (baseX - 0.16 * scale) + 0.72 * scale * et;
        wp.position.y = (baseY + 0.34 * scale) - 0.60 * scale * et;
        body.position.x = -0.10 + 0.46 * et;
        body.position.y = -0.06 + 0.02 * et;
        body.rotation.z = 0.14 - 0.44 * et;
        body.rotation.y = -0.28 + 0.10 * et;
      } else {
        // 阶段三：借余劲沉刀立势，平稳归位
        const t = (p - 0.72) / 0.28;
        const et = easeInOutQuad(t);
        wp.rotation.z = -2.35 + 2.25 * et;
        wp.rotation.x = 0.17 * (1 - et);
        wp.rotation.y = -0.25 * (1 - et);
        wp.position.x = (baseX + 0.56 * scale) - 0.56 * scale * et;
        wp.position.y = (baseY - 0.26 * scale) + 0.26 * scale * et;
        body.position.x = 0.36 * (1 - et);
        body.position.y = -0.04 * (1 - et);
        body.rotation.z = -0.30 * (1 - et);
        body.rotation.y = -0.18 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 11. 破城吊锤（RAM_SWING）：铁索巨锤向后荡起蓄力 → 万钧前撞 → 余摆衰减归位
    //     挂点固定于吊架横梁（0, 1.52, 0），整车随撞击轻微冲耸
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.RAM_SWING: {
      wp.position.set(0, RAM_PIVOT_Y, 0);
      wp.rotation.x = 0;
      wp.rotation.y = 0;
      if (p < 0.42) {
        // 阶段一：巨锤向后上方缓缓荡起，蓄万钧之势
        const t = easeOutQuad(p / 0.42);
        wp.rotation.z = -0.58 * t;
        body.position.x = -0.10 * t;
      } else if (p < 0.62) {
        // 阶段二：骤然前撞！巨锤越过垂点猛砸城门
        const t = easeOutQuad((p - 0.42) / 0.20);
        wp.rotation.z = -0.58 + 0.92 * t;
        body.position.x = -0.10 + 0.28 * t;
      } else {
        // 阶段三：余摆衰减，平稳归位
        const t = (p - 0.62) / 0.38;
        const et = easeInOutQuad(t);
        wp.rotation.z = 0.34 * (1 - et) + Math.sin(t * Math.PI * 2) * 0.05 * (1 - t);
        body.position.x = 0.18 * (1 - et);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 12. 默认斜劈挥砍（SLASH）：自右上向左下干净利落斩击
    // ------------------------------------------------------------------------
    case ATTACK_STYLES.SLASH:
    default: {
      if (p < 0.25) {
        const t = p / 0.25;
        wp.rotation.z = -0.10 + 0.35 * t;
        wp.rotation.x = -0.20 * t;
        wp.position.x = baseX - 0.06 * scale * t;
        body.position.x = -0.04 * t;
      } else if (p < 0.60) {
        const t = (p - 0.25) / 0.35;
        const et = easeOutQuad(t);
        wp.rotation.z = 0.25 - 1.60 * et; // 顺畅斜切下砍
        wp.rotation.x = -0.20 + 0.50 * et;
        wp.position.x = (baseX - 0.06 * scale) + 0.26 * scale * et;
        body.position.x = -0.04 + 0.22 * et;
        body.rotation.z = -0.10 * et;
      } else {
        const t = (p - 0.60) / 0.40;
        const et = easeInOutQuad(t);
        wp.rotation.z = -1.35 + 1.25 * et;
        wp.rotation.x = 0.30 * (1 - et);
        wp.position.x = (baseX + 0.20 * scale) - 0.20 * scale * et;
        body.position.x = 0.18 * (1 - et);
        body.rotation.z = -0.10 * (1 - et);
      }
      break;
    }
  }
}

/**
 * 待机/行走时武器与身体的专属姿态与呼吸微动
 */
export function applyIdlePose(e, dt, moving) {
  if (!e.weaponPivot) return;
  if (e.body && e.body.position.x !== 0) {
    e.body.position.x = 0;
  }

  const style = getAttackStyle(e);
  const scale = (e.unit.look && e.unit.look.size) || 1;
  const wp = e.weaponPivot;
  const phase = e.bobPhase || 0;

  const baseX = 0.33 * scale;
  const baseY = 1.0 * scale;
  const baseZ = 0.04;

  wp.position.set(baseX, baseY, baseZ);
  wp.rotation.x = 0;
  wp.rotation.y = 0;

  // 根据兵种武器特质赋予专属待机微动
  switch (style) {
    case ATTACK_STYLES.BOW_SHOOT:
      // 弓兵斜持战弓
      wp.rotation.z = -0.35 + Math.sin(phase * 0.4) * 0.03;
      break;
    case ATTACK_STYLES.CROSSBOW:
      // 弩手双手稳托机匣
      wp.rotation.z = -0.55 + Math.sin(phase * 0.3) * 0.02;
      break;
    case ATTACK_STYLES.CAST:
      // 谋士/道士羽扇轻摇
      wp.rotation.z = -0.20 + Math.sin(phase * 0.7) * 0.12;
      wp.rotation.y = Math.sin(phase * 0.7) * 0.08;
      break;
    case ATTACK_STYLES.SHIELD_BASH:
      // 盾兵大盾坚固护胸
      wp.rotation.z = -0.15 + Math.sin(phase * 0.3) * 0.02;
      break;
    default:
      // 刀枪直立微动
      wp.rotation.z = -0.10 + Math.sin(phase * 0.5) * 0.035;
      break;
  }
}

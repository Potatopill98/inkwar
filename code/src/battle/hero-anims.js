// 《墨阵山河》名将技能专属武道动作与位移动态系统 v1.38 (连续光滑平滑过渡版)
// 包含 37 位神将深度定制动作：零突变物理位移 (C0连续插值)、7段折返穿刺、跃空暴扣、三板斧连斩、弦音后坐力与高阶阻尼收式！

export const HERO_ANIM_TYPES = {
  HEAVY_SLASH: 'HEAVY_SLASH',
  SPEAR_THRUST: 'SPEAR_THRUST',
  STRATEGIST_FAN: 'STRATEGIST_FAN',
  SNIPER_BOW: 'SNIPER_BOW',
  CAULDRON_SMASH: 'CAULDRON_SMASH',
  IMPERIAL_COMMAND: 'IMPERIAL_COMMAND',
  SWORD_DANCE: 'SWORD_DANCE',
  WAR_DRUM: 'WAR_DRUM',
  LOTUS_DANCE: 'LOTUS_DANCE',
};

export function getHeroAnimType(hero) {
  if (!hero) return HERO_ANIM_TYPES.HEAVY_SLASH;
  return hero.id || HERO_ANIM_TYPES.HEAVY_SLASH;
}

// 缓动与线性插值工具函数
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInQuad(x) { return x * x; }
function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }

export const HERO_ANIM_CONFIGS = {
  // 1. 赵云：白龙破阵 · 七进七出（7 段银龙破阵瞬影折返疾刺，枪出如龙）
  zhaoyun: {
    windupDur: 0.22, impactDur: 0.70, recoverDur: 0.35,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.15 * p, liftY: -0.05 * p, scaleMul: 1.0 + 0.12 * p };
      if (phase === 'impact') {
        const seg = p * 7;
        const sub = seg % 1;
        const thrust = Math.sin(sub * Math.PI);
        // 原地七进七出枪出如龙：突刺冲击幅度 0.35m，始终与逻辑坐标物理对齐，彻底解决位移分离
        const lungeX = thrust * 0.35;
        const liftY = Math.sin(sub * Math.PI) * 0.08;
        return { lungeX, liftY, scaleMul: 1.18 };
      }
      return { lungeX: 0, liftY: 0, scaleMul: 1.0 };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.position.set(-0.28 * p, -0.08 * p, 0); body.rotation.set(0.12 * p, 0.45 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.33 - 0.48 * p, 0.85, 0); wp.rotation.set(0, 0, 0.95 * p); }
      } else if (phase === 'impact') {
        const seg = p * 7;
        const sub = (seg % 1);
        const thrust = Math.sin(sub * Math.PI);
        const dir = (Math.floor(seg) % 2 === 0 ? 1 : -0.7);
        if (body) { body.position.set(0.25 * thrust * dir, -0.05, 0); body.rotation.set(0.18 * thrust, -0.35 * thrust * dir, 0.45 * thrust); }
        if (wp) { wp.position.set(1.55 * thrust, 0.95, 0.04); wp.rotation.set(0, 0, -1.95 * thrust); }
        if (aura) { aura.scale.setScalar(2.8 + thrust * 0.4); aura.material.opacity = 1.0; }
      } else {
        if (body) { body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.0, 0.04); wp.rotation.set(0, 0, -0.10); }
      }
    }
  },

  // 2. 关羽：青龙显圣 · 偃月开天（拖刀狂奔，腾空 1.8 米，双臂合抱偃月刀力劈华山裂地）
  guanyu: {
    windupDur: 0.32, impactDur: 0.35, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.45 * p, liftY: -0.15 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') {
        // 从 -0.45 起步平滑加速跃空至 1.95，无任何单帧位移跳变
        const forward = lerp(-0.45, 1.95, easeInQuad(p));
        const leap = -0.15 * (1 - p) + (p < 0.45 ? Math.sin((p / 0.45) * (Math.PI / 2)) * 2.0 : Math.pow(Math.cos(((p - 0.45) / 0.55) * (Math.PI / 2)), 2) * 2.0);
        return { lungeX: forward, liftY: leap, scaleMul: 1.48 };
      }
      return { lungeX: lerp(1.95, 0, p), liftY: 0, scaleMul: 1.0 + 0.48 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.28 * p, -0.55 * p, -0.45 * p); }
        if (wp) { wp.position.set(-0.35 * p, 1.35 + 0.45 * p, -0.35 * p); wp.rotation.set(-1.35 * p, 0.55 * p, 2.45 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.55 * t, 0.30 * t, 0.75 * t); }
        if (wp) { wp.position.set(0.95 * t, 0.40, 0.18); wp.rotation.set(0.95 * t, -0.25 * t, -3.14 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 3. 项羽：力拔山兮 · 九洲玄鼎（深蹲扎马蓄力，跃起十丈托举万钧乌金九洲神鼎重砸）
  xiangyu: {
    windupDur: 0.36, impactDur: 0.36, recoverDur: 0.50,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: -0.38 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') {
        const leap = -0.38 * (1 - p) + (p < 0.42 ? Math.sin((p / 0.42) * (Math.PI / 2)) * 2.46 : Math.pow(1 - ((p - 0.42) / 0.58), 3) * 2.46);
        return { lungeX: lerp(0, 0.95, p), liftY: leap, scaleMul: 1.6 };
      }
      return { lungeX: lerp(0.95, 0, p), liftY: 0, scaleMul: 1.0 + 0.6 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.45 * p, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.25 + 0.95 * p, 0); wp.rotation.set(-0.95 * p, 0, -2.65 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.75 * t, 0, 0.30 * t); }
        if (wp) { wp.position.set(0.75 * t, 0.20, 0); wp.rotation.set(1.65 * t, 0, -0.25); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 4. 吕布：修罗无双 · 弑天煞风（双手握画戟，爆发 4 段 360 度极速回旋绞杀）
  lvbu: {
    windupDur: 0.26, impactDur: 0.60, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.32 * p, liftY: 0, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') {
        const lunge = lerp(-0.32, 2.15, easeInQuad(p));
        return { lungeX: lunge, liftY: 0.18 * Math.sin(p * Math.PI * 4), scaleMul: 1.52 };
      }
      return { lungeX: lerp(2.15, 0, p), liftY: 0, scaleMul: 1.0 + 0.52 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -0.7 * p, -0.35 * p); }
        if (wp) { wp.rotation.set(0, 0, 1.35 * p); }
      } else if (phase === 'impact') {
        const spin = p * Math.PI * 8;
        if (body) { body.rotation.set(0.18, spin, 0.25); }
        if (wp) { wp.position.set(0.95, 0.95, 0.12); wp.rotation.set(0.7, spin * 1.25, -2.1); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 5. 霍去病：封狼居胥 · 饮马瀚海（战马腾跃而起，长枪破空前指号令全军冲锋）
  huoqubing: {
    windupDur: 0.28, impactDur: 0.28, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.25 * p, liftY: 0.55 * p, scaleMul: 1.0 + 0.2 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.25, 1.45, p), liftY: 0.55 * (1 - t * 0.7), scaleMul: 1.42 };
      return { lungeX: lerp(1.45, 0, p), liftY: 0, scaleMul: 1.0 + 0.42 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.45 * p, 0, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.45 + 0.6 * p, 0); wp.rotation.set(0, 0, -1.85 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.3 * t, -0.25 * t, 0.55 * t); }
        if (wp) { wp.position.set(1.45 * t, 0.95, 0); wp.rotation.set(0, 0, -1.45 * t); }
        if (aura) { aura.scale.setScalar(3.2); aura.material.opacity = 1.0; }
      }
    }
  },

  // 6. 花木兰：木兰从军 · 朔风铁衣（利落旋身拔剑，双手挽剑花插地荡开冰雪寒潮）
  huamulan: {
    windupDur: 0.24, impactDur: 0.26, recoverDur: 0.36,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: 0.12 * p, scaleMul: 1.0 + 0.16 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.35, 0.75, p), liftY: lerp(0.12, -0.20, p), scaleMul: 1.38 };
      return { lungeX: lerp(0.75, 0, p), liftY: lerp(-0.20, 0, p), scaleMul: 1.0 + 0.38 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.25 * p, 0.95 * p, -0.30 * p); }
        if (wp) { wp.rotation.set(0.55 * p, 0, -1.55 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.55 * t, 0, 0.40 * t); }
        if (wp) { wp.position.set(0.65 * t, 0.25, 0); wp.rotation.set(1.35 * t, 0, 0); }
        if (aura) { aura.scale.setScalar(2.9); aura.material.opacity = 1.0; }
      }
    }
  },

  // 7. 周瑜：赤壁·天火神凰（羽扇虚空划圆聚火，展臂仰天呼引天火神鸟翱翔长空）
  zhouyu: {
    windupDur: 0.30, impactDur: 0.38, recoverDur: 0.48,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.30 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.55, p), liftY: lerp(0.30, 0.42, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.55, 0, p), liftY: lerp(0.42, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.65 * p, 0.20 * p); }
        if (wp) { wp.position.set(0.33, 1.25 + 0.7 * p, 0.2); wp.rotation.set(0.75 * p, 0.55 * p, -2.05 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.35 * t, -0.55 * t, 0.45 * t); }
        if (wp) { wp.position.set(0.95 * t, 1.25, 0.3); wp.rotation.set(-0.75 * t, -1.25 * t, -0.95 * t); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 8. 诸葛亮：奇门遁甲 · 逆天八阵（浮空升起 0.6 米展开八卦太极，左手剑指引落天火）
  zhugeliang: {
    windupDur: 0.32, impactDur: 0.38, recoverDur: 0.50,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.55 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.35, p), liftY: lerp(0.55, 0.62, p), scaleMul: 1.48 };
      return { lungeX: lerp(0.35, 0, p), liftY: lerp(0.62, 0, p), scaleMul: 1.0 + 0.48 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.48 * p, 0.15 * p); }
        if (wp) { wp.position.set(0.33, 1.35 + 0.5 * p, 0.15); wp.rotation.set(0.6 * p, 0, -1.8 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.20 * t, -0.70 * t, 0.30 * t); }
        if (wp) { wp.position.set(0.85 * t, 1.35, 0.25); wp.rotation.set(-0.6 * t, -1.35 * t, -0.75 * t); }
        if (aura) { aura.scale.setScalar(4.0); aura.material.opacity = 1.0; }
      }
    }
  },

  // 9. 岳飞：满江红 · 还我河山（沥泉长枪雷霆扎地筑起精忠战线，披风狂猎）
  yuefei: {
    windupDur: 0.28, impactDur: 0.30, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: 0.42 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.35, 0.95, p), liftY: lerp(0.42, -0.18, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.95, 0, p), liftY: lerp(-0.18, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.35 * p, 0, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.6 + 0.5 * p, 0); wp.rotation.set(0, 0, -2.35 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.55 * t, 0, 0.25 * t); }
        if (wp) { wp.position.set(0.75 * t, 0.18, 0); wp.rotation.set(1.45 * t, 0, 0); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 10. 武则天：无字天碑 · 日月凌空（女皇大袖回旋，双手托举日月凌空镇压核心）
  wuzetian: {
    windupDur: 0.32, impactDur: 0.32, recoverDur: 0.48,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.45 * p, scaleMul: 1.0 + 0.30 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.40, p), liftY: lerp(0.45, 0.52, p), scaleMul: 1.55 };
      return { lungeX: lerp(0.40, 0, p), liftY: lerp(0.52, 0, p), scaleMul: 1.0 + 0.55 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0, -0.30 * p); }
        if (wp) { wp.position.set(0.33, 1.4 + 0.7 * p, 0); wp.rotation.set(0, 0, -2.15 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.25 * t, 0, 0.40 * t); }
        if (wp) { wp.position.set(0.8 * t, 1.65, 0); wp.rotation.set(-0.6 * t, 0, -1.4 * t); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 11. 李白：青莲剑界 · 万剑朝宗（青莲醉步倾斜，御剑凌虚，万剑天降）
  libai: {
    windupDur: 0.26, impactDur: 0.35, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.40 * p, liftY: 0.35 * p, scaleMul: 1.0 + 0.20 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.40, 0.75, p), liftY: lerp(0.35, 0.52, p), scaleMul: 1.42 };
      return { lungeX: lerp(0.75, 0, p), liftY: lerp(0.52, 0, p), scaleMul: 1.0 + 0.42 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.35 * p, 0.8 * p, -0.40 * p); }
        if (wp) { wp.position.set(0.33 - 0.25 * p, 1.25 + 0.5 * p, 0.15); wp.rotation.set(0.6 * p, 0, -1.85 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.30 * t, 0.5 * t, 0.40 * t); }
        if (wp) { wp.position.set(0.95 * t, 1.65, 0.15); wp.rotation.set(-0.95 * t, 0, -2.35 * t); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 12. 秦始皇：十二金人 · 九州归一（定秦神剑猛击虚空大地，号令陶俑与十二金人）
  qinshihuang: {
    windupDur: 0.32, impactDur: 0.30, recoverDur: 0.48,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.22 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.85, p), liftY: lerp(0.22, -0.12, p), scaleMul: 1.5 };
      return { lungeX: lerp(0.85, 0, p), liftY: lerp(-0.12, 0, p), scaleMul: 1.0 + 0.5 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0, -0.30 * p); }
        if (wp) { wp.position.set(0.33, 1.35 + 0.7 * p, 0); wp.rotation.set(0, 0, -2.25 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.48 * t, 0, 0.35 * t); }
        if (wp) { wp.position.set(0.95 * t, 0.35, 0); wp.rotation.set(1.25 * t, 0, -0.15); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 13. 黄忠：烈日穿云 · 落日诛神箭（定军山满月拉弓，定格蓄力，强劲后坐力后跳）
  huangzhong: {
    windupDur: 0.36, impactDur: 0.20, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.55 * p, liftY: -0.15 * p, scaleMul: 1.0 + 0.24 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.55, -0.75, p), liftY: lerp(-0.15, 0, p), scaleMul: 1.42 };
      return { lungeX: lerp(-0.75, 0, p), liftY: 0, scaleMul: 1.0 + 0.42 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -1.35 * p, -0.30 * p); }
        if (wp) { wp.position.set(0.33 - 0.40 * p, 1.20, 0); wp.rotation.set(0.25 * p, -0.7 * p, -0.85 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0, -1.15 * t, -0.55 * t); }
        if (wp) { wp.position.set(0.85 * t, 1.20, 0); wp.rotation.set(0, -0.25 * t, -2.05 * t); }
        if (aura) { aura.scale.setScalar(3.2); aura.material.opacity = 1.0; }
      }
    }
  },

  // 14. 典韦：古之恶来 · 绝境双戟血战（恶来凶煞双铁戟 6 连左右暴风劈刺）
  dianwei: {
    windupDur: 0.24, impactDur: 0.62, recoverDur: 0.38,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: -0.18 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') {
        const seg = p * 6;
        const sub = Math.sin((seg % 1) * Math.PI);
        const lunge = lerp(-0.35, 2.1, p) + sub * 0.25;
        return { lungeX: lunge, liftY: lerp(-0.18, 0, p) + sub * 0.12, scaleMul: 1.5 };
      }
      return { lungeX: lerp(2.1, 0, p), liftY: 0, scaleMul: 1.0 + 0.5 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.25 * p, 0, -0.35 * p); }
        if (wp) { wp.rotation.set(0, 0, 1.25 * p); }
      } else if (phase === 'impact') {
        const seg = p * 6;
        const sub = Math.sin((seg % 1) * Math.PI);
        const alt = Math.floor(seg) % 2 === 0 ? 1 : -1;
        if (body) { body.rotation.set(0.3 * sub, alt * 0.5 * sub, 0.35 * sub); }
        if (wp) { wp.position.set(1.05 * sub, 0.9, alt * 0.4); wp.rotation.set(alt * 0.9 * sub, 0, -2.1 * sub); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 15. 梁红玉：金山战鼓 · 破金震天怒涛（跃上大鼓台，5 声极速雷鼓震天音浪）
  lianghongyu: {
    windupDur: 0.20, impactDur: 0.58, recoverDur: 0.35,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.62 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') {
        const seg = p * 5;
        const strike = Math.sin((seg % 1) * Math.PI);
        return { lungeX: lerp(0, 0.40, p), liftY: 0.62 - strike * 0.15, scaleMul: 1.38 };
      }
      return { lungeX: lerp(0.40, 0, p), liftY: lerp(0.62, 0, p), scaleMul: 1.0 + 0.38 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.25 * p, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.45 + 0.5 * p, 0); wp.rotation.set(0, 0, -2.0 * p); }
      } else if (phase === 'impact') {
        const seg = p * 5;
        const sub = Math.sin((seg % 1) * Math.PI);
        if (body) { body.rotation.set(0.40 * sub, 0, 0); }
        if (wp) { wp.position.set(0.70, 0.40 + sub * 0.35, 0); wp.rotation.set(1.35 * sub, 0, -0.25); }
        if (aura) { aura.scale.setScalar(3.3); aura.material.opacity = 1.0; }
      }
    }
  },

  // 16. 程咬金：混世魔王 · 宣花天罡三板斧（招牌劈脑袋、鬼剔牙、掏耳朵三段合一）
  chengyaojin: {
    windupDur: 0.25, impactDur: 0.65, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.40 * p, liftY: -0.18 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') {
        const axe = p * 3;
        let lunge = 0;
        let lift = 0;
        if (axe < 1) { // 劈脑袋
          const sub = axe;
          lift = lerp(-0.18, 0.85, Math.sin(sub * Math.PI));
          lunge = lerp(-0.40, 0.85, sub);
        } else if (axe < 2) { // 鬼剔牙
          const sub = axe - 1;
          lift = -0.30 + Math.sin(sub * Math.PI) * 0.50;
          lunge = lerp(0.85, 1.70, sub);
        } else { // 掏耳朵
          const sub = axe - 2;
          lift = 0.18;
          lunge = lerp(1.70, 2.55, sub);
        }
        return { lungeX: lunge, liftY: lift, scaleMul: 1.5 };
      }
      return { lungeX: lerp(2.55, 0, p), liftY: 0, scaleMul: 1.0 + 0.5 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.40 * p, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.45 + 0.7 * p, 0); wp.rotation.set(-0.7 * p, 0, -2.35 * p); }
      } else if (phase === 'impact') {
        const axe = p * 3;
        if (axe < 1) {
          const sub = axe;
          if (body) { body.rotation.set(0.65 * sub, 0, 0.25 * sub); }
          if (wp) { wp.position.set(0.85 * sub, 0.30, 0); wp.rotation.set(1.55 * sub, 0, -0.25); }
        } else if (axe < 2) {
          const sub = axe - 1;
          if (body) { body.rotation.set(-0.55 * sub, 0, -0.25 * sub); }
          if (wp) { wp.position.set(1.35 * sub, 1.45, 0); wp.rotation.set(-1.25 * sub, 0, -0.9); }
        } else {
          const sub = axe - 2;
          const spin = sub * Math.PI * 2;
          if (body) { body.rotation.set(0, spin, 0.25); }
          if (wp) { wp.position.set(1.05, 0.85, 0.25); wp.rotation.set(0.45, spin, -1.8); }
        }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 17. 貂蝉：闭月倾城 · 镜花水月魅魂（水袖翩跹起舞旋身两周半）
  diaochan: {
    windupDur: 0.25, impactDur: 0.40, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.18 * p, scaleMul: 1.0 + 0.20 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.52, p), liftY: lerp(0.18, 0, p) + 0.25 * Math.sin(p * Math.PI * 2), scaleMul: 1.38 };
      return { lungeX: lerp(0.52, 0, p), liftY: 0, scaleMul: 1.0 + 0.38 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.95 * p, -0.25 * p); }
        if (wp) { wp.rotation.set(0.55 * p, 0, -1.45 * p); }
      } else if (phase === 'impact') {
        const spin = p * Math.PI * 5;
        if (body) { body.rotation.set(0.18, spin, -0.25); }
        if (wp) { wp.position.set(0.70, 1.15, 0.3); wp.rotation.set(0.85, spin, -0.7); }
        if (aura) { aura.scale.setScalar(3.2); aura.material.opacity = 1.0; }
      }
    }
  },

  // 18. 李广：没石饮羽 · 疾风六星连珠（极速 6 连穿甲箭爆射与连续后坐力）
  liguang: {
    windupDur: 0.22, impactDur: 0.55, recoverDur: 0.38,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: -0.10 * p, scaleMul: 1.0 + 0.18 * p };
      if (phase === 'impact') {
        const seg = p * 6;
        const kick = Math.sin((seg % 1) * Math.PI) * 0.22;
        return { lungeX: lerp(-0.35, -0.9, p) - kick, liftY: lerp(-0.10, 0, p) + kick * 0.6, scaleMul: 1.38 };
      }
      return { lungeX: lerp(-0.9, 0, p), liftY: 0, scaleMul: 1.0 + 0.38 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -1.2 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.33 - 0.30 * p, 1.15, 0); wp.rotation.set(0, -0.55 * p, -0.7 * p); }
      } else if (phase === 'impact') {
        const seg = p * 6;
        const kick = Math.sin((seg % 1) * Math.PI);
        if (body) { body.rotation.set(0, -1.05, -0.35 - kick * 0.25); }
        if (wp) { wp.position.set(0.70 + kick * 0.25, 1.2, 0); wp.rotation.set(0, -0.25, -1.75 - kick * 0.35); }
        if (aura) { aura.scale.setScalar(3.0); aura.material.opacity = 1.0; }
      }
    }
  },

  // 19. 韩信：背水一战 · 十面埋伏（挥剑斩落天罗地网，单手按地唤出五路死士）
  hanxin: {
    windupDur: 0.26, impactDur: 0.30, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.18 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.75, p), liftY: lerp(0.18, -0.25, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.75, 0, p), liftY: lerp(-0.25, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0, -0.30 * p); }
        if (wp) { wp.position.set(0.33, 1.45 + 0.55 * p, 0); wp.rotation.set(0, 0, -2.05 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.60 * t, 0, 0.30 * t); }
        if (wp) { wp.position.set(0.75 * t, 0.20, 0); wp.rotation.set(1.40 * t, 0, -0.15); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 20. 白起：人屠杀神 · 长平血海（血煞巨镰贴地 180 度横扫前方 10 米，斩首处决）
  baiqi: {
    windupDur: 0.30, impactDur: 0.30, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.42 * p, liftY: -0.18 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.42, 1.65, easeInQuad(p)), liftY: lerp(-0.18, 0, p), scaleMul: 1.55 };
      return { lungeX: lerp(1.65, 0, p), liftY: 0, scaleMul: 1.0 + 0.55 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.35 * p, -0.7 * p, -0.45 * p); }
        if (wp) { wp.position.set(-0.35 * p, 1.25, -0.35 * p); wp.rotation.set(-1.25 * p, 0.7 * p, 2.45 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.40 * t, 0.7 * t, 0.65 * t); }
        if (wp) { wp.position.set(1.25 * t, 0.40, 0.30 * t); wp.rotation.set(0.95 * t, -0.45 * t, -2.85 * t); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 21. 曹操：魏武挥鞭 · 倚天青釭（双剑交错十字斩出万道剑煞）
  caocao: {
    windupDur: 0.26, impactDur: 0.28, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.30 * p, liftY: 0, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.30, 1.05, p), liftY: lerp(0, 0.12, p), scaleMul: 1.45 };
      return { lungeX: lerp(1.05, 0, p), liftY: lerp(0.12, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -0.50 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.35 + 0.45 * p, 0); wp.rotation.set(-0.7 * p, 0, 1.35 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.25 * t, 0.50 * t, 0.40 * t); }
        if (wp) { wp.position.set(1.15 * t, 0.85, 0); wp.rotation.set(0.8 * t, 0, -2.35 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 22. 司马懿：深谋远虑 · 冢虎冥雷（阴沉下潜蓄气，双臂引出九幽冥黑电弧直贯敌阵）
  simayi: {
    windupDur: 0.32, impactDur: 0.32, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: -0.25 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.45, p), liftY: lerp(-0.25, 0.28, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.45, 0, p), liftY: lerp(0.28, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.40 * p, 0.45 * p, 0); }
        if (wp) { wp.position.set(0.33, 0.85 - 0.25 * p, 0); wp.rotation.set(0.7 * p, 0, 0.9 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.40 * t, -0.55 * t, 0.30 * t); }
        if (wp) { wp.position.set(0.95 * t, 1.40, 0.25); wp.rotation.set(-0.9 * t, -1.0 * t, -1.35 * t); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 23. 张辽：威震逍遥津 · 止啼战吼（狂刀高举仰天怒吼，踏步狂刀下压斩出金色气浪）
  zhangliao: {
    windupDur: 0.28, impactDur: 0.35, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: 0.18 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.35, 1.55, easeInQuad(p)), liftY: lerp(0.18, -0.10, p), scaleMul: 1.52 };
      return { lungeX: lerp(1.55, 0, p), liftY: 0, scaleMul: 1.0 + 0.52 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.40 * p, 0, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.55 + 0.55 * p, 0); wp.rotation.set(-0.6 * p, 0, -2.45 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.45 * t, 0.25 * t, 0.60 * t); }
        if (wp) { wp.position.set(1.15 * t, 0.60, 0.18); wp.rotation.set(0.9 * t, 0, -2.65 * t); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 24. 马超：西凉锦骑 · 狮蛮踏阵（横枪胸前，吹响西凉白牦兽角，铁蹄踏阵）
  machao: {
    windupDur: 0.28, impactDur: 0.30, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.30 * p, liftY: 0.40 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.30, 1.40, p), liftY: 0.40 * (1 - t * 0.4), scaleMul: 1.45 };
      return { lungeX: lerp(1.40, 0, p), liftY: 0, scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.30 * p, -0.45 * p, 0); }
        if (wp) { wp.position.set(0.33, 1.40 + 0.45 * p, 0.12); wp.rotation.set(0.45 * p, -0.7 * p, -1.35 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.25 * t, -0.35 * t, 0.45 * t); }
        if (wp) { wp.position.set(1.45 * t, 0.95, 0); wp.rotation.set(0, 0, -1.65 * t); }
        if (aura) { aura.scale.setScalar(3.4); aura.material.opacity = 1.0; }
      }
    }
  },

  // 25. 孙武：兵圣天宪 · 风林火山（展开孙子兵法古卷，水墨金符环绕周身潜行）
  sunwu: {
    windupDur: 0.30, impactDur: 0.35, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.25 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.50, p), liftY: lerp(0.25, 0.40, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.50, 0, p), liftY: lerp(0.40, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.50 * p, 0.12 * p); }
        if (wp) { wp.position.set(0.33, 1.30 + 0.45 * p, 0.12); wp.rotation.set(0.55 * p, 0, -1.55 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.18 * t, -0.60 * t, 0.30 * t); }
        if (wp) { wp.position.set(0.95 * t, 1.20, 0.18); wp.rotation.set(-0.55 * t, -1.2 * t, -0.8 * t); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 26. 卫青：大将军印 · 龙城横扫漠南（拔剑按大将军汉印，稳健挥出金色开疆剑浪）
  weiqing: {
    windupDur: 0.28, impactDur: 0.30, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.32 * p, liftY: 0, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.32, 1.20, p), liftY: 0, scaleMul: 1.45 };
      return { lungeX: lerp(1.20, 0, p), liftY: 0, scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.18 * p, -0.50 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.2, 1.30 + 0.35 * p, -0.25 * p); wp.rotation.set(-0.9 * p, 0, 2.05 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.30 * t, 0.40 * t, 0.50 * t); }
        if (wp) { wp.position.set(1.10 * t, 0.75, 0.12); wp.rotation.set(0.7 * t, 0, -2.55 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 27. 蒙恬：万里长城 · 墨笔山河金汤（提巨型神毫大笔凌空挥毫，泼墨如长河勾勒长城）
  mengtian: {
    windupDur: 0.30, impactDur: 0.35, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.35 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.95, p), liftY: lerp(0.35, 0.18, p), scaleMul: 1.48 };
      return { lungeX: lerp(0.95, 0, p), liftY: lerp(0.18, 0, p), scaleMul: 1.0 + 0.48 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.65 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.45 + 0.55 * p, 0); wp.rotation.set(0.45 * p, 0, -1.95 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.25 * t, -0.65 * t, 0.45 * t); }
        if (wp) { wp.position.set(1.25 * t, 1.15, 0.25); wp.rotation.set(-0.9 * t, -1.35 * t, -0.7 * t); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 28. 李靖：卫国公 · 六花神阵逆变（单手托玲珑宝塔与神剑，六花金光神阵在脚底绽放）
  lijing: {
    windupDur: 0.30, impactDur: 0.32, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.32 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.45, p), liftY: lerp(0.32, 0.40, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.45, 0, p), liftY: lerp(0.40, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.45 * p, 0.12 * p); }
        if (wp) { wp.position.set(0.33, 1.35 + 0.45 * p, 0); wp.rotation.set(0, 0, -1.75 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.12 * t, -0.55 * t, 0.30 * t); }
        if (wp) { wp.position.set(0.85 * t, 1.35, 0.12); wp.rotation.set(-0.45 * t, -0.9 * t, -1.0 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 29. 秦琼：门神金锏 · 熟铜双锏断岳（双锏胸前交击火星金鸣，双锏合力轰天砸地）
  qinqiong: {
    windupDur: 0.28, impactDur: 0.32, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.36 * p, liftY: 0.35 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.36, 1.30, easeInQuad(p)), liftY: lerp(0.35, -0.18, p), scaleMul: 1.52 };
      return { lungeX: lerp(1.30, 0, p), liftY: 0, scaleMul: 1.0 + 0.52 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.40 * p, 0, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.6 + 0.55 * p, 0); wp.rotation.set(-0.55 * p, 0, -2.45 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.50 * t, 0, 0.35 * t); }
        if (wp) { wp.position.set(0.95 * t, 0.30, 0); wp.rotation.set(1.45 * t, 0, -0.12); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 30. 尉迟恭：黑煞门神 · 雌雄双鞭三绝（狂暴黑雷电鞭上甩、横抽、合击爆裂黑雷）
  yuchigong: {
    windupDur: 0.26, impactDur: 0.48, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: 0.18 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') {
        const seg = p * 3;
        const sub = Math.sin((seg % 1) * Math.PI);
        return { lungeX: lerp(-0.35, 1.8, p) + sub * 0.25, liftY: lerp(0.18, -0.06, p) + sub * 0.18, scaleMul: 1.48 };
      }
      return { lungeX: lerp(1.8, 0, p), liftY: 0, scaleMul: 1.0 + 0.48 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -0.55 * p, -0.30 * p); }
        if (wp) { wp.position.set(0.33, 1.40 + 0.45 * p, 0); wp.rotation.set(-0.7 * p, 0, 1.55 * p); }
      } else if (phase === 'impact') {
        const seg = p * 3;
        const sub = Math.sin((seg % 1) * Math.PI);
        if (body) { body.rotation.set(0.35 * sub, (seg % 2 === 0 ? 0.45 : -0.45) * sub, 0.40 * sub); }
        if (wp) { wp.position.set(1.05 * sub, 0.75, 0.12); wp.rotation.set(1.2 * sub, 0, -1.95 * sub); }
        if (aura) { aura.scale.setScalar(3.6); aura.material.opacity = 1.0; }
      }
    }
  },

  // 31. 穆桂英：杨门女将 · 降龙木辕门挂帅（翻腕回旋飞掷降龙木破空入土，红缨帅旗）
  muguiying: {
    windupDur: 0.26, impactDur: 0.30, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.40 * p, liftY: 0.25 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.40, 1.40, p), liftY: 0.25 * (1 - t * 0.5), scaleMul: 1.45 };
      return { lungeX: lerp(1.40, 0, p), liftY: 0, scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.25 * p, -0.55 * p, -0.35 * p); }
        if (wp) { wp.position.set(-0.30 * p, 1.45 + 0.35 * p, 0); wp.rotation.set(-0.95 * p, 0.45 * p, 2.35 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.30 * t, 0.40 * t, 0.50 * t); }
        if (wp) { wp.position.set(1.45 * t, 0.85, 0); wp.rotation.set(0.6 * t, 0, -2.65 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 32. 秦良玉：忠贞长矛 · 石柱白杆突阵（白杆透甲勾矛斜挑破阵，举盾前撞战吼）
  qinliangyu: {
    windupDur: 0.26, impactDur: 0.28, recoverDur: 0.40,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.35 * p, liftY: -0.12 * p, scaleMul: 1.0 + 0.20 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.35, 1.50, p), liftY: lerp(-0.12, 0.08, p), scaleMul: 1.42 };
      return { lungeX: lerp(1.50, 0, p), liftY: 0, scaleMul: 1.0 + 0.42 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.15 * p, 0.45 * p, -0.30 * p); }
        if (wp) { wp.position.set(0.33 - 0.45 * p, 0.85, 0); wp.rotation.set(0, 0, 1.05 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.25 * t, -0.35 * t, 0.50 * t); }
        if (wp) { wp.position.set(1.55 * t, 0.95, 0); wp.rotation.set(0, 0, -1.95 * t); }
        if (aura) { aura.scale.setScalar(3.3); aura.material.opacity = 1.0; }
      }
    }
  },

  // 33. 戚继光：戚家军 · 鸳鸯狼筅连环神阵（双手推架竹狼筅阵，拔军刀向前号令）
  qijiguang: {
    windupDur: 0.28, impactDur: 0.30, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.30 * p, liftY: -0.12 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.30, 1.25, p), liftY: lerp(-0.12, 0, p), scaleMul: 1.45 };
      return { lungeX: lerp(1.25, 0, p), liftY: 0, scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0.18 * p, 0.40 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.2, 0.9, 0); wp.rotation.set(0, 0, 0.9 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.25 * t, -0.30 * t, 0.45 * t); }
        if (wp) { wp.position.set(1.35 * t, 0.9, 0); wp.rotation.set(0, 0, -1.85 * t); }
        if (aura) { aura.scale.setScalar(3.4); aura.material.opacity = 1.0; }
      }
    }
  },

  // 34. 辛弃疾：稼轩词人 · 五十黑骑夜闯营（左手词卷、右手拔剑指天，气吞万里）
  xinqiji: {
    windupDur: 0.28, impactDur: 0.32, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: -0.30 * p, liftY: 0.25 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(-0.30, 0.95, p), liftY: lerp(0.25, 0.30, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.95, 0, p), liftY: lerp(0.30, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, -0.45 * p, -0.25 * p); }
        if (wp) { wp.position.set(0.33, 1.35 + 0.45 * p, 0); wp.rotation.set(0, 0, -1.95 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(-0.25 * t, 0.40 * t, 0.45 * t); }
        if (wp) { wp.position.set(1.05 * t, 1.55, 0); wp.rotation.set(-0.7 * t, 0, -2.15 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 35. 姜子牙：太公在此 · 封神天榜打神巨鞭（杏黄旗展，打神鞭高举引九天雷霆砸下）
  jiangziya: {
    windupDur: 0.32, impactDur: 0.32, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.50 * p, scaleMul: 1.0 + 0.28 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.65, p), liftY: lerp(0.50, -0.12, p), scaleMul: 1.52 };
      return { lungeX: lerp(0.65, 0, p), liftY: lerp(-0.12, 0, p), scaleMul: 1.0 + 0.52 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.35 * p, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.55 + 0.7 * p, 0); wp.rotation.set(-0.7 * p, 0, -2.45 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.50 * t, 0, 0.30 * t); }
        if (wp) { wp.position.set(0.95 * t, 0.35, 0); wp.rotation.set(1.55 * t, 0, -0.15); }
        if (aura) { aura.scale.setScalar(3.8); aura.material.opacity = 1.0; }
      }
    }
  },

  // 36. 张良：运筹帷幄 · 决胜千里星盘逆转（双手虚托，九宫星盘在身前逆向飞转）
  zhangliang: {
    windupDur: 0.30, impactDur: 0.35, recoverDur: 0.45,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.35 * p, scaleMul: 1.0 + 0.25 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.40, p), liftY: lerp(0.35, 0.42, p), scaleMul: 1.45 };
      return { lungeX: lerp(0.40, 0, p), liftY: lerp(0.42, 0, p), scaleMul: 1.0 + 0.45 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(0, 0.45 * p, 0.15 * p); }
        if (wp) { wp.position.set(0.33, 1.30 + 0.45 * p, 0.12); wp.rotation.set(0.55 * p, 0, -1.65 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.12 * t, -0.65 * t, 0.30 * t); }
        if (wp) { wp.position.set(0.85 * t, 1.20, 0.18); wp.rotation.set(-0.55 * t, -1.25 * t, -0.7 * t); }
        if (aura) { aura.scale.setScalar(3.5); aura.material.opacity = 1.0; }
      }
    }
  },

  // 37. 鲁班：工圣神机 · 机关玄鸟机巧轰炸（抛飞两只机关木鸟，按动机括齿轮轰炸）
  luban: {
    windupDur: 0.28, impactDur: 0.35, recoverDur: 0.42,
    getMotion(phase, p, t) {
      if (phase === 'windup') return { lungeX: 0, liftY: 0.30 * p, scaleMul: 1.0 + 0.22 * p };
      if (phase === 'impact') return { lungeX: lerp(0, 0.65, p), liftY: lerp(0.30, 0.25, p), scaleMul: 1.42 };
      return { lungeX: lerp(0.65, 0, p), liftY: lerp(0.25, 0, p), scaleMul: 1.0 + 0.42 * (1 - p) };
    },
    pose(body, wp, aura, phase, p, t) {
      if (phase === 'windup') {
        if (body) { body.rotation.set(-0.30 * p, 0, 0); }
        if (wp) { wp.position.set(0.33, 1.40 + 0.45 * p, 0); wp.rotation.set(0.55 * p, 0, -1.95 * p); }
      } else if (phase === 'impact') {
        if (body) { body.rotation.set(0.30 * t, 0, 0.25 * t); }
        if (wp) { wp.position.set(1.05 * t, 1.35, 0); wp.rotation.set(-0.7 * t, 0, -1.35 * t); }
        if (aura) { aura.scale.setScalar(3.3); aura.material.opacity = 1.0; }
      }
    }
  }
};

// 创建英雄技能施法动画上下文
export function createHeroSkillAnim(hero) {
  const id = hero ? hero.id : 'zhaoyun';
  const cfg = HERO_ANIM_CONFIGS[id] || HERO_ANIM_CONFIGS.zhaoyun;
  const windupDur = cfg.windupDur || 0.28;
  const impactDur = cfg.impactDur || 0.30;
  const recoverDur = cfg.recoverDur || 0.40;

  return {
    heroId: id,
    cfg,
    elapsed: 0,
    phase: 'windup',
    windupDur,
    impactDur,
    recoverDur,
    totalDur: windupDur + impactDur + recoverDur,
    triggered: false,
    lungeX: 0,
    liftY: 0,
    scaleMul: 1.0,
    lastSubBeat: -1,
  };
}

// 驱动武道技能关键帧与模型位姿（全程 C0 连续平滑过渡，消除任何单帧瞬移）
export function updateHeroSkillPose(heroModel, anim, dt) {
  if (!heroModel || !anim) return { finished: true };
  const body = heroModel.body;
  const wp = heroModel.weaponPivot;
  const aura = heroModel.aura;
  const cfg = anim.cfg || HERO_ANIM_CONFIGS[anim.heroId] || HERO_ANIM_CONFIGS.zhaoyun;

  anim.elapsed += dt;
  let result = {};

  const windupEnd = anim.windupDur;
  const impactEnd = anim.windupDur + anim.impactDur;

  // 1. 起手蓄势阶段（聚气沉腰蓄劲，速度从0平缓起步）
  if (anim.elapsed < windupEnd) {
    anim.phase = 'windup';
    const p = easeInOutSine(anim.elapsed / windupEnd);
    const motion = cfg.getMotion('windup', p, p);
    anim.lungeX = motion.lungeX || 0;
    anim.liftY = motion.liftY || 0;
    anim.scaleMul = motion.scaleMul || 1.0;
    cfg.pose(body, wp, aura, 'windup', p, p);
    if (aura) {
      aura.scale.setScalar(lerp(1.25, 2.5, p));
      aura.material.opacity = lerp(0.5, 0.95, p);
    }
  }
  // 2. 暴击释放与顿挫定格阶段（Hitstop，破空暴击爆发）
  else if (anim.elapsed < impactEnd) {
    anim.phase = 'impact';
    const p = (anim.elapsed - windupEnd) / anim.impactDur;

    // 触发施法主逻辑（仅在进入顿挫帧首拍）
    if (!anim.triggered) {
      anim.triggered = true;
      result.triggerSkill = true;
    }

    // 检测多段打击子拍（例如赵云 7 刺、典韦 6 斩、梁红玉 5 鼓）
    const totalBeats = anim.heroId === 'zhaoyun' ? 7 : (anim.heroId === 'dianwei' ? 6 : (anim.heroId === 'lianghongyu' ? 5 : (anim.heroId === 'chengyaojin' ? 3 : 1)));
    if (totalBeats > 1) {
      const curBeat = Math.min(totalBeats - 1, Math.floor(p * totalBeats));
      if (curBeat > anim.lastSubBeat) {
        anim.lastSubBeat = curBeat;
        result.subImpact = { beat: curBeat, total: totalBeats };
      }
    }

    // 强烈的顿挫定格：前半段定格在最大爆发姿势，带来极强的武道打击感
    const hitstop = p < 0.65;
    const t = hitstop ? 1.0 : 1.0 - (p - 0.65) * 0.45;
    const motion = cfg.getMotion('impact', p, t);
    anim.lungeX = motion.lungeX || 0;
    anim.liftY = motion.liftY || 0;
    anim.scaleMul = motion.scaleMul || 1.35;
    cfg.pose(body, wp, aura, 'impact', p, t);
    if (aura) {
      const auraP = Math.min(1.0, p * 2.5);
      aura.scale.setScalar(lerp(2.5, 3.5, auraP));
      aura.material.opacity = 1.0;
    }
  }
  // 3. 从容收招阶段（势尽还刃，阻尼曲线归零）
  else if (anim.elapsed < anim.totalDur) {
    anim.phase = 'recover';
    const p = easeOutCubic((anim.elapsed - impactEnd) / anim.recoverDur);
    const motion = cfg.getMotion('recover', p, 1 - p);
    anim.lungeX = motion.lungeX || 0;
    anim.liftY = motion.liftY || 0;
    anim.scaleMul = motion.scaleMul || 1.0;
    cfg.pose(body, wp, aura, 'recover', p, 1 - p);
    if (aura) {
      aura.scale.setScalar(lerp(3.5, 1.25, p));
      aura.material.opacity = lerp(1.0, 0.5, p);
    }
  }
  // 施法完成，平稳恢复中立待机
  else {
    anim.phase = 'finished';
    anim.lungeX = 0;
    anim.scaleMul = 1.0;
    anim.liftY = 0;
    resetHeroNeutralPose(body, wp, aura);
    result.finished = true;
  }

  return result;
}

// 待机呼吸微动
export function applyHeroIdlePose(heroModel, time, dt) {
  if (!heroModel) return;
  const g = heroModel.group;
  const body = heroModel.body;
  const wp = heroModel.weaponPivot;
  const aura = heroModel.aura;

  // 身体上下平缓起伏
  g.position.y = Math.sin(time * 1.6) * 0.025;

  if (body) {
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, Math.sin(time * 1.6) * 0.012);
    body.scale.set(1, 1, 1);
  }

  if (wp) {
    wp.position.set(0.33, 1.0, 0.04);
    wp.rotation.x += (0 - wp.rotation.x) * Math.min(1, dt * 6);
    wp.rotation.y += (0 - wp.rotation.y) * Math.min(1, dt * 6);
    wp.rotation.z += (-0.10 - wp.rotation.z) * Math.min(1, dt * 6);
  }

  if (aura) {
    aura.scale.setScalar(1.25 + Math.sin(time * 2.2) * 0.06);
    aura.material.opacity = 0.5 + Math.sin(time * 2.2) * 0.08;
  }
}

// 重置到中立位
function resetHeroNeutralPose(body, wp, aura) {
  if (body) {
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    body.scale.set(1, 1, 1);
  }
  if (wp) {
    wp.position.set(0.33, 1.0, 0.04);
    wp.rotation.set(0, 0, -0.10);
  }
  if (aura) {
    aura.scale.setScalar(1.25);
    aura.material.opacity = 0.5;
  }
}

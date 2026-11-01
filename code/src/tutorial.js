// 墨阵山河 · 局内新手战术教程（第 1-4 关，皇室战争级战术暂停与严格防误触屏障）
import { getUnit } from './data/units.js?v=1.93';

export const TUTORIALS = {
  l1: {
    steps: [
      {
        delayBefore: 0.5,
        pause: true,
        ensureEnergy: 4,
        ensureCooldown: 'swordsman',
        title: '兵家要略 · 铁剑先锋',
        text: '军令随时间自然恢复。先点选前排【剑兵】！',
        subText: '剑兵身手矫健、剑法凌厉，专司前锋冲锋陷阵',
        target: '.card[data-unit="swordsman"]',
        targetKind: 'card',
        unit: 'swordsman',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '阵地布防 · 落笔成兵',
        text: '敌军前锋逼近！点击前方发光阵位，部署剑兵！',
        subText: '在阵线前端接战敌兵，掩护后排远程部队',
        targetKind: 'zone',
        targetWorld: { x: -5.0, z: 0.0 },
        unit: 'swordsman',
        zoneMinX: -8.0,
        zoneMaxX: -2.5,
        zoneTip: '请在前方发光阵位（箭头指示处）部署剑兵！',
        zoneHintText: '【剑兵阵位】点击此处出兵',
        event: 'deployed',
        unpauseOnDone: true,
      },
      {
        delayBefore: 3.5,
        pause: true,
        ensureEnergy: 3,
        ensureCooldown: 'archer',
        title: '步弓合击 · 远程火力',
        text: '剑兵已在阵前挡住敌军！在剑兵身后部署【弓兵】协同射击！',
        subText: '近战抗伤、弓兵齐射，后排受掩护方能发挥最大杀伤',
        target: '.card[data-unit="archer"]',
        targetKind: 'card',
        unit: 'archer',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '后排阵位 · 箭雨压制',
        text: '在剑兵身后的安全阵位点击，部署弓兵！',
        subText: '保持距离持续输出，顷刻荡平敌军',
        targetKind: 'zone',
        targetWorld: { x: -10.0, z: 0.0 },
        unit: 'archer',
        zoneMinX: -14.0,
        zoneMaxX: -6.5,
        zoneTip: '请在后排发光阵位（箭头指示处）部署弓兵！',
        zoneHintText: '【弓兵阵位】点击此处射击',
        event: 'deployed',
        unpauseOnDone: true,
      },
      {
        delayBefore: 4.8,
        pause: true,
        ensureSkillReady: true,
        title: '主将绝技 · 白龙破阵',
        text: '敌军大批人马涌至！主将赵云大招【白龙破阵】已充能 100% 就绪！',
        subText: '点击右下角金色脉冲大招按钮，白龙贯日，一击冲散敌阵！',
        target: '#skill-btn',
        targetKind: 'skill',
        event: 'skillUsed',
        unpauseOnDone: true,
      },
      {
        pause: false,
        auto: 5.0,
        title: '直捣黄龙 · 破寨大捷',
        text: '敌阵已破，敌寨大门洞开！调遣三军，攻破敌方帅寨！',
        subText: '摧毁敌方营寨即可大获全胜！',
        target: '.base-bar.enemy',
      },
    ],
  },
  l2: {
    steps: [
      {
        delayBefore: 1.2,
        pause: true,
        ensureEnergy: 4,
        ensureCooldown: 'arrowtower',
        title: '防御工事 · 箭塔',
        text: '本关解锁防御建筑【箭塔】！先点选【箭塔】卡牌！',
        subText: '建筑坚不可摧，能自动射杀射程内所有来犯之敌',
        target: '.card[data-unit="arrowtower"]',
        targetKind: 'card',
        unit: 'arrowtower',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '修筑箭塔',
        text: '点击阵地中发光的军阵位，立塔固守！',
        subText: '建筑必须修建在固定的军阵位上',
        targetKind: 'zone',
        unit: 'arrowtower',
        event: 'deployed',
        unpauseOnDone: true,
      },
      {
        delayBefore: 7.0,
        pause: true,
        title: '主将调遣 · 龙胆光环',
        text: '点击战场地面（不要选卡），把主将赵云调遣到接火前线！',
        subText: '赵云被动【龙胆】可为光环内的友军提供攻速加成与持续回血，站位就是战术',
        targetKind: 'hero',
        event: 'heroMoved',
        unpauseOnDone: true,
      },
      {
        auto: 4.5,
        pause: false,
        title: '固若金汤',
        text: '主将光环护体、箭塔连环阻敌！稳步推进攻克哨卡！',
        subText: '合理搭配防御工事与前排肉盾，防范敌军骑兵突袭',
      },
    ],
  },
  l3: {
    steps: [
      {
        delayBefore: 1.0,
        auto: 4.0,
        pause: false,
        title: '战局要诀 · 三星评价',
        text: '战斗结束时帅帐剩余耐久高于 75%，方能夺得三星满分！',
        subText: '坚守阵地，切莫让敌军近身袭扰帅帐',
        target: '.base-bar.player',
      },
      {
        delayBefore: 5.0,
        auto: 4.0,
        pause: false,
        title: '攻坚破寨 · 先拆塔',
        text: '敌寨前修筑有敌方箭塔，先调派兵力拆除箭塔，再行破寨！',
        subText: '近战兵顶住伤害，弓手集火箭塔',
        target: '.base-bar.enemy',
      },
    ],
  },
  l4: {
    steps: [
      {
        delayBefore: 0.8,
        auto: 3.5,
        pause: false,
        title: '神妙术法 · 符纸蓄势',
        text: '术法符纸威力无边，开局需【蓄势 12 秒】，卡面会显示倒数。',
        subText: '术法冷却较长，务必留在决战或危急关头释放',
        target: '.card[data-unit="jianyu"]',
      },
      {
        delayBefore: 11.5,
        pause: true,
        ensureEnergy: 3,
        ensureCooldown: 'jianyu',
        title: '术法落点 · 箭雨天降',
        text: '蓄势完成！点选【箭雨术】符纸卡！',
        subText: '术法卡不受左侧布阵限制，可在战场任意位置点选落点',
        target: '.card[data-unit="jianyu"]',
        unit: 'jianyu',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '全图打击',
        text: '点击敌军密集处施放，天降三轮箭雨洗礼！',
        subText: '朱砂法阵预警后即刻生效，重创大范围敌军',
        targetKind: 'zone',
        unit: 'jianyu',
        event: 'spellCast',
        unpauseOnDone: true,
      },
    ],
  },
};

export class TutorialController {
  constructor(battle, ui) {
    this.battle = battle;
    this.ui = ui;
    this.levelId = null;
    this.steps = null;
    this.index = -1;
    this.current = null;
    this.timer = 0;
    this.delayTimer = 0;
    this.waiting = false;
    this.flags = {};
    this.done = false;
    this.pendingNext = 0;
  }

  start(levelId) {
    const data = TUTORIALS[levelId];
    if (!data) return false;
    this.levelId = levelId;
    this.steps = data.steps.map((s) => ({ ...s }));
    this.index = -1;
    this.flags = {};
    this.done = false;
    this.waiting = false;
    this.delayTimer = 0;
    this.pendingNext = 0.4;
    return true;
  }

  stop() {
    if (this.battle) {
      this.battle.tutorialPause = false;
      if (this.battle.scene) this.battle.scene.showDeploy(false);
    }
    this.steps = null;
    this.current = null;
    this.waiting = false;
    if (this.ui) this.ui.hideGuide();
  }

  showStep() {
    this.index++;
    if (!this.steps || this.index >= this.steps.length) {
      this.done = true;
      this.stop();
      return;
    }
    const step = this.steps[this.index];
    this.current = step;

    if (step.delayBefore && !step._delayDone) {
      step._delayDone = true;
      this.delayTimer = step.delayBefore;
      return;
    }

    this.executeShowStep();
  }

  executeShowStep() {
    const step = this.current;
    if (!step) return;

    if (step.ensureEnergy && this.battle.energy < step.ensureEnergy) {
      this.battle.energy = step.ensureEnergy;
    }

    if (step.ensureCooldown && this.battle.cards) {
      const c = this.battle.cards.find((card) => card.unit.id === step.ensureCooldown);
      if (c) {
        c.cd = 0;
        c.lock = 0;
      }
    }

    // 关键：充能赵云荒野乱斗大招至 100% 并更新 HUD 显示金色流光脉冲
    if (step.ensureSkillReady) {
      this.battle.heroSuperCharge = 100;
      this.battle.skillCd = 0;
      this.battle.heroSkillCd = 0;
      if (this.ui && this.ui.updateBattleHUD) {
        this.ui.updateBattleHUD(this.battle);
      }
    }

    if (step.pause) {
      this.battle.tutorialPause = true;
    }

    this.waiting = true;
    this.timer = step.auto || 0;

    let targetEl = (step.target && typeof document !== 'undefined') ? document.querySelector(step.target) : null;
    this.ui.showGuide({
      title: step.title || '战术指引',
      text: step.text,
      subText: step.subText || '',
      targetEl,
      kind: step.targetKind || 'default',
      targetWorld: step.targetWorld || null,
      zoneHintText: step.zoneHintText || null,
      unit: step.unit || null,
      pause: !!step.pause,
      blocking: (step.targetKind === 'card' || step.targetKind === 'skill'),
    });

    if (step.targetKind === 'zone' && this.battle.scene) {
      const isBuilding = step.unit === 'arrowtower';
      const isSpell = step.unit === 'jianyu';
      this.battle.scene.showDeploy(true, isBuilding, isSpell);
    }
  }

  advance(delay = 0.25) {
    if (!this.steps) return;
    this.waiting = false;
    if (this.current && this.current.unpauseOnDone) {
      this.battle.tutorialPause = false;
    }
    this.ui.hideGuide();
    if (this.current && this.current.targetKind === 'zone' && this.battle.scene) {
      this.battle.scene.showDeploy(false);
    }
    this.current = null;
    this.pendingNext = delay;
  }

  isCardRestricted(id) {
    if (!this.waiting || !this.current) return false;
    if (this.current.event === 'cardSelected' && this.current.unit) {
      return id !== this.current.unit;
    }
    return false;
  }

  getRestrictedTip(id) {
    if (!this.waiting || !this.current || !this.current.unit) return null;
    const u = getUnit(this.current.unit);
    return u ? `请按军师指引点选【${u.name}】` : '请按军师指引点选指定卡牌';
  }

  isZoneRestricted(unitId, x, z) {
    if (!this.waiting || !this.current) return false;
    const step = this.current;
    if (step.targetKind !== 'zone') return false;
    if (step.unit && step.unit !== unitId) {
      if (this.ui && this.ui.toast) this.ui.toast(this.getRestrictedTip(unitId) || '请按军师指引出兵！');
      return true;
    }
    // 宽容判定：教程期间只要点击在己方半场（-14 到 -2 之间），均视为有效并吸附落位，绝不弹窗阻断
    if (x >= -14 && x <= -1.8) {
      return false;
    }
    if (step.zoneMinX !== undefined && (x < step.zoneMinX - 2.0 || x > step.zoneMaxX + 2.0)) {
      if (this.ui && this.ui.toast) this.ui.toast(step.zoneTip || '请点击发光区域或阵位部署！');
      return true;
    }
    return false;
  }

  handle(event, payload = {}) {
    if (!this.steps) return;
    if (event === 'cardSelected' && payload.id) this.flags[`selected:${payload.id}`] = true;
    if (event === 'deployed') {
      this.flags.deployCount = (this.flags.deployCount || 0) + 1;
      if (payload.id) this.flags[`deployed:${payload.id}`] = true;
    }
    if (event === 'spellCast') {
      this.flags.castCount = (this.flags.castCount || 0) + 1;
      if (payload.id) this.flags[`cast:${payload.id}`] = true;
    }
    if (event === 'heroMoved') this.flags.heroMoved = true;
    if (event === 'skillUsed') this.flags.skillUsed = true;
    if (event === 'victory') this.flags.victory = true;

    const step = this.current;
    if (!step || !step.event || !this.waiting) return;
    if (step.event !== event) return;
    if (step.unit && payload.id && payload.id !== step.unit) return;

    this.advance(0.3);
  }

  update(dt) {
    if (!this.steps) return;

    if (this.delayTimer > 0) {
      this.delayTimer -= dt;
      if (this.delayTimer <= 0) {
        this.delayTimer = 0;
        this.executeShowStep();
      }
      return;
    }

    if (this.pendingNext > 0) {
      this.pendingNext -= dt;
      if (this.pendingNext <= 0) {
        this.pendingNext = 0;
        this.showStep();
      }
      return;
    }

    if (!this.waiting) return;

    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.advance(0.2);
      }
    } else if (this.current && this.current.auto) {
      this.advance(0.2);
    }
  }
}

const fs = require('fs');

console.log('--- Step 1: Completely rewrite src/tutorial.js ---');

const tutorialContent = `// 墨阵山河 · 局内新手战术教程（第 1-4 关，皇室战争级战术暂停与严格防误触屏障）
import { getUnit } from './data/units.js?v=1.72';

export const TUTORIALS = {
  l1: {
    steps: [
      {
        delayBefore: 0.5,
        pause: true,
        ensureEnergy: 4,
        ensureCooldown: 'swordsman',
        title: '兵家要略 · 刀盾先锋',
        text: '军令随时间自然恢复。先点选前排【刀盾兵】！',
        subText: '刀盾兵身形坚韧、藤牌御敌，专司前锋顶住伤害',
        target: '.card[data-unit="swordsman"]',
        targetKind: 'card',
        unit: 'swordsman',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '阵地布防 · 落笔成兵',
        text: '敌军前锋逼近！点击阵地前沿发光区域，部署刀盾兵！',
        subText: '在阵线前端抗住伤害，掩护后续远程部队',
        targetKind: 'zone',
        unit: 'swordsman',
        zoneMinX: -5.0,
        zoneMaxX: 0.5,
        zoneTip: '请在前线区域（高亮处）部署刀盾兵！',
        event: 'deployed',
        unpauseOnDone: true,
      },
      {
        delayBefore: 3.5,
        pause: true,
        ensureEnergy: 3,
        ensureCooldown: 'archer',
        title: '步弓合击 · 远程火力',
        text: '刀盾兵已在阵前挡住敌军！在盾兵身后部署【弓兵】协同射击！',
        subText: '步兵抗伤、弓兵齐射，后排受掩护方能发挥最大杀伤',
        target: '.card[data-unit="archer"]',
        targetKind: 'card',
        unit: 'archer',
        event: 'cardSelected',
      },
      {
        pause: true,
        title: '后排阵位 · 箭雨压制',
        text: '在刀盾兵身后的安全区域点击，部署弓兵！',
        subText: '保持距离持续输出，顷刻荡平敌军',
        targetKind: 'zone',
        unit: 'archer',
        zoneMinX: -10.0,
        zoneMaxX: -4.5,
        zoneTip: '请在后排安全区域（高亮处）部署弓兵！',
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
        title: '主将走位 · 龙胆光环',
        text: '按住战场左右拖动，将主将赵云移至接战前线！',
        subText: '赵云被动【龙胆】可为光环内的友军提供攻速加成与持续回血',
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
    return u ? \`请按军师指引点选【\${u.name}】\` : '请按军师指引点选指定卡牌';
  }

  isZoneRestricted(unitId, x, z) {
    if (!this.waiting || !this.current) return false;
    const step = this.current;
    if (step.targetKind !== 'zone') return false;
    if (step.unit && step.unit !== unitId) {
      if (this.ui && this.ui.toast) this.ui.toast(this.getRestrictedTip(unitId) || '请按军师指引出兵！');
      return true;
    }
    if (step.zoneMinX !== undefined && (x < step.zoneMinX || x > step.zoneMaxX)) {
      if (this.ui && this.ui.toast) this.ui.toast(step.zoneTip || '请在指定的发光区域内部署！');
      return true;
    }
    return false;
  }

  handle(event, payload = {}) {
    if (!this.steps) return;
    if (event === 'cardSelected' && payload.id) this.flags[\`selected:\${payload.id}\`] = true;
    if (event === 'deployed') {
      this.flags.deployCount = (this.flags.deployCount || 0) + 1;
      if (payload.id) this.flags[\`deployed:\${payload.id}\`] = true;
    }
    if (event === 'spellCast') {
      this.flags.castCount = (this.flags.castCount || 0) + 1;
      if (payload.id) this.flags[\`cast:\${payload.id}\`] = true;
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
`;

fs.writeFileSync('E:/taptapgame/inkwar/code/src/tutorial.js', tutorialContent, 'utf8');
console.log('Successfully wrote src/tutorial.js');

console.log('--- Step 2: Completely rewrite src/first-guide.js ---');

const firstGuideContent = `// 墨阵山河 · 局外全局新手与无尽试炼全流程引导 (FirstGuide)
// 包含严格高亮遮罩、防误触拦截、大营升级、悬赏领双倍与换一换、祈将台、通关第20关无尽模式盛大指引

export const FIRST_GUIDE_STEPS = [
  // 阶段 1：首战出征
  {
    target: '#btn-campaign',
    title: '第一步 · 领兵征战',
    text: '主公，四方妖道作乱，军情紧急！先整顿兵马，出关迎敌！',
    act: 'levels',
  },
  {
    target: '#level-path .level-node[data-id="1"]',
    title: '第二步 · 初阵破敌',
    text: '第一战是黄巾散兵来犯，敌军散乱无序，正宜整顿三军试阵！',
    act: 'prep_1',
  },
  {
    target: '#btn-start-battle',
    title: '第三步 · 擂鼓开战',
    text: '先锋赵云与三路军马已就位！点击出征，局内将全程战术暂停指导战法！',
    act: 'battle_1',
  },

  // 阶段 2：首战大捷结算
  {
    target: '#btn-result-back',
    title: '第四步 · 旗开得胜',
    text: '首战大捷，缴获了充裕的军需与战功！点击返回主城，随我整备三军库府！',
    act: 'return_home',
  },

  // 阶段 3：认识库府四大核心资源
  {
    target: '.top-resources',
    title: '第五步 · 军备库府',
    text: '顶部展示了统领三军的核心资产：\\n🪙 军饷：升级大本营，提高军令上限与回令速度\\n💎 墨宝：获取稀世卡牌与高级特权\\n🎟️ 将令：祈愿名将与研习将印天资\\n🌀 试炼门票：第20关后开启【无尽模式】，每日免费2次，看广告无限补充！',
    act: 'next_tip',
    showNextBtn: true,
  },

  // 阶段 4：大营升级
  {
    target: '#btn-camp',
    title: '第六步 · 扩建大营',
    text: '胜仗缴获了大量军需！前往【大营】扩建军备！',
    act: 'open_camp',
  },
  {
    target: '#camp-upgrade',
    title: '第七步 · 升级大本营',
    text: '升级大本营可永久提升【军令上限】从20至25，出兵更加迅捷！',
    act: 'do_upgrade_camp',
  },
  {
    target: '#screen-camp .back-btn',
    title: '第八步 · 大营巩固',
    text: '大本营升级成功，战力大增！点击返回大厅，前往巡视山河悬赏！',
    act: 'return_home',
  },

  // 阶段 5：悬赏系统（双倍与刷新机制）
  {
    target: '.home-bounty-section',
    title: '第九步 · 山河悬赏',
    text: '军情台发布了每日与每周悬赏军务！点击悬赏栏，开启军令犒赏！',
    act: 'open_bounty',
  },
  {
    target: '#bounty-modal .bounty-modal-content',
    title: '第十步 · 悬赏要略',
    text: '每日悬赏提供 2 次免费【换一换】机会，用尽后看广告可额外+3次！\\n完成悬赏后不仅能正常领赏，更可选择【🎬 看广告双倍领取】，战备物资直接翻倍！',
    act: 'next_tip',
    showNextBtn: true,
  },
  {
    target: '#bounty-modal .bounty-close-btn',
    title: '第十一步 · 整备待发',
    text: '了解悬赏机制后关闭悬赏台，前往祈将台拜求神将！',
    act: 'close_bounty',
  },

  // 阶段 6：祈将台首次抽卡（必得 100 将令）
  {
    target: '#btn-gacha',
    title: '第十二步 · 祈将求贤',
    text: '功名盖世，必有名将慕名来投！前往【祈将台】寻访盖世神将！',
    act: 'open_gacha',
  },
  {
    target: '#btn-gacha-free',
    title: '第十三步 · 祈愿名将令',
    text: '每日可免费祈愿一次名将令！首次祈愿必得 100 将令大奖！',
    act: 'do_gacha_draw',
  },
  {
    target: '#screen-gacha .back-btn',
    title: '第十四步 · 神将令已备',
    text: '100 将令已收入囊中！可直接招募名将。日常看广告也可继续祈愿。现在出发征战下一关！',
    act: 'return_home',
  },

  // 阶段 7：再征第二关
  {
    target: '#btn-campaign',
    title: '第十五步 · 再征疆场',
    text: '军备已全，神将就位！随我出征第 2 关【麦田哨骑】！',
    act: 'levels',
  },
  {
    target: '#level-path .level-node[data-id="2"]',
    title: '第十六步 · 麦田哨骑',
    text: '第二战敌方哨骑来犯！点击进入战前整备！',
    act: 'prep_2',
  },
  {
    target: '#btn-start-battle',
    title: '第十七步 · 击退敌骑',
    text: '本关将实战学习防御建筑【箭塔】与主将光环运用！点击出战！',
    act: 'battle_2',
  },
];

export class FirstGuide {
  constructor(app) {
    this.app = app;
    this.ui = app.ui;
    this.step = 0;
    this.el = null;
    this.spot = null;
    this.tip = null;
    this.hand = null;
    this.activeTarget = null;
    this.done = false;

    this.onResize = () => this.refresh();
  }

  shouldStart() {
    const s = this.app.save;
    if (!s) return false;
    if (s.settings && s.settings.firstGuideDone) return false;
    return (s.progress.unlockedLevel || 1) === 1 && (s.stats.battles || 0) === 0;
  }

  start() {
    this.step = 0;
    this.done = false;
    this.build();
    this.show(0);
    window.addEventListener('resize', this.onResize);
  }

  build() {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = 'first-guide';
    el.innerHTML = \`
      <div class="fg-spot" style="display:none"></div>
      <div class="fg-hand" style="display:none">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
          <path d="M24 6 L24 30 M16 22 L24 30 L32 22" stroke="#c9a25e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="38" r="4.5" fill="#c9a25e"/>
        </svg>
      </div>
      <div class="fg-tip" style="display:none">
        <div class="fg-kicker"><span class="fg-badge">军师指引</span></div>
        <div class="fg-title"></div>
        <div class="fg-text"></div>
        <div class="fg-foot">
          <span class="fg-count"></span>
          <button class="btn btn-sm btn-paper fg-next-btn" style="display:none">下一步</button>
        </div>
      </div>
    \`;

    // 严格点击拦截遮罩：点击在非目标元素上时，提示用户必须按指引操作
    el.addEventListener('pointerdown', (e) => {
      if (this.activeTarget && this.activeTarget.contains(e.target)) {
        return; // 允许点击目标
      }
      if (this.tip && this.tip.contains(e.target)) {
        return; // 允许点击提示框内按钮
      }
      e.stopPropagation();
      e.preventDefault();
      if (this.ui && this.ui.toast) {
        this.ui.toast('请遵从军师指引，点击发光指定目标！');
      }
      if (this.spot) {
        this.spot.style.animation = 'none';
        void this.spot.offsetWidth;
        this.spot.style.animation = 'guide-target-pulse 0.4s ease 2';
      }
    }, true);

    document.body.appendChild(el);
    this.el = el;
    this.spot = el.querySelector('.fg-spot');
    this.hand = el.querySelector('.fg-hand');
    this.tip = el.querySelector('.fg-tip');
    this.nextBtn = el.querySelector('.fg-next-btn');

    this.nextBtn.onclick = (e) => {
      e.stopPropagation();
      this.show(this.step + 1);
    };
  }

  show(stepIdx) {
    if (stepIdx >= FIRST_GUIDE_STEPS.length) {
      this.finish();
      return;
    }
    this.step = stepIdx;
    const def = FIRST_GUIDE_STEPS[stepIdx];
    this.currentDef = def;

    // 清理前一个激活目标
    if (this.activeTarget) {
      this.activeTarget.classList.remove('fg-target-active');
      this.activeTarget = null;
    }

    setTimeout(() => {
      let targetEl = null;
      if (def.target) {
        const selectors = def.target.split(',');
        for (const sel of selectors) {
          const el = document.querySelector(sel.trim());
          if (el && el.offsetParent !== null) {
            targetEl = el;
            break;
          }
        }
      }

      this.activeTarget = targetEl;
      if (targetEl) {
        targetEl.classList.add('fg-target-active');
        this.positionSpot(targetEl);
      } else {
        if (this.spot) this.spot.style.display = 'none';
        if (this.hand) this.hand.style.display = 'none';
      }

      if (this.tip) {
        this.tip.style.display = 'block';
        this.tip.querySelector('.fg-title').textContent = def.title;
        this.tip.querySelector('.fg-text').innerHTML = def.text.replace(/\\n/g, '<br>');
        this.tip.querySelector('.fg-count').textContent = \`\${stepIdx + 1} / \${FIRST_GUIDE_STEPS.length}\`;
        if (this.nextBtn) {
          this.nextBtn.style.display = def.showNextBtn ? 'inline-block' : 'none';
        }
        this.positionTip(targetEl);
      }
    }, 120);
  }

  positionSpot(targetEl) {
    if (!targetEl || !this.spot) return;
    const r = targetEl.getBoundingClientRect();
    const pad = 6;
    this.spot.style.display = 'block';
    this.spot.style.left = \`\${r.left - pad}px\`;
    this.spot.style.top = \`\${r.top - pad}px\`;
    this.spot.style.width = \`\${r.width + pad * 2}px\`;
    this.spot.style.height = \`\${r.height + pad * 2}px\`;

    if (this.hand) {
      this.hand.style.display = 'block';
      this.hand.style.left = \`\${r.left + r.width / 2 - 24}px\`;
      this.hand.style.top = \`\${r.top - 54}px\`;
    }
  }

  positionTip(targetEl) {
    if (!this.tip) return;
    const pad = 16;
    if (!targetEl) {
      this.tip.style.left = '50%';
      this.tip.style.top = '50%';
      this.tip.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const r = targetEl.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    this.tip.style.transform = 'none';
    let top = r.bottom + pad;
    if (top + 160 > winH) {
      top = Math.max(12, r.top - 180);
    }
    let left = Math.max(16, Math.min(winW - 320, r.left + r.width / 2 - 150));
    this.tip.style.left = \`\${left}px\`;
    this.tip.style.top = \`\${top}px\`;
  }

  refresh() {
    if (this.activeTarget) {
      this.positionSpot(this.activeTarget);
      this.positionTip(this.activeTarget);
    }
  }

  finish() {
    this.done = true;
    if (this.activeTarget) {
      this.activeTarget.classList.remove('fg-target-active');
      this.activeTarget = null;
    }
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    window.removeEventListener('resize', this.onResize);
    this.app.save.settings.firstGuideDone = true;
    this.app.persist();
    if (this.ui) this.ui.toast('🎉 新手战术指引完成！名将归位，扫平山河！');
  }

  // ---------------- 第20关通关盛大解锁无尽模式（墨影试炼）引导 ----------------
  triggerEndlessUnlockGuide() {
    if (this.ui) {
      this.ui.openEndlessUnlockModal();
    }
  }
}
`;

fs.writeFileSync('E:/taptapgame/inkwar/code/src/first-guide.js', firstGuideContent, 'utf8');
console.log('Successfully wrote src/first-guide.js');

console.log('--- Step 3: Update src/battle/deploy.js to validate zone restrictions ---');
const deployPath = 'E:/taptapgame/inkwar/code/src/battle/deploy.js';
let deployContent = fs.readFileSync(deployPath, 'utf8').replace(/\r\n/g, '\n');

const deployTarget = `      const liveTroops = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building).length;`;
const deployReplacement = `      if (this.tutorial && this.tutorial.isZoneRestricted && this.tutorial.isZoneRestricted(unit.id, x, z)) {
        if (audio.error) audio.error();
        return;
      }
      const liveTroops = this.entities.filter((e) => e.alive && e.side === 'player' && !e.unit.building).length;`;

if (deployContent.includes(deployTarget) && !deployContent.includes('isZoneRestricted')) {
  deployContent = deployContent.replace(deployTarget, deployReplacement);
  fs.writeFileSync(deployPath, deployContent, 'utf8');
  console.log('Successfully updated src/battle/deploy.js');
} else {
  console.log('src/battle/deploy.js already has isZoneRestricted or target not found');
}

console.log('--- Step 4: Update src/ui/battle-hud.js with blocking scrim support ---');
const hudPath = 'E:/taptapgame/inkwar/code/src/ui/battle-hud.js';
let hudContent = fs.readFileSync(hudPath, 'utf8').replace(/\r\n/g, '\n');

const targetScrimBlock = `    if (!this.tutorialScrim) {
      this.tutorialScrim = document.createElement('div');
      this.tutorialScrim.className = 'tutorial-scrim';
      const hud = document.getElementById('battle-hud');
      if (hud) hud.appendChild(this.tutorialScrim);
    }
    if (this.tutorialScrim) {
      this.tutorialScrim.classList.toggle('show', pause);
    }`;

const replScrimBlock = `    if (!this.tutorialScrim) {
      this.tutorialScrim = document.createElement('div');
      this.tutorialScrim.className = 'tutorial-scrim';
      const hud = document.getElementById('battle-hud');
      if (hud) hud.appendChild(this.tutorialScrim);
      this.tutorialScrim.addEventListener('pointerdown', (e) => {
        if (this.tutorialScrim.classList.contains('blocking')) {
          e.stopPropagation();
          e.preventDefault();
          this.toast('请按军师指引操作！');
        }
      });
    }
    if (this.tutorialScrim) {
      this.tutorialScrim.classList.toggle('show', pause);
      this.tutorialScrim.classList.toggle('blocking', !!opt.blocking);
    }`;

if (hudContent.includes(targetScrimBlock)) {
  hudContent = hudContent.replace(targetScrimBlock, replScrimBlock);
  hudContent = hudContent.replace(
    `if (this.tutorialScrim) this.tutorialScrim.classList.remove('show');`,
    `if (this.tutorialScrim) this.tutorialScrim.classList.remove('show', 'blocking');`
  );
  fs.writeFileSync(hudPath, hudContent, 'utf8');
  console.log('Successfully updated src/ui/battle-hud.js');
} else {
  console.log('Target for battle-hud.js not found or already updated');
}

console.log('--- Step 5: Update src/main.js to wire reward showcases, remove tour, and handle Level 20 unlock ---');
const mainPath = 'E:/taptapgame/inkwar/code/src/main.js';
let mainContent = fs.readFileSync(mainPath, 'utf8').replace(/\r\n/g, '\n');

// 5.1 Remove Tour import
mainContent = mainContent.replace(/import \{ Tour \} from '\.\/tour\.js\?v=1\.\d+';\n/, '');

// 5.2 Replace claimBounty and claimAllBounties with rich reward modal & 2x ad
const targetClaimBounty = `  claimBounty(bountyId) {
    const res = BountyManager.claim(this.save, bountyId);
    if (!res.success) {
      this.ui.toast(res.msg || '无法领取该悬赏');
      return;
    }
    this.persist();
    audio.drum(null, true, 0.5);
    audio.gong(null, 1.3);
    const r = res.rewards;
    const rewList = [];
    if (r.mobao) rewList.push(\`\${r.mobao} 墨宝\`);
    if (r.tokens) rewList.push(\`\${r.tokens} 将令\`);
    if (r.supplies) rewList.push(\`\${r.supplies} 军需\`);
    if (r.fragments) rewList.push(\`\${r.fragments} 碎片\`);

    this.ui.toast(\`📜 悬赏犒赏入库：获得 \${rewList.join('、')}！\`);
    if (this.ui) {
      this.ui.refreshHome();
      if (this.ui.refreshCamp) this.ui.refreshCamp();
      if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
        this.ui.renderBountyModalList();
      }
    }
  }

  claimAllBounties() {
    const res = BountyManager.claimAll(this.save);
    if (!res.success) {
      this.ui.toast(res.msg || '暂无已达成可领取的悬赏');
      return;
    }
    this.persist();
    audio.drum(null, true, 0.6);
    audio.gong(null, 1.4);
    const r = res.rewards;
    const rewList = [];
    if (r.mobao) rewList.push(\`\${r.mobao} 墨宝\`);
    if (r.tokens) rewList.push(\`\${r.tokens} 将令\`);
    if (r.supplies) rewList.push(\`\${r.supplies} 军需\`);
    if (r.fragments) rewList.push(\`\${r.fragments} 碎片\`);

    this.ui.toast(\`📜 一键领赏成功（共 \${res.count} 项）：获得 \${rewList.join('、')}！\`);
    if (this.ui) {
      this.ui.refreshHome();
      if (this.ui.refreshCamp) this.ui.refreshCamp();
      if (this.ui.bountyModal && this.ui.bountyModal.classList.contains('show') && this.ui.renderBountyModalList) {
        this.ui.renderBountyModalList();
      }
    }
  }`;

const replClaimBounty = `  claimBounty(bountyId, doubleReward = false) {
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
        subtitle: \`一键大犒三军（共达成 \${res.count} 项悬赏）！\`,
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
  }`;

if (mainContent.includes(targetClaimBounty)) {
  mainContent = mainContent.replace(targetClaimBounty, replClaimBounty);
  console.log('Successfully updated claimBounty in main.js');
}

// 5.3 Update startEndlessMode to check unlocked and tickets
const targetStartEndless = `  startEndlessMode(continueSaved = false) {
    // 遵照用户指示：进入无尽模式前先进入点将台（出战卡组与主将选择界面）
    this.openEndlessPrep(continueSaved);
  }`;

const replStartEndless = `  startEndlessMode(continueSaved = false) {
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
  }`;

if (mainContent.includes(targetStartEndless)) {
  mainContent = mainContent.replace(targetStartEndless, replStartEndless);
  console.log('Successfully updated startEndlessMode in main.js');
}

// 5.4 Update startBattle to consume ticket for endless mode
const targetStartBattle = `    this.lastBattleConfig = { levelId: level.id, heroId, deck: deck.slice(), extraOpts };`;
const replStartBattle = `    this.lastBattleConfig = { levelId: level.id, heroId, deck: deck.slice(), extraOpts };
    if (level.isEndless && (!extraOpts || !extraOpts.savedEndlessState)) {
      EndlessManager.consumeTicket(this.save);
      this.persist();
      this.ui.refreshHome();
    }`;

if (mainContent.includes(targetStartBattle) && !mainContent.includes('EndlessManager.consumeTicket')) {
  mainContent = mainContent.replace(targetStartBattle, replStartBattle);
  console.log('Successfully updated startBattle in main.js');
}

// 5.5 In handleBattleFinish, trigger Endless Mode Unlock modal upon clearing level 20
const targetWinCheck = `    if (result.win) {
      if (result.bonusTokens) {`;
const replWinCheck = `    if (result.win) {
      if (level && level.id === 20 && !save.guide?.endlessUnlockedModalShown) {
        save.guide = save.guide || {};
        save.guide.endlessUnlockedModalShown = true;
        this.persist();
        setTimeout(() => {
          if (this.firstGuide) this.firstGuide.triggerEndlessUnlockGuide();
          else if (this.ui) this.ui.openEndlessUnlockModal();
        }, 600);
      }
      if (result.bonusTokens) {`;

if (mainContent.includes(targetWinCheck) && !mainContent.includes('endlessUnlockedModalShown')) {
  mainContent = mainContent.replace(targetWinCheck, replWinCheck);
  console.log('Successfully updated level 20 clear unlock in main.js');
}

// Remove tour calls from mainContent
mainContent = mainContent.replace(/this\.maybeStartTour\(\);/g, '');
mainContent = mainContent.replace(/if \(this\.tour\) this\.tour\.abort\(\);/g, '');

fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('Finished writing updates to src/main.js');

console.log('--- Step 6: Update styles.css with blocking scrim rule ---');
const stylesPath = 'E:/taptapgame/inkwar/code/styles.css';
let stylesContent = fs.readFileSync(stylesPath, 'utf8').replace(/\r\n/g, '\n');

if (!stylesContent.includes('.tutorial-scrim.blocking')) {
  stylesContent += `
/* 教程点击强拦截屏障 */
.tutorial-scrim.blocking {
  pointer-events: auto !important;
  cursor: not-allowed;
}
`;
  fs.writeFileSync(stylesPath, stylesContent, 'utf8');
  console.log('Successfully appended .tutorial-scrim.blocking to styles.css');
}

console.log('--- ALL UPDATES APPLIED SUCCESSFULLY ---');

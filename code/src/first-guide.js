// 墨阵山河 · 局外全局新手与无尽试炼全流程引导 (FirstGuide)
// 包含严格高亮遮罩、防误触拦截、聚光灯点击代理、大营升级、悬赏领双倍与换一换、祈将台、通关第20关无尽模式盛大指引

export const FIRST_GUIDE_STEPS = [
  // 阶段 1：首战出征
  {
    target: '#btn-campaign',
    title: '第一步 · 领兵征战',
    text: '主公，四方妖道作乱，军情紧急！先整顿兵马，出关迎敌！',
    act: 'levels',
  },
  {
    target: '#btn-level-go, #level-path .level-node[data-id="1"]',
    title: '第二步 · 初阵破敌',
    text: '第一战是黄巾散兵来犯，敌军散乱无序，点击【出征】进军迎战！',
    act: 'prep_1',
  },
  {
    target: '#btn-start-battle',
    title: '第三步 · 擂鼓开战',
    text: '先锋赵云与三路军马已就位！点击出战，局内将全程战术暂停指导战法！',
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
    text: '顶部展示了统领三军的核心资产：\n🪙 军饷：升级大本营，提高军令上限与回令速度\n💎 墨宝：获取稀世卡牌与高级特权\n🎟️ 将令：祈愿名将与研习将印天资\n🌀 试炼门票：第20关后开启【无尽模式】，每日免费2次，看广告无限补充！',
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
    target: '.home-bounty-section, #btn-bounty, #btn-open-bounty-all',
    title: '第九步 · 山河悬赏',
    text: '军情台发布了每日与每周悬赏军务！点击悬赏栏，开启军令犒赏！',
    act: 'open_bounty',
  },
  {
    target: '#bounty-modal .bounty-paper, #bounty-modal .modal-paper, #bounty-modal',
    title: '第十步 · 悬赏要略',
    text: '每日悬赏提供 2 次免费【换一换】机会，用尽后看广告可额外+3次！\n完成悬赏后不仅能正常领赏，更可选择【🎬 看广告双倍领取】，战备物资直接翻倍！',
    act: 'next_tip',
    showNextBtn: true,
  },

  // 阶段 6：祈将台首次抽卡（必得 100 将令）
  {
    target: '#btn-gacha',
    title: '第十一步 · 祈将求贤',
    text: '功名盖世，必有名将慕名来投！前往【祈将台】寻访盖世神将！',
    act: 'open_gacha',
  },
  {
    target: '#btn-gacha-free',
    title: '第十二步 · 祈愿名将令',
    text: '每日可免费祈愿一次名将令！首次祈愿必得 100 将令大奖！',
    act: 'do_gacha_draw',
  },
  {
    target: '#screen-gacha .back-btn',
    title: '第十三步 · 神将令已备',
    text: '100 将令已收入囊中！可直接招募名将。日常看广告也可继续祈愿。现在出发征战下一关！',
    act: 'return_home',
  },

  // 阶段 7：再征第二关
  {
    target: '#btn-campaign',
    title: '第十四步 · 再征疆场',
    text: '军备已全，神将就位！随我出征第 2 关【麦田哨骑】！',
    act: 'levels',
  },
  {
    target: '#btn-level-go, #level-path .level-node[data-id="2"]',
    title: '第十五步 · 麦田哨骑',
    text: '第二战敌方哨骑来犯！点击进入战前整备！',
    act: 'prep_2',
  },
  {
    target: '#btn-start-battle',
    title: '第十六步 · 击退敌骑',
    text: '本关将实战学习防御建筑【箭塔】与主将光环运用！点击出战！',
    act: 'battle_2',
  },
];

// 第三关通关后的「点将升阶」小引导（独立流程，不影响首导）
export const HERO_UPGRADE_STEPS = [
  {
    target: '#btn-heroes',
    title: '点将 · 第一步',
    text: '第三关已破，敌军会越来越硬。随我去【点将台】，用积攒的墨宝永久提升主将。',
  },
  {
    target: '#btn-hero-upgrade',
    title: '点将 · 第二步',
    text: '点「晋升」消耗墨宝升阶：生命、攻击、护甲永久提升，每 3 阶还会解锁新被动。',
  },
  {
    target: '#screen-codex .back-btn',
    title: '点将 · 第三步',
    text: '主将已强，回军府继续下一关。每关结算都会掉墨宝，记得常回来升阶。',
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
    this.nextBtn = null;
    this.activeTarget = null;
    this.done = false;
    this.locked = false;
    this.mode = 'main';
    this.steps = FIRST_GUIDE_STEPS;

    this.onResize = () => this.refresh();
    this.onScroll = () => this.refresh();
  }

  shouldStart() {
    const s = this.app.save;
    if (!s) return false;
    if (s.settings && s.settings.firstGuideDone) return false;
    return (s.progress.unlockedLevel || 1) === 1 && (s.stats.battles || 0) === 0;
  }

  attachListeners() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.removeEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    window.addEventListener('scroll', this.onScroll, true);
  }

  start() {
    this.mode = 'main';
    this.steps = FIRST_GUIDE_STEPS;
    this.step = 0;
    this.done = false;
    this.build();
    this.show(0);
    this.attachListeners();
  }

  // 第三关通关后的「点将升阶」引导（独立三小步）
  startHeroUpgradeGuide() {
    this.mode = 'hero';
    this.steps = HERO_UPGRADE_STEPS;
    this.step = 0;
    this.done = false;
    this.build();
    if (this.el) this.el.style.display = 'block';
    this.show(0);
    this.attachListeners();
  }

  build() {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = 'first-guide';
    el.innerHTML = `
      <div class="fg-spot" style="display:none"></div>
      <div class="fg-hand" style="display:none">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
          <path d="M24 6 L24 30 M16 22 L24 30 L32 22" stroke="#fef08a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 6 L24 30 M16 22 L24 30 L32 22" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="38" r="4.5" fill="#fef08a" stroke="#b91c1c" stroke-width="2"/>
        </svg>
      </div>
      <div class="fg-tip" style="display:none">
        <div class="fg-header-row">
          <div class="fg-kicker"><span class="fg-badge">军师指引</span></div>
          <button class="fg-skip-all-btn" title="直接跳过新手教学">跳过指引 ✕</button>
        </div>
        <div class="fg-title"></div>
        <div class="fg-text"></div>
        <div class="fg-foot">
          <span class="fg-count"></span>
          <div class="fg-actions">
            <button class="btn btn-sm btn-paper fg-skip-step-btn">跳过本步</button>
            <button class="btn btn-sm btn-seal fg-next-btn" style="display:none">下一步</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.el = el;
    this.spot = el.querySelector('.fg-spot');
    this.hand = el.querySelector('.fg-hand');
    this.tip = el.querySelector('.fg-tip');
    this.nextBtn = el.querySelector('.fg-next-btn');
    this.skipStepBtn = el.querySelector('.fg-skip-step-btn');
    this.skipAllBtn = el.querySelector('.fg-skip-all-btn');

    // 跳过全局引导
    this.skipAllBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.finish();
    });

    // 跳过当前步骤
    this.skipStepBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleTargetClick();
    });

    // 点击聚光灯高亮区：触发目标点击与引导推进
    const handleSpot = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.locked) return;
      this.locked = true;
      setTimeout(() => { this.locked = false; }, 300);
      this.handleTargetClick();
    };
    this.spot.addEventListener('pointerdown', handleSpot);

    // 下一步按钮
    const handleNext = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.locked) return;
      this.locked = true;
      setTimeout(() => { this.locked = false; }, 300);
      this.handleTargetClick();
    };
    this.nextBtn.addEventListener('pointerdown', handleNext);

    // 拦截空白区域乱点；如果目标丢失或找不到，直接推进防止卡死！
    el.addEventListener('pointerdown', (e) => {
      if (this.tip && this.tip.contains(e.target)) return;
      if (this.spot && (this.spot === e.target || this.spot.contains(e.target))) return;

      // 如果当前步骤目标未找到或不在视口中，点击屏幕任意处直接推进，防止死锁困死玩家
      if (!this.activeTarget || !this.activeTarget.isConnected) {
        e.stopPropagation();
        e.preventDefault();
        this.handleTargetClick();
        return;
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
    });
  }

  findTarget(selector, onFound, retries = 12) {
    if (!selector) {
      onFound(null);
      return;
    }
    const selectors = selector.split(',');
    for (const sel of selectors) {
      const el = document.querySelector(sel.trim());
      const rect = el ? el.getBoundingClientRect() : null;
      if (el && (el.offsetParent !== null || (rect && (rect.width > 0 || rect.height > 0)))) {
        onFound(el);
        return;
      }
    }
    if (retries > 0) {
      setTimeout(() => this.findTarget(selector, onFound, retries - 1), 60);
    } else {
      onFound(null);
    }
  }

  // 把目标滚进最近的可滚动祖先（选关列表、详情抽屉、兵册等），避免高亮落在屏幕外
  ensureTargetVisible(el) {
    if (!el) return false;
    const margin = 14;
    let moved = false;
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const cs = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll|overlay)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 2;
      const canScrollX = /(auto|scroll|overlay)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 2;
      if (canScrollY || canScrollX) {
        const nr = node.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (canScrollY && er.top < nr.top + margin) {
          node.scrollTop -= (nr.top + margin) - er.top;
          moved = true;
        } else if (canScrollY && er.bottom > nr.bottom - margin) {
          node.scrollTop += er.bottom - (nr.bottom - margin);
          moved = true;
        }
        if (canScrollX && er.left < nr.left + margin) {
          node.scrollLeft -= (nr.left + margin) - er.left;
          moved = true;
        } else if (canScrollX && er.right > nr.right - margin) {
          node.scrollLeft += er.right - (nr.right - margin);
          moved = true;
        }
      }
      node = node.parentElement;
    }
    return moved;
  }

  show(stepIdx) {
    const steps = this.steps || FIRST_GUIDE_STEPS;
    if (stepIdx >= steps.length) {
      this.finish();
      return;
    }
    this.step = stepIdx;
    const def = steps[stepIdx];
    this.currentDef = def;

    if (this.el) this.el.style.display = 'block';

    if (this.activeTarget) {
      this.activeTarget.classList.remove('fg-target-active');
      this.activeTarget = null;
    }

    this.findTarget(def.target, (targetEl) => {
      this.activeTarget = targetEl;
      if (targetEl) {
        targetEl.classList.add('fg-target-active');
        this.ensureTargetVisible(targetEl);
        this.positionSpot(targetEl, !!def.showNextBtn);
      } else {
        if (this.spot) this.spot.style.display = 'none';
        if (this.hand) this.hand.style.display = 'none';
        // 防死锁容错：目标未在当前画面时，显式展示“继 续”按钮，点击即可前往下一步
        if (this.nextBtn) {
          this.nextBtn.textContent = '继 续';
          this.nextBtn.style.display = 'inline-block';
        }
      }

      if (this.tip) {
        this.tip.style.display = 'block';
        this.tip.querySelector('.fg-title').textContent = def.title;
        this.tip.querySelector('.fg-text').innerHTML = def.text.replace(/\n/g, '<br>');
        this.tip.querySelector('.fg-count').textContent = `${stepIdx + 1} / ${steps.length}`;
        if (this.nextBtn) {
          // 若有显式 showNextBtn，或找不到目标时展示“继 续”，否则隐藏
          this.nextBtn.style.display = (def.showNextBtn || !targetEl) ? 'inline-block' : 'none';
          if (!targetEl) this.nextBtn.textContent = '继 续';
          else this.nextBtn.textContent = '下一步';
        }
        this.positionTip(targetEl);
      }
    });
  }

  positionSpot(targetEl, isInfoOnly = false) {
    if (!targetEl || !this.spot) return;
    const r = targetEl.getBoundingClientRect();
    const pad = 6;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const left = Math.max(0, Math.min(winW - 8, r.left - pad));
    const top = Math.max(0, Math.min(winH - 8, r.top - pad));
    this.spot.style.display = 'block';
    this.spot.style.left = `${left}px`;
    this.spot.style.top = `${top}px`;
    this.spot.style.width = `${Math.max(24, Math.min(winW - left, r.width + pad * 2))}px`;
    this.spot.style.height = `${Math.max(24, Math.min(winH - top, r.height + pad * 2))}px`;
    this.spot.style.pointerEvents = isInfoOnly ? 'none' : 'auto';

    if (this.hand) {
      this.hand.style.display = isInfoOnly ? 'none' : 'block';
      this.hand.style.left = `${Math.max(0, Math.min(winW - 48, r.left + r.width / 2 - 24))}px`;
      this.hand.style.top = `${Math.max(4, Math.min(winH - 56, r.top - 54))}px`;
    }
  }

  positionTip(targetEl) {
    if (!this.tip) return;
    const pad = 12;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    if (!targetEl) {
      this.tip.style.left = '50%';
      this.tip.style.top = '50%';
      this.tip.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const r = targetEl.getBoundingClientRect();
    const tw = Math.min(360, winW - 24);
    const th = this.tip.offsetHeight || 180;

    // 智能避让：若目标在屏幕右侧下半部分（如出征按钮、右下角功能区），气泡置于目标左上方或正上方，绝不遮盖目标！
    let left, top;
    const isTargetBottomRight = (r.right > winW * 0.55 && r.bottom > winH * 0.55);
    if (isTargetBottomRight && winW >= 640) {
      // 放置在目标的左侧上方
      left = Math.max(12, r.left - tw - 16);
      top = Math.max(12, Math.min(winH - th - 12, r.top - 40));
    } else if (r.top - pad - th >= 12) {
      // 目标上方
      top = r.top - pad - th;
      left = r.left + r.width / 2 - tw / 2;
    } else if (r.bottom + pad + th <= winH - 12) {
      // 目标下方
      top = r.bottom + pad;
      left = r.left + r.width / 2 - tw / 2;
    } else {
      // 目标侧边或居中
      top = Math.max(12, (winH - th) / 2);
      left = (r.left > winW / 2) ? Math.max(12, r.left - tw - 16) : Math.min(winW - tw - 12, r.right + 16);
    }

    left = Math.max(10, Math.min(winW - tw - 10, left));
    top = Math.max(10, Math.min(winH - th - 10, top));

    this.tip.style.transform = 'none';
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${top}px`;
  }

  handleTargetClick() {
    const target = this.activeTarget;
    const curStep = this.step;

    // 点将升阶引导：独立三小步
    if (this.mode === 'hero') {
      if (target) {
        try {
          if (typeof target.click === 'function') target.click();
          else target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        } catch (err) {
          console.warn('Error clicking target:', err);
        }
      }
      if (curStep === 0) {
        setTimeout(() => this.show(1), 320);
      } else if (curStep === 1) {
        setTimeout(() => this.show(2), 520);
      } else if (curStep === 2) {
        this.finish();
      } else {
        this.show(curStep + 1);
      }
      return;
    }

    // 1. 触发目标自身原生点击响应
    if (target) {
      try {
        if (typeof target.click === 'function') {
          target.click();
        } else {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      } catch (err) {
        console.warn('Error clicking target:', err);
      }
    }

    // 2. 步骤推进与场景切换协同
    if (curStep === 0) {
      // 点击征战 -> 打开关卡列表 -> 高亮第一关
      setTimeout(() => this.show(1), 220);
    } else if (curStep === 1) {
      // 点击第一关 -> 打开点将台 -> 高亮出战
      if (this.app && this.app.openPrep) this.app.openPrep(1);
      setTimeout(() => this.show(2), 220);
    } else if (curStep === 2) {
      // 点击出战 -> 进入第一关战斗 -> 隐藏局外引导
      this.hide();
    } else if (curStep === 3) {
      // 点击结算返回 -> 由 returnToLevels 推进至第 4 步(即 show(4))
      // 如果仍在此处触发，直接推进至第 4 步
      setTimeout(() => this.show(4), 220);
    } else if (curStep === 4) {
      // 认识库府 -> 点击下一步 -> 高亮大营
      this.show(5);
    } else if (curStep === 5) {
      // 点击大营 -> 打开大营 -> 高亮升级大本营
      setTimeout(() => this.show(6), 220);
    } else if (curStep === 6) {
      // 点击升级大营 -> 升级成功 -> 高亮大营返回按钮
      setTimeout(() => this.show(7), 220);
    } else if (curStep === 7) {
      // 点击返回 -> 回主界面 -> 高亮山河悬赏
      setTimeout(() => this.show(8), 220);
    } else if (curStep === 8) {
      // 点击山河悬赏 -> 打开悬赏弹窗 -> 高亮悬赏要略
      setTimeout(() => this.show(9), 220);
    } else if (curStep === 9) {
      // 悬赏要略 -> 点击下一步 -> 自动关闭悬赏弹窗 -> 高亮祈将台
      if (this.ui && this.ui.hideBountyModal) this.ui.hideBountyModal();
      setTimeout(() => this.show(10), 220);
    } else if (curStep === 10) {
      // 点击祈将台 -> 打开祈将台 -> 高亮免费祈愿
      setTimeout(() => this.show(11), 220);
    } else if (curStep === 11) {
      // 点击免费祈愿 -> 抽卡获得100将令 -> 高亮返回按钮
      setTimeout(() => this.show(12), 350);
    } else if (curStep === 12) {
      // 点击祈将台返回 -> 回主界面 -> 高亮再征疆场
      setTimeout(() => this.show(13), 220);
    } else if (curStep === 13) {
      // 点击再征疆场 -> 打开关卡列表 -> 高亮第二关
      setTimeout(() => this.show(14), 220);
    } else if (curStep === 14) {
      // 点击第二关 -> 打开点将台 -> 高亮出战
      if (this.app && this.app.openPrep) this.app.openPrep(2);
      setTimeout(() => this.show(15), 220);
    } else if (curStep === 15) {
      // 点击第二关出战 -> 胜利完成新手引导！
      this.finish();
    } else {
      this.show(curStep + 1);
    }
  }

  hide() {
    if (this.activeTarget) {
      this.activeTarget.classList.remove('fg-target-active');
      this.activeTarget = null;
    }
    if (this.spot) this.spot.style.display = 'none';
    if (this.hand) this.hand.style.display = 'none';
    if (this.tip) this.tip.style.display = 'none';
    if (this.el) this.el.style.display = 'none';
  }

  refresh() {
    if (this.activeTarget) {
      this.positionSpot(this.activeTarget, !!(this.currentDef && this.currentDef.showNextBtn));
      this.positionTip(this.activeTarget);
    }
  }

  finish() {
    this.done = true;
    this.hide();
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.removeEventListener('scroll', this.onScroll, true);
    const wasHero = this.mode === 'hero';
    if (wasHero) {
      this.app.save.settings.heroGuideDone = true;
      this.mode = 'main';
      this.steps = FIRST_GUIDE_STEPS;
    } else {
      this.app.save.settings.firstGuideDone = true;
    }
    this.app.persist();
    if (this.ui) {
      this.ui.toast(wasHero
        ? '🎉 主将升阶完成！记得每关结算后回来升阶'
        : '🎉 新手战术指引完成！名将归位，扫平山河！');
    }
  }

  // ---------------- 第20关通关盛大解锁无尽模式（墨影试炼）引导 ----------------
  triggerEndlessUnlockGuide() {
    if (this.ui) {
      this.ui.openEndlessUnlockModal();
    }
  }
}

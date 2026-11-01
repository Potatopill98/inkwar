// 军府巡礼：第 4 关首通后，带玩家逐站认识局外各入口（design §5.7）
// 只做高亮 + 讲解，不锁操作，玩家可以随手点开页面试
const STEPS = [
  {
    title: '征 战',
    text: '山河图在这里：选关、看敌情、配出战卡组——一局最多带 6 张卡，术法最多 2 张。点「出战」开打，通关拿 1–3 星，首通还会解锁新兵种和新英雄。',
    target: '#btn-campaign',
  },
  {
    title: '点 将',
    text: '主将决定你这局的光环和主动技能。点开名册换人：赵云突阵、关羽斩将、花木兰连射，各自打法不同。',
    open: 'heroes',
    target: '#codex-grid',
  },
  {
    title: '兵 册',
    text: '打之前先看兵册：费用、护甲、克制都写清楚了。长枪克骑兵，弓兵怕刺客，盾兵能挡箭。',
    open: 'codex',
    target: '#codex-grid',
  },
  {
    title: '祈 将',
    text: '攒够 100 将令可以指定召唤一位英雄；每天还有一次免费祈愿，广告祈愿一天三次。',
    open: 'gacha',
    target: '.gacha-draw-panel',
  },
  {
    title: '大 营',
    text: '用军需升级大本营：每级 +1 军令上限、+0.05 回复，20 级满级。打关和每日领取都能攒军需。',
    open: 'camp',
    target: '.camp-card',
  },
  {
    title: '战 功 榜',
    text: '战功按星级、关卡和速胜计算，首通额外加分。战功越高，排名越靠前。',
    open: 'rank',
    target: '.leaderboard-seal',
  },
  {
    title: '军 府 巡 礼 完',
    text: '军府就这几处：征战配兵开打、点将换主将、兵册查克制、祈将收英雄、大营升军令。熟悉了就从「征战」继续下一关吧。',
    target: null,
    finish: true,
  },
];

export class Tour {
  constructor(app) {
    this.app = app;
    this.index = 0;
    this.el = null;
    this.spot = null;
    this.onResize = () => this.refresh();
    // 玩家随手点开别的页面时重算高亮；找不到目标就自动隐藏
    this.onDocClick = () => {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh(), 150);
    };
  }

  start() {
    if (this.el) return;
    this.index = 0;
    this.build();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('click', this.onDocClick, true);
    this.goto(0);
  }

  detach() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('click', this.onDocClick, true);
    clearTimeout(this.refreshTimer);
  }

  build() {
    const layer = document.createElement('div');
    layer.className = 'tour-layer';
    layer.innerHTML = `
      <div class="tour-spot"></div>
      <div class="tour-card">
        <span class="tour-step"></span>
        <h3 class="tour-title"></h3>
        <p class="tour-text"></p>
        <div class="tour-actions">
          <button class="btn btn-ghost btn-sm tour-skip" type="button">跳过巡礼</button>
          <button class="btn btn-seal btn-sm tour-next" type="button">下一站</button>
        </div>
      </div>`;
    document.body.appendChild(layer);
    this.el = layer;
    this.spot = layer.querySelector('.tour-spot');
    this.stepEl = layer.querySelector('.tour-step');
    this.titleEl = layer.querySelector('.tour-title');
    this.textEl = layer.querySelector('.tour-text');
    this.nextBtn = layer.querySelector('.tour-next');
    layer.querySelector('.tour-skip').addEventListener('click', () => this.finish(true));
    this.nextBtn.addEventListener('click', () => this.next());
  }

  openStep(step) {
    const app = this.app;
    switch (step.open) {
      case 'heroes': app.openCodex('heroes'); break;
      case 'codex': app.openCodex('units'); break;
      case 'gacha': app.openGacha(); break;
      case 'camp': app.openCamp(); break;
      case 'rank': app.openLeaderboardScreen(); break;
      default:
        app.ui.refreshHome();
        app.ui.showScreen('screen-home');
    }
  }

  goto(i) {
    this.index = i;
    const step = STEPS[i];
    if (!step) {
      this.finish();
      return;
    }
    this.openStep(step);
    this.stepEl.textContent = `第 ${i + 1} / ${STEPS.length} 站`;
    this.titleEl.textContent = step.title;
    this.textEl.textContent = step.text;
    this.nextBtn.textContent = step.finish ? '返 回 军 府' : '下 一 站';
    this.el.classList.toggle('tour-layer--final', !!step.finish);
    setTimeout(() => this.refresh(), 90);
  }

  ensureVisible(el) {
    if (!el) return;
    const margin = 12;
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const cs = window.getComputedStyle(node);
      const canY = /(auto|scroll|overlay)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 2;
      const canX = /(auto|scroll|overlay)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 2;
      if (canY || canX) {
        const nr = node.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (canY && er.top < nr.top + margin) node.scrollTop -= (nr.top + margin) - er.top;
        else if (canY && er.bottom > nr.bottom - margin) node.scrollTop += er.bottom - (nr.bottom - margin);
        if (canX && er.left < nr.left + margin) node.scrollLeft -= (nr.left + margin) - er.left;
        else if (canX && er.right > nr.right - margin) node.scrollLeft += er.right - (nr.right - margin);
      }
      node = node.parentElement;
    }
  }

  refresh() {
    if (!this.el) return;
    const step = STEPS[this.index];
    const target = step && step.target ? document.querySelector(step.target) : null;
    if (!target) {
      this.spot.style.display = 'none';
      return;
    }
    this.ensureVisible(target);
    const r = target.getBoundingClientRect();
    if (!r.width || !r.height) {
      this.spot.style.display = 'none';
      return;
    }
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
    // 高亮在右侧时，讲解卡放左边，避免互相遮挡
    const onRight = r.left + r.width / 2 > window.innerWidth * 0.55;
    this.el.classList.toggle('tour-layer--flip', !onRight && !!step.open);
  }

  next() {
    const step = STEPS[this.index];
    if (step && step.finish) {
      this.finish();
      return;
    }
    this.goto(this.index + 1);
  }

  // 中途点进战斗：先收起讲解（不记为完成），回主界面后从头再来
  abort() {
    if (!this.el) return;
    this.detach();
    this.el.remove();
    this.el = null;
    this.spot = null;
    this.app.onTourPaused();
  }

  finish(skipped = false) {
    if (!this.el) return;
    this.detach();
    this.el.remove();
    this.el = null;
    this.spot = null;
    this.app.onTourFinished(skipped);
  }
}

export { STEPS as TOUR_STEPS };

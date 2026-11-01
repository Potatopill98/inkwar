// 《墨阵山河》伤害与克制水墨飘字系统 (Damage Floating Text v1.0)
// 符合规划稿 §2.3：24 节点对象池、三维世界坐标投影、鎏金“克”字印章、防刷屏合并与多类型水墨反馈
import * as THREE from '../../lib/three.module.js';

export class DamageTextManager {
  constructor(container, maxPoolSize = 24) {
    this.container = container;
    this.maxPoolSize = maxPoolSize;
    this.pool = [];
    this.active = [];
    this.enabled = true;
    this.lastCounterStampTime = -1000;
    this._tempV = new THREE.Vector3();

    // 确保容器存在
    if (typeof document !== 'undefined' && !this.container) {
      this.container = document.createElement('div');
      this.container.id = 'dmg-layer';
      this.container.className = 'dmg-layer';
      const battleScreen = document.getElementById('screen-battle') || document.body;
      if (battleScreen) battleScreen.appendChild(this.container);
    }

    // 预分配 24 个 DOM 元素对象池，杜绝运行时频繁创建与 GC 抖动
    for (let i = 0; i < this.maxPoolSize; i++) {
      const el = typeof document !== 'undefined' 
        ? document.createElement('div') 
        : { style: {}, className: '', innerHTML: '' };
      el.className = 'dmg-item';
      el.style.display = 'none';
      if (this.container && typeof this.container.appendChild === 'function') {
        this.container.appendChild(el);
      }
      this.pool.push({
        el,
        life: 0,
        maxLife: 0.7,
        x: 0,
        y: 0,
        z: 0,
        unit: null,
        type: 'normal',
        val: 0,
        count: 1,
      });
    }
  }

  // 释放或重置飘字
  clear() {
    for (const slot of this.pool) {
      slot.life = 0;
      slot.el.style.display = 'none';
    }
    this.active.length = 0;
  }

  // 产生飘字
  spawn(opts = {}) {
    if (!this.enabled && !opts.force) return null;

    const {
      x = 0,
      y = 0.9,
      z = 0,
      unit = null,
      amount = 0,
      type = 'normal',
      isCounter = false,
      isCrit = false,
      isBreak = false,
      isExecute = false,
      isReduced = false,
      isBuilding = false,
    } = opts;

    const now = performance.now();

    // 同帧合并检测：如果在近距离内（0.4m）且为同类伤害，合并展示为 "×N"
    for (const act of this.active) {
      if (act.life > 0.4 && act.type === type && Math.abs(act.x - x) < 0.45 && Math.abs(act.z - z) < 0.45) {
        act.count++;
        act.val += amount;
        act.life = Math.min(act.maxLife, act.life + 0.1);
        this.renderSlotContent(act);
        return act;
      }
    }

    // 从对象池查找空闲槽位
    let slot = this.pool.find((s) => s.life <= 0);
    if (!slot) {
      // 若池满，复用剩余寿命最短者
      let minLife = Infinity;
      for (const s of this.pool) {
        if (s.life < minLife) {
          minLife = s.life;
          slot = s;
        }
      }
    }
    if (!slot) return null;

    // 克制印章限频：每 0.5s 最多触发一次印章展示
    let showCounterBadge = false;
    if (isCounter) {
      if (now - this.lastCounterStampTime >= 500) {
        this.lastCounterStampTime = now;
        showCounterBadge = true;
      }
    }

    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.unit = unit;
    slot.life = 0.70; // 0.7 秒生命周期
    slot.maxLife = 0.70;
    slot.type = isBreak ? 'break' : (isExecute ? 'execute' : (type === 'heal' ? 'heal' : (isCounter ? 'counter' : (isReduced ? 'reduced' : (isBuilding ? 'building' : 'normal')))));
    slot.val = amount;
    slot.count = 1;
    slot.isCrit = isCrit;
    slot.showCounterBadge = showCounterBadge;

    this.renderSlotContent(slot);

    slot.el.style.display = 'block';
    slot.el.style.opacity = '1';

    if (!this.active.includes(slot)) {
      this.active.push(slot);
    }

    return slot;
  }

  renderSlotContent(slot) {
    const el = slot.el;
    el.className = `dmg-item dmg-${slot.type}`;

    if (slot.type === 'break') {
      el.innerHTML = '<span class="counter-badge">破</span> 破阵';
    } else if (slot.type === 'execute') {
      el.innerHTML = '<span style="color:#b23a2f;font-weight:900;">斩</span>';
    } else if (slot.type === 'heal') {
      const v = Math.round(slot.val);
      el.innerHTML = `＋${v}`;
    } else {
      const v = Math.round(slot.val);
      let html = '';
      if (slot.showCounterBadge) {
        html += '<span class="counter-badge">克</span> ';
      }
      if (slot.type === 'building') {
        html += `−${v}`;
      } else {
        html += `${v}`;
      }
      if (slot.count > 1) {
        html += `<span style="font-size:0.75em;opacity:0.85;margin-left:2px;">×${slot.count}</span>`;
      }
      el.innerHTML = html;
    }
  }

  // 每一帧更新飘字位置（将三维世界坐标投影到屏幕二维像素，并施加水墨轻微上浮衰减）
  update(dt, camera, screenWidth, screenHeight) {
    if (!camera) return;

    const w = screenWidth || window.innerWidth;
    const h = screenHeight || window.innerHeight;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const slot = this.active[i];
      slot.life -= dt;

      if (slot.life <= 0) {
        slot.el.style.display = 'none';
        this.active.splice(i, 1);
        continue;
      }

      const p = 1 - Math.max(0, slot.life / slot.maxLife); // 0 -> 1

      // 向上漂浮 24px (相当于世界空间约 0.45m)
      const liftY = p * 0.45;
      this._tempV.set(slot.x, slot.y + liftY, slot.z);
      this._tempV.project(camera);

      // 落在屏幕外或背后则隐藏
      if (this._tempV.z > 1) {
        slot.el.style.display = 'none';
        continue;
      }

      // 投影到屏幕像素空间
      const sx = (this._tempV.x * 0.5 + 0.5) * w;
      const sy = (-this._tempV.y * 0.5 + 0.5) * h;

      slot.el.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -50%)`;

      // 后 40% 时间平滑淡出
      if (p > 0.60) {
        const fadeP = (p - 0.60) / 0.40;
        slot.el.style.opacity = `${Math.max(0, 1 - fadeP * fadeP)}`;
      } else {
        slot.el.style.opacity = '1';
      }
    }
  }
}

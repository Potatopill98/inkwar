// 界面 · 克制提示：兵册详情、卡池浮窗、关卡详情三处共用
import { UNITS, getUnit } from '../data/units.js?v=1.93';
import { strongOf, weakOf, countersFor } from '../data/counters.js?v=1.93';

const chipRow = (label, list, cls) => {
  if (!list.length) return '';
  const chips = list.slice(0, 5)
    .map((x) => `<span class="cc-chip ${cls}" title="${x.why}">${x.name}</span>`)
    .join('');
  return `<div class="cc-row"><span class="cc-label ${cls}">${label}</span>${chips}</div>`;
};

export const uiCounters = {
  // 兵册 / 卡池浮窗用：克制与被克两行
  counterChips(unit) {
    const strong = strongOf(unit);
    const weak = weakOf(unit).filter((w) => !w.spell);
    if (!strong.length && !weak.length) return '';
    return `<div class="cd-counter">${chipRow('克制', strong, 'strong')}${chipRow('被克', weak, 'weak')}</div>`;
  },

  // 关卡详情用：按敌方阵容给出建议兵种
  levelCounterHint(level) {
    const counts = new Map();
    for (const w of level.waves || []) {
      for (const g of w.units) counts.set(g.type, (counts.get(g.type) || 0) + g.count);
    }
    if (!counts.size) return '';
    const own = UNITS.filter((u) => !u.spell && this.app.save.unlocks.units.includes(u.id));
    const rows = [];
    for (const [id, n] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
      const enemy = getUnit(id);
      if (!enemy) continue;
      const cs = countersFor(enemy, own).slice(0, 2);
      if (!cs.length) continue;
      rows.push(`<div class="dc-row"><span class="dc-enemy">${enemy.name}×${n}</span><span class="dc-good">${cs.map((u) => u.name).join(' / ')}</span></div>`);
    }
    if (!rows.length) return '';
    return `<div class="detail-counter"><div class="dc-title">克制提示 · 用这些兵种更省力</div>${rows.join('')}</div>`;
  },
};

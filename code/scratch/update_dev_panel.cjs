const fs = require('fs');
const filePath = 'E:/taptapgame/inkwar/code/src/dev-panel.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. 替换 loadOverrides
const targetOverrides = `let overrides = null;

export function loadOverrides() {
  if (overrides) return overrides;
  overrides = { units: {}, heroes: {}, mech: {}, heroTuning: {}, savedAt: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      overrides.units = parsed.units || {};
      overrides.heroes = parsed.heroes || {};
      overrides.mech = parsed.mech || {};
      overrides.savedAt = parsed.savedAt || 0;
    }
  } catch (e) {
    console.warn('数值存档读取失败', e);
  }
  return overrides;
}`;

const replaceOverrides = `let overrides = null;

// 官方定版基线（用户微调定版配置，包含兵种、英雄与机制数值）
export const DEFAULT_OVERRIDES = {
  version: 1,
  savedAt: 1793282385823,
  heroTuning: {},
  units: {
    trebuchet: { speed: 0.5, cost: 20, cooldown: 120, hp: 800, range: 9.5 },
    repeater: { atk: 15 },
    fubing: { cost: 15, cooldown: 120 },
    archer: { interval: 1.2, count: 2, cost: 7, cooldown: 10 },
    militia: { speed: 1.5 },
    strongbow: { hp: 250, interval: 2.2 },
    assassin: { count: 2 }
  },
  heroes: {
    huoqubing: { 'active.effects.1.count': 2 },
    hanxin: { 'active.effects.1.lifetime': 6 },
    yuefei: { 'active.effects.1.lifetime': 15 },
    qinshihuang: { 'active.effects.1.lifetime': 30, 'active.cooldown': 35 },
    machao: { 'active.effects.0.lifetime': 15 },
    qinliangyu: { 'active.effects.1.lifetime': 20 },
    zhouyu: { 'active.effects.0.dps': 80 },
    zhaoyun: { 'active.effects.0.damage': 150, 'active.effects.1.damage': 80 }
  },
  mech: {
    fubing: { 'spellFx.count': 6 },
    jianyu: { 'spellFx.damage': 150 },
    strongbow: { 'fx.sniperMul': 1.5, 'fx.lowHpBonus': 2 }
  }
};

export function loadOverrides() {
  if (overrides) return overrides;
  overrides = JSON.parse(JSON.stringify(DEFAULT_OVERRIDES));
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.units) overrides.units = { ...overrides.units, ...parsed.units };
      if (parsed.heroes) overrides.heroes = { ...overrides.heroes, ...parsed.heroes };
      if (parsed.mech) overrides.mech = { ...overrides.mech, ...parsed.mech };
      if (parsed.heroTuning) overrides.heroTuning = { ...overrides.heroTuning, ...parsed.heroTuning };
      if (parsed.savedAt) overrides.savedAt = parsed.savedAt;
    }
  } catch (e) {
    console.warn('数值存档读取失败', e);
  }
  return overrides;
}`;

// Standardize CRLF to LF for matching
content = content.replace(/\r\n/g, '\n');
if (content.includes(targetOverrides.replace(/\r\n/g, '\n'))) {
  content = content.replace(targetOverrides.replace(/\r\n/g, '\n'), replaceOverrides.replace(/\r\n/g, '\n'));
  console.log('Successfully replaced loadOverrides and added DEFAULT_OVERRIDES');
} else {
  console.error('Could not find targetOverrides in dev-panel.js');
}

// 2. 增加【导入定版 JSON】按钮
const targetButtons = `<button class="btn btn-paper btn-sm" id="dev-export">导出定版 JSON</button>
          <button class="btn btn-paper btn-sm" id="dev-copy">复制 JSON</button>
          <button class="btn btn-ghost btn-sm" id="dev-reset">恢复默认</button>`;

const replaceButtons = `<button class="btn btn-paper btn-sm" id="dev-export">导出定版 JSON</button>
          <button class="btn btn-paper btn-sm" id="dev-copy">复制 JSON</button>
          <button class="btn btn-paper btn-sm" id="dev-import">导入定版 JSON</button>
          <button class="btn btn-ghost btn-sm" id="dev-reset">恢复默认</button>`;

if (content.includes(targetButtons)) {
  content = content.replace(targetButtons, replaceButtons);
  console.log('Successfully added dev-import button');
} else {
  console.error('Could not find targetButtons in dev-panel.js');
}

// 3. 绑定 dev-import 点击事件
const targetClick = `el.querySelector('#dev-export').onclick = () => this.exportJson();
    el.querySelector('#dev-copy').onclick = () => this.copyJson();
    el.querySelector('#dev-reset').onclick = () => this.reset();`;

const replaceClick = `el.querySelector('#dev-export').onclick = () => this.exportJson();
    el.querySelector('#dev-copy').onclick = () => this.copyJson();
    el.querySelector('#dev-import').onclick = () => this.importJson();
    el.querySelector('#dev-reset').onclick = () => this.reset();`;

if (content.includes(targetClick)) {
  content = content.replace(targetClick, replaceClick);
  console.log('Successfully bound dev-import click handler');
} else {
  console.error('Could not find targetClick in dev-panel.js');
}

// 4. 添加 importJson 方法并优化 reset 方法
const targetReset = `  reset() {
    if (!window.confirm('恢复所有数值为源码默认？')) return;
    for (const [id, snap] of BASE_UNITS) {
      const u = UNITS.find((x) => x.id === id);
      if (u) for (const f of UNIT_FIELDS) u[f.key] = snap[f.key];
    }
    for (const [id, snap] of BASE_HEROES) {
      const h = HEROES.find((x) => x.id === id);
      if (!h) continue;
      h.active.cooldown = snap.cooldown;
      h.passive = JSON.parse(JSON.stringify(snap.passive));
      h.active.effects = JSON.parse(JSON.stringify(snap.effects));
    }
    for (const [id, snap] of BASE_MECH) {
      const u = UNITS.find((x) => x.id === id);
      if (!u) continue;
      for (const holder of ['fx', 'spellFx']) {
        if (snap[holder]) u[holder] = { ...snap[holder] };
      }
    }
    overrides = { units: {}, heroes: {}, mech: {}, heroTuning: {}, savedAt: 0 };
    try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
    EndlessManager.resetTuning();
    this.renderList();
    this.refreshSaved();
  }`;

const replaceResetAndImport = `  reset() {
    if (!window.confirm('恢复所有数值为定版默认？')) return;
    for (const [id, snap] of BASE_UNITS) {
      const u = UNITS.find((x) => x.id === id);
      if (u) for (const f of UNIT_FIELDS) u[f.key] = snap[f.key];
    }
    for (const [id, snap] of BASE_HEROES) {
      const h = HEROES.find((x) => x.id === id);
      if (!h) continue;
      h.active.cooldown = snap.cooldown;
      h.passive = JSON.parse(JSON.stringify(snap.passive));
      h.active.effects = JSON.parse(JSON.stringify(snap.effects));
    }
    for (const [id, snap] of BASE_MECH) {
      const u = UNITS.find((x) => x.id === id);
      if (!u) continue;
      for (const holder of ['fx', 'spellFx']) {
        if (snap[holder]) u[holder] = { ...snap[holder] };
      }
    }
    overrides = JSON.parse(JSON.stringify(DEFAULT_OVERRIDES));
    try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
    EndlessManager.resetTuning();
    applyBalanceOverrides();
    this.renderList();
    this.refreshSaved();
  }

  importJson() {
    const raw = window.prompt('请粘贴导出的定版 JSON 内容：');
    if (!raw || !raw.trim()) return;
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('无效的 JSON 格式');
      const ov = loadOverrides();
      if (data.units) ov.units = { ...ov.units, ...data.units };
      if (data.heroes) ov.heroes = { ...ov.heroes, ...data.heroes };
      if (data.mech) ov.mech = { ...ov.mech, ...data.mech };
      if (data.heroTuning) ov.heroTuning = { ...ov.heroTuning, ...data.heroTuning };
      ov.savedAt = Date.now();
      persist();
      applyBalanceOverrides();

      if (data.endlessTuning && typeof data.endlessTuning === 'object') {
        const cur = EndlessManager.getTuning();
        const merged = { ...cur, ...data.endlessTuning };
        // 自动纠正被卡在 0.005 的传奇卡倍数异常值
        if (merged.legendaryRatio === 0.005) {
          merged.legendaryRatio = 0.10;
        }
        EndlessManager.saveTuning(merged);
      }

      this.renderList();
      this.refreshSaved();
      window.alert('定版 JSON 导入成功，数值已全面生效！');
    } catch (e) {
      window.alert('导入失败，请检查 JSON 格式：' + (e.message || e));
    }
  }`;

if (content.includes(targetReset)) {
  content = content.replace(targetReset, replaceResetAndImport);
  console.log('Successfully updated reset and added importJson');
} else {
  console.error('Could not find targetReset in dev-panel.js');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished writing updated dev-panel.js');

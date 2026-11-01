// 数值调校面板（dev）：兵种/术法/英雄的军令、冷却与属性微调
// 改动即时生效，自动记忆在 localStorage；可导出 JSON 作为定版备份
import { UNITS } from './data/units.js?v=1.93';
import { HEROES, DEFAULT_HERO_TUNING, getHeroTuning, getHeroPermMultiplier, HERO_MAX_LEVEL } from './data/heroes.js?v=1.93';
import { EndlessManager, ENDLESS_TUNING_FIELDS, DEFAULT_ENDLESS_TUNING } from './data/endless-manager.js?v=1.93';

export const KR_HERO_FIELDS = [
  { key: 'maxHp', label: '1级基础生命 (HP)', step: 50, min: 200, max: 5000 },
  { key: 'atk', label: '1级基础攻击 (ATK)', step: 5, min: 10, max: 400 },
  { key: 'armor', label: '1级基础护甲 (Armor)', step: 1, min: 0, max: 60 },
  { key: 'atkInterval', label: '普攻攻击间隔 (秒)', step: 0.05, min: 0.4, max: 3.0, unit: 's' },
  { key: 'speed', label: '移动速度 (m/s)', step: 0.1, min: 0.5, max: 4.0, unit: 'm/s' },
  { key: 'regenRate', label: '脱战回血 (%/s)', step: 0.5, min: 0.5, max: 20, isPercent: true },
  { key: 'aggroRadius', label: '迎敌警戒半径 (m)', step: 0.1, min: 1.0, max: 6.0, unit: 'm' },
  { key: 'superDamage', label: '1级大招冲刺伤害', step: 25, min: 100, max: 2000 },
  { key: 'superStrikeDamage', label: '1级大招刺击伤害', step: 10, min: 50, max: 600 },
  { key: 'superCooldown', label: '大招冷却时间 (秒)', step: 1, min: 5, max: 90, unit: 's' },
  { key: 'gadgetRadius', label: '技能震退半径 (m)', step: 0.1, min: 1.5, max: 6.0, unit: 'm' },
  { key: 'gadgetKnockback', label: '技能击退距离 (m)', step: 0.1, min: 0.5, max: 5.0, unit: 'm' },
  { key: 'gadgetCooldown', label: '技能冷却时间 (秒)', step: 1, min: 5, max: 60, unit: 's' },
];

const KEY = 'mozhen_balance_v1';

const UNIT_FIELDS = [
  { key: 'cost', label: '军令', step: 0.5, min: 0, max: 20 },
  { key: 'cooldown', label: '冷却', step: 0.5, min: 0, max: 180, unit: 's' },
  { key: 'count', label: '数量', step: 1, min: 1, max: 12 },
  { key: 'hp', label: '生命', step: 10, min: 1, max: 20000 },
  { key: 'atk', label: '攻击', step: 1, min: 0, max: 2000 },
  { key: 'armor', label: '护甲', step: 1, min: 0, max: 200 },
  { key: 'range', label: '射程', step: 0.1, min: 0, max: 20 },
  { key: 'interval', label: '攻速', step: 0.05, min: 0.1, max: 10, unit: 's' },
  { key: 'speed', label: '移速', step: 0.05, min: 0, max: 6 },
];

// 机制数值（fx / spellFx）字段中文名与取值范围
const MECH_META = {
  blastDamage: { label: '爆炸伤害', step: 10, min: 0, max: 5000 },
  blastBuildingMul: { label: '爆炸·对建筑倍率', step: 0.1, min: 0, max: 10 },
  blastBaseDamage: { label: '爆炸·对基地伤害', step: 10, min: 0, max: 5000 },
  blastRadius: { label: '爆炸范围', step: 0.1, min: 0.5, max: 10 },
  splashRadius: { label: '溅射范围', step: 0.1, min: 0.2, max: 10 },
  splashMul: { label: '溅射倍率', step: 0.05, min: 0, max: 3 },
  buildingBonus: { label: '对建筑倍率', step: 0.1, min: 0, max: 10 },
  fireDps: { label: '火焰每秒伤害', step: 1, min: 0, max: 2000 },
  fireRadius: { label: '火焰范围', step: 0.1, min: 0.3, max: 10 },
  healAmount: { label: '治疗量', step: 5, min: 0, max: 2000 },
  atkDown: { label: '攻击降低', step: 0.05, min: 0, max: 0.9 },
  debuffDur: { label: '减益持续(s)', step: 0.5, min: 0.5, max: 30 },
  damage: { label: '伤害', step: 10, min: 0, max: 5000 },
  radius: { label: '范围', step: 0.1, min: 0.5, max: 15 },
  heal: { label: '回复比例', step: 0.05, min: 0, max: 1 },
  dps: { label: '每秒伤害', step: 5, min: 0, max: 2000 },
  slow: { label: '减速', step: 0.05, min: 0, max: 0.9 },
  duration: { label: '持续(s)', step: 0.5, min: 1, max: 30 },
  waves: { label: '轮数', step: 1, min: 1, max: 10 },
  stun: { label: '眩晕(s)', step: 0.1, min: 0, max: 5 },
  count: { label: '数量/次数', step: 1, min: 0, max: 60 },
  // 英雄被动 / 主动效果里常见的数值
  atk: { label: '攻击加成', step: 0.05, min: 0, max: 5 },
  aspd: { label: '攻速加成', step: 0.05, min: 0, max: 5 },
  spd: { label: '移速加成', step: 0.05, min: 0, max: 3 },
  def: { label: '减伤加成', step: 0.05, min: 0, max: 1 },
  value: { label: '数值', step: 0.05, min: 0, max: 100 },
  per: { label: '每份/间隔值', step: 0.05, min: 0, max: 50 },
  cap: { label: '上限', step: 0.05, min: 0, max: 1000 },
  regen: { label: '每秒回复', step: 0.005, min: 0, max: 1 },
  interval: { label: '间隔(s)', step: 0.5, min: 0.5, max: 60 },
  amount: { label: '额度/数量', step: 1, min: 0, max: 100 },
  threshold: { label: '阈值', step: 0.05, min: 0, max: 1 },
  chance: { label: '概率', step: 0.01, min: 0, max: 1 },
  mult: { label: '倍率', step: 0.1, min: 0, max: 20 },
  empower: { label: '强化倍率', step: 0.05, min: 0, max: 3 },
  lifetime: { label: '存续(s)', step: 1, min: 1, max: 120 },
  jump: { label: '跳跃距离', step: 0.5, min: 0, max: 20 },
  falloff: { label: '每跳衰减', step: 0.05, min: 0, max: 2 },
  hits: { label: '段数', step: 1, min: 1, max: 20 },
  length: { label: '长度', step: 0.5, min: 0, max: 30 },
  width: { label: '宽度', step: 0.5, min: 0, max: 30 },
  knockback: { label: '击退', step: 0.1, min: 0, max: 10 },
  fear: { label: '恐惧(s)', step: 0.1, min: 0, max: 5 },
  vuln: { label: '易伤', step: 0.05, min: 0, max: 2 },
  vulnDur: { label: '易伤持续(s)', step: 0.5, min: 0, max: 30 },
  slowDur: { label: '减速持续(s)', step: 0.5, min: 0, max: 30 },
  execute: { label: '处决线', step: 0.05, min: 0, max: 1 },
  baseCost: { label: '基地代价', step: 0.01, min: 0, max: 0.5 },
  energy: { label: '军令', step: 1, min: 0, max: 100 },
  shield: { label: '护盾比例', step: 0.05, min: 0, max: 1 },
  lifesteal: { label: '吸血', step: 0.05, min: 0, max: 1 },
  thorns: { label: '反伤', step: 0.05, min: 0, max: 2 },
  killEnergy: { label: '击杀回令', step: 1, min: 0, max: 20 },
  bossPercent: { label: '首领最大生命比例', step: 0.01, min: 0, max: 1 },
  damages: { label: '伤害', step: 10, min: 0, max: 5000 },
  area: { label: '范围', step: 0.1, min: 0, max: 15 },
  hp: { label: '生命/耐久', step: 50, min: 1, max: 20000 },
  sniperMul: { label: '狙击倍率', step: 0.05, min: 0, max: 5 },
  lowHpThreshold: { label: '残血线', step: 0.05, min: 0, max: 1 },
  lowHpBonus: { label: '残血增伤', step: 0.1, min: 0, max: 5 },
};

// 取出某个单位可调的机制数值（仅数字字段，fx 与 spellFx 都算）
function mechFields(unit) {
  const out = [];
  for (const holder of ['fx', 'spellFx']) {
    const obj = unit[holder];
    if (!obj) continue;
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val !== 'number' || !Number.isFinite(val)) continue;
      const meta = MECH_META[key] || {};
      out.push({
        path: `${holder}.${key}`, holder, key, value: val,
        label: meta.label || key, step: meta.step ?? 1, min: meta.min ?? 0, max: meta.max ?? 99999,
      });
    }
  }
  return out;
}

// 收集对象内的数字字段（含数字数组），用于英雄被动 / 主动数值
function collectNumeric(obj, prefix, labelPrefix, out) {
  if (!obj) return;
  for (const [key, val] of Object.entries(obj)) {
    const meta = MECH_META[key] || {};
    const base = { step: meta.step ?? 1, min: meta.min ?? 0, max: meta.max ?? 99999 };
    if (typeof val === 'number' && Number.isFinite(val)) {
      out.push({ ...base, path: `${prefix}.${key}`, label: `${labelPrefix}${meta.label || key}`, value: val });
    } else if (Array.isArray(val) && val.length && val.every((x) => typeof x === 'number')) {
      val.forEach((v, i) => out.push({ ...base, path: `${prefix}.${key}.${i}`, label: `${labelPrefix}${meta.label || key}${i + 1}`, value: v }));
    }
  }
}

// 英雄：冷却 + 被动数值 + 每个主动效果的数值
function heroFields(hero) {
  const out = [{ path: 'active.cooldown', label: '技能冷却(s)', value: hero.active.cooldown, step: 1, min: 5, max: 120 }];
  collectNumeric(hero.passive, 'passive', '被动·', out);
  (hero.active.effects || []).forEach((fx, i) => collectNumeric(fx, `active.effects.${i}`, `主动${i + 1}·`, out));
  return out;
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let t = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (t[k] == null) t[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    t = t[k];
  }
  t[parts[parts.length - 1]] = value;
}

// 基线快照：用于恢复默认
const BASE_UNITS = new Map();
const BASE_HEROES = new Map();
const BASE_MECH = new Map();
for (const u of UNITS) {
  const snap = {};
  for (const f of UNIT_FIELDS) snap[f.key] = u[f.key];
  BASE_UNITS.set(u.id, snap);
  const mechSnap = {};
  for (const holder of ['fx', 'spellFx']) {
    if (u[holder]) mechSnap[holder] = { ...u[holder] };
  }
  BASE_MECH.set(u.id, mechSnap);
}
for (const h of HEROES) {
  BASE_HEROES.set(h.id, {
    cooldown: h.active.cooldown,
    passive: JSON.parse(JSON.stringify(h.passive || {})),
    effects: JSON.parse(JSON.stringify(h.active.effects || [])),
  });
}

let overrides = null;

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
}

// 启动时应用（main.js 早于任何界面渲染调用）
export function applyBalanceOverrides() {
  const ov = loadOverrides();
  for (const [id, fields] of Object.entries(ov.units)) {
    const unit = UNITS.find((u) => u.id === id);
    if (!unit) continue;
    for (const f of UNIT_FIELDS) {
      const v = Number(fields[f.key]);
      if (Number.isFinite(v)) unit[f.key] = v;
    }
  }
  for (const [id, fields] of Object.entries(ov.heroes)) {
    const hero = HEROES.find((h) => h.id === id);
    if (!hero) continue;
    // 兼容旧存档：{ cooldown: n }
    if (fields.cooldown != null && fields['active.cooldown'] == null) {
      const v = Number(fields.cooldown);
      if (Number.isFinite(v)) hero.active.cooldown = v;
    }
    for (const [path, raw] of Object.entries(fields)) {
      if (path === 'cooldown') continue;
      const v = Number(raw);
      if (!path.includes('.') || !Number.isFinite(v)) continue;
      setPath(hero, path, v);
    }
  }
  // 机制数值：fx.* / spellFx.*
  for (const [id, fields] of Object.entries(ov.mech)) {
    const unit = UNITS.find((u) => u.id === id);
    if (!unit) continue;
    for (const [path, raw] of Object.entries(fields)) {
      const [holder, key] = path.split('.');
      const v = Number(raw);
      if (!holder || !key || !Number.isFinite(v)) continue;
      if (!unit[holder]) unit[holder] = {};
      unit[holder][key] = v;
    }
  }
}

function persist() {
  overrides.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('数值存档写入失败', e);
  }
}

export class DevPanel {
  constructor() {
    this.tab = 'hero-kr';
    this.previewLevel = 1;
    this.search = '';
    this.build();
  }

  build() {
    const el = document.createElement('div');
    el.className = 'dev-overlay';
    el.innerHTML = `
      <div class="dev-box">
        <header class="dev-head">
          <div class="dev-title"><span class="seal-mini">校</span><h2>数值调校</h2><span class="dev-saved" id="dev-saved">未改动</span></div>
          <div class="dev-tabs">
            <button class="dev-tab active" data-tab="hero-kr">英雄1级基础 (赵云·荒野体系)</button>
            <button class="dev-tab" data-tab="units">兵种 · 术法</button>
            <button class="dev-tab" data-tab="heroes">英雄</button>
            <button class="dev-tab" data-tab="endless" style="color:var(--seal-red,#b23a2f);font-weight:bold;">无尽模式 · 墨影试炼</button>
          </div>
          <button class="btn btn-ghost btn-sm" id="dev-close">关闭</button>
        </header>
        <div class="dev-tools">
          <input id="dev-search" class="dev-search" placeholder="按名称搜索…" />
          <button class="btn btn-paper btn-sm" id="dev-export">导出定版 JSON</button>
          <button class="btn btn-paper btn-sm" id="dev-copy">复制 JSON</button>
          <button class="btn btn-paper btn-sm" id="dev-import">导入定版 JSON</button>
          <button class="btn btn-ghost btn-sm" id="dev-reset">恢复默认</button>
        </div>
        <div class="dev-list" id="dev-list"></div>
        <footer class="dev-foot">
          <span>改动即时生效并自动记住；功能牌的机制数值（爆炸/溅射/火焰/治疗等）与英雄被动/主动里的数字都可调，导出的 JSON 可一并带回定版。</span>
        </footer>
      </div>
    `;
    document.getElementById('app').appendChild(el);
    this.el = el;
    this.savedEl = el.querySelector('#dev-saved');
    this.listEl = el.querySelector('#dev-list');
    el.querySelector('#dev-close').onclick = () => this.close();
    el.addEventListener('click', (e) => { if (e.target === el) this.close(); });
    el.querySelectorAll('.dev-tab').forEach((b) => {
      b.onclick = () => {
        this.tab = b.dataset.tab;
        el.querySelectorAll('.dev-tab').forEach((x) => x.classList.toggle('active', x === b));
        this.renderList();
      };
    });
    const search = el.querySelector('#dev-search');
    search.oninput = () => { this.search = search.value.trim(); this.renderList(); };
    el.querySelector('#dev-export').onclick = () => this.exportJson();
    el.querySelector('#dev-copy').onclick = () => this.copyJson();
    el.querySelector('#dev-import').onclick = () => this.importJson();
    el.querySelector('#dev-reset').onclick = () => this.reset();
    this.refreshSaved();
  }

  refreshSaved() {
    const t = loadOverrides().savedAt;
    this.savedEl.textContent = t ? `已保存 · ${new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '未改动';
  }

  open() {
    applyBalanceOverrides();
    this.renderList();
    this.el.classList.add('show');
  }

  close() {
    this.el.classList.remove('show');
  }

  renderList() {
    const ov = loadOverrides();
    const kw = this.search;
    this.listEl.innerHTML = '';

    // =========================================================================
    // 4. 无尽模式（墨影试炼）全量数值调校板块
    // =========================================================================
    if (this.tab === 'endless') {
      const endlessTuning = EndlessManager.getTuning();

      // 顶部操作条：重置与快速提示
      const topBar = document.createElement('div');
      topBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:14px; background:rgba(239,230,211,0.6); border:1px solid #dcd3be; border-radius:6px;';
      topBar.innerHTML = `
        <div style="font-size:13px; color:#44403c;">
          <b style="color:var(--seal-red, #b23a2f);">墨影试炼 · 无尽模式专属数值调校</b>
          <div style="font-size:11px; color:#78716c; margin-top:2px;">实时调整每一波属性增益、出兵阶梯、大本营反噬与肉鸽全量增益数值</div>
        </div>
        <button class="btn btn-paper btn-sm" id="btn-reset-endless">恢复无尽默认参数</button>
      `;
      topBar.querySelector('#btn-reset-endless').onclick = () => {
        if (!window.confirm('确定要将无尽模式的所有参数恢复为初始默认值？')) return;
        EndlessManager.resetTuning();
        this.renderList();
        this.refreshSaved();
      };
      this.listEl.appendChild(topBar);

      for (const group of ENDLESS_TUNING_FIELDS) {
        const matchingFields = kw ? group.fields.filter(f => f.label.includes(kw) || f.desc?.includes(kw)) : group.fields;
        if (kw && matchingFields.length === 0) continue;

        const groupBlock = document.createElement('div');
        groupBlock.className = 'dev-row dev-row-endless';
        groupBlock.style.cssText = 'margin-bottom:16px; padding:12px 14px; background:#faf7f0; border:1px solid #e2dac9; border-radius:8px;';
        groupBlock.innerHTML = `
          <div style="font-size:14px; font-weight:bold; color:#292524; margin-bottom:10px; border-bottom:1px solid #e7dfce; padding-bottom:6px;">
            ${group.groupName}
          </div>
          <div class="dev-fields dev-fields-kr" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(290px, 1fr)); gap:12px;"></div>
        `;
        const fieldsContainer = groupBlock.querySelector('.dev-fields');

        for (const f of matchingFields) {
          const wrap = document.createElement('div');
          wrap.className = 'dev-field dev-field-slider';
          wrap.style.cssText = 'background:#fff; border:1px solid #e7e0d3; border-radius:6px; padding:8px 10px; box-sizing:border-box;';
          const rawVal = endlessTuning[f.key] !== undefined ? endlessTuning[f.key] : DEFAULT_ENDLESS_TUNING[f.key];
          const currentVal = f.isPercent ? Number((Number(rawVal) * 100).toFixed(1)) : Number(rawVal);

          wrap.innerHTML = `
            <div class="dev-field-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:12px; font-weight:600; color:#44403c;" title="${f.desc || ''}">${f.label}</span>
              <b class="dev-val-display" style="font-size:12px; color:var(--seal-red, #b23a2f); font-family:monospace;">
                ${f.isPercent ? `+${currentVal}%` : currentVal}${(!f.isPercent && f.unit) ? ` ${f.unit}` : ''}
              </b>
            </div>
            <div style="font-size:11px; color:#8c8275; margin-bottom:6px; line-height:1.3;">${f.desc || ''}</div>
            <div class="dev-field-controls" style="display:flex; align-items:center; gap:8px;">
              <input type="range" class="dev-slider" style="flex:1;" min="${f.min}" max="${f.max}" step="${f.step}" value="${currentVal}">
              <input type="number" class="dev-num-input" style="width:72px; padding:3px 6px; border:1px solid #d6cebf; border-radius:4px; font-size:12px; font-family:monospace;" min="${f.min}" max="${f.max}" step="${f.step}" value="${currentVal}">
            </div>
          `;
          const slider = wrap.querySelector('.dev-slider');
          const numInput = wrap.querySelector('.dev-num-input');
          const valDisp = wrap.querySelector('.dev-val-display');

          const onValChange = (newVal) => {
            const clamped = Math.max(f.min, Math.min(f.max, Number(newVal) || f.min));
            const storeVal = f.isPercent ? Number((clamped / 100).toFixed(4)) : clamped;
            endlessTuning[f.key] = storeVal;
            slider.value = clamped;
            numInput.value = clamped;
            valDisp.textContent = `${f.isPercent ? `+${clamped}%` : clamped}${(!f.isPercent && f.unit) ? ` ${f.unit}` : ''}`;
            EndlessManager.saveTuning(endlessTuning);
            this.savedEl.textContent = `已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
          };

          slider.oninput = () => onValChange(slider.value);
          numInput.onchange = () => onValChange(numInput.value);

          fieldsContainer.appendChild(wrap);
        }

        this.listEl.appendChild(groupBlock);
      }
      return;
    }

    if (this.tab === 'hero-kr') {
      for (const h of HEROES) {
        if (kw && !h.name.includes(kw)) continue;
        const row = document.createElement('div');
        row.className = 'dev-row dev-row-kr';
        row.innerHTML = `
          <div class="dev-name">
            <b>${h.name}</b>
            <span>${h.title} · ${h.dynasty || '中华名将'} · ${h.tacticalStyle || ''}</span>
            <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:rgba(180,83,9,0.15); color:#92400e;">荒野体系：所调参数为 1 级基础面板</span>
          </div>
          <div class="dev-preview-slot"></div>
          <div class="dev-fields dev-fields-kr"></div>
        `;
        const previewSlot = row.querySelector('.dev-preview-slot');
        const fields = row.querySelector('.dev-fields');
        let previewLevel = this.previewLevel || 1;

        const updatePreviewUI = () => {
          const t = getHeroTuning(h.id, ov.heroTuning);
          const mul = getHeroPermMultiplier(previewLevel);
          const bonusPct = Math.round((mul - 1) * 100);
          previewSlot.innerHTML = `
            <div class="dev-brawl-preview-card">
              <div class="dev-preview-head">
                <span>🌟 荒野乱斗成长实时预览：<b>Lv.${previewLevel}</b> / ${HERO_MAX_LEVEL} (全属性 <b>+${bonusPct}%</b>)</span>
                <span style="font-size:11px; color:#b45309;">所有实战属性均由1级基础数值实时计算</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:11px; color:#5a4a34; font-weight:bold;">拖动等级预览:</span>
                <input type="range" class="dev-slider dev-preview-slider" min="1" max="11" step="1" value="${previewLevel}" style="flex:1;">
                <span style="font-size:13px; font-weight:bold; color:#b23a2f; width:45px;">Lv.${previewLevel}</span>
              </div>
              <div class="dev-preview-stats">
                <span>❤️ 预计生命: <b>${Math.round(t.maxHp * mul)}</b></span>
                <span>⚔️ 预计攻击: <b>${Math.round(t.atk * mul)}</b></span>
                <span>🛡️ 预计护甲: <b>${Math.round(t.armor * mul)}</b></span>
                <span>⚡ 大招初段: <b>${Math.round((t.superDamage || 550) * mul)}</b></span>
              </div>
              <div class="dev-preview-milestones">
                <span class="dev-milestone-pill active">🌟 Lv.1 主动绝技 (普攻充能)</span>
                <span class="dev-milestone-pill ${previewLevel >= 3 ? 'active' : 'inactive'}">🛡️ Lv.3 专属被动【一身是胆】${previewLevel >= 3 ? '✓已解锁' : '🔒锁定'}</span>
                <span class="dev-milestone-pill ${previewLevel >= 7 ? 'active' : 'inactive'}">⚡ Lv.7 专属妙具【龙威断喝】${previewLevel >= 7 ? '✓已解锁·3次' : '🔒锁定'}</span>
                <span class="dev-milestone-pill ${previewLevel >= 11 ? 'active' : 'inactive'}">👑 Lv.11 终极战神${previewLevel >= 11 ? '✓达成' : ''}</span>
              </div>
            </div>
          `;
          const pSlider = previewSlot.querySelector('.dev-preview-slider');
          if (pSlider) {
            pSlider.oninput = (e) => {
              previewLevel = Math.max(1, Math.min(11, Number(e.target.value) || 1));
              this.previewLevel = previewLevel;
              updatePreviewUI();
            };
          }
        };

        updatePreviewUI();

        const tuning = getHeroTuning(h.id, ov.heroTuning);
        for (const f of KR_HERO_FIELDS) {
          const wrap = document.createElement('div');
          wrap.className = 'dev-field dev-field-slider';
          const currentVal = f.isPercent ? (Number(tuning[f.key]) * 100) : Number(tuning[f.key]);
          wrap.innerHTML = `
            <div class="dev-field-label">
              <span>${f.label}</span>
              <b class="dev-val-display">${f.isPercent ? `${currentVal.toFixed(1)}%` : currentVal}${f.unit || ''}</b>
            </div>
            <div class="dev-field-controls">
              <input type="range" class="dev-slider" min="${f.min}" max="${f.max}" step="${f.step}" value="${currentVal}">
              <input type="number" class="dev-num-input" min="${f.min}" max="${f.max}" step="${f.step}" value="${currentVal}">
            </div>
          `;
          const slider = wrap.querySelector('.dev-slider');
          const numInput = wrap.querySelector('.dev-num-input');
          const valDisp = wrap.querySelector('.dev-val-display');

          const onValChange = (rawVal) => {
            const clamped = Math.max(f.min, Math.min(f.max, Number(rawVal) || f.min));
            const storeVal = f.isPercent ? (clamped / 100) : clamped;
            slider.value = clamped;
            numInput.value = clamped;
            valDisp.textContent = `${f.isPercent ? `${clamped.toFixed(1)}%` : clamped}${f.unit || ''}`;
            ov.heroTuning = ov.heroTuning || {};
            ov.heroTuning[h.id] = ov.heroTuning[h.id] || {};
            ov.heroTuning[h.id][f.key] = storeVal;
            persist();
            this.refreshSaved();
            updatePreviewUI();
            if (typeof window !== 'undefined' && window.__MOZHEN_APP__) {
              const app = window.__MOZHEN_APP__;
              if (app.save && app.save.settings) {
                app.save.settings.heroTuning = app.save.settings.heroTuning || {};
                if (h.id === 'zhaoyun' || h.id === app.save.hero?.selected) {
                  app.save.settings.heroTuning[f.key] = storeVal;
                }
              }
              if (app.battle && app.battle.applyHeroTuning) {
                const bHeroId = app.battle.heroId || app.battle.heroData?.id || 'zhaoyun';
                if (bHeroId === h.id || h.id === 'zhaoyun') {
                  app.battle.applyHeroTuning(ov.heroTuning[h.id]);
                }
              }
            }
          };

          slider.oninput = (e) => onValChange(e.target.value);
          numInput.onchange = (e) => onValChange(e.target.value);
          fields.appendChild(wrap);
        }
        this.listEl.appendChild(row);
      }
      return;
    }
    if (this.tab === 'units') {
      for (const u of UNITS) {
        if (kw && !u.name.includes(kw)) continue;
        const row = document.createElement('div');
        row.className = 'dev-row';
        row.innerHTML = `
          <div class="dev-name"><b>${u.name}</b><span>${u.role || ''}${u.spell ? ' · 术法' : ''} · ${u.rarity}</span></div>
          <div class="dev-fields"></div>
        `;
        const fields = row.querySelector('.dev-fields');
        for (const f of UNIT_FIELDS) {
          const wrap = document.createElement('label');
          wrap.className = 'dev-field';
          const input = document.createElement('input');
          input.type = 'number';
          input.step = f.step;
          input.min = f.min;
          input.max = f.max;
          input.value = u[f.key];
          input.dataset.key = f.key;
          input.onchange = () => {
            const v = Math.max(f.min, Math.min(f.max, Number(input.value) || 0));
            input.value = v;
            u[f.key] = v;
            ov.units[u.id] = ov.units[u.id] || {};
            ov.units[u.id][f.key] = v;
            persist();
            this.refreshSaved();
          };
          wrap.innerHTML = `<span>${f.label}${f.unit ? `(${f.unit})` : ''}</span>`;
          wrap.appendChild(input);
          fields.appendChild(wrap);
        }
        for (const m of mechFields(u)) {
          const wrap = document.createElement('label');
          wrap.className = 'dev-field dev-field-mech';
          wrap.innerHTML = `<span>${m.label}</span>`;
          const input = document.createElement('input');
          input.type = 'number';
          input.step = m.step;
          input.min = m.min;
          input.max = m.max;
          input.value = m.value;
          input.title = m.path;
          input.onchange = () => {
            const v = Math.max(m.min, Math.min(m.max, Number(input.value) || 0));
            input.value = v;
            u[m.holder][m.key] = v;
            ov.mech[u.id] = ov.mech[u.id] || {};
            ov.mech[u.id][m.path] = v;
            persist();
            this.refreshSaved();
          };
          wrap.appendChild(input);
          fields.appendChild(wrap);
        }
        this.listEl.appendChild(row);
      }
    } else {
      for (const h of HEROES) {
        if (kw && !h.name.includes(kw)) continue;
        const row = document.createElement('div');
        row.className = 'dev-row dev-row-hero';
        row.innerHTML = `
          <div class="dev-name"><b>${h.name}</b><span>${h.title} · ${h.gacha ? '祈将' : '关卡'}</span></div>
          <div class="dev-fields"></div>
        `;
        const fields = row.querySelector('.dev-fields');
        for (const f of heroFields(h)) {
          const wrap = document.createElement('label');
          wrap.className = 'dev-field dev-field-mech';
          wrap.innerHTML = `<span>${f.label}</span>`;
          const input = document.createElement('input');
          input.type = 'number';
          input.step = f.step;
          input.min = f.min;
          input.max = f.max;
          input.value = f.value;
          input.title = f.path;
          input.onchange = () => {
            const v = Math.max(f.min, Math.min(f.max, Number(input.value) || 0));
            input.value = v;
            setPath(h, f.path, v);
            ov.heroes[h.id] = ov.heroes[h.id] || {};
            ov.heroes[h.id][f.path] = v;
            persist();
            this.refreshSaved();
          };
          wrap.appendChild(input);
          fields.appendChild(wrap);
        }
        const info = document.createElement('div');
        info.className = 'dev-hero-skill';
        info.textContent = `${h.active.name}：${h.active.desc}`;
        row.appendChild(info);
        this.listEl.appendChild(row);
      }
    }
  }

  reset() {
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
  }

  jsonText() {
    const ov = loadOverrides();
    return JSON.stringify({
      version: 1,
      savedAt: ov.savedAt,
      endlessTuning: EndlessManager.getTuning(),
      heroTuning: ov.heroTuning || {},
      units: ov.units,
      heroes: ov.heroes,
      mech: ov.mech
    }, null, 2);
  }

  exportJson() {
    const blob = new Blob([this.jsonText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mozhen-balance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async copyJson() {
    const text = this.jsonText();
    try {
      await navigator.clipboard.writeText(text);
      window.alert('定版 JSON 已复制到剪贴板');
    } catch (e) {
      window.prompt('复制这段 JSON：', text);
    }
  }
}

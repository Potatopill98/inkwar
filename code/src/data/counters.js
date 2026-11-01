// 兵种克制链（design §3.6 & 规划稿 §2.4 克制链 v2）
// 单一数据源：只声明「谁克制谁」；被克制方向由 weakOf() 反向推导，避免两份数据不一致。
// 统一 source 字段：source === 'mul' 的条目会真实作用于战斗伤害计算；
// source === 'special' 表示该优势已由兵种自带 special 实现（如长枪对骑 ×10、重骑冲锋、陌刀对步兵 ×1.5 等），不重复乘算。
import { getUnit } from './units.js?v=1.93';
import { TAG_NAMES } from '../ui/helpers.js?v=1.93';

// target 支持 { id: 'archer' } 或 { tag: 'ranged' }
const T = {
  ranged: { tag: 'ranged' },
  infantry: { tag: 'infantry' },
  cavalry: { tag: 'cavalry' },
  building: { tag: 'building' },
  support: { tag: 'support' },
  siege: { tag: 'siege' },
  melee: { tag: 'melee' },
};

const LIGHT_INFANTRY = ['militia', 'swordsman', 'scout', 'standard', 'swordshield', 'trapbattalion'];

// 轻装步兵（无重甲）被远程压制：逐 id 列出，避免把盾兵/重甲也算进来
const lightInfRows = (mul, why, source = 'mul') => LIGHT_INFANTRY.map((id) => ({ target: { id }, mul, source, why }));

export const COUNTERS = {
  // ---------- 关卡线 30 张（规划 v1.0 克制链 v2 统一源数据） ----------
  militia: [
    { target: T.building, mul: 1, source: 'special', why: '三人成队，围攻建筑与落单目标' },
    { target: T.support, mul: 1.15, source: 'mul', why: '以命换令，专挑软目标' },
  ],
  shield: [
    { target: T.ranged, mul: 1, source: 'special', why: '盾墙挡箭，受到远程伤害 -30%' },
    { target: T.cavalry, mul: 1, source: 'special', why: '重盾迎冲，冲锋伤害被摊薄' },
  ],
  swordsman: [
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '横扫清杂，一剑扫三人' },
    { target: { id: 'spearman' }, mul: 1.15, source: 'mul', why: '贴身近战，枪兵拉不开距离' },
  ],
  // 链一：长枪兵 / 拒马 -> 骑兵（首击 ×10、后续 ×5，冲锋失效）
  spearman: [
    { target: T.cavalry, mul: 1, source: 'special', why: '长枪拒马：对骑兵首击 ×10、后续 ×5，冲锋失效' },
    { target: { id: 'barricade' }, mul: 1.15, source: 'mul', why: '枪杆拆栅，攻势不停' },
  ],
  // 链四：弓兵 / 投矛手 -> 轻装步兵 ×1.30 (source: 'mul')
  archer: lightInfRows(1.30, '远程压制无甲步兵', 'mul'),
  javelineer: lightInfRows(1.30, '标枪穿透 2 人，专治密集轻步兵', 'mul'),
  // 链二：轻骑兵 -> 远程 ×1.30 (source: 'mul')
  lightcav: [
    { target: T.ranged, mul: 1.30, source: 'mul', why: '轻骑贴脸：对远程伤害 ×1.3，并打断其输出节奏' },
    { target: T.support, mul: 1.25, source: 'mul', why: '绕后冲杀旗鼓医帐' },
  ],
  crossbow: [
    { target: { id: 'heavyguard' }, mul: 1, source: 'special', why: '弩矢无视 50% 护甲，破重甲' },
    { target: { id: 'cataphract' }, mul: 1, source: 'special', why: '破甲直穿具装' },
  ],
  fireoil: [
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '火油烧地，散兵成片焦' },
    { target: { id: 'trapbattalion' }, mul: 1, source: 'special', why: '火区克制密集成阵' },
    { target: { id: 'tent' }, mul: 1, source: 'special', why: '火区压制治疗建筑' },
  ],
  scout: [
    { target: { id: 'heavyguard' }, mul: 1, source: 'special', why: '标记放大伤害，重甲也扛不住集火' },
    { target: { id: 'whitehorse' }, mul: 1, source: 'special', why: '标记冲锋主力，全队围杀' },
  ],
  taoist: [
    { target: T.cavalry, mul: 1, source: 'special', why: '符咒减速/定身，直接断掉冲锋' },
    { target: { id: 'assassin' }, mul: 1.15, source: 'mul', why: '定身留住刺客，使其无法脱战' },
  ],
  swordshield: [
    { target: T.infantry, mul: 1, source: 'special', why: '横扫 2 人，近战换血占优' },
    { target: T.ranged, mul: 1, source: 'special', why: '刀盾护身，远程难破' },
  ],
  axethrower: [
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '飞斧溅射，一片一片清' },
    { target: { id: 'trapbattalion' }, mul: 1, source: 'special', why: '溅射克制五人成阵' },
  ],
  standard: [
    { target: T.infantry, mul: 1, source: 'special', why: '旗鼓增益，步兵越多收益越高', noInvert: true },
    { target: T.ranged, mul: 1, source: 'special', why: '攻速光环放大远程齐射', noInvert: true },
  ],
  arrowtower: [
    { target: T.ranged, mul: 1, source: 'special', why: '优先射击敌方远程单位' },
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '箭塔压制散兵' },
  ],
  drum: [
    { target: T.infantry, mul: 1, source: 'special', why: '攻速光环让步兵成倍输出', noInvert: true },
    { target: T.ranged, mul: 1, source: 'special', why: '攻速光环放大齐射频率', noInvert: true },
  ],
  tent: [
    { target: T.ranged, mul: 1, source: 'special', why: '持续回血，远程消耗打不穿', noInvert: true },
  ],
  barricade: [
    { target: T.cavalry, mul: 1, source: 'special', why: '拒马使骑兵冲锋失效并减速 30%' },
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '路障卡位，散兵挤作一团' },
  ],
  heavyguard: [
    { target: T.infantry, mul: 1.15, source: 'mul', why: '嘲讽吸伤 + 减伤 15%，近战换血王' },
    { target: T.cavalry, mul: 1, source: 'special', why: '重盾拦马，冲锋只能撞墙' },
  ],
  // 链五：陌刀对步兵 ×1.5 (source: 'special')
  modao: [
    { target: T.infantry, mul: 1.5, source: 'special', why: '陌刀横扫，对步兵 +50%' },
    { target: { id: 'shield' }, mul: 1, source: 'special', why: '长刀破盾，盾兵阵线崩塌' },
  ],
  strongbow: [
    { target: { id: 'heavyguard' }, mul: 1, source: 'special', why: '无视 30% 护甲 + 残血斩杀' },
    { target: { id: 'cataphract' }, mul: 1, source: 'special', why: '专点残血重骑，一击带走' },
  ],
  // 链三：重骑兵 -> 远程 ×1.50 (source: 'special')
  cataphract: [
    { target: T.ranged, mul: 1.50, source: 'special', why: '重骑冲锋：对远程伤害 +50% 并造成范围击退' },
    { target: T.support, mul: 1.25, source: 'mul', why: '具装冲散旗鼓医帐' },
  ],
  // 链六：刺客 / 伏兵 -> 远程 / 建筑 / 攻城 ×2.0 / ×2.0 / ×1.35
  assassin: [
    { target: T.ranged, mul: 2.0, source: 'special', why: '跃向后排：对远程伤害 +100%' },
    { target: T.building, mul: 2.0, source: 'special', why: '潜行拆塔：对建筑伤害 +100%' },
    { target: T.support, mul: 1.25, source: 'mul', why: '专杀旗鼓医帐谋士' },
    { target: T.siege, mul: 1.35, source: 'mul', why: '贴身拆攻城车：慢速攻城单位无法逃脱' },
  ],
  // 附：火药车自爆
  powdercart: [
    { target: T.building, mul: 2.0, source: 'special', why: '自爆对建筑直伤 ×2' },
    { target: { id: 'trapbattalion' }, mul: 1, source: 'special', why: '一车换五人，成阵也白搭' },
  ],
  repeater: [
    { target: T.infantry, mul: 1.15, source: 'mul', why: '超高射速持续压制步兵' },
    { target: { id: 'militia' }, mul: 1, source: 'special', why: '连弩专治人海' },
  ],
  medic: [
    { target: { id: 'fireoil' }, mul: 1, source: 'special', why: '持续治疗抵消火区消耗', noInvert: true },
    { target: T.ranged, mul: 1, source: 'special', why: '远程对耗时奶量决定胜负', noInvert: true },
  ],
  strategist: [
    { target: T.siege, mul: 1, source: 'special', why: '削攻 25%，压掉攻城爆发' },
    { target: { id: 'whitehorse' }, mul: 1, source: 'special', why: '削攻让冲锋打不出斩杀' },
  ],
  trapbattalion: [
    { target: T.infantry, mul: 1, source: 'special', why: '五人成阵，步兵光环 +15%' },
    { target: T.cavalry, mul: 1.15, source: 'mul', why: '结阵拒马，骑兵撞不开' },
  ],
  whitehorse: [
    { target: T.ranged, mul: 1.30, source: 'mul', why: '冲锋穿透，远程来不及反应' },
    { target: T.infantry, mul: 1.15, source: 'mul', why: '穿透多个目标，步兵阵线被凿穿' },
  ],
  // 附：霹雳车抛石攻城
  trebuchet: [
    { target: T.building, mul: 1.5, source: 'special', why: '抛石范围伤害，对建筑 ×1.5' },
    { target: { id: 'trapbattalion' }, mul: 1, source: 'special', why: '范围落点，成阵五人一起吃' },
  ],

  // ---------- 术法 5 张（伤害由术法自身结算，带克制指引） ----------
  huichun: [
    { target: { id: 'fireoil' }, mul: 1, source: 'special', why: '群体回血，抵消火区消耗' },
    { target: { id: 'liaoyuan' }, mul: 1, source: 'special', why: '驱散减速，破掉燎原灼烧节奏' },
  ],
  jianyu: [
    { target: T.infantry, mul: 1.30, source: 'special', why: '三轮覆盖，专杀密集步兵' },
    { target: { id: 'trapbattalion' }, mul: 1, source: 'special', why: '成阵目标密集，箭雨收益最高' },
  ],
  liaoyuan: [
    { target: { id: 'tent' }, mul: 1, source: 'special', why: '持续火场压制治疗建筑' },
    { target: T.infantry, mul: 1, source: 'special', why: '火场减速，步兵走不出去' },
  ],
  fubing: [
    { target: T.ranged, mul: 1.30, source: 'mul', why: '空降伏兵贴脸，直接切后排' },
    { target: T.support, mul: 1.25, source: 'mul', why: '伏兵绕后拆旗鼓医帐' },
  ],
  jinglei: [
    { target: T.building, mul: 1, source: 'special', why: '1000 点雷击 + 5 秒眩晕，秒拆塔' },
    { target: { id: 'whitehorse' }, mul: 1, source: 'special', why: '定住冲锋主力，5 秒白打' },
  ],
};

function matches(target, unit) {
  if (!unit) return false;
  if (target.id) return unit.id === target.id;
  if (target.tag) return !!(unit.tags && unit.tags.includes(target.tag));
  return false;
}

function normalizeUnit(u) {
  if (!u) return null;
  if (typeof u === 'string') return getUnit(u) || { id: u, tags: [] };
  return u;
}

// 攻击方对防守方的额外数值倍率（仅 source === 'mul' 且 mul > 1 时乘算，special 不重复叠乘）
export function counterMul(attackerUnit, defenderUnit) {
  const att = normalizeUnit(attackerUnit);
  const def = normalizeUnit(defenderUnit);
  if (!att || !def) return 1;
  const rules = COUNTERS[att.id];
  if (!rules) return 1;
  let m = 1;
  for (const r of rules) {
    const isMulSource = (r.source === 'mul') || (!r.source && (r.mul || 1) > 1);
    if (isMulSource && (r.mul || 1) > 1 && matches(r.target, def)) {
      m = Math.max(m, r.mul);
    }
  }
  return m;
}

// 获取攻击方对防守方的克制情报（用于伤害飘字、克制印章与埋点）
export function getCounterMatch(attackerUnit, defenderUnit) {
  const att = normalizeUnit(attackerUnit);
  const def = normalizeUnit(defenderUnit);
  if (!att || !def) return null;
  const rules = COUNTERS[att.id];
  if (!rules) return null;
  for (const r of rules) {
    if (matches(r.target, def)) {
      return {
        isCounter: true,
        attacker: att.id,
        defender: def.id,
        mul: r.mul || 1,
        source: r.source || ((r.mul || 1) > 1 ? 'mul' : 'special'),
        why: r.why,
      };
    }
  }
  return null;
}

export function counterName(target) {
  if (target.id) {
    const u = getUnit(target.id);
    return u ? u.name : target.id;
  }
  return TAG_NAMES[target.tag] || target.tag;
}

// 该兵种克制谁（用于界面「克制」列）
export function strongOf(unit) {
  return (COUNTERS[unit.id] || []).map((r) => ({ name: counterName(r.target), why: r.why }));
}

// 该兵种被谁克制：扫描全表反向推导
export function weakOf(unit) {
  const out = [];
  for (const [aid, rules] of Object.entries(COUNTERS)) {
    const a = getUnit(aid);
    if (!a || a.id === unit.id) continue;
    for (const r of rules) {
      if (r.noInvert) continue;
      if (matches(r.target, unit)) {
        out.push({ name: a.name, why: r.why, spell: !!a.spell });
        break;
      }
    }
  }
  return out;
}

// 给定敌方兵种，找出玩家可用卡里能克制它的（用于关卡详情「克制提示」）
export function countersFor(enemyUnit, availableUnits) {
  const out = [];
  for (const u of availableUnits) {
    if (!u || u.spell || u.id === enemyUnit.id) continue;
    const rules = COUNTERS[u.id] || [];
    if (rules.some((r) => matches(r.target, enemyUnit))) out.push(u);
  }
  return out;
}

export { matches as counterMatches };

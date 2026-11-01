// 界面 · 卡牌/单位特性文案（兵种 special → 中文说明）
// 涉及机制数值的条目直接读 unit.fx，调校面板改完立即同步
export function specialText(unit) {
  const fx = unit.fx || {};
  const n = (v, d) => (Number.isFinite(v) ? v : d);
  const map = {
    swarm: '三人成伍，分散吸收伤害。',
    rangedReduce: '挡箭：受到远程伤害降低 30%。',
    cleave3: '每第 3 次攻击横扫，造成 1.5 倍伤害。',
    anticav: '对骑兵首次伤害 ×10，之后 ×5，并阻断冲锋。',
    doubleShot: '每第 4 箭连射两发。',
    pierce2: '投矛可穿透 2 名敌人。',
    charge: '首次接敌冲锋 ×2 并击退。',
    armorPierce: '弩矢无视 50% 护甲。',
    fireGround: `留下燃烧地面：每秒 ${n(fx.fireDps, 20)} 伤害。`,
    mark: '标记目标，使其受到伤害 +20%。',
    slowRoot: '符咒减速；每第 3 次定身。',
    cleave2: '横扫 2 个目标。',
    splash: `投斧命中后小范围溅射（半径 ${n(fx.splashRadius, 1.3)}）。`,
    auraAtk: '周围友军攻击 +12%，自身不攻击。',
    towerPriorityRanged: '优先攻击敌方远程单位。',
    auraSpeed: '半径 6 内友军攻速 +20%。',
    healAura: '半径 5 内友军持续回复生命。',
    barricade: '减速敌军，使骑兵冲锋失效。',
    taunt: '吸引附近敌军攻击，受到伤害降低。',
    infantryBonus: '对步兵伤害 +50%，攻击横扫。',
    sniper: `锁定视野内生命最低的目标，击败后才换目标；对生命低于 ${Math.round((fx.lowHpThreshold ?? 0.5) * 100)}% 的目标伤害 +${Math.round((fx.lowHpBonus ?? 1) * 100)}%，破甲。`,
    heavyCharge: '冲锋造成范围伤害与击退。',
    assassin: '潜行切后，对远程/建筑伤害翻倍。',
    suicide: `接触爆炸，造成 ${n(fx.blastDamage, 260)} 范围伤害；对建筑 ×${n(fx.blastBuildingMul, 2)}。`,
    rapidTower: '高射速持续压制。',
    medic: `随军医护：跟随最近友军（非英雄），在中距每 2 秒治疗其 ${n(fx.healAmount, 45)} 点生命。`,
    debuff: `谋士符咒：远程攻击造成 10 点伤害，命中削弱敌军攻击 ${Math.round(n(fx.atkDown, 0.25) * 100)}%，持续 ${n(fx.debuffDur, 5)} 秒。`,
    eliteAura: '周围步兵攻击与生存提升。',
    legendCharge: '冲锋穿透，击杀重置冲锋。',
    trebuchet: `移动抛石机（移速0.1）：超远抛石造成半径 ${n(fx.splashRadius, 3.0)} 范围伤害；对建筑 ×${n(fx.buildingBonus, 1.5)}。`,
    spellHeal: '术法：开局蓄势 12 秒；全场点选释放，回复并驱散减速。',
    spellRain: '术法：开局蓄势 12 秒；全场点选释放，3 轮箭雨覆盖。',
    spellBurn: '术法：开局蓄势 12 秒；全场点选释放，留下燃烧地面。',
    spellThunder: '术法：开局蓄势 12 秒；全场点选释放，定点雷击眩晕。',
    spellAmbush: '术法：开局蓄势 12 秒；全场点选释放，召唤伏兵。',
    kite: `首张空中传奇：悬空巡航，每秒自损 ${Math.round(n(fx.selfDecay, 0.03) * 100)}% 最大生命，仅弓弩与术法可击落；飞抵敌首上空投下火药，造成 ${n(fx.bombDamage, 170)} 范围爆伤。生命耗尽坠地 1 秒无敌，起身持火铳再战（范围 ${n(unit.ground && unit.ground.splash, 1.8)}），阵亡处燃起 ${n(fx.fireDuration, 3)} 秒火坑。`,
  };
  // 未知特性：回退使用 desc
  return map[unit.special] || unit.desc || '无特殊机制。';
}

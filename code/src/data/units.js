// 《墨阵山河》兵种数据
// 30 个可解锁兵种 + 敌方首领/召唤物隐藏单位

export const RARITY = {
  common: { key: 'common', name: '普通', color: '#8b8f86', rank: 0 },
  rare: { key: 'rare', name: '高级', color: '#4b7a6a', rank: 1 },
  legendary: { key: 'legendary', name: '传奇', color: '#b23a2f', rank: 2 },
};

// look 字段用于程序化 3D 建模
// helmet: bun | cone | brim | straw | crest | horn | crown | hood | none
// weapon: sword | spear | glaive | bow | crossbow | axe | fan | flag | staff | dagger | none
// building: tower | drum | tent | barricade | trebuchet | null

export const UNITS = [
  {
    id: 'militia', name: '乡勇', rarity: 'common', role: '步卒', tags: ['melee', 'infantry'],
    cost: 2, cooldown: 2.5, count: 3, hp: 110, atk: 9, armor: 0, range: 0.7, interval: 1.0, speed: 1.5,
    projectile: 'none', special: 'swarm', desc: '一卡三人。分散吸收伤害，以命换令。',
    unlockLevel: 1,
    look: { cloth: 0x8a7a5e, armor: 0x9a8a6a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'straw', weapon: 'sword', offhand: 'none', cape: null, mount: null, size: 0.92 },
  },
  {
    id: 'shield', name: '盾兵', rarity: 'common', role: '步卒', tags: ['melee', 'infantry'],
    cost: 4, cooldown: 5.0, count: 1, hp: 480, atk: 12, armor: 18, range: 0.8, interval: 1.4, speed: 0.65,
    projectile: 'none', special: 'rangedReduce', desc: '挡箭：受到远程伤害降低 30%。',
    unlockLevel: 2,
    look: { cloth: 0x4a5a52, armor: 0x6b746d, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'brim', weapon: 'shield', offhand: 'none', cape: null, mount: null, size: 1.02 },
  },
  {
    id: 'swordsman', name: '剑兵', rarity: 'common', role: '步卒', tags: ['melee', 'infantry'],
    cost: 4, cooldown: 3.5, count: 1, hp: 260, atk: 28, armor: 5, range: 0.8, interval: 1.0, speed: 0.95,
    projectile: 'none', special: 'cleave3', desc: '每第 3 次攻击横扫，造成 1.5 倍伤害。',
    unlockLevel: 1,
    look: { cloth: 0x3f5a52, armor: 0x6b746d, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'bun', weapon: 'sword', offhand: 'none', cape: 0x2f4a5a, mount: null, size: 1.0 },
  },
  {
    id: 'spearman', name: '长枪兵', rarity: 'common', role: '步卒', tags: ['melee', 'infantry', 'anticav'],
    cost: 5, cooldown: 6.0, count: 1, hp: 320, atk: 30, armor: 8, range: 1.3, interval: 1.2, speed: 0.8,
    projectile: 'none', special: 'anticav', desc: '对骑兵首次伤害 ×10，之后 ×5，并阻断骑兵冲锋。',
    unlockLevel: 4,
    look: { cloth: 0x3a4a5a, armor: 0x6b746d, trim: 0x9ab0a5, skin: 0xd8c3a1, helmet: 'cone', weapon: 'spear', offhand: 'none', cape: null, mount: null, size: 1.05 },
  },
  {
    id: 'archer', name: '弓兵', rarity: 'common', role: '远程', tags: ['ranged'],
    cost: 7, cooldown: 10.0, count: 2, hp: 150, atk: 22, armor: 0, range: 6.0, interval: 1.2, speed: 0.8,
    projectile: 'arrow', special: 'doubleShot', desc: '每第 4 箭连射两发。',
    unlockLevel: 1,
    look: { cloth: 0x5a6a4e, armor: 0x7a725e, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'bun', weapon: 'bow', offhand: 'quiver', cape: null, mount: null, size: 0.98 },
  },
  {
    id: 'javelineer', name: '投矛手', rarity: 'common', role: '远程', tags: ['ranged'],
    cost: 5, cooldown: 7.0, count: 1, hp: 200, atk: 42, armor: 2, range: 5.0, interval: 2.0, speed: 0.7,
    projectile: 'javelin', special: 'pierce2', desc: '矛可穿透 2 名敌人。',
    unlockLevel: 6,
    look: { cloth: 0x6e5e4a, armor: 0x8a7a5e, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'straw', weapon: 'javelin', offhand: 'quiver', cape: null, mount: null, size: 1.02 },
  },
  {
    id: 'lightcav', name: '轻骑兵', rarity: 'common', role: '骑兵', tags: ['cavalry', 'melee'],
    cost: 6, cooldown: 9.0, count: 1, hp: 350, atk: 38, armor: 6, range: 0.9, interval: 1.1, speed: 1.6,
    projectile: 'none', special: 'charge', desc: '首次接敌冲锋 ×2 并击退。',
    unlockLevel: 8,
    look: { cloth: 0x5a4a3a, armor: 0x7a6a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'cone', weapon: 'spear', offhand: 'none', cape: 0x8a3a2f, mount: 'brown', size: 1.0 },
  },
  {
    id: 'crossbow', name: '弩手', rarity: 'common', role: '远程', tags: ['ranged'],
    cost: 6, cooldown: 8.0, count: 1, hp: 170, atk: 36, armor: 0, range: 7.5, interval: 2.2, speed: 0.65,
    projectile: 'bolt', special: 'armorPierce', desc: '弩矢无视 50% 护甲。',
    unlockLevel: 11,
    look: { cloth: 0x3f4a52, armor: 0x6b746d, trim: 0x9ab0a5, skin: 0xd8c3a1, helmet: 'brim', weapon: 'crossbow', offhand: 'none', cape: null, mount: null, size: 1.0 },
  },
  {
    id: 'fireoil', name: '火油兵', rarity: 'common', role: '远程', tags: ['ranged'],
    cost: 5, cooldown: 8.0, count: 1, hp: 180, atk: 18, armor: 0, range: 4.0, interval: 1.8, speed: 0.85,
    projectile: 'oil', special: 'fireGround', desc: '投掷火油，留下燃烧地面。',
    fx: { fireDps: 20, fireRadius: 1.5 },
    unlockLevel: 13,
    look: { cloth: 0x6a4a3a, armor: 0x7a6a52, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'straw', weapon: 'none', offhand: 'pot', cape: null, mount: null, size: 1.0 },
  },
  {
    id: 'scout', name: '斥候', rarity: 'common', role: '步卒', tags: ['melee', 'infantry'],
    cost: 3, cooldown: 4.0, count: 1, hp: 140, atk: 12, armor: 0, range: 0.8, interval: 0.9, speed: 1.5,
    projectile: 'none', special: 'mark', desc: '命中目标使其受到伤害 +20%，持续 4 秒。',
    unlockLevel: 14,
    look: { cloth: 0x4a4a42, armor: 0x5a5a52, trim: 0x9ab0a5, skin: 0xd8c3a1, helmet: 'hood', weapon: 'dagger', offhand: 'none', cape: null, mount: null, size: 0.94 },
  },
  {
    id: 'taoist', name: '道士', rarity: 'common', role: '远程', tags: ['ranged', 'support'],
    cost: 6, cooldown: 12.0, count: 1, hp: 160, atk: 20, armor: 0, range: 5.0, interval: 2.2, speed: 0.7,
    projectile: 'talisman', special: 'slowRoot', desc: '符咒减速 40%；每第 3 次定身 1.2 秒。',
    unlockLevel: 16,
    look: { cloth: 0x6b746d, armor: 0x8a8a7a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crown', weapon: 'staff', offhand: 'talisman', cape: null, mount: null, size: 1.0 },
  },
  {
    id: 'swordshield', name: '刀盾兵', rarity: 'common', role: '步卒', tags: ['melee', 'infantry'],
    cost: 6, cooldown: 7.0, count: 1, hp: 420, atk: 30, armor: 15, range: 0.9, interval: 1.3, speed: 0.75,
    projectile: 'none', special: 'cleave2', desc: '横扫 2 个目标。',
    unlockLevel: 17,
    look: { cloth: 0x3a4a4a, armor: 0x6b746d, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'brim', weapon: 'sword', offhand: 'shield', cape: 0x2f4a5a, mount: null, size: 1.06, extra: 'backflag' },
  },
  {
    id: 'axethrower', name: '掷斧手', rarity: 'common', role: '远程', tags: ['ranged'],
    cost: 5, cooldown: 6.0, count: 1, hp: 190, atk: 34, armor: 3, range: 3.5, interval: 1.6, speed: 0.8,
    projectile: 'axe', special: 'splash', desc: '投斧命中后小范围溅射。',
    fx: { splashRadius: 1.3, splashMul: 0.7 },
    unlockLevel: 18,
    look: { cloth: 0x5a4a3a, armor: 0x7a6a52, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'straw', weapon: 'axe', offhand: 'none', cape: null, mount: null, size: 1.02 },
  },
  {
    id: 'standard', name: '军旗兵', rarity: 'common', role: '辅助', tags: ['support', 'infantry'],
    cost: 4, cooldown: 10.0, count: 1, hp: 260, atk: 0, armor: 5, range: 0, interval: 2.0, speed: 0.75,
    projectile: 'none', special: 'auraAtk', desc: '周围友军攻击 +12%，自身不攻击。',
    unlockLevel: 15,
    look: { cloth: 0x7a3a2f, armor: 0x8a7a5e, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', weapon: 'flag', offhand: 'none', cape: null, mount: null, size: 1.08 },
  },
  {
    id: 'arrowtower', name: '箭塔', rarity: 'common', role: '建筑', tags: ['building', 'ranged'],
    cost: 6, cooldown: 10.0, count: 1, hp: 600, atk: 26, armor: 12, range: 7.0, interval: 1.2, speed: 0,
    projectile: 'arrow', special: 'towerPriorityRanged', desc: '优先攻击敌方远程单位。',
    unlockLevel: 3, building: true,
    look: { cloth: 0x6b746d, armor: 0x5a5a52, trim: 0xc9a25e, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0, building: 'tower' },
  },
  {
    id: 'drum', name: '战鼓台', rarity: 'common', role: '建筑', tags: ['building', 'support'],
    cost: 5, cooldown: 14.0, count: 1, hp: 450, atk: 0, armor: 10, range: 0, interval: 2.0, speed: 0,
    projectile: 'none', special: 'auraSpeed', desc: '半径 6 内友军攻击速度 +20%。',
    unlockLevel: 7, building: true,
    look: { cloth: 0x7a3a2f, armor: 0x8a7a5e, trim: 0xc9a25e, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0, building: 'drum' },
  },
  {
    id: 'tent', name: '医帐', rarity: 'common', role: '建筑', tags: ['building', 'support'],
    cost: 5, cooldown: 15.0, count: 1, hp: 400, atk: 0, armor: 8, range: 0, interval: 2.0, speed: 0,
    projectile: 'none', special: 'healAura', desc: '半径 5 内友军每秒回复 12 生命。',
    unlockLevel: 12, building: true,
    look: { cloth: 0xd8d2c0, armor: 0x9ab0a5, trim: 0x4b7a6a, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0, building: 'tent' },
  },
  {
    id: 'barricade', name: '拒马', rarity: 'common', role: '建筑', tags: ['building', 'support'],
    cost: 3, cooldown: 8.0, count: 1, hp: 500, atk: 0, armor: 15, range: 0, interval: 2.0, speed: 0,
    projectile: 'none', special: 'barricade', desc: '半径 2.5 内敌军减速 30%；骑兵冲锋失效。',
    unlockLevel: 9, building: true,
    look: { cloth: 0x6a5a42, armor: 0x5a4a32, trim: 0x9a8a6a, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0, building: 'barricade' },
  },

  {
    id: 'heavyguard', name: '重甲盾卫', rarity: 'rare', role: '步卒', tags: ['melee', 'infantry'],
    cost: 7, cooldown: 12.0, count: 1, hp: 900, atk: 18, armor: 35, range: 1.0, interval: 1.6, speed: 0.5,
    projectile: 'none', special: 'taunt', desc: '半径 3 内敌军优先攻击他；受到伤害 -15%。',
    unlockLevel: 19,
    look: { cloth: 0x2f3a3a, armor: 0x6b746d, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'horn', weapon: 'sword', offhand: 'towerShield', cape: 0x2f4a5a, mount: null, size: 1.14 },
  },
  {
    id: 'modao', name: '陌刀兵', rarity: 'rare', role: '步卒', tags: ['melee', 'infantry'],
    cost: 7, cooldown: 10.0, count: 1, hp: 520, atk: 500, armor: 12, range: 1.2, interval: 3.0, speed: 0.7,
    projectile: 'none', special: 'infantryBonus', desc: '重刀挥砍：一刀 500 伤害，对近战单位伤害翻倍；出手 0.8 秒，攻击间隔 3 秒。',
    attackDuration: 0.8,
    unlockLevel: 21,
    look: { cloth: 0x3a3a32, armor: 0x7a6a52, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'crest', weapon: 'glaive', offhand: 'none', cape: 0x6a2a22, mount: null, size: 1.1, weaponScale: 1.25, extra: 'sash' },
  },
  {
    id: 'strongbow', name: '神臂弓手', rarity: 'rare', role: '远程', tags: ['ranged'],
    cost: 9, cooldown: 12.0, count: 1, hp: 250, atk: 100, armor: 0, range: 9.5, interval: 2.2, speed: 0.6,
    projectile: 'bolt', special: 'sniper', desc: '锁定视野内生命最低的目标，击败后才换目标；对生命低于 50% 的目标伤害 +100%；无视 30% 护甲。',
    fx: { sniperMul: 1.5, lowHpThreshold: 0.5, lowHpBonus: 2 },
    unlockLevel: 23,
    look: { cloth: 0x3f4a52, armor: 0x6b746d, trim: 0x9ab0a5, skin: 0xd8c3a1, helmet: 'brim', weapon: 'crossbow', offhand: 'none', cape: null, mount: null, size: 1.04, weaponScale: 1.35 },
  },
  {
    id: 'cataphract', name: '重骑兵', rarity: 'rare', role: '骑兵', tags: ['cavalry', 'melee'],
    cost: 9, cooldown: 16.0, count: 1, hp: 700, atk: 55, armor: 20, range: 1.0, interval: 1.4, speed: 1.2,
    projectile: 'none', special: 'heavyCharge', desc: '冲锋造成范围伤害与击退；对远程 +50%。',
    unlockLevel: 24,
    look: { cloth: 0x2f3a3a, armor: 0x5a5a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'horn', weapon: 'spear', offhand: 'none', cape: 0x2f4a5a, mount: 'black', size: 1.12 },
  },
  {
    id: 'assassin', name: '刺客', rarity: 'rare', role: '步卒', tags: ['melee', 'infantry'],
    cost: 7, cooldown: 12.0, count: 2, hp: 260, atk: 48, armor: 4, range: 0.8, interval: 0.9, speed: 1.5,
    projectile: 'none', special: 'assassin', desc: '潜行 3 秒；跃向敌方后排；对远程/建筑 +100%。',
    unlockLevel: 25,
    look: { cloth: 0x242420, armor: 0x3a3a32, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'hood', weapon: 'dagger', offhand: 'dagger', cape: 0x1f1f1b, mount: null, size: 0.96 },
  },
  {
    id: 'powdercart', name: '火药车', rarity: 'rare', role: '攻城', tags: ['siege'],
    cost: 10, cooldown: 18.0, count: 1, hp: 300, atk: 0, armor: 5, range: 0, interval: 1.0, speed: 4.5,
    projectile: 'none', special: 'suicide', desc: '接触后爆炸，造成范围伤害；对建筑加倍。',
    fx: { blastDamage: 500, blastBuildingMul: 4, blastBaseDamage: 1000, blastRadius: 2.4 },
    unlockLevel: 22,
    look: { cloth: 0x5a4a32, armor: 0x3a3a32, trim: 0xb23a2f, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.06, building: 'cart' },
  },
  {
    id: 'repeater', name: '连弩塔', rarity: 'rare', role: '建筑', tags: ['building', 'ranged'],
    cost: 10, cooldown: 25.0, count: 1, hp: 800, atk: 15, armor: 10, range: 6.5, interval: 0.2, speed: 0,
    projectile: 'bolt', special: 'rapidTower', desc: '高射速，持续压制。',
    unlockLevel: 29, building: true,
    look: { cloth: 0x3a4a4a, armor: 0x5a5a52, trim: 0x9ab0a5, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0, building: 'repeater' },
  },
  {
    id: 'medic', name: '军医', rarity: 'rare', role: '辅助', tags: ['support'],
    cost: 6, cooldown: 12.0, count: 1, hp: 240, atk: 0, armor: 2, range: 4.0, interval: 2.0, speed: 0.9,
    projectile: 'none', special: 'medic', desc: '随军医士：全战场侦测伤情，优先跟随血量不满的友军并为其持续回血。',
    fx: { healAmount: 45 },
    unlockLevel: 26,
    look: { cloth: 0xd8d2c0, armor: 0x9ab0a5, trim: 0x4b7a6a, skin: 0xd8c3a1, helmet: 'bun', weapon: 'none', offhand: 'medicine', cape: null, mount: null, size: 1.0 },
  },
  {
    id: 'strategist', name: '谋士', rarity: 'rare', role: '辅助', tags: ['support', 'ranged'],
    cost: 6, cooldown: 15.0, count: 1, hp: 200, atk: 10, armor: 2, range: 6.5, interval: 2.4, speed: 0.65,
    projectile: 'talisman', special: 'debuff', desc: '远程谋士：远程符咒攻击（10点伤害），命中削弱敌军攻击 25%，持续 5 秒。',
    fx: { atkDown: 0.25, debuffDur: 5 },
    unlockLevel: 27,
    look: { cloth: 0x2f3a4a, armor: 0x4a5a6a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crown', weapon: 'fan', offhand: 'none', cape: 0x2f4a5a, mount: null, size: 1.02 },
  },

  {
    id: 'trapbattalion', name: '陷阵营', rarity: 'legendary', role: '步卒', tags: ['melee', 'infantry', 'elite'],
    cost: 12, cooldown: 25.0, count: 5, hp: 420, atk: 44, armor: 16, range: 1.0, interval: 1.1, speed: 0.85,
    projectile: 'none', special: 'eliteAura', desc: '五人成阵；周围步兵攻击/生命 +15%。',
    unlockLevel: 30,
    look: { cloth: 0x2f3a3a, armor: 0x5a5a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'horn', weapon: 'spear', offhand: 'shield', cape: 0xb23a2f, mount: null, size: 1.0 },
  },
  {
    id: 'whitehorse', name: '白马义从', rarity: 'legendary', role: '骑兵', tags: ['cavalry', 'melee', 'elite'],
    cost: 12, cooldown: 20.0, count: 1, hp: 800, atk: 200, armor: 16, range: 0.9, interval: 1.2, speed: 1.8,
    projectile: 'none', special: 'legendCharge', desc: '冲锋穿透多个目标；击杀后立即重置冲锋。',
    unlockLevel: 50,
    look: { cloth: 0xd8d2c0, armor: 0x9ab0a5, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', weapon: 'spear', offhand: 'none', cape: 0xffffff, mount: 'white', size: 1.05 },
  },
  {
    id: 'trebuchet', name: '霹雳车', rarity: 'legendary', role: '攻城', tags: ['siege'],
    cost: 20, cooldown: 120.0, count: 1, hp: 800, atk: 400, armor: 8, range: 9.5, interval: 5.0, speed: 0.5,
    projectile: 'stone', special: 'trebuchet', desc: '古代移动抛石重机；移动推进（速度0.1），超远距离范围轰炸，对建筑加成 50%。',
    fx: { splashRadius: 3, splashMul: 0.7, buildingBonus: 1.5 },
    unlockLevel: 58,
    look: { cloth: 0x6a5a42, armor: 0x3a3a32, trim: 0xb23a2f, skin: 0x8a7a5e, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.15, building: 'trebuchet' },
  },

  // ---------- 点兵池限定（v1.88：关卡无法获取，仅可在「点兵点将」以将令点募） ----------
  {
    id: 'sishi', name: '死士', rarity: 'legendary', role: '攻城', tags: ['siege', 'infantry'],
    cost: 8, cooldown: 16.0, count: 3, hp: 150, atk: 0, armor: 0, range: 1.0, interval: 1.0, speed: 4.0,
    projectile: 'none', special: 'martyr',
    desc: '一卡三人，身负火药直扑敌军后排与建筑，遇前排不恋战；触敌即爆与目标一换一，对建筑 800 伤、对大本营 500 伤。',
    fx: { buildingDamage: 800, baseDamage: 500 },
    unlockLevel: 999, gachaUnit: true,
    look: { cloth: 0x3a3028, armor: 0x4a3a2e, trim: 0xb23a2f, skin: 0xcdb492, helmet: 'hood', weapon: 'none', offhand: 'pot', cape: null, mount: null, size: 0.78 },
  },
  {
    id: 'banxian', name: '半仙', rarity: 'legendary', role: '远程', tags: ['ranged', 'support'],
    cost: 9, cooldown: 18.0, count: 1, hp: 320, atk: 90, armor: 3, range: 7.0, interval: 2.2, speed: 0.6,
    projectile: 'talisman', special: 'necro',
    desc: '黄袍老道携三名僵尸出阵；远程符火范围灼烧并烙下 5 秒魂印，被烙印敌军阵亡 0.5 秒后，尸身破土化作我方僵尸。',
    fx: { splashRadius: 2.2, splashMul: 0.8, markDur: 5, zombieDelay: 0.5, zombieCount: 3, zombie: 'zombie' },
    unlockLevel: 999, gachaUnit: true,
    look: { cloth: 0xd8b23c, armor: 0xb8912e, trim: 0x7a6a2a, skin: 0xd8c3a1, helmet: 'bun', weapon: 'sword', offhand: 'talisman', cape: 0xd8b23c, mount: null, size: 1.02, beard: true },
  },
  {
    id: 'zhiyuan', name: '纸鸢', rarity: 'legendary', role: '空中', tags: ['ranged', 'air', 'fire'],
    cost: 10, cooldown: 20.0, count: 1, hp: 150, atk: 0, armor: 0, range: 3.2, interval: 1.7, speed: 2.0,
    projectile: 'none', special: 'kite', air: true,
    desc: '首张空中传奇。纸鸢凌空巡飞，在敌军头顶投下火药造成范围爆伤；飞行器仅 150 血，且每秒自损 3% 最大生命，唯弓弩与术法能将其击落。坠地 1 秒无敌，站起后持火铳再战，阵亡处燃起 3 秒火坑。',
    fx: { bombDamage: 170, bombSplash: 2.2, bombSplashMul: 1.0, selfDecay: 0.03, airHeight: 1.8, fallDuration: 1.0, fireDps: 50, fireRadius: 2.0, fireDuration: 3.0 },
    ground: { hp: 300, atk: 34, range: 4.2, interval: 1.8, splash: 1.8, splashMul: 0.8, speed: 0.9 },
    unlockLevel: 999, gachaUnit: true,
    look: { cloth: 0xe6dcc0, armor: 0x9a8a6a, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'straw', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.3, air: 'kite' },
    groundLook: { cloth: 0xd8c9a8, armor: 0x8a7a5e, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'straw', weapon: 'firelance', offhand: 'none', cape: null, mount: null, size: 0.95 },
  },
  {
    id: 'pocheng', name: '破城', rarity: 'legendary', role: '攻城', tags: ['siege'],
    cost: 20, cooldown: 100.0, count: 1, hp: 10000, atk: 1000, armor: 25, range: 1.6, interval: 8.0, speed: 0.4,
    projectile: 'none', special: 'ram', attackDuration: 0.9,
    desc: '攻城撞车。万血重甲，行动缓慢，只攻建筑与大本营；首次出手仅蓄力 4 秒，其后每撞蓄力 8 秒；首撞 1000，对同一建筑每撞递增 500。',
    fx: { firstDelay: 4.0, rampStep: 500 },
    unlockLevel: 999, gachaUnit: true,
    look: { cloth: 0x6a5a42, armor: 0x3a3a32, trim: 0xb23a2f, skin: 0x8a7a5e, helmet: 'none', weapon: 'ramlog', offhand: 'none', cape: null, mount: null, size: 1.25, building: 'ram' },
  },
  {
    id: 'bilei', name: '壁垒', rarity: 'legendary', role: '步卒', tags: ['melee', 'infantry'],
    cost: 15, cooldown: 60.0, count: 1, hp: 10000, atk: 40, armor: 12, range: 2.0, interval: 1.5, speed: 0.3,
    projectile: 'none', special: 'bulwark', attackDuration: 0.6,
    desc: '巨躯重卫。万血之躯极缓推进，从不攻击敌兵，只以 40 伤缓击建筑；受创即将一半伤害反还敌手；每累积承受半血之伤，便爆发一次半血（5000）范围震撼，至多两次。',
    fx: { reflect: 0.5, shockThreshold: 0.5, shockDamage: 0.5, shockRadius: 2.0, maxShocks: 2, shockAnim: 0.5 },
    unlockLevel: 999, gachaUnit: true,
    look: { cloth: 0x3a4a52, armor: 0x4a4a44, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'horn', weapon: 'mace', weaponScale: 1.5, offhand: 'none', cape: 0x2a3a3a, mount: null, size: 1.48, fat: [1.55, 0.94, 1.4], beard: true },
  },
  // ---------- 术法卡（v1.1，design §3.3.1：长冷却、开局蓄势 12s、全场点选、最多带 2 张） ----------
  {
    id: 'huichun', name: '回春术', rarity: 'rare', role: '术法', tags: ['spell'], spell: true,
    cost: 8, cooldown: 40, count: 0, hp: 0, atk: 0, armor: 0, range: 5.0, interval: 0, speed: 0,
    projectile: 'none', special: 'spellHeal', desc: '青玉回春：指定区域半径 5 内友军立即回复 60% 生命，并驱散减速。',
    unlockLevel: 1, color: 0x4b7a6a, glyph: '春',
    spellFx: { type: 'heal', radius: 5, heal: 0.6 },
  },
  {
    id: 'jianyu', name: '箭雨术', rarity: 'rare', role: '术法', tags: ['spell'], spell: true,
    cost: 8, cooldown: 45, count: 0, hp: 0, atk: 0, armor: 0, range: 4.0, interval: 0, speed: 0,
    projectile: 'none', special: 'spellRain', desc: '墨青箭雨：指定区域半径 4 内降下 3 轮箭雨，每轮 140 伤害。',
    unlockLevel: 6, color: 0x3a5a6a, glyph: '箭',
    spellFx: { type: 'arrowrain', radius: 4, waves: 3, damage: 150 },
  },
  {
    id: 'liaoyuan', name: '燎原术', rarity: 'rare', role: '术法', tags: ['spell'], spell: true,
    cost: 9, cooldown: 50, count: 0, hp: 0, atk: 0, armor: 0, range: 4.0, interval: 0, speed: 0,
    projectile: 'none', special: 'spellBurn', desc: '朱砂燎原：指定区域烈火 6 秒，每秒 100 伤害并减速 20%。',
    unlockLevel: 13, color: 0xc94f3d, glyph: '燎',
    spellFx: { type: 'burn', radius: 3.5, dps: 100, slow: 0.2, duration: 6 },
  },
  {
    id: 'fubing', name: '伏兵术', rarity: 'rare', role: '术法', tags: ['spell'], spell: true,
    cost: 15, cooldown: 120, count: 6, hp: 0, atk: 0, armor: 0, range: 0, interval: 0, speed: 0,
    projectile: 'none', special: 'spellAmbush', desc: '墨影伏兵：在指定位置召唤 6 名剑兵伏兵，继承战意强度。',
    unlockLevel: 15, color: 0x2a2a24, glyph: '伏',
    spellFx: { type: 'ambush', unit: 'swordsman', count: 6 },
  },
  {
    id: 'jinglei', name: '惊雷术', rarity: 'legendary', role: '术法', tags: ['spell'], spell: true,
    cost: 9, cooldown: 55, count: 0, hp: 0, atk: 0, armor: 0, range: 4.0, interval: 0, speed: 0,
    projectile: 'none', special: 'spellThunder', desc: '鎏金惊雷：指定点雷击 1000 伤害，半径 3.0 内眩晕 5 秒。',
    unlockLevel: 18, color: 0xd8b25a, glyph: '雷',
    spellFx: { type: 'thunder', damage: 1000, radius: 3.0, stun: 5 },
  },
];

// 隐藏单位：敌方首领、召唤物等
export const HIDDEN_UNITS = [
  {
    id: 'boss_qu', name: '黄巾渠帅', rarity: 'rare', role: '步卒', tags: ['melee', 'infantry', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 1800, atk: 55, armor: 12, range: 1.2, interval: 1.4, speed: 0.6,
    projectile: 'none', special: 'cleave2', desc: '黄巾渠帅，重刀阔斧。',
    look: { cloth: 0x6a3a2a, armor: 0x7a5a3a, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'crest', weapon: 'glaive', offhand: 'none', cape: 0x6a2a22, mount: null, size: 1.3 },
  },
  {
    id: 'boss_huaxiong', name: '华雄', rarity: 'rare', role: '骑兵', tags: ['cavalry', 'melee', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 4200, atk: 85, armor: 22, range: 1.1, interval: 1.3, speed: 1.05,
    projectile: 'none', special: 'charge', desc: '西凉猛将，铁骑冲阵。',
    look: { cloth: 0x4a3a2a, armor: 0x5a4a3a, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'horn', weapon: 'glaive', offhand: 'none', cape: 0x6a2a22, mount: 'black', size: 1.28 },
  },
  {
    id: 'boss_zhangjiao', name: '张角', rarity: 'legendary', role: '远程', tags: ['ranged', 'support', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 4200, atk: 40, armor: 8, range: 5.5, interval: 2.2, speed: 0.4,
    projectile: 'talisman', special: 'bossSummon', desc: '妖道，召黄巾、起妖风。',
    look: { cloth: 0x3a4a3a, armor: 0x5a6a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crown', weapon: 'staff', offhand: 'talisman', cape: 0x2a3a2a, mount: null, size: 1.38 },
  },
  {
    id: 'boss_lvbu', name: '吕布', rarity: 'legendary', role: '骑兵', tags: ['cavalry', 'melee', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 6800, atk: 110, armor: 25, range: 1.3, interval: 1.2, speed: 0.95,
    projectile: 'none', special: 'bossCharge', desc: '人中吕布，方天画戟。',
    look: { cloth: 0x242424, armor: 0x3a3a3a, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'crest', plume: true, weapon: 'halberd', weaponScale: 1.2, offhand: 'none', cape: 0xb23a2f, mount: 'red', size: 1.42, hero: true },
  },
  {
    id: 'boss_yuanshao', name: '袁绍', rarity: 'legendary', role: '远程', tags: ['ranged', 'support', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 6200, atk: 70, armor: 16, range: 6.0, interval: 1.6, speed: 0.55,
    projectile: 'arrow', special: 'bossSummon', desc: '河北雄狮，四世三公；强弩召军。',
    look: { cloth: 0x3a3a5a, armor: 0x6a6a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crown', weapon: 'bow', offhand: 'quiver', cape: 0xc9a25e, mount: null, size: 1.34, hero: true, beard: true },
  },
  {
    id: 'boss_caocao', name: '曹操', rarity: 'legendary', role: '近战', tags: ['melee', 'elite', 'boss'],
    cost: 0, cooldown: 0, count: 1, hp: 7600, atk: 120, armor: 26, range: 1.4, interval: 1.15, speed: 0.85,
    projectile: 'none', special: 'bossCharge', desc: '治世能臣，乱世奸雄；青釭剑气。',
    look: { cloth: 0x2a2a3a, armor: 0x4a4a52, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', plume: true, weapon: 'sword', bladeEdge: 0x3a5a8a, weaponScale: 1.25, offhand: 'none', cape: 0x2a2a4a, mount: null, size: 1.38, hero: true, beard: true },
  },
  {
    id: 'terracotta', name: '兵马俑', rarity: 'rare', role: '步卒', tags: ['melee', 'infantry', 'summon'],
    cost: 0, cooldown: 0, count: 1, hp: 380, atk: 30, armor: 15, range: 1.0, interval: 1.2, speed: 0.75,
    projectile: 'none', special: 'none', desc: '始皇帝召唤的陶俑守卫。',
    look: { cloth: 0x7a6a52, armor: 0x8a7a5e, trim: 0x5a4a3a, skin: 0x9a8a6a, helmet: 'brim', weapon: 'spear', offhand: 'shield', cape: null, mount: null, size: 1.04 },
  },
  {
    id: 'greatwall', name: '墨笔长城', rarity: 'legendary', role: '建筑', tags: ['building', 'defense', 'summon'],
    cost: 0, cooldown: 0, count: 1, hp: 3500, atk: 0, armor: 25, range: 0, interval: 1.0, speed: 0,
    projectile: 'none', special: 'greatwall', desc: '蒙恬神笔所筑万里长城金汤关隘城楼，阻绝近战与箭矢，巍然屹立。',
    unlockLevel: 1, building: true,
    look: { cloth: 0x221c16, armor: 0x44403c, trim: 0xc9a25e, skin: 0x767066, helmet: 'none', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.15, building: 'greatwall' },
  },
  {
    id: 'zombie', name: '僵尸', rarity: 'common', role: '步卒', tags: ['melee', 'infantry', 'undead'],
    cost: 0, cooldown: 0, count: 1, hp: 110, atk: 9, armor: 0, range: 0.7, interval: 1.0, speed: 1.5,
    projectile: 'none', special: 'none', desc: '半仙以魂印催生的僵尸，属性与乡勇相同，破土而出为我方作战。',
    unlockLevel: 999, summonOnly: true,
    look: { cloth: 0x3f4a5a, armor: 0x4a5566, trim: 0x6a7a8a, skin: 0xc9c6b4, helmet: 'brim', weapon: 'none', offhand: 'none', cape: null, mount: null, size: 1.0 },
  },
];

export const GACHA_UNITS = UNITS.filter((u) => u.gachaUnit);

export const ALL_UNITS = [...UNITS, ...HIDDEN_UNITS];

const UNIT_MAP = new Map(ALL_UNITS.map((u) => [u.id, u]));

export function getUnit(id) {
  return UNIT_MAP.get(id) || UNIT_MAP.get('militia');
}

export function isBuilding(unit) {
  return !!unit.building;
}

export function unitUnlockLevel(id) {
  const u = UNIT_MAP.get(id);
  return u ? (u.unlockLevel || 1) : 1;
}

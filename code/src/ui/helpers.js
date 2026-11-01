// 界面公共辅助：数值裁剪、时间格式、标签名、英雄经验表
export const HERO_XP = [0, 8, 20, 35, 55];

export const TAG_NAMES = {
  melee: '近战', ranged: '远程', cavalry: '骑兵', building: '建筑', support: '辅助',
  siege: '攻城', elite: '精英', infantry: '步兵', anticav: '反骑', spell: '术法',
  air: '空中', fire: '火攻',
};

export function pct(a, b) {
  if (!b) return 0;
  return Math.max(0, Math.min(1, a / b));
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

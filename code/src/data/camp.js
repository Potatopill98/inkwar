// 大本营系统（design §6.1）：三条并行成长小线（军令营 / 演武场 / 工坊）
// 原则：数值小、严格封顶、不卖数值，支撑长期局外目标

// 1. 军令营（现有 20 级）
export const CAMP_MAX_LEVEL = 20;
export const CAMP_BASE_ENERGY_MAX = 30;
export const CAMP_ENERGY_PER_LEVEL = 1;
export const CAMP_REGEN_PER_LEVEL = 0.05;

// 2. 演武场（10 级，全军攻击 +1%/级，封顶 +10%）
export const BARRACKS_MAX_LEVEL = 10;
export function barracksCost(level) {
  return 20 + (Math.max(0, level)) * 15;
}
export function barracksAtkBonus(level) {
  return Math.min(0.10, 0.01 * (level || 0));
}

// 3. 工坊（10 级，建筑生命 +2%/级，卡牌冷却 -1%/级，封顶 +20% 生命、-10% 冷却）
export const WORKSHOP_MAX_LEVEL = 10;
export function workshopCost(level) {
  return 20 + (Math.max(0, level)) * 15;
}
export function workshopBuildingHpBonus(level) {
  return Math.min(0.20, 0.02 * (level || 0));
}
export function workshopCdReduction(level) {
  return Math.min(0.10, 0.01 * (level || 0));
}

// 军需产出
export const CAMP_DAILY_SUPPLIES = 40;
export const CAMP_FIRST_CLEAR_BASE = 20;
export const CAMP_REPEAT_SUPPLIES = 5;

// 由当前等级升到下一级的花费：10、20、30 … 200
export function campCost(level) {
  return 10 * (Math.max(0, level) + 1);
}

export function campEnergyMax(level) {
  return CAMP_BASE_ENERGY_MAX + CAMP_ENERGY_PER_LEVEL * (level || 0);
}

export function campRegen(level) {
  return 1 + CAMP_REGEN_PER_LEVEL * (level || 0);
}

export function campSuppliesForWin(levelId, firstClear) {
  return firstClear ? CAMP_FIRST_CLEAR_BASE + levelId : CAMP_REPEAT_SUPPLIES;
}

// 墨阵山河 - 每日挑战系统 (Daily Challenge)
// 依据《墨阵山河_制作规划与修改方向_v1.0.md》§5.6

import { getLevel } from './levels.js?v=1.93';

export const MODIFIERS = [
  { id: 'fog', name: '大雾锁江', desc: '视野模糊，远程单位射程降低 20%', weather: 'fog' },
  { id: 'cut_supply', name: '粮道断绝', desc: '军令自然回复降低 50%，击杀敌军回令翻倍', mechanic: 'cut_supply' },
  { id: 'blood', name: '血战到底', desc: '战局残酷，双方造成伤害均提升 20%', bloodPact: true },
  { id: 'rain', name: '泥泞暴雨', desc: '暴雨如注，骑兵移速降低 15%，冲锋与火攻削弱', weather: 'rain' },
  { id: 'enemy_elite', name: '精锐压境', desc: '敌军身经百战，全军攻击力提升 20%', enemyAtkMul: 1.2 },
  { id: 'slow_march', name: '风雪迟滞', desc: '天降飞雪，全军移速降低 10%', weather: 'snow' }
];

function getStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  return { getItem: () => null, setItem: () => {} };
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export class DailyChallengeManager {
  static getTodayInfo(userMaxLevel = 40) {
    const today = getTodayString();
    const saveKey = `inkwar_daily_${today}`;
    const refreshKey = `inkwar_daily_refreshed_${today}`;
    const storage = getStorage();

    const completed = storage.getItem(saveKey) === 'true';
    const hasRefreshed = storage.getItem(refreshKey) === 'true';

    const seed = hashString(today + (hasRefreshed ? '_refresh' : ''));
    const maxL = Math.max(5, Math.min(40, userMaxLevel));
    const targetLevelId = 5 + (seed % (maxL - 4));
    
    const mod1Idx = seed % MODIFIERS.length;
    const mod2Idx = (seed + 2) % MODIFIERS.length;
    const mods = [MODIFIERS[mod1Idx], MODIFIERS[mod2Idx === mod1Idx ? (mod1Idx + 1) % MODIFIERS.length : mod2Idx]];

    return {
      date: today,
      levelId: targetLevelId,
      modifiers: mods,
      completed,
      canRefresh: !hasRefreshed,
      rewards: {
        supplies: 30,
        tokens: 10,
        fragments: 5
      }
    };
  }

  static refreshModifiers() {
    const today = getTodayString();
    getStorage().setItem(`inkwar_daily_refreshed_${today}`, 'true');
  }

  static markCompleted() {
    const today = getTodayString();
    getStorage().setItem(`inkwar_daily_${today}`, 'true');
  }

  static createBattleLevel(levelId, modifiers) {
    const base = getLevel(levelId) || getLevel(5);
    const customLevel = JSON.parse(JSON.stringify(base));
    customLevel.isDailyChallenge = true;
    customLevel.name = `【每日挑战】${base.name}`;
    customLevel.dailyModifiers = modifiers;
    
    for (const m of modifiers) {
      if (m.weather) customLevel.weather = m.weather;
      if (m.mechanic) customLevel.mechanic = m.mechanic;
      if (m.bloodPact) customLevel.bloodPact = true;
    }
    return customLevel;
  }
}

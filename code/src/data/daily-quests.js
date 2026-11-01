// 每日任务、每日首胜与每周宝箱系统（design §6.2）
// 支撑留存的长期局外循环

export const DAILY_QUEST_TEMPLATES = [
  {
    id: 'win_battle',
    name: '首战告捷',
    desc: '取得 1 场战斗胜利',
    target: 1,
    supplies: 20,
    tokens: 5,
  },
  {
    id: 'deploy_units',
    name: '调兵遣将',
    desc: '在战场部署 20 个单位',
    target: 20,
    supplies: 20,
    tokens: 5,
  },
  {
    id: 'cast_skills',
    name: '运筹帷幄',
    desc: '释放 2 次主将技能或术法',
    target: 2,
    supplies: 20,
    tokens: 5,
  },
];

export const WEEKLY_CHEST_CONFIG = {
  targetWins: 5,
  supplies: 80,
  tokens: 30,
  shards: 10,
};

export const DAILY_FIRST_WIN_TOKENS = 10;

// 获取当天日期标记 YYYY-MM-DD
export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 获取本周标记 YYYY-Wxx
export function getWeekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export function initQuestState(existing = {}) {
  const today = getTodayKey();
  const week = getWeekKey();

  let state = existing;
  if (!state || state.date !== today) {
    state = {
      date: today,
      firstWinClaimed: false,
      quests: DAILY_QUEST_TEMPLATES.map((t) => ({
        id: t.id,
        current: 0,
        claimed: false,
      })),
      weeklyWeek: state && state.weeklyWeek === week ? week : week,
      weeklyWins: state && state.weeklyWeek === week ? (state.weeklyWins || 0) : 0,
      weeklyClaimed: state && state.weeklyWeek === week ? !!state.weeklyClaimed : false,
    };
  }
  return state;
}

export function progressQuest(state, questId, amount = 1) {
  if (!state || !state.quests) return false;
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return false;
  const tpl = DAILY_QUEST_TEMPLATES.find((x) => x.id === questId);
  if (!tpl) return false;
  const prev = q.current;
  q.current = Math.min(tpl.target, q.current + amount);
  return q.current > prev;
}

export function isQuestCompleted(state, questId) {
  if (!state || !state.quests) return false;
  const q = state.quests.find((x) => x.id === questId);
  const tpl = DAILY_QUEST_TEMPLATES.find((x) => x.id === questId);
  return q && tpl && q.current >= tpl.target;
}

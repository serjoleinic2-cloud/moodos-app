// =====================================
// Neyra Medals Engine
// Логика достижений и наград
// =====================================
import { getMoodHistory, getSessionHistory, getNotesHistory } from './memory.js';
import { getResilienceIndex } from './resilience-engine.js';
import { getPatternSummary } from './pattern-engine.js';
import { getProfile } from './user-profile.js';

const MEDALS_KEY = 'neyra_medals';
const MEDALS_SHOWN_KEY = 'neyra_medals_shown';

// =====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================
// Динамический порог — после 8 достижений медали порог растёт
function getDynamicThreshold(medalId, baseThreshold) {
  try {
    const state = getMedalsState();
    const count = state[medalId]?.count || 0;
    if (count < 8) return baseThreshold;
    // После 8 достижений каждые следующие 8 увеличивают порог на 1
    const extra = Math.floor((count - 8) / 8) + 1;
    return baseThreshold + extra;
  } catch(e) { return baseThreshold; }
}

function hasStableWeekN(history, days) {
  const now = Date.now();
  const period = history.filter(e => now - e.time <= days * 86400000);
  if (period.length < Math.floor(days * 0.6)) return false;
  const avg = period.reduce((s, e) => s + e.value, 0) / period.length;
  const maxDiff = Math.max(...period.map(e => Math.abs(e.value - avg)));
  return maxDiff <= 15;
}

// =====================================
// ОПРЕДЕЛЕНИЕ ВСЕХ МЕДАЛЕЙ
// =====================================
export const MEDALS_DEFINITION = [

  // 🌅 РЕГУЛЯРНОСТЬ
  {
    id: 'first_step',
    category: 'regularity',
    emoji: '🌱',
    repeatable: false,
    checkFn: ({ moodHistory }) => moodHistory.length >= 1
  },
  {
    id: 'week_together',
    category: 'regularity',
    emoji: '📅',
    repeatable: false,
    checkFn: ({ moodHistory }) => getMaxStreak(moodHistory) >= 7
  },
  {
    id: 'month_observations',
    category: 'regularity',
    emoji: '🗓️',
    repeatable: false,
    checkFn: ({ moodHistory }) => getMaxStreak(moodHistory) >= 30
  },
  {
    id: 'loyal_course',
    category: 'regularity',
    emoji: '🏆',
    repeatable: false,
    checkFn: ({ moodHistory }) => getTotalDays(moodHistory) >= 100
  },
  {
    id: 'morning_bird',
    category: 'regularity',
    emoji: '🌄',
    repeatable: false,
    checkFn: ({ moodHistory }) =>
      moodHistory.filter(e => new Date(e.time).getHours() < 10).length >= 10
  },
  {
    id: 'night_watcher',
    category: 'regularity',
    emoji: '🌙',
    repeatable: false,
    checkFn: ({ moodHistory }) =>
      moodHistory.filter(e => new Date(e.time).getHours() >= 22).length >= 10
  },

  // 💚 НАСТРОЕНИЕ
  {
    id: 'bright_streak',
    category: 'mood',
    emoji: '☀️',
    repeatable: true,
    checkFn: ({ moodHistory }) => {
      const base = getDynamicThreshold('bright_streak', 3);
      return getGoodMoodStreak(moodHistory) >= base;
    }
  },
  {
    id: 'comeback',
    category: 'mood',
    emoji: '💪',
    repeatable: true,
    checkFn: ({ moodHistory }) => hasComeback(moodHistory)
  },
  {
    id: 'stability_week',
    category: 'mood',
    emoji: '⚖️',
    repeatable: true,
    checkFn: ({ moodHistory }) => {
      const base = getDynamicThreshold('stability_week', 7);
      return hasStableWeekN(moodHistory, base);
    }
  },
  {
    id: 'peak_form',
    category: 'mood',
    emoji: '🌟',
    repeatable: true,
    checkFn: ({ moodHistory }) => moodHistory.some(e => e.value >= 90)
  },

  // 🧘 ПРАКТИКИ
  {
    id: 'first_breath',
    category: 'practice',
    emoji: '🫁',
    repeatable: false,
    checkFn: ({ sessions }) =>
      sessions.some(s => s.type === 'breathing')
  },
  {
    id: 'breathing_habit',
    category: 'practice',
    emoji: '💨',
    repeatable: false,
    checkFn: ({ sessions }) =>
      sessions.filter(s => s.type === 'breathing').length >= 10
  },
  {
    id: 'meditation_master',
    category: 'practice',
    emoji: '🧘',
    repeatable: false,
    checkFn: ({ sessions }) =>
      sessions.filter(s => s.type === 'meditation').length >= 20
  },
  {
    id: 'full_toolkit',
    category: 'practice',
    emoji: '🎒',
    repeatable: false,
    checkFn: ({ sessions }) => {
      const types = new Set(sessions.map(s => s.type));
      return ['breathing','meditation','visual-focus','mind-dump','tap-calm','support_texts']
        .every(t => types.has(t));
    }
  },
  {
    id: 'mood_lift',
    category: 'practice',
    emoji: '🚀',
    repeatable: true,
    checkFn: ({ sessions, moodHistory }) => hasBigLift(sessions, moodHistory)
  },
  {
    id: 'evening_ritual',
    category: 'practice',
    emoji: '🌆',
    repeatable: false,
    checkFn: ({ sessions }) =>
      sessions.filter(s => new Date(s.timestamp).getHours() >= 20).length >= 7
  },

  // 📓 ОСОЗНАННОСТЬ
  {
    id: 'first_voice',
    category: 'awareness',
    emoji: '🎙️',
    repeatable: false,
    checkFn: () => {
      try {
        return (JSON.parse(localStorage.getItem('voice_history') || '[]')).length >= 1;
      } catch { return false; }
    }
  },
  {
    id: 'chronicles',
    category: 'awareness',
    emoji: '📔',
    repeatable: false,
    checkFn: ({ notes }) => notes.length >= 30
  },
  {
    id: 'trigger_detective',
    category: 'awareness',
    emoji: '🔍',
    repeatable: false,
    checkFn: ({ patterns }) =>
      patterns.noteTriggers && patterns.noteTriggers.length >= 1
  },
  {
    id: 'self_knowledge',
    category: 'awareness',
    emoji: '🧠',
    repeatable: false,
    checkFn: ({ patterns }) =>
      patterns.noteTriggers && patterns.noteTriggers.length >= 3
  },

  // 🛡️ УСТОЙЧИВОСТЬ
  {
    id: 'first_roots',
    category: 'resilience',
    emoji: '🌿',
    repeatable: false,
    checkFn: ({ resilienceIndex }) => resilienceIndex !== null && resilienceIndex >= 40
  },
  {
    id: 'strong_foundation',
    category: 'resilience',
    emoji: '🏛️',
    repeatable: false,
    checkFn: ({ resilienceIndex }) => resilienceIndex !== null && resilienceIndex >= 70
  },
  {
    id: 'unbreakable',
    category: 'resilience',
    emoji: '💎',
    repeatable: false,
    checkFn: ({ resilienceIndex }) => resilienceIndex !== null && resilienceIndex >= 90
  },
  {
    id: 'fast_recovery',
    category: 'resilience',
    emoji: '⚡',
    repeatable: true,
    checkFn: ({ moodHistory }) => hasFastRecovery(moodHistory)
  },

  // ⚡ ВЫЗОВЫ
  {
    id: 'first_challenge',
    category: 'challenges',
    emoji: '🎯',
    repeatable: false,
    checkFn: () => getChallengesCount() >= 1
  },
  {
    id: 'seven_challenges',
    category: 'challenges',
    emoji: '🔥',
    repeatable: false,
    checkFn: () => getChallengesCount() >= 7
  },
  {
    id: 'discipline',
    category: 'challenges',
    emoji: '⚔️',
    repeatable: false,
    checkFn: () => getChallengesCount() >= 30
  },

  // 💊 ОСОБЫЕ
  {
    id: 'honest_with_self',
    category: 'special',
    emoji: '💜',
    repeatable: false,
    checkFn: ({ profile }) =>
      profile && profile.takesMeds && profile.takesMeds !== 'нет' && profile.takesMeds !== 'не_скажу'
  },
  {
    id: 'adaptation_track',
    category: 'special',
    emoji: '📊',
    repeatable: false,
    checkFn: ({ moodHistory, profile }) =>
      profile && profile.takesMeds && profile.takesMeds !== 'нет' &&
      getTotalDays(moodHistory) >= 30
  },

  // 🌒 РЕДКИЕ ОСОБЫЕ
  {
    id: 'midnight_owl',
    category: 'special',
    emoji: '🌒',
    repeatable: false,
    checkFn: ({ moodHistory }) =>
      moodHistory.filter(e => new Date(e.time).getHours() === 0 ||
        new Date(e.time).getHours() === 1 ||
        new Date(e.time).getHours() === 2).length >= 20
  },
  {
    id: 'year_with_neyra',
    category: 'special',
    emoji: '📆',
    repeatable: false,
    checkFn: ({ moodHistory }) => getTotalDays(moodHistory) >= 365
  },
  {
    id: 'full_range',
    category: 'special',
    emoji: '🎭',
    repeatable: false,
    checkFn: ({ moodHistory }) => {
      const now = Date.now();
      const week = moodHistory.filter(e => now - e.time <= 7 * 86400000);
      const hasLow  = week.some(e => e.value <= 20);
      const hasHigh = week.some(e => e.value >= 80);
      return hasLow && hasHigh;
    }
  },
  {
    id: 'deep_diver',
    category: 'special',
    emoji: '🧬',
    repeatable: false,
    checkFn: ({ moodHistory, sessions, profile }) => {
      const hasProfile = profile && profile.takesMeds && profile.moodBaseline;
      const allPractices = ['breathing','meditation','visual-focus','mind-dump','tap-calm','support_texts'];
      const usedTypes = new Set(sessions.map(s => s.type));
      const hasAllPractices = allPractices.every(t => usedTypes.has(t));
      return hasProfile && hasAllPractices && getTotalDays(moodHistory) >= 50;
    }
  },

  // 🌿 ТРИГГЕРНЫЕ ВЫЗОВЫ
  {
    id: 'walker',
    category: 'triggers',
    emoji: '🚶',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('walk') >= 5
  },
  {
    id: 'athlete',
    category: 'triggers',
    emoji: '🏃',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('sport') >= 5
  },
  {
    id: 'connector',
    category: 'triggers',
    emoji: '💬',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('social') >= 5
  },
  {
    id: 'sleep_master',
    category: 'triggers',
    emoji: '😴',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('sleep') >= 5
  },
  {
    id: 'music_soul',
    category: 'triggers',
    emoji: '🎵',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('music') >= 5
  },
  {
    id: 'foodie',
    category: 'triggers',
    emoji: '🍽️',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('food') >= 5
  },
  {
    id: 'rest_guru',
    category: 'triggers',
    emoji: '🛋️',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('rest') >= 5
  },
  {
    id: 'nature_friend',
    category: 'triggers',
    emoji: '🌿',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('nature') >= 5
  },
  {
    id: 'creator',
    category: 'triggers',
    emoji: '🎨',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('creative') >= 5
  },
  {
    id: 'focused',
    category: 'triggers',
    emoji: '💼',
    repeatable: false,
    checkFn: () => getTriggerChallengeCount('work') >= 5
  },
  {
    id: 'trigger_master',
    category: 'triggers',
    emoji: '🌈',
    repeatable: false,
    checkFn: () => {
      const triggers = ['walk','sport','social','sleep','music','food','rest','nature','creative','work'];
      return triggers.every(t => getTriggerChallengeCount(t) >= 3);
    }
  },
];

// =====================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================================

function getMaxStreak(history) {
  if (!history.length) return 0;
  const days = new Set(history.map(e => new Date(e.time).toDateString()));
  const sorted = [...days].map(d => new Date(d)).sort((a, b) => a - b);
  let maxStreak = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (sorted[i] - sorted[i-1]) / 86400000;
    if (diff === 1) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 1;
  }
  return maxStreak;
}

function getTotalDays(history) {
  if (!history.length) return 0;
  return new Set(history.map(e => new Date(e.time).toDateString())).size;
}

function getGoodMoodStreak(history) {
  if (history.length < 3) return 0;
  const byDay = {};
  history.forEach(e => {
    const d = new Date(e.time).toDateString();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(e.value);
  });
  const days = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));
  let maxStreak = 0, cur = 0;
  days.forEach(d => {
    const avg = byDay[d].reduce((s, v) => s + v, 0) / byDay[d].length;
    if (avg >= 70) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  });
  return maxStreak;
}

function hasComeback(history) {
  const sorted = [...history].sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].value < 30) {
      for (let j = i + 1; j < sorted.length; j++) {
        const hours = (sorted[j].time - sorted[i].time) / 3600000;
        if (hours <= 48 && sorted[j].value >= 60) return true;
        if (hours > 48) break;
      }
    }
  }
  return false;
}

function hasStableWeek(history) {
  const now = Date.now();
  const week = history.filter(e => now - e.time <= 7 * 86400000);
  if (week.length < 4) return false;
  const avg = week.reduce((s, e) => s + e.value, 0) / week.length;
  const maxDiff = Math.max(...week.map(e => Math.abs(e.value - avg)));
  return maxDiff <= 15;
}

function hasBigLift(sessions, moodHistory) {
  for (const s of sessions) {
    if (!s.moodBefore || !s.moodAfter) continue;
    if (s.moodAfter - s.moodBefore >= 20) return true;
  }
  return false;
}

function hasFastRecovery(history) {
  const sorted = [...history].sort((a, b) => a.time - b.time);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].value < 40) {
      for (let j = i + 1; j < sorted.length; j++) {
        const hours = (sorted[j].time - sorted[i].time) / 3600000;
        if (hours <= 24 && sorted[j].value >= 55) return true;
        if (hours > 24) break;
      }
    }
  }
  return false;
}

function getChallengesCount() {
  try {
    return parseInt(localStorage.getItem('challenges_completed') || '0');
  } catch { return 0; }
}

function getTriggerChallengeCount(trigger) {
  try {
    const counts = JSON.parse(localStorage.getItem('trigger_challenges_completed') || '{}');
    return counts[trigger] || 0;
  } catch { return 0; }
}

// =====================================
// ОСНОВНЫЕ ФУНКЦИИ
// =====================================

export function getMedalsState() {
  try {
    return JSON.parse(localStorage.getItem(MEDALS_KEY) || '{}');
  } catch { return {}; }
}

function saveMedalsState(state) {
  localStorage.setItem(MEDALS_KEY, JSON.stringify(state));
}

export function getShownMedals() {
  try {
    return JSON.parse(localStorage.getItem(MEDALS_SHOWN_KEY) || '[]');
  } catch { return []; }
}

function markMedalShown(id) {
  const shown = getShownMedals();
  if (!shown.includes(id)) {
    shown.push(id);
    localStorage.setItem(MEDALS_SHOWN_KEY, JSON.stringify(shown));
  }
}

// Пересчитать все медали и вернуть новые
export function checkAndUpdateMedals() {
  const moodHistory = getMoodHistory();
  const sessions = getSessionHistory();
  const notes = getNotesHistory();
  const patterns = getPatternSummary();
  const resilienceIndex = getResilienceIndex();
  const profile = getProfile();

  const ctx = { moodHistory, sessions, notes, patterns, resilienceIndex, profile };

  const state = getMedalsState();
  const newlyEarned = [];

  MEDALS_DEFINITION.forEach(medal => {
    let earned = false;
    try { earned = medal.checkFn(ctx); } catch(e) {}

    if (earned) {
      if (medal.repeatable) {
        // Повторяемые: считаем сколько раз достигнуто
        const prev = state[medal.id] || { count: 0, earnedAt: [] };
        // Проверяем не засчитывали ли уже в этом периоде (раз в 24ч)
        const lastEarned = prev.earnedAt?.[prev.earnedAt.length - 1] || 0;
        if (Date.now() - lastEarned > 86400000) {
          state[medal.id] = {
            earned: true,
            count: (prev.count || 0) + 1,
            earnedAt: [...(prev.earnedAt || []), Date.now()]
          };
          newlyEarned.push(medal.id);
        }
      } else {
        // Одноразовые: только если ещё не было
        if (!state[medal.id]?.earned) {
          state[medal.id] = { earned: true, count: 1, earnedAt: [Date.now()] };
          newlyEarned.push(medal.id);
        }
      }
    }
  });

  saveMedalsState(state);
  return newlyEarned;
}

// Новые медали которые ещё не показали аватаром
export function getUnshownNewMedals() {
  const state = getMedalsState();
  const shown = getShownMedals();
  return MEDALS_DEFINITION
    .filter(m => state[m.id]?.earned && !shown.includes(m.id))
    .map(m => m.id);
}

export function markMedalsAsShown(ids) {
  ids.forEach(markMedalShown);
}

// Для экрана медалей
export function getAllMedalsWithState() {
  const state = getMedalsState();
  return MEDALS_DEFINITION.map(m => ({
    ...m,
    earned: !!state[m.id]?.earned,
    count: state[m.id]?.count || 0,
    earnedAt: state[m.id]?.earnedAt || []
  }));
}
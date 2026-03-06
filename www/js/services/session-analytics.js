// =====================================
// MoodOS Session Analytics
// Анализ эффективности практик
// ==================================

import { getSessionHistory } from "./memory.js";

// ---- ОБЩАЯ ЭФФЕКТИВНОСТЬ ТИПА ----
// Возвращает % сессий где result === "positive"
export function getEffectivenessRate(type) {
  const history = getSessionHistory().filter(s => s.type === type);
  if (!history.length) return null;

  const positive = history.filter(s => s.result === "positive").length;
  return Math.round((positive / history.length) * 100);
}

// ---- СРЕДНИЙ ПРИРОСТ НАСТРОЕНИЯ ----
// Среднее (moodAfter - moodBefore) по всем сессиям типа
export function getAverageMoodLift(type) {
  const history = getSessionHistory().filter(s => s.type === type);
  if (!history.length) return null;

  const lifts = history.map(s => (s.moodAfter || 0) - (s.moodBefore || 0));
  const avg = lifts.reduce((a, b) => a + b, 0) / lifts.length;
  return Math.round(avg * 10) / 10;
}

// ---- КАКИЕ СОСТОЯНИЯ ЛУЧШЕ ВСЕГО УЛУЧШАЮТСЯ ----
// Возвращает объект { STATE: { total, positive, rate } }
export function getEffectivenessByState(type) {
  const history = getSessionHistory().filter(s => s.type === type);
  if (!history.length) return {};

  const stats = {};

  history.forEach(s => {
    const state = s.stateBefore || "UNKNOWN";
    if (!stats[state]) stats[state] = { total: 0, positive: 0 };
    stats[state].total++;
    if (s.result === "positive") stats[state].positive++;
  });

  Object.keys(stats).forEach(state => {
    stats[state].rate = Math.round(
      (stats[state].positive / stats[state].total) * 100
    );
  });

  return stats;
}

// ---- ЛУЧШИЙ ИНСТРУМЕНТ для текущего состояния ----
// Принимает текущее состояние ("STRESSED", "LOW" и т.д.)
// Возвращает "breathing" | "meditation" | null
export function getBestToolForState(currentState) {
  const types = ["breathing", "meditation", "visual-focus", "mind-dump", "tap-calm"];
  let bestTool = null;
  let bestRate = -1;

  types.forEach(type => {
    const byState = getEffectivenessByState(type);
    const stateData = byState[currentState];
    if (stateData && stateData.rate > bestRate) {
      bestRate = stateData.rate;
      bestTool = type;
    }
  });

  return bestTool;
}

// ---- РЕКОМЕНДАЦИЯ для юзера ----
// Возвращает строку с советом на основе данных
export function getPersonalRecommendation(currentState) {
  const bestTool = getBestToolForState(currentState);

  const breathingRate = getEffectivenessRate("breathing");
  const meditationRate = getEffectivenessRate("meditation");
  const breathingLift = getAverageMoodLift("breathing");
  const meditationLift = getAverageMoodLift("meditation");

  // Нет данных вообще
  if (breathingRate === null && meditationRate === null) {
    return "Попробуй дыхание или медитацию — приложение научится рекомендовать лучшее для тебя.";
  }

  // Есть данные — даём рекомендацию
  if (bestTool === "breathing") {
    const label = stateLabel(currentState);
    return `При состоянии "${label}" дыхание помогало тебе в ${getEffectivenessByState("breathing")[currentState]?.rate ?? "?"}% случаев. Попробуй сейчас.`;
  }

  if (bestTool === "meditation") {
    const label = stateLabel(currentState);
    return `При состоянии "${label}" медитация помогала тебе в ${getEffectivenessByState("meditation")[currentState]?.rate ?? "?"}% случаев. Попробуй сейчас.`;
  }

  // Общая рекомендация без привязки к состоянию
  if (breathingRate !== null && meditationRate !== null) {
    if (breathingRate >= meditationRate) {
      return `Дыхание помогает тебе в ${breathingRate}% случаев — это твой лучший инструмент сейчас.`;
    } else {
      return `Медитация помогает тебе в ${meditationRate}% случаев — это твой лучший инструмент сейчас.`;
    }
  }

  return "Продолжай практики — скоро увидишь персональную статистику.";
}

// ---- СВОДНАЯ СТАТИСТИКА ----
// Возвращает объект со всей аналитикой для отчёта
export function getFullSessionStats() {
  const sessions = getSessionHistory();

  if (!sessions.length) return null;

  const breathing  = sessions.filter(s => s.type === "breathing");
  const meditation = sessions.filter(s => s.type === "meditation");

  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const minutes = Math.floor(totalDuration / 60);

  return {
    totalSessions:    sessions.length,
    breathingSessions:   breathing.length,
meditationSessions:  meditation.length,
visualFocusSessions: visualFocus.length,
mindDumpSessions:    mindDump.length,
tapCalmSessions:     tapCalm.length,
    totalMinutes:     minutes,

    breathingRate:    getEffectivenessRate("breathing"),
    meditationRate:   getEffectivenessRate("meditation"),

    breathingLift:    getAverageMoodLift("breathing"),
    meditationLift:   getAverageMoodLift("meditation"),

    breathingByState: getEffectivenessByState("breathing"),
    meditationByState: getEffectivenessByState("meditation"),
  };
}

// ---- АГРЕГАЦИЯ ПО ДНЯМ (для графика в отчёте) ----
// Возвращает массив { date, avgMoodBefore, avgMoodAfter, count }
export function getSessionsByDay(type = null) {
  let sessions = getSessionHistory();
  if (type) sessions = sessions.filter(s => s.type === type);

  const byDay = {};

  sessions.forEach(s => {
    const d = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    if (!byDay[key]) byDay[key] = { moodBefore: [], moodAfter: [], count: 0, positive: 0 };
    byDay[key].moodBefore.push(s.moodBefore || 0);
    byDay[key].moodAfter.push(s.moodAfter || 0);
    byDay[key].count++;
    if (s.result === "positive") byDay[key].positive++;
  });

  return Object.keys(byDay).sort().map(date => ({
    date,
    avgMoodBefore: Math.round(byDay[date].moodBefore.reduce((a,b)=>a+b,0) / byDay[date].count),
    avgMoodAfter:  Math.round(byDay[date].moodAfter.reduce((a,b)=>a+b,0)  / byDay[date].count),
    count:    byDay[date].count,
    positive: byDay[date].positive,
    rate:     Math.round((byDay[date].positive / byDay[date].count) * 100)
  }));
}

// ---- ВСПОМОГАТЕЛЬНАЯ ----
function stateLabel(state) {
  const labels = {
    LOW:      "Низкое настроение",
    STRESSED: "Стресс",
    NEUTRAL:  "Нейтральное",
    GOOD:     "Хорошее",
    HIGH:     "Отличное"
  };
  return labels[state] || state;
}

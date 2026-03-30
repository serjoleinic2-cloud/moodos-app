// =====================================
// MoodOS Session Analytics
// Анализ эффективности практик
// =====================================

import { getSessionHistory } from "./memory.js";
import { t } from "../i18n.js";

// ---- ВРЕМЕННЫЕ ГОРИЗОНТЫ ----
export const TIME_HORIZONS = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365
};

// ---- ПЕРИОД ФИЛЬТР ----
function _filterByDays(data, days) {
  if (!days) return data;
  const cutoff = Date.now() - days * 86400000;
  return data.filter(s => (s.timestamp || s.time || 0) >= cutoff);
}

// ---- НОРМАЛИЗАЦИЯ ТИПА ПРАКТИКИ ----
function normalizeType(type) {
  return type?.replace('_', '-').toLowerCase();
}

// ---- ФИЛЬТР ВАЛИДНЫХ ЗАПИСЕЙ ----
function getValidEntries(type) {
  const normalizedType = normalizeType(type);
  const history = getSessionHistory()
    .map(s => ({ ...s, type: normalizeType(s.type) }))
    .filter(s => s.type === normalizedType);
  return history.filter(e => e.moodBefore != null && e.moodAfter != null);
}

// ---- ПОЛУЧИТЬ ВАЛИДНЫЕ ЗАПИСИ ЗА ПЕРИОД ----
function getValidEntriesForPeriod(type, days) {
  const validEntries = getValidEntries(type);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return validEntries.filter(e => (e.timestamp || e.time) >= cutoff);
}

// ---- ОБЩАЯ ЭФФЕКТИВНОСТЬ ТИПА ----
export function getEffectivenessRate(type, days = null) {
  const sessions = _filterByDays(getSessionHistory(), days);
  const normalizedType = normalizeType(type);
  const validEntries = sessions
    .map(s => ({ ...s, type: normalizeType(s.type) }))
    .filter(s => s.type === normalizedType)
    .filter(e => e.moodBefore != null && e.moodAfter != null);
  if (!validEntries.length) return null;
  const positive = validEntries.filter(s => s.result === "positive").length;
  return Math.round((positive / validEntries.length) * 100);
}

// ---- СРЕДНИЙ ПРИРОСТ НАСТРОЕНИЯ ----
export function getAverageMoodLift(type, days = null) {
  const sessions = _filterByDays(getSessionHistory(), days);
  const normalizedType = normalizeType(type);
  const validEntries = sessions
    .map(s => ({ ...s, type: normalizeType(s.type) }))
    .filter(s => s.type === normalizedType)
    .filter(e => e.moodBefore != null && e.moodAfter != null);
  if (!validEntries.length) return null;
  const lifts = validEntries.map(s => s.moodAfter - s.moodBefore);
  const avg = lifts.reduce((a, b) => a + b, 0) / lifts.length;
  return Math.round(avg * 10) / 10;
}

// ---- КОЛИЧЕСТВО ЭФФЕКТИВНЫХ СЕССИЙ ----
export function getEffectiveSessionCount(type) {
  const validEntries = getValidEntries(type);
  return validEntries.length;
}

// ---- КАКИЕ СОСТОЯНИЯ ЛУЧШЕ ВСЕГО УЛУЧШАЮТСЯ ----
export function getEffectivenessByState(type, days = null) {
  const sessions = _filterByDays(getSessionHistory(), days);
  const normalizedType = normalizeType(type);
  const validEntries = sessions
    .map(s => ({ ...s, type: normalizeType(s.type) }))
    .filter(s => s.type === normalizedType)
    .filter(e => e.moodBefore != null && e.moodAfter != null);
  if (!validEntries.length) return {};

  const stats = {};
  validEntries.forEach(s => {
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
export function getBestToolForState(currentState) {
  // ✅ ИСПРАВЛЕНИЕ: добавлен "support_texts"
  const types = ["breathing", "meditation", "visual-focus", "mind-dump", "tap-calm", "support_texts"];

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
export function getPersonalRecommendation(currentState) {
  const bestTool = getBestToolForState(currentState);
  const breathingRate   = getEffectivenessRate("breathing");
  const meditationRate  = getEffectivenessRate("meditation");

  const toolNames = {
    "breathing":      t("tools_breathing").replace(/^[^\s]+\s/, ""),
    "meditation":     t("tools_meditation").replace(/^[^\s]+\s/, ""),
    "visual-focus":   t("tools_visual").replace(/^[^\s]+\s/, ""),
    "mind-dump":      t("tools_mind").replace(/^[^\s]+\s/, ""),
    "tap-calm":       t("tools_tap").replace(/^[^\s]+\s/, ""),
    // ✅ ИСПРАВЛЕНИЕ: добавлено имя для support_texts
    "support_texts":  t("support_texts_title").replace(/^[^\s]+\s/, ""),
  };

  if (breathingRate === null && meditationRate === null) {
    return t("rec_no_data");
  }

  if (bestTool) {
    const label    = stateLabel(currentState);
    const toolName = toolNames[bestTool] || bestTool;
    const byState  = getEffectivenessByState(bestTool);
    const rate     = byState[currentState]?.rate ?? "?";
    return t("rec_best_tool")
      .replace("{state}", label)
      .replace("{tool}", toolName)
      .replace("{rate}", rate);
  }

  if (breathingRate !== null && meditationRate !== null) {
    if (breathingRate >= meditationRate) {
      return t("rec_breathing").replace("{rate}", breathingRate);
    } else {
      return t("rec_meditation").replace("{rate}", meditationRate);
    }
  }

  return t("rec_keep_going");
}

// ---- СВОДНАЯ СТАТИСТИКА ----
export function getFullSessionStats() {
  const sessions = getSessionHistory();
  if (!sessions.length) return null;

  const breathing    = sessions.filter(s => normalizeType(s.type) === "breathing");
  const meditation   = sessions.filter(s => normalizeType(s.type) === "meditation");
  const visualFocus  = sessions.filter(s => normalizeType(s.type) === "visual-focus");
  const mindDump     = sessions.filter(s => normalizeType(s.type) === "mind-dump");
  const tapCalm      = sessions.filter(s => normalizeType(s.type) === "tap-calm");
  const supportTexts = sessions.filter(s => normalizeType(s.type) === "support-texts" || normalizeType(s.type) === "support_texts");

  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const minutes = Math.floor(totalDuration / 60);

  return {
    totalSessions:          sessions.length,
    breathingSessions:       breathing.length,
    meditationSessions:      meditation.length,
    visualFocusSessions:     visualFocus.length,
    mindDumpSessions:        mindDump.length,
    tapCalmSessions:         tapCalm.length,
    supportTextsSessions:    supportTexts.length,
    breathingEffective:     getEffectiveSessionCount("breathing"),
    meditationEffective:     getEffectiveSessionCount("meditation"),
    visualFocusEffective:    getEffectiveSessionCount("visual-focus"),
    mindDumpEffective:      getEffectiveSessionCount("mind-dump"),
    tapCalmEffective:       getEffectiveSessionCount("tap-calm"),
    supportTextsEffective:  getEffectiveSessionCount("support_texts"),
    totalMinutes:           minutes,
    breathingRate:          getEffectivenessRate("breathing"),
    meditationRate:         getEffectivenessRate("meditation"),
    visualFocusRate:        getEffectivenessRate("visual-focus"),
    mindDumpRate:           getEffectivenessRate("mind-dump"),
    tapCalmRate:            getEffectivenessRate("tap-calm"),
    supportTextsRate:       getEffectivenessRate("support_texts"),
    breathingLift:          getAverageMoodLift("breathing"),
    meditationLift:         getAverageMoodLift("meditation"),
    visualFocusLift:        getAverageMoodLift("visual-focus"),
    mindDumpLift:           getAverageMoodLift("mind-dump"),
    tapCalmLift:            getAverageMoodLift("tap-calm"),
    supportTextsLift:       getAverageMoodLift("support_texts"),
    breathingByState:       getEffectivenessByState("breathing"),
    meditationByState:      getEffectivenessByState("meditation"),
  };
}

// ---- АГРЕГАЦИЯ ПО ДНЯМ ----
export function getSessionsByDay(type = null) {
  let sessions = getSessionHistory().map(s => ({ ...s, type: normalizeType(s.type) }));
  if (type) sessions = sessions.filter(s => s.type === normalizeType(type));
  const validSessions = sessions.filter(s => s.moodBefore != null && s.moodAfter != null);

  const byDay = {};
  validSessions.forEach(s => {
    const d   = new Date(s.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = { moodBefore: [], moodAfter: [], count: 0, positive: 0 };
    byDay[key].moodBefore.push(s.moodBefore);
    byDay[key].moodAfter.push(s.moodAfter);
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
  const map = {
    LOW:      t("state_low"),
    STRESSED: t("state_stressed"),
    NEUTRAL:  t("state_neutral"),
    GOOD:     t("state_good"),
    HIGH:     t("state_high"),
  };
  return map[state] || state;
}

// ---- ПОЛУЧИТЬ BASELINE ДЛЯ ТИПА ПРАКТИКИ ----
export function getUserBaseline(practiceType, days = 30) {
  const entries = getValidEntriesForPeriod(practiceType, days);
  
  if (entries.length === 0) {
    return {
      avgLift: null,
      avgEffectiveness: null,
      sessionCount: 0
    };
  }
  
  const lifts = entries.map(e => e.moodAfter - e.moodBefore);
  const avgLift = Math.round((lifts.reduce((a, b) => a + b, 0) / lifts.length) * 10) / 10;
  
  const positive = entries.filter(e => e.result === "positive").length;
  const avgEffectiveness = Math.round((positive / entries.length) * 100);
  
  return {
    avgLift,
    avgEffectiveness,
    sessionCount: entries.length
  };
}

// ---- ПОЛУЧИТЬ BASELINE ДЛЯ ВСЕХ ПРАКТИК ----
export function getAllBaselines(days = 30) {
  const types = ["breathing", "meditation", "visual-focus", "mind-dump", "tap-calm", "support_texts"];
  const baselines = {};
  
  types.forEach(type => {
    baselines[type] = getUserBaseline(type, days);
  });
  
  return baselines;
}

// ---- СРАВНИТЬ С BASELINE ----
export function compareToBaseline(current, baseline) {
  if (!baseline || baseline.sessionCount === 0) {
    return {
      liftDelta: null,
      effectivenessDelta: null,
      trend: null
    };
  }
  
  const liftDelta = current.avgLift !== null && baseline.avgLift !== null
    ? Math.round((current.avgLift - baseline.avgLift) * 10) / 10
    : null;
    
  const effectivenessDelta = current.avgEffectiveness !== null && baseline.avgEffectiveness !== null
    ? Math.round(current.avgEffectiveness - baseline.avgEffectiveness)
    : null;
  
  let trend = "stable";
  if (liftDelta !== null && liftDelta > 2) trend = "improving";
  else if (liftDelta !== null && liftDelta < -2) trend = "declining";
  
  return {
    liftDelta,
    effectivenessDelta,
    trend
  };
}

// ---- ПОЛУЧИТЬ СРАВНЕНИЕ ДЛЯ PRACTICE ----
export function getPracticeComparison(practiceType, periodDays = 30) {
  const baseline = getUserBaseline(practiceType, periodDays);
  const currentWeek = getUserBaseline(practiceType, 7);
  
  return {
    baseline,
    current: currentWeek,
    comparison: compareToBaseline(currentWeek, baseline)
  };
}

// =====================================
// MoodOS Session Analytics
// Анализ эффективности практик
// =====================================

import { getSessionHistory } from "./memory.js";
import { t } from "../i18n.js";

// ---- ОБЩАЯ ЭФФЕКТИВНОСТЬ ТИПА ----
export function getEffectivenessRate(type) {
  const history = getSessionHistory().filter(s => s.type === type);
  if (!history.length) return null;
  const positive = history.filter(s => s.result === "positive").length;
  return Math.round((positive / history.length) * 100);
}

// ---- СРЕДНИЙ ПРИРОСТ НАСТРОЕНИЯ ----
export function getAverageMoodLift(type) {
  const history = getSessionHistory().filter(s => s.type === type);
  if (!history.length) return null;
  const lifts = history.map(s => (s.moodAfter || 0) - (s.moodBefore || 0));
  const avg = lifts.reduce((a, b) => a + b, 0) / lifts.length;
  return Math.round(avg * 10) / 10;
}

// ---- КАКИЕ СОСТОЯНИЯ ЛУЧШЕ ВСЕГО УЛУЧШАЮТСЯ ----
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
export function getPersonalRecommendation(currentState) {
  const bestTool = getBestToolForState(currentState);
  const breathingRate   = getEffectivenessRate("breathing");
  const meditationRate  = getEffectivenessRate("meditation");

  const toolNames = {
    "breathing":     t("tools_breathing").replace(/^[^\s]+\s/, ""),
    "meditation":    t("tools_meditation").replace(/^[^\s]+\s/, ""),
    "visual-focus":  t("tools_visual").replace(/^[^\s]+\s/, ""),
    "mind-dump":     t("tools_mind").replace(/^[^\s]+\s/, ""),
    "tap-calm":      t("tools_tap").replace(/^[^\s]+\s/, ""),
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

  const breathing   = sessions.filter(s => s.type === "breathing");
  const meditation  = sessions.filter(s => s.type === "meditation");
  const visualFocus = sessions.filter(s => s.type === "visual-focus");
  const mindDump    = sessions.filter(s => s.type === "mind-dump");
  const tapCalm     = sessions.filter(s => s.type === "tap-calm");

  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const minutes = Math.floor(totalDuration / 60);

  return {
    totalSessions:       sessions.length,
    breathingSessions:   breathing.length,
    meditationSessions:  meditation.length,
    visualFocusSessions: visualFocus.length,
    mindDumpSessions:    mindDump.length,
    tapCalmSessions:     tapCalm.length,
    totalMinutes:        minutes,
    breathingRate:       getEffectivenessRate("breathing"),
    meditationRate:      getEffectivenessRate("meditation"),
    visualFocusRate:     getEffectivenessRate("visual-focus"),
    mindDumpRate:        getEffectivenessRate("mind-dump"),
    tapCalmRate:         getEffectivenessRate("tap-calm"),
    breathingLift:       getAverageMoodLift("breathing"),
    meditationLift:      getAverageMoodLift("meditation"),
    visualFocusLift:     getAverageMoodLift("visual-focus"),
    mindDumpLift:        getAverageMoodLift("mind-dump"),
    tapCalmLift:         getAverageMoodLift("tap-calm"),
    breathingByState:    getEffectivenessByState("breathing"),
    meditationByState:   getEffectivenessByState("meditation"),
  };
}

// ---- АГРЕГАЦИЯ ПО ДНЯМ ----
export function getSessionsByDay(type = null) {
  let sessions = getSessionHistory();
  if (type) sessions = sessions.filter(s => s.type === type);

  const byDay = {};
  sessions.forEach(s => {
    const d   = new Date(s.timestamp);
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
  const map = {
    LOW:      t("state_low"),
    STRESSED: t("state_stressed"),
    NEUTRAL:  t("state_neutral"),
    GOOD:     t("state_good"),
    HIGH:     t("state_high"),
  };
  return map[state] || state;
}
```

И нужно добавить 4 новых ключа в `i18n.js` — во все 4 языка. Вот что добавить после `no_sessions` в каждом языке:

**ru:**
```
rec_no_data: "Попробуй дыхание или медитацию — приложение научится рекомендовать лучшее для тебя.",
rec_best_tool: 'При состоянии "{state}" {tool} помогало тебе в {rate}% случаев. Попробуй сейчас.',
rec_breathing: "Дыхание помогает тебе в {rate}% случаев — это твой лучший инструмент сейчас.",
rec_meditation: "Медитация помогает тебе в {rate}% случаев — это твой лучший инструмент сейчас.",
rec_keep_going: "Продолжай практики — скоро увидишь персональную статистику.",
```

**en:**
```
rec_no_data: "Try breathing or meditation — the app will learn to recommend what's best for you.",
rec_best_tool: 'When feeling "{state}", {tool} helped you in {rate}% of cases. Try it now.',
rec_breathing: "Breathing helps you in {rate}% of cases — it's your best tool right now.",
rec_meditation: "Meditation helps you in {rate}% of cases — it's your best tool right now.",
rec_keep_going: "Keep practicing — your personal stats will appear soon.",
```

**es:**
```
rec_no_data: "Prueba respiración o meditación — la app aprenderá a recomendarte lo mejor.",
rec_best_tool: 'Con estado "{state}", {tool} te ayudó en el {rate}% de los casos. Pruébalo ahora.',
rec_breathing: "La respiración te ayuda en el {rate}% de los casos — es tu mejor herramienta ahora.",
rec_meditation: "La meditación te ayuda en el {rate}% de los casos — es tu mejor herramienta ahora.",
rec_keep_going: "Sigue practicando — pronto verás tu estadística personal.",
```

**uk:**
```
rec_no_data: "Спробуй дихання або медитацію — застосунок навчиться рекомендувати найкраще для тебе.",
rec_best_tool: 'При стані "{state}" {tool} допомагало тобі в {rate}% випадків. Спробуй зараз.',
rec_breathing: "Дихання допомагає тобі в {rate}% випадків — це твій найкращий інструмент зараз.",
rec_meditation: "Медитація допомагає тобі в {rate}% випадків — це твій найкращий інструмент зараз.",
rec_keep_going: "Продовжуй практики — незабаром побачиш персональну статистику.",
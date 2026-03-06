// ===============================
// MoodOS Insight Engine
// Человеческие объяснения состояния и прогнозы
// ===============================
import { getMoodHistory, getSessionHistory } from "./memory.js";
import { getPatternSummary, hasEveningDip } from "./pattern-engine.js";
import { getResilienceSummary, getResilienceTrend } from "./resilience-engine.js";
import { getBestToolForState, getPersonalRecommendation } from "./session-analytics.js";

// ---- ОБЪЯСНЕНИЕ ТЕКУЩЕГО СОСТОЯНИЯ ----
// Возвращает массив вероятных причин состояния
export function explainCurrentState(currentMood) {
  const history  = getMoodHistory();
  const reasons  = [];

  if (history.length < 3) return ["Недостаточно данных для анализа."];

  const sorted  = [...history].sort((a, b) => b.time - a.time);
  const recent  = sorted.slice(0, 5);
  const avgRecent = recent.reduce((s, e) => s + e.value, 0) / recent.length;

  // Падение относительно недавних записей
  if (currentMood < avgRecent - 15) {
    reasons.push("Резкое снижение относительно последних дней");
  }

  // Вечернее время
  const hour = new Date().getHours();
  if (hour >= 18 && currentMood < 50) {
    if (hasEveningDip()) {
      reasons.push("Вечернее снижение — это твоя обычная закономерность");
    } else {
      reasons.push("Вечернее время — уровень энергии естественно снижается");
    }
  }

  // Накопленная усталость (3+ дня ниже 50)
  const lastThreeDays = sorted.filter(e =>
    Date.now() - e.time < 3 * 24 * 3600000
  );
  if (lastThreeDays.length >= 3) {
    const avgThree = lastThreeDays.reduce((s, e) => s + e.value, 0) / lastThreeDays.length;
    if (avgThree < 50) {
      reasons.push("Накопленная усталость за последние дни");
    }
  }

  // Нет практик больше 3 дней
  const sessions = getSessionHistory();
  const lastSession = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!lastSession || Date.now() - lastSession.timestamp > 3 * 24 * 3600000) {
    reasons.push("Давно не было восстановительных практик");
  }

  if (!reasons.length) {
    if (currentMood >= 60) {
      reasons.push("Состояние выглядит стабильным");
    } else {
      reasons.push("Обычные колебания настроения");
    }
  }

  return reasons;
}

// ---- ПРОГНОЗ НА СЕГОДНЯ ----
// Возвращает текстовый прогноз на основе паттернов
export function getTodayForecast() {
  const history = getMoodHistory();
  if (history.length < 7) return null;

  const patterns = getPatternSummary();
  const now      = new Date();
  const today    = now.getDay();
  const hour     = now.getHours();

  const lines = [];

  // По дню недели
  if (patterns.bestDay !== null) {
    const dayNames = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    if (patterns.bestDay === today) {
      lines.push(`${dayNames[today]} обычно твой хороший день`);
    }
  }

  // По паттерну вечернего падения
  if (patterns.eveningDip && hour < 17) {
    lines.push("Вечером возможно снижение — запланируй практику после 17:00");
  }

  // По лучшему часу
  if (patterns.bestHour !== null) {
    if (Math.abs(patterns.bestHour - hour) <= 1) {
      lines.push(`Сейчас твоё обычное пиковое время (около ${patterns.bestHour}:00)`);
    }
  }

  // Последние 3 дня ниже среднего
  const sorted = [...history].sort((a, b) => b.time - a.time);
  const recent3 = sorted.filter(e => Date.now() - e.time < 3 * 24 * 3600000);
  if (recent3.length >= 2) {
    const avg3 = recent3.reduce((s, e) => s + e.value, 0) / recent3.length;
    const globalAvg = history.reduce((s, e) => s + e.value, 0) / history.length;
    if (avg3 < globalAvg - 10) {
      lines.push("Последние дни сложнее обычного — продолжай наблюдать за собой");
    }
  }

  if (!lines.length) return "День выглядит обычным по твоей истории.";
  return lines.join(". ") + ".";
}

// ---- ЭМОЦИОНАЛЬНАЯ АМНЕЗИЯ ----
// Напоминает о похожем состоянии в прошлом и восстановлении
export function getAmnesiaReminder(currentMood) {
  const history = getMoodHistory();
  if (history.length < 14) return null;

  const sorted   = [...history].sort((a, b) => a.time - b.time);
  const now      = Date.now();
  const oneMonth = 30 * 24 * 3600000;

  // Ищем похожее состояние в прошлом (более месяца назад)
  const similar = sorted.filter(e =>
    Math.abs(e.value - currentMood) <= 10 &&
    now - e.time > oneMonth
  );

  if (!similar.length) return null;

  const pastEntry = similar[similar.length - 1]; // самое свежее из старых

  // Проверяем, было ли восстановление после
  const afterPast = sorted.filter(e =>
    e.time > pastEntry.time &&
    e.time < pastEntry.time + 14 * 24 * 3600000 &&
    e.value > pastEntry.value + 15
  );

  if (!afterPast.length) return null;

  const daysAgo = Math.round((now - pastEntry.time) / (24 * 3600000));
  const daysToRecover = Math.round(
    (afterPast[0].time - pastEntry.time) / (24 * 3600000)
  );

  return {
    daysAgo,
    daysToRecover,
    pastMood:     pastEntry.value,
    recoveredTo:  afterPast[0].value
  };
}

// ---- МИКРО-ПРИВЫЧКИ ----
// Персональные рекомендации на основе данных
export function getMicroHabit(currentState) {
  const patterns  = getPatternSummary();
  const sessions  = getSessionHistory();

  const habits = [];

  // Лучший инструмент
  const bestTool = getBestToolForState(currentState);
  if (bestTool) {
    const toolNames = {
      breathing:     "дыхательную практику",
      meditation:    "медитацию",
      "visual-focus": "зрительный якорь",
      "mind-dump":   "выгрузку мыслей",
      "tap-calm":    "тактильную разрядку"
    };
    habits.push(`Попробуй ${toolNames[bestTool] || bestTool} — она лучше всего работает для тебя в этом состоянии`);
  }

  // Лучшее время практики
  if (patterns.bestBreathTime) {
    habits.push(`Дыхание лучше работает у тебя ${patterns.bestBreathTime}`);
  }

  // Вечернее падение
  const hour = new Date().getHours();
  if (patterns.eveningDip && hour >= 15 && hour <= 17) {
    habits.push("Сейчас хороший момент для короткой практики — до вечернего снижения");
  }

  return habits.length ? habits[0] : getPersonalRecommendation(currentState);
}

// ---- ПОЛНЫЙ ИНСАЙТ ----
export function getFullInsight(currentMood, currentState) {
  const resilience = getResilienceSummary();
  const trend      = getResilienceTrend();

  return {
    reasons:       explainCurrentState(currentMood),
    forecast:      getTodayForecast(),
    amnesia:       getAmnesiaReminder(currentMood),
    microHabit:    getMicroHabit(currentState),
    resilience,
    trendDirection: trend ? trend.direction : "stable"
  };
}

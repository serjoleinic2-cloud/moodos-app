// ===============================
// MoodOS Resilience Engine
// Индекс эмоциональной устойчивости
// ===============================
import { getMoodHistory, getSessionHistory } from "./memory.js";

// ---- СКОРОСТЬ ВОССТАНОВЛЕНИЯ ----
// Как быстро настроение поднимается после падения
// Возвращает среднее кол-во часов на восстановление (или null)
export function getRecoverySpeed() {
  const history = getMoodHistory();
  if (history.length < 10) return null;

  const sorted   = [...history].sort((a, b) => a.time - b.time);
  let recoveries = [];
  let i = 0;

  while (i < sorted.length - 1) {
    const entry = sorted[i];
    // Ищем падение (ниже 40)
    if (entry.value < 40) {
      // Ищем следующее восстановление (выше 55)
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].value >= 55) {
          const hours = (sorted[j].time - entry.time) / 3600000;
          if (hours <= 72) { // только если восстановление в рамках 3 дней
            recoveries.push(hours);
          }
          i = j;
          break;
        }
      }
    }
    i++;
  }

  if (!recoveries.length) return null;
  const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length;
  return Math.round(avg * 10) / 10;
}

// ---- СТАБИЛЬНОСТЬ ----
// Среднеквадратичное отклонение за последние 14 дней
// Чем ниже — тем стабильнее
export function getMoodStability() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const now      = Date.now();
  const two_weeks = 14 * 24 * 3600000;
  const recent   = history.filter(e => now - e.time <= two_weeks);

  if (recent.length < 4) return null;

  const avg = recent.reduce((s, e) => s + e.value, 0) / recent.length;
  const variance = recent.reduce((s, e) => s + Math.pow(e.value - avg, 2), 0) / recent.length;
  const stdDev   = Math.sqrt(variance);

  // Инвертируем: низкое stdDev = высокая стабильность
  // stdDev 0 = 100%, stdDev 30+ = 0%
  const stability = Math.max(0, Math.round(100 - (stdDev / 30) * 100));
  return stability;
}

// ---- ВОЛАТИЛЬНОСТЬ ----
// Средний перепад между соседними записями
export function getMoodVolatility() {
  const history = getMoodHistory();
  if (history.length < 3) return null;

  const sorted = [...history].sort((a, b) => a.time - b.time);
  let totalDiff = 0;

  for (let i = 1; i < sorted.length; i++) {
    totalDiff += Math.abs(sorted[i].value - sorted[i - 1].value);
  }

  return Math.round((totalDiff / (sorted.length - 1)) * 10) / 10;
}

// ---- ДИНАМИКА УСТОЙЧИВОСТИ ----
// Сравнивает стабильность первой и второй половины истории
// Возвращает: { change: число, direction: "up"|"down"|"stable" }
export function getResilienceTrend() {
  const history = getMoodHistory();
  if (history.length < 10) return null;

  const sorted = [...history].sort((a, b) => a.time - b.time);
  const half   = Math.floor(sorted.length / 2);
  const first  = sorted.slice(0, half);
  const second = sorted.slice(half);

  function stdDev(arr) {
    const avg = arr.reduce((s, e) => s + e.value, 0) / arr.length;
    const variance = arr.reduce((s, e) => s + Math.pow(e.value - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  const sd1 = stdDev(first);
  const sd2 = stdDev(second);

  // Меньше stdDev = лучше = рост устойчивости
  const change = Math.round((sd1 - sd2) / sd1 * 100);

  return {
    change,
    direction: change > 5 ? "up" : change < -5 ? "down" : "stable"
  };
}

// ---- ИНДЕКС УСТОЙЧИВОСТИ ----
// Итоговый балл 0–100 на основе всех метрик
export function getResilienceIndex() {
  const stability  = getMoodStability();
  const trend      = getResilienceTrend();
  const recovery   = getRecoverySpeed();
  const sessions   = getSessionHistory();

  if (stability === null) return null;

  let score = stability; // база — стабильность

  // Бонус за активное использование практик
  const recentSessions = sessions.filter(s =>
    Date.now() - s.timestamp < 14 * 24 * 3600000
  );
  if (recentSessions.length >= 3)  score += 5;
  if (recentSessions.length >= 7)  score += 5;
  if (recentSessions.length >= 14) score += 5;

  // Бонус за позитивный тренд
  if (trend && trend.direction === "up") score += 10;

  // Бонус за быстрое восстановление (< 12 часов)
  if (recovery !== null && recovery < 12) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---- ТЕКСТОВЫЙ ВЫВОД ----
export function getResilienceLabel(index) {
  if (index === null) return "Недостаточно данных";
  if (index >= 80) return "Высокая устойчивость";
  if (index >= 60) return "Хорошая устойчивость";
  if (index >= 40) return "Умеренная устойчивость";
  return "Формируется";
}

// ---- СВОДКА ----
export function getResilienceSummary() {
  const index    = getResilienceIndex();
  const trend    = getResilienceTrend();
  const recovery = getRecoverySpeed();

  return {
    index,
    label:     getResilienceLabel(index),
    trend,
    recovery,
    stability: getMoodStability(),
    volatility: getMoodVolatility()
  };
}

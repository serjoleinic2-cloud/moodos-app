// ===============================
// MoodOS Resilience Engine
// Индекс эмоциональной устойчивости
// ===============================
import { getMoodHistory, getSessionHistory } from "./memory.js";

// ---- СКОРОСТЬ ВОССТАНОВЛЕНИЯ ----
export function getRecoverySpeed() {
  const history = getMoodHistory();
  if (history.length < 10) return null;

  const sorted = [...history].sort((a, b) => a.time - b.time);
  let recoveries = [];
  let i = 0;

  while (i < sorted.length - 1) {
    if (sorted[i].value < 40) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].value >= 55) {
          const hours = (sorted[j].time - sorted[i].time) / 3600000;
          if (hours <= 72) recoveries.push(hours);
          i = j;
          break;
        }
      }
    }
    i++;
  }

  if (!recoveries.length) return null;
  return Math.round(recoveries.reduce((a, b) => a + b, 0) / recoveries.length * 10) / 10;
}

// ---- СТАБИЛЬНОСТЬ (14 дней) ----
export function getMoodStability() {
  const history = getMoodHistory();
  if (history.length < 5) return null;

  const recent = history.filter(e => Date.now() - e.time <= 14 * 24 * 3600000);
  if (recent.length < 4) return null;

  const avg      = recent.reduce((s, e) => s + e.value, 0) / recent.length;
  const variance = recent.reduce((s, e) => s + Math.pow(e.value - avg, 2), 0) / recent.length;
  return Math.max(0, Math.round(100 - (Math.sqrt(variance) / 30) * 100));
}

// ---- ВОЛАТИЛЬНОСТЬ ----
export function getMoodVolatility() {
  const history = getMoodHistory();
  if (history.length < 3) return null;

  const sorted = [...history].sort((a, b) => a.time - b.time);
  let totalDiff = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalDiff += Math.abs(sorted[i].value - sorted[i - 1].value);
  }
  return Math.round(totalDiff / (sorted.length - 1) * 10) / 10;
}

// ---- ДИНАМИКА УСТОЙЧИВОСТИ ----
export function getResilienceTrend() {
  const history = getMoodHistory();
  if (history.length < 10) return null;

  const sorted = [...history].sort((a, b) => a.time - b.time);
  const half   = Math.floor(sorted.length / 2);

  function stdDev(arr) {
    const avg = arr.reduce((s, e) => s + e.value, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, e) => s + Math.pow(e.value - avg, 2), 0) / arr.length);
  }

  const sd1    = stdDev(sorted.slice(0, half));
  const sd2    = stdDev(sorted.slice(half));
  const change = Math.round((sd1 - sd2) / sd1 * 100);

  return {
    change,
    direction: change > 5 ? "up" : change < -5 ? "down" : "stable"
  };
}

// ---- ИНДЕКС УСТОЙЧИВОСТИ 0–100 ----
export function getResilienceIndex() {
  const stability = getMoodStability();
  const trend     = getResilienceTrend();
  const recovery  = getRecoverySpeed();
  const sessions  = getSessionHistory();

  if (stability === null) return null;

  let score = stability;

  const recentSessions = sessions.filter(s => Date.now() - s.timestamp < 14 * 24 * 3600000);
  if (recentSessions.length >= 3)  score += 5;
  if (recentSessions.length >= 7)  score += 5;
  if (recentSessions.length >= 14) score += 5;

  if (trend?.direction === "up")         score += 10;
  if (recovery !== null && recovery < 12) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---- ТЕКСТОВЫЙ УРОВЕНЬ ----
export function getResilienceLabel(index) {
  if (index === null)  return "Недостаточно данных";
  if (index >= 80)     return "Высокая устойчивость";
  if (index >= 60)     return "Хорошая устойчивость";
  if (index >= 40)     return "Умеренная устойчивость";
  return "Формируется";
}

// ---- СВОДКА ----
export function getResilienceSummary() {
  const index = getResilienceIndex();
  return {
    index,
    label:      getResilienceLabel(index),
    trend:      getResilienceTrend(),
    recovery:   getRecoverySpeed(),
    stability:  getMoodStability(),
    volatility: getMoodVolatility()
  };
}
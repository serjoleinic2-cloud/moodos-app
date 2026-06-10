// ⚠️ Использовать только через SystemCore
// ===============================
// Neyra Resilience Engine
// Индекс эмоциональной устойчивости
// ===============================
import { getMoodHistory, getSessionHistory } from "./memory.js";
import { t } from "../i18n.js";

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

  const values = recent.map(e => e.value).sort((a, b) => a - b);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const sd  = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length);

  const filtered = values.filter(v => Math.abs(v - avg) <= sd * 1.5);
  if (filtered.length < 3) return null;

  const filteredAvg = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  const filteredSd  = Math.sqrt(filtered.reduce((s, v) => s + Math.pow(v - filteredAvg, 2), 0) / filtered.length);

  const stability = Math.max(0, Math.round(100 - (filteredSd / 20) * 100));

  return stability;
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
  if (sd1 === 0) return { change: 0, direction: 'stable' };
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
  const history   = getMoodHistory();

  if (stability === null) return null;

  let score = stability;

  const recentSessions = sessions.filter(s => Date.now() - (s.timestamp || s.time || 0) < 14 * 24 * 3600000);
  if (recentSessions.length >= 3)  score += 5;
  if (recentSessions.length >= 7)  score += 5;
  if (recentSessions.length >= 14) score += 5;

  if (trend?.direction === "up") score += 8;

  if (recovery !== null && recovery < 12) score += 8;

  const recent14 = history.filter(e => Date.now() - e.time <= 14 * 24 * 3600000);
  if (recent14.length >= 5) {
    const avg14 = recent14.reduce((s, e) => s + e.value, 0) / recent14.length;
    const lowCount = recent14.filter(e => e.value < 40).length;
    const lowRatio = lowCount / recent14.length;

    if (avg14 >= 70 && lowRatio < 0.2) score += 10;
    else if (avg14 >= 60 && lowRatio < 0.15) score += 5;

    if (lowCount > 0 && avg14 >= 65 && lowRatio < 0.3) score += 5;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ---- ТЕКСТОВЫЙ УРОВЕНЬ ----
export function getResilienceLabel(index) {
  if (index === null)  return t("resilience_label_no_data") || "Not enough data";
  if (index >= 80)     return t("resilience_label_high") || "High resilience";
  if (index >= 60)     return t("resilience_label_good") || "Good resilience";
  if (index >= 40)     return t("resilience_label_moderate") || "Moderate resilience";
  return t("resilience_label_forming") || "Forming";
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

export async function evaluate(currentState) {
  return {
    index: getResilienceIndex(),
    summary: getResilienceSummary()
  }
}
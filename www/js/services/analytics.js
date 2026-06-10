// =====================================
// Neyra Analytics Service
// =====================================
import { t } from "../i18n.js";

export function calculateStabilityScore(history) {
  if (!history || history.length === 0) return null;
  const avg = history.reduce((s, h) => s + h.value, 0) / history.length;
  const variance = history.reduce((s, h) => s + Math.pow(h.value - avg, 2), 0) / history.length;
  let stability = 100 - Math.sqrt(variance);
  stability = Math.max(5, Math.min(100, stability));
  return Math.round(stability);
}

export function calculateTrend(history) {
  if (!history || history.length < 6) return "learning";

  // Берём по 5 записей для сглаживания случайных выбросов
  const recentSlice   = history.slice(-5);
  const previousSlice = history.slice(-10, -5);
  if (previousSlice.length < 3) return "learning";

  const recent   = recentSlice.reduce((s, h) => s + h.value, 0) / recentSlice.length;
  const previous = previousSlice.reduce((s, h) => s + h.value, 0) / previousSlice.length;

  // Порог ±7 — игнорируем мелкие колебания
  if (recent > previous + 7) return "improving";
  if (recent < previous - 7) return "declining";
  return "stable";
}

export function calculateGoldenHourLabel(history) {
  if (!history || history.length < 3) return null;
  const hour = calculateGoldenHour(history);
  if (!hour) return null;
  return `${hour}:00`;
}

export function calculateGoldenHour(history) {
  if (!history || history.length < 3) return null;
  const hours = {};
  history.forEach(entry => {
    const hour = new Date(entry.time).getHours();
    if (!hours[hour]) hours[hour] = { total: 0, count: 0 };
    hours[hour].total += entry.value;
    hours[hour].count++;
  });
  let bestHour = null, bestScore = 0;
  Object.keys(hours).forEach(h => {
    const avg = hours[h].total / hours[h].count;
    if (avg > bestScore) { bestScore = avg; bestHour = h; }
  });
  if (bestHour === null) return null;
  const start = String(bestHour).padStart(2, "0");
  const end   = String((Number(bestHour) + 1) % 24).padStart(2, "0");
  return { start, end };
}

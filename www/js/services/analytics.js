// =====================================
// MoodOS Analytics Service
// Отвечает только за расчёты
// =====================================

export function calculateStabilityScore(history) {
  if (!history || history.length === 0) return null;

  const avg =
    history.reduce((s, h) => s + h.value, 0) /
    history.length;

  const variance =
    history.reduce(
      (s, h) => s + Math.pow(h.value - avg, 2),
      0
    ) / history.length;

  const volatility = Math.sqrt(variance);

  let stability = 100 - volatility;
  stability = Math.max(5, Math.min(100, stability));

  return Math.round(stability);
}

export function calculateTrend(history) {
  if (!history || history.length < 6) {
    return "learning...";
  }

  const recent =
    history.slice(-3).reduce((s, h) => s + h.value, 0) / 3;

  const previous =
    history.slice(-6, -3).reduce((s, h) => s + h.value, 0) / 3;

  if (recent > previous + 2) return "improving ↑";
  if (recent < previous - 2) return "declining ↓";
  return "stable →";
}

export function calculateGoldenHour(history) {
  if (!history || history.length < 8) {
    return "Learning your rhythm...";
  }

  const hours = {};

  history.forEach(entry => {
    const hour = new Date(entry.time).getHours();

    if (!hours[hour]) {
      hours[hour] = { total: 0, count: 0 };
    }

    hours[hour].total += entry.value;
    hours[hour].count++;
  });

  let bestHour = null;
  let bestScore = 0;

  Object.keys(hours).forEach(h => {
    const avg =
      hours[h].total / hours[h].count;

    if (avg > bestScore) {
      bestScore = avg;
      bestHour = h;
    }
  });

  if (bestHour === null) {
    return "Collecting patterns...";
  }

  const start = String(bestHour).padStart(2, "0");
  const end =
    String((Number(bestHour) + 1) % 24).padStart(2, "0");

  return `Your peak window: ${start}:00–${end}:00`;
}
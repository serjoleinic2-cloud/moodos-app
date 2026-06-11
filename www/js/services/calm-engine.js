// =====================================
// Neyra Calm Engine — Индекс спокойствия
// =====================================
import { getMoodHistory, getSessionHistory } from "./memory.js";
import { getMoodStability, getRecoverySpeed } from "./resilience-engine.js";

export function getCalmIndex() {
  const history  = getMoodHistory();
  const sessions = getSessionHistory();
  if (!history || history.length < 5) return null;

  const now    = Date.now();
  const ms14   = 14 * 24 * 3600000;
  const recent = history.filter(e => now - (e.time || e.timestamp || e.date || 0) <= ms14);
  if (recent.length < 3) return null;

  const stability = getMoodStability() ?? 50;

  const nightEntries = recent.filter(e => {
    const h = new Date(e.time || e.timestamp || e.date || 0).getHours();
    return h >= 0 && h < 4;
  }).length;
  const nightScore = Math.max(0, 100 - nightEntries * 15);

  const stressCount = recent.filter(e =>
    Array.isArray(e.events) && e.events.includes('stress')
  ).length;
  const stressRatio = recent.length > 0 ? stressCount / recent.length : 0;
  const stressScore = Math.max(0, 100 - Math.round(stressRatio * 150));

  const recovery     = getRecoverySpeed();
  const recoveryScore = recovery === null ? 50
    : recovery < 6  ? 100
    : recovery < 12 ? 80
    : recovery < 24 ? 60
    : recovery < 48 ? 40 : 20;

  const avgPerDay = recent.length / 14;
  const frequencyScore = avgPerDay > 6 ? 40 : avgPerDay > 4 ? 60 : 100;

  const raw = Math.round(
    stability    * 0.35 +
    nightScore   * 0.20 +
    stressScore  * 0.20 +
    recoveryScore* 0.15 +
    frequencyScore * 0.10
  );

  return Math.min(100, Math.max(0, raw));
}

export function getCalmLabel(index) {
  if (index === null)  return null;
  if (index >= 80)     return "high";
  if (index >= 60)     return "medium";
  if (index >= 40)     return "low";
  return "very_low";
}

export function getCalmHistory(days = 30) {
  const history = getMoodHistory();
  if (!history || history.length < 3) return [];

  const now      = Date.now();
  const sessions = getSessionHistory() || [];
  const result   = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * 86400000;
    const dayEnd   = dayStart + 86400000;

    const dayEntries = history.filter(e => {
      const t = e.time || e.timestamp || e.date || 0;
      return t >= (dayStart - 86400000 * 3) && t < dayEnd;
    });

    if (dayEntries.length < 2) {
      result.push({ date: dayStart, value: null });
      continue;
    }

    const avg = dayEntries.reduce((s, e) => s + e.value, 0) / dayEntries.length;
    const variance = dayEntries.reduce((s, e) => s + Math.pow(e.value - avg, 2), 0) / dayEntries.length;
    const stab = Math.max(0, 100 - Math.sqrt(variance) * 2);

    const nightE = dayEntries.filter(e => {
      const h = new Date(e.time || e.timestamp || e.date || 0).getHours();
      return h >= 0 && h < 4;
    }).length;

    const stressE = dayEntries.filter(e =>
      Array.isArray(e.events) && e.events.includes('stress')
    ).length;
    const stressS = Math.max(0, 100 - stressE * 30);

    const val = Math.round(stab * 0.5 + Math.max(0, 100 - nightE * 20) * 0.3 + stressS * 0.2);
    result.push({ date: dayStart, value: Math.min(100, Math.max(0, val)) });
  }

  return result;
}

export function getCalmPatterns() {
  const history = getMoodHistory();
  if (!history || history.length < 7) return { anxiety: [], calm: [] };

  const now    = Date.now();
  const recent = history.filter(e => now - (e.time || e.timestamp || e.date || 0) <= 30 * 24 * 3600000);

  const eventStats = {};
  recent.forEach(e => {
    if (!Array.isArray(e.events)) return;
    e.events.forEach(ev => {
      if (!eventStats[ev]) eventStats[ev] = { low: 0, high: 0, total: 0 };
      eventStats[ev].total++;
      if (e.value < 40)      eventStats[ev].low++;
      else if (e.value >= 65) eventStats[ev].high++;
    });
  });

  const anxiety = [], calm = [];
  Object.entries(eventStats).forEach(([ev, s]) => {
    if (s.total < 2) return;
    const lowRate  = s.low  / s.total;
    const highRate = s.high / s.total;
    if (lowRate  >= 0.4) anxiety.push({ trigger: ev, rate: Math.round(lowRate  * 100) });
    if (highRate >= 0.4) calm.push(   { trigger: ev, rate: Math.round(highRate * 100) });
  });

  return {
    anxiety: anxiety.sort((a, b) => b.rate - a.rate).slice(0, 3),
    calm:    calm.sort(   (a, b) => b.rate - a.rate).slice(0, 3)
  };
}

export function getPastRecovery() {
  const history = getMoodHistory();
  if (!history || history.length < 10) return null;

  const sorted = [...history].sort((a, b) => (a.time||a.timestamp||a.date||0) - (b.time||b.timestamp||b.date||0));
  const recoveries = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].value < 40) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].value >= 65) {
          const hours = Math.round(((sorted[j].time||sorted[j].timestamp||sorted[j].date||0) -
                                    (sorted[i].time||sorted[i].timestamp||sorted[i].date||0)) / 3600000);
          if (hours > 0 && hours <= 168) {
            recoveries.push({ from: sorted[i].time||sorted[i].timestamp||sorted[i].date, hours });
          }
          i = j;
          break;
        }
      }
    }
  }

  if (recoveries.length === 0) return null;
  const avgHours = Math.round(recoveries.reduce((s, r) => s + r.hours, 0) / recoveries.length);
  return { count: recoveries.length, avgHours };
}

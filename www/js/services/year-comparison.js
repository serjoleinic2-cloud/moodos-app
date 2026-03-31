// =====================================
// Neyra Year Comparison
// =====================================
import { getMoodHistory } from "./memory.js";
import { isPremium } from "./user-profile.js";

export function getYearComparison() {
  const history = getMoodHistory();
  
  if (!history || history.length < 7) {
    return null;
  }

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const sorted = [...history].sort((a, b) => (a.time || a.date) - (b.time || b.date));
  
  const recentEntries = sorted.filter(e => {
    const ts = e.time || e.date;
    return ts && (now - parseInt(ts)) <= 7 * oneDayMs;
  });
  
  const pastEntries = sorted.filter(e => {
    const ts = e.time || e.date;
    if (!ts) return false;
    const diff = now - parseInt(ts);
    return diff > 28 * oneDayMs && diff <= 35 * oneDayMs;
  });
  
  if (recentEntries.length < 2 && pastEntries.length < 2) {
    return null;
  }
  
  const calcAvg = (entries) => {
    if (!entries || entries.length === 0) return null;
    const sum = entries.reduce((s, e) => s + (e.value || 50), 0);
    return Math.round(sum / entries.length);
  };
  
  const avgNow = calcAvg(recentEntries);
  const avgBefore = calcAvg(pastEntries);
  
  if (avgNow === null || avgBefore === null) {
    return null;
  }
  
  const diff = avgNow - avgBefore;
  
  let trend = "stable";
  if (diff > 5) trend = "up";
  else if (diff < -5) trend = "down";
  
  return {
    averageMoodNow: avgNow,
    averageMoodBefore: avgBefore,
    difference: diff,
    trend,
    entriesNow: recentEntries.length,
    entriesBefore: pastEntries.length
  };
}

export function canShowYearComparison() {
  return isPremium();
}

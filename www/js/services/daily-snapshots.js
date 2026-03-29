// =====================================
// MoodOS Daily Snapshots Service
// Версионирование состояния по дням
// =====================================

import { getMoodHistory, getNotesHistory, getSessionHistory, getVoiceHistory } from "./memory.js";
import { isPremium } from "./user-profile.js";

const LS_DAILY_SNAPSHOTS = "daily_snapshots";
const SNAPSHOT_LIMIT_FREE = 7;

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function calculateMoodAverage(dateStr) {
  try {
    const history = getMoodHistory();
    const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
    
    const dayEntries = history.filter(e => {
      const t = e.time || e.date;
      if (!t) return false;
      const ts = typeof t === 'string' ? new Date(t).getTime() : parseInt(t);
      return ts >= dayStart && ts <= dayEnd;
    });
    
    if (dayEntries.length === 0) return null;
    
    const sum = dayEntries.reduce((acc, e) => acc + (e.value || e.mood || 50), 0);
    return Math.round(sum / dayEntries.length);
  } catch(e) {
    return null;
  }
}

function countSessions(dateStr) {
  try {
    const history = getSessionHistory();
    const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
    
    return history.filter(e => {
      const t = e.timestamp || e.time;
      if (!t) return false;
      const ts = typeof t === 'string' ? new Date(t).getTime() : parseInt(t);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
  } catch(e) {
    return 0;
  }
}

function countInsights(dateStr) {
  try {
    const insights = JSON.parse(localStorage.getItem("daily_insights") || "[]");
    const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
    
    return insights.filter(e => {
      const t = e.createdAt || e.timestamp;
      if (!t) return false;
      const ts = typeof t === 'string' ? new Date(t).getTime() : parseInt(t);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
  } catch(e) {
    return 0;
  }
}

function countVoiceNotes(dateStr) {
  try {
    const history = getVoiceHistory();
    const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
    
    return history.filter(e => {
      const t = e.timestamp || e.time;
      if (!t) return false;
      const ts = typeof t === 'string' ? new Date(t).getTime() : parseInt(t);
      return ts >= dayStart && ts <= dayEnd;
    }).length;
  } catch(e) {
    return 0;
  }
}

function loadSnapshots() {
  try {
    const raw = localStorage.getItem(LS_DAILY_SNAPSHOTS);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

function saveSnapshots(snapshots) {
  try {
    const premium = isPremium();
    
    if (!premium && snapshots.length > SNAPSHOT_LIMIT_FREE) {
      snapshots = snapshots.slice(-SNAPSHOT_LIMIT_FREE);
    }
    
    localStorage.setItem(LS_DAILY_SNAPSHOTS, JSON.stringify(snapshots));
    
    if (window.systemState) {
      window.systemState.dailySnapshots = snapshots;
    }
  } catch(e) {
    console.warn("saveSnapshots failed:", e);
  }
}

export function getLastSnapshot() {
  const snapshots = loadSnapshots();
  if (snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

export function getSnapshots() {
  return loadSnapshots();
}

export function createDailySnapshot() {
  const today = getTodayDate();
  const snapshots = loadSnapshots();
  
  const lastSnapshot = snapshots[snapshots.length - 1];
  if (lastSnapshot && lastSnapshot.date === today) {
    return lastSnapshot;
  }
  
  const snapshot = {
    date: today,
    mood_avg: calculateMoodAverage(today),
    sessions_count: countSessions(today),
    insights_count: countInsights(today),
    voice_notes_count: countVoiceNotes(today),
    created_at: Date.now()
  };
  
  snapshots.push(snapshot);
  saveSnapshots(snapshots);
  
  console.log("[SNAPSHOT] Created:", snapshot);
  return snapshot;
}

export function updateTodaySnapshot() {
  const today = getTodayDate();
  const snapshots = loadSnapshots();
  
  const todayIndex = snapshots.findIndex(s => s.date === today);
  
  const updatedSnapshot = {
    date: today,
    mood_avg: calculateMoodAverage(today),
    sessions_count: countSessions(today),
    insights_count: countInsights(today),
    voice_notes_count: countVoiceNotes(today),
    created_at: Date.now()
  };
  
  if (todayIndex >= 0) {
    snapshots[todayIndex] = updatedSnapshot;
  } else {
    snapshots.push(updatedSnapshot);
  }
  
  saveSnapshots(snapshots);
  return updatedSnapshot;
}

export function getSnapshotComparison() {
  const snapshots = loadSnapshots();
  if (snapshots.length < 2) return null;
  
  const today = snapshots[snapshots.length - 1];
  const yesterday = snapshots[snapshots.length - 2];
  
  if (!yesterday) return null;
  
  const compare = (current, prev) => {
    if (current === null || prev === null) return null;
    if (current === prev) return 0;
    return current > prev ? 1 : -1;
  };
  
  return {
    mood: {
      current: today.mood_avg,
      previous: yesterday.mood_avg,
      trend: compare(today.mood_avg, yesterday.mood_avg)
    },
    sessions: {
      current: today.sessions_count,
      previous: yesterday.sessions_count,
      trend: compare(today.sessions_count, yesterday.sessions_count)
    }
  };
}

export function initSnapshots() {
  if (window.systemState) {
    window.systemState.dailySnapshots = loadSnapshots();
  }
  
  const today = getTodayDate();
  const lastSnapshot = getLastSnapshot();
  
  if (!lastSnapshot || lastSnapshot.date !== today) {
    createDailySnapshot();
  } else {
    updateTodaySnapshot();
  }
}

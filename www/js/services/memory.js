// ⚠️ Использовать только через SystemCore
// =====================================
// MoodOS Memory Service
// Отвечает ТОЛЬКО за localStorage
// =====================================

/* ---------- GENERIC SAVE ---------- */
export function save(data) {
  let needsSnapshotUpdate = false;
  
  const KNOWN_SAVE_FIELDS = ['mood', 'state', 'feedback', 'lastSupportInsight', 'lastInsight'];
  const unknownFields = Object.keys(data).filter(k => !KNOWN_SAVE_FIELDS.includes(k));
  if (unknownFields.length > 0) {
    console.warn('[memory.save] Unknown fields (data may be lost):', unknownFields);
  }
  
  if (data.lastInsight !== undefined) {
    localStorage.setItem("last_insight", JSON.stringify({
      text: data.lastInsight,
      time: Date.now()
    }));
  }
  
  if (data.mood !== undefined) {
    const history = getMoodHistory();
    history.push({
      value: data.mood,
      state: data.state,
      time: Date.now()
    });
    if (history.length > 730) history.shift();
    saveMoodHistory(history);
    needsSnapshotUpdate = true;
  }
  if (data.feedback !== undefined) {
    const history = getSupportFeedbackHistory();
    history.push(data.feedback);
    if (history.length > 100) history.shift();
    saveSupportFeedbackHistory(history);
  }
  if (data.lastSupportInsight !== undefined) {
    localStorage.setItem("last_support_insight", JSON.stringify({
      text: data.lastSupportInsight,
      time: Date.now()
    }));
  }
  
  if (needsSnapshotUpdate) {
    setTimeout(() => {
      import("./daily-snapshots.js")
        .then(m => m.updateTodaySnapshot())
        .catch(() => {});
    }, 100);
  }
}

/* ---------- MOOD HISTORY ---------- */

export function getMoodHistory() {
  return JSON.parse(localStorage.getItem("mood_history")) || [];
}

export function saveMoodHistory(history) {
  localStorage.setItem("mood_history", JSON.stringify(history));
}

export function addMoodEntry(entry) {
  const history = getMoodHistory();
  history.push(entry);
  saveMoodHistory(history);
}

/* ---------- NOTES HISTORY ---------- */

export function getNotesHistory() {
  return JSON.parse(localStorage.getItem("notes_history")) || [];
}

export function saveNotesHistory(history) {
  localStorage.setItem("notes_history", JSON.stringify(history));
}

/* ---------- VOICE HISTORY ---------- */

export function getVoiceHistory() {
  return JSON.parse(localStorage.getItem("voice_history")) || [];
}

export function saveVoiceHistory(history) {
  localStorage.setItem("voice_history", JSON.stringify(history));
}

/* ---------- SUPPORT FEEDBACK HISTORY ---------- */

export function getSupportFeedbackHistory() {
  return JSON.parse(localStorage.getItem("support_feedback_history")) || [];
}

export function saveSupportFeedbackHistory(history) {
  localStorage.setItem("support_feedback_history", JSON.stringify(history));
}

/* ---------- SESSION HISTORY ---------- */

export function getSessionHistory() {
  return JSON.parse(localStorage.getItem("session_history")) || [];
}

export function saveSessionHistory(history) {
  localStorage.setItem("session_history", JSON.stringify(history));
}

export function addSessionEntry(entry) {
  const history = getSessionHistory();
  history.push(entry);
  saveSessionHistory(history);
  
  setTimeout(() => {
    import("./daily-snapshots.js")
      .then(m => m.updateTodaySnapshot())
      .catch(() => {});
  }, 100);
}

/* ---------- ACTIVITY HISTORY ---------- */

export function getActivityHistory() {
  return JSON.parse(localStorage.getItem("activity_history")) || [];
}

export function saveActivityHistory(history) {
  localStorage.setItem("activity_history", JSON.stringify(history));
}

export function addActivityEntry(entry) {
  const history = getActivityHistory();
  history.push(entry);
  saveActivityHistory(history);
}

/* ---------- PHOTO HISTORY ---------- */

export function getPhotoHistory() {
  return JSON.parse(localStorage.getItem("photo_history")) || [];
}

export function savePhotoHistory(history) {
  localStorage.setItem("photo_history", JSON.stringify(history));
}

/* ---------- WEEKLY HISTORY ---------- */

export function getWeeklyHistory() {
  try {
    const raw = localStorage.getItem("weekly_history");
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    localStorage.removeItem("weekly_history");
    return [];
  }
}

export function saveWeeklyHistory(blocks) {
  try {
    localStorage.setItem("weekly_history", JSON.stringify(blocks));
  } catch(e) {
    console.warn("saveWeeklyHistory failed:", e.message);
  }
}

/* ---------- USER BASELINE CACHE ---------- */

export function getUserBaselineCache() {
  try {
    const raw = localStorage.getItem("user_baseline_cache");
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

export function saveUserBaselineCache(cache) {
  try {
    localStorage.setItem("user_baseline_cache", JSON.stringify({
      ...cache,
      updatedAt: Date.now()
    }));
  } catch(e) {
    console.warn("saveUserBaselineCache failed:", e.message);
  }
}

export function getCachedBaseline(practiceType, days) {
  const cache = getUserBaselineCache();
  if (!cache) return null;
  
  const key = `${practiceType}_${days}`;
  const entry = cache[key];
  
  if (!entry) return null;
  
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (entry.updatedAt < hourAgo) return null;
  
  return entry;
}

export function updateCachedBaseline(practiceType, days, baseline) {
  const cache = getUserBaselineCache() || {};
  const key = `${practiceType}_${days}`;
  
  cache[key] = {
    ...baseline,
    updatedAt: Date.now()
  };
  
  saveUserBaselineCache(cache);
}

export function invalidateBaselineCache() {
  localStorage.removeItem("user_baseline_cache");
}

export function resolveTimestamp(entry) {
  const ts = entry?.time ?? entry?.timestamp ?? entry?.date ?? null;
  if (ts === null) return null;
  if (typeof ts === 'string') return new Date(ts).getTime() || null;
  return Number(ts) || null;
}

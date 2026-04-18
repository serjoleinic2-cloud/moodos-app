// ⚠️ Использовать только через SystemCore
// =====================================
// Neyra Memory Service
// Отвечает ТОЛЬКО за localStorage
// =====================================

function dedupeByTime(arr) {
  const map = new Map();
  arr.forEach(item => {
    const key = item.time || item.date;
    map.set(key, item);
  });
  return Array.from(map.values());
}

/* ---------- GENERIC SAVE ---------- */
export function save(data) {
  let needsSnapshotUpdate = false;
  
  const KNOWN_SAVE_FIELDS = ['mood', 'state', 'feedback', 'lastSupportInsight', 'lastInsight', 'insights', 'patterns', 'resilience', 'events', 'insight', 'timeBucket'];
  const unknownFields = Object.keys(data).filter(k => !KNOWN_SAVE_FIELDS.includes(k));
  if (unknownFields.length > 0) {
    console.warn('[memory.save] Unknown fields (data may be lost):', unknownFields);
  }
  
  if (data.lastInsight !== undefined) {
    localStorage.setItem("last_insight", JSON.stringify({
      text: data.lastInsight,
      insight: data.insight,
      time: Date.now()
    }));
  }
  
  if (data.mood !== undefined) {
    const history = getMoodHistory();
    history.push({
      value: data.mood,
      state: data.state,
      events: data.events || [],
      timeBucket: data.timeBucket || null,
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
  try {
    return JSON.parse(localStorage.getItem("mood_history")) || [];
  } catch(e) {
    console.warn('[memory] getMoodHistory parse error, resetting:', e);
    localStorage.removeItem("mood_history");
    return [];
  }
}

export function saveMoodHistory(history) {
  const deduped = dedupeByTime(history);
  try {
    localStorage.setItem("mood_history", JSON.stringify(deduped));
  } catch(e) {
    console.error('[memory] saveMoodHistory failed (quota?):', e);
  }
}

export function addMoodEntry(entry) {
  const history = getMoodHistory();
  history.push(entry);
  saveMoodHistory(history);
}

/* ---------- NOTES HISTORY ---------- */

export function getNotesHistory() {
  try {
    return JSON.parse(localStorage.getItem("notes_history")) || [];
  } catch(e) {
    localStorage.removeItem("notes_history");
    return [];
  }
}

export function saveNotesHistory(history) {
  const deduped = dedupeByTime(history);
  if (deduped.length > 500) {
    history = deduped.slice(-500);
  }
  try {
    localStorage.setItem("notes_history", JSON.stringify(history));
  } catch(e) {
    console.error('[memory] saveNotesHistory failed:', e);
  }
}

/* ---------- REFLECTIONS ---------- */

export function getReflections() {
  try {
    return JSON.parse(localStorage.getItem("reflections")) || [];
  } catch(e) {
    localStorage.removeItem("reflections");
    return [];
  }
}

export function saveReflection(entry) {
  let data = getReflections();
  data.push({
    ...entry,
    type: 'reflection',
    time: entry.time || Date.now()
  });
  
  data = dedupeByTime(data);
  
  const MAX_REFLECTIONS = 100;
  if (data.length > MAX_REFLECTIONS) {
    data = data.slice(-MAX_REFLECTIONS);
  }
  try {
    localStorage.setItem("reflections", JSON.stringify(data));
  } catch(e) {
    console.error('[memory] saveReflection failed:', e);
  }
}

/* ---------- VOICE HISTORY ---------- */

export function getVoiceHistory() {
  try {
    return JSON.parse(localStorage.getItem("voice_history")) || [];
  } catch(e) {
    localStorage.removeItem("voice_history");
    return [];
  }
}

export function saveVoiceHistory(history) {
  try {
    localStorage.setItem("voice_history", JSON.stringify(history));
  } catch(e) {
    console.error('[memory] saveVoiceHistory failed:', e);
  }
}

export function saveVoiceNote(note) {
  try {
    const history = getVoiceHistory();
    history.push({
      type: 'voice_note',
      audio: note.audio,
      duration: note.duration,
      mood: note.mood,
      date: note.date || Date.now()
    });
    if (history.length > 30) history.splice(0, history.length - 30);
    localStorage.setItem("voice_history", JSON.stringify(history));
  } catch(e) {
    console.error('[memory] saveVoiceNote failed:', e);
  }
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
  try {
    return JSON.parse(localStorage.getItem("session_history")) || [];
  } catch(e) {
    console.warn('[memory] getSessionHistory parse error, resetting:', e);
    localStorage.removeItem("session_history");
    return [];
  }
}

function safeParse(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    console.warn('Parse fail', key);
    localStorage.removeItem(key);
    return [];
  }
}

export function saveSessionHistory(history) {
  const MAX_SESSIONS = 100;
  if (history.length > MAX_SESSIONS) {
    history = history.slice(-MAX_SESSIONS);
  }
  try {
    localStorage.setItem("session_history", JSON.stringify(history));
  } catch(e) {
    console.error('[memory] saveSessionHistory failed (quota?):', e);
  }
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

const MAX_ACTIVITY = 100;

export function getActivityHistory() {
  return safeParse("activity_history");
}

export function saveActivityHistory(history) {
  if (history.length > MAX_ACTIVITY) {
    history = history.slice(-MAX_ACTIVITY);
  }
  localStorage.setItem("activity_history", JSON.stringify(history));
}

export function addActivityEntry(entry) {
  const history = getActivityHistory();
  history.push(entry);
  saveActivityHistory(history);
}

/* ---------- PHOTO HISTORY ---------- */

const MAX_PHOTOS = 20;

export function getPhotoHistory() {
  return safeParseStorage("photo_history", []);
}

export function savePhotoHistory(history) {
  if (history.length > MAX_PHOTOS) {
    history = history.slice(-MAX_PHOTOS);
  }
  try {
    localStorage.setItem("photo_history", JSON.stringify(history));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      emergencyPrune("photo_history", 0.8);
    }
  }
}

function safeParseStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function emergencyPrune(key, ratio) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return;
    const pruneCount = Math.floor(arr.length * ratio);
    const pruned = arr.slice(pruneCount);
    localStorage.setItem(key, JSON.stringify(pruned));
    console.log('[MEMORY] Emergency prune:', key);
    
    if (key === 'photo_history') {
      alert('Память заполнена. Старые фото удалены.');
    }
  } catch (e) {
    console.error('[MEMORY] Prune failed:', e);
  }
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

/* ---------- VOICE MIGRATION (base64 -> Filesystem) ---------- */

export async function migrateVoiceStorage() {
  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  const Capacitor = window.Capacitor;
  
  if (!Filesystem || !Capacitor?.isNativePlatform()) {
    return;
  }
  
  try {
    const history = getVoiceHistory();
    let migrated = false;
    
    for (const item of history) {
      if (item.audio && item.audio.startsWith('data:')) {
        try {
          const base64 = item.audio.split(",")[1];
          if (!base64) continue;
          
          const ts = item.date || Date.now();
          const fileName = `voice_${ts}.webm`;
          
          await Filesystem.writeFile({
            path: `Neyra/${fileName}`,
            data: base64,
            directory: 'Documents'
          });
          
          const fileInfo = await Filesystem.getUri({
            path: `Neyra/${fileName}`,
            directory: 'Documents'
          });
          
          item.audio = fileInfo.uri;
          item.uri = fileInfo.uri;
          migrated = true;
        } catch(e) {
          console.warn('[VOICE MIGRATION] Failed to migrate:', e);
        }
      }
    }
    
    if (migrated) {
      localStorage.setItem("voice_history", JSON.stringify(history));
      console.log('[VOICE MIGRATION] Completed:', history.length, 'items');
    }
  } catch(e) {
    console.error('[VOICE MIGRATION] Error:', e);
  }
}

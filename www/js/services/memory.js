// =====================================
// MoodOS Memory Service
// Отвечает ТОЛЬКО за localStorage
// =====================================

function safeParse(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) && typeof parsed !== "object") return fallback;
    return parsed;
  } catch (e) {
    console.warn("Corrupted data for", key, "— resetting");
    localStorage.removeItem(key);
    return fallback;
  }
}

function trimIfLarge(history, key) {
  if (Array.isArray(history) && history.length > 1000) {
    console.warn(key, "too large, trimming to 500");
    return history.slice(-500);
  }
  return history;
}

/* ---------- MOOD HISTORY ---------- */

export function getMoodHistory() {
  const h = safeParse("mood_history", []);
  return trimIfLarge(h, "mood_history");
}

export function saveMoodHistory(history) {
  try {
    localStorage.setItem("mood_history", JSON.stringify(history));
  } catch (e) {
    console.warn("saveMoodHistory failed:", e.message);
  }
}

export function addMoodEntry(entry) {
  const history = getMoodHistory();
  history.push(entry);
  saveMoodHistory(history);
  console.log("MOOD SAVED:", JSON.stringify(entry));
}

/* ---------- NOTES HISTORY ---------- */

export function getNotesHistory() {
  const h = safeParse("notes_history", []);
  return trimIfLarge(h, "notes_history");
}

export function saveNotesHistory(history) {
  try {
    localStorage.setItem("notes_history", JSON.stringify(history));
  } catch (e) {
    console.warn("saveNotesHistory failed:", e.message);
  }
}

/* ---------- VOICE HISTORY ---------- */

export function getVoiceHistory() {
  return safeParse("voice_history", []);
}

export function saveVoiceHistory(history) {
  try {
    localStorage.setItem("voice_history", JSON.stringify(history));
  } catch (e) {
    console.warn("saveVoiceHistory failed:", e.message);
  }
}

/* ---------- SESSION HISTORY ---------- */

export function getSessionHistory() {
  const h = safeParse("session_history", []);
  return trimIfLarge(h, "session_history");
}

export function saveSessionHistory(history) {
  try {
    localStorage.setItem("session_history", JSON.stringify(history));
  } catch (e) {
    console.warn("saveSessionHistory failed:", e.message);
  }
}

export function addSessionEntry(entry) {
  const history = getSessionHistory();
  history.push(entry);
  saveSessionHistory(history);
  console.log("SESSION SAVED:", JSON.stringify(entry));
}

/* ---------- ACTIVITY HISTORY ---------- */

export function getActivityHistory() {
  return safeParse("activity_history", []);
}

export function saveActivityHistory(history) {
  try {
    localStorage.setItem("activity_history", JSON.stringify(history));
  } catch (e) {
    console.warn("saveActivityHistory failed:", e.message);
  }
}

export function addActivityEntry(entry) {
  const history = getActivityHistory();
  history.push(entry);
  saveActivityHistory(history);
  console.log("ACTIVITY SAVED:", JSON.stringify(entry));
}

/* ---------- PHOTO HISTORY ---------- */

export function getPhotoHistory() {
  return safeParse("photo_history", []);
}

export function savePhotoHistory(history) {
  try {
    localStorage.setItem("photo_history", JSON.stringify(history));
  } catch (e) {
    console.warn("savePhotoHistory failed:", e.message);
  }
}

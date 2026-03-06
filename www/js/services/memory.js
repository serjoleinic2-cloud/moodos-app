// =====================================
// MoodOS Memory Service
// Отвечает ТОЛЬКО за localStorage
// =====================================

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
  console.log("MOOD SAVED:", JSON.stringify(entry));
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
  console.log("SESSION SAVED:", JSON.stringify(entry));
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
  console.log("ACTIVITY SAVED:", JSON.stringify(entry));
}
// ===== MoodOS GLOBAL STATE =====

let state = {
  mood: 50,
  startDate: null
};

/* ---------- INIT ---------- */
export function initState() {
  const savedMood = localStorage.getItem("mood");
  const savedDate = localStorage.getItem("startDate");

  if (savedMood !== null) {
    state.mood = Number(savedMood);
  }

  if (savedDate) {
    state.startDate = savedDate;
  } else {
    state.startDate = new Date().toISOString();
    localStorage.setItem("startDate", state.startDate);
  }
}

/* ---------- MOOD ---------- */
export function setMood(value) {
  state.mood = value;
  localStorage.setItem("mood", value);
}

export function getMood() {
  return state.mood;
}

/* ---------- USAGE DAYS ---------- */
export function getUsageDays() {
  if (!state.startDate) return 1;
  const start = new Date(state.startDate);
  const now   = new Date();
  const diff  = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}
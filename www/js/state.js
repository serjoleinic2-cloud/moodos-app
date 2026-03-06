// ===== MoodOS GLOBAL STATE =====
let lastMoodSaveTime = 0;
const MOOD_SAVE_COOLDOWN = 5000; // 5 секунд


let state = {
  mood: 50,
  startDate: null
};

const listeners = [];

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

/* ---------- SUBSCRIBE ---------- */

export function subscribe(fn) {
  listeners.push(fn);
}

/* ---------- NOTIFY ---------- */

function notify() {
  listeners.forEach(fn => fn());
}

/* ---------- MOOD ---------- */

export function setMood(value) {

  const now = Date.now();

  // 1️⃣ если значение не изменилось — не сохраняем
  if (value === state.mood) return;

  // 2️⃣ если прошло меньше 5 секунд — игнорируем
  if (now - lastMoodSaveTime < MOOD_SAVE_COOLDOWN) return;

  state.mood = value;
  localStorage.setItem("mood", value);

  lastMoodSaveTime = now;

  notify();
}

export function getMood() {
  return state.mood;
}

/* ---------- USAGE DAYS ---------- */

export function getUsageDays() {

  if (!state.startDate) return 1;

  const start = new Date(state.startDate);
  const now = new Date();

  const diff =
    Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;

  return diff;
}
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

/* ---------- STATE UPDATE ---------- */
export function update(data) {
  if (data.mood !== undefined) {
    state.mood = data.mood;
    localStorage.setItem("mood", data.mood);
  }
  if (data.startDate !== undefined) {
    state.startDate = data.startDate;
    localStorage.setItem("startDate", data.startDate);
  }
  return state;
}

/* ---------- USAGE DAYS ---------- */
export function getUsageDays() {
  try {
    const history = JSON.parse(localStorage.getItem("mood_history") || "[]");
    
    if (history && history.length > 0) {
      const validHistory = history.filter(e => e.time || e.date);
      if (validHistory.length > 0) {
        const sorted = [...validHistory].sort((a, b) => (a.time || a.date) - (b.time || b.date));
        const firstEntry = sorted[0];
        const firstDate = firstEntry?.time || firstEntry?.date;
        
        if (firstDate) {
          const start = new Date(parseInt(firstDate));
          const now = new Date();
          const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
          return Math.max(1, diff);
        }
      }
    }
  } catch (e) {
    console.warn("Error calculating usage days:", e);
  }
  
  if (!state.startDate) return 1;
  const start = new Date(state.startDate);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}
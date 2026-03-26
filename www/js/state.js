// ===== MoodOS GLOBAL STATE =====

let state = {
  mood: 50,
  startDate: null,
  avatar: {
    visible: false,
    message: '',
    type: 'default',
    timestamp: 0,
    actions: null,
    position: {
      x: 20,
      y: 100
    },
    isIdle: true
  }
};



/* ---------- INIT ---------- */
export function initState() {
  const savedMood = localStorage.getItem("mood");
  const savedDate = localStorage.getItem("startDate");
  const savedAvatarPosition = localStorage.getItem("avatar_position");

  if (savedMood !== null) {
    state.mood = Number(savedMood);
  }

  if (savedDate) {
    state.startDate = savedDate;
  } else {
    state.startDate = new Date().toISOString();
    localStorage.setItem("startDate", state.startDate);
  }
  
  if (savedAvatarPosition) {
    try {
      const pos = JSON.parse(savedAvatarPosition);
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number' && !isNaN(pos.x) && !isNaN(pos.y)) {
        state.avatar.position = pos;
      } else {
        console.warn('[AVATAR] Invalid saved position, using default');
        state.avatar.position = { x: 20, y: 100 };
      }
    } catch (e) {}
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

/* ---------- AVATAR ---------- */
export function getAvatarState() {
  return state.avatar;
}

export function setAvatarState(config) {
  state.avatar = {
    visible: config.visible !== undefined ? config.visible : state.avatar.visible,
    message: config.message !== undefined ? config.message : state.avatar.message,
    type: config.type || state.avatar.type,
    timestamp: config.timestamp !== undefined ? config.timestamp : Date.now(),
    actions: config.actions !== undefined ? config.actions : state.avatar.actions,
    position: config.position !== undefined ? config.position : state.avatar.position,
    isIdle: config.isIdle !== undefined ? config.isIdle : state.avatar.isIdle
  };
  
  if (config.position !== undefined) {
    localStorage.setItem("avatar_position", JSON.stringify(state.avatar.position));
  }
  
  return state.avatar;
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
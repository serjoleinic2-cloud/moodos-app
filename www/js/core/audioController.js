// ===============================
// AudioController — Singleton Audio Engine (Production Hardened)
// Single source of truth for all audio playback
// Guardian Layer prevents ghost audio, memory leaks, and UI desync
// ===============================

let currentAudio = null;
let currentTrackId = null;
let currentSrc = null;

const state = {
  isPlaying: false,
  trackId: null,
  src: null
};

const subscribers = new Set();
let safetyInterval = null;

// ============ SINGLETON ============
let instance = null;

function createAudioController() {
  return {
    play,
    stop,
    pause,
    resume,
    toggle,
    switchTrack,
    destroy,
    getState,
    subscribe,
    unsubscribe,
    syncWithAudio,
    hardReset
  };
}

export function getAudioController() {
  if (instance) return instance;
  instance = createAudioController();
  initVisibilityHandler();
  initSafetyLoop();
  return instance;
}

// For backward compatibility - export functions directly
export const play = (track) => {
  if (!track || !track.src) {
    console.warn('[AudioController] Invalid track:', track);
    return;
  }

  const newSrc = track.src;

  if (currentAudio) {
    currentAudio.onerror = null;
    currentAudio.onended = null;
    currentAudio.onpause = null;
    currentAudio.ontimeupdate = null;
    
    if (currentSrc === newSrc && !currentAudio.paused) {
      return;
    }
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio.load();
    currentAudio = null;
  }

  currentAudio = new Audio(newSrc);
  currentSrc = newSrc;
  currentTrackId = track.id || track.name || newSrc;
  
  state.isPlaying = true;
  state.trackId = currentTrackId;
  state.src = currentSrc;

  currentAudio.onended = handleEnded;
  currentAudio.onpause = handlePause;
  currentAudio.onerror = handleError;
  currentAudio.ontimeupdate = () => {
    notify();
  };

  currentAudio.play().catch(err => {
    if (currentSrc === newSrc) {
      state.isPlaying = false;
      notify();
    }
  });

  notify();
};

function handleEnded() {
  state.isPlaying = false;
  notify();
}

function handlePause() {
  syncWithAudio();
}

function handleError(e) {
  console.error('[AudioController] Audio error:', e, 'src:', currentSrc?.substring(0, 100));
  state.isPlaying = false;
  notify();
}

export const stop = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  state.isPlaying = false;
  notify();
};

export const pause = () => {
  if (currentAudio) {
    currentAudio.pause();
  }
  state.isPlaying = false;
  notify();
};

export const resume = () => {
  if (currentAudio) {
    currentAudio.play().catch(err => {
      console.warn('[AudioController] Resume error:', err);
    });
    state.isPlaying = true;
    notify();
  }
};

export const toggle = () => {
  if (state.isPlaying) {
    pause();
  } else {
    resume();
  }
};

export const switchTrack = (track) => {
  stop();
  if (track) {
    play(track);
  }
};

export function hardReset() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    try {
      currentAudio.load();
    } catch(e) {}
    currentAudio = null;
  }
  state.isPlaying = false;
  state.trackId = null;
  state.src = null;
  currentTrackId = null;
  currentSrc = null;
  notify();
}

export const destroy = () => {
  hardReset();
  subscribers.clear();
};

export const getState = () => {
  return {
    isPlaying: state.isPlaying,
    trackId: state.trackId,
    src: state.src,
    hasAudio: currentAudio !== null
  };
};

export const subscribe = (callback) => {
  if (typeof callback !== 'function') {
    console.warn('[AudioController] Invalid subscription:', callback);
    return () => {};
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

export const unsubscribe = (callback) => {
  subscribers.delete(callback);
};

export function getCurrentTime() {
  return currentAudio ? currentAudio.currentTime : 0;
}

export function getDuration() {
  return currentAudio ? currentAudio.duration : 0;
}

export function setCurrentTime(time) {
  if (currentAudio) {
    currentAudio.currentTime = time;
  }
}

export function syncWithAudio() {
  if (!currentAudio) return;
  
  const realState = !currentAudio.paused && currentAudio.readyState > 0;
  
  if (!realState && state.isPlaying) {
    state.isPlaying = false;
    notify();
  }
}

function ensureAudioConsistency() {
  if (!currentAudio) return;
  
  if (currentAudio.paused && state.isPlaying) {
    state.isPlaying = false;
    notify();
  }
}

function initSafetyLoop() {
  if (safetyInterval) return;
  
  safetyInterval = setInterval(() => {
    syncWithAudio();
    ensureAudioConsistency();
  }, 2000);
}

function initVisibilityHandler() {
  // No automatic pause on visibility change
  // Music continues when screen is dark but user is still on page
  // Only onExit() from Meditation screen stops the music
}

function notify() {
  subscribers.forEach(cb => {
    try {
      cb(getState());
    } catch(e) {
      console.warn('[AudioController] Subscriber error:', e);
    }
  });
}

export function syncState() {
  notify();
}

// Backward compatibility exports
export default {
  play,
  stop,
  pause,
  resume,
  toggle,
  switchTrack,
  destroy,
  getState,
  subscribe,
  unsubscribe,
  getCurrentTime,
  getDuration,
  setCurrentTime,
  syncWithAudio,
  syncState,
  hardReset,
  getAudioController
};

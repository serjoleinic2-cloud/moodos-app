// ===============================
// Meditation Screen (Aura Advanced)
// ===============================
import SystemCore from "../system-core.js";
import { getMood } from "../state.js";
import { addSessionEntry } from "../services/memory.js";
import { t } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";
import { AppRuntime } from "../core/appRuntime.js";
import { 
  play, stop, pause, resume, 
  destroy, getState, subscribe, syncState,
  getCurrentTime, getDuration, setCurrentTime
} from "../core/audioController.js";

let waveCanvas, waveCtx;
let animationId;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;

let meditationContainer = null;
let audioUnsubscribe = null;
let stateUnsubscribe = null;
let premiumChangeHandler = null;

let waveClickHandler = null;
let waveTouchStartHandler = null;
let waveTouchMoveHandler = null;
let trackListClickHandler = null;
let fileInputChangeHandler = null;
let windowResizeHandler = null;

function resizeWaveCanvas() {
  if (!waveCanvas) return;
  waveCanvas.width = waveCanvas.offsetWidth || waveCanvas.parentElement?.offsetWidth || 300;
}

const standardTracks = [
  { name: "Celestial Tranquility", src: "/audio/meditation/Celestial Tranquility.mp3", builtin: true },
  { name: "Tibetan Serenity",      src: "/audio/meditation/Tibetan Serenity.mp3",      builtin: true },
];
const MAX_CUSTOM_TRACKS = 5;
const MAX_FILE_SIZE_MB = 6;
const LS_CUSTOM_TRACKS = "med_custom_tracks";
const MODULE_NAME = 'meditation';
const DB_NAME = 'meditationDB';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveAudioToDB(id, dataUrl) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, dataUrl });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAudioFromDB(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.dataUrl);
    request.onerror = () => reject(request.error);
  });
}

async function deleteAudioFromDB(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadCustomTracks() {
  try {
    await openDB();
    const data = localStorage.getItem(LS_CUSTOM_TRACKS);
    const tracksMeta = JSON.parse(data) || [];
    
    const tracks = [];
    for (const meta of tracksMeta) {
      const dataUrl = await loadAudioFromDB(meta.id);
      if (dataUrl) {
        tracks.push({ ...meta, src: dataUrl });
      }
    }
    return tracks;
  } catch(e) { 
    return []; 
  }
}

async function saveCustomTracks(tracks) {
  try {
    const tracksMeta = tracks.map(t => ({ id: t.id || t.name, name: t.name, builtin: t.builtin }));
    localStorage.setItem(LS_CUSTOM_TRACKS, JSON.stringify(tracksMeta));
    
    for (const track of tracks) {
      if (!track.builtin && track.src) {
        await saveAudioToDB(track.id || track.name, track.src);
      }
    }
  } catch(e) {}
}

function getAllTracks() {
  const state = AppRuntime.getState(MODULE_NAME);
  return [...standardTracks, ...(state.customTracks || [])];
}

function getTrackByIndex(index) {
  const all = getAllTracks();
  return all[index] || null;
}

let currentIndex = 0;

let loopMode  = false;
let chainMode = false;
let trackingActive = false;

function updatePlayButton(audioState) {
  const btn = document.getElementById("centerButton");
  const icon = document.getElementById("playIcon");
  if (btn && icon) {
    const state = audioState || getState();
    icon.src = state.isPlaying 
      ? "/icons/player/pause.svg" 
      : "/icons/player/play.svg";
  }
}

export async function onEnter(container) {
  console.log("onEnter", MODULE_NAME);
  
  // Cleanup previous subscriptions
  if (audioUnsubscribe) {
    audioUnsubscribe();
    audioUnsubscribe = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }

  const tracks = isPremium() ? await loadCustomTracks() : [];
  AppRuntime.initModule(MODULE_NAME, {
    customTracks: tracks,
    activeTrackId: null,
    maxTracks: MAX_CUSTOM_TRACKS
  });

  stateUnsubscribe = AppRuntime.subscribe(MODULE_NAME, (state) => {
    if (meditationContainer) {
      renderTracks();
      updateAddButton();
    }
  });

  render(container);
  
  // Wait for render to complete before binding events
  setTimeout(() => bindEvents(), 50);
  
  // Subscribe to audio state changes
  let wasPlaying = false;
  audioUnsubscribe = subscribe((audioState) => {
    updatePlayButton(audioState);
    updateProgress(audioState);
    
    if (trackingActive && wasPlaying && !audioState.isPlaying && running) {
      handleTrackEnd();
    }
    wasPlaying = audioState.isPlaying;
  });
  
  syncState();
  updatePlayButton();
  
  const onPremiumChanged = async () => {
    const wasPremium = !isPremium();
    const tracks = isPremium() ? await loadCustomTracks() : [];
    AppRuntime.setState(MODULE_NAME, { customTracks: tracks });
    
    const allTracks = [...standardTracks, ...tracks];
    if (currentIndex >= allTracks.length || (wasPremium && currentIndex >= standardTracks.length)) {
      currentIndex = 0;
      if (running) {
        stop();
        running = false;
        cancelAnimationFrame(animationId);
        showFeedback();
      }
    }
    
    renderTracks();
    updateAddButton();
  };
  premiumChangeHandler = onPremiumChanged;
  document.addEventListener('premiumChanged', premiumChangeHandler);
}

function render(container) {
  initMeditation(container);
}

function bindEvents() {
  console.log("bindEvents called for", MODULE_NAME);
  
  trackListClickHandler = (e) => {
    const track = e.target.closest(".track");
    if (!track) return;
    if (e.target.classList.contains("del-track")) {
      e.stopPropagation();
      const idx = parseInt(track.dataset.index);
      const customIdx = idx - standardTracks.length;
      if (customIdx < 0) return;
      
      const trackState = getState();
      if (idx === currentIndex && trackState.hasAudio) {
        stop();
        running = false;
        cancelAnimationFrame(animationId);
        showFeedback();
        updatePlayButton({ isPlaying: false });
      }
      
      const state = AppRuntime.getState(MODULE_NAME);
      const updated = [...(state.customTracks || [])];
      const deletedTrack = updated.splice(customIdx, 1)[0];
      if (deletedTrack && deletedTrack.id) {
        deleteAudioFromDB(deletedTrack.id);
      }
      saveCustomTracks(updated);
      AppRuntime.setState(MODULE_NAME, { customTracks: updated });
      if (currentIndex >= getAllTracks().length) currentIndex = 0;
      return;
    }
    currentIndex = parseInt(track.dataset.index);
    if (running) {
      handleTrackSwitch(0);
    } else {
      play(getTrackByIndex(currentIndex));
    }
  };
  document.getElementById("trackList")?.addEventListener("click", trackListClickHandler);

  const centerButton = document.getElementById("centerButton");
  if (centerButton) {
    const newCenterButton = centerButton.cloneNode(true);
    centerButton.replaceWith(newCenterButton);
    newCenterButton.onclick = toggleMeditation;
  }

  const loopBtn = document.getElementById("loopBtn");
  if (loopBtn) {
    const newLoopBtn = loopBtn.cloneNode(true);
    loopBtn.replaceWith(newLoopBtn);
    newLoopBtn.onclick = () => {
      loopMode = !loopMode;
      updateButtonState("loopBtn", loopMode);
    };
  }

  const chainBtn = document.getElementById("chainBtn");
  if (chainBtn) {
    const newChainBtn = chainBtn.cloneNode(true);
    chainBtn.replaceWith(newChainBtn);
    newChainBtn.onclick = () => {
      chainMode = !chainMode;
      updateButtonState("chainBtn", chainMode);
    };
  }

  const medHelped = document.getElementById("medHelped");
  if (medHelped) {
    const newMedHelped = medHelped.cloneNode(true);
    medHelped.replaceWith(newMedHelped);
    newMedHelped.onclick = async () => {
      const moodAfter = getMood();
      const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
      const analysisResult = await SystemCore.analyzeMoodOnly(moodAfter);
      const stateAfter = analysisResult ? analysisResult.state : null;
      addSessionEntry({
        type: "meditation",
        moodBefore: moodBeforeSession,
        stateBefore: stateBeforeSession,
        moodAfter, stateAfter,
        result: "positive",
        duration,
        timestamp: Date.now()
      });
      sessionStartTime = null;
      moodBeforeSession = null;
      showPlayer();
    };
  }

  const medNotHelped = document.getElementById("medNotHelped");
  if (medNotHelped) {
    const newMedNotHelped = medNotHelped.cloneNode(true);
    medNotHelped.replaceWith(newMedNotHelped);
    newMedNotHelped.onclick = async () => {
      const moodAfter = getMood();
      const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
      const analysisResult = await SystemCore.analyzeMoodOnly(moodAfter);
      const stateAfter = analysisResult ? analysisResult.state : null;
      addSessionEntry({
        type: "meditation",
        moodBefore: moodBeforeSession,
        stateBefore: stateBeforeSession,
        moodAfter, stateAfter,
        result: "negative",
        duration,
        timestamp: Date.now()
      });
      sessionStartTime = null;
      moodBeforeSession = null;
      showPlayer();
    };
  }

  const addTrackClickHandler = (e) => {
    if (e.target.closest('[data-action="add-track"]')) {
      const input = document.getElementById("addTrackInput");
      if (input) input.click();
    }
  };
  document.addEventListener("click", addTrackClickHandler);

  fileInputChangeHandler = (e) => {
    if (!e.target || e.target.id !== "addTrackInput") return;
    
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(t("med_file_too_large") || "Файл слишком большой (макс. 5 МБ)");
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const state = AppRuntime.getState(MODULE_NAME);
      const currentCustom = state.customTracks || [];
        if (currentCustom.length >= MAX_CUSTOM_TRACKS) {
        e.target.value = '';
        return;
      }
      const fileNameBase = file.name.split('/').pop().replace(/\.[^.]+$/, '').trim();
      
      const isDuplicate = currentCustom.some(t => 
        t.name.toLowerCase().trim() === fileNameBase.toLowerCase()
      );
      if (isDuplicate) {
        alert(t("med_track_duplicate") || "Трек уже существует");
        e.target.value = '';
        return;
      }
      
      const trackId = 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newMelody = { id: trackId, name: fileNameBase, src: ev.target.result, builtin: false };
      if (!newMelody || !newMelody.name) {
        e.target.value = '';
        return;
      }
      const updated = [...currentCustom, newMelody];
      saveCustomTracks(updated);
      AppRuntime.setState(MODULE_NAME, { customTracks: updated });
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };
  document.addEventListener("change", fileInputChangeHandler);

  waveClickHandler = (e) => {
    const wc = document.getElementById("waveProgress");
    if (!wc || e.target !== wc) return;
    const rect     = wc.getBoundingClientRect();
    const clickX   = e.clientX - rect.left;
    const ratio    = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = getDuration();
    if (duration > 0) setCurrentTime(ratio * duration);
  };
  document.addEventListener("click", waveClickHandler);

  waveTouchStartHandler = (e) => {
    const wc = document.getElementById("waveProgress");
    if (!wc || e.target !== wc) return;
    const rect   = wc.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const ratio  = Math.max(0, Math.min(1, touchX / rect.width));
    const duration = getDuration();
    if (duration > 0) setCurrentTime(ratio * duration);
  };
  document.addEventListener("touchstart", waveTouchStartHandler, { passive: true });

  waveTouchMoveHandler = (e) => {
    const wc = document.getElementById("waveProgress");
    if (!wc || e.target !== wc) return;
    const rect   = wc.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const ratio  = Math.max(0, Math.min(1, touchX / rect.width));
    const duration = getDuration();
    if (duration > 0) setCurrentTime(ratio * duration);
  };
  document.addEventListener("touchmove", waveTouchMoveHandler, { passive: true });
}

function updateAddButton() {
  const wrap = document.getElementById("addTrackWrap");
  if (!wrap || !isPremium()) return;
  const state = AppRuntime.getState(MODULE_NAME);
  const count = (state.customTracks || []).length;
  const isDisabled = count >= MAX_CUSTOM_TRACKS;
  if (isDisabled) {
    wrap.innerHTML = `<div style="font-size:12px;color:#aaa;text-align:center;">${t("med_track_limit")}</div>`;
    return;
  }
  wrap.innerHTML = `
    <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
    <button id="addTrackBtn" onclick="document.getElementById('addTrackInput').click()" style="padding:8px 20px;border:none;border-radius:12px;background:rgba(159,122,234,0.15);color:#7b4fa0;font-size:13px;font-weight:600;cursor:pointer;">+ ${t("med_add_track") || "Добавить мелодию"} (${count}/${MAX_CUSTOM_TRACKS})</button>
  `;
}

export function initMeditation(container) {
  if (!container) {
    console.warn('[meditation] container not ready, retrying...');
    requestAnimationFrame(() => {
      const el = document.getElementById("meditationContainer");
      if (el) {
        initMeditation(el);
      } else {
        console.error('[meditation] container still not found after retry');
      }
    });
    return;
  }
  
  const state = AppRuntime.getState(MODULE_NAME);
  const customCount = (state.customTracks || []).length;
  console.log('[meditation] tracks:', getAllTracks());
  console.log('[meditation] currentIndex:', currentIndex);

  container.innerHTML = `
    <!-- ОСНОВНОЙ КОНТЕНТ -->
    <div class="meditation-content">
      <h2 class="meditation-title">${t("med_title")}</h2>

      <!-- ДОБАВИТЬ ТРЕК -->
      <div id="addTrackWrap">
        ${isPremium() ? `
          <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
          ${customCount < MAX_CUSTOM_TRACKS
            ? `<button id="addTrackBtn" class="add-track-btn" data-action="add-track">+ ${t("med_add_track")} (${customCount}/${MAX_CUSTOM_TRACKS})</button>`
            : `<div class="track-limit-msg">${t("med_track_limit")}</div>`
          }
        ` : ''}
      </div>
    </div>

    <!-- КАРТОЧКА ПЛЕЙЕРА (фиксирована внизу) -->
    <div id="playerCard" class="meditation-player-card">
      <!-- ПОЛЗУНОК -->
      <div id="progressWrap" class="progress-wrap">
        <div id="medTimer" class="progress-timer">00:00 / 00:00</div>
        <canvas id="waveProgress" class="wave-progress-canvas" height="36"></canvas>
      </div>

      <!-- КНОПКИ УПРАВЛЕНИЯ -->
      <div id="playerControls" class="player-controls">
        <button id="loopBtn" class="smallBtn player-btn">
          <img src="/icons/player/loop.svg" class="player-icon" alt="Loop">
        </button>
        <button id="centerButton" class="mainBtn player-btn">
          <img src="/icons/player/play.svg" class="player-icon" id="playIcon" alt="Play">
        </button>
        <button id="chainBtn" class="smallBtn player-btn">
          <img src="/icons/player/next.svg" class="player-icon" alt="Next">
        </button>
      </div>

      <!-- ФИДБЕК (скрыт) -->
      <div id="meditationFeedback" class="meditation-feedback">
        <div class="feedback-question">${t("med_how_feel")}</div>
        <div class="feedback-buttons">
          <div id="medHelped" class="feedback-btn feedback-btn--positive">
            👍 ${t("hist_helped")}
          </div>
          <div id="medNotHelped" class="feedback-btn feedback-btn--neutral">
            👎 ${t("hist_not_helped")}
          </div>
        </div>
      </div>
    </div>
  `;

  meditationContainer = container;
  waveCanvas = document.getElementById("waveProgress");
  waveCtx    = waveCanvas ? waveCanvas.getContext("2d") : null;
  
  resizeWaveCanvas();
  windowResizeHandler = resizeWaveCanvas;
  window.addEventListener("resize", windowResizeHandler);

  const existingList = document.getElementById("trackList");
  if (!existingList) {
    const list = document.createElement("div");
    list.id = "trackList";
    list.className = "track-list-fixed";
    document.body.appendChild(list);
  }

  renderTracks();
  updatePlayButton();
  updateProgress(getState());
}

function renderTracks() {
  const container = document.getElementById("trackList");
  if (!container) return;
  const state = AppRuntime.getState(MODULE_NAME);
  const allTracks = [...standardTracks, ...(state.customTracks || [])];
  if (currentIndex >= allTracks.length) currentIndex = 0;
  container.innerHTML = allTracks.map((tr, i) => `
    <div class="track${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <span>${tr.name}</span>
      ${(!tr.builtin && isPremium()) ? `<span class="del-track" data-index="${i}">✕</span>` : ''}
    </div>
  `).join('');
}

function updateProgress(audioState) {
  if (!audioState) return;
  const current = Math.floor(getCurrentTime());
  const total   = Math.floor(getDuration());

  const timer = document.getElementById("medTimer");
  if (timer) {
    const format = (sec) => {
      sec = Math.floor(sec);
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      return `${m}:${s}`;
    };
    timer.innerText = `${format(current)} / ${format(total || 0)}`;
  }
}

function drawWaveProgress() {
  if (!waveCtx || !waveCanvas) return;

  const current  = getCurrentTime();
  const duration = getDuration();
  const progress = duration > 0 ? current / duration : 0;

  const W   = waveCanvas.width;
  const H   = waveCanvas.height;
  const midY = H / 2;
  const playX = W * progress;
  const ZONE  = 5;

  waveCtx.clearRect(0, 0, W, H);
  waveCtx.lineWidth = 3;
  waveCtx.lineCap   = "round";
  waveCtx.lineJoin  = "round";

  const time = performance.now() * 0.003;

  if (playX - ZONE > 0) {
    const gradPlayed = waveCtx.createLinearGradient(0, 0, playX - ZONE, 0);
    gradPlayed.addColorStop(0,   "#4f8ef7");
    gradPlayed.addColorStop(0.5, "#7b5cf5");
    gradPlayed.addColorStop(1,   "#a855f7");
    waveCtx.beginPath();
    waveCtx.strokeStyle = gradPlayed;
    waveCtx.moveTo(0, midY);
    waveCtx.lineTo(playX - ZONE, midY);
    waveCtx.stroke();
  }

  const pulse = (Math.sin(time * 6) * 0.5 + 0.5);
  const amplitude = 4 + pulse * 10;
  const zoneStart = Math.max(0, playX - ZONE);
  const zoneEnd   = Math.min(W, playX + ZONE);

  const gradZone = waveCtx.createLinearGradient(zoneStart, 0, zoneEnd, 0);
  gradZone.addColorStop(0,   "#a855f7");
  gradZone.addColorStop(0.5, "#c084fc");
  gradZone.addColorStop(1,   "#a855f7");

  waveCtx.beginPath();
  waveCtx.strokeStyle = gradZone;
  for (let x = zoneStart; x <= zoneEnd; x += 0.5) {
    const dist     = Math.abs(x - playX) / ZONE;
    const envelope = 1 - dist;
    const wave     = Math.sin((x - zoneStart) * 0.8 + time * 8) * amplitude * envelope;
    const y        = midY + wave;
    if (x === zoneStart) waveCtx.moveTo(x, y);
    else                 waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();

  if (playX + ZONE < W) {
    waveCtx.beginPath();
    waveCtx.strokeStyle = "rgba(120, 100, 200, 0.22)";
    waveCtx.moveTo(playX + ZONE, midY);
    waveCtx.lineTo(W, midY);
    waveCtx.stroke();
  }

  waveCtx.beginPath();
  waveCtx.arc(playX, midY, 4, 0, Math.PI * 2);
  waveCtx.fillStyle = "#c084fc";
  waveCtx.shadowColor = "#a855f7";
  waveCtx.shadowBlur  = 6;
  waveCtx.fill();
  waveCtx.shadowBlur = 0;
}

function showPlayer() {
  const playerControls = document.getElementById("playerControls");
  const progressWrap = document.getElementById("progressWrap");
  const feedback = document.getElementById("meditationFeedback");
  if (playerControls) playerControls.style.display = "flex";
  if (progressWrap) progressWrap.style.display = "block";
  if (feedback) feedback.style.display = "none";
  updatePlayButton({ isPlaying: false });
}

function showFeedback() {
  const playerControls = document.getElementById("playerControls");
  const progressWrap = document.getElementById("progressWrap");
  const feedback = document.getElementById("meditationFeedback");
  if (playerControls) playerControls.style.display = "none";
  if (progressWrap) progressWrap.style.display = "none";
  if (feedback) feedback.style.display = "flex";
}

function toggleMeditation() {
  if (!running) {
    running = true;
    trackingActive = false;
    sessionStartTime = Date.now();
    moodBeforeSession = getMood();
    
    const allTracks = getAllTracks();
    if (currentIndex < 0 || currentIndex >= allTracks.length) {
      currentIndex = 0;
    }
    
    const track = getTrackByIndex(currentIndex);
    if (track && track.src) {
      play(track);
    } else {
      console.warn('[meditation] invalid track at index', currentIndex);
    }
    animate();
    
    const playerControls = document.getElementById("playerControls");
    const progressWrap = document.getElementById("progressWrap");
    const feedback = document.getElementById("meditationFeedback");
    if (playerControls) playerControls.style.display = 'flex';
    if (progressWrap) progressWrap.style.display = 'block';
    if (feedback) feedback.style.display = 'none';
    setTimeout(() => {
      trackingActive = true;
      updatePlayButton({ isPlaying: true });
    }, 500);
    
    SystemCore.analyzeMoodOnly(moodBeforeSession).then(result => {
      stateBeforeSession = result?.state || 'NEUTRAL';
    });
  } else {
    running = false;
    trackingActive = false;
    pause();
    cancelAnimationFrame(animationId);
    showFeedback();
    updatePlayButton({ isPlaying: false });
  }
}

function updateTrackHighlight() {
  document.querySelectorAll(".track").forEach(t => t.classList.remove("active"));
  const el = document.querySelector(`.track[data-index="${currentIndex}"]`);
  if (el) el.classList.add("active");
}

function updateButtonState(id, active) {
  const el = document.getElementById(id);
  if (el) {
    if (active) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

function animate() {
  if (!running) return;
  drawWaveProgress();
  animationId = requestAnimationFrame(animate);
}

function handleTrackEnd() {
  if (chainMode) {
    currentIndex = (currentIndex + 1) % getAllTracks().length;
    const track = getTrackByIndex(currentIndex);
    if (track) play(track);
  } else if (loopMode) {
    const track = getTrackByIndex(currentIndex);
    if (track) play(track);
  } else {
    running = false;
    showFeedback();
    updatePlayButton({ isPlaying: false });
  }
}

function handleTrackSwitch(dir) {
  const tracks = getAllTracks();
  if (tracks.length === 0) return;
  
  currentIndex = (currentIndex + dir + tracks.length) % tracks.length;
  const track = getTrackByIndex(currentIndex);
  if (track && running) {
    play(track);
  }
  renderTracks();
  updateTrackHighlight();
}

export function onExit() {
  console.log("onExit cleanup for", MODULE_NAME);
  
  if (audioUnsubscribe) {
    audioUnsubscribe();
    audioUnsubscribe = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }
  if (premiumChangeHandler) {
    document.removeEventListener('premiumChanged', premiumChangeHandler);
    premiumChangeHandler = null;
  }
  if (trackListClickHandler) {
    document.removeEventListener('click', trackListClickHandler);
    trackListClickHandler = null;
  }
  if (fileInputChangeHandler) {
    document.removeEventListener('change', fileInputChangeHandler);
    fileInputChangeHandler = null;
  }
  if (waveClickHandler) {
    document.removeEventListener('click', waveClickHandler);
    waveClickHandler = null;
  }
  if (waveTouchStartHandler) {
    document.removeEventListener('touchstart', waveTouchStartHandler);
    waveTouchStartHandler = null;
  }
  if (waveTouchMoveHandler) {
    document.removeEventListener('touchmove', waveTouchMoveHandler);
    waveTouchMoveHandler = null;
  }
  if (windowResizeHandler) {
    window.removeEventListener('resize', windowResizeHandler);
    windowResizeHandler = null;
  }
  AppRuntime.resetModule(MODULE_NAME);
  pause(); // Use pause instead of destroy to preserve audio state
  running = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  waveCanvas = null;
  waveCtx    = null;
  if (meditationContainer) {
    meditationContainer.innerHTML = '';
    meditationContainer = null;
  }
  const trackList = document.getElementById("trackList");
  if (trackList) trackList.remove();
}
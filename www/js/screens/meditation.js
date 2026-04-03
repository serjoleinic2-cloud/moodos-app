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

let canvas, ctx;
let animationId;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;

let meditationContainer = null;
let audioUnsubscribe = null;
let stateUnsubscribe = null;

let audioContext = null;
let analyser = null;
let audioSource = null;
let frequencyData = null;

const COLOR_PRESETS = [
  { inner: "#e0ccff", mid: "#9f7aea", outer: "#5a67d8", dark: "#1a202c" },
  { inner: "#ffe4b5", mid: "#ffa07a", outer: "#ff6347", dark: "#2d1f1f" },
  { inner: "#b0e0e6", mid: "#4682b4", outer: "#191970", dark: "#0d1b2a" },
  { inner: "#98fb98", mid: "#32cd32", outer: "#228b22", dark: "#1a2f1a" },
  { inner: "#dda0dd", mid: "#ba55d3", outer: "#8b008b", dark: "#1a0d1a" },
  { inner: "#ffd700", mid: "#ff8c00", outer: "#ff4500", dark: "#2d1a0d" },
];

let currentColorIndex = 0;

function initAudioAnalyser() {
  if (audioContext) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
  } catch(e) {
    console.warn('[Meditation] AudioAnalyser not available:', e);
  }
}

function connectAnalyser(trackSrc) {
  if (!audioContext || !analyser) return;
  if (audioSource) {
    try { audioSource.disconnect(); } catch(e) {}
  }
  const audio = new Audio();
  audio.src = trackSrc;
  audio.crossOrigin = "anonymous";
  audioSource = audioContext.createMediaElementSource(audio);
  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);
  audio.play();
}

function getMoodColors() {
  if (!analyser || !frequencyData) {
    return COLOR_PRESETS[currentColorIndex % COLOR_PRESETS.length];
  }
  analyser.getByteFrequencyData(frequencyData);
  
  let low = 0, mid = 0, high = 0;
  const len = frequencyData.length;
  for (let i = 0; i < len; i++) {
    if (i < len / 3) low += frequencyData[i];
    else if (i < len * 2 / 3) mid += frequencyData[i];
    else high += frequencyData[i];
  }
  
  const max = Math.max(low, mid, high);
  if (max === low) {
    currentColorIndex = 0;
  } else if (max === mid) {
    currentColorIndex = 2;
  } else {
    currentColorIndex = 4;
  }
  
  return COLOR_PRESETS[currentColorIndex % COLOR_PRESETS.length];
}

function selectTrackMood(trackIndex) {
  currentColorIndex = trackIndex % COLOR_PRESETS.length;
}

const standardTracks = [
  { name: "Celestial Tranquility", src: "assets/audio/meditation/Celestial Tranquility.mp3", builtin: true },
  { name: "Tibetan Serenity",      src: "assets/audio/meditation/Tibetan Serenity.mp3",      builtin: true },
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
let radiusBase = 105;

export async function onEnter(container) {
  // Cleanup previous subscriptions
  if (audioUnsubscribe) {
    audioUnsubscribe();
    audioUnsubscribe = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }

  const tracks = await loadCustomTracks();
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
  bindEvents();
  
  // Subscribe to audio state changes
  let wasPlaying = false;
  audioUnsubscribe = subscribe((audioState) => {
    updatePlayButton(audioState);
    updateProgress(audioState);
    
    if (wasPlaying && !audioState.isPlaying && running) {
      handleTrackEnd();
    }
    wasPlaying = audioState.isPlaying;
  });
  
  syncState();
  updatePlayButton();
}

function render(container) {
  initMeditation(container);
}

function bindEvents() {
  document.getElementById("trackList")?.addEventListener("click", (e) => {
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
    handleTrackSwitch();
  });

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

  const medProgress = document.getElementById("medProgress");
  if (medProgress) {
    const newMedProgress = medProgress.cloneNode(true);
    medProgress.replaceWith(newMedProgress);
    newMedProgress.oninput = (e) => {
      setCurrentTime(parseFloat(e.target.value));
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

  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="add-track"]')) {
      const input = document.getElementById("addTrackInput");
      if (input) input.click();
    }
  });

  // Event delegation for file input (persists after HTML replacement)
  document.addEventListener("change", (e) => {
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
      const fileNameBase = file.name.replace(/\.[^.]+$/, '');
      
      const isDuplicate = currentCustom.some(t => 
        t.name.toLowerCase() === fileNameBase.toLowerCase()
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
  });
}

function updateAddButton() {
  const wrap = document.getElementById("addTrackWrap");
  if (!wrap || !isPremium()) return;
  const state = AppRuntime.getState(MODULE_NAME);
  const count = (state.customTracks || []).length;
  const isDisabled = count >= MAX_CUSTOM_TRACKS;
  if (isDisabled) {
    wrap.innerHTML = `<div style="font-size:12px;color:#aaa;text-align:center;">${t("med_track_limit") || "Достигнут лимит (5 мелодий)"}</div>`;
    return;
  }
  wrap.innerHTML = `
    <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
    <button id="addTrackBtn" onclick="document.getElementById('addTrackInput').click()" style="padding:8px 20px;border:none;border-radius:12px;background:rgba(159,122,234,0.15);color:#7b4fa0;font-size:13px;font-weight:600;cursor:pointer;">+ ${t("med_add_track") || "Добавить мелодию"} (${count}/${MAX_CUSTOM_TRACKS})</button>
  `;
}

export function initMeditation(container) {
  const state = AppRuntime.getState(MODULE_NAME);
  const customCount = (state.customTracks || []).length;

  container.innerHTML = `
    <!-- ОСНОВНОЙ КОНТЕНТ -->
    <div class="meditation-content">
      <h2 class="meditation-title">${t("med_title")}</h2>

      <!-- ДОБАВИТЬ ТРЕК -->
      <div id="addTrackWrap">
        ${isPremium() ? `
          <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
          ${customCount < MAX_CUSTOM_TRACKS
            ? `<button id="addTrackBtn" class="add-track-btn" data-action="add-track">+ ${t("med_add_track") || "Добавить мелодию"} (${customCount}/${MAX_CUSTOM_TRACKS})</button>`
            : `<div class="track-limit-msg">${t("med_track_limit") || "Достигнут лимит (5 мелодий)"}</div>`
          }
        ` : ''}
      </div>
    </div>

    <!-- АНИМАЦИЯ (фон) -->
    <div class="meditation-canvas-wrap">
      <canvas id="meditationCanvas" width="560" height="560"></canvas>
    </div>

    <!-- КАРТОЧКА ПЛЕЙЕРА (фиксирована внизу) -->
    <div id="playerCard" class="meditation-player-card">
      <!-- ПОЛЗУНОК -->
      <div id="progressWrap" class="progress-wrap">
        <div id="medTimer" class="progress-timer">00:00 / 00:00</div>
        <input type="range" id="medProgress" value="0" min="0" step="1" class="progress-range">
      </div>

      <!-- КНОПКИ УПРАВЛЕНИЯ -->
      <div id="playerControls" class="player-controls">
        <div id="loopBtn" class="smallBtn">🔁</div>
        <div id="centerButton" class="mainBtn">▶</div>
        <div id="chainBtn" class="smallBtn">⏭</div>
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
  canvas = document.getElementById("meditationCanvas");
  ctx    = canvas.getContext("2d");

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
  const total = Math.floor(getDuration());
  
  const progress = document.getElementById("medProgress");
  if (progress) {
    progress.max = total || 300;
    progress.value = current;
  }
  
  const timer = document.getElementById("medTimer");
  if (timer) {
    const format = (sec) => {
      sec = Math.floor(sec);
      const m = Math.floor(sec / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };
    timer.innerText = `${format(current)} / ${format(total || 0)}`;
  }
}

function showPlayer() {
  document.getElementById("playerControls").style.display = "flex";
  document.getElementById("progressWrap").style.display = "block";
  document.getElementById("meditationFeedback").style.display = "none";
  updatePlayButton({ isPlaying: false });
}

function showFeedback() {
  document.getElementById("playerControls").style.display = "none";
  document.getElementById("progressWrap").style.display = "none";
  document.getElementById("meditationFeedback").style.display = "flex";
}

function toggleMeditation() {
  if (!running) {
    running = true;
    sessionStartTime = Date.now();
    moodBeforeSession = getMood();
    
    initAudioAnalyser();
    selectTrackMood(currentIndex);
    
    const track = getTrackByIndex(currentIndex);
    if (track) {
      play(track);
    }
    animate();
    
    document.getElementById("playerControls").style.display = "flex";
    document.getElementById("progressWrap").style.display = "block";
    document.getElementById("meditationFeedback").style.display = "none";
    setTimeout(() => updatePlayButton({ isPlaying: true }), 50);
    
    SystemCore.analyzeMoodOnly(moodBeforeSession).then(result => {
      stateBeforeSession = result?.state || 'NEUTRAL';
    });
  } else {
    running = false;
    pause();
    cancelAnimationFrame(animationId);
    showFeedback();
    updatePlayButton({ isPlaying: false });
  }
}

function updatePlayButton(audioState) {
  const btn = document.getElementById("centerButton");
  if (btn) {
    const state = audioState || getState();
    btn.innerText = state.isPlaying ? "❚❚" : "▶";
  }
}

function handleTrackEnd() {
  if (loopMode && chainMode) {
    const allTracks = getAllTracks();
    currentIndex = (currentIndex + 1) % allTracks.length;
    handleTrackSwitch(true);
    return;
  }
  
  if (loopMode) {
    setCurrentTime(0);
    resume();
    return;
  }
  
  if (chainMode) {
    const allTracks = getAllTracks();
    currentIndex = (currentIndex + 1) % allTracks.length;
    handleTrackSwitch(true);
    return;
  }
  
  running = false;
  cancelAnimationFrame(animationId);
  showFeedback();
  updatePlayButton();
}

function handleTrackSwitch(autoPlay = false) {
  const wasRunning = running;
  
  const track = getTrackByIndex(currentIndex);
  renderTracks();
  
  if (autoPlay || wasRunning) {
    if (track) {
      play(track);
      setTimeout(() => updatePlayButton({ isPlaying: true }), 50);
    }
    if (!wasRunning) {
      running = true;
      animate();
      document.getElementById("meditationFeedback").style.display = "none";
    }
  }
}

function updateTrackHighlight() {
  document.querySelectorAll(".track").forEach(t => t.classList.remove("active"));
  const el = document.querySelector(`.track[data-index="${currentIndex}"]`);
  if (el) el.classList.add("active");
}

function updateButtonState(id, active) {
  const el = document.getElementById(id);
  if (active) {
    el.style.boxShadow = "0 0 12px #b794f4";
    el.style.color     = "#9f7aea";
  } else {
    el.style.boxShadow = "none";
    el.style.color     = "#888";
  }
}

function animate() {
  if (!running) return;
  drawWave();
  animationId = requestAnimationFrame(animate);
}

function drawWave() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX       = canvas.width / 2;
  const centerY       = canvas.height / 2;
  const time          = performance.now() * 0.001;
  const waveAmplitude = 12;

  ctx.beginPath();
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.02) {
    const wave1 = Math.sin(angle * 3 + time) * waveAmplitude;
    const wave2 = Math.sin(angle * 6 - time * 0.7) * (waveAmplitude * 0.5);
    const r = radiusBase + wave1 + wave2;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (angle === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const colors = getMoodColors();
  const gradient = ctx.createRadialGradient(
    centerX, centerY, radiusBase * 0.3,
    centerX, centerY, radiusBase * 1.2
  );
  gradient.addColorStop(0,   colors.inner);
  gradient.addColorStop(0.4, colors.mid);
  gradient.addColorStop(0.7, colors.outer);
  gradient.addColorStop(1,   colors.dark);

  ctx.fillStyle   = gradient;
  ctx.shadowColor = colors.mid;
  ctx.shadowBlur  = 60;
  ctx.fill();
}

export function onExit() {
  if (audioUnsubscribe) {
    audioUnsubscribe();
    audioUnsubscribe = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }
  destroy();
  running = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    analyser = null;
    audioSource = null;
  }
  if (meditationContainer) {
    meditationContainer.innerHTML = '';
    meditationContainer = null;
  }
  const trackList = document.getElementById("trackList");
  if (trackList) trackList.remove();
}
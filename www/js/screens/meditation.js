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

const standardTracks = [
  { name: "Celestial Tranquility", src: "assets/audio/meditation/Celestial Tranquility.mp3", builtin: true },
  { name: "Tibetan Serenity",      src: "assets/audio/meditation/Tibetan Serenity.mp3",      builtin: true },
];
const MAX_CUSTOM_TRACKS = 5;
const MAX_FILE_SIZE_MB = 5;
const LS_CUSTOM_TRACKS = "med_custom_tracks";
const MODULE_NAME = 'meditation';

function loadCustomTracks() {
  try {
    return JSON.parse(localStorage.getItem(LS_CUSTOM_TRACKS)) || [];
  } catch(e) { return []; }
}

function saveCustomTracks(tracks) {
  try {
    localStorage.setItem(LS_CUSTOM_TRACKS, JSON.stringify(tracks));
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

export function onEnter(container) {
  console.log('[DEBUG] meditation onEnter called');
  
  // Cleanup previous subscriptions
  if (audioUnsubscribe) {
    audioUnsubscribe();
    audioUnsubscribe = null;
  }
  if (stateUnsubscribe) {
    stateUnsubscribe();
    stateUnsubscribe = null;
  }

  AppRuntime.initModule(MODULE_NAME, {
    customTracks: loadCustomTracks(),
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
  audioUnsubscribe = subscribe((audioState) => {
    updatePlayButton(audioState);
    updateProgress(audioState);
  });
  
  syncState();
  updatePlayButton();
}

function render(container) {
  initMeditation(container);
}

function bindEvents() {
  console.log('[DEBUG] meditation bindEvents called');

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
      updated.splice(customIdx, 1);
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
        console.log('[MELODY_DEBUG] Limit reached!');
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
      
      const newMelody = { name: fileNameBase, src: ev.target.result, builtin: false };
      if (!newMelody || !newMelody.name) {
        console.log('[MELODY_DEBUG] Invalid melody!');
        e.target.value = '';
        return;
      }
      const updated = [...currentCustom, newMelody];
      saveCustomTracks(updated);
      AppRuntime.setState(MODULE_NAME, { customTracks: updated });
      console.log('MELODY_ADD', { total: updated.length, last: newMelody });
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
  console.log('[DEBUG] initMeditation called');

  const state = AppRuntime.getState(MODULE_NAME);
  const customCount = (state.customTracks || []).length;

  container.innerHTML = `
    <!-- ОСНОВНОЙ КОНТЕНТ (скроллится) -->
    <div class="meditation-content">
      <h2 class="meditation-title">${t("med_title")}</h2>

      <!-- ТРЕКИ -->
      <div id="addTrackWrap">
        ${isPremium() ? `
          <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
          ${customCount < MAX_CUSTOM_TRACKS
            ? `<button id="addTrackBtn" class="add-track-btn" data-action="add-track">+ ${t("med_add_track") || "Добавить мелодию"} (${customCount}/${MAX_CUSTOM_TRACKS})</button>`
            : `<div class="track-limit-msg">${t("med_track_limit") || "Достигнут лимит (5 мелодий)"}</div>`
          }
        ` : ''}
      </div>
      <div id="trackList" class="track-list"></div>

      <!-- АНИМАЦИЯ -->
      <div class="meditation-canvas-wrap">
        <canvas id="meditationCanvas" width="320" height="320"></canvas>
      </div>
    </div>

    <!-- КАРТОЧКА ПЛЕЙЕРА (фиксирована внизу) -->
    <div id="playerCard" class="meditation-player-card">
      <!-- ПОЛЗУНОК -->
      <div id="progressWrap" class="progress-wrap">
        <input type="range" id="medProgress" value="0" min="0" step="1" class="progress-range">
        <div id="medTimer" class="progress-timer">00:00 / 00:00</div>
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

  renderTracks();
  updatePlayButton();
  updateProgress(getState());
}

function renderTracks() {
  const container = document.getElementById("trackList");
  if (!container) {
    console.log('[MELODY_DEBUG] trackList container not found!');
    return;
  }
  const state = AppRuntime.getState(MODULE_NAME);
  const allTracks = [...standardTracks, ...(state.customTracks || [])];
  if (currentIndex >= allTracks.length) currentIndex = 0;
  container.innerHTML = allTracks.map((tr, i) => `
    <div class="track${i === currentIndex ? ' active' : ''}" data-index="${i}">
      <span>${tr.name}</span>
      ${(!tr.builtin && isPremium()) ? `<span class="del-track" data-index="${i}" style="color:#e05555;font-size:18px;cursor:pointer;padding:0 4px;">✕</span>` : ''}
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
  document.getElementById("progressWrap").style.display = "block";
  document.getElementById("meditationFeedback").style.display = "flex";
}

function toggleMeditation() {
  if (!running) {
    running = true;
    sessionStartTime = Date.now();
    moodBeforeSession = getMood();
    
    const track = getTrackByIndex(currentIndex);
    if (track) {
      play(track);
    }
    animate();
    
    document.getElementById("playerControls").style.display = "flex";
    document.getElementById("progressWrap").style.display = "block";
    document.getElementById("meditationFeedback").style.display = "none";
    updatePlayButton({ isPlaying: true });
    
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
  updateTrackHighlight();
  
  if (autoPlay || wasRunning) {
    if (track) {
      play(track);
      updatePlayButton({ isPlaying: true });
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

  const gradient = ctx.createRadialGradient(
    centerX, centerY, radiusBase * 0.3,
    centerX, centerY, radiusBase * 1.2
  );
  gradient.addColorStop(0,   "#e0ccff");
  gradient.addColorStop(0.4, "#9f7aea");
  gradient.addColorStop(0.7, "#5a67d8");
  gradient.addColorStop(1,   "#1a202c");

  ctx.fillStyle   = gradient;
  ctx.shadowColor = "#b794f4";
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
  meditationContainer = null;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

console.log('ANTI_BUG_LAYER_OK', {
    meditation: AppRuntime.getState(MODULE_NAME),
    runtimeActive: true
});

console.log('ARL_SYNC_CHECK', {
    meditation: AppRuntime.getState(MODULE_NAME)
});
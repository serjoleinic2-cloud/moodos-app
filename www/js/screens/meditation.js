// ===============================
// Meditation Screen (Aura Advanced)
// ===============================
import SystemCore from "../system-core.js";
import { getMood } from "../state.js";
import { addSessionEntry } from "../services/memory.js";
import { t } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";
import { AppRuntime } from "../core/appRuntime.js";

let canvas, ctx;
let animationId;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;

let audio;
let isPlaying = false;
let meditationContainer = null;

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

  AppRuntime.initModule(MODULE_NAME, {
    customTracks: loadCustomTracks(),
    activeTrackId: null,
    maxTracks: MAX_CUSTOM_TRACKS
  });

  AppRuntime.subscribe(MODULE_NAME, (state) => {
    if (meditationContainer) {
      renderTracks();
      updateAddButton();
      initAudio();
    }
  });

  render(container);
  bindEvents();
}

function render(container) {
  initMeditation(container);
}

function bindEvents() {
  console.log('[DEBUG] meditation bindEvents called');

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isPlaying && audio) {
      audio.play().catch(() => {});
    }
  });

  document.getElementById("trackList")?.addEventListener("click", (e) => {
    const track = e.target.closest(".track");
    if (!track) return;
    if (e.target.classList.contains("del-track")) {
      e.stopPropagation();
      const idx = parseInt(track.dataset.index);
      const customIdx = idx - standardTracks.length;
      if (customIdx < 0) return;
      const state = AppRuntime.getState(MODULE_NAME);
      const updated = [...(state.customTracks || [])];
      updated.splice(customIdx, 1);
      saveCustomTracks(updated);
      AppRuntime.setState(MODULE_NAME, { customTracks: updated });
      if (currentIndex >= getAllTracks().length) currentIndex = 0;
      return;
    }
    currentIndex = parseInt(track.dataset.index);
    switchTrack();
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
      if (audio) audio.currentTime = e.target.value;
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

  const addTrackBtn = document.getElementById("addTrackBtn");
  if (addTrackBtn) {
    addTrackBtn.onclick = () => document.getElementById("addTrackInput")?.click();
  }
  const addTrackInput = document.getElementById("addTrackInput");
  if (addTrackInput) {
    addTrackInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(t("med_file_too_large") || "Файл слишком большой (макс. 5 МБ)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const state = AppRuntime.getState(MODULE_NAME);
        const currentCustom = state.customTracks || [];
        if (currentCustom.length >= MAX_CUSTOM_TRACKS) {
          console.log('[MELODY_DEBUG] Limit reached!');
          return;
        }
        const newMelody = { name: file.name.replace(/\.[^.]+$/, ''), src: ev.target.result, builtin: false };
        if (!newMelody || !newMelody.name) {
          console.log('[MELODY_DEBUG] Invalid melody!');
          return;
        }
        const updated = [...currentCustom, newMelody];
        saveCustomTracks(updated);
        AppRuntime.setState(MODULE_NAME, { customTracks: updated });
        console.log('MELODY_ADD', { total: updated.length, last: newMelody });
      };
      reader.readAsDataURL(file);
    };
  }
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
  const btn = document.createElement("button");
  btn.id = "addTrackBtn";
  btn.textContent = `+ ${t("med_add_track") || "Добавить мелодию"} (${count}/${MAX_CUSTOM_TRACKS})`;
  btn.style.cssText = "padding:8px 20px;border:none;border-radius:12px;background:rgba(159,122,234,0.15);color:#7b4fa0;font-size:13px;font-weight:600;cursor:pointer;";
  btn.onclick = () => document.getElementById("addTrackInput")?.click();
  wrap.innerHTML = '';
  wrap.appendChild(btn);
}

export function initMeditation(container) {
  console.log('[DEBUG] initMeditation called');

  const state = AppRuntime.getState(MODULE_NAME);
  const customCount = (state.customTracks || []).length;

  container.innerHTML = `
    <div style="text-align:center; padding-top:20px;">

      <h2 style="margin-bottom:12px;">${t("med_title")}</h2>

      <!-- ТРЕКИ -->
      <div id="addTrackWrap" style="margin-bottom:8px;">
        ${isPremium() ? `
          <input type="file" id="addTrackInput" accept="audio/*" style="display:none;">
          ${customCount < MAX_CUSTOM_TRACKS
            ? `<button id="addTrackBtn" style="padding:8px 20px;border:none;border-radius:12px;background:rgba(159,122,234,0.15);color:#7b4fa0;font-size:13px;font-weight:600;cursor:pointer;">+ ${t("med_add_track") || "Добавить мелодию"} (${customCount}/${MAX_CUSTOM_TRACKS})</button>`
            : `<div style="font-size:12px;color:#aaa;">${t("med_track_limit") || "Достигнут лимит (5 мелодий)"}</div>`
          }
        ` : ''}
      </div>
      <div id="trackList" class="track-list"></div>

      <!-- АНИМАЦИЯ -->
      <div style="position:relative; display:flex; justify-content:center;">
        <canvas id="meditationCanvas" width="320" height="320"></canvas>
      </div>

      <!-- КНОПКИ УПРАВЛЕНИЯ -->
      <div id="playerControls" style="
        display:flex; justify-content:center;
        align-items:center; gap:25px; margin-top:15px;">
        <div id="loopBtn" class="smallBtn">🔁</div>
        <div id="centerButton" class="mainBtn">▶</div>
        <div id="chainBtn" class="smallBtn">⏭</div>
      </div>

      <!-- ФИДБЕК -->
      <div id="meditationFeedback" style="
        display:none; margin-top:30px;
        flex-direction:column; gap:14px; align-items:center;">

        <div style="font-size:16px; color:#666; margin-bottom:6px;">${t("med_how_feel")}</div>

        <div id="medHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">
          👍 ${t("hist_helped")}
        </div>

        <div id="medNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">
          👎 ${t("hist_not_helped")}
        </div>

      </div>

    </div>

    <!-- ПОЛЗУНОК -->
    <div id="progressWrap" style="
      position:fixed;
      bottom:calc(160px + env(safe-area-inset-bottom));
      left:0; width:100%; text-align:center;">
      <input type="range" id="medProgress" value="0" min="0" step="1" style="width:85%;">
      <div id="medTimer" style="font-size:13px;color:#888;margin-top:6px;">00:00 / 00:00</div>
    </div>
  `;

  meditationContainer = container;
  canvas = document.getElementById("meditationCanvas");
  ctx    = canvas.getContext("2d");

  renderTracks();
  initAudio();
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

function initAudio() {
  const track = getTrackByIndex(currentIndex);
  if (!track) return;
  audio = new Audio(track.src);
  audio.preload = "metadata";

  audio.onloadedmetadata = () => {
    const progress = document.getElementById("medProgress");
    if (progress) progress.max = Math.floor(audio.duration);
    updateTimer();
  };

  audio.ontimeupdate = () => {
    const progress = document.getElementById("medProgress");
    if (progress) progress.value = Math.floor(audio.currentTime);
    updateTimer();
  };

  audio.onended = handleTrackEnd;

  setTimeout(() => {
    if (audio && audio.readyState < 1) {
      const progress = document.getElementById("medProgress");
      if (progress && progress.max === 0) progress.max = 300;
    }
  }, 2000);
}

function showPlayer() {
  document.getElementById("playerControls").style.display     = "flex";
  document.getElementById("trackList").style.display          = "block";
  document.getElementById("progressWrap").style.display       = "block";
  document.getElementById("meditationFeedback").style.display = "none";
  document.getElementById("centerButton").innerText = "▶";
}

function showFeedback() {
  document.getElementById("playerControls").style.display     = "none";
  document.getElementById("trackList").style.display          = "none";
  document.getElementById("progressWrap").style.display       = "none";
  document.getElementById("meditationFeedback").style.display = "flex";
}

async function toggleMeditation() {
  if (!running) {
    running = true;
    isPlaying = true;
    sessionStartTime   = Date.now();
    moodBeforeSession  = getMood();
    stateBeforeSession = (await SystemCore.analyzeMoodOnly(moodBeforeSession)).state;
    audio.play();
    animate();
    document.getElementById("centerButton").innerText = "❚❚";
    document.getElementById("meditationFeedback").style.display = "none";
  } else {
    running = false;
    isPlaying = false;
    audio.pause();
    cancelAnimationFrame(animationId);
    showFeedback();
  }
}

function handleTrackEnd() {
  if (loopMode) {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  if (chainMode) {
    currentIndex = (currentIndex + 1) % tracks.length;
    switchTrack(true);
    return;
  }
  running = false;
  isPlaying = false;
  cancelAnimationFrame(animationId);
  showFeedback();
}

function switchTrack(autoPlay = false) {
  const wasRunning = running;
  if (running) {
    running = false;
    isPlaying = false;
    audio.pause();
    cancelAnimationFrame(animationId);
  }
  initAudio();
  updateTrackHighlight();
  if (autoPlay || wasRunning) toggleMeditation();
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

function updateTimer() {
  const format = (sec) => {
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const current = format(audio.currentTime);
  const total   = format(audio.duration || 0);
  document.getElementById("medTimer").innerText = `${current} / ${total}`;
}

export function onExit() {
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  running = false;
  isPlaying = false;
  meditationContainer = null;
}

console.log('ANTI_BUG_LAYER_OK', {
    meditation: AppRuntime.getState(MODULE_NAME),
    runtimeActive: true
});

console.log('ARL_SYNC_CHECK', {
    meditation: AppRuntime.getState(MODULE_NAME)
});
// ===============================
// Meditation Screen (Aura Advanced)
// ===============================
import { detectMoodState } from "../services/state-engine.js";
import { getMood } from "../state.js";
import { addSessionEntry } from "../services/memory.js";

let canvas, ctx;
let animationId;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;

let audio;
let tracks = ["aura-light.mp3", "deep-balance.mp3"];
let currentIndex = 0;

let loopMode  = false;
let chainMode = false;
let radiusBase = 105;

export function initMeditation(container) {

  container.innerHTML = `
    <div style="text-align:center; padding-top:20px;">

      <h2 style="margin-bottom:12px;">Медитация</h2>

      <!-- ТРЕКИ -->
      <div id="trackList" style="margin-bottom:15px;">
        <div class="track active" data-index="0">Aura Light</div>
        <div class="track" data-index="1">Deep Balance</div>
      </div>

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

      <!-- ФИДБЕК — скрыт по умолчанию -->
      <div id="meditationFeedback" style="
        display:none; margin-top:30px;
        flex-direction:column; gap:14px; align-items:center;">

        <div style="font-size:16px; color:#666; margin-bottom:6px;">Как ты себя чувствуешь?</div>

        <div id="medHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">
          👍 Помогло
        </div>

        <div id="medNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">
          👎 Не помогло
        </div>

      </div>

    </div>

    <!-- ПОЛЗУНОК -->
    <div id="progressWrap" style="
      position:fixed;
      bottom:calc(88px + env(safe-area-inset-bottom));
      left:0; width:100%; text-align:center;">
      <input type="range" id="medProgress" value="0" min="0" step="1" style="width:85%;">
      <div id="medTimer" style="font-size:13px;color:#888;margin-top:6px;">00:00 / 00:00</div>
    </div>
  `;

  canvas = document.getElementById("meditationCanvas");
  ctx    = canvas.getContext("2d");

  initAudio();
  attachEvents();
}

function initAudio() {
  audio = new Audio(`assets/audio/meditation/${tracks[currentIndex]}`);
  audio.preload = "metadata";

  audio.onloadedmetadata = () => {
    document.getElementById("medProgress").max = Math.floor(audio.duration);
    updateTimer();
  };

  audio.ontimeupdate = () => {
    document.getElementById("medProgress").value = Math.floor(audio.currentTime);
    updateTimer();
  };

  audio.onended = handleTrackEnd;
}

function attachEvents() {

  document.getElementById("centerButton").onclick = toggleMeditation;

  document.getElementById("loopBtn").onclick = () => {
    loopMode = !loopMode;
    updateButtonState("loopBtn", loopMode);
  };

  document.getElementById("chainBtn").onclick = () => {
    chainMode = !chainMode;
    updateButtonState("chainBtn", chainMode);
  };

  document.getElementById("medProgress").oninput = (e) => {
    audio.currentTime = e.target.value;
  };

  document.querySelectorAll(".track").forEach(track => {
    track.onclick = () => {
      currentIndex = parseInt(track.dataset.index);
      switchTrack();
    };
  });

  document.getElementById("medHelped").onclick = () => {
    const moodAfter = getMood();
    const duration  = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const stateAfter = detectMoodState(moodAfter);

addSessionEntry({
  type: "meditation",
  moodBefore: moodBeforeSession,
  stateBefore: stateBeforeSession,
  moodAfter,
  stateAfter,
  result: "positive",
  duration,
  timestamp: Date.now()
});
    sessionStartTime  = null;
    moodBeforeSession = null;
    showPlayer();
  };

  document.getElementById("medNotHelped").onclick = () => {
    const moodAfter = getMood();
    const duration  = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const stateAfter = detectMoodState(moodAfter);

addSessionEntry({
  type: "meditation",
  moodBefore: moodBeforeSession,
  stateBefore: stateBeforeSession,
  moodAfter,
  stateAfter,
  result: "negative",
  duration,
  timestamp: Date.now()
});
    sessionStartTime  = null;
    moodBeforeSession = null;
    showPlayer();
  };
}

function showPlayer() {
  document.getElementById("playerControls").style.display = "flex";
  document.getElementById("trackList").style.display      = "block";
  document.getElementById("progressWrap").style.display   = "block";
  document.getElementById("meditationFeedback").style.display = "none";
  document.getElementById("centerButton").innerText = "▶";
}

function showFeedback() {
  document.getElementById("playerControls").style.display = "none";
  document.getElementById("trackList").style.display      = "none";
  document.getElementById("progressWrap").style.display   = "none";
  document.getElementById("meditationFeedback").style.display = "flex";
}

function toggleMeditation() {
  if (!running) {
    running = true;
    sessionStartTime  = Date.now();
    moodBeforeSession = getMood();
	stateBeforeSession = detectMoodState(moodBeforeSession);
    audio.play();
    animate();
    document.getElementById("centerButton").innerText = "❚❚";
    document.getElementById("meditationFeedback").style.display = "none";
  } else {
    running = false;
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
  cancelAnimationFrame(animationId);
  showFeedback();
}

function switchTrack(autoPlay = false) {
  const wasRunning = running;
  if (running) {
    running = false;
    audio.pause();
    cancelAnimationFrame(animationId);
  }
  initAudio();
  updateTrackHighlight();
  if (autoPlay || wasRunning) toggleMeditation();
}

function updateTrackHighlight() {
  document.querySelectorAll(".track").forEach(t => t.classList.remove("active"));
  document.querySelector(`.track[data-index="${currentIndex}"]`).classList.add("active");
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

  const centerX      = canvas.width / 2;
  const centerY      = canvas.height / 2;
  const time         = performance.now() * 0.001;
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

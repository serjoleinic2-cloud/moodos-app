// ===============================
// Breathing Wave Module
// ===============================
import { getMood } from "./state.js";
import { addSessionEntry } from "./services/memory.js";
import { detectMoodState } from "./services/state-engine.js";

let animationId;
let phaseIndex = 0;
let phaseStartTime = 0;
let cycleCount = 0;

let inhaleDuration = 4000;
let holdDuration = 4000;
let exhaleDuration = 6000;

let phases = [];
let canvas, ctx;
let currentRadius = 80;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;

export function initBreathing(container) {

  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:15px;">Дыхание</h2>

      <!-- РЕЖИМЫ -->
      <div id="breathModes" style="margin-bottom:10px;">
        <button class="breathMode" data-set="2-2-4" style="
          margin:4px; padding:8px 16px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px;">2-2-4</button>
        <button class="breathMode" data-set="4-4-6" style="
          margin:4px; padding:8px 16px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px;">4-4-6</button>
        <button class="breathMode" data-set="4-7-8" style="
          margin:4px; padding:8px 16px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px;">4-7-8</button>
      </div>

      <div id="selectedMode" style="margin-bottom:10px;font-size:14px;color:#666;">
        Выбран: 4-4-6
      </div>

      <!-- АНИМАЦИЯ -->
      <div id="breathingCanvasWrap">
        <canvas id="breathingCanvas" width="320" height="320"></canvas>
        <div id="breathingText" style="margin:10px 0; font-size:22px; font-weight:600;">Готово</div>
        <div id="breathingTimer" style="font-size:36px; font-weight:bold; margin-bottom:4px;">0</div>
        <div id="cycleCounter" style="font-size:14px; color:#888; margin-bottom:10px;">Циклов: 0</div>
      </div>

      <!-- КНОПКА СТАРТ/СТОП -->
      <div style="margin-top:15px; display:flex; justify-content:center;">
        <div id="breathingMainBtn" class="mainBtn">▶</div>
      </div>

      <!-- ФИДБЕК — скрыт по умолчанию -->
      <div id="breathingFeedback" style="display:none; margin-top:30px; flex-direction:column; gap:14px; align-items:center;">

        <div style="font-size:16px; color:#666; margin-bottom:6px;">Как ты себя чувствуешь?</div>

        <div id="breathingHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">
          👍 Помогло
        </div>

        <div id="breathingNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">
          👎 Не помогло
        </div>

      </div>

    </div>
  `;

  canvas = document.getElementById("breathingCanvas");
  ctx = canvas.getContext("2d");

  document.querySelectorAll(".breathMode").forEach(btn => {
    btn.onclick = () => {
      const set = btn.dataset.set.split("-");
      inhaleDuration = parseInt(set[0]) * 1000;
      holdDuration   = parseInt(set[1]) * 1000;
      exhaleDuration = parseInt(set[2]) * 1000;
      document.getElementById("selectedMode").innerText = "Выбран: " + btn.dataset.set;
      updatePhases();
      if (!running) return;
      phaseIndex = 0;
      phaseStartTime = performance.now();
    };
  });

  updatePhases();

  const mainBtn      = document.getElementById("breathingMainBtn");
  const feedback     = document.getElementById("breathingFeedback");
  const canvasWrap   = document.getElementById("breathingCanvasWrap");
  const breathModes  = document.getElementById("breathModes");
  const selectedMode = document.getElementById("selectedMode");

  function showPlayer() {
    canvasWrap.style.display   = "block";
    breathModes.style.display  = "block";
    selectedMode.style.display = "block";
    mainBtn.style.display      = "flex";
    feedback.style.display     = "none";
  }

  function showFeedback() {
    canvasWrap.style.display   = "none";
    breathModes.style.display  = "none";
    selectedMode.style.display = "none";
    mainBtn.style.display      = "none";
    feedback.style.display     = "flex";
  }

  mainBtn.onclick = () => {
    if (!running) {
      startBreathing();
      mainBtn.innerText = "⏸";
    } else {
      stopBreathing();
      showFeedback();
    }
  };

  document.getElementById("breathingHelped").onclick = () => {
    const moodAfter = getMood();
    const duration  = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const stateAfter = detectMoodState(moodAfter);

addSessionEntry({
  type: "breathing",
  moodBefore: moodBeforeSession,
  stateBefore: stateBeforeSession,
  moodAfter,
  stateAfter,
  result: "positive",
  duration,
  timestamp: Date.now()
});

    sessionStartTime = null;
    moodBeforeSession = null;
    showPlayer();
    document.getElementById("breathingText").innerText = "Готово";
    mainBtn.innerText = "▶";
  };

  document.getElementById("breathingNotHelped").onclick = () => {
    const moodAfter = getMood();
    const duration  = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    addSessionEntry({
      type: "breathing",
      moodBefore: moodBeforeSession,
      moodAfter,
      result: "negative",
      duration,
      timestamp: Date.now()
    });
    sessionStartTime = null;
    moodBeforeSession = null;
    showPlayer();
    document.getElementById("breathingText").innerText = "Готово";
    mainBtn.innerText = "▶";
  };
}

function updatePhases() {
  phases = [
    { name: "Inhale", duration: inhaleDuration },
    { name: "Hold",   duration: holdDuration },
    { name: "Exhale", duration: exhaleDuration },
    { name: "Hold",   duration: holdDuration }
  ];
}

function startBreathing() {
  if (running) return;
  running = true;
  sessionStartTime  = Date.now();
  moodBeforeSession = getMood();
  stateBeforeSession = detectMoodState(moodBeforeSession);
  phaseIndex        = 0;
  phaseStartTime    = performance.now();
  cycleCount        = 0;
  currentRadius     = 80;
  const el = document.getElementById("cycleCounter");
  if (el) el.innerText = "Циклов: 0";
  animate();
}

function stopBreathing() {
  running = false;
  cancelAnimationFrame(animationId);
}

function animate() {
  if (!running) return;

  const phase   = phases[phaseIndex];
  const now     = performance.now();
  const elapsed = now - phaseStartTime;
  const progress = elapsed / phase.duration;

  if (elapsed >= phase.duration) {
    phaseIndex = (phaseIndex + 1) % phases.length;
    if (phaseIndex === 0) {
      cycleCount++;
      const el = document.getElementById("cycleCounter");
      if (el) el.innerText = "Циклов: " + cycleCount;
    }
    phaseStartTime = now;
    animationId = requestAnimationFrame(animate);
    return;
  }

  updateTimer(progress, phase);
  drawWave(progress, phase.name);

  const names = { "Inhale": "Вдох", "Hold": "Задержка", "Exhale": "Выдох" };
  const el = document.getElementById("breathingText");
  if (el) el.innerText = names[phase.name] || phase.name;

  animationId = requestAnimationFrame(animate);
}

function updateTimer(progress, phase) {
  const timerEl  = document.getElementById("breathingTimer");
  const totalSec = phase.duration / 1000;

  if (phase.name === "Inhale") {
    timerEl.innerText = Math.floor(progress * totalSec) + 1;
  } else if (phase.name === "Exhale") {
    timerEl.innerText = Math.ceil((1 - progress) * totalSec) || 1;
  } else {
    timerEl.innerText = "-";
  }
}

function drawWave(progress, phaseName) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const ease    = (t) => 0.5 - Math.cos(t * Math.PI) / 2;
  const eased   = ease(progress);

  let targetRadius;
  if (phaseName === "Inhale")      targetRadius = 80 + 50 * eased;
  else if (phaseName === "Exhale") targetRadius = 130 - 50 * eased;
  else                             targetRadius = currentRadius;

  currentRadius += (targetRadius - currentRadius) * 0.08;

  const r        = currentRadius;
  const time     = performance.now() * 0.0008;
  const softWave = Math.sin(time) * 2.5;

  ctx.beginPath();
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.02) {
    const rx = (r + softWave) * Math.cos(angle) + centerX;
    const ry = (r + softWave) * Math.sin(angle) + centerY;
    if (angle === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();

  const gradient = ctx.createRadialGradient(centerX, centerY, r * 0.2, centerX, centerY, r * 1.3);
  gradient.addColorStop(0,   "#dff1ff");
  gradient.addColorStop(0.6, "#4db8ff");
  gradient.addColorStop(1,   "#00e1ff");

  ctx.fillStyle   = gradient;
  ctx.shadowColor = "#00c8ff";
  ctx.shadowBlur  = 40;
  ctx.fill();
}

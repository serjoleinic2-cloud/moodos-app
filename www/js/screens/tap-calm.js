// ===============================
// Neyra Tap Calm
// Тактильная разрядка — 60 секунд
// ===============================
import { getMood } from "../state.js";
import { addSessionEntry, getLastRealMood } from "../services/memory.js";
import SystemCore from "../system-core.js";
import { t } from "../i18n.js";

let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;
let countdownInterval = null;
let tapCount = 0;
let canvas, ctx;
let ripples = [];
let animationId = null;
let result = null;

const DURATION = 60;

export function onEnter(container) {
  console.log('[DEBUG] tap-calm onEnter called');
  render(container);
  bindEvents();
}

function render(container) {
  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:6px;">${t("tc_title")}</h2>
      <div style="font-size:14px; color:#888; margin-bottom:16px;">
        ${t("tc_subtitle")}
      </div>

      <!-- ПОЛЕ КАСАНИЯ -->
      <div id="tcFieldWrap" style="margin-bottom:14px; padding:0 4px;">
        <canvas id="tcCanvas" style="
          width:100%; height:220px;
          border-radius:20px; display:block;
          background:#e0e5ec;
          box-shadow: inset 6px 6px 14px #b8bec7, inset -6px -6px 14px #ffffff;
          cursor:pointer; touch-action:none;
        "></canvas>
        <div id="tcHint" style="font-size:13px; color:#aaa; margin-top:8px;">
          ${t("tc_hint")}
        </div>
      </div>

      <!-- СЧЁТЧИК НАЖАТИЙ -->
      <div id="tcTapCount" style="font-size:16px; color:#888; margin-bottom:12px;">
        ${t("tc_taps")}: <span id="tcCount">0</span>
      </div>

      <!-- ПРОГРЕСС-БАР -->
      <div style="
        width:100%; height:6px; border-radius:3px;
        background:#e0e5ec;
        box-shadow: inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff;
        margin-bottom:12px; overflow:hidden;">
        <div id="tcProgress" style="
          height:100%; width:0%; border-radius:3px;
          background: linear-gradient(90deg, #86efac, #22c55e);
          transition: width 1s linear;
        "></div>
      </div>

      <!-- ТАЙМЕР -->
      <div style="margin-bottom:16px;">
        <div id="tcTimer" style="font-size:42px; font-weight:bold; color:#22c55e;">1:00</div>
        <div id="tcStatus" style="font-size:14px; color:#888; margin-top:4px;">${t("tc_ready")}</div>
      </div>

      <!-- КНОПКА -->
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <button id="tcMainBtn" class="mainBtn" style="border:none;border-radius:50%;width:72px;height:72px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <img id="tcPlayIcon" src="/icons/player/play.svg" style="width:28px;height:28px;">
        </button>
      </div>

      <!-- ФИДБЕК -->
      <div id="tcFeedback" style="display:none; flex-direction:column; gap:14px; align-items:center; margin-top:10px;">
        <div style="font-size:16px; color:#666; margin-bottom:4px;">${t("tc_how_feel")}</div>
        <div id="tcTapResult" style="font-size:13px; color:#aaa; margin-bottom:8px;"></div>
        <div id="tcHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">👍 ${t("hist_helped")}</div>
        <div id="tcNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">👎 ${t("hist_not_helped")}</div>
      </div>

    </div>
  `;
}

function bindEvents() {
  console.log('[DEBUG] tap-calm bindEvents called');

  canvas = document.getElementById("tcCanvas");
  if (canvas) {
    const newCanvas = canvas.cloneNode(true);
    canvas.replaceWith(newCanvas);
    canvas = newCanvas;
    
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 320;
      canvas.height = rect.height || 220;
    }
    resizeCanvas();
    ctx = canvas.getContext("2d");

    canvas.onpointerdown = (e) => {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      addRipple(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      );
    };
  }

  const mainBtn = document.getElementById("tcMainBtn");
  if (mainBtn) {
    const newMainBtn = mainBtn.cloneNode(true);
    mainBtn.replaceWith(newMainBtn);
    newMainBtn.onclick = async () => {
      if (!running) {
        await startSession();
      } else {
        stopSession();
        showFeedback();
      }
    };
  }

  const tcHelped = document.getElementById("tcHelped");
  if (tcHelped) {
    const newTcHelped = tcHelped.cloneNode(true);
    tcHelped.replaceWith(newTcHelped);
    newTcHelped.onclick = () => {
      if (newTcHelped.dataset.locked) return;
      newTcHelped.dataset.locked = 'true';
      console.log('tap calm helped');
      saveSessionWithResult("positive");
      setTimeout(() => { newTcHelped.dataset.locked = ''; }, 1000);
    };
  }

  const tcNotHelped = document.getElementById("tcNotHelped");
  if (tcNotHelped) {
    const newTcNotHelped = tcNotHelped.cloneNode(true);
    tcNotHelped.replaceWith(newTcNotHelped);
    newTcNotHelped.onclick = () => {
      if (newTcNotHelped.dataset.locked) return;
      newTcNotHelped.dataset.locked = 'true';
      console.log('tap calm not helped');
      saveSessionWithResult("negative");
      setTimeout(() => { newTcNotHelped.dataset.locked = ''; }, 1000);
    };
  }
}

function getElements() {
  return {
    mainBtn: document.getElementById("tcMainBtn"),
    feedback: document.getElementById("tcFeedback"),
    status: document.getElementById("tcStatus"),
    progress: document.getElementById("tcProgress")
  };
}

function updateTimerDisplay(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const timerEl = document.getElementById("tcTimer");
  const progressEl = document.getElementById("tcProgress");
  if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  if (progressEl) progressEl.style.width = ((DURATION - sec) / DURATION * 100) + "%";
}

function showPlayer() {
  const { mainBtn, feedback } = getElements();
  
  document.getElementById("tcFieldWrap").style.display = "block";
  document.getElementById("tcTapCount").style.display = "block";
  if (mainBtn) mainBtn.style.display = "flex";
  if (feedback) feedback.style.display = "none";
  
  tapCount = 0;
  const countEl = document.getElementById("tcCount");
  if (countEl) countEl.textContent = "0";
  
  const progressEl = document.getElementById("tcProgress");
  if (progressEl) progressEl.style.width = "0%";
  
  updateTimerDisplay(DURATION);
  
  const status = document.getElementById("tcStatus");
  if (status) status.textContent = t("tc_ready");
  
  ripples = [];
}

function showFeedback() {
  const { mainBtn, feedback } = getElements();
  
  document.getElementById("tcFieldWrap").style.display = "none";
  document.getElementById("tcTapCount").style.display = "none";
  if (mainBtn) mainBtn.style.display = "none";
  if (feedback) feedback.style.display = "flex";
  
  const resultEl = document.getElementById("tcTapResult");
  if (resultEl) resultEl.textContent = `${t("tc_result")} ${tapCount} ${t("tc_taps").toLowerCase()}`;
}

async function startSession() {
  const { mainBtn, status } = getElements();
  
  running = true;
  sessionStartTime = Date.now();
  moodBeforeSession = getLastRealMood() ?? getMood();
  const analysisResult = await SystemCore.analyzeMoodOnly(moodBeforeSession);
  stateBeforeSession = analysisResult ? analysisResult.state : null;
  
  const icon1 = document.getElementById("tcPlayIcon");
  if (icon1) icon1.src = "/icons/player/pause.svg";
  if (status) status.textContent = t("tc_tapping");
  
  tapCount = 0;
  const countEl = document.getElementById("tcCount");
  if (countEl) countEl.textContent = "0";
  ripples = [];

  let remaining = DURATION;
  updateTimerDisplay(remaining);

  countdownInterval = setInterval(() => {
    remaining--;
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      stopSession();
      showFeedback();
    }
  }, 1000);

  drawLoop();
}

function stopSession() {
  const { mainBtn, status } = getElements();
  
  running = false;
  if (animationId) cancelAnimationFrame(animationId);
  if (countdownInterval) clearInterval(countdownInterval);
  if (status) status.textContent = t("tc_done");
  const icon2 = document.getElementById("tcPlayIcon");
  if (icon2) icon2.src = "/icons/player/play.svg";
}

function drawLoop() {
  if (!ctx) return;
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ripples = ripples.filter(r => r.alpha > 0.01);

  ripples.forEach(r => {
    r.radius += 3.5;
    r.alpha *= 0.93;

    const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
    grad.addColorStop(0, `rgba(34, 197, 94, ${r.alpha * 0.6})`);
    grad.addColorStop(0.5, `rgba(134, 239, 172, ${r.alpha * 0.3})`);
    grad.addColorStop(1, `rgba(34, 197, 94, 0)`);

    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(34, 197, 94, ${r.alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  if (running || ripples.length > 0) {
    animationId = requestAnimationFrame(drawLoop);
  }
}

function addRipple(x, y) {
  if (!running) return;
  ripples.push({ x, y, radius: 8, alpha: 0.9 });
  tapCount++;
  const countEl = document.getElementById("tcCount");
  if (countEl) countEl.textContent = tapCount;
  if (navigator.vibrate) navigator.vibrate(18);
}

async function saveSession() {
  const moodAfter = getMood();
  const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  const analysisResult = await SystemCore.analyzeMoodOnly(moodAfter);
  const stateAfter = analysisResult ? analysisResult.state : null;
  
  addSessionEntry({
    type: "tap-calm",
    moodBefore: moodBeforeSession,
    stateBefore: stateBeforeSession,
    moodAfter,
    stateAfter,
    result,
    duration,
    tapCount,
    timestamp: Date.now()
  });
  
  sessionStartTime = null;
  moodBeforeSession = null;
  showPlayer();
}

function saveSessionWithResult(res) {
  result = res;
  saveSession();
}

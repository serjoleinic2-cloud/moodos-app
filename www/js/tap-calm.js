// ===============================
// MoodOS Tap Calm
// Тактильная разрядка — 60 секунд
// ===============================
import { getMood } from "./state.js";
import { addSessionEntry } from "./services/memory.js";
import { detectMoodState } from "./services/state-engine.js";

let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;
let countdownInterval = null;
let tapCount = 0;
let canvas, ctx;
let ripples = [];
let animationId = null;

const DURATION = 60;

export function initTapCalm(container) {

  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:6px;">Тактильная разрядка</h2>
      <div style="font-size:14px; color:#888; margin-bottom:16px;">
        Нажимай на поле в своём ритме · 60 секунд
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
          Нажми старт, затем касайся экрана
        </div>
      </div>

      <!-- СЧЁТЧИК НАЖАТИЙ -->
      <div id="tcTapCount" style="
        font-size:16px; color:#888; margin-bottom:12px;">
        Нажатий: <span id="tcCount">0</span>
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
        <div id="tcStatus" style="font-size:14px; color:#888; margin-top:4px;">Готово к старту</div>
      </div>

      <!-- КНОПКА -->
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <div id="tcMainBtn" class="mainBtn">▶</div>
      </div>

      <!-- ФИДБЕК -->
      <div id="tcFeedback" style="display:none; flex-direction:column; gap:14px; align-items:center; margin-top:10px;">
        <div style="font-size:16px; color:#666; margin-bottom:4px;">Как ты себя чувствуешь?</div>
        <div id="tcTapResult" style="font-size:13px; color:#aaa; margin-bottom:8px;"></div>
        <div id="tcHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">👍 Помогло</div>
        <div id="tcNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">👎 Не помогло</div>
      </div>

    </div>
  `;

  canvas = document.getElementById("tcCanvas");
  // Устанавливаем реальный размер canvas
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  || 320;
    canvas.height = rect.height || 220;
  }
  resizeCanvas();
  ctx = canvas.getContext("2d");

  const mainBtn  = document.getElementById("tcMainBtn");
  const feedback = document.getElementById("tcFeedback");
  const status   = document.getElementById("tcStatus");
  const progress = document.getElementById("tcProgress");

  function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    document.getElementById("tcTimer").textContent =
      `${m}:${String(s).padStart(2, "0")}`;
    progress.style.width = ((DURATION - sec) / DURATION * 100) + "%";
  }

  function showPlayer() {
    document.getElementById("tcFieldWrap").style.display = "block";
    document.getElementById("tcTapCount").style.display  = "block";
    mainBtn.style.display  = "flex";
    feedback.style.display = "none";
    tapCount = 0;
    document.getElementById("tcCount").textContent = "0";
    progress.style.width = "0%";
    updateTimerDisplay(DURATION);
    status.textContent = "Готово к старту";
    ripples = [];
  }

  function showFeedback() {
    document.getElementById("tcFieldWrap").style.display = "none";
    document.getElementById("tcTapCount").style.display  = "none";
    mainBtn.style.display  = "none";
    feedback.style.display = "flex";
    document.getElementById("tcTapResult").textContent =
      `Ты сделал ${tapCount} нажатий`;
  }

  function startSession() {
    running = true;
    sessionStartTime   = Date.now();
    moodBeforeSession  = getMood();
    stateBeforeSession = detectMoodState(moodBeforeSession);
    mainBtn.innerText  = "⏸";
    status.textContent = "Нажимай в своём ритме...";
    tapCount = 0;
    document.getElementById("tcCount").textContent = "0";
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
    running = false;
    cancelAnimationFrame(animationId);
    clearInterval(countdownInterval);
    status.textContent = "Готово";
    mainBtn.innerText  = "▶";
  }

  // Рисуем рябь
  function drawLoop() {
    if (!ctx) return;
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ripples = ripples.filter(r => r.alpha > 0.01);

    ripples.forEach(r => {
      r.radius += 3.5;
      r.alpha  *= 0.93;

      const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
      grad.addColorStop(0,   `rgba(34, 197, 94, ${r.alpha * 0.6})`);
      grad.addColorStop(0.5, `rgba(134, 239, 172, ${r.alpha * 0.3})`);
      grad.addColorStop(1,   `rgba(34, 197, 94, 0)`);

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Кольцо
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 197, 94, ${r.alpha * 0.5})`;
      ctx.lineWidth   = 1.5;
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
    document.getElementById("tcCount").textContent = tapCount;

    // Вибрация на мобильном
    if (navigator.vibrate) navigator.vibrate(18);
  }

  // Обработка касаний и кликов
  canvas.addEventListener("pointerdown", (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    addRipple(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY
    );
  });

  mainBtn.onclick = () => {
    if (!running) {
      startSession();
    } else {
      stopSession();
      showFeedback();
    }
  };

  function saveSession(result) {
    const moodAfter  = getMood();
    const duration   = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;
    const stateAfter = detectMoodState(moodAfter);
    addSessionEntry({
      type: "tap-calm",
      moodBefore:  moodBeforeSession,
      stateBefore: stateBeforeSession,
      moodAfter,
      stateAfter,
      result,
      duration,
      tapCount,
      timestamp: Date.now()
    });
    sessionStartTime  = null;
    moodBeforeSession = null;
    showPlayer();
  }

  document.getElementById("tcHelped").onclick    = () => saveSession("positive");
  document.getElementById("tcNotHelped").onclick = () => saveSession("negative");
}

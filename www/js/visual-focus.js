// ===============================
// MoodOS Visual Focus (EMDR-style)
// Зрительный якорь — 2 минуты
// ===============================
import { getMood } from "./state.js";
import { addSessionEntry } from "./services/memory.js";
import { detectMoodState } from "./services/state-engine.js";

let animationId = null;
let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;
let countdownInterval = null;

const DURATION = 120; // секунд

export function initVisualFocus(container) {

  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:6px;">Зрительный якорь</h2>
      <div style="font-size:14px; color:#888; margin-bottom:20px;">
        Следи глазами за шариком · 2 минуты
      </div>

      <!-- СКОРОСТЬ -->
      <div id="vfSpeedRow" style="display:flex; justify-content:center; gap:10px; margin-bottom:16px;">
        <button class="vfSpeed" data-speed="slow" style="
          padding:8px 18px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec; box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px;">Медленно</button>
        <button class="vfSpeed" data-speed="normal" style="
          padding:8px 18px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec; box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px; font-weight:600;">Нормально</button>
        <button class="vfSpeed" data-speed="fast" style="
          padding:8px 18px; border:none; border-radius:12px; cursor:pointer;
          background:#e0e5ec; box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
          color:#555; font-size:14px;">Быстро</button>
      </div>

      <!-- ПОЛЕ -->
      <div id="vfField" style="
        position:relative; width:100%; height:160px;
        border-radius:20px; background:#e0e5ec;
        box-shadow: inset 6px 6px 12px #b8bec7, inset -6px -6px 12px #ffffff;
        overflow:hidden; margin-bottom:16px;">
        <div id="vfDot" style="
          position:absolute; top:50%; transform:translateY(-50%);
          width:36px; height:36px; border-radius:50%;
          background: radial-gradient(circle at 35% 35%, #a78bfa, #6d28d9);
          box-shadow: 0 0 18px #a78bfa;
          left:10px; transition: none;
        "></div>
      </div>

      <!-- ТАЙМЕР -->
      <div id="vfTimerWrap" style="margin-bottom:16px;">
        <div id="vfTimer" style="font-size:42px; font-weight:bold; color:#6d28d9;">2:00</div>
        <div id="vfStatus" style="font-size:14px; color:#888; margin-top:4px;">Готово к старту</div>
      </div>

      <!-- КНОПКА -->
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <div id="vfMainBtn" class="mainBtn">▶</div>
      </div>

      <!-- ФИДБЕК -->
      <div id="vfFeedback" style="display:none; flex-direction:column; gap:14px; align-items:center; margin-top:10px;">
        <div style="font-size:16px; color:#666; margin-bottom:6px;">Как ты себя чувствуешь?</div>
        <div id="vfHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">👍 Помогло</div>
        <div id="vfNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">👎 Не помогло</div>
      </div>

    </div>
  `;

  let speedMs = 2200; // нормально = 2.2 сек туда-обратно

  document.querySelectorAll(".vfSpeed").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".vfSpeed").forEach(b => b.style.fontWeight = "normal");
      btn.style.fontWeight = "600";
      const s = btn.dataset.speed;
      if (s === "slow")   speedMs = 3500;
      if (s === "normal") speedMs = 2200;
      if (s === "fast")   speedMs = 1200;
    };
  });

  const mainBtn  = document.getElementById("vfMainBtn");
  const feedback = document.getElementById("vfFeedback");
  const dot      = document.getElementById("vfDot");
  const field    = document.getElementById("vfField");
  const status   = document.getElementById("vfStatus");

  function showPlayer() {
    document.getElementById("vfSpeedRow").style.display = "flex";
    document.getElementById("vfTimerWrap").style.display = "block";
    mainBtn.style.display = "flex";
    feedback.style.display = "none";
  }

  function showFeedback() {
    document.getElementById("vfSpeedRow").style.display = "none";
    document.getElementById("vfTimerWrap").style.display = "none";
    mainBtn.style.display = "none";
    feedback.style.display = "flex";
  }

  function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    document.getElementById("vfTimer").textContent =
      `${m}:${String(s).padStart(2, "0")}`;
  }

  function startSession() {
    running = true;
    sessionStartTime   = Date.now();
    moodBeforeSession  = getMood();
    stateBeforeSession = detectMoodState(moodBeforeSession);
    mainBtn.innerText  = "⏸";
    status.textContent = "Следи за шариком...";

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

    animateDot();
  }

  function stopSession() {
    running = false;
    cancelAnimationFrame(animationId);
    clearInterval(countdownInterval);
    status.textContent = "Остановлено";
  }

  function animateDot() {
    if (!running) return;
    const fieldW   = field.offsetWidth;
    const dotW     = 36;
    const maxLeft  = fieldW - dotW - 10;
    let   goRight  = true;
    let   startX   = 10;
    let   startTime = null;

    function step(ts) {
      if (!running) return;
      if (!startTime) startTime = ts;
      const elapsed  = ts - startTime;
      const progress = Math.min(elapsed / speedMs, 1);
      const eased    = 0.5 - Math.cos(progress * Math.PI) / 2;
      const targetX  = goRight ? maxLeft : 10;
      const fromX    = goRight ? startX : maxLeft;
      const toX      = goRight ? maxLeft : 10;
      const x        = fromX + (toX - fromX) * eased;
      dot.style.left = x + "px";

      if (progress >= 1) {
        goRight   = !goRight;
        startX    = x;
        startTime = null;
      }
      animationId = requestAnimationFrame(step);
    }
    animationId = requestAnimationFrame(step);
  }

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
      type: "visual-focus",
      moodBefore:  moodBeforeSession,
      stateBefore: stateBeforeSession,
      moodAfter,
      stateAfter,
      result,
      duration,
      timestamp: Date.now()
    });
    sessionStartTime  = null;
    moodBeforeSession = null;
    updateTimerDisplay(DURATION);
    mainBtn.innerText = "▶";
    status.textContent = "Готово к старту";
    showPlayer();
  }

  document.getElementById("vfHelped").onclick    = () => saveSession("positive");
  document.getElementById("vfNotHelped").onclick = () => saveSession("negative");
}
// ===============================
// MoodOS Mind Dump
// Выгрузка мыслей — 60 секунд
// ===============================
import { getMood } from "./state.js";
import { addSessionEntry } from "./services/memory.js";
import { detectMoodState } from "./services/state-engine.js";

let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;
let countdownInterval = null;

const DURATION = 60; // секунд

export function initMindDump(container) {

  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:6px;">Выгрузка мыслей</h2>
      <div style="font-size:14px; color:#888; margin-bottom:20px;">
        Пиши всё что в голове · не останавливайся · 60 секунд
      </div>

      <!-- ПОЛЕ ВВОДА -->
      <div id="mdInputWrap" style="margin-bottom:16px; padding:0 4px;">
        <textarea id="mdText" placeholder="Начни писать — просто выгрузи всё что сейчас в голове..."
          style="
            width:100%; min-height:180px; padding:16px;
            border:none; border-radius:18px; resize:none;
            background:#e0e5ec;
            box-shadow: inset 6px 6px 12px #b8bec7, inset -6px -6px 12px #ffffff;
            font-size:16px; color:#444; line-height:1.6;
            outline:none; box-sizing:border-box; font-family:inherit;
          "
          disabled
        ></textarea>
      </div>

      <!-- ПРОГРЕСС-БАР -->
      <div style="
        width:100%; height:6px; border-radius:3px;
        background:#e0e5ec;
        box-shadow: inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff;
        margin-bottom:12px; overflow:hidden;">
        <div id="mdProgress" style="
          height:100%; width:0%; border-radius:3px;
          background: linear-gradient(90deg, #f9a8d4, #a78bfa);
          transition: width 1s linear;
        "></div>
      </div>

      <!-- ТАЙМЕР -->
      <div id="mdTimerWrap" style="margin-bottom:16px;">
        <div id="mdTimer" style="font-size:42px; font-weight:bold; color:#a855f7;">1:00</div>
        <div id="mdStatus" style="font-size:14px; color:#888; margin-top:4px;">Готово к старту</div>
      </div>

      <!-- КНОПКА -->
      <div style="display:flex; justify-content:center; gap:12px; margin-bottom:20px;">
        <div id="mdMainBtn" class="mainBtn">▶</div>
        <div id="mdClearBtn" style="
          display:none;
          width:52px; height:52px; border-radius:50%;
          background:#e0e5ec;
          box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          cursor:pointer; font-size:20px;
          align-items:center; justify-content:center;
          color:#888;">🗑</div>
      </div>

      <!-- ДЕЙСТВИЯ ПОСЛЕ -->
      <div id="mdActions" style="display:none; flex-direction:column; gap:10px; align-items:center; margin-bottom:16px;">
        <div style="font-size:15px; color:#666; margin-bottom:4px;">Что сделать с текстом?</div>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <div id="mdSave" style="
            padding:12px 20px; border-radius:16px; cursor:pointer;
            background:#e0e5ec; box-shadow: 5px 5px 10px #b8bec7, -5px -5px 10px #ffffff;
            color:#5a8dee; font-size:15px;">💾 Сохранить</div>
          <div id="mdDelete" style="
            padding:12px 20px; border-radius:16px; cursor:pointer;
            background:#e0e5ec; box-shadow: 5px 5px 10px #b8bec7, -5px -5px 10px #ffffff;
            color:#e05555; font-size:15px;">🗑 Удалить</div>
        </div>
      </div>

      <!-- ФИДБЕК -->
      <div id="mdFeedback" style="display:none; flex-direction:column; gap:14px; align-items:center; margin-top:10px;">
        <div style="font-size:16px; color:#666; margin-bottom:6px;">Как ты себя чувствуешь?</div>
        <div id="mdHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#4a7c59; font-size:18px; text-align:center;">👍 Помогло</div>
        <div id="mdNotHelped" style="
          width:75%; padding:16px; border-radius:18px; cursor:pointer;
          background:#e0e5ec; box-shadow: 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff;
          color:#888; font-size:18px; text-align:center;">👎 Не помогло</div>
      </div>

    </div>
  `;

  const mainBtn   = document.getElementById("mdMainBtn");
  const clearBtn  = document.getElementById("mdClearBtn");
  const textarea  = document.getElementById("mdText");
  const status    = document.getElementById("mdStatus");
  const actions   = document.getElementById("mdActions");
  const feedback  = document.getElementById("mdFeedback");
  const progress  = document.getElementById("mdProgress");

  function updateTimerDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    document.getElementById("mdTimer").textContent =
      `${m}:${String(s).padStart(2, "0")}`;
    progress.style.width = ((DURATION - sec) / DURATION * 100) + "%";
  }

  function showPlayer() {
    document.getElementById("mdTimerWrap").style.display = "block";
    document.getElementById("mdInputWrap").style.display = "block";
    mainBtn.style.display  = "flex";
    clearBtn.style.display = "none";
    actions.style.display  = "none";
    feedback.style.display = "none";
    textarea.disabled = true;
    textarea.value    = "";
    progress.style.width = "0%";
    updateTimerDisplay(DURATION);
    status.textContent = "Готово к старту";
  }

  function showActions() {
    actions.style.display  = "flex";
    mainBtn.style.display  = "none";
    clearBtn.style.display = "none";
  }

  function showFeedback() {
    actions.style.display  = "none";
    feedback.style.display = "flex";
  }

  function startSession() {
    running = true;
    sessionStartTime   = Date.now();
    moodBeforeSession  = getMood();
    stateBeforeSession = detectMoodState(moodBeforeSession);
    mainBtn.innerText  = "⏸";
    clearBtn.style.display = "flex";
    textarea.disabled  = false;
    textarea.focus();
    status.textContent = "Пиши — не останавливайся...";

    let remaining = DURATION;
    updateTimerDisplay(remaining);

    countdownInterval = setInterval(() => {
      remaining--;
      updateTimerDisplay(remaining);
      if (remaining <= 0) {
        stopSession();
        showActions();
      }
    }, 1000);
  }

  function stopSession() {
    running = false;
    clearInterval(countdownInterval);
    textarea.disabled  = true;
    mainBtn.innerText  = "▶";
    status.textContent = "Готово";
  }

  mainBtn.onclick = () => {
    if (!running) {
      startSession();
    } else {
      stopSession();
      showActions();
    }
  };

  clearBtn.onclick = () => {
    textarea.value = "";
  };

  document.getElementById("mdSave").onclick = () => {
    // текст сохраняем как заметку через notesHistory
    try {
      const raw = localStorage.getItem("notes_history");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({
        text: textarea.value,
        note: textarea.value,
        type: "mind-dump",
        timestamp: Date.now(),
        time: Date.now()
      });
      localStorage.setItem("notes_history", JSON.stringify(arr));
    } catch(e) {}
    showFeedback();
  };

  document.getElementById("mdDelete").onclick = () => {
    textarea.value = "";
    showFeedback();
  };

  function saveSession(result) {
    const moodAfter  = getMood();
    const duration   = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;
    const stateAfter = detectMoodState(moodAfter);
    addSessionEntry({
      type: "mind-dump",
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
    showPlayer();
  }

  document.getElementById("mdHelped").onclick    = () => saveSession("positive");
  document.getElementById("mdNotHelped").onclick = () => saveSession("negative");
}

// ===============================
// MoodOS Mind Dump
// Выгрузка мыслей — 60 секунд
// ===============================
import { getMood } from "../state.js";
import { addSessionEntry } from "../services/memory.js";
import SystemCore from "../system-core.js";
import { t } from "../i18n.js";

let running = false;
let sessionStartTime = null;
let moodBeforeSession = null;
let stateBeforeSession = null;
let countdownInterval = null;
let savedText = "";
let result = null;

const DURATION = 60;

export function onEnter(container) {
  console.log('[DEBUG] mind-dump onEnter called');
  render(container);
  bindEvents();
}

function render(container) {
  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">

      <h2 style="margin-bottom:6px;">${t("md_title")}</h2>
      <div style="font-size:14px; color:#888; margin-bottom:20px;">
        ${t("md_subtitle")}
      </div>

      <div id="mdInputWrap" style="margin-bottom:16px; padding:0 4px;">
        <textarea id="mdText" placeholder="${t("md_placeholder")}"
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

      <div style="width:100%;height:6px;border-radius:3px;background:#e0e5ec;box-shadow:inset 2px 2px 4px #b8bec7,inset -2px -2px 4px #ffffff;margin-bottom:12px;overflow:hidden;">
        <div id="mdProgress" style="height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,#f9a8d4,#a855f7);transition:width 1s linear;"></div>
      </div>

      <div id="mdTimerWrap" style="margin-bottom:16px;">
        <div id="mdTimer" style="font-size:42px;font-weight:bold;color:#a855f7;">1:00</div>
        <div id="mdStatus" style="font-size:14px;color:#888;margin-top:4px;">${t("md_ready")}</div>
      </div>

      <div style="display:flex;justify-content:center;gap:12px;margin-bottom:20px;">
        <div id="mdMainBtn" class="mainBtn">▶</div>
        <div id="mdClearBtn" style="display:none;width:52px;height:52px;border-radius:50%;background:#e0e5ec;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;cursor:pointer;font-size:20px;align-items:center;justify-content:center;color:#888;">🗑</div>
      </div>

      <div id="mdActions" style="display:none;flex-direction:column;gap:10px;align-items:center;margin-bottom:16px;">
        <div style="font-size:15px;color:#666;margin-bottom:4px;">${t("md_what_to_do")}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <div id="mdSave"   style="padding:12px 20px;border-radius:16px;cursor:pointer;background:#e0e5ec;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#5a8dee;font-size:15px;">${t("md_save")}</div>
          <div id="mdDelete" style="padding:12px 20px;border-radius:16px;cursor:pointer;background:#e0e5ec;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#e05555;font-size:15px;">${t("md_delete")}</div>
        </div>
      </div>

      <div id="mdFeedback" style="display:none;flex-direction:column;gap:14px;align-items:center;margin-top:10px;">
        <div style="font-size:16px;color:#666;margin-bottom:6px;">${t("md_how_feel")}</div>
        <div id="mdHelped" style="width:75%;padding:16px;border-radius:18px;cursor:pointer;background:#e0e5ec;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;color:#4a7c59;font-size:18px;text-align:center;">👍 ${t("hist_helped")}</div>
        <div id="mdNotHelped" style="width:75%;padding:16px;border-radius:18px;cursor:pointer;background:#e0e5ec;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;color:#888;font-size:18px;text-align:center;">👎 ${t("hist_not_helped")}</div>
      </div>

    </div>
  `;
}

function bindEvents() {
  console.log('[DEBUG] mind-dump bindEvents called');

  const mainBtn = document.getElementById("mdMainBtn");
  if (mainBtn) {
    const newMainBtn = mainBtn.cloneNode(true);
    mainBtn.replaceWith(newMainBtn);
    newMainBtn.onclick = () => {
      if (!running) {
        startSession();
      } else {
        stopSession();
        showActions();
      }
    };
  }

  const clearBtn = document.getElementById("mdClearBtn");
  if (clearBtn) {
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.replaceWith(newClearBtn);
    newClearBtn.onclick = () => {
      const textarea = document.getElementById("mdText");
      if (textarea) textarea.value = "";
    };
  }

  const mdSave = document.getElementById("mdSave");
  if (mdSave) {
    const newMdSave = mdSave.cloneNode(true);
    mdSave.replaceWith(newMdSave);
    newMdSave.onclick = () => {
      const textarea = document.getElementById("mdText");
      if (textarea) savedText = textarea.value;
      showFeedback();
    };
  }

  const mdDelete = document.getElementById("mdDelete");
  if (mdDelete) {
    const newMdDelete = mdDelete.cloneNode(true);
    mdDelete.replaceWith(newMdDelete);
    newMdDelete.onclick = () => {
      savedText = "";
      const textarea = document.getElementById("mdText");
      if (textarea) textarea.value = "";
      showFeedback();
    };
  }

  const mdHelped = document.getElementById("mdHelped");
  if (mdHelped) {
    const newMdHelped = mdHelped.cloneNode(true);
    mdHelped.replaceWith(newMdHelped);
    newMdHelped.onclick = () => saveSessionWithResult("positive");
  }

  const mdNotHelped = document.getElementById("mdNotHelped");
  if (mdNotHelped) {
    const newMdNotHelped = mdNotHelped.cloneNode(true);
    mdNotHelped.replaceWith(newMdNotHelped);
    newMdNotHelped.onclick = () => saveSessionWithResult("negative");
  }
}

function getElements() {
  return {
    mainBtn: document.getElementById("mdMainBtn"),
    clearBtn: document.getElementById("mdClearBtn"),
    textarea: document.getElementById("mdText"),
    status: document.getElementById("mdStatus"),
    actions: document.getElementById("mdActions"),
    feedback: document.getElementById("mdFeedback"),
    progress: document.getElementById("mdProgress")
  };
}

function updateTimerDisplay(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  const timerEl = document.getElementById("mdTimer");
  const progressEl = document.getElementById("mdProgress");
  if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  if (progressEl) progressEl.style.width = ((DURATION - sec) / DURATION * 100) + "%";
}

function showPlayer() {
  const { mainBtn, clearBtn, textarea, actions, feedback, progress, status } = getElements();
  document.getElementById("mdTimerWrap").style.display = "block";
  document.getElementById("mdInputWrap").style.display = "block";
  if (mainBtn) mainBtn.style.display = "flex";
  if (clearBtn) clearBtn.style.display = "none";
  if (actions) actions.style.display = "none";
  if (feedback) feedback.style.display = "none";
  if (textarea) { textarea.disabled = true; textarea.value = ""; }
  savedText = "";
  if (progress) progress.style.width = "0%";
  updateTimerDisplay(DURATION);
  if (status) status.textContent = t("md_ready");
}

function showActions() {
  const { mainBtn, clearBtn, actions, feedback } = getElements();
  if (actions) actions.style.display = "flex";
  if (mainBtn) mainBtn.style.display = "none";
  if (clearBtn) clearBtn.style.display = "none";
}

function showFeedback() {
  const { actions, feedback } = getElements();
  if (actions) actions.style.display = "none";
  if (feedback) feedback.style.display = "flex";
}

async function startSession() {
  const { mainBtn, clearBtn, textarea, status } = getElements();
  
  running = true;
  sessionStartTime = Date.now();
  moodBeforeSession = getMood();
  const analysisResult = await SystemCore.analyzeMoodOnly(moodBeforeSession);
  stateBeforeSession = analysisResult ? analysisResult.state : null;
  
  if (mainBtn) mainBtn.innerText = "⏸";
  if (clearBtn) clearBtn.style.display = "flex";
  if (textarea) { textarea.disabled = false; textarea.focus(); }
  if (status) status.textContent = t("md_writing");
  
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
  const { mainBtn, textarea, status } = getElements();
  
  running = false;
  if (countdownInterval) clearInterval(countdownInterval);
  if (textarea) textarea.disabled = true;
  if (mainBtn) mainBtn.innerText = "▶";
  if (status) status.textContent = t("md_done");
}

async function saveSession() {
  const { textarea } = getElements();
  
  const moodAfter = getMood();
  const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  const analysisResult = await SystemCore.analyzeMoodOnly(moodAfter);
  const stateAfter = analysisResult ? analysisResult.state : null;
  
  addSessionEntry({
    type: "mind-dump",
    moodBefore: moodBeforeSession,
    stateBefore: stateBeforeSession,
    moodAfter,
    stateAfter,
    result,
    duration,
    text: savedText,
    timestamp: Date.now()
  });
  
  sessionStartTime = null;
  moodBeforeSession = null;
  savedText = "";
  showPlayer();
}

function saveSessionWithResult(res) {
  result = res;
  saveSession();
}

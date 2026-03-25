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

const DURATION = 60;

export function initMindDump(container) {

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
        <div id="mdProgress" style="height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,#f9a8d4,#a78bfa);transition:width 1s linear;"></div>
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

  const mainBtn  = document.getElementById("mdMainBtn");
  const clearBtn = document.getElementById("mdClearBtn");
  const textarea = document.getElementById("mdText");
  const status   = document.getElementById("mdStatus");
  const actions  = document.getElementById("mdActions");
  const feedback = document.getElementById("mdFeedback");
  const progress = document.getElementById("mdProgress");

  function updateTimerDisplay(sec) {
    const m=Math.floor(sec/60), s=sec%60;
    document.getElementById("mdTimer").textContent=`${m}:${String(s).padStart(2,"0")}`;
    progress.style.width=((DURATION-sec)/DURATION*100)+"%";
  }

  function showPlayer() {
    document.getElementById("mdTimerWrap").style.display="block";
    document.getElementById("mdInputWrap").style.display="block";
    mainBtn.style.display="flex"; clearBtn.style.display="none";
    actions.style.display="none"; feedback.style.display="none";
    textarea.disabled=true; textarea.value=""; savedText="";
    progress.style.width="0%"; updateTimerDisplay(DURATION);
    status.textContent = t("md_ready");
  }

  function showActions() { actions.style.display="flex"; mainBtn.style.display="none"; clearBtn.style.display="none"; }
  function showFeedback() { actions.style.display="none"; feedback.style.display="flex"; }

  async function startSession() {
    running=true; sessionStartTime=Date.now();
    moodBeforeSession=getMood(); stateBeforeSession=(await SystemCore.analyzeMoodOnly(moodBeforeSession)).state;
    mainBtn.innerText="⏸"; clearBtn.style.display="flex";
    textarea.disabled=false; textarea.focus();
    status.textContent = t("md_writing");
    let remaining=DURATION; updateTimerDisplay(remaining);
    countdownInterval=setInterval(()=>{
      remaining--; updateTimerDisplay(remaining);
      if(remaining<=0){ stopSession(); showActions(); }
    },1000);
  }

  function stopSession() {
    running=false; clearInterval(countdownInterval);
    textarea.disabled=true; mainBtn.innerText="▶"; status.textContent = t("md_done");
  }

  mainBtn.onclick=()=>{ if(!running){ startSession(); } else { stopSession(); showActions(); } };
  clearBtn.onclick=()=>{ textarea.value=""; };

  document.getElementById("mdSave").onclick=()=>{
    savedText=textarea.value;
    // НЕ пишем в notes_history — это создавало дубль в истории.
    // Текст будет сохранён в session entry ниже.
    showFeedback();
  };

  document.getElementById("mdDelete").onclick=()=>{
    savedText="";
    textarea.value="";
    showFeedback();
  };

  async function saveSession() {
    const moodAfter=getMood();
    const duration=sessionStartTime?Math.floor((Date.now()-sessionStartTime)/1000):0;
    const stateAfter=(await SystemCore.analyzeMoodOnly(moodAfter)).state;
    addSessionEntry({
      type:"mind-dump",
      moodBefore:moodBeforeSession,
      stateBefore:stateBeforeSession,
      moodAfter, stateAfter, result, duration,
      text: savedText,   // ← текст хранится прямо в сессии
      timestamp:Date.now()
    });
    sessionStartTime=null; moodBeforeSession=null; savedText="";
    showPlayer();
  }

  document.getElementById("mdHelped").onclick=()=>saveSession("positive");
  document.getElementById("mdNotHelped").onclick=()=>saveSession("negative");
}
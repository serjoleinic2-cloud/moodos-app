import { detectMoodState } from "./services/state-engine.js";
import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
import { analyzeLatestVoice } from "./ai/voice-analysis.js";
import {
  getMoodHistory, saveMoodHistory,
  getNotesHistory, saveNotesHistory
} from "./services/memory.js";
import {
  calculateStabilityScore, calculateTrend, calculateGoldenHour
} from "./services/analytics.js";
import {
  initState, getUsageDays, getMood
} from "./state.js";
import { isOnboardingDone } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel } from "./i18n.js";

/* ---------- FRESH INSTALL CHECK ---------- */
const LS_APP_ID = "moodos_app_id";
const CURRENT_APP_ID = "20260320";

function checkFreshInstall() {
  const storedId = localStorage.getItem(LS_APP_ID);
  if (storedId !== CURRENT_APP_ID) {
    const lang = localStorage.getItem("app_language");
    localStorage.clear();
    if (lang) localStorage.setItem("app_language", lang);
    localStorage.setItem(LS_APP_ID, CURRENT_APP_ID);
    console.log("Fresh install — storage cleared");
  }
}

/* ---------- BOOT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[APP] DOMContentLoaded");
  checkFreshInstall();
  initState();
  initUI();
  applyDomTranslations();

  if (!isOnboardingDone()) {
    initOnboarding(() => {
      applyDomTranslations();
      startApp();
    });
  } else {
    startApp();
  }
});

function startApp() {
  console.log("[APP] startApp");
  initNavigation();

  const btn         = document.getElementById("analyzeNoteBtn");
  const note        = document.getElementById("dailyNote");
  const output      = document.getElementById("aiResponse");
  const voiceOutput = document.getElementById("voiceAIResponse");

  if (btn && note) {
    btn.addEventListener("click", () => {
      const text   = note.value;
      const mood   = getMood();
      const result = analyzeText(text, mood);

      if (output) {
        output.textContent = result.insight;
        output.setAttribute("data-user-set", "true");
        output.removeAttribute("data-i18n");
        output.classList.add("ai-message");
        output.style.opacity = "0";
        requestAnimationFrame(() => { output.style.opacity = "1"; });
      }

      const history = getNotesHistory();
      history.push({ text, mood, result, time: Date.now(), timestamp: Date.now() });
      saveNotesHistory(history);
      render();
    });
  }

  render();

  const recordBtn   = document.getElementById("recordVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  if (recordBtn && voiceStatus) {
    recordBtn.addEventListener("click", () => {
      if (output) output.classList.remove("ai-message");

      const timerEl = document.getElementById("voiceTimer");
      recordBtn.disabled = true;
      voiceStatus.textContent = t("voice_recording");

      let countdown = 10;
      if (timerEl) timerEl.textContent = countdown;

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          if (timerEl) timerEl.textContent = countdown;
        } else {
          clearInterval(countdownInterval);
          if (timerEl) timerEl.textContent = "";
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(countdownInterval);
        if (timerEl) timerEl.textContent = "";
        voiceStatus.textContent = "";
        recordBtn.disabled = false;
      };

      startVoiceRecording(voiceStatus, () => {
        cleanup();
        const result = analyzeLatestVoice();
        if (result && voiceOutput) {
          voiceOutput.textContent = result.insight;
          voiceOutput.classList.add("ai-message");
        }
      }).catch(() => {
        cleanup();
        voiceStatus.textContent = "❌";
      });
    });
  }
}

/* ---------- HELPERS ---------- */
export function updateStabilityHistory(moodValue) {
  const mood    = moodValue !== undefined ? moodValue : getMood();
  const history = getMoodHistory();
  const state   = detectMoodState(mood);
  history.push({ value: mood, state, time: Date.now() });
  if (history.length > 730) history.shift();
  saveMoodHistory(history);
  render();
}

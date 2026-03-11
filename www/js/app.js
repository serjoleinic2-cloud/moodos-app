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
  initState, getUsageDays, getMood, setMood, subscribe
} from "./state.js";
import { isOnboardingDone } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang } from "./i18n.js";

/* ---------- RENDER ----------- */
function render() {
  const mood = getMood();

  const daysEl = document.getElementById("daysTogether");
  if (daysEl) {
    const days = getUsageDays ? getUsageDays() : getDaysFromStorage();
    daysEl.textContent = `${t("home_days")} ${days} ${getDaysLabel(days)}`;
  }

  const moodValue = document.getElementById("moodValue");
  if (moodValue) moodValue.textContent = mood + "%";

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  // Инсайт дня — показываем последний AI-ответ из истории заметок или дефолт по настроению
  const insightEl = document.getElementById("todayInsight");
  if (insightEl && insightEl.getAttribute("data-user-set") !== "true") {
    const notes = getNotesHistory();
    const last = notes.length ? notes[notes.length - 1] : null;
    if (last && last.result && last.result.insight) {
      insightEl.textContent = last.result.insight;
    } else if (mood >= 70) {
      insightEl.textContent = t("mood_strong");
    } else if (mood >= 45) {
      insightEl.textContent = t("mood_stable");
    } else {
      insightEl.textContent = t("mood_attention");
    }
  }

  // Золотые часы
  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) {
    const history = getMoodHistory();
    if (history.length < 3) {
      goldenEl.textContent = t("home_studying");
    } else {
      const g = calculateGoldenHour(history);
      goldenEl.textContent = g || t("home_studying");
    }
  }
}

function getDaysFromStorage() {
  try {
    const start = localStorage.getItem("startDate");
    if (!start) { localStorage.setItem("startDate", Date.now()); return 1; }
    return Math.max(1, Math.ceil((Date.now() - parseInt(start)) / 86400000));
  } catch(e) { return 1; }
}

/* ---------- DOM TRANSLATIONS ---------- */
function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    // Не перезаписываем элементы у которых уже есть пользовательский контент
    if (el.getAttribute("data-user-set") === "true") return;
    const val = t(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-placeholder'));
    if (val) el.placeholder = val;
  });
}

/* ---------- BOOT ---------- */
document.addEventListener("DOMContentLoaded", () => {
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
  initNavigation();

  setTimeout(async () => {
    try {
      const { checkAutoReminder } = await import("./screens/pdf-report.js");
      checkAutoReminder();
    } catch(e) {
      console.warn("checkAutoReminder failed:", e);
    }
  }, 3000);

  const slider = document.getElementById("moodSlider");
  if (slider) {
    slider.addEventListener("input", () => {
      const mv = document.getElementById("moodValue");
      if (mv) mv.textContent = slider.value + "%";
    });
  }



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

      // Обновляем Инсайт дня
      const insightEl = document.getElementById("todayInsight");
      if (insightEl) {
        insightEl.textContent = result.insight;
        insightEl.setAttribute("data-user-set", "true");
        insightEl.removeAttribute("data-i18n");
      }

      const history = getNotesHistory();
      history.push({ text, mood, result, time: Date.now(), timestamp: Date.now() });
      saveNotesHistory(history);
    });
  }

  render();
  subscribe(render);

  const recordBtn   = document.getElementById("recordVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  if (recordBtn && voiceStatus) {
    recordBtn.addEventListener("click", async () => {
      if (output) output.classList.remove("ai-message");
      try {
        recordBtn.disabled = true;

        // Запускаем обратный отсчёт 10 секунд
        let countdown = 10;
        voiceStatus.textContent = `⏱ ${countdown}`;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            voiceStatus.textContent = `⏱ ${countdown}`;
          } else {
            clearInterval(countdownInterval);
          }
        }, 1000);

        await startVoiceRecording(voiceStatus, () => {
          clearInterval(countdownInterval);
          const result = analyzeLatestVoice();
          if (result && voiceOutput) {
            voiceOutput.textContent = result.insight;
            voiceOutput.classList.add("ai-message");
          }
          voiceStatus.textContent = "";
          recordBtn.disabled = false;
        });
      } catch(e) {
        voiceStatus.textContent = "❌";
        recordBtn.disabled = false;
      }
    });
  }
}

/* ---------- HELPERS ---------- */
let lastHistorySaveTime = 0;
const HISTORY_COOLDOWN  = 5000;

function updateStabilityHistory() {
  const mood  = getMood();
  const now   = Date.now();
  if (now - lastHistorySaveTime < HISTORY_COOLDOWN) return;

  const history = getMoodHistory();
  const state   = detectMoodState(mood);
  history.push({ value: mood, state, time: now });
  lastHistorySaveTime = now;
  if (history.length > 730) history.shift();
  saveMoodHistory(history);

  const stability = calculateStabilityScore(history);
  const trend     = calculateTrend(history);
  const valueEl   = document.getElementById("stabilityValue");
  const trendEl   = document.getElementById("stabilityTrend");
  if (valueEl && stability !== null) valueEl.textContent = stability + "%";
  if (trendEl) trendEl.textContent = trend;
}


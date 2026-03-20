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
  initState, getUsageDays, getMood, setMood
} from "./state.js";
import { isOnboardingDone } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang } from "./i18n.js";

/* ---------- ИНСАЙТ ДНЯ ---------- */
function buildDayInsight() {
  const today = new Date();
  const todayStr = today.toDateString();
  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();
  const todayMoods = moodHistory.filter(h => new Date(h.time).toDateString() === todayStr);
  const todayNotes = notesHistory.filter(n => new Date(n.time || n.timestamp).toDateString() === todayStr);

  if (todayMoods.length === 0 && todayNotes.length === 0) return t("insight_first");

  const parts = [];
  const total = todayMoods.length + todayNotes.length;
  if (total === 1) parts.push(t("insight_entries_1"));
  else parts.push(t("insight_entries_many").replace("{n}", total));

  if (todayMoods.length >= 2) {
    const first = todayMoods[0].value;
    const last  = todayMoods[todayMoods.length - 1].value;
    const diff  = last - first;
    if (diff > 5)       parts.push(t("insight_mood_up").replace("{a}", first).replace("{b}", last));
    else if (diff < -5) parts.push(t("insight_mood_down").replace("{a}", first).replace("{b}", last));
    else                parts.push(t("insight_mood_stable").replace("{v}", last));
  } else if (todayMoods.length === 1) {
    parts.push(t("insight_mood_now").replace("{v}", todayMoods[0].value));
  }

  if (todayNotes.length > 0) {
    const lastNote = todayNotes[todayNotes.length - 1];
    if (lastNote.result && lastNote.result.state) {
      parts.push(t("insight_topic").replace("{s}", lastNote.result.state));
    }
  }

  return parts.join(" ");
}

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

  // НЕ пишем moodSlider.value — триггерит events на Android WebView

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  const insightEl = document.getElementById("todayInsight");
  if (insightEl) {
    insightEl.textContent = buildDayInsight();
    insightEl.removeAttribute("data-user-set");
  }

  const history = getMoodHistory();
  const stability = calculateStabilityScore(history);
  const trend     = calculateTrend(history);
  const valueEl   = document.getElementById("stabilityValue");
  const trendEl   = document.getElementById("stabilityTrend");
  if (valueEl) valueEl.textContent = stability !== null ? stability + "%" : "—";
  if (trendEl) trendEl.textContent = trend;

  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) {
    const g = calculateGoldenHour(history);
    if (g === null) goldenEl.textContent = t("golden_studying");
    else goldenEl.textContent = t("golden_peak").replace("{start}", g.start).replace("{end}", g.end);
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
  initNavigation(); // раскомментировано — навигация нужна

  setTimeout(async () => {
    try {
      const { checkAutoReminder } = await import("./screens/pdf-report.js");
      checkAutoReminder();
    } catch(e) {
      console.warn("checkAutoReminder failed:", e);
    }
  }, 3000);

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
  // subscribe(render) убран — вызывал бесконечный цикл

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
  // setMood убран — вызывал subscribe → render → бесконечный цикл
  const now     = Date.now();
  const history = getMoodHistory();
  const state   = detectMoodState(mood);
  history.push({ value: mood, state, time: now });
  if (history.length > 730) history.shift();
  saveMoodHistory(history);
  render();
}

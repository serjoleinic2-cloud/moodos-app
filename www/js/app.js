import { detectMoodState } from "./services/state-engine.js";
import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
import { analyzeLatestVoice } from "./ai/voice-analysis.js";
import {
  getMoodHistory,
  saveMoodHistory,
  getNotesHistory,
  saveNotesHistory
} from "./services/memory.js";
import {
  calculateStabilityScore,
  calculateTrend,
  calculateGoldenHour
} from "./services/analytics.js";
import {
  initState,
  getUsageDays,
  getMood,
  setMood,
  subscribe
} from "./state.js";

/* ---------- RENDER ---------- */
function render() {
  const mood = getMood();

  // Счётчик дней
  const daysEl = document.getElementById("daysTogether");
  if (daysEl) {
    const days = getUsageDays ? getUsageDays() : getDaysFromStorage();
    const label = days === 1 ? "день" : days >= 2 && days <= 4 ? "дня" : "дней";
    daysEl.textContent = `Я с тобой уже ${days} ${label}`;
  }

  const moodValue = document.getElementById("moodValue");
  if (moodValue) moodValue.textContent = mood + "%";

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  const insightEl = document.getElementById("todayInsight");
  if (insightEl) {
    if (mood >= 70)      insightEl.textContent = "Твоё эмоциональное состояние сегодня сильное.";
    else if (mood >= 45) insightEl.textContent = "Ты относительно стабилен сегодня.";
    else                 insightEl.textContent = "Сегодня может потребоваться дополнительный отдых.";
  }

  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) goldenEl.textContent = calculateGoldenHour(getMoodHistory());
}

// Запасной счётчик дней если getUsageDays не работает
function getDaysFromStorage() {
  try {
    const start = localStorage.getItem("startDate");
    if (!start) { localStorage.setItem("startDate", Date.now()); return 1; }
    const diff = Date.now() - parseInt(start);
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } catch(e) { return 1; }
}

/* ---------- BOOT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initState();
  initUI();
  initNavigation();

  const slider = document.getElementById("moodSlider");
  if (slider) {
    slider.addEventListener("input", () => {
      const moodValue = document.getElementById("moodValue");
      if (moodValue) moodValue.textContent = slider.value + "%";
    });
  }

  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (confirmBtn && slider) {
    confirmBtn.addEventListener("click", () => {
      const newMood = Number(slider.value);
      setMood(newMood);
      updateStabilityHistory();
      showSavedTime();
    });
  }

  const btn    = document.getElementById("analyzeNoteBtn");
  const note   = document.getElementById("dailyNote");
  const output = document.getElementById("aiResponse");
  const voiceOutput = document.getElementById("voiceAIResponse");

  if (btn) {
    btn.addEventListener("click", () => {
      const text = note.value;
      const mood = getMood();
      const result = analyzeText(text, mood);
      if (output) {
        output.textContent = result.insight;
        output.classList.add("ai-message");
        output.style.opacity = "0";
        requestAnimationFrame(() => { output.style.opacity = "1"; });
      }
      let history = getNotesHistory();
      history.push({ text, mood, result, time: Date.now() });
      saveNotesHistory(history);
    });
  }

  render();
  subscribe(render);

  const recordBtn  = document.getElementById("recordVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  if (recordBtn) {
    recordBtn.addEventListener("click", async () => {
      if (output) output.classList.remove("ai-message");
      try {
        voiceStatus.textContent = "Запрашиваю микрофон...";
        recordBtn.disabled = true;
        await startVoiceRecording(voiceStatus, () => {
          const result = analyzeLatestVoice();
          if (result && voiceOutput) {
            voiceOutput.textContent = result.insight;
            voiceOutput.classList.add("ai-message");
          }
          voiceStatus.textContent = "Рефлексия сохранена";
          recordBtn.disabled = false;
        });
      } catch(e) {
        voiceStatus.textContent = "Доступ к микрофону запрещён";
        recordBtn.disabled = false;
      }
    });
  }
});

let lastHistorySaveTime = 0;
const HISTORY_COOLDOWN = 5000;

function updateStabilityHistory() {
  const mood    = getMood();
  let history   = getMoodHistory();
  const now     = Date.now();
  if (now - lastHistorySaveTime < HISTORY_COOLDOWN) return;

  const state = detectMoodState(mood);
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

function showSavedTime() {
  const label = document.getElementById("moodSavedLabel");
  if (!label) return;
  const now = new Date();
  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  label.textContent = `Сохранено в ${time}`;
}
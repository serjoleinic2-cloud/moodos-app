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
import { checkAutoReminder } from "./screens/pdf-report.js";
import { isOnboardingDone } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang } from "./i18n.js";

/* ---------- RENDER ---------- */
function render() {
  const mood = getMood();
  const lang = getLang();

  const daysEl = document.getElementById("daysTogether");
  if (daysEl) {
    const days = getUsageDays ? getUsageDays() : getDaysFromStorage();
    daysEl.textContent = `${t("days_with_you")} ${days} ${getDaysLabel(days)}`;
  }

  const moodValue = document.getElementById("moodValue");
  if (moodValue) moodValue.textContent = mood + "%";

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  const insightEl = document.getElementById("todayInsight");
  if (insightEl) {
    if (mood >= 70)      insightEl.textContent = lang === "en" ? "Your emotional state is strong today." : lang === "es" ? "Tu estado emocional es fuerte hoy." : lang === "uk" ? "Твій емоційний стан сьогодні сильний." : "Твоё эмоциональное состояние сегодня сильное.";
    else if (mood >= 45) insightEl.textContent = lang === "en" ? "You're relatively stable today." : lang === "es" ? "Estás relativamente estable hoy." : lang === "uk" ? "Ти відносно стабільний сьогодні." : "Ты относительно стабилен сегодня.";
    else                 insightEl.textContent = lang === "en" ? "You may need extra rest today." : lang === "es" ? "Puede que necesites descanso extra hoy." : lang === "uk" ? "Сьогодні може знадобитися додатковий відпочинок." : "Сегодня может потребоваться дополнительный отдых.";
  }

  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) goldenEl.textContent = calculateGoldenHour(getMoodHistory());

  // Переводим статичные тексты главного экрана
  const el = (id) => document.getElementById(id);
  const qi = (sel) => document.querySelector(sel);

  if (qi('[data-screen="home"] .card:nth-child(2) div[style*="Дневная"], [data-i18n="daily_reflection"]')) {
    // используем data-атрибуты если есть
  }
}

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

  // Онбординг — показываем если не пройден
  if (!isOnboardingDone()) {
    initOnboarding(() => {
      // После онбординга запускаем приложение
      startApp();
    });
  } else {
    startApp();
  }
});

function startApp() {
  initNavigation();
  checkAutoReminder();
  setInterval(checkAutoReminder, 5 * 60 * 1000);

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

  const btn         = document.getElementById("analyzeNoteBtn");
  const note        = document.getElementById("dailyNote");
  const output      = document.getElementById("aiResponse");
  const voiceOutput = document.getElementById("voiceAIResponse");

  if (btn) {
    btn.addEventListener("click", () => {
      const text   = note.value;
      const mood   = getMood();
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

  const recordBtn   = document.getElementById("recordVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  if (recordBtn) {
    recordBtn.addEventListener("click", async () => {
      if (output) output.classList.remove("ai-message");
      try {
        voiceStatus.textContent = t("waiting") + "...";
        recordBtn.disabled = true;
        await startVoiceRecording(voiceStatus, () => {
          const result = analyzeLatestVoice();
          if (result && voiceOutput) {
            voiceOutput.textContent = result.insight;
            voiceOutput.classList.add("ai-message");
          }
          voiceStatus.textContent = t("waiting");
          recordBtn.disabled = false;
        });
      } catch(e) {
        voiceStatus.textContent = "Доступ к микрофону запрещён";
        recordBtn.disabled = false;
      }
    });
  }
}

let lastHistorySaveTime = 0;
const HISTORY_COOLDOWN = 5000;

function updateStabilityHistory() {
  const mood  = getMood();
  let history = getMoodHistory();
  const now   = Date.now();
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
  const now  = new Date();
  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  label.textContent = `${t("saved_at")} ${time}`;
}
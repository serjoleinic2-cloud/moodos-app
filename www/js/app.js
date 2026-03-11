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

/* ---------- ИНСАЙТ ДНЯ ---------- */
function buildDayInsight() {
  const today = new Date();
  const todayStr = today.toDateString();

  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();

  // Записи настроения за сегодня
  const todayMoods = moodHistory.filter(h => new Date(h.time).toDateString() === todayStr);
  // Заметки за сегодня
  const todayNotes = notesHistory.filter(n => new Date(n.time || n.timestamp).toDateString() === todayStr);

  if (todayMoods.length === 0 && todayNotes.length === 0) {
    return "Сделай первую запись — и я начну отслеживать твой день 🌱";
  }

  const parts = [];

  // Сколько записей
  const total = todayMoods.length + todayNotes.length;
  if (total === 1) parts.push("Первая запись за сегодня сделана.");
  else parts.push(`Сегодня ты делал(а) записи ${total} раз.`);

  // Динамика настроения
  if (todayMoods.length >= 2) {
    const first = todayMoods[0].value;
    const last  = todayMoods[todayMoods.length - 1].value;
    const diff  = last - first;
    if (diff > 5)       parts.push(`Настроение выросло с ${first}% до ${last}% 📈`);
    else if (diff < -5) parts.push(`Настроение снизилось с ${first}% до ${last}% 📉`);
    else                parts.push(`Настроение стабильно: около ${last}% ➡️`);
  } else if (todayMoods.length === 1) {
    parts.push(`Настроение сейчас: ${todayMoods[0].value}%`);
  }

  // Тема из заметок
  if (todayNotes.length > 0) {
    const lastNote = todayNotes[todayNotes.length - 1];
    if (lastNote.result && lastNote.result.state) {
      parts.push(`Основная тема: ${lastNote.result.state}.`);
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

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  // Инсайт дня — итог дня
  const insightEl = document.getElementById("todayInsight");
  if (insightEl) {
    insightEl.textContent = buildDayInsight();
    insightEl.removeAttribute("data-user-set");
  }

  // Индекс устойчивости
  const history = getMoodHistory();
  const stability = calculateStabilityScore(history);
  const trend     = calculateTrend(history);
  const valueEl   = document.getElementById("stabilityValue");
  const trendEl   = document.getElementById("stabilityTrend");
  if (valueEl) valueEl.textContent = stability !== null ? stability + "%" : "—";
  if (trendEl) trendEl.textContent = trend;

  // Золотые часы
  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) {
    const g = calculateGoldenHour(history);
    goldenEl.textContent = g;
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
  initNavigation();

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

      // Обновляем Инсайт дня после новой заметки
      render();
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
export function updateStabilityHistory() {
  const mood    = getMood();
  const now     = Date.now();
  const history = getMoodHistory();
  const state   = detectMoodState(mood);
  history.push({ value: mood, state, time: now });
  if (history.length > 730) history.shift();
  saveMoodHistory(history);
  render();
}
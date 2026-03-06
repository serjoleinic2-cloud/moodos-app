import { detectMoodState } from "./services/state-engine.js";
import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
import { analyzeLatestVoice } from "./ai/voice-analysis.js";
import { isOnboardingDone } from "./services/user-profile.js";
import { initOnboarding }   from "./onboarding.js";
import { maybeShowMonthlyCheck } from "./monthly-check.js";
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

  const daysEl = document.getElementById("usageDays");
  if (daysEl) {
    daysEl.textContent = getUsageDays();
  }

const moodValue = document.getElementById("moodValue");
if (moodValue) {
  moodValue.textContent = mood + "%";
}

  const fill = document.querySelector(".ecs-fill");
  if (fill) {
    fill.style.width = mood + "%";
  }

const insightEl = document.getElementById("todayInsight");

if (insightEl) {
  const mood = getMood();

  if (mood >= 70) {
    insightEl.textContent = "Your emotional state looks strong today.";
  } else if (mood >= 45) {
    insightEl.textContent = "You are relatively stable today.";
  } else {
    insightEl.textContent = "Today may require extra recovery.";
  }
}

const goldenEl = document.getElementById("goldenHours");
if (goldenEl) {
  goldenEl.textContent =
    calculateGoldenHour(getMoodHistory());
}

}

/* ---------- BOOT ---------- */

document.addEventListener("DOMContentLoaded", () => {

  initState();
  initUI();
  if (!isOnboardingDone()) {
  initOnboarding(() => { initNavigation(); });
} else {
  initNavigation();
  maybeShowMonthlyCheck();
}
  
  // MOOD SLIDER CONNECT

const slider = document.getElementById("moodSlider");

if (slider) {
  slider.addEventListener("input", () => {
    const moodValue = document.getElementById("moodValue");
    if (moodValue) {
      moodValue.textContent = slider.value + "%";
    }
  });
}
  
  
  // AI NOTE ANALYSIS

const confirmBtn = document.getElementById("moodConfirmBtn");

if (confirmBtn && slider) {

  confirmBtn.addEventListener("click", () => {

    const newMood = Number(slider.value);

    setMood(newMood);
    updateStabilityHistory();
    showSavedTime();
  });
}
const btn = document.getElementById("analyzeNoteBtn");
const note = document.getElementById("dailyNote");
const output = document.getElementById("aiResponse");
const voiceOutput = document.getElementById("voiceAIResponse");

if (btn) {
  btn.addEventListener("click", () => {

    const text = note.value;
    const mood = getMood();

    const result =
      analyzeText(text, mood);

    if (output) {
  output.textContent = result.insight;
  output.classList.add("ai-message");
}
    
	/* glass appearance animation */
    output.style.opacity = "0";
    requestAnimationFrame(() => {
    output.style.opacity = "1";
});
	
	
    let history = getNotesHistory();

history.push({
  text,
  mood,
  result,
  time: Date.now()
});

saveNotesHistory(history);
 });
}
  
  
  render();
  subscribe(render);


// VOICE RECORDING

const recordBtn =
  document.getElementById("recordVoiceBtn");

const voiceStatus =
  document.getElementById("voiceStatus");

if (recordBtn) {

recordBtn.addEventListener("click", async () => {
output.classList.remove("ai-message");
  try {

    voiceStatus.textContent = "Requesting microphone...";

    
    recordBtn.disabled = true;

   await startVoiceRecording(
  voiceStatus,
  () => {

  const result = analyzeLatestVoice();
  
  if (result && voiceOutput) {
  voiceOutput.textContent = result.insight;
  voiceOutput.classList.add("ai-message");
}
 
  voiceStatus.textContent =
    "Reflection saved";

  recordBtn.disabled = false;
}
);

  } catch (e) {

    voiceStatus.textContent =
      "Microphone access denied";

    recordBtn.disabled = false;
  }

});

}

});

let lastHistorySaveTime = 0;
const HISTORY_COOLDOWN = 5000; // 5 секунд

function updateStabilityHistory() {

  const mood = getMood();
  let history = getMoodHistory();

  const now = Date.now();
  const last = history[history.length - 1];

  // 1️⃣ если значение не изменилось — не пишем
  if (last && last.value === mood) {
    return;
  }

  // 2️⃣ если прошло меньше 5 секунд — не пишем
  if (now - lastHistorySaveTime < HISTORY_COOLDOWN) {
    return;
  }

  const state = detectMoodState(mood);

history.push({
  value: mood,
  state: state,
  time: now
});

  lastHistorySaveTime = now;

  if (history.length > 730) {
    history.shift();
  }

  saveMoodHistory(history);

  const stability = calculateStabilityScore(history);
  const trend = calculateTrend(history);

  const valueEl = document.getElementById("stabilityValue");
  const trendEl = document.getElementById("stabilityTrend");

  if (valueEl && stability !== null) {
    valueEl.textContent = stability + "%";
  }

  if (trendEl) {
    trendEl.textContent = trend;
  }
}
function showSavedTime() {

  const label = document.getElementById("moodSavedLabel");
  if (!label) return;

  const now = new Date();

  const time =
    now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });

  const date =
    now.toLocaleDateString("ru-RU");

  label.textContent =
    `Saved at ${time} | ${date}`;
}







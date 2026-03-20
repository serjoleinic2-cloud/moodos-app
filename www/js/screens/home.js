import { detectMoodState } from "../services/state-engine.js";
import { getMood, setMood } from "../state.js";
import { getMoodHistory, saveMoodHistory } from "../services/memory.js";
import { t } from "../i18n.js";

function saveAndRender(moodValue) {
  const mood    = moodValue !== undefined ? moodValue : getMood();
  setMood(mood);
  const history = getMoodHistory();
  const state   = detectMoodState(mood);
  history.push({ value: mood, state, time: Date.now() });
  if (history.length > 730) history.shift();
  saveMoodHistory(history);
}

export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const savedLabel = document.getElementById("moodSavedLabel");
  const confirmBtn = document.getElementById("moodConfirmBtn");

  if (!slider || !confirmBtn) return;

  const currentMood = getMood();
  if (valueLabel) valueLabel.textContent = currentMood + "%";

  slider.addEventListener("input", () => {
    if (valueLabel) valueLabel.textContent = slider.value + "%";
  });

  confirmBtn.addEventListener("click", () => {
    const moodValue = Number(slider.value);
    saveAndRender(moodValue);

    const now  = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (savedLabel) savedLabel.textContent = `${time} (${date})`;
  });
}

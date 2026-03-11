import { detectMoodState } from "../services/state-engine.js";
import { addMoodEntry } from "../services/memory.js";
import { updateStabilityHistory } from "../app.js";
import { t } from "../i18n.js";

export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const savedLabel = document.getElementById("moodSavedLabel");

  if (!slider) return;

  valueLabel.textContent = slider.value + "%";

const newSlider = slider.cloneNode(true);
slider.parentNode.replaceChild(newSlider, slider);

newSlider.addEventListener("input", () => {
  valueLabel.textContent = newSlider.value + "%";
  // синхронизируем state чтобы app.js не читал старый элемент
  newSlider.id = "moodSlider";
});

newSlider.id = "moodSlider";

  // Клонируем кнопку — убиваем старые слушатели
  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (!confirmBtn) return;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    const moodValue = Number(newSlider.value);
    const state     = detectMoodState(moodValue);
    addMoodEntry({ value: moodValue, state, time: Date.now() });
    updateStabilityHistory();

    const now  = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
    const date = now.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
    if (savedLabel) savedLabel.textContent = `${time} (${date})`;
  });
}
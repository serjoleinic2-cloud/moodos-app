import { detectMoodState } from "../services/state-engine.js";
import { updateStabilityHistory } from "../app.js";
import { getMood } from "../state.js";
import { t } from "../i18n.js";

export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const savedLabel = document.getElementById("moodSavedLabel");

  if (!slider) return;

  // Синхронизируем слайдер с реальным текущим настроением
  const currentMood = getMood();
  slider.value = currentMood;
  valueLabel.textContent = currentMood + "%";

  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.id = "moodSlider";

  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
  });

  // Клонируем кнопку — убиваем старые слушатели
  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (!confirmBtn) return;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", () => {
    const moodValue = Number(newSlider.value);
    updateStabilityHistory(moodValue);

    const now  = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
    const date = now.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
    if (savedLabel) savedLabel.textContent = `${time} (${date})`;
  });
}
import { getMood } from "../state.js";
import SystemCore from "../system-core.js";
import { render } from "../app.js";
import { showAvatarHint } from "../avatar.js";

export function onEnter() {
  console.log('home.onEnter() called');
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const savedLabel = document.getElementById("moodSavedLabel");

  if (!slider) return;

  // Синхронизируем слайдер с реальным текущим настроением
  const currentMood = getMood();
valueLabel.textContent = currentMood + "%";

  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.id = "moodSlider";

  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
    showAvatarHint(Number(newSlider.value));
  });

  // Клонируем кнопку — убиваем старые слушатели
  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (!confirmBtn) return;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", async () => {
    console.log('MOOD_SUBMIT clicked');
    const moodValue = Number(newSlider.value);
    console.log('moodValue:', moodValue);
    const result = await SystemCore.dispatch('MOOD_SUBMIT', moodValue);
    console.log('dispatch result:', result);

    if (!result || result.error) {
      console.warn('UI received error:', result);
      alert('Ошибка обработки. Попробуйте ещё раз.');
      return;
    }

    const mood = result.state?.mood || moodValue;
    newSlider.value = mood;
    valueLabel.textContent = mood + '%';

    render();

    const now  = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
    const date = now.toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric" });
    if (savedLabel) savedLabel.textContent = `${time} (${date})`;
  });
}
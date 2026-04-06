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

  const currentMood = getMood();
  valueLabel.textContent = currentMood + "%";

  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.id = "moodSlider";
  newSlider.value = currentMood;
  showAvatarHint(Number(currentMood));

  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
    showAvatarHint(Number(newSlider.value));
  });

  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (!confirmBtn) return;
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", async () => {
    console.log('MOOD_SUBMIT clicked');
    if (newBtn.disabled) return;
    newBtn.disabled = true;

    const moodValue = Number(newSlider.value);
    try {
      const result = await SystemCore.dispatch('MOOD_SUBMIT', moodValue);

      if (!result || result.error) {
        console.warn('UI received error or duplicate:', result);
        newBtn.disabled = false;
        return;
      }

      const savedMood = moodValue;
      newSlider.value = savedMood;
      valueLabel.textContent = savedMood + '%';

      const lang = localStorage.getItem('app_language') || 'ru';
      const localeMap = { ru: 'ru-RU', en: 'en-GB', es: 'es-ES', uk: 'uk-UA' };
      const locale = localeMap[lang] || 'ru-RU';
      const now  = new Date();
      const time = now.toLocaleTimeString(locale, { hour:"2-digit", minute:"2-digit" });
      const date = now.toLocaleDateString(locale, { day:"2-digit", month:"2-digit", year:"numeric" });
      if (savedLabel) savedLabel.textContent = `${time} (${date})`;

    } finally {
      newBtn.disabled = false;
    }
  });
}

export function onExit() {
  // cleanup listeners if needed
}

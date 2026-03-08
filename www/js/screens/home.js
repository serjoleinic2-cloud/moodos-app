export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");

  if (!slider) return;
  valueLabel.textContent = slider.value + "%";

  // Обновляем только отображение — сохранение делает app.js
  // Используем replaceWith-трюк чтобы не накапливались дубли listener при каждом onEnter
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
  });
}
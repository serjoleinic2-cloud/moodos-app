export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");

  if (!slider || !valueLabel) return;

  // Обновляем отображение текущего значения
  valueLabel.textContent = slider.value + "%";

  // Убираем старые listeners через cloneNode чтобы не копились
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);

  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
  });
}
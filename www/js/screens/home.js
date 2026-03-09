export function onEnter() {
  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  if (!slider || !valueLabel) return;
  valueLabel.textContent = slider.value + "%";
}
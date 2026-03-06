import { detectMoodState } from "../services/state-engine.js";
import { addMoodEntry, getMoodHistory } from "../services/memory.js";

export function onEnter() {

  const slider     = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const confirmBtn = document.getElementById("moodConfirmBtn");
  const savedLabel = document.getElementById("moodSavedLabel");

  if (!slider) return;

  valueLabel.textContent = slider.value + "%";

  slider.addEventListener("input", () => {
    valueLabel.textContent = slider.value + "%";
  });

  // Показываем дату последнего сохранения при входе на экран
  showLastSaved(savedLabel);

  confirmBtn.addEventListener("click", () => {
    const moodValue = Number(slider.value);
    const state     = detectMoodState(moodValue);

    addMoodEntry({
      value: moodValue,
      state: state,
      time:  Date.now()
    });

    showLastSaved(savedLabel);
  });
}

function showLastSaved(label) {
  if (!label) return;

  // Берём последнюю запись из истории
  const history = getMoodHistory();
  if (!history || !history.length) {
    label.textContent = "";
    return;
  }

  const last = history[history.length - 1];
  const date = new Date(last.time);

  const time = date.toLocaleTimeString("ru-RU", {
    hour:   "2-digit",
    minute: "2-digit"
  });

  const today     = new Date();
  const isToday   = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let dateStr;
  if (isToday) {
    dateStr = "сегодня";
  } else if (isYesterday) {
    dateStr = "вчера";
  } else {
    dateStr = date.toLocaleDateString("ru-RU", {
      day:   "numeric",
      month: "short"
    });
  }

  label.textContent = `⏱ ${dateStr} в ${time}`;
}
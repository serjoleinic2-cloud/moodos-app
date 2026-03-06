// ===============================
// MoodOS Voice Screen
// ===============================

import { getVoiceHistory } from "../services/memory.js";

export function onEnter() {

  const container =
    document.getElementById("voice-content");

  if (!container) return;

  const history = getVoiceHistory();

  if (!history || history.length === 0) {
    container.innerHTML =
      "<p>No reflections yet</p>";
    return;
  }

  container.innerHTML = "";

  history
    .slice()
    .reverse()
    .forEach(item => {

      const date =
        new Date(item.time)
          .toLocaleString();

      const el =
        document.createElement("div");

      el.className = "voice-card";

      el.innerHTML = `
        <p>${date}</p>
        <audio controls src="${item.audio}"></audio>
      `;

      container.appendChild(el);
    });
}
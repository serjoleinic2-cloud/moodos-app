// ===============================
// Neyra Voice Screen
// ===============================

import { getVoiceHistory } from "../services/memory.js";
import { t } from "../i18n.js";

export function onEnter() {

  const container =
    document.getElementById("voice-content");

  if (!container) return;

  const history = getVoiceHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="neyra-empty">
        <div class="neyra-empty-icon">🎙️</div>
        <div class="neyra-empty-title">${t("hist_no_data")}</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="neyra-list neyra-scroll-container" style="max-height: 400px;">
      ${history.slice().reverse().map((item, index) => {
        const date = new Date(item.date || item.time).toLocaleString();
        const duration = item.duration || 0;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        let audioSrc = item.audio || item.uri || '';
        const Capacitor = window.Capacitor;
        if (Capacitor?.convertFileSrc && audioSrc.startsWith("file://")) {
          audioSrc = Capacitor.convertFileSrc(audioSrc);
        }
        const durationStr = mins > 0 
          ? `${mins}:${String(secs).padStart(2, "0")}` 
          : `${secs} сек`;
        
        return `
          <div class="neyra-card neyra-card-voice">
            <div class="neyra-card-header">
              <div class="neyra-flex neyra-items-center neyra-gap-sm">
                <span>🎙️</span>
                <span class="neyra-text-caption">${date}</span>
              </div>
              <span class="neyra-badge neyra-badge-purple">${durationStr}</span>
            </div>
            <audio controls src="${audioSrc}" class="neyra-audio-player" style="margin-top: var(--neyra-space-sm);"></audio>
          </div>
        `;
      }).join('')}
    </div>
    <div class="neyra-empty" style="margin-top: var(--neyra-space-xl);">
      <div class="neyra-empty-text">${t("voice_notes_caption")}</div>
    </div>
  `;
}

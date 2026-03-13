// =====================================
// MoodOS — Backup Service
// =====================================
// Создаёт JSON-файл со всеми данными пользователя.
// Сохраняет через navigator.share (Android) или скачивание.
// Google Drive: файл можно загрузить вручную или автоматически
// через OAuth (будущая версия).

import {
  getMoodHistory,
  getNotesHistory,
  getVoiceHistory,
  getSessionHistory,
  getPhotoHistory,
} from "./memory.js";
import { getProfile } from "./user-profile.js";

/**
 * Собирает все данные из localStorage в один объект.
 * @returns {{ fileName: string, blob: Blob, data: object }}
 */
export function createWeeklyBackup() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const data = {
    version: 1,
    created: now.toISOString(),
    mood_history:    getMoodHistory()    || [],
    notes_history:   getNotesHistory()   || [],
    voice_history:   getVoiceHistory()   || [],
    session_history: getSessionHistory() || [],
    photo_history:   getPhotoHistory()   || [],
    user_profile:    getProfile()        || {},
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const fileName = `MoodOS-backup-${dateStr}.json`;

  return { fileName, blob, data };
}

/**
 * Создаёт бэкап и предлагает поделиться / скачать.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function backupAndShare() {
  const { fileName, blob, data } = createWeeklyBackup();

  const totalEntries =
    data.mood_history.length +
    data.notes_history.length +
    data.session_history.length;

  // Пробуем Web Share API (работает на Android)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "MoodOS Backup",
          text: `Резервная копия MoodOS (${totalEntries} записей)`,
          files: [file],
        });
        return { success: true, message: "shared" };
      } catch (e) {
        if (e.name === "AbortError") {
          return { success: false, message: "cancelled" };
        }
      }
    }
  }

  // Fallback — скачивание файла
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { success: true, message: "downloaded" };
}

/**
 * Восстанавливает данные из JSON-файла.
 * @param {File} file
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function restoreFromBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.mood_history) {
          resolve({ success: false, message: "invalid_file" });
          return;
        }

        // Восстанавливаем все данные
        if (data.mood_history)    localStorage.setItem("mood_history",    JSON.stringify(data.mood_history));
        if (data.notes_history)   localStorage.setItem("notes_history",   JSON.stringify(data.notes_history));
        if (data.voice_history)   localStorage.setItem("voice_history",   JSON.stringify(data.voice_history));
        if (data.session_history) localStorage.setItem("session_history", JSON.stringify(data.session_history));
        if (data.photo_history)   localStorage.setItem("photo_history",   JSON.stringify(data.photo_history));
        if (data.user_profile)    localStorage.setItem("user_profile",    JSON.stringify(data.user_profile));

        resolve({ success: true, message: "restored" });
      } catch (err) {
        resolve({ success: false, message: "parse_error" });
      }
    };
    reader.onerror = () => resolve({ success: false, message: "read_error" });
    reader.readAsText(file);
  });
}

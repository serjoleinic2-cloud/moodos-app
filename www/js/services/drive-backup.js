import { getMoodHistory, getNotesHistory, getSessionHistory } from "./memory.js";
import { getProfile } from "./user-profile.js";

const LS_LAST = "last_auto_backup";

// Обрабатывает массив чанками по 20, между каждым отпускает UI поток
async function processChunked(source, target) {
  const CHUNK_SIZE = 20;
  for (let i = 0; i < source.length; i += CHUNK_SIZE) {
    const chunk = source.slice(i, i + CHUNK_SIZE);
    target.push(...chunk);
    await new Promise(resolve => setTimeout(resolve, 0)); // yield UI
  }
}

// Основная функция бэкапа — async, чанками, без блокировки
export async function createSafeBackup() {
  try {
    const result = {
      mood_history:    [],
      notes_history:   [],
      session_history: [],
      user_profile:    getProfile(),
      exported_at:     Date.now(),
    };

    // Берём последние 200 записей для безопасности
    const moods    = getMoodHistory().slice(-200);
    const notes    = getNotesHistory().slice(-200);
    const sessions = getSessionHistory().slice(-200);

    console.log("Backup start — mood:", moods.length, "notes:", notes.length, "sessions:", sessions.length);

    await processChunked(moods,    result.mood_history);
    await processChunked(notes,    result.notes_history);
    await processChunked(sessions, result.session_history);

    const json = JSON.stringify(result);
    console.log("Backup done — size:", json.length, "bytes");

    return new Blob([json], { type: "application/json" });

  } catch (e) {
    console.error("Backup error:", e);
    return null;
  }
}

// Старый экспорт — совместимость с другими файлами
export function createWeeklyBackup() {
  const date     = new Date();
  const year     = date.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const week     = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
  const fileName = `MoodOS-backup-${year}-week${week}.json`;
  // Возвращаем null — реальный бэкап только через createSafeBackup()
  return { fileName, blob: null };
}

export function getLastBackupTime() {
  const ts = parseInt(localStorage.getItem(LS_LAST) || "0");
  return ts ? new Date(ts) : null;
}

export async function restoreFromBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.mood_history) { resolve({ success: false, message: "invalid_file" }); return; }
        if (data.mood_history)    localStorage.setItem("mood_history",    JSON.stringify(data.mood_history));
        if (data.notes_history)   localStorage.setItem("notes_history",   JSON.stringify(data.notes_history));
        if (data.session_history) localStorage.setItem("session_history", JSON.stringify(data.session_history));
        if (data.user_profile)    localStorage.setItem("user_profile",    JSON.stringify(data.user_profile));
        resolve({ success: true, message: "restored" });
      } catch { resolve({ success: false, message: "parse_error" }); }
    };
    reader.onerror = () => resolve({ success: false, message: "read_error" });
    reader.readAsText(file);
  });
}

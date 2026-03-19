import {
  getMoodHistory,
  getNotesHistory,
  getSessionHistory
} from "./memory.js";
import { getProfile } from "./user-profile.js";

const LS_LAST = "last_auto_backup";

function getWeekFileName() {
  const date     = new Date();
  const year     = date.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const week     = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);
  return `MoodOS-backup-${year}-week${week}.json`;
}

// Только лёгкие данные — БЕЗ photo_history и voice_history
// (они содержат base64, JSON.stringify вешает UI поток на Android)
function collectLightData() {
  return {
    version: 2,
    mood_history:    getMoodHistory()    || [],
    notes_history:   getNotesHistory()   || [],
    session_history: getSessionHistory() || [],
    user_profile:    getProfile()        || {},
    exported_at:     Date.now(),
  };
}

// Старый экспорт — совместимость
export function createWeeklyBackup() {
  try {
    const data = collectLightData();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: "application/json" });
    return { fileName: getWeekFileName(), blob };
  } catch (e) {
    console.error("Backup error:", e);
    return null;
  }
}

// Кнопка "Сохранить данные" в настройках
export async function backupAndShare() {
  try {
    const data     = collectLightData();
    const json     = JSON.stringify(data, null, 2);
    const fileName = getWeekFileName();
    const blob     = new Blob([json], { type: "application/json" });

    try {
      if (navigator.share) {
        const file = new File([blob], fileName, { type: "application/json" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "MoodOS Backup", files: [file] });
          localStorage.setItem(LS_LAST, String(Date.now()));
          return { success: true, message: "shared" };
        }
      }
    } catch (e) {
      if (e.name === "AbortError") return { success: false, message: "cancelled" };
    }

    // Fallback — скачивание
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    localStorage.setItem(LS_LAST, String(Date.now()));
    return { success: true, message: "downloaded" };

  } catch (e) {
    console.error("backupAndShare:", e);
    return { success: false, message: "error" };
  }
}

export function getLastBackupTime() {
  const ts = parseInt(localStorage.getItem(LS_LAST) || "0");
  return ts ? new Date(ts) : null;
}

// Восстановление из .json файла
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

// =====================================
// MoodOS Drive Backup — Фаза 1
// Экспорт данных через Android share-меню
// Google Drive OAuth — Фаза 2 (после MVP)
// =====================================

import { getMoodHistory, getNotesHistory, getSessionHistory } from "./memory.js";
import { getProfile } from "./user-profile.js";

const LS_LAST_BACKUP = "last_auto_backup";

export function getLastBackupTime() {
  try {
    const ts = localStorage.getItem(LS_LAST_BACKUP);
    return ts ? new Date(parseInt(ts)) : null;
  } catch(e) { return null; }
}

function buildBackupData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    mood_history:    getMoodHistory().slice(-500),
    notes_history:   getNotesHistory().slice(-500),
    session_history: getSessionHistory().slice(-500),
    user_profile:    getProfile() || {},
  };
}

export async function backupAndShare() {
  try {
    const data     = buildBackupData();
    const json     = JSON.stringify(data, null, 2);
    const fileName = "MoodOS_backup_" + new Date().toISOString().slice(0,10) + ".json";

    const Share      = window.Capacitor?.Plugins?.Share;
    const Filesystem = window.Capacitor?.Plugins?.Filesystem;

    if (Share && Filesystem) {
      const base64 = btoa(unescape(encodeURIComponent(json)));
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: "CACHE",
      });
      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: "CACHE",
      });
      await Share.share({
        title: "MoodOS Backup",
        text: "Резервная копия данных MoodOS",
        url: uri,
        dialogTitle: "Сохранить резервную копию",
      });
      localStorage.setItem(LS_LAST_BACKUP, Date.now().toString());
      return { success: true, message: "shared" };
    }

    // Fallback — скачивание через blob
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem(LS_LAST_BACKUP, Date.now().toString());
    return { success: true, message: "downloaded" };

  } catch(e) {
    if (e.name === "AbortError") return { success: false, message: "cancelled" };
    console.warn("backupAndShare error:", e);
    return { success: false, message: e.message };
  }
}

export async function restoreFromBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.mood_history) {
          resolve({ success: false, message: "Неверный формат файла" });
          return;
        }
        if (data.mood_history)    localStorage.setItem("mood_history",    JSON.stringify(data.mood_history));
        if (data.notes_history)   localStorage.setItem("notes_history",   JSON.stringify(data.notes_history));
        if (data.session_history) localStorage.setItem("session_history", JSON.stringify(data.session_history));
        if (data.user_profile)    localStorage.setItem("user_profile",    JSON.stringify(data.user_profile));
        resolve({ success: true });
      } catch(err) {
        resolve({ success: false, message: "Ошибка чтения: " + err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, message: "Не удалось прочитать файл" });
    reader.readAsText(file);
  });
}

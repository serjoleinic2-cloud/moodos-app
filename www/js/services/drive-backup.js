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

        function mergeByTimestamp(localKey, backupArr, timestampField) {
          try {
            const local = JSON.parse(localStorage.getItem(localKey) || "[]");
            const merged = [...local, ...backupArr];
            const seen = new Set();
            const deduped = merged.filter(item => {
              const key = item[timestampField] || item.time || item.timestamp;
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            deduped.sort((a, b) => {
              const ta = a[timestampField] || a.time || a.timestamp || 0;
              const tb = b[timestampField] || b.time || b.timestamp || 0;
              return ta - tb;
            });
            localStorage.setItem(localKey, JSON.stringify(deduped));
          } catch(err) {
            console.warn("mergeByTimestamp error for " + localKey + ":", err.message);
          }
        }

        if (data.mood_history)    mergeByTimestamp("mood_history",    data.mood_history,    "time");
        if (data.notes_history)   mergeByTimestamp("notes_history",   data.notes_history,   "timestamp");
        if (data.session_history) mergeByTimestamp("session_history", data.session_history, "timestamp");

        // user_profile — просто перезаписываем (не массив)
        if (data.user_profile) localStorage.setItem("user_profile", JSON.stringify(data.user_profile));

        resolve({ success: true });
      } catch(err) {
        resolve({ success: false, message: "Ошибка чтения: " + err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, message: "Не удалось прочитать файл" });
    reader.readAsText(file);
  });
}

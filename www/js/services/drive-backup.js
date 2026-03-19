// =====================================
// MoodOS — Backup Service
// =====================================

import { getMoodHistory, getNotesHistory, getVoiceHistory, getSessionHistory, getPhotoHistory } from "./memory.js";
import { getProfile } from "./user-profile.js";

const LS_LAST_AUTO  = "last_auto_backup";
const LS_BACKUP_DUE = "backup_due"; // флаг: нужен бэкап
const ONE_DAY_MS    = 24 * 60 * 60 * 1000;

function collectData() {
  return {
    version: 2,
    created: new Date().toISOString(),
    mood_history:    getMoodHistory()    || [],
    notes_history:   getNotesHistory()   || [],
    voice_history:   getVoiceHistory()   || [],
    session_history: getSessionHistory() || [],
    photo_history:   getPhotoHistory()   || [],
    user_profile:    getProfile()        || {},
  };
}

function makeFileName() {
  return "MoodOS-backup-" + new Date().toISOString().slice(0, 10) + ".json";
}

async function doShare(json, fileName) {
  const blob = new Blob([json], { type: "application/json" });

  try {
    if (navigator.share) {
      const file = new File([blob], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "MoodOS Backup",
          text: "Резервная копия данных MoodOS",
          files: [file],
        });
        return { success: true, message: "shared" };
      }
    }
  } catch (e) {
    if (e.name === "AbortError") return { success: false, message: "cancelled" };
  }

  // fallback: скачивание
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { success: true, message: "downloaded" };
}

/**
 * Ручной бэкап — вызывается только кнопкой из настроек.
 */
export async function backupAndShare() {
  const data   = collectData();
  const json   = JSON.stringify(data, null, 2);
  const name   = makeFileName();
  const result = await doShare(json, name);
  if (result.success) {
    localStorage.setItem(LS_LAST_AUTO, String(Date.now()));
    localStorage.removeItem(LS_BACKUP_DUE);
  }
  return result;
}

/**
 * Автобэкап при старте — ТОЛЬКО ставит флаг, никакого UI.
 * Не скачивает, не открывает меню, не блокирует ничего.
 * Реальный бэкап происходит когда пользователь открывает Настройки.
 */
export function tryAutoBackup() {
  try {
    const last = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
    if (Date.now() - last >= ONE_DAY_MS) {
      const history = getMoodHistory() || [];
      if (history.length > 0) {
        localStorage.setItem(LS_BACKUP_DUE, "1");
      }
    }
  } catch (e) {
    // тихо
  }
}

/**
 * Проверить: нужен ли бэкап (для badge в настройках).
 */
export function isBackupDue() {
  return localStorage.getItem(LS_BACKUP_DUE) === "1";
}

export function getLastBackupTime() {
  const ts = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
  return ts ? new Date(ts) : null;
}

/**
 * Восстановление из .json файла.
 */
export async function restoreFromBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.mood_history) {
          resolve({ success: false, message: "invalid_file" }); return;
        }
        if (data.mood_history)    localStorage.setItem("mood_history",    JSON.stringify(data.mood_history));
        if (data.notes_history)   localStorage.setItem("notes_history",   JSON.stringify(data.notes_history));
        if (data.voice_history)   localStorage.setItem("voice_history",   JSON.stringify(data.voice_history));
        if (data.session_history) localStorage.setItem("session_history", JSON.stringify(data.session_history));
        if (data.photo_history)   localStorage.setItem("photo_history",   JSON.stringify(data.photo_history));
        if (data.user_profile)    localStorage.setItem("user_profile",    JSON.stringify(data.user_profile));
        resolve({ success: true, message: "restored" });
      } catch { resolve({ success: false, message: "parse_error" }); }
    };
    reader.onerror = () => resolve({ success: false, message: "read_error" });
    reader.readAsText(file);
  });
}

// =====================================
// MoodOS — Backup Service
// =====================================
// Автосохранение раз в сутки.
// Сохраняет JSON-файл через Capacitor Filesystem (папка Documents/MoodOS/)
// или через Share/Download если Capacitor недоступен.
// Google Drive на Android автоматически синхронизирует папку Documents
// если пользователь включил Drive Backup в настройках телефона.
// OAuth не нужен — никаких popup, никакой регистрации.

import { getMoodHistory, getNotesHistory, getVoiceHistory, getSessionHistory, getPhotoHistory } from "./memory.js";
import { getProfile } from "./user-profile.js";

const LS_LAST_AUTO = "last_auto_backup";
const LS_LAST_PATH = "last_backup_path";
const ONE_DAY_MS   = 24 * 60 * 60 * 1000;

// ─── Сборка данных ─────────────────────────────────────────────
export function collectBackupData() {
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
  return `MoodOS-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// ─── Capacitor Filesystem ──────────────────────────────────────
async function saveViaCapacitor(json, fileName) {
  try {
    // Динамический импорт — не ломает веб-версию если Capacitor недоступен
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform()) return null;

    const { Filesystem, Directory } = await import("https://cdn.jsdelivr.net/npm/@capacitor/filesystem@6/+esm").catch(() => ({ Filesystem: null }));
    if (!Filesystem) return null;

    await Filesystem.writeFile({
      path: `MoodOS/${fileName}`,
      data: json,
      directory: Directory.Documents,
      recursive: true,
      encoding: "utf8",
    });
    const path = `Documents/MoodOS/${fileName}`;
    localStorage.setItem(LS_LAST_PATH, path);
    return { success: true, message: "saved_to_documents", path };
  } catch(e) {
    console.warn("Capacitor Filesystem:", e.message);
    return null;
  }
}

// ─── Share API / Download ──────────────────────────────────────
async function saveViaShare(json, fileName) {
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });

  if (navigator.share && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "MoodOS Backup", text: "Резервная копия данных MoodOS", files: [file] });
        return { success: true, message: "shared" };
      }
    } catch(e) {
      if (e.name === "AbortError") return { success: false, message: "cancelled" };
    }
  }

  // Скачивание как fallback
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true, message: "downloaded" };
}

// ─── Публичный API ─────────────────────────────────────────────

/**
 * Ручной бэкап. Сначала Capacitor, потом Share.
 */
export async function backupAndShare() {
  const data = collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const fileName = makeFileName();

  const cap = await saveViaCapacitor(json, fileName);
  if (cap?.success) {
    localStorage.setItem(LS_LAST_AUTO, Date.now().toString());
    return { ...cap, time: new Date() };
  }

  const result = await saveViaShare(json, fileName);
  if (result.success) localStorage.setItem(LS_LAST_AUTO, Date.now().toString());
  return { ...result, time: new Date() };
}

/**
 * Автобэкап при запуске. Тихий, раз в сутки.
 */
export async function tryAutoBackup() {
  try {
    const last = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
    if (Date.now() - last < ONE_DAY_MS) return;

    const data = collectBackupData();
    if (!data.mood_history?.length) return;

    const json     = JSON.stringify(data, null, 2);
    const fileName = makeFileName();

    const cap = await saveViaCapacitor(json, fileName);
    if (cap?.success) {
      localStorage.setItem(LS_LAST_AUTO, Date.now().toString());
      console.log("MoodOS: автобэкап →", cap.path);
    }
  } catch(e) {
    console.warn("tryAutoBackup error:", e.message);
  }
}

export function getLastBackupTime() {
  const ts = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
  return ts ? new Date(ts) : null;
}

export function getLastBackupPath() {
  return localStorage.getItem(LS_LAST_PATH) || null;
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
        if (!data.version || !data.mood_history) { resolve({ success: false, message: "invalid_file" }); return; }
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

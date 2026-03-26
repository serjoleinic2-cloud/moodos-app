// =====================================
// MoodOS Drive Backup — Фаза 1
// Экспорт данных через Android share-меню
// Google Drive OAuth — Фаза 2 (после MVP)
// =====================================

import { getMoodHistory, getNotesHistory, getSessionHistory } from "./memory.js";
import { getProfile, isPremium } from "./user-profile.js";
import { t } from "../i18n.js";

const LS_LAST_BACKUP = "last_auto_backup";
const FREE_DAYS_LIMIT = 7;

export function getLastBackupTime() {
  try {
    const ts = localStorage.getItem(LS_LAST_BACKUP);
    return ts ? new Date(parseInt(ts)) : null;
  } catch(e) { return null; }
}

function filterLast7Days(arr, timestampField) {
  const now = Date.now();
  const sevenDaysAgo = now - (FREE_DAYS_LIMIT * 24 * 60 * 60 * 1000);
  return arr.filter(item => {
    const ts = item[timestampField] || item.time || item.timestamp;
    return ts && parseInt(ts) >= sevenDaysAgo;
  });
}

function buildBackupData() {
  const profile = getProfile() || {};
  const premium = isPremium();
  
  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();
  const sessionHistory = getSessionHistory();

  let moodData, notesData, sessionData;
  
  if (premium) {
    moodData = moodHistory.slice(-500);
    notesData = notesHistory.slice(-500);
    sessionData = sessionHistory.slice(-500);
  } else {
    const filteredMood = filterLast7Days(moodHistory, "time");
    const filteredNotes = filterLast7Days(notesHistory, "timestamp");
    const filteredSessions = filterLast7Days(sessionHistory, "timestamp");
    moodData = filteredMood.slice(-500);
    notesData = filteredNotes.slice(-500);
    sessionData = filteredSessions.slice(-500);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    isLimitedBackup: !premium,
    mood_history:    moodData,
    notes_history:   notesData,
    session_history: sessionData,
    user_profile:    profile,
  };
}

export function getHistoryLimitInfo() {
  return {
    isLimited: !isPremium(),
    message: t("free_history_limit_title"),
    description: t("free_history_limit_desc"),
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

        const premium = isPremium();
        const isLimitedBackup = data.isLimitedBackup && !premium;
        let limitWarning = null;

        function mergeByTimestamp(localKey, backupArr, timestampField) {
          try {
            let arrToMerge = backupArr;
            
            if (!premium) {
              const now = Date.now();
              const sevenDaysAgo = now - (FREE_DAYS_LIMIT * 24 * 60 * 60 * 1000);
              arrToMerge = backupArr.filter(item => {
                const ts = item[timestampField] || item.time || item.timestamp;
                return ts && parseInt(ts) >= sevenDaysAgo;
              });
              if (arrToMerge.length < backupArr.length) {
                limitWarning = {
                  title: t("free_history_limit_title"),
                  desc: t("free_history_limit_desc")
                };
              }
            }

            const local = JSON.parse(localStorage.getItem(localKey) || "[]");
            const merged = [...local, ...arrToMerge];
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

        if (data.user_profile) localStorage.setItem("user_profile", JSON.stringify(data.user_profile));

        resolve({ success: true, limitWarning });
      } catch(err) {
        resolve({ success: false, message: "Ошибка чтения: " + err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, message: "Не удалось прочитать файл" });
    reader.readAsText(file);
  });
}

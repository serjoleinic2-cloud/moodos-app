// =====================================
// MoodOS Drive Backup — Pure Backup System
// Без авто popup, с разделением Free/Premium
// =====================================

import { getMoodHistory, getNotesHistory, getSessionHistory } from "./memory.js";
import { getProfile, isPremium } from "./user-profile.js";
import { t } from "../i18n.js";

const LS_BACKUPS = "moodos_backups";
const LS_LAST_BACKUP = "last_auto_backup";
const LS_DATA_HASH = "data_hash";
const LS_BACKUP_STATUS = "backup_status";

const FREE_BACKUP_LIMIT = 1;
const PREMIUM_BACKUP_LIMIT = 30;
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

function getBackupLimit() {
  return isPremium() ? PREMIUM_BACKUP_LIMIT : FREE_BACKUP_LIMIT;
}

export function getSystemBackupState() {
  const backups = loadBackups();
  const lastBackup = backups.backups.length > 0 ? backups.backups[backups.backups.length - 1] : null;
  const pendingChanges = hasDataChangedSinceBackup();
  
  return {
    lastBackupAt: lastBackup ? lastBackup.date : null,
    pendingChanges,
    totalBackups: backups.backups.length,
    maxBackups: getBackupLimit(),
    isPremium: isPremium()
  };
}

function loadBackups() {
  try {
    const raw = localStorage.getItem(LS_BACKUPS);
    return raw ? JSON.parse(raw) : { backups: [] };
  } catch(e) {
    return { backups: [] };
  }
}

function saveBackups(data) {
  try {
    localStorage.setItem(LS_BACKUPS, JSON.stringify(data));
    updateSystemStateBackup();
  } catch(e) {
    console.warn("saveBackups failed:", e);
  }
}

function updateSystemStateBackup() {
  if (window.systemState) {
    window.systemState.backup = getSystemBackupState();
  }
}

export function getLastBackupTime() {
  try {
    const ts = localStorage.getItem(LS_LAST_BACKUP);
    return ts ? new Date(parseInt(ts)) : null;
  } catch(e) { return null; }
}

export function getBackupStatus() {
  try {
    const backups = loadBackups();
    const hasBackup = backups.backups.length > 0;
    
    if (!hasBackup) {
      return { status: "none", text: t("settings_backup_never") || "никогда" };
    }
    
    const lastBackup = backups.backups[backups.backups.length - 1];
    const pendingChanges = hasDataChangedSinceBackup();
    
    if (pendingChanges) {
      return { status: "pending", text: t("settings_backup_pending") || "есть изменения", lastBackup };
    } else {
      return { status: "saved", text: t("settings_backup_saved") || "сохранено", lastBackup };
    }
  } catch(e) { return { status: "none", text: "" }; }
}

function computeDataHash() {
  try {
    const moodHistory = getMoodHistory();
    const notesHistory = getNotesHistory();
    const sessionHistory = getSessionHistory();
    const profile = getProfile();
    
    const data = JSON.stringify({
      moodCount: moodHistory.length,
      notesCount: notesHistory.length,
      sessionCount: sessionHistory.length,
      profileUpdated: profile?.updatedAt || 0,
      lastMoodTime: moodHistory.length > 0 ? (moodHistory[moodHistory.length - 1].time || 0) : 0,
      lastSessionTime: sessionHistory.length > 0 ? (sessionHistory[sessionHistory.length - 1].timestamp || 0) : 0,
    });
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  } catch(e) {
    return "0";
  }
}

export function hasDataChangedSinceBackup() {
  try {
    const currentHash = computeDataHash();
    const savedHash = localStorage.getItem(LS_DATA_HASH);
    return currentHash !== savedHash;
  } catch(e) { return true; }
}

function saveDataHash() {
  try {
    localStorage.setItem(LS_DATA_HASH, computeDataHash());
  } catch(e) {}
}

function buildBackupData() {
  const profile = getProfile() || {};
  const premium = isPremium();
  
  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();
  const sessionHistory = getSessionHistory();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    isLimitedBackup: !premium,
    mood_history: moodHistory.slice(-500),
    notes_history: notesHistory.slice(-500),
    session_history: sessionHistory.slice(-500),
    user_profile: profile,
  };
}

function generateBackupId() {
  return "bkp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

export function createBackup() {
  try {
    const backups = loadBackups();
    const backupData = buildBackupData();
    const backupEntry = {
      id: generateBackupId(),
      date: Date.now(),
      data: backupData
    };
    
    backups.backups.push(backupEntry);
    
    const limit = getBackupLimit();
    if (backups.backups.length > limit) {
      backups.backups = backups.backups.slice(-limit);
    }
    
    saveBackups(backups);
    localStorage.setItem(LS_LAST_BACKUP, Date.now().toString());
    saveDataHash();
    localStorage.setItem(LS_BACKUP_STATUS, "saved");
    
    console.log("[BACKUP] Created backup, total:", backups.backups.length);
    return { success: true, id: backupEntry.id };
  } catch(e) {
    console.warn("createBackup failed:", e);
    return { success: false, message: e.message };
  }
}

export function getLatestBackup() {
  const backups = loadBackups();
  if (backups.backups.length === 0) return null;
  return backups.backups[backups.backups.length - 1];
}

export async function shareBackup() {
  try {
    const latest = getLatestBackup();
    if (!latest) {
      return { success: false, message: "no_backup" };
    }
    
    const json = JSON.stringify(latest.data, null, 2);
    const fileName = "MoodOS_backup_" + new Date(latest.date).toISOString().slice(0,10) + ".json";

    const Share = window.Capacitor?.Plugins?.Share;
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
      return { success: true, message: "shared" };
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, message: "downloaded" };

  } catch(e) {
    if (e.name === "AbortError") return { success: false, message: "cancelled" };
    console.warn("shareBackup error:", e);
    return { success: false, message: e.message };
  }
}

export async function autoBackup() {
  if (!isPremium()) return { skipped: true, reason: "not_premium" };
  
  try {
    const now = Date.now();
    const lastBackup = getLastBackupTime();
    const timeSinceLastBackup = lastBackup ? (now - lastBackup.getTime()) : Infinity;
    
    if (timeSinceLastBackup < AUTO_BACKUP_INTERVAL) {
      return { skipped: true, reason: "too_soon" };
    }
    
    if (!hasDataChangedSinceBackup()) {
      return { skipped: true, reason: "no_changes" };
    }
    
    createBackup();
    return { success: true, message: "auto_backup_created" };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

export function resetBackupStatus() {
  try {
    if (hasDataChangedSinceBackup()) {
      localStorage.setItem(LS_BACKUP_STATUS, "pending");
    } else {
      localStorage.setItem(LS_BACKUP_STATUS, "saved");
    }
    updateSystemStateBackup();
  } catch(e) {}
}

export function clearAllBackups() {
  try {
    localStorage.removeItem(LS_BACKUPS);
    localStorage.removeItem(LS_LAST_BACKUP);
    localStorage.removeItem(LS_DATA_HASH);
    localStorage.removeItem(LS_BACKUP_STATUS);
    updateSystemStateBackup();
  } catch(e) {}
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

        if (data.mood_history) mergeByTimestamp("mood_history", data.mood_history, "time");
        if (data.notes_history) mergeByTimestamp("notes_history", data.notes_history, "timestamp");
        if (data.session_history) mergeByTimestamp("session_history", data.session_history, "timestamp");
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

export function initBackupSystem() {
  updateSystemStateBackup();
}

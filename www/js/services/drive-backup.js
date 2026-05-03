// =====================================
// Neyra Drive Backup — Pure Backup System
// Без авто popup, с разделением Free/Premium
// =====================================

import { getMoodHistory, getNotesHistory, getSessionHistory, resolveTimestamp } from "./memory.js";
import { getProfile, isPremium } from "./user-profile.js";
import { t } from "../i18n.js";
import { migrateBackupData, BackupVersion } from "../core/migration-registry.js";
import { auditLogger } from "../core/audit-logger.js";

const LS_BACKUPS = "moodos_backups";
const LS_LAST_BACKUP = "last_auto_backup";
const LS_DATA_HASH = "data_hash";
const LS_BACKUP_STATUS = "backup_status";
const LS_BACKUP_VERSION = "backup_version_check";

const CURRENT_BACKUP_VERSION = 3;

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
  const premium = isPremium();
  
  let backupInfo = null;
  if (lastBackup?.data) {
    backupInfo = {
      type: lastBackup.data.backupType || (premium ? "premium" : "free"),
      range: lastBackup.data.backupRange || (premium ? "all" : "7d"),
      moodCount: lastBackup.data.moodCount || 0,
      notesCount: lastBackup.data.notesCount || 0,
      sessionCount: lastBackup.data.sessionCount || 0
    };
  }
  
  return {
    lastBackupAt: lastBackup ? lastBackup.date : null,
    pendingChanges,
    totalBackups: backups.backups.length,
    maxBackups: getBackupLimit(),
    isPremium: premium,
    backupInfo
  };
}

function loadBackups() {
  try {
    const raw = localStorage.getItem(LS_BACKUPS);
    if (!raw) return { backups: [] };
    
    const parsed = JSON.parse(raw);
    if (!parsed.backups || !Array.isArray(parsed.backups)) {
      console.warn('[BACKUP] Invalid backups format, clearing');
      localStorage.removeItem(LS_BACKUPS);
      return { backups: [] };
    }
    
    const validBackups = [];
    const corrupted = [];
    
    for (const backup of parsed.backups) {
      if (validateBackupEntry(backup)) {
        validBackups.push(backup);
      } else {
        corrupted.push(backup.id || 'unknown');
      }
    }
    
    if (corrupted.length > 0) {
      console.warn('[BACKUP] Found', corrupted.length, 'corrupted backups, filtering out:', corrupted);
      saveBackups({ backups: validBackups });
    }
    
    return { backups: validBackups };
  } catch(e) {
    console.warn('[BACKUP] Failed to load backups, clearing:', e.message);
    localStorage.removeItem(LS_BACKUPS);
    return { backups: [] };
  }
}

function validateBackupEntry(backup) {
  if (!backup || typeof backup !== 'object') return false;
  if (!backup.id || !backup.date || !backup.data) return false;
  if (typeof backup.data !== 'object') return false;
  if (!backup.data.version) return false;
  
  const required = ['mood_history', 'notes_history', 'session_history', 'user_profile'];
  for (const field of required) {
    if (!Array.isArray(backup.data[field])) return false;
  }
  
  return true;
}

function getPreviousValidBackup(excludeId) {
  const backups = loadBackups();
  const valid = backups.backups
    .filter(b => b.id !== excludeId)
    .sort((a, b) => b.date - a.date);
  
  return valid.length > 0 ? valid[0] : null;
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

async function computeChecksum(data) {
  try {
    const jsonStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch(e) {
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

function computeDataHash() {
  try {
    const moodHistory = getMoodHistory();
    const notesHistory = getNotesHistory();
    const sessionHistory = getSessionHistory();
    const profile = getProfile();
    
    const data = {
      moodCount: moodHistory.length,
      notesCount: notesHistory.length,
      sessionCount: sessionHistory.length,
      profileUpdated: profile?.updatedAt || 0,
      lastMoodTime: moodHistory.length > 0 ? (moodHistory[moodHistory.length - 1].time || 0) : 0,
      lastSessionTime: sessionHistory.length > 0 ? (sessionHistory[sessionHistory.length - 1].timestamp || 0) : 0,
    };
    
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
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

const FREE_BACKUP_DAYS = 7;

function filterByDays(arr, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return arr.filter(item => {
    const time = item.time || item.timestamp || 0;
    return time >= cutoff;
  });
}

function buildBackupData() {
  const profile = getProfile() || {};
  const premium = isPremium();
  
  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();
  const sessionHistory = getSessionHistory();

  let slicedMood, slicedNotes, slicedSession;
  let backupType, backupRange;
  
  if (premium) {
    slicedMood = moodHistory;
    slicedNotes = notesHistory;
    slicedSession = sessionHistory;
    backupType = "premium";
    backupRange = "all";
  } else {
    slicedMood = filterByDays(moodHistory, FREE_BACKUP_DAYS);
    slicedNotes = filterByDays(notesHistory, FREE_BACKUP_DAYS);
    slicedSession = filterByDays(sessionHistory, FREE_BACKUP_DAYS);
    backupType = "free";
    backupRange = "7d";
  }

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    backupType,
    backupRange,
    moodCount: slicedMood.length,
    notesCount: slicedNotes.length,
    sessionCount: slicedSession.length,
    mood_history: slicedMood,
    notes_history: slicedNotes,
    session_history: slicedSession,
    user_profile: profile,
  };
}

function generateBackupId() {
  return "bkp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

export async function createBackup() {
  try {
    const backups = loadBackups();
    const backupData = buildBackupData();
    
    const checksum = await computeChecksum({
      mood_history: backupData.mood_history,
      notes_history: backupData.notes_history,
      session_history: backupData.session_history,
      user_profile: backupData.user_profile
    });
    
    const backupEntry = {
      id: generateBackupId(),
      date: Date.now(),
      version: CURRENT_BACKUP_VERSION,
      data: backupData,
      checksum: checksum
    };
    
    backups.backups.push(backupEntry);
    
    const limit = getBackupLimit();
    if (backups.backups.length > limit) {
      backups.backups.sort((a, b) => b.date - a.date);
      backups.backups = backups.backups.slice(0, limit);
    }
    
    saveBackups(backups);
    localStorage.setItem(LS_LAST_BACKUP, Date.now().toString());
    saveDataHash();
    localStorage.setItem(LS_BACKUP_STATUS, "saved");
    localStorage.setItem(LS_BACKUP_VERSION, String(CURRENT_BACKUP_VERSION));
    
    console.log("[BACKUP] Created backup, total:", backups.backups.length, "checksum:", checksum.slice(0, 8) + "...");
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
    const fileName = "Neyra_backup_" + new Date(latest.date).toISOString().slice(0,10) + ".json";

    const Share = window.Capacitor?.Plugins?.Share;
    const Filesystem = window.Capacitor?.Plugins?.Filesystem;

    if (Share && Filesystem) {
      const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, 
        (match, p1) => String.fromCharCode('0x' + p1)));
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
        title: "Neyra Backup",
        text: "Резервная копия данных Neyra",
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
    
    await createBackup();
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
    localStorage.removeItem(LS_BACKUP_VERSION);
    updateSystemStateBackup();
    console.log('[BACKUP] All backups cleared');
  } catch(e) {}
}

export async function restoreFromBackup(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let data = JSON.parse(e.target.result);
        
        if (!data.version || !data.mood_history) {
          resolve({ success: false, message: "Неверный формат файла" });
          return;
        }
        
        const migrationResult = await migrateBackupData(data);
        if (!migrationResult.success) {
          console.warn('[BACKUP] Migration had errors:', migrationResult.errors);
        }
        data = migrationResult.data;
        
        const validation = await validateRestoreData(data);
        if (!validation.valid) {
          console.warn('[BACKUP] Restore validation failed:', validation.reason);
          
          if (validation.canFallback) {
            const fallback = getPreviousValidBackup(validation.failedId);
            if (fallback) {
              console.log('[BACKUP] Falling back to previous backup:', fallback.id);
              const fallbackData = (await migrateBackupData(fallback.data)).data;
              const fallbackResult = await restoreFromBackupData(fallbackData);
              if (fallbackResult.success) {
                auditLogger.log(auditLogger.constructor.AuditEvent?.BACKUP_RESTORE || 'BACKUP_RESTORE', {
                  source: 'drive-backup',
                  details: { fallback: true, backupId: fallback.id }
                });
                resolve({ 
                  success: true, 
                  message: "corrupted_restored_previous",
                  restoredFrom: fallback.id 
                });
                return;
              }
            }
          }
          
          resolve({ success: false, message: validation.reason });
          return;
        }

        const result = await restoreFromBackupData(data);
        
        auditLogger.log('BACKUP_RESTORE', {
          source: 'drive-backup',
          details: {
            version: data.version,
            moodCount: data.mood_history?.length || 0,
            migratedFrom: migrationResult.migrationsApplied
          }
        });
        
        resolve(result);
      } catch(err) {
        auditLogger.log('RESTORE_FAILED', {
          source: 'drive-backup',
          details: { error: err.message }
        });
        resolve({ success: false, message: "Ошибка чтения: " + err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, message: "Не удалось прочитать файл" });
    reader.readAsText(file);
  });
}

async function validateRestoreData(data) {
  if (!data.mood_history || !Array.isArray(data.mood_history)) {
    return { valid: false, reason: "Отсутствуют данные о настроении", canFallback: false };
  }
  if (!data.notes_history || !Array.isArray(data.notes_history)) {
    return { valid: false, reason: "Отсутствуют заметки", canFallback: false };
  }
  if (!data.session_history || !Array.isArray(data.session_history)) {
    return { valid: false, reason: "Отсутствуют данные о сессиях", canFallback: false };
  }
  if (!data.user_profile) {
    return { valid: false, reason: "Отсутствует профиль пользователя", canFallback: false };
  }
  
  try {
    for (const mood of data.mood_history) {
      if (typeof mood.value !== 'number' || mood.value < 0 || mood.value > 100) {
        return { valid: false, reason: "Некорректные данные о настроении", canFallback: true, failedId: data.id };
      }
    }
  } catch(e) {
    return { valid: false, reason: "Ошибка валидации данных", canFallback: true };
  }
  
  return { valid: true };
}

async function restoreFromBackupData(data) {
  return new Promise((resolve) => {
    try {
      function mergeByTimestamp(localKey, backupArr) {
        try {
          const local = JSON.parse(localStorage.getItem(localKey) || "[]");
          const merged = [...local, ...backupArr];
          const seen = new Set();
          const deduped = merged.filter(item => {
            const key = resolveTimestamp(item);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          deduped.sort((a, b) => {
            const ta = resolveTimestamp(a) || 0;
            const tb = resolveTimestamp(b) || 0;
            return ta - tb;
          });
          localStorage.setItem(localKey, JSON.stringify(deduped));
        } catch(err) {
          console.warn("mergeByTimestamp error for " + localKey + ":", err.message);
        }
      }

      if (data.mood_history) mergeByTimestamp("mood_history", data.mood_history);
      if (data.notes_history) mergeByTimestamp("notes_history", data.notes_history);
      if (data.session_history) mergeByTimestamp("session_history", data.session_history);
      if (data.user_profile) localStorage.setItem("user_profile", JSON.stringify(data.user_profile));

      console.log('[BACKUP] Restore completed successfully');
      resolve({ success: true });
    } catch(err) {
      resolve({ success: false, message: "Ошибка восстановления: " + err.message });
    }
  });
}

export function initBackupSystem() {
  updateSystemStateBackup();
}

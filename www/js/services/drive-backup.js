// =====================================
// MoodOS — Backup Service
// =====================================
// Автосохранение раз в сутки на Google Drive.
// OAuth через Google Identity Services (без сервера).
// Fallback: share / скачивание JSON-файла.

import { getMoodHistory, getNotesHistory, getVoiceHistory, getSessionHistory, getPhotoHistory } from "./memory.js";
import { getProfile } from "./user-profile.js";

// ─── Константы ────────────────────────────────────────────────
const DRIVE_SCOPE      = "https://www.googleapis.com/auth/drive.appdata";
const DRIVE_LIST_URL   = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=name='MoodOS-backup.json'";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

const LS_TOKEN      = "gdrive_token";
const LS_TOKEN_EXP  = "gdrive_token_exp";
const LS_LAST_AUTO  = "gdrive_last_auto_backup";
const LS_CLIENT_ID  = "google_client_id";

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

export function createWeeklyBackup() {
  const data     = collectBackupData();
  const dateStr  = new Date().toISOString().slice(0, 10);
  const json     = JSON.stringify(data, null, 2);
  const blob     = new Blob([json], { type: "application/json" });
  const fileName = `MoodOS-backup-${dateStr}.json`;
  return { fileName, blob, data };
}

// ─── OAuth токен ───────────────────────────────────────────────
function getSavedToken() {
  const token = localStorage.getItem(LS_TOKEN);
  const exp   = parseInt(localStorage.getItem(LS_TOKEN_EXP) || "0");
  if (token && Date.now() < exp) return token;
  return null;
}

function saveToken(token, expiresIn) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_TOKEN_EXP, String(Date.now() + (expiresIn - 60) * 1000));
}

export function clearToken() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_TOKEN_EXP);
}

export function isSignedIn() {
  return !!getSavedToken();
}

export function saveClientId(id) {
  localStorage.setItem(LS_CLIENT_ID, id.trim());
}

export function getClientId() {
  return localStorage.getItem(LS_CLIENT_ID) || "";
}

function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload  = resolve;
    s.onerror = () => reject(new Error("gsi_load_failed"));
    document.head.appendChild(s);
  });
}

function requestToken() {
  return new Promise(async (resolve, reject) => {
    const clientId = getClientId();
    if (!clientId) { reject(new Error("no_client_id")); return; }
    try { await loadGIS(); } catch(e) { reject(e); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        saveToken(resp.access_token, resp.expires_in);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function getToken() {
  const cached = getSavedToken();
  if (cached) return cached;
  return await requestToken();
}

// ─── Drive API ─────────────────────────────────────────────────
async function uploadToDrive(token, jsonString) {
  // Ищем существующий файл чтобы обновить его
  const listRes  = await fetch(DRIVE_LIST_URL, { headers: { Authorization: `Bearer ${token}` } });
  const listData = await listRes.json();
  const existId  = listData.files?.[0]?.id;

  const metaObj = existId
    ? { name: "MoodOS-backup.json" }
    : { name: "MoodOS-backup.json", parents: ["appDataFolder"] };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metaObj)], { type: "application/json" }));
  form.append("file",     new Blob([jsonString],              { type: "application/json" }));

  const url    = existId ? `https://www.googleapis.com/upload/drive/v3/files/${existId}?uploadType=multipart` : DRIVE_UPLOAD_URL;
  const method = existId ? "PATCH" : "POST";

  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!res.ok) throw new Error(`drive_${res.status}`);
  return await res.json();
}

// ─── Публичные функции ─────────────────────────────────────────

/**
 * Ручной бэкап — пробует Drive, иначе share/скачивание.
 * @returns {Promise<{success, message, time?}>}
 */
export async function backupAndShare() {
  const data = collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const dateStr  = new Date().toISOString().slice(0, 10);
  const fileName = `MoodOS-backup-${dateStr}.json`;
  const blob     = new Blob([json], { type: "application/json" });

  // Пробуем Drive
  const clientId = getClientId();
  if (clientId) {
    try {
      const token = await getToken();
      await uploadToDrive(token, json);
      localStorage.setItem(LS_LAST_AUTO, Date.now().toString());
      return { success: true, message: "drive_saved", time: new Date() };
    } catch(e) {
      if (e.message === "no_client_id") {
        return { success: false, message: "need_setup" };
      }
      if (e.message === "access_denied" || e.message === "popup_closed_by_user") {
        return { success: false, message: "cancelled" };
      }
      // Drive недоступен — fallback
      console.warn("Drive failed:", e.message);
    }
  }

  // Fallback: share / скачивание
  return await _shareOrDownload(fileName, blob, data);
}

async function _shareOrDownload(fileName, blob, data) {
  const count = (data.mood_history?.length || 0) + (data.notes_history?.length || 0) + (data.session_history?.length || 0);
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: "MoodOS Backup", text: `Резервная копия MoodOS (${count} записей)`, files: [file] });
        return { success: true, message: "shared" };
      } catch(e) {
        if (e.name === "AbortError") return { success: false, message: "cancelled" };
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true, message: "downloaded" };
}

/**
 * Автобэкап — вызывать при старте app.js.
 * Тихий, только если уже авторизован и прошли сутки.
 */
export async function tryAutoBackup() {
  const lastAuto = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
  if (Date.now() - lastAuto < 24 * 60 * 60 * 1000) return;

  const token = getSavedToken();
  if (!token) return;

  try {
    const data = collectBackupData();
    if (!data.mood_history?.length) return;
    await uploadToDrive(token, JSON.stringify(data, null, 2));
    localStorage.setItem(LS_LAST_AUTO, Date.now().toString());
    console.log("MoodOS: автобэкап на Drive выполнен");
  } catch(e) {
    console.warn("MoodOS: автобэкап не удался:", e.message);
    if (e.message?.includes("drive_401")) clearToken();
  }
}

/**
 * Время последнего бэкапа.
 */
export function getLastBackupTime() {
  const ts = parseInt(localStorage.getItem(LS_LAST_AUTO) || "0");
  return ts ? new Date(ts) : null;
}

/**
 * Восстановление из JSON-файла.
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

// =====================================
// Neyra Cloud Sync Service
// Android Bridge → Firebase Firestore
// =====================================

export function isCloudEnabled() {
  return localStorage.getItem('cloud_enabled') === 'true';
}

let isRestoring = false;

export function syncToCloud(data) {
  if (!isCloudEnabled()) {
    return { success: false, error: 'no_consent' };
  }

  if (typeof data !== "object") {
    console.warn('[CLOUD] invalid payload type');
    return { success: false, error: 'invalid_type' };
  }

  if (isRestoring) {
    console.log('[CLOUD] skip — restoring');
    return { success: false, error: 'restoring' };
  }

  sendToCloud(data);
  return { success: true };
}

function sendToCloud(payload, retries = 2) {
  try {
    if (!window.Android) {
      console.warn('[CLOUD] Android bridge not available');
      setLastCloudSync(false);
      return;
    }
    window.Android.saveToCloud(JSON.stringify(payload));
    setLastCloudSync(true);
  } catch (e) {
    if (retries > 0) {
      setTimeout(() => sendToCloud(payload, retries - 1), 1000);
    } else {
      console.error('[CLOUD] send failed');
      setLastCloudSync(false);
    }
  }
}

window._cloudSyncPending = null;

export function setCloudSyncPending(data) {
  window._cloudSyncPending = data;
}

export function getCloudSyncPending() {
  return window._cloudSyncPending;
}

export async function loadFromCloud() {
  return null;
}

export async function mergeData(cloudData) {
  if (!cloudData) return;

  const cloudSyncedAt = Number(cloudData.syncedAt) || 0;
  if (!cloudSyncedAt || cloudSyncedAt < 1000000000000) {
    console.warn('[CLOUD] invalid syncedAt');
    return;
  }

  const localSyncedAt = parseInt(localStorage.getItem('syncedAt') || '0', 10);
  if (cloudSyncedAt <= localSyncedAt) {
    console.log('[CLOUD] Skip merge — local newer');
    return;
  }

  isRestoring = true;

  const keyMap = {
    mood: 'mood_history',
    notes: 'notes_history',
    reflections: 'reflections',
    voice: 'voice_history',
    sessions: 'session_history'
  };

  Object.keys(cloudData).forEach(key => {
    const storageKey = keyMap[key] || key;
    if (cloudData[key]) {
      try {
        localStorage.setItem(storageKey, cloudData[key]);
      } catch (e) {
        console.warn('[CLOUD] Failed to merge:', storageKey, e);
      }
    }
  });

  localStorage.setItem('syncedAt', cloudSyncedAt);

  setTimeout(() => { isRestoring = false; }, 1000);
}

export async function fullSync() {
  const data = collectLocalData();
  return syncToCloud(data);
}

export function collectLocalData() {
  const profileRaw = JSON.parse(localStorage.getItem('user_profile') || '{}');
  
  const {
    premium,
    premium_type,
    premiumExpiresAt,
    premium_since,
    premiumTrial,
    premiumPlan,
    isPremium,
    takesMeds,
    medEffect,
    baseFeeling,
    ...safeProfile
  } = profileRaw;
  
  return {
    mood: localStorage.getItem('mood_history'),
    notes: localStorage.getItem('notes_history'),
    reflections: localStorage.getItem('reflections'),
    voice: localStorage.getItem('voice_history'),
    sessions: localStorage.getItem('session_history'),
    profile: JSON.stringify(safeProfile),
    syncedAt: Date.now()
  };
}

let lastPayloadHash = null;

function hash(data) {
  return JSON.stringify(data).length;
}

function isPayloadSafe(payload) {
  try {
    const size = new Blob([JSON.stringify(payload)]).size;
    return size < 900000;
  } catch {
    return false;
  }
}

function truncatePayload(payload) {
  try {
    const clone = JSON.parse(JSON.stringify(payload));

    const trim = (key, max) => {
      if (!clone[key]) return;
      const arr = JSON.parse(clone[key] || '[]');
      if (Array.isArray(arr) && arr.length > max) {
        clone[key] = JSON.stringify(arr.slice(-max));
      }
    };

    trim('mood', 300);
    trim('notes', 300);
    trim('reflections', 120);
    trim('voice', 30);

    clone.syncedAt = Date.now();
    return clone;
  } catch {
    return payload;
  }
}

export function scheduleCloudSync() {
  if (!isCloudEnabled()) {
    return;
  }
  
  if (isRestoring) {
    console.log('[CLOUD] skip — restoring');
    return;
  }
  
  let data = collectLocalData();
  const h = hash(data);

  if (h === lastPayloadHash) {
    return;
  }

  if (!isPayloadSafe(data)) {
    console.warn('[CLOUD] Payload too large — truncating');
    data = truncatePayload(data);
  }

  lastPayloadHash = h;
  
  syncToCloud(data);
}

export function enableCloudSync() {
  localStorage.setItem('cloud_enabled', 'true');
  console.log('[CLOUD] enabled');
}

export function disableCloudSync() {
  localStorage.setItem('cloud_enabled', 'false');
  console.log('[CLOUD] disabled');
}

export function confirmDeleteCloud() {
  const ok = confirm("Delete ALL cloud data? This cannot be undone.");
  if (!ok) return;
  deleteAllCloudData();
}

export function deleteAllCloudData() {
  if (!window.Android) {
    console.warn('[CLOUD] Android bridge not available');
    return;
  }
  window.Android.deleteCloudData();
  
  localStorage.clear();
  window._lastCloudSync = { ok: true, time: Date.now(), deleted: true };
}

export function initCloudConsent() {
  if (localStorage.getItem('cloud_enabled') === null) {
    localStorage.setItem('cloud_enabled', 'false');
  }
}

window._lastCloudSync = { ok: false, time: 0 };

export function setLastCloudSync(ok) {
  window._lastCloudSync = {
    ok: ok,
    time: Date.now()
  };
}

export function safeParse(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('[STORAGE] quota exceeded:', key);
    }
    return false;
  }
}

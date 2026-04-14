// =====================================
// Neyra Storage Wrapper
// Abstraction layer for data persistence
// =====================================
// Currently: localStorage + optional Firebase sync

import { getUserId } from './userId.js';

const STORAGE_TYPE = {
  LOCAL: 'localStorage',
  FIREBASE: 'firebase',
  FIRESTORE: 'firestore'
};

let currentStorage = STORAGE_TYPE.LOCAL;
let cloudSyncEnabled = false;

export function setStorageType(type) {
  currentStorage = type;
}

export function getStorageType() {
  return currentStorage;
}

export function enableCloudSync() {
  cloudSyncEnabled = true;
}

export function disableCloudSync() {
  cloudSyncEnabled = false;
}

export function isCloudSyncEnabled() {
  return cloudSyncEnabled;
}

// ---- Auto Sync Hook ----

let syncTimeout = null;
const SYNC_DEBOUNCE = 5000;

function scheduleCloudSync() {
  if (!cloudSyncEnabled) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    try {
      const { syncToCloud, collectLocalData } = await import('../cloud/cloud-sync.js');
      const data = collectLocalData();
      await syncToCloud(data);
    } catch (e) {
      console.warn('[STORAGE] Cloud sync scheduled but failed:', e);
    }
  }, SYNC_DEBOUNCE);
}

export async function saveData(key, data) {
  const userId = getUserId();
  const fullKey = `${userId}_${key}`;
  
  const result = saveToLocalStorage(fullKey, data);
  
  if (cloudSyncEnabled && result.success) {
    scheduleCloudSync();
  }
  
  return result;
}

export async function loadData(key) {
  const userId = getUserId();
  const fullKey = `${userId}_${key}`;
  
  switch (currentStorage) {
    case STORAGE_TYPE.LOCAL:
      return loadFromLocalStorage(fullKey);
    case STORAGE_TYPE.FIREBASE:
    case STORAGE_TYPE.FIRESTORE:
      return loadFromCloud(fullKey);
    default:
      return loadFromLocalStorage(fullKey);
  }
}

export async function deleteData(key) {
  const userId = getUserId();
  const fullKey = `${userId}_${key}`;
  
  const result = deleteFromLocalStorage(fullKey);
  
  if (cloudSyncEnabled && result.success) {
    scheduleCloudSync();
  }
  
  return result;
}

// ---- LocalStorage Implementation ----

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return { success: true };
  } catch (e) {
    console.error('[STORAGE] localStorage save error:', e);
    return { success: false, error: e.message };
  }
}

function loadFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[STORAGE] localStorage load error:', e);
    return null;
  }
}

function deleteFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ---- Cloud Implementation ----

async function saveToCloud(key, data) {
  console.log('[STORAGE] Cloud save:', key);
  try {
    const { syncToCloud, collectLocalData } = await import('../cloud/cloud-sync.js');
    const allData = collectLocalData();
    await syncToCloud(allData);
    return { success: true };
  } catch (e) {
    console.error('[STORAGE] Cloud save error:', e);
    return { success: false, error: e.message };
  }
}

async function loadFromCloud(key) {
  console.log('[STORAGE] Cloud load:', key);
  try {
    const { loadFromCloud: loadCloud } = await import('../cloud/cloud-sync.js');
    const data = await loadCloud();
    return data;
  } catch (e) {
    console.error('[STORAGE] Cloud load error:', e);
    return null;
  }
}

async function deleteFromCloud(key) {
  console.log('[STORAGE] Cloud delete:', key);
  return { success: false, error: 'Not implemented' };
}

// ---- Utility ----

export async function syncToCloudNow() {
  if (!cloudSyncEnabled) {
    console.log('[STORAGE] Cloud sync disabled');
    return { success: false };
  }
  
  try {
    const { fullSync } = await import('../cloud/cloud-sync.js');
    return await fullSync();
  } catch (e) {
    console.error('[STORAGE] Sync error:', e);
    return { success: false, error: e.message };
  }
}

export async function restoreFromCloud() {
  try {
    const { loadFromCloud, mergeData } = await import('../cloud/cloud-sync.js');
    const cloudData = await loadFromCloud();
    if (cloudData) {
      await mergeData(cloudData);
      return { success: true };
    }
    return { success: false, error: 'no_data' };
  } catch (e) {
    console.error('[STORAGE] Restore error:', e);
    return { success: false, error: e.message };
  }
}

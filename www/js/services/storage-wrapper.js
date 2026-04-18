// =====================================
// Neyra Storage Wrapper
// Local-first data persistence
// =====================================

const STORAGE_TYPE = {
  LOCAL: 'localStorage'
};

let currentStorage = STORAGE_TYPE.LOCAL;

export function setStorageType(type) {
  currentStorage = type;
}

export function getStorageType() {
  return currentStorage;
}

export async function saveData(key, data) {
  const fullKey = key;
  return saveToLocalStorage(fullKey, data);
}

export async function loadData(key) {
  const fullKey = key;
  return loadFromLocalStorage(fullKey);
}

export async function deleteData(key) {
  const fullKey = key;
  return deleteFromLocalStorage(fullKey);
}

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

export function syncToCloudNow() {
  console.log('[STORAGE] Cloud sync disabled — local-first mode');
  return { success: false };
}

export function restoreFromCloud() {
  console.log('[STORAGE] Cloud restore disabled — local-first mode');
  return { success: false, error: 'disabled' };
}

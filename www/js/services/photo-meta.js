const DB_NAME    = 'neyra_photo_meta';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('meta', { keyPath: 'entryId' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function savePhotoMeta(entryId, meta) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('meta', 'readwrite');
    const req = tx.objectStore('meta').put({ entryId: String(entryId), ...meta });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getPhotoMeta(entryId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get(String(entryId));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
}

export async function deletePhotoMeta(entryId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('meta', 'readwrite');
    const req = tx.objectStore('meta').delete(String(entryId));
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllPhotoMeta() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}

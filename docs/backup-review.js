// =====================================
// backup-review.js
// Neyra Backup/Restore/Share Logic Review
// =====================================

// MOCKS / DEPENDENCIES
// ====================
// import { isPremium } from './services/user-profile.js'
// import { canExportBackup, markBackupSuccess } from './services/backup-reminder.js'
// import { disableExitGuardForReload } from './services/exit-guard.js'
// import { t } from './i18n.js'
// import JSZip from 'jszip' (loaded via CDN in index.html)

// const Filesystem = window.Capacitor?.Plugins?.Filesystem
// const Media = window.Capacitor?.Plugins?.Media
// const Share = window.Capacitor?.Plugins?.Share
// const Capacitor = window.Capacitor


// ===== ALBUM CONSTANTS =====
const NEYRA_ALBUM_NAME = 'Neyra';
const BACKUP_VERSION = 4;

const Directory = { Cache: 'CACHE', Data: 'DATA', Documents: 'Documents' };

// ===== LIMITS =====
const MAX_BACKUP_SIZE_MB = 25;
const MAX_MEDIA_FILES = 50;
const MAX_FILE_SIZE_MB = 5;
const MAX_IMPORT_SIZE_MB = 30;


function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// ===== VALID KEYS =====
const VALID_KEYS = [
  'mood_history',
  'notes_history',
  'reflections',
  'voice_history',
  'photo_history',
  'session_history',
  'user_profile',
  'mood_baseline',
  'startDate',
  'ai_patterns',
  'last_insight',
  'events_history',
  'cloud_enabled',
  'onboarding_done',
  'med_reminder',
  'med_monthly_check'
];


// ===== COLLECT ALL DATA =====
function collectAllData() {
  const data = {};
  VALID_KEYS.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = value;
      }
    } catch (e) {
      console.warn('[BACKUP] Failed to read:', key, e);
    }
  });
  return data;
}


// ===== GET MEDIA INFO =====
function getMediaInfo(data) {
  const mediaMap = new Map();

  const voiceHistory = data.voice_history ? JSON.parse(data.voice_history) : [];
  const photoHistory = data.photo_history ? JSON.parse(data.photo_history) : [];

  // Voice notes
  voiceHistory.forEach((item, idx) => {
    if (item.audio && item.audio.startsWith('data:')) {
      const key = `${item.time}_${idx}_voice`;
      if (!mediaMap.has(key)) {
        const sizeMB = (item.audio.length * 3) / 4 / (1024 * 1024);
        mediaMap.set(key, {
          type: 'audio',
          key: 'voice_history',
          index: idx,
          name: `voice_${item.time || Date.now()}_${idx}.webm`,
          data: item.audio,
          sizeMB: sizeMB
        });
      }
    }
  });

  // Photos
  photoHistory.forEach((item, idx) => {
    if (item.source === 'gallery') {
      const key = `${item.timestamp}_${idx}_photo`;
      if (!mediaMap.has(key)) {
        mediaMap.set(key, {
          type: 'photo_gallery',
          timestamp: item.timestamp,
          albumName: item.albumName || 'Neyra',
          sizeMB: 0
        });
      }
      return;
    }
    
    const photoData = item.dataUrl || item.photo;
    const photoUri = item.uri || "";
    
    if (photoData && photoData.startsWith('data:')) {
      const key = `${item.timestamp || item.time}_${idx}_photo`;
      if (!mediaMap.has(key)) {
        const sizeMB = (photoData.length * 3) / 4 / (1024 * 1024);
        mediaMap.set(key, {
          type: 'photo',
          key: 'photo_history',
          index: idx,
          name: `photo_${item.timestamp || item.time || Date.now()}_${idx}.jpg`,
          data: photoData,
          sizeMB: sizeMB
        });
      }
    } else if (photoUri && photoUri.startsWith('file://')) {
      const key = `${item.timestamp || item.time}_${idx}_photo`;
      if (!mediaMap.has(key)) {
        mediaMap.set(key, {
          type: 'photo_uri',
          key: 'photo_history',
          index: idx,
          name: photoUri.split('/').pop(),
          uri: photoUri,
          timestamp: item.timestamp || item.time,
          sizeMB: 0
        });
      }
    }
  });

  return Array.from(mediaMap.values());
}


// ===== EXPORT =====
export async function exportData() {
  if (window.__exportInProgress) {
    console.warn('[EXPORT] blocked duplicate');
    return { success: false, error: 'already_in_progress' };
  }
  window.__exportInProgress = true;

  try {
    const canExport = canExportBackup(); // { allowed, reason, remainingHours }
    if (!canExport.allowed) {
      return { 
        success: false, 
        error: 'cooldown',
        message: `Cooldown: ${canExport.remainingHours} hours remaining`
      };
    }

    const data = collectAllData();
    if (Object.keys(data).length === 0) {
      return { success: false, error: 'no_data' };
    }

    let media = getMediaInfo(data);

    // Remove duplicates by name
    const seen = new Set();
    media = media.filter(m => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });

    // Limit media count
    if (media.length > MAX_MEDIA_FILES) {
      media = media.slice(-MAX_MEDIA_FILES);
    }

    const backup = {
      version: BACKUP_VERSION,
      app: 'neyra',
      createdAt: Date.now(),
      device: 'mobile',
      data: data,
      media: media.map(m => ({
        name: m.name,
        type: m.type,
        data: m.data
      }))
    };

    // PREMIUM: read gallery photos
    if (isPremium()) {
      const Media = window.Capacitor?.Plugins?.Media;
      const Filesystem = window.Capacitor?.Plugins?.Filesystem;
      const Capacitor = window.Capacitor;
      if (Media && Capacitor?.isNativePlatform()) {
        try {
          const albumPhotos = await Media.getMedias({ albumName: 'Neyra', quantity: 100 });
          for (const photo of albumPhotos?.medias || []) {
            try {
              if (Filesystem) {
                const fileResult = await Filesystem.readFile({ path: photo.identifier });
                if (fileResult?.data) {
                  const name = `gallery_${photo.creationDate || Date.now()}.jpg`;
                  backup.media.push({
                    type: 'photo',
                    name,
                    data: `data:image/jpeg;base64,${fileResult.data}`,
                    sizeMB: (fileResult.data.length * 3) / 4 / (1024 * 1024)
                  });
                }
              }
            } catch(e) {
              console.warn('[BACKUP] Failed to read gallery photo:', e);
            }
          }
        } catch(e) {
          console.warn('[BACKUP] Premium gallery read failed:', e);
        }
      }
    }

    // Size check
    const estimatedSize = JSON.stringify(backup).length / (1024 * 1024);
    if (estimatedSize > MAX_BACKUP_SIZE_MB) {
      return { success: false, error: 'size_exceeded' };
    }

    // Create ZIP
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify(backup, null, 2));
    const mediaFolder = zip.folder('media');
    let addedMedia = 0;

    for (const m of media) {
      // Skip large files and device file references
      if (m.sizeMB > MAX_FILE_SIZE_MB) continue;
      if (m.type === 'photo_uri') continue;

      const base64Data = m.data.split(',')[1];
      if (base64Data) {
        try {
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          mediaFolder.file(m.name, bytes);
          addedMedia++;
        } catch (e) {}
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `neyra-backup-${new Date().toISOString().split('T')[0]}.zip`;

    // Share via Capacitor
    const Capacitor = window.Capacitor;
    try {
      if (Capacitor?.isNativePlatform()) {
        const SharePlugin = Capacitor.Plugins?.Share;
        const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;

        if (SharePlugin && FilesystemPlugin) {
          const base64 = await blobToBase64(blob);
          const fileName = `neyra-backup-${new Date().toISOString().slice(0,10)}.zip`;
          
          const savedFile = await FilesystemPlugin.writeFile({
            path: fileName,
            data: base64,
            directory: 'CACHE'
          });
          
          try {
            const file = new File([blob], fileName, { type: 'application/zip' });
            await SharePlugin.share({
              title: 'Neyra Backup',
              files: [file],
              dialogTitle: 'Сохранить резервную копию'
            });
          } catch (shareErr) {
            const url = URL.createObjectURL(blob);
            await SharePlugin.share({
              title: 'Neyra Backup',
              url: url,
              dialogTitle: 'Сохранить резервную копию'
            });
            setTimeout(() => URL.revokeObjectURL(url), 3000);
          }
          
          FilesystemPlugin.deleteFile({ path: fileName, directory: 'CACHE' }).catch(() => {});
          
          markBackupSuccess();
          return { success: true };
        }
      }
    } catch (err) {}

    // Fallback: browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);

    markBackupSuccess();
    return { success: true };

  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    window.__exportInProgress = false;
  }
}


// ===== IMPORT =====
export async function importData(file) {
  return new Promise((resolve) => {
    (async () => {
      try {
        if (!file) {
          resolve({ success: false, error: 'no_file' });
          return;
        }

        const importSizeMB = file.size / (1024 * 1024);
        if (importSizeMB > MAX_IMPORT_SIZE_MB) {
          resolve({ success: false, error: 'size_exceeded' });
          return;
        }

        // Detect ZIP by extension or magic bytes (PK)
        const isZip = file.name.endsWith('.zip');
        const slice = file.slice(0, 4);
        const buffer = await slice.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const magic = String.fromCharCode(...bytes);
        const isZipByMagic = magic.startsWith('PK');
        
        if (isZip || isZipByMagic) {
          await importFromZip(file, resolve);
        } else {
          await importFromJson(file, resolve);
        }

      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    })();
  });
}


// ===== IMPORT FROM ZIP =====
async function importFromZip(file, resolve) {
  try {
    // JSZip loaded via CDN or dynamically
    const zip = await JSZip.loadAsync(file);
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      resolve({ success: false, error: 'invalid_structure' });
      return;
    }

    const text = await dataFile.async('string');
    let backup = JSON.parse(text);

    const validation = validateBackup(backup);
    if (!validation.valid) {
      resolve({ success: false, error: validation.error });
      return;
    }

    if (!backup.data || Object.keys(backup.data).length === 0) {
      resolve({ success: false, error: 'empty_backup' });
      return;
    }

    if (!backup.version) {
      resolve({ success: false, error: 'missing_version' });
      return;
    }

    // Restore data
    restoreData(backup.data);

    // Restore media from zip
    const mediaFolder = zip.folder('media');
    const mediaMap = new Map();

    if (mediaFolder) {
      const mediaFiles = Object.keys(mediaFolder.files).filter(name => name !== 'media/');
      for (const name of mediaFiles) {
        const fileObj = mediaFolder.file(name);
        if (fileObj) {
          try {
            const blob = await fileObj.async('blob');
            const dataUrl = await blobToDataUrl(blob);
            mediaMap.set(name, dataUrl);
          } catch (e) {}
        }
      }
    }

    restoreMediaFromMap(mediaMap);

    resolve({ success: true, message: 'Данные восстановлены!' });
    disableExitGuardForReload();
    setTimeout(() => window.location.reload(), 300);

  } catch (e) {
    if (e.message?.includes('Invalid') || e.message?.includes('not a zip')) {
      resolve({ success: false, error: 'invalid_format' });
    } else {
      resolve({ success: false, error: 'parse_error' });
    }
  }
}


// ===== IMPORT FROM JSON =====
async function importFromJson(file, resolve) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const backup = JSON.parse(content);

      if (!backup || backup.app !== 'neyra') {
        resolve({ success: false, error: 'invalid_format' });
        return;
      }

      if (!backup.data || typeof backup.data !== 'object') {
        resolve({ success: false, error: 'invalid_structure' });
        return;
      }

      const validation = validateBackup(backup);
      if (!validation.valid) {
        resolve({ success: false, error: validation.error });
        return;
      }

      restoreData(backup.data);
      resolve({ success: true, message: ' данные восстановлены' });

    } catch (parseError) {
      resolve({ success: false, error: 'parse_error' });
    }
  };

  reader.onerror = () => {
    resolve({ success: false, error: 'read_error' });
  };

  reader.readAsText(file);
}


// ===== VALIDATE BACKUP =====
function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'invalid_structure' };
  }
  if (!backup.version) {
    return { valid: false, error: 'missing_version' };
  }
  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, error: 'invalid_structure' };
  }
  return { valid: true };
}


// ===== RESTORE DATA =====
const getId = (item) =>
  item?.timestamp ?? item?.time ?? item?.date ?? item?.ts ?? item?.id ?? null;

function restoreData(data) {
  Object.keys(data).forEach(key => {
    if (!VALID_KEYS.includes(key)) {
      return;
    }

    try {
      const rawBackupValue = data[key];
      if (!rawBackupValue) return;

      let backupValue;
      try {
        backupValue = JSON.parse(rawBackupValue);
      } catch {
        backupValue = rawBackupValue;
      }

      let currentRaw = localStorage.getItem(key);
      let currentValue;
      try {
        currentValue = currentRaw ? JSON.parse(currentRaw) : null;
      } catch {
        currentValue = currentRaw;
      }

      const isArray = Array.isArray(backupValue);
      const isObject = backupValue && typeof backupValue === 'object' && !isArray;

      if (isArray) {
        const currentArr = Array.isArray(currentValue) ? currentValue : [];
        const existingIds = new Set(currentArr.map(getId).filter(Boolean));
        const merged = [...currentArr];

        backupValue.forEach(item => {
          const id = getId(item);
          if (!id || !existingIds.has(id)) {
            merged.push(item);
          }
        });

        localStorage.setItem(key, JSON.stringify(merged));
      }
      else if (isObject) {
        const currentObj = currentValue && typeof currentValue === 'object' ? currentValue : {};
        let mergedObj;

        if (key === 'user_profile') {
          mergedObj = { ...backupValue, ...currentObj };
        } else {
          mergedObj = { ...currentObj, ...backupValue };
        }

        localStorage.setItem(key, JSON.stringify(mergedObj));
      }
      else {
        localStorage.setItem(key, rawBackupValue);
      }

    } catch (e) {
      console.warn('[BACKUP] restore failed:', key, e);
    }
  });
}


// ===== RESTORE MEDIA FROM MAP =====
function restoreMediaFromMap(mediaMap) {
  const voiceHistory = JSON.parse(localStorage.getItem('voice_history') || '[]');
  const photoHistory = JSON.parse(localStorage.getItem('photo_history') || '[]');

  mediaMap.forEach((dataUrl, filename) => {
    if (filename.startsWith('voice_')) {
      const parts = filename.split('_');
      const ts = parseInt(parts[1]);
      const match = voiceHistory.find(item =>
        (item.time || item.timestamp || item.date) === ts
      );
      if (match) match.audio = dataUrl;
    }
    if (filename.startsWith('photo_')) {
      const parts = filename.split('_');
      const ts = parseInt(parts[1]);
      const match = photoHistory.find(item =>
        (item.timestamp || item.time) === ts
      );
      if (match) match.dataUrl = dataUrl;
    }
  });

  try {
    localStorage.setItem('voice_history', JSON.stringify(voiceHistory));
    localStorage.setItem('photo_history', JSON.stringify(photoHistory));
  } catch (quotaErr) {
    console.error('[BACKUP] Quota error during restore:', quotaErr);
    localStorage.setItem('voice_history', JSON.stringify(voiceHistory.filter(i => !i.audio)));
    localStorage.setItem('photo_history', JSON.stringify(photoHistory.filter(i => !i.dataUrl)));
  }
}


// ===== RESTORE MEDIA FILE (legacy) =====
async function restoreMediaFile(filename, dataUrl) {
  try {
    const isAudio = filename.startsWith('voice_');
    const isPhoto = filename.startsWith('photo_');

    if (isAudio) {
      const voiceHistory = JSON.parse(localStorage.getItem('voice_history') || '[]');
      let found = false;
      for (let i = 0; i < voiceHistory.length; i++) {
        if (voiceHistory[i].audio && voiceHistory[i].audio.startsWith('data:')) {
          if (!found) {
            voiceHistory[i].audio = dataUrl;
            found = true;
            break;
          }
        }
      }
      if (found) {
        localStorage.setItem('voice_history', JSON.stringify(voiceHistory));
      }
    }

    if (isPhoto) {
      const photoHistory = JSON.parse(localStorage.getItem('photo_history') || '[]');
      let found = false;
      for (let i = 0; i < photoHistory.length; i++) {
        const photoData = photoHistory[i].dataUrl || photoHistory[i].photo;
        if (photoData && photoData.startsWith('data:')) {
          if (!found) {
            photoHistory[i].dataUrl = dataUrl;
            found = true;
            break;
          }
        }
      }
      if (found) {
        localStorage.setItem('photo_history', JSON.stringify(photoHistory));
      }
    }
  } catch (e) {
    console.warn('[BACKUP] Failed to restore media:', filename, e);
  }
}


// ===== SAVE PHOTO TO GALLERY =====
async function savePhoto(dataUrl) {
  try {
    const timestamp = Date.now();
    const fileName = `neyra_${timestamp}.jpg`;
    
    const thumbnail = await compressImage(dataUrl, 100, 0.6);
    
    const Capacitor = window.Capacitor;
    const Media = Capacitor?.Plugins?.Media || Capacitor?.Plugins?.CapacitorCommunityMedia;
    
    if (Media && Capacitor?.isNativePlatform()) {
      try {
        await Media.savePhoto({
          path: dataUrl,
          album: { name: 'Neyra' }
        });
        
        const arr = JSON.parse(localStorage.getItem("photo_history") || "[]");
        arr.push({
          timestamp,
          albumName: 'Neyra',
          fileName,
          note: "",
          source: 'gallery',
          thumbnail
        });
        if (arr.length > 20) arr.splice(0, arr.length - 20);
        localStorage.setItem("photo_history", JSON.stringify(arr));
        return;
      } catch(mediaErr) {
        console.warn('[PHOTO] Gallery save failed:', mediaErr);
      }
    }
    
    await _savePhotoFallback(dataUrl, timestamp, thumbnail);
  } catch(e) {
    console.error('[PHOTO] savePhoto error:', e);
  }
}


// ===== SAVE PHOTO FALLBACK (FILESYSTEM) =====
async function _savePhotoFallback(dataUrl, timestamp, thumbnail) {
  try {
    const Capacitor = window.Capacitor;
    const Filesystem = Capacitor?.Plugins?.Filesystem;
    const ts = timestamp || Date.now();
    const fileName = "neyra-" + ts + ".jpg";
    const base64 = dataUrl.split(",")[1];
    
    let uri = dataUrl;
    
    if (Filesystem && base64) {
      try {
        await Filesystem.writeFile({ path: fileName, data: base64, directory: "Documents" });
        const fileInfo = await Filesystem.getUri({ path: fileName, directory: "Documents" });
        uri = fileInfo.uri || dataUrl;
      } catch(e) {
        console.warn("[photo] Filesystem write failed:", e);
      }
    }
    
    const arr = JSON.parse(localStorage.getItem("photo_history") || "[]");
    arr.push({
      dataUrl: dataUrl,           // ORIGINAL
      thumbnail: thumbnail,       // THUMBNAIL FOR CARD PREVIEW
      timestamp: ts,
      note: "",
      source: 'base64'
    });
    if (arr.length > 20) arr.splice(0, arr.length - 20);
    localStorage.setItem("photo_history", JSON.stringify(arr));
    
    if (window.scheduleCloudSync) window.scheduleCloudSync();
  } catch(e) {}
}


// ===== COMPRESS IMAGE =====
function compressImage(dataUrl, maxWidth=100, quality=0.6) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}


// ===== DOWNLOAD FALLBACK (BROWSER) =====
function downloadJSON(obj, filename) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFallback(blob, filename);
}

function downloadFallback(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ===== SHARE PHOTO =====
async function sharePhoto(item) {
  const text = buildShareText(item);
  const Share = window.Capacitor?.Plugins?.Share;
  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  const Media = window.Capacitor?.Plugins?.Media;
  const Capacitor = window.Capacitor;
  
  let imgSrc = item.dataUrl || item.uri;  // dataUrl = ORIGINAL for base64
  let isFromGallery = item.source === 'gallery';
  
  // For gallery photos: get full resolution
  if (isFromGallery && Media && Capacitor?.isNativePlatform()) {
    try {
      const albumPhotos = await Media.getMedias({ albumName: 'Neyra', quantity: 100 });
      const photo = albumPhotos?.medias?.find(p => {
        const photoTs = typeof p.creationDate === 'number'
          ? p.creationDate
          : new Date(p.creationDate).getTime();
        return Math.abs(photoTs - item.ts) < 5000;
      });
      if (photo?.identifier) {
        const fullPhoto = await Media.getMedias({
          identifiers: [photo.identifier],
          thumbnail: false
        });
        if (fullPhoto?.medias?.[0]?.webPath) {
          imgSrc = fullPhoto.medias[0].webPath;
        }
      }
    } catch(e) {
      console.warn("[share] Could not get full photo, using fallback:", e);
    }
  }
  
  if (!imgSrc) return;
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    canvas.width  = img.width  * scale;
    canvas.height = img.height * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1];
    const fileName = "neyra-photo-" + Date.now() + ".jpg";
    
    if (Share && Filesystem) {
      Filesystem.writeFile({ path: fileName, data: base64, directory: "CACHE" })
        .then(() => Filesystem.getUri({ path: fileName, directory: "CACHE" }))
        .then(fileUri => {
          return Share.share({ title: "Neyra", text, url: fileUri.uri, dialogTitle: "Поделиться" });
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            console.warn("[share] Capacitor.Share failed:", err);
          }
        });
    } else if (navigator.share) {
      navigator.share({ title: "Neyra", text, url: dataUrl }).catch(() => {});
    }
  };
  img.src = imgSrc;
}


// ===== EXPORT SHOW IMPORT PICKER =====
export function showImportPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,.json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = confirm('Текущие данные будут заменены. Продолжить?');
    if (!ok) return;

    const result = await importData(file);

    if (result.error) {
      const messages = {
        'no_file': 'Файл не выбран',
        'invalid_format': 'Неверный формат файла резервной копии',
        'invalid_structure': 'Структура файла повреждена',
        'missing_version': 'Файл слишком старый или повреждён',
        'parse_error': 'Не удалось прочитать содержимое файла',
        'read_error': 'Ошибка чтения файла',
        'size_exceeded': 'Файл слишком большой'
      };
      alert(messages[result.error] || 'Ошибка импорта: ' + result.error);
    } else {
      alert('Данные успешно восстановлены!');
      disableExitGuardForReload();
      window.location.reload();
    }
  };

  input.click();
}


// ===== GET BACKUP INFO =====
export function getBackupInfo() {
  const keys = [
    'mood_history',
    'notes_history',
    'reflections',
    'voice_history',
    'session_history'
  ];

  const counts = {};
  let totalSize = 0;

  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const arr = JSON.parse(value);
        counts[key] = Array.isArray(arr) ? arr.length : 0;
        totalSize += value.length;
      } else {
        counts[key] = 0;
      }
    } catch {
      counts[key] = 0;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    totalRecords: total,
    counts: counts,
    hasData: total > 0,
    estimatedSize: Math.round(totalSize / 1024) + ' KB'
  };
}
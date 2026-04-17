// =====================================
// Neyra Backup Service v4
// ZIP backup with HARDENING + UX
// =====================================

// JSZip loaded via CDN in index.html
import { isPremium } from './user-profile.js';
import { canExportBackup, markBackupSuccess } from './backup-reminder.js';

/** @type {any} */
const Filesystem = window.Capacitor?.Plugins?.Filesystem;

const BACKUP_VERSION = 4;

/** @type {string} */
const Directory = { Cache: 'CACHE', Data: 'DATA' };

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

// LIMITS
const MAX_BACKUP_SIZE_MB = 25;
const MAX_MEDIA_FILES = 50;
const MAX_FILE_SIZE_MB = 5;
const MAX_IMPORT_SIZE_MB = 30;

const VALID_KEYS = [
  'mood_history',
  'notes_history',
  'reflections',
  'voice_history',
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

function getMediaInfo(data) {
  const mediaMap = new Map();

  const voiceHistory = data.voice_history ? JSON.parse(data.voice_history) : [];
  const photoHistory = data.photo_history ? JSON.parse(data.photo_history) : [];

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

  photoHistory.forEach((item, idx) => {
    const photoData = item.dataUrl || item.photo;
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
    }
  });

  return Array.from(mediaMap.values());
}

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

export async function exportData() {
  try {
    // FREE users cooldown check
    const canExport = canExportBackup();
    if (!canExport.allowed) {
      const hours = canExport.remainingHours || 0;
      return { 
        success: false, 
        error: 'cooldown',
        message: `Резервная копия доступна раз в 3 дня.\nСледующая через ${hours} ч.\n\nPremium — без ограничений.`
      };
    }

    const data = collectAllData();

    if (Object.keys(data).length === 0) {
      return { success: false, error: 'no_data' };
    }

    let media = getMediaInfo(data);
    console.log('[BACKUP] Media found:', media.length);

    // PART 3: Remove duplicates (by name)
    const seen = new Set();
    media = media.filter(m => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });
    console.log('[BACKUP] After dedup:', media.length);

    // PART 2: Limit media count
    if (media.length > MAX_MEDIA_FILES) {
      media = media.slice(-MAX_MEDIA_FILES);
      console.log('[BACKUP] Limited to:', media.length);
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

    // PART 1: Size check
    const estimatedSize = JSON.stringify(backup).length / (1024 * 1024);
    console.log('[BACKUP] Estimated size:', estimatedSize.toFixed(2), 'MB');

    if (estimatedSize > MAX_BACKUP_SIZE_MB) {
      alert(`Размер резервной копии слишком большой (${estimatedSize.toFixed(1)}MB). Максимум: ${MAX_BACKUP_SIZE_MB}MB. Удалите часть медиа или старые записи.`);
      return { success: false, error: 'size_exceeded' };
    }

    // PART 7: Try full export, fallback to data only
    try {
      const zip = new JSZip();
      zip.file('data.json', JSON.stringify(backup, null, 2));

      const mediaFolder = zip.folder('media');
      let addedMedia = 0;

      for (const m of media) {
        // PART 4: Skip large files
        if (m.sizeMB > MAX_FILE_SIZE_MB) {
          console.warn(`[BACKUP] Skipped (too large ${m.sizeMB.toFixed(1)}MB):`, m.name);
          continue;
        }

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
          } catch (e) {
            console.warn('[BACKUP] Failed to add media:', m.name, e);
          }
        }
      }

      console.log('[BACKUP] Media files added to ZIP:', addedMedia);

      const blob = await zip.generateAsync({ type: 'blob' });
      const date = new Date().toISOString().split('T')[0];
      const filename = `neyra-backup-${date}.zip`;

      // Try Capacitor Share first
      const Capacitor = window.Capacitor;
      
      console.log('[EXPORT] Capacitor:', !!Capacitor);
      console.log('[EXPORT] Native:', Capacitor?.isNativePlatform?.());
      console.log('[EXPORT] Share plugin:', !!Capacitor?.Plugins?.Share);
      
      try {
        if (!Capacitor || !Capacitor.isNativePlatform()) {
          throw new Error("Not native platform");
        }
        
        const SharePlugin = Capacitor.Plugins?.Share;
        const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;
        
        if (!SharePlugin) {
          throw new Error("Share plugin not available");
        }
        
        if (FilesystemPlugin) {
          // Write file to filesystem first
          const base64 = await blobToBase64(blob);
          const fileName = `neyra-backup-${new Date().toISOString().slice(0,10)}.zip`;
          
          const savedFile = await FilesystemPlugin.writeFile({
            path: fileName,
            data: base64,
            directory: 'CACHE'
          });
          
          console.log('[EXPORT] File saved:', savedFile.uri);
          
          const result = await SharePlugin.share({
            title: 'Neyra Backup',
            text: 'Резервная копия данных Neyra',
            url: savedFile.uri,
            dialogTitle: 'Сохранить резервную копию'
          });
          
          console.log('[EXPORT] Share success');
          
          // Cleanup
          FilesystemPlugin.deleteFile({
            path: fileName,
            directory: 'CACHE'
          }).catch(() => {});
          
          markBackupSuccess();
          alert('Резервная копия создана.\nСохраните файл в безопасном месте.');
          return { success: true };
        }
        
        // Fallback: use blob URL
        const url = URL.createObjectURL(blob);
        const result = await SharePlugin.share({
          title: 'Neyra Backup',
          text: 'Резервная копия данных Neyra',
          url: url,
          dialogTitle: 'Сохранить резервную копию'
        });
        
        console.log('[EXPORT] Share success (blob)');
        
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        
        markBackupSuccess();
        alert('Резервная копия создана.\nСохраните файл в безопасном месте.');
        return { success: true };
      } catch (err) {
        console.warn('[BACKUP] Share failed:', err.message);
        // Fallback to download
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        
        markBackupSuccess();
        alert('Резервная копия создана.\nСохраните файл в безопасном месте.');
        return { success: true };
      }

    } catch (e) {
      console.warn('[BACKUP] ZIP failed, falling back to data only:', e);

      const fallback = {
        version: BACKUP_VERSION,
        app: 'neyra',
        createdAt: Date.now(),
        device: 'mobile',
        data: data
      };

      const date = new Date().toISOString().split('T')[0];
      downloadJSON(fallback, `neyra-backup-${date}.json`);
      markBackupSuccess();
      alert('Резервная копия создана (без медиа).\nСохраните файл в безопасном месте.');
      return { success: true, warning: 'media_skipped' };
    }

  } catch (e) {
    console.error('[BACKUP] Export error:', e);
    return { success: false, error: e.message };
  }
}

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
      window.location.reload();
    }
  };

  input.click();
}

export async function importData(file) {
  return new Promise((resolve) => {
    (async () => {
      try {
        if (!file) {
          resolve({ success: false, error: 'no_file' });
          return;
        }

        // PART 5: Import size guard
        const importSizeMB = file.size / (1024 * 1024);
        console.log('[BACKUP] Import file size:', importSizeMB.toFixed(2), 'MB');

        if (importSizeMB > MAX_IMPORT_SIZE_MB) {
          alert(`Файл слишком большой (${importSizeMB.toFixed(1)}MB). Максимум: ${MAX_IMPORT_SIZE_MB}MB.`);
          resolve({ success: false, error: 'size_exceeded' });
          return;
        }

        // Detect by extension OR by magic bytes (PK = ZIP)
        const isZip = file.name.endsWith('.zip');
        
        // Read first 4 bytes to detect ZIP magic
        const slice = file.slice(0, 4);
        const buffer = await slice.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const magic = String.fromCharCode(...bytes);
        const isZipByMagic = magic.startsWith('PK');
        
        console.log('[BACKUP] Magic:', magic, 'isZip:', isZip || isZipByMagic);
        
        const doImport = isZip || isZipByMagic;
        
        if (doImport) {
          console.log('[BACKUP] Importing as ZIP');
          await importFromZip(file, resolve);
        } else {
          console.log('[BACKUP] Importing as JSON');
          await importFromJson(file, resolve);
        }

      } catch (e) {
        console.error('[BACKUP] Import error:', e);
        resolve({ success: false, error: e.message });
      }
    })();
  });
}

async function importFromZip(file, resolve) {
  console.log('[BACKUP] >>> importFromZip START');
  try {
    console.log('[BACKUP] Loading ZIP..., JSZip:', typeof JSZip);
    
    // Ждём пока JSZip загрузится
    const waitForJSZip = () => new Promise((res) => {
      if (typeof JSZip !== 'undefined') {
        res(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => { console.log('[BACKUP] JSZip loaded dynamically'); res(true); };
      script.onerror = () => { console.error('[BACKUP] JSZip load failed'); res(false); };
      document.head.appendChild(script);
    });
    
    const jszipLoaded = await waitForJSZip();
    if (!jszipLoaded) {
      resolve({ success: false, error: 'Не удалось загрузить библиотеку ZIP' });
      return;
    }
    
    const zip = await JSZip.loadAsync(file);
    console.log('[BACKUP] ZIP loaded, files:', Object.keys(zip.files));
    
    const dataFile = zip.file('data.json');
    console.log('[BACKUP] data.json found:', !!dataFile);

    if (!dataFile) {
      resolve({ success: false, error: 'invalid_structure' });
      return;
    }

    const text = await dataFile.async('string');
    console.log('[BACKUP] data.json length:', text.length);

    let backup;
    try {
      backup = JSON.parse(text);
      console.log('[BACKUP] Backup parsed, keys:', Object.keys(backup));
    } catch (e) {
      console.error('[BACKUP] JSON parse error:', e.message);
      resolve({ success: false, error: 'parse_error' });
      return;
    }

    const validation = validateBackup(backup);
    if (!validation.valid) {
      console.error('[BACKUP] Validation failed:', validation.error);
      resolve({ success: false, error: validation.error });
      return;
    }

    console.log('[BACKUP] Backup data keys:', Object.keys(backup.data || {}));
    restoreData(backup.data);

    console.log('[BACKUP] >>> Reloading page...');
    resolve({ success: true, message: 'Данные восстановлены!' });
    
    // Reload страницы чтобы данные перезагрузились
    setTimeout(() => window.location.reload(), 500);

    const mediaFolder = zip.folder('media');
    let restoredMedia = 0;

    if (mediaFolder) {
      const mediaFiles = Object.keys(mediaFolder.files).filter(name => name !== 'media/');
      console.log('[BACKUP] Media files to restore:', mediaFiles.length);

      for (const name of mediaFiles) {
        const fileObj = mediaFolder.file(name);
        if (fileObj) {
          try {
            const blob = await fileObj.async('blob');
            const dataUrl = await blobToDataUrl(blob);
            await restoreMediaFile(name, dataUrl);
            restoredMedia++;
          } catch (e) {
            console.warn('[BACKUP] Failed to restore media:', name, e);
          }
        }
      }
      console.log('[BACKUP] Media restored:', restoredMedia);
    }

    // Всё завершено
  } catch (e) {
    console.error('[BACKUP] ZIP import error:', e.message, e.stack);
    if (e.message?.includes('Invalid') || e.message?.includes('not a zip')) {
      resolve({ success: false, error: 'invalid_format' });
    } else {
      resolve({ success: false, error: 'parse_error' });
    }
  }
}

async function importFromJson(file, resolve) {
  console.log('[BACKUP] JSON import started');
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const content = e.target.result;
      console.log('[BACKUP] JSON content length:', content.length);
      
      const backup = JSON.parse(content);
      console.log('[BACKUP] JSON parsed, keys:', Object.keys(backup || {}));

      if (!backup || backup.app !== 'neyra') {
        console.error('[BACKUP] Invalid app:', backup?.app);
        resolve({ success: false, error: 'invalid_format' });
        return;
      }

      if (!backup.data || typeof backup.data !== 'object') {
        console.error('[BACKUP] Invalid data structure');
        resolve({ success: false, error: 'invalid_structure' });
        return;
      }

      console.log('[BACKUP] Data keys to restore:', Object.keys(backup.data));
      restoreData(backup.data);
      resolve({ success: true, message: ' данные восстановлены' });

    } catch (parseError) {
      console.error('[BACKUP] Parse error:', parseError.message, parseError.stack);
      resolve({ success: false, error: 'parse_error' });
    }
  };

  reader.onerror = () => {
    resolve({ success: false, error: 'read_error' });
  };

  reader.readAsText(file);
}

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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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

function restoreData(data) {
  console.log('[BACKUP] restoreData started, keys:', Object.keys(data));
  
  const results = { merged: [], updated: [], skipped: [] };
  
  Object.keys(data).forEach(key => {
    if (!VALID_KEYS.includes(key)) {
      console.warn('[BACKUP] Skipping unknown key:', key);
      results.skipped.push(key);
      return;
    }

    try {
      const backupValue = data[key];
      if (backupValue === null || backupValue === undefined) {
        console.log('[BACKUP] Empty backup value for:', key);
        results.skipped.push(key);
        return;
      }

      // ТИПЫ ДАННЫХ:
      // 1. ARRAY - мерджим по timestamp
      // 2. STRING/BOOL - просто записыв��ем (строки, даты, булево)
      // 3. OBJECT - мерджим ключи (profile)
      
      const currentValue = localStorage.getItem(key);
      const isArray = Array.isArray(backupValue);
      const isObject = typeof backupValue === 'object' && !isArray;
      const isPrimitive = !isArray && !isObject;
      
      console.log('[BACKUP] Type for', key, ':', isArray ? 'array' : isObject ? 'object' : 'primitive');
      
      if (isArray) {
        // === ARRAY: merge по timestamp ===
        let currentData = [];
        if (currentValue) {
          try { currentData = JSON.parse(currentValue); } catch { currentData = []; }
        }
        
        // Парсим backup
        let backupData = [];
        try { backupData = JSON.parse(backupValue); } catch { backupData = []; }
        
        if (!backupData.length) {
          console.log('[BACKUP] No backup data for:', key);
          results.skipped.push(key);
          return;
        }
        
        // Фильтруем дубликаты по ts
// ID приоритет: timestamp → time → date → ts → id
        const existingIds = new Set(
          currentData.map(getId).filter(id => id !== null)
        );
        
        const newItems = backupData.filter(item => {
          const id = getId(item);
          return id && !existingIds.has(id);
        });
        
        console.log('[BACKUP] Current:', currentData.length, 'Backup:', backupData.length, 'New:', newItems.length);
        
        // Мерджим и сортируем
        const merged = [...currentData, ...newItems].sort((a, b) => (a?.ts || 0) - (b?.ts || 0));
        
        localStorage.setItem(key, JSON.stringify(merged));
        console.log('[BACKUP] Merged:', key, 'total:', merged.length);
        results.merged.push(key);
        
      } else if (isObject) {
        // === OBJECT: merge keys ===
        let currentObj = {};
        if (currentValue) {
          try { currentObj = JSON.parse(currentValue); } catch { currentObj = {}; }
        }
        
        const mergedObj = { ...currentObj, ...backupValue };
        localStorage.setItem(key, JSON.stringify(mergedObj));
        console.log('[BACKUP] Merged object:', key);
        results.merged.push(key);
        
      } else {
        // === PRIMITIVE (string, number, bool): просто записываем ===
        // Не перезаписываем если есть текущие данные (кроме startDate, onboarding)
        const keysToOverwrite = ['startDate', 'onboarding_done', 'last_backup_time'];
        const hasCurrent = !!currentValue;
        const shouldOverwrite = keysToOverwrite.includes(key) || !hasCurrent;
        
        if (shouldOverwrite) {
          localStorage.setItem(key, backupValue);
          console.log('[BACKUP] Set primitive:', key, '=', backupValue);
        } else {
          console.log('[BACKUP] Skipped primitive (has current):', key);
        }
        results.updated.push(key);
      }
      
    } catch (e) {
      console.warn('[BACKUP] Failed to restore:', key, e.message);
      results.skipped.push(key);
    }
  });
  
  console.log('[BACKUP] Restore results:', results);
}

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

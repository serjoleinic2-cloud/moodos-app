// =====================================
// Neyra Backup Service v4
// ZIP backup with HARDENING + UX
// =====================================

import JSZip from 'jszip';
import { t } from '../i18n.js';
import { isPremium } from './user-profile.js';
import { canExportBackup, markBackupSuccess } from './backup-reminder.js';
import { disableExitGuardForReload } from './exit-guard.js';
import { savePhotoMeta } from './photo-meta.js';

const getId = (item) =>
  item?.timestamp ??
  item?.time ??
  item?.date ??
  item?.ts ??
  item?.id ??
  null;

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
  'med_monthly_check',
  'med_reminders_v2',
  'app_version',
  'neyra_sound_prompt_shown',
  'neyra_letters'
];

function collectAllData(premiumMode = false) {
  const data = {};
  const CUTOFF_DAYS = 7;
  const cutoff = Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000;

  const ARRAY_KEYS = [
    'mood_history', 'notes_history', 'reflections',
    'voice_history', 'session_history', 'photo_history',
    'neyra_letters'
  ];

  VALID_KEYS.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return;

      // Free: исключаем photo_history и neyra_letters; voice_history включаем но только base64
      if (!premiumMode && (key === 'photo_history' || key === 'neyra_letters')) return;
      if (!premiumMode && key === 'voice_history') {
        try {
          const arr = JSON.parse(value);
          if (Array.isArray(arr)) {
            const cutoffFree = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const filtered = arr.filter(item => {
              const ts = item?.time ?? item?.date ?? item?.timestamp ?? null;
              const n = ts ? Number(ts) : NaN;
              return !isNaN(n) ? n >= cutoffFree : false;
            }).map(item => ({
              ...item,
              // Сохраняем метаданные, аудио только если base64
              // file:// ссылки убираем — они не переносятся
              audio: item.audio && item.audio.startsWith('data:') ? item.audio : null
            }));
            // Включаем ВСЕ записи с метаданными (даже без audio)
            // чтобы при восстановлении запись существовала и можно было матчить аудио файл
            if (filtered.length > 0) data[key] = JSON.stringify(filtered);
          }
        } catch(e) {}
        return;
      }

      if (!premiumMode && ARRAY_KEYS.includes(key)) {
        try {
          const arr = JSON.parse(value);
          if (Array.isArray(arr)) {
            const filtered = arr.filter(item => {
              const ts = item?.timestamp ?? item?.time ?? item?.date ?? item?.ts ?? null;
              if (!ts) return true;
              const n = Number(ts);
              return !isNaN(n) ? n >= cutoff : new Date(ts).getTime() >= cutoff;
            });
            data[key] = JSON.stringify(filtered);
            return;
          }
        } catch(e) {}
      }

      data[key] = value;
    } catch (e) {
      console.warn('[BACKUP] Failed to read:', key, e);
    }
  });
  return data;
}

async function getMediaInfo(data) {
  const mediaMap = new Map();

  // Voice notes — всегда конвертируем в base64 включая file://
  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  const voiceHistory = JSON.parse(localStorage.getItem('voice_history') || '[]');
  const cutoffVoice = isPremium ? 0 : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const MAX_VOICE_MB_FREE = 10;
  const MAX_VOICE_MB_PREMIUM = 50;
  let totalVoiceMB = 0;
  const voiceMaxMB = isPremium ? MAX_VOICE_MB_PREMIUM : MAX_VOICE_MB_FREE;

  for (let idx = 0; idx < voiceHistory.length; idx++) {
    const item = voiceHistory[idx];
    const itemTs = item?.time ?? item?.date ?? item?.timestamp ?? null;
    if (!itemTs) continue;
    if (Number(itemTs) < cutoffVoice) continue;

    const key = `${itemTs}_${idx}_voice`;
    if (mediaMap.has(key)) continue;

    let audioData = item.audio || null;

    // Если file:// — читаем из Filesystem и конвертируем в base64
    if (audioData && audioData.startsWith('file://') && Filesystem) {
      try {
        const fileName = audioData.split('/').pop();
        const fileResult = await Filesystem.readFile({ path: `Neyra/${fileName}`, directory: 'Documents' });
        if (fileResult?.data) {
          audioData = `data:audio/webm;base64,${fileResult.data}`;
        } else {
          audioData = null;
        }
      } catch(e) {
        audioData = null;
      }
    }

    if (!audioData || !audioData.startsWith('data:')) continue;

    const sizeMB = (audioData.length * 3) / 4 / (1024 * 1024);
    if (totalVoiceMB + sizeMB > voiceMaxMB) continue;
    if (sizeMB > MAX_FILE_SIZE_MB) continue;
    totalVoiceMB += sizeMB;

    mediaMap.set(key, {
      type: 'audio',
      key: 'voice_history',
      index: idx,
      name: `voice_${itemTs}_${idx}.webm`,
      data: audioData,
      sizeMB
    });
  }

  const photoHistory = data.photo_history ? JSON.parse(data.photo_history) : [];
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
    
    const photoData = typeof (item.dataUrl || item.photo) === 'string' ? (item.dataUrl || item.photo) : null;
    const photoUri = item.uri || (typeof item.photo === 'object' && item.photo?.uri) || "";
    
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
  if (window.__exportInProgress) {
    console.warn('[EXPORT] blocked duplicate');
    return { success: false, error: 'already_in_progress' };
  }
  window.__exportInProgress = true;

  try {
    // FREE users cooldown check
    const canExport = canExportBackup();
    if (!canExport.allowed) {
      const hours = canExport.remainingHours || 0;
      return { 
        success: false, 
        error: 'cooldown',
        message: t('backup_cooldown_full').replace('{hours}', hours)
      };
    }

    const data = collectAllData(isPremium());
    console.log('[EXPORT] isPremium:', isPremium(), 'data keys:', Object.keys(data).length);

    if (Object.keys(data).length === 0) {
      return { success: false, error: 'no_data' };
    }

    let media = await getMediaInfo(data);
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

    // Voice files from Documents/Neyra/ — для ВСЕХ пользователей (нативные платформы)
    const existingMediaNames = new Set(backup.media.map(m => m.name));
    const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;
    if (FilesystemPlugin && window.Capacitor?.isNativePlatform()) {
      try {
        const voiceDir = await FilesystemPlugin.readdir({ path: 'Neyra', directory: 'Documents' });
        for (const file of voiceDir?.files || []) {
          const fileName = file.name || file;
          if (typeof fileName === 'string' && fileName.startsWith('voice_') && fileName.endsWith('.webm')) {
            if (existingMediaNames.has(fileName)) continue;
            try {
              const fileResult = await FilesystemPlugin.readFile({
                path: `Neyra/${fileName}`,
                directory: 'Documents'
              });
              if (fileResult?.data) {
                const sizeMB = (fileResult.data.length * 3) / 4 / (1024 * 1024);
                if (sizeMB <= MAX_FILE_SIZE_MB) {
                  backup.media.push({
                    type: 'audio',
                    name: fileName,
                    data: `data:audio/webm;base64,${fileResult.data}`,
                    sizeMB
                  });
                }
              }
            } catch(e) {
              console.warn('[BACKUP] Failed to read voice file:', fileName, e);
            }
          }
        }
        console.log('[BACKUP] Added voice files from filesystem, total media:', backup.media.length);
      } catch(e) {
        console.warn('[BACKUP] Voice files read failed:', e);
      }
    }

    // PART 1: Size check

    // Size check AFTER adding gallery photos
    const estimatedSize = JSON.stringify(backup).length / (1024 * 1024);
    console.log('[BACKUP] Estimated size:', estimatedSize.toFixed(2), 'MB');

    if (estimatedSize > MAX_BACKUP_SIZE_MB) {
      alert(t('backup_size_exceeded').replace('{size}', estimatedSize.toFixed(1)).replace('{max}', MAX_BACKUP_SIZE_MB));
      return { success: false, error: 'size_exceeded' };
    }

    // PART 7: Try full export, fallback to data only
    try {
      const zip = new JSZip();
      zip.file('data.json', JSON.stringify(backup, null, 2));

      const mediaFolder = zip.folder('media');
      let addedMedia = 0;

      for (const m of media) {
        // PART 4: Skip large files and photo_uri (device file references)
        if (m.sizeMB > MAX_FILE_SIZE_MB) {
          console.warn(`[BACKUP] Skipped (too large ${m.sizeMB.toFixed(1)}MB):`, m.name);
          continue;
        }
        
        if (m.type === 'photo_uri') {
          // Файл хранится в Neyra/ — читаем и кладём в ZIP
          const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;
          if (FilesystemPlugin && window.Capacitor?.isNativePlatform()) {
            try {
              const fileResult = await FilesystemPlugin.readFile({
                path: `Neyra/${m.name}`,
                directory: 'Documents'
              });
              if (fileResult?.data) {
                const sizeMB = (fileResult.data.length * 3) / 4 / (1024 * 1024);
                if (sizeMB <= MAX_FILE_SIZE_MB) {
                  const binaryString = atob(fileResult.data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  mediaFolder.file(m.name, bytes);
                  addedMedia++;
                  console.log('[BACKUP] Added photo from Neyra/:', m.name);
                }
              }
            } catch(e) {
              console.warn('[BACKUP] Failed to read photo from Neyra/:', m.name, e);
            }
          }
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

      // Premium: add photos from Filesystem
      if (isPremium()) {
        try {
          const { getAllPhotoMeta } = await import('./photo-meta.js');
          const allMeta = await getAllPhotoMeta();
          const photosFolder = zip.folder('photos');
          if (photosFolder && allMeta.length > 0) {
            for (const meta of allMeta) {
              try {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const file = await Filesystem.readFile({
                  path: meta.path,
                  directory: Directory.Data,
                });
                photosFolder.file(meta.entryId + '.jpg', file.data, { base64: true });
              } catch(e) {
                console.warn('[BACKUP] photo read failed:', meta.path, e);
              }
            }
          }
        } catch(e) {
          console.warn('[BACKUP] photos collection failed:', e);
        }
      }

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
          const base64zip = await blobToBase64(blob);
          const zipFileName = `neyra-backup-${new Date().toISOString().slice(0,10)}.zip`;
          
          const savedFile = await FilesystemPlugin.writeFile({
            path: zipFileName,
            data: base64zip,
            directory: 'CACHE'
          });
          
          console.log('[EXPORT] ZIP saved to:', savedFile.uri);
          
          await SharePlugin.share({
            title: 'Neyra Backup',
            url: savedFile.uri,
            dialogTitle: t('backup_share_dialog')
          });
          
          setTimeout(() => {
            FilesystemPlugin.deleteFile({
              path: zipFileName,
              directory: 'CACHE'
            }).catch(() => {});
          }, 30000);
          
          markBackupSuccess();
          alert(t('backup_success_msg'));
          return { success: true };
        }
        
        // Fallback без FilesystemPlugin — используем downloadFallback с правильным именем
        const fileNameFb2 = `neyra-backup-${new Date().toISOString().slice(0,10)}.zip`;
        downloadFallback(blob, fileNameFb2);
        
        markBackupSuccess();
        alert(t('backup_success_msg'));
        return { success: true };
      } catch (err) {
        console.warn('[BACKUP] Share failed:', err.message);
        // Fallback to download
        downloadFallback(blob, filename);
        
        markBackupSuccess();
        alert(t('backup_success_msg'));
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

      // Сохраняем как ZIP без медиа — чтобы импорт работал корректно
      try {
        const fallbackZip = new JSZip();
        fallbackZip.file('data.json', JSON.stringify(fallback, null, 2));
        const fallbackBlob = await fallbackZip.generateAsync({ type: 'blob' });
        const date = new Date().toISOString().split('T')[0];
        downloadFallback(fallbackBlob, `neyra-backup-${date}.zip`);
      } catch(zipErr) {
        // Совсем крайний случай — JSON
        const date = new Date().toISOString().split('T')[0];
        downloadJSON(fallback, `neyra-backup-${date}.json`);
      }
      
      markBackupSuccess();
      alert(t('backup_success_no_media'));
      return { success: true, warning: 'media_skipped' };
    }

  } catch (e) {
    console.error('[BACKUP] Export error:', e);
    return { success: false, error: e.message };
  } finally {
    window.__exportInProgress = false;
  }
}

export function showImportPicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,.json,.txt';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = confirm(t('backup_confirm_overwrite'));
    if (!ok) return;

    const result = await importData(file);

    if (result.error) {
      const messages = {
        'no_file':           t('backup_err_no_file'),
        'invalid_format':    t('backup_err_invalid_format'),
        'invalid_structure': t('backup_err_invalid_structure'),
        'missing_version':   t('backup_err_missing_version'),
        'parse_error':       t('backup_err_parse'),
        'read_error':        t('backup_err_read'),
        'size_exceeded':     t('backup_err_size')
      };
      alert(messages[result.error] || 'Ошибка импорта: ' + result.error);
    } else {
      alert(t('backup_restore_success'));
      disableExitGuardForReload();
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
          alert(t('backup_err_size'));
          resolve({ success: false, error: 'size_exceeded' });
          return;
        }

        // Определяем формат: сначала по расширению, затем по magic bytes
        const isZipByExtension = file.name.endsWith('.zip');
        
        // Читаем первые 4 байта для определения ZIP magic (PK\x03\x04)
        let isZipByMagic = false;
        try {
          const buffer = await file.slice(0, 4).arrayBuffer();
          const bytes = new Uint8Array(buffer);
          // ZIP magic: 50 4B 03 04
          isZipByMagic = bytes[0] === 0x50 && bytes[1] === 0x4B;
          console.log('[BACKUP] Magic bytes:', Array.from(bytes).map(b => b.toString(16)).join(' '));
        } catch(e) {
          console.warn('[BACKUP] Magic bytes read failed:', e);
        }

        console.log('[BACKUP] ext:', file.name.split('.').pop(), 'isZipByMagic:', isZipByMagic);

        // Если magic bytes говорят ZIP — всегда обрабатываем как ZIP
        // независимо от расширения (.txt, .zip, .json)
        const doImport = isZipByMagic || isZipByExtension;
        
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

    if (!backup.data || Object.keys(backup.data).length === 0) {
      resolve({ success: false, error: 'empty_backup' });
      return;
    }

    if (!backup.version) {
      resolve({ success: false, error: 'missing_version' });
      return;
    }

    // ШАГ 1: Сначала восстанавливаем аудио файлы в Filesystem
    const mediaFolder = zip.folder('media');
    const mediaMap = new Map();

    if (mediaFolder) {
      const mediaFiles = Object.keys(zip.files).filter(
        n => n.startsWith('media/') && n !== 'media/'
      );
      console.log('[BACKUP] Media files to restore:', mediaFiles.length);

      for (const name of mediaFiles) {
        const shortName = name.replace('media/', '');
        const fileObj = zip.file(name);
        if (!fileObj) continue;
        try {
          if (shortName.startsWith('voice_') && shortName.endsWith('.webm')) {
            // Аудио → пишем в Filesystem
            const b64 = await fileObj.async('base64');
            const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;
            if (FilesystemPlugin && window.Capacitor?.isNativePlatform()) {
              try {
                await FilesystemPlugin.mkdir({ path: 'Neyra', directory: 'Documents', recursive: true });
              } catch(e) { /* папка уже есть */ }
              await FilesystemPlugin.writeFile({
                path: `Neyra/${shortName}`,
                data: b64,
                directory: 'Documents',
                recursive: true,
              });
              const { uri } = await FilesystemPlugin.getUri({
                path: `Neyra/${shortName}`,
                directory: 'Documents'
              });
              // В mediaMap кладём file:// uri чтобы audio поле стало рабочим
              mediaMap.set(shortName, uri);
            } else {
              // Браузер / не нативная платформа — кладём base64
              const blob = await fileObj.async('blob');
              const dataUrl = await blobToDataUrl(blob);
              mediaMap.set(shortName, dataUrl);
            }
          } else {
            // Фото → в mediaMap как dataUrl
            const blob = await fileObj.async('blob');
            const dataUrl = await blobToDataUrl(blob);
            mediaMap.set(shortName, dataUrl);
          }
        } catch (e) {
          console.warn('[BACKUP] Failed to extract media:', name, e);
        }
      }
    }

    // ШАГ 2: Восстанавливаем текстовые данные
    restoreData(backup.data);

    // ШАГ 2.5: Зачищаем file:// ссылки ТОЛЬКО если нет соответствующего файла в mediaMap
    try {
      const vh = JSON.parse(localStorage.getItem('voice_history') || '[]');
      const cleaned = vh.map(item => {
        if (item.audio && item.audio.startsWith('file://')) {
          const fileName = item.audio.split('/').pop();
          if (!mediaMap.has(fileName)) {
            item.audio = null;
          }
        }
        return item;
      });
      localStorage.setItem('voice_history', JSON.stringify(cleaned));
    } catch(e) {}

    // ШАГ 3: Применяем медиа (аудио uri / фото dataUrl) к записям
    await restoreMediaFromMap(mediaMap);

    // Restore photos from Filesystem photos folder
    const photosFolder = zip.folder('photos');
    if (photosFolder) {
      const files = [];
      photosFolder.forEach((path, file) => files.push({ path, file }));
      for (const { path, file } of files) {
        try {
          const b64 = await file.async('base64');
          const entryId = path.replace('photos/', '').replace('.jpg', '');
          const filePath = 'photos/photo_' + entryId + '.jpg';
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          await Filesystem.writeFile({
            path: filePath,
            data: b64,
            directory: Directory.Data,
            recursive: true,
          });
          const { uri } = await Filesystem.getUri({ path: filePath, directory: Directory.Data });
          await savePhotoMeta(entryId, { path: filePath, uri, ts: Date.now() });
        } catch(e) {
          console.warn('[BACKUP] Failed to restore photo:', path, e);
        }
      }
    }

    console.log('[BACKUP] >>> Reloading page...');
    // Ставим флаг — после перезагрузки показать баннер уточнения профиля
    localStorage.setItem('show_profile_update_banner', '1');
    resolve({ success: true, message: 'Данные восстановлены!' });
    disableExitGuardForReload();
    setTimeout(() => window.location.reload(), 300);
  } catch (e) {
    console.error('[BACKUP] ZIP import error:', e.message, e.stack);
    // Если файл оказался не ZIP — пробуем как JSON (на случай .txt с JSON внутри)
    if (e.message?.includes('Invalid') || e.message?.includes('not a zip') || e.message?.includes('End of central')) {
      console.log('[BACKUP] ZIP failed, trying as JSON fallback...');
      await importFromJson(file, resolve);
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

      // Принимаем файлы Neyra (поле app) И старые файлы без поля app но с полем data
      if (!backup) {
        resolve({ success: false, error: 'invalid_format' });
        return;
      }
      const isNeyraBackup = backup.app === 'neyra' || 
        (backup.data && typeof backup.data === 'object' && backup.version);
      if (!isNeyraBackup) {
        console.error('[BACKUP] Not a Neyra backup:', backup?.app, backup?.version);
        resolve({ success: false, error: 'invalid_format' });
        return;
      }

      if (!backup.data || typeof backup.data !== 'object') {
        console.error('[BACKUP] Invalid data structure');
        resolve({ success: false, error: 'invalid_structure' });
        return;
      }

      const validation = validateBackup(backup);
      if (!validation.valid) {
        console.error('[BACKUP] Validation failed:', validation.error);
        resolve({ success: false, error: validation.error });
        return;
      }

console.log('[BACKUP] Data keys to restore:', Object.keys(backup.data));
    restoreData(backup.data);
    // Ставим флаг — после перезагрузки показать баннер уточнения профиля
    localStorage.setItem('show_profile_update_banner', '1');
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

async function restoreMediaFromMap(mediaMap) {
  console.log('[BACKUP] restoreMediaFromMap started, files:', mediaMap.size);

  const voiceHistory = JSON.parse(localStorage.getItem('voice_history') || '[]');
  const photoHistory = JSON.parse(localStorage.getItem('photo_history') || '[]');
  const photoPromises = [];

  mediaMap.forEach((dataUrl, filename) => {
    if (filename.startsWith('voice_')) {
      const withoutExt = filename.replace('.webm', '');
      const parts = withoutExt.split('_');
      const ts = parseInt(parts[1]);
      const match = voiceHistory.find(item => {
        const itemTs = Number(item.time ?? item.date ?? item.timestamp ?? 0);
        return Math.abs(itemTs - ts) <= 1000;
      });
      if (match) {
        match.audio = dataUrl;
      } else {
        if (!isNaN(ts) && ts > 0) {
          voiceHistory.push({
            time: ts,
            date: ts,
            audio: dataUrl,
            duration: 0,
            mood: 50,
          });
        }
      }
    }
    if (filename.startsWith('photo_') || filename.startsWith('neyra-')) {
      let ts;
      if (filename.startsWith('photo_')) {
        const parts = filename.split('_');
        ts = parseInt(parts[1]);
      } else {
        // neyra-1234567890.jpg
        ts = parseInt(filename.replace('neyra-', '').replace('.jpg', ''));
      }
      const match = photoHistory.find(item =>
        Math.abs((item.timestamp || item.time || 0) - ts) <= 2000
      );
      if (match) {
        photoPromises.push((async () => {
          try {
            const FilesystemPlugin = window.Capacitor?.Plugins?.Filesystem;
            const { savePhotoMeta } = await import('./photo-meta.js');
            if (!FilesystemPlugin || !window.Capacitor?.isNativePlatform?.()) return;
            const b64 = dataUrl.split(',')[1] || dataUrl;
            const restoreFileName = filename;
            const restorePath = `Neyra/${restoreFileName}`;
            try {
              await FilesystemPlugin.mkdir({ path: 'Neyra', directory: 'Documents', recursive: true });
            } catch(e) { /* папка уже есть */ }
            await FilesystemPlugin.writeFile({
              path: restorePath,
              data: b64,
              directory: 'Documents',
              recursive: true
            });
            const { uri } = await FilesystemPlugin.getUri({
              path: restorePath,
              directory: 'Documents'
            });
            match.uri = uri;
            match.source = 'filesystem';
            match.dataUrl = null;
            delete match.photo;
            await savePhotoMeta(String(ts), { path: restorePath, uri, ts });
          } catch(e) {
            console.warn('[BACKUP] restore photo to filesystem failed:', e);
          }
        })());
      }
    }
  });

  // Дожидаемся всех фото-операций ДО сохранения localStorage
  await Promise.all(photoPromises);

  try {
    localStorage.setItem('voice_history', JSON.stringify(voiceHistory));
    localStorage.setItem('photo_history', JSON.stringify(photoHistory));
  } catch (quotaErr) {
    console.error('[BACKUP] Quota error during restore:', quotaErr);
    alert(t('backup_err_restore_media'));
    localStorage.setItem('voice_history', JSON.stringify(voiceHistory.filter(i => !i.audio)));
    localStorage.setItem('photo_history', JSON.stringify(photoHistory.filter(i => !i.dataUrl)));
  }
  console.log('[BACKUP] Media restored from map');
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
  
  Object.keys(data).forEach(key => {
    if (!VALID_KEYS.includes(key)) {
      console.warn('[BACKUP] Skipping unknown key:', key);
      return;
    }

    try {
      const rawBackupValue = data[key];
      if (!rawBackupValue) {
        console.log('[BACKUP] Empty backup value for:', key);
        return;
      }

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

        const existingIds = new Set(
          currentArr.map(getId).filter(Boolean)
        );

        const merged = [...currentArr];

        backupValue.forEach(item => {
          const id = getId(item);
          if (!id || !existingIds.has(id)) {
            merged.push(item);
          }
        });

        localStorage.setItem(key, JSON.stringify(merged));
        console.log('[BACKUP] Merged array:', key, 'total:', merged.length);
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
        console.log('[BACKUP] Merged object:', key);
      }
      else {
        localStorage.setItem(key, rawBackupValue);
        console.log('[BACKUP] Set primitive:', key);
      }

    } catch (e) {
      console.warn('[BACKUP] restore failed:', key, e);
    }
  });
}

export function getBackupInfo() {
  const keys = [
    'mood_history',
    'notes_history',
    'reflections',
    'voice_history',
    'session_history',
    'neyra_letters'
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

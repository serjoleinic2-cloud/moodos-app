// =====================================
// Neyra Cloud Sync Service
// Syncs local data to Firebase via Android bridge
// =====================================

let _syncTimeout = null;

function getVoiceHistory() {
  try {
    return JSON.parse(localStorage.getItem("voice_history") || "[]");
  } catch {
    return [];
  }
}

function getPhotoHistory() {
  try {
    return JSON.parse(localStorage.getItem("photo_history") || "[]");
  } catch {
    return [];
  }
}

export function syncToCloud() {
  if (!window.Android?.saveToCloud) {
    console.log('[CLOUD] Bridge not available');
    return;
  }

  try {
    // Strip base64 data from voice/photo to reduce payload size
    const voiceHistory = getVoiceHistory().map(v => ({
      ...v,
      audio: null
    }));

    const photoHistory = getPhotoHistory().map(p => ({
      ...p,
      dataUrl: null
    }));

    const payload = {
      mood_history: JSON.parse(localStorage.getItem("mood_history") || "[]"),
      notes_history: JSON.parse(localStorage.getItem("notes_history") || "[]"),
      reflections: JSON.parse(localStorage.getItem("reflections") || "[]"),
      voice_history: voiceHistory,
      photo_history: photoHistory,
      practice_history: JSON.parse(localStorage.getItem("practice_history") || "[]"),
      neyra_patterns: JSON.parse(localStorage.getItem("neyra_patterns") || "[]"),
      profile: JSON.parse(localStorage.getItem("neyra_profile") || "{}"),
      updatedAt: Date.now()
    };

    window.Android.saveToCloud(JSON.stringify(payload));
    console.log('[CLOUD] Synced');
  } catch (e) {
    console.error('[CLOUD ERROR]', e);
  }
}

export function scheduleCloudSync() {
  clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(() => {
    syncToCloud();
  }, 2000);
}

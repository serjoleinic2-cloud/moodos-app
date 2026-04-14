// =====================================
// Neyra Cloud Sync Service
// Syncs local data to Firebase via Capacitor Plugin
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
  console.log('[CLOUD] syncToCloud called');
  console.log('[CLOUD] Capacitor.Plugins:', window.Capacitor?.Plugins);
  console.log('[CLOUD] FirebasePlugin:', window.Capacitor?.Plugins?.FirebasePlugin);
  
  const plugin = window.Capacitor?.Plugins?.FirebasePlugin;
  if (!plugin?.saveToCloud) {
    console.log('[CLOUD] FirebasePlugin not available');
    return;
  }

  try {
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

    console.log('[CLOUD] Calling FirebasePlugin.saveToCloud...');
    plugin.saveToCloud({ data: JSON.stringify(payload) })
      .then(() => {
        console.log('[CLOUD] FirebasePlugin.saveToCloud resolved');
      })
      .catch(err => {
        console.error('[CLOUD] FirebasePlugin.saveToCloud error:', err);
      });
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

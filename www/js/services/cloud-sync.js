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

export async function saveToCloud(data) {
  try {
    const plugin = window.Capacitor?.Plugins?.FirebasePlugin;

    console.log("[CLOUD] Plugin:", plugin);

    if (!plugin) {
      console.error("[CLOUD] FirebasePlugin NOT FOUND");
      return;
    }

    const res = await plugin.saveToCloud({
      data: JSON.stringify(data)
    });

    console.log("[CLOUD] SUCCESS", res);

  } catch (e) {
    console.error("[CLOUD] ERROR", e);
  }
}

export function syncToCloud() {
  console.log('[CLOUD] syncToCloud called');

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

    plugin.saveToCloud({ data: JSON.stringify(payload) })
      .then(res => {
        console.log('[CLOUD] FirebasePlugin.saveToCloud SUCCESS');
      })
      .catch(err => {
        console.error('[CLOUD] FirebasePlugin.saveToCloud ERROR:', err);
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

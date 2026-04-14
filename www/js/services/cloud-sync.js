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

export async function testFirebasePlugin() {
  console.log('[CLOUD] Testing FirebasePlugin...');
  
  const plugin = window.Capacitor?.Plugins?.FirebasePlugin;
  if (!plugin) {
    console.error('[CLOUD] FirebasePlugin NOT FOUND');
    console.log('[CLOUD] Available plugins:', Object.keys(window.Capacitor?.Plugins || {}));
    return;
  }
  
  console.log('[CLOUD] FirebasePlugin found:', plugin);
  
  try {
    const result = await plugin.saveToCloud({ data: 'test' });
    console.log('[CLOUD] SUCCESS:', result);
  } catch (e) {
    console.error('[CLOUD] ERROR:', e);
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

// TEST: Call this in browser console
window.testFirebasePlugin = testFirebasePlugin;

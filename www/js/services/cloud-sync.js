// =====================================
// Neyra Cloud Sync Service
// Syncs local data to Firebase via Android bridge
// =====================================

let _syncTimeout = null;

export function syncToCloud() {
  if (!window.Android?.saveToCloud) {
    console.log('[CLOUD] Bridge not available');
    return;
  }

  try {
    const payload = {
      mood_history: JSON.parse(localStorage.getItem("mood_history") || "[]"),
      notes_history: JSON.parse(localStorage.getItem("notes_history") || "[]"),
      reflections: JSON.parse(localStorage.getItem("reflections") || "[]"),
      voice_history: JSON.parse(localStorage.getItem("voice_history") || "[]"),
      photo_history: JSON.parse(localStorage.getItem("photo_history") || "[]"),
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

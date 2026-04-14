// =====================================
// Neyra Cloud Sync Service
// Android Bridge → Firebase Firestore
// =====================================

export async function syncToCloud(data) {
  try {
    if (!window.Android) {
      console.warn('[CLOUD] Android bridge not available');
      console.log('[CLOUD] window.Android:', window.Android);
      return { success: false, error: 'no_bridge' };
    }

    window.Android.saveToCloud(JSON.stringify(data));
    console.log('[CLOUD] Sent to Android bridge');
    return { success: true };

  } catch (error) {
    console.error('[CLOUD] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function loadFromCloud() {
  console.log('[CLOUD] Load handled by MainActivity on startup');
  return null;
}

export async function mergeData(cloudData) {
  if (!cloudData) return;

  const keyMap = {
    mood: 'mood_history',
    notes: 'notes_history',
    reflections: 'reflections_history',
    voice: 'voice_history',
    sessions: 'session_history'
  };

  Object.keys(cloudData).forEach(key => {
    const storageKey = keyMap[key] || key;
    if (cloudData[key]) {
      try {
        localStorage.setItem(storageKey, cloudData[key]);
        console.log('[CLOUD] Merged:', storageKey);
      } catch (e) {
        console.warn('[CLOUD] Failed to merge:', storageKey, e);
      }
    }
  });

  console.log('[CLOUD] Merge complete');
}

export async function fullSync() {
  const data = collectLocalData();
  return await syncToCloud(data);
}

export function collectLocalData() {
  return {
    mood: localStorage.getItem('mood_history'),
    notes: localStorage.getItem('notes_history'),
    reflections: localStorage.getItem('reflections_history'),
    voice: localStorage.getItem('voice_history'),
    sessions: localStorage.getItem('session_history'),
    profile: localStorage.getItem('user_profile'),
    syncedAt: Date.now()
  };
}

// Test function
window.testAndroidBridge = function() {
  console.log('Testing Android bridge...');
  console.log('window.Android:', window.Android);
  if (window.Android?.saveToCloud) {
    window.Android.saveToCloud('test');
    console.log('Called saveToCloud');
  }
};

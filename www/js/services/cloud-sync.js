// =====================================
// Neyra Cloud Sync Service
// Android Bridge → Firebase Firestore
// =====================================

export function isCloudEnabled() {
  return localStorage.getItem('cloud_enabled') === 'true';
}

export function syncToCloud(data) {
  if (!isCloudEnabled()) {
    console.log('[CLOUD] skipped — no consent');
    return { success: false, error: 'no_consent' };
  }

  try {
    if (!window.Android) {
      console.warn('[CLOUD] Android bridge not available');
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
    reflections: 'reflections',
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
  const profileRaw = JSON.parse(localStorage.getItem('user_profile') || '{}');
  
  const {
    premium,
    premium_type,
    premiumExpiresAt,
    premium_since,
    premiumTrial,
    premiumPlan,
    isPremium,
    takesMeds,
    medEffect,
    baseFeeling,
    ...safeProfile
  } = profileRaw;
  
  return {
    mood: localStorage.getItem('mood_history'),
    notes: localStorage.getItem('notes_history'),
    reflections: localStorage.getItem('reflections'),
    voice: localStorage.getItem('voice_history'),
    sessions: localStorage.getItem('session_history'),
    profile: JSON.stringify(safeProfile),
    syncedAt: Date.now()
  };
}

export function scheduleCloudSync() {
  if (!isCloudEnabled()) {
    console.log('[CLOUD] skipped — no consent');
    return;
  }
  
  console.log('[CLOUD] scheduleCloudSync called');
  const data = collectLocalData();
  syncToCloud(data);
}

export function enableCloudSync() {
  localStorage.setItem('cloud_enabled', 'true');
  console.log('[CLOUD] enabled');
}

export function disableCloudSync() {
  localStorage.setItem('cloud_enabled', 'false');
  console.log('[CLOUD] disabled');
}

export function deleteAllCloudData() {
  if (!window.Android) {
    console.warn('[CLOUD] Android bridge not available');
    return;
  }
  window.Android.deleteCloudData();
}

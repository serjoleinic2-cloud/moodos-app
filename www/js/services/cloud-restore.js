// =====================================
// Neyra Cloud Restore Service
// Restores local data from Firebase
// =====================================

export function restoreFromCloud(data) {
  try {
    if (!data) return;

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (parsed.mood_history) {
      localStorage.setItem("mood_history", JSON.stringify(parsed.mood_history));
    }

    if (parsed.notes_history) {
      localStorage.setItem("notes_history", JSON.stringify(parsed.notes_history));
    }

    if (parsed.reflections) {
      localStorage.setItem("reflections", JSON.stringify(parsed.reflections));
    }

    if (parsed.voice_history) {
      localStorage.setItem("voice_history", JSON.stringify(parsed.voice_history));
    }

    if (parsed.photo_history) {
      localStorage.setItem("photo_history", JSON.stringify(parsed.photo_history));
    }

    if (parsed.practice_history) {
      localStorage.setItem("practice_history", JSON.stringify(parsed.practice_history));
    }

    if (parsed.neyra_patterns) {
      localStorage.setItem("neyra_patterns", JSON.stringify(parsed.neyra_patterns));
    }

    if (parsed.profile) {
      localStorage.setItem("neyra_profile", JSON.stringify(parsed.profile));
    }

    console.log('[CLOUD] Restored from cloud');
  } catch (e) {
    console.error('[RESTORE ERROR]', e);
  }
}

export function hasLocalData() {
  return [
    "mood_history",
    "notes_history",
    "reflections",
    "voice_history",
    "photo_history"
  ].some(k => {
    try {
      const v = JSON.parse(localStorage.getItem(k) || "[]");
      return Array.isArray(v) && v.length > 0;
    } catch {
      return false;
    }
  });
}

export function restoreFromCloudIfEmpty(data) {
  if (!data) return false;

  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  
  // Time-based protection: skip if local is newer
  const cloudTs = parsed.updatedAt || 0;
  const localProfile = JSON.parse(localStorage.getItem("neyra_profile") || "{}");
  const localTs = localProfile.updatedAt || 0;

  if (localTs > cloudTs) {
    console.warn('[RESTORE] Local newer → skip');
    return false;
  }

  if (hasLocalData()) {
    console.log('[CLOUD] Skip restore — local data exists');
    return false;
  }
  
  restoreFromCloud(data);
  return true;
}

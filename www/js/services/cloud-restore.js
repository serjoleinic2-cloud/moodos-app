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
  return !!(
    localStorage.getItem("mood_history") ||
    localStorage.getItem("notes_history") ||
    localStorage.getItem("reflections")
  );
}

export function restoreFromCloudIfEmpty(data) {
  if (hasLocalData()) {
    console.log('[CLOUD] Skip restore — local data exists');
    return false;
  }
  restoreFromCloud(data);
  return true;
}

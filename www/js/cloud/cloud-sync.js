// =====================================
// Neyra Cloud Sync Service
// Backup/Restore via Firebase Firestore
// =====================================

import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase-init.js";
import { getUser, isLoggedIn, getUserId } from "./auth.js";
import { isFirebaseConfigured } from "./firebase-init.js";

const COLLECTION = "neyra_users";

function getUserDoc() {
  const uid = getUserId();
  if (!uid) return null;
  return doc(db, COLLECTION, uid);
}

export async function syncToCloud(data) {
  if (!isFirebaseConfigured()) {
    console.log('[CLOUD] Firebase not configured');
    return { success: false, error: 'not_configured' };
  }
  
  if (!isLoggedIn()) {
    console.log('[CLOUD] Not logged in, skipping sync');
    return { success: false, error: 'not_logged_in' };
  }
  
  try {
    const userDoc = getUserDoc();
    if (!userDoc) return { success: false, error: 'no_user' };
    
    console.log('[CLOUD] Syncing data...');
    await setDoc(userDoc, {
      data,
      updatedAt: Date.now(),
      userId: getUserId()
    });
    
    console.log('[CLOUD] Sync complete');
    return { success: true };
  } catch (error) {
    console.error('[CLOUD] Sync error:', error);
    return { success: false, error: error.message };
  }
}

export async function loadFromCloud() {
  if (!isFirebaseConfigured()) {
    console.log('[CLOUD] Firebase not configured');
    return null;
  }
  
  if (!isLoggedIn()) {
    console.log('[CLOUD] Not logged in, skipping load');
    return null;
  }
  
  try {
    const userDoc = getUserDoc();
    if (!userDoc) return null;
    
    console.log('[CLOUD] Loading data from cloud...');
    const snap = await getDoc(userDoc);
    
    if (snap.exists()) {
      const cloudData = snap.data().data;
      console.log('[CLOUD] Data loaded from cloud');
      return cloudData;
    }
    
    console.log('[CLOUD] No cloud data found');
    return null;
  } catch (error) {
    console.error('[CLOUD] Load error:', error);
    return null;
  }
}

export async function mergeData(cloudData) {
  if (!cloudData) return;
  
  console.log('[CLOUD] Merging cloud data with local...');
  
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
  if (!isLoggedIn()) {
    return { success: false, error: 'not_logged_in' };
  }
  
  const cloudData = await loadFromCloud();
  if (cloudData) {
    await mergeData(cloudData);
  }
  
  const localData = collectLocalData();
  await syncToCloud(localData);
  
  return { success: true };
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

// =====================================
// Neyra Cloud Test
// Test Firestore write
// =====================================

import { db, isFirebaseConfigured } from "./firebase-init.js";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function testCloudWrite() {
  console.log('[CLOUD TEST] Starting...');
  console.log('[CLOUD TEST] Firebase configured:', isFirebaseConfigured());

  if (!isFirebaseConfigured()) {
    console.log('[CLOUD TEST] Skipped - Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const testDoc = {
      ok: true,
      timestamp: Date.now(),
      device: 'web_test',
      appVersion: '1.0'
    };

    await setDoc(doc(collection(db, 'test'), 'device_test'), testDoc);
    console.log('[CLOUD TEST] WRITE OK - check Firebase Console');
    return { success: true };
  } catch (e) {
    console.error('[CLOUD TEST] WRITE ERROR:', e.code, e.message);
    return { success: false, error: e.message, code: e.code };
  }
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
  window.testCloudWrite = testCloudWrite;
  console.log('[CLOUD TEST] Call window.testCloudWrite() to test');
}

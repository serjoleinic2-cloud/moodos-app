# FIX LOG — Neyra App

Quick reference for recent fixes.

---

## 2026-04-15

### TASK CRITICAL 1-10 — Firebase Security & Premium Fixes

**Files updated:**
- `android/app/src/main/java/com/moodos/app/MainActivity.java` — Full user isolation
- `android/app/src/main/java/com/moodos/app/FirebasePlugin.java` — User isolation
- `firestore.rules` — Secure rules for neyra_users collection
- `www/js/cloud/cloud-sync.js` — safeMerge with timestamp, fixed keys
- `www/js/services/cloud-restore.js` — Fixed key names
- `www/js/app.js` — Removed test hacks
- `www/js/screens/paywall.js` — Real billing call
- `www/js/services/billing-service.js` — verifyPurchaseWithServer returns false
- `www/js/services/user-profile.js` — Premium expiration (30 days)
- `www/js/services/memory.js` — Storage limits + safeParse
- `www/js/ai/offline-ai.js` — AI patterns TTL (30 days)

**Key fixes:**

1. **Firebase User Isolation:**
   - `collection("test")` → `collection("neyra_users").document(uid)`
   - Rules: `request.auth.uid == userId`

2. **Cloud Sync:**
   - Deleted duplicate `services/cloud-sync.js`
   - Fixed key: `reflections: 'reflections'` (not 'reflections_history')
   - Added `safeMerge()` with timestamp check

3. **Premium Security:**
   - Removed `window._billingPremium = true`
   - Removed `window._trustedSetBillingPremium` hack
   - `verifyPurchaseWithServer` returns `{ valid: false }`
   - Paywall calls real `billing-service.js`

4. **Storage:**
   - Added MAX limits: session_history (100), activity_history (100)
   - Added safeParse for JSON errors
   - Added AI patterns TTL (30 days)

5. **Android Bridge:**
   - Added loadFromCloud + retry logic in MainActivity

**Files deleted:**
- `www/js/services/cloud-sync.js` (дубликат)

---

## 2026-04-15 (Part 2)

### TASK A-H — Additional Security Fixes

**Files updated:**
- `www/js/services/user-profile.js` — Removed __internalPremium backdoor, added block
- `www/js/cloud/cloud-sync.js` — Profile sanitization (no premium in cloud)
- `www/js/services/cloud-sync.js` — Created with consent check + delete function
- `www/js/services/billing-service.js` — Fixed .onExpired → .expired

**Key fixes:**

1. **TASK A:** Kill __internalPremium backdoor
   - Removed check `if (window.__internalPremium === true) return true`
   - Added Object.defineProperty to block attempts

2. **TASK B:** Profile sanitization
   - collectLocalData removes premium, medical data before sync

3. **TASK C:** Cloud consent
   - isCloudEnabled() checks localStorage.getItem('cloud_enabled')
   - scheduleCloudSync returns early if no consent

4. **TASK D:** Delete cloud data
   - window.Android.deleteCloudData() + Android deleteFromFirestore()

5. **TASK E:** Pending cloud data (already exists in app.js)

6. **TASK F:** Crash fix
   - All `window.systemState.premium` now wrapped in `if (window.systemState)`

7. **TASK G:** Medical data removal (included in TASK B)

8. **TASK H:** Billing expiry API
   - `.onExpired` → `.expired`

---

## 2026-04-15 (Part 3)

### TASK I-O — Cloud Sync Improvements

**Files updated:**
- `www/js/services/cloud-sync.js` — Single source, confirm delete, change detection, consent
- `android/.../MainActivity.java` — Firestore min split
- `www/js/app.js` — initCloudConsent() call

**Key fixes:**

1. **TASK I:** Single source of truth
   - Deleted `www/js/cloud/cloud-sync.js`
   - Updated imports in `storage-wrapper.js`

2. **TASK J:** Hard confirm for delete
   - `confirmDeleteCloud()` with native confirm()

3. **TASK K:** Consent migration
   - `initCloudConsent()` sets default to 'false' if null

4. **TASK L:** Firestore min split
   - `collection("neyra_users").document(uid).collection("core").document("main")`

5. **TASK M:** Change detection
   - `lastPayloadHash` comparison before sync

6. **TASK N:** Billing restore (already implemented)
   - `onOwned()` calls `activatePremiumPaid()` on restore

7. **TASK O:** Cloud sync feedback
   - `window._lastCloudSync` object

---

## 2026-04-15 (Part 4)

### TASK P-Z — Final Hardening

**Files updated:**
- `www/js/services/cloud-sync.js` — Payload guard, truncation, safe JSON helpers
- `www/js/services/cloud-restore.js` — Smart restore with syncedAt
- `www/js/app.js` — Null guard, error reporting, cloud prompt
- `www/js/screens/paywall.js` — Billing fail safe
- `www/js/services/memory.js` — All limits + emergency prune
- `android/.../MainActivity.java` — Firestore split

**Key fixes:**

1. **TASK P:** Payload size guard (900KB limit)
2. **TASK Q:** Truncation if too large
3. **TASK R:** Smart restore (syncedAt comparison)
4. **TASK S:** Android bridge null guard
5. **TASK T:** safeParse/safeSet helpers
6. **TASK U:** All history limits (mood:730, notes:500, etc.)
7. **TASK V:** Removed test-cloud.js
8. **TASK W:** Error reporting (`window._errors`)
9. **TASK X:** Billing fail safe UI
10. **TASK Y:** First-run cloud prompt
11. **TASK Z:** Production flags verified

**Final Checklist:**
- ✅ No "test" collection
- ✅ No unsafe Firestore rules
- ✅ No __internalPremium backdoor
- ✅ No direct premium mutation
- ✅ No duplicate cloud modules

---

## 2026-04-13

### TASK 132 — Privacy Policy & User Consent
**Files created:**
- `docs/PRIVACY.md` — Full Privacy Policy (GDPR/CCPA compliant)

**Files updated:**
- `settings.js` — Privacy info in Cloud section + modal

**i18n keys (all 4 languages):**
```js
cloud_data_local, cloud_data_firebase
privacy_policy, privacy_local_title, privacy_cloud_title
privacy_data_title, privacy_rights_title, privacy_full_policy
```

**UI Flow:**
1. Settings → Cloud → shows data info + Privacy link
2. Click → shows modal with summary
3. "Read full policy" → opens docs/PRIVACY.md

---

## 2026-04-13

### TASK 131 — Android Native Firebase Setup
**Android Gradle Config:**
```gradle
// android/build.gradle
classpath 'com.google.gms:google-services:4.4.4'

// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.8.1')
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-firestore'
}
```

**Web SDK Disabled (Android WebView incompatibility):**
```js
// app.js
function initCloudAuth() {
  console.log('[Cloud] Auth disabled (native setup phase)');
}

// settings.js
function initCloudLoginUI() {
  console.log('[Cloud] UI disabled (native setup phase)');
}
```

**Google Services JSON:**
- Path: `android/app/google-services.json`
- Replace with Firebase project config

### TASK 130 — Firebase + Google Auth
**Files created:**
- `cloud/firebase-init.js` — Firebase config (replace placeholders)
- `cloud/auth.js` — loginWithGoogle(), logout(), getUser()
- `cloud/cloud-sync.js` — syncToCloud(), loadFromCloud(), mergeData()

**Usage:**
```js
import { loginWithGoogle, logout, getUser } from './cloud/auth.js';

// Login
await loginWithGoogle();

// Check status
if (getUser()) { ... }

// Logout
await logout();
```

**Note:** Replace firebaseConfig placeholders with real Firebase project credentials.

### TASK 129 — Events Insight in home.js ✓ WORKING

### TASK 127 — Insight Debug Logs
```
[APP] confirmBtn | hasEvents: true | events: [...]
[INSIGHT PAYLOAD] {"mood":50,"events":["coffee"],"type":"events"}
[INSIGHT TYPE] events | text: false | events: 1
[INSIGHT ROUTING] → generatePatternInsight
[PATTERN] generatePatternInsight called | mood: 50 | events: ["coffee"]
```

### TASK 126 — Storage Abstraction
```js
// Before (localStorage only)
localStorage.setItem('key', data);

// After (cloud-ready)
import { saveData } from './services/storage-wrapper.js';
await saveData('key', data);

// Switch to Firebase
import { setStorageType, STORAGE_TYPE } from './services/storage-wrapper.js';
setStorageType(STORAGE_TYPE.FIREBASE);
```

---

## 2026-04-13 (Privacy & Compliance)

### TASK 132 — Privacy Policy & User Consent
**Files:**
- `docs/PRIVACY.md` — Full Privacy Policy (GDPR, CCPA compliant)
- `settings.js` — Privacy info in Cloud section + modal

**i18n keys added (all languages):**
```js
cloud_data_local: "Your data is stored locally"
cloud_data_firebase: "When signed in: sync via Firebase (Google)"
privacy_policy: "Privacy Policy"
privacy_local_title: "Local Storage"
privacy_cloud_title: "Cloud Sync"
privacy_data_title: "What Data"
privacy_rights_title: "Your Rights"
privacy_full_policy: "Read full policy →"
```

**UI Flow:**
1. Settings → Cloud → shows data info + Privacy Policy link
2. Click link → shows modal with summary
3. "Read full policy" → opens docs/PRIVACY.md

---

## 2026-04-13 (Syntax Fixes)

### i18n Comma Fixes
Fixed missing commas in all language files.

## 2026-04-15 (Part 5)

### TASK AA-AK — Pre-Audit Hardening

**Files updated:**
- `android/.../MainActivity.java` — Delete path matches core/main split
- `www/js/services/cloud-sync.js` — Type check, retry, restore loop guard, syncedAt validation
- `www/js/services/memory.js` — Dedupe function applied
- `www/js/services/billing-service.js` — Double-activation guard, multiple init prevention
- `www/js/system-core.js` — Log reduction

---

## 2026-04-15 (Android Runtime Final)

### ANDROID BUILD & RUNTIME FIXES

**Files updated:**
- `android/app/src/main/java/com/moodos/app/MainActivity.java`
- `android/app/src/main/java/com/moodos/app/FirebasePlugin.java`

**Key fixes:**

1. **Non-static FirebaseBridge** — instance inner class
2. **Thread-safe webView** — webView.post() for all JS calls
3. **JSON escape** — \\, \", \n, \r, \t
4. **Memory pressure** — onTrimMemory() with cache clear
5. **Sync throttle** — 2 second debounce
6. **Activity cleanup** — onDestroy() resets state
7. **JS ready check** — window._appReady verification
8. **Firestore path** — neyra_users/{uid}/core/main
9. **Null safety** — webView != null checks everywhere
10. **Exception handling** — try-catch around evaluateJavascript

**Production-grade WebView bridge achieved.**

**Remaining real-world risks (non-blocking):**
- Android OEM lifecycle differences
- Firebase async ordering variance
- WebView memory reclaim behavior
- Process kill recovery edge cases

---

## 2026-04-03

### TASK 124 — Memory Limits
| Storage | MAX |
|---------|-----|
| voice_history | 30 |
| photo_history | 20 |
| notes_history | 500 |
| mood_history | 730 |
| reflections_history | 100 |

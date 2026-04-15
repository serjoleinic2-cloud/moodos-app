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
- `www/js/services/cloud-sync.js`

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

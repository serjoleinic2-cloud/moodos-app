# FIX LOG — Neyra App

Quick reference for recent fixes.

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

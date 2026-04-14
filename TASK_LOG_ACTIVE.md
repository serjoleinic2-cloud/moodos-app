# TASK LOG ACTIVE — Neyra App

## COMPLETED TASKS

### TASK 135 — Privacy Policy Cloud Storage Update
**Date:** 2026-04-14
**Files updated:**
- docs/PRIVACY.md — expanded Cloud Storage section with Firebase details
- www/docs/privacy.html — synchronized HTML version
**Content added:**
- What data stored in cloud
- When data is sent
- Security, User control
- User Consent section

### TASK 134 — Cloud Restore (Auto Sync from Firebase)
**Date:** 2026-04-14
**Files created:**
- www/js/services/cloud-restore.js — restoreFromCloud(), restoreFromCloudIfEmpty()
- www/js/services/cloud-sync.js — syncToCloud(), scheduleCloudSync()
**Files updated:**
- www/js/app.js — window.onCloudData callback
- www/js/system-core.js — scheduleCloudSync() after MOOD_SUBMIT, SAVE_REFLECTION, VOICE_SAVE
- www/js/screens/history.js — scheduleCloudSync() after savePhoto()
- android/.../MainActivity.java — loadFromCloud(), saveToCloud() methods

### TASK 133-C — Remove Duplicate Restore Button
**Date:** 2026-04-14
**Files updated:**
- www/js/screens/settings.js — removed duplicate "Восстановление данных" button
**Reason:** Button duplicated new backup UI cards

### TASK 133-B — Firebase JS-Android Bridge
**Date:** 2026-04-14
**Files updated:**
- android/.../MainActivity.java — FirebaseBridge class with @JavascriptInterface
**Bridge API:**
```javascript
window.Android.saveToCloud(JSON.stringify({ mood: 80, events: ['food'] }));
```
**Collection:** `user_data` in Firestore

### TASK 133-A — Firestore Native Test
**Date:** 2026-04-14
**Result:** ✅ Firestore write confirmed working on Android native
**Test collection:** `test`, document: `native_test`

### TASK 132-E — Cloud Consent Popup (GDPR)
**Date:** 2026-04-14
**Files updated:**
- www/js/screens/settings.js — showCloudConsentModal() function
- www/js/i18n/*.js — cloud_consent_* keys (all 5 languages)
**Behavior:**
- Shows popup before cloud save/restore
- Saves consent flag: localStorage.setItem('cloud_consent', 'true')
- Skips popup if consent already given

### TASK 132-D — Redesign Backup UI
**Date:** 2026-04-14
**Files updated:**
- www/js/screens/settings.js — 2 cards layout
- www/js/i18n/*.js — backup card labels (all 5 languages)
**Changes:**
- Card 1 (Free): "Data for 7 days" with Save/Restore
- Card 2 (Premium): "Full period (cloud) 👑"

### TASK 132-C — Hindi Language Support
**Date:** 2026-04-14
**Files created:**
- www/js/i18n/hi.js — Full Hindi translation
**Files updated:**
- www/js/i18n.js — import, TRANSLATIONS, LANG_OPTIONS
- www/js/avatar.js — Hindi in all 15 MSG sections
- www/js/system-core.js — Hindi in getTapMessage/getInactivityMessage
**Result:** 5 languages: ru, en, es, uk, hi

### TASK 132-B — Disable Google Login UI
**Date:** 2026-04-14
**Files updated:**
- www/js/screens/settings.js — ENABLE_GOOGLE_AUTH = false

### TASK 132-A — Privacy Policy GDPR/CCPA/India
**Date:** 2026-04-14
**Files updated:**
- docs/PRIVACY.md — New 8-section structure
- www/docs/privacy.html — HTML version
- www/js/i18n/*.js — privacy_section_* keys

### TASK 131 — Android Native Firebase Setup
**Status:** COMPLETED
**Android:**
- android/app/build.gradle: Firebase dependencies ✓
- android/app/google-services.json: Configured ✓
**Files created:**
- www/js/cloud/test-cloud.js — test function (not used)
- www/js/cloud/firebase-init.js — Firebase config

---

## IN PROGRESS

### TASK 131-C — DEV Premium Override
**Status:** ACTIVE
**File:** www/js/services/user-profile.js
**To disable:** Set DEV_FORCE_PREMIUM = false

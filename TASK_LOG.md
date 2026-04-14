# TASK LOG — Neyra App

## ACTIVE TASKS

---

## COMPLETED TASKS

### TASK 132 — Privacy Policy & User Consent
- docs/PRIVACY.md — GDPR/CCPA compliant
- settings.js — privacy info + modal
- i18n — privacy_* keys for all languages

### TASK 131 — Android Native Firebase Setup
- android/build.gradle + android/app/build.gradle configured
- Web SDK disabled for Android WebView
- google-services.json: pending replacement

### TASK 130 — Firebase + Google Auth (Web Phase)
- Created www/js/cloud/ (firebase-init.js, auth.js, cloud-sync.js)

### TASK 129 — Events Insight Fix ✓
- home.js: safeGenerateInsight after MOOD_SUBMIT
- Events now generate insight correctly

### TASK 127 — Debug Insight Pipeline
- Added logs: [INSIGHT PAYLOAD], [INSIGHT TYPE], [PATTERN]
- Fixed clearSelectedEvents() fallback in app.js
- Confirmed routing: generateInsight() → reflection OR pattern based on type

### TASK 128 — PROJECT SNAPSHOT
- Created PROJECT_SNAPSHOT.md (current state overview)
- Organized .md files

### TASK 126 — User ID & Storage Abstraction (Cloud-Ready)
- services/userId.js: getUserId(), setGoogleUserId(), isGoogleUser()
- services/storage-wrapper.js: saveData(), loadData(), deleteData()

---

## OLD LOG

See: `docs/archive/TASK_LOG_v2.md`

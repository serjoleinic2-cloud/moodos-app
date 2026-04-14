# PROJECT SNAPSHOT — Neyra App
**Updated:** 2026-04-13

---

## 1. ARCHITECTURE

### Core Modules
| Module | Responsibility |
|--------|----------------|
| `app.js` | Boot, event handlers, confirmBtn logic |
| `system-core.js` | Event bus, state dispatch |
| `navigation.js` | Screen routing |
| `state.js` | Global state (mood, avatar) |

### AI Layer (`ai/`)
| Module | Responsibility |
|--------|----------------|
| `offline-ai.js` | generateInsight, analyzeEventImpact, pattern detection |
| `avatar-brain.js` | Avatar responses |
| `voice.js` | Voice recording |

### UI Layer (`screens/`)
| Module | Entry Point |
|--------|-------------|
| `home.js` | onEnter() |
| `insight.js` | onEnter() |
| `history.js` | onEnter() |
| `meditation.js` | onEnter() / onExit() |
| `settings.js` | onEnter() |

### Services (`services/`)
- `memory.js` — localStorage CRUD
- `analytics.js` — stability, trend, golden hour
- `user-profile.js` — premium, theme, language
- `billing-service.js` — Google Play integration
- `drive-backup.js` — Google Drive backup
- `storage-wrapper.js` — cloud-ready abstraction
- `userId.js` — user identification

### Cloud (`cloud/`)
- `firebase-init.js` — Firebase configuration
- `auth.js` — Google Sign-In
- `cloud-sync.js` — Firestore backup/restore

---

## 2. CURRENT PIPELINE

### Mood Submit (app.js confirmBtn)

**PRIORITY: text > events**

```
1. User selects events OR types text (or both)
2. confirmBtn click:
   - if text → type='reflection' → saveReflection() → safeGenerateInsight(type='reflection')
   - if NO text → type='events' → safeGenerateInsight(type='events')
3. Insight shown in homeInsightCard
```

**CRITICAL RULE:**
- Если есть text → используется ТОЛЬКО reflection pipeline
- Если нет text → используется events pipeline
- Одновременная обработка НЕ используется

### Reflection Flow
```
User types text → SAVE_REFLECTION → saveReflection() → safeGenerateInsight(type='reflection')
```
- Saved to: `reflections_history` (MAX 100)

### Voice Flow
```
recordVoiceBtn click → VOICE_START → voice recording → VOICE_SAVE → saveVoiceNote()
```
- Voice history: MAX 30 entries

---

## 3. ACTIVE LOGIC

### generateInsight() Routing (offline-ai.js:491)

**PRIORITY:**
```
text > events
```

```js
// 1. If text exists → reflection
if (data.type === 'reflection' || (data.text && data.text.trim().length > 0))
  → generateReflectionInsight()

// 2. Otherwise → events
if (data.type === 'events')
  → generatePatternInsight()
```

### safeGenerateInsight() (offline-ai.js:450)
- Wraps generateInsight() with 2s timeout
- Returns fallback message on timeout

### Pattern Analysis
- `analyzeEventImpact(history)` — finds mood patterns from history
- `buildPatternInsight(pattern, mood)` — builds text from pattern
- `getCombinationInsight(moodLevel, events)` — combo insights (stress+low, walk+high)

---

## 4. UX DECISION

### ConfirmBtn Behavior

- **Один confirmBtn** на главном экране
- Пользователь может:
  - a) выбрать события (events)
  - b) написать текст (reflection)
  - c) или оба
- **Но система выбирает:**
  - **text → приоритет** (если есть текст, events игнорируются)
  - **no text → events pipeline** (если текста нет, используются события)

---

## 5. DATA STORAGE

### Limits (memory.js)
| Storage | Limit |
|---------|-------|
| mood_history | 730 |
| reflections_history | 100 |
| voice_history | 30 |
| photo_history | 20 |
| session_history | unlimited |
| notes_history | 500 |

### Keys
- `mood_history` — mood entries with value, events, timeBucket
- `reflections_history` — text + mood + time
- `session_history` — practices (meditation, breathing, etc.)
- `user_profile` — premium, theme, language

---

## 6. AI LOGIC

### analyzeEventImpact(history)
- Calculates baseline mood per event
- Uses EVENT_WEIGHTS: sleep(1.2), sport(1.3), coffee(0.9), etc.
- Detects time-aware patterns (coffee_morning vs coffee_evening)
- Returns patterns with score, count, impact

### buildPatternInsight(pattern, mood)
- Builds localized text from pattern
- Uses i18n keys: pattern_positive, pattern_negative, pattern_positive_time
- Includes meta: count, impact, timeBucket

### analyzeText(text, mood) (deprecated)
- Simple keyword matching
- Replaced by generateReflectionInsight()

---

## 7. KNOWN ISSUES (MAX 3)

1. ~~Events pipeline bug (FIXED in TASK 129)~~ ✓
2. Voice recording sometimes unstable (unconfirmed)
3. Premium UI sync with billing-service needs verification (unconfirmed)

---

## 8. LAST COMPLETED TASKS

### TASK 132 — Privacy Policy & User Consent
**Date:** 2026-04-13
- Created docs/PRIVACY.md (GDPR/CCPA compliant)
- Added privacy info to Settings → Cloud section
- i18n keys for all 4 languages

### TASK 131 — Android Native Firebase Setup
**Status:** IN PROGRESS
- android/build.gradle + android/app/build.gradle configured
- Web SDK disabled for Android WebView compatibility
- google-services.json: pending replacement

### TASK 130 — Firebase + Google Auth (Web Phase)
- Created www/js/cloud/ (firebase-init.js, auth.js, cloud-sync.js)

### TASK 129 — Events Insight Fix ✓
- home.js: safeGenerateInsight after MOOD_SUBMIT

---

## 9. DEPRECATED / REMOVED

- `analyzeText()` — replaced by generateReflectionInsight()
- Old insight pipeline via system-core.js GENERATE_INSIGHT
- Inline avatar response logic in home.js — now via safeGenerateInsight()

---

## 10. I18N

4 languages: ru, en, es, uk
Keys: `event_*`, `insight_*`, `pattern_*`, `reflection_*`, `time_*`, `privacy_*`, `cloud_*`

---

## 11. QUICK COMMANDS

```js
// Check premium
isPremium()

// Get mood
getMood()

// Get selected events
getSelectedEvents()

// Generate insight (manual)
safeGenerateInsight({ mood: 50, events: ['coffee'], type: 'events' })

// Generate reflection insight (manual)
safeGenerateInsight({ mood: 50, text: 'Устал', type: 'reflection' })
```

# TASK LOG — Neyra App

## ACTIVE TASKS

---

## COMPLETED TASKS

### TASK 126 — User ID & Storage Abstraction (Cloud-Ready)
- services/userId.js: getUserId(), setGoogleUserId(), isGoogleUser()
- services/storage-wrapper.js: saveData(), loadData(), deleteData()
- Текущая реализация: localStorage
- Future: Firebase/Firestore через setStorageType()

### TASK 124 — PRE-RELEASE BLOCKER FIX
- memory.js: voice_history MAX 30, photo_history MAX 20, notes_history MAX 500
- system-core.js: SAVE_NOTE → call saveReflection() for type=reflection
- offline-ai.js: функции проверены (EVENT_WEIGHTS для спорт/кофе разные)

### TASK 123 — Smart Time-Aware Patterns
- shouldUseTimeDimension(): решает использовать time bucket или нет
- Критерии: >= 2 временных периода, count >= 2 в каждом, avg difference >= 15
- Single events: использует time bucket только если decision = true (coffee_morning vs coffee_evening)
- Combos: НЕ используют time buckets (events joined with +)
- Debug logging: [TIME DIMENSION CHECK], [TIME PATTERN]

### TASK 122-A — Time-Aware Patterns + {label} Fix
- getTimeBucket() в home.js: morning/day/evening/night
- timeBucket сохраняется в mood_history
- analyzeEventImpact использует time bucket в ключе (coffee_morning vs coffee_evening)
- buildPatternInsight добавляет time в params
- i18n: time_morning, time_day, time_evening, time_night для 4 языков
- pattern_positive_time, pattern_combo_positive_time
- FIX {label} bug: проверка label перед рендером, скрытие паттерна если label не найден

### TASK 122 — Reflection UX + History Button
- confirmBtn disabled when empty (text or events)
- add openHistoryBtn to open history screen
- remove MOOD_SUBMIT from confirmBtn (only save reflection text)
- mood stored with reflection for history display

---

## COMPLETED TASKS

### TASK 121.1 — Stabilization Patch
- consistency filter для паттернов (count >= 3, score >= 5)
- скрытие слабых паттернов (null → UI hide)
- приоритет событий над текстом
- instant feedback "Сохранено"
- лимит истории рефлексий (100 записей)

### TASK 123-LITE — Unified Logic
- mergeMoodAndReflections: AI now sees mood + text together (within 2h window)
- analyzeEventImpact: reflection text affects insight (negative words → -5 mood penalty)
- Balance cleanup (from 122-B)

### TASK 122-A — Time-Aware Patterns + {label} Fix

### TASK 122 — Reflection UX + History Button

### TASK 122-B — Fix Balance

### TASK 121 — UX & Pattern Fix
- undefined в history → fallback значения
- паттерны → ограничены 30 записями, max 5 паттернов
- decay по времени (вес 0.3-1.0)
- рефлексия → добавлен feedback (avatar)
- SESSION_META → fallback для label/icon

### TASK 120 — Home UX + Reflection Model
- Единая кнопка confirmBtn вместо analyzeNoteBtn
- textarea#reflectionInput (заменяет dailyNote)
- confirmBtn.onclick: SAVE_REFLECTION + GENERATE_INSIGHT
- memory.js: saveReflection(), getReflections()
- system-core.js: case 'SAVE_REFLECTION'
- i18n: reflection_placeholder, reflection_stress, reflection_positive, reflection_neutral
- analyzeReflection() экспортирована для истории
- history.js: reflections в buildTimeline(), renderCard(), renderDetail(), deleteItem()

### TASK 119 — Split Reflection AI from Pattern AI
- generateInsight маршрутизирует по type
- generateReflectionInsight: анализирует текст пользователя
- generatePatternInsight: оригинальная логика паттернов
- i18n: reflection_tired, reflection_positive, reflection_stress, reflection_negative, reflection_generic

### Z3-FIX — Reflection Response Override
- Убран data-i18n с aiResponse
- Убран guard-блок и z-index:10000

### Z3-FIX-2 — Photo Menu Fix
- padding-bottom: calc(80px + env(safe-area-inset-bottom))
- Добавлен onExit() в history.js
- photoMenuOverlay → closeAllOverlays()

### DAY-POPUP — Overlay Cleanup
- dayPopup и dayPopupOverlay → closeAllOverlays()

---

## KNOWN ISSUES
- voice иногда нестабилен
- premium UI требует финальной синхронизации
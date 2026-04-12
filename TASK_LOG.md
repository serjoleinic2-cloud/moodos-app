# TASK LOG — Neyra App

## ACTIVE TASKS

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
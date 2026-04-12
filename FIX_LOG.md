# FIX LOG — Neyra App

## TASK 121 — UX & Pattern Fix

### FIXED
- undefined в history → fallback значения
- паттерны → ограничены 30 записями, max 5 паттернов
- добавлен decay по времени (вес 0.3-1.0)
- рефлексия → добавлен feedback (avatar)
- SESSION_META → fallback для label/icon

### CHANGED FILES
- app.js — reflection feedback
- history.js — undefined fixes, fallback values
- offline-ai.js — pattern decay, time weight, limit 5
- i18n/ru.js, en.js, uk.js, es.js — reflection_saved

### RESULT
- UI чистый (нет undefined)
- инсайты актуальны (последние 30 дней, 7 дней decay)
- UX понятный (feedback на сохранение рефлексии)

---

## TASK 121.1 — Stabilization Patch

### IMPROVEMENTS
- добавлен consistency filter для паттернов (count >= 3, score >= 5)
- скрытие слабых паттернов (null → UI hide)
- добавлен приоритет событий над текстом
- улучшен UX рефлексии (instant feedback "Сохранено")
- добавлен лимит истории рефлексий (100 записей)

### CHANGED FILES
- offline-ai.js — findBestPatterns: count >= 3, score >= 5
- offline-ai.js — generateInsight: events priority over text
- memory.js — MAX_REFLECTIONS = 100
- app.js — instant feedback "Сохранено"
- i18n — reflection_saved_short

---

## KNOWN ISSUES
- voice иногда нестабилен
- premium UI требует финальной синхронизации
BRAIN V2 (готовый текст)
md# PROJECT BRAIN v2 — NEYRA SYSTEM CORE

## 1. CORE PURPOSE

Neyra — local-first wellness приложение для отслеживания настроения и эмоционального состояния.
Основная ценность: AI-анализ текста, практики (медитация, дыхание, фокус), инсайты на основе истории.
Всё работает офлайн. Данные хранятся локально. Облако — опциональный бэкап.

---

## 2. SYSTEM PRINCIPLES

1. AppRuntime — единственный источник UI-состояния
2. AudioController — единственный источник аудио-состояния
3. UI не содержит бизнес-логику и не управляет аудио напрямую
4. Каждый экран обязан реализовать onEnter() и onExit()
5. Premium-контент не загружается и не отображается без активного entitlement
6. Подписки (subscribe) отменяются в onExit() — утечки недопустимы
7. Исправление бага приоритетнее любой новой фичи

---

## 3. SYSTEM MODEL

### Сущности

| Сущность | Хранилище | Владелец |
|---|---|---|
| Mood history | localStorage | memory.js |
| Notes history | localStorage | memory.js |
| Session history | localStorage | memory.js |
| User profile + premium | localStorage | user-profile.js |
| Custom audio tracks (meta) | localStorage | meditation.js |
| Custom audio tracks (data) | IndexedDB | meditation.js |
| UI state | AppRuntime (memory) | appRuntime.js |
| Audio state | AudioController (memory) | audioController.js |

### Слои
L1 CORE        appRuntime.js, audioController.js
L2 AI          offline-ai.js, avatar-brain.js, voice.js
L3 UI          screens/.js, breathing.js, mind-dump.js, visual-focus.js, tap-calm.js
L4 SERVICES    services/.js
SYSTEM         navigation.js, state.js, system-core.js, i18n.js

### Поток данных
UI (onEnter) → AppRuntime.getState()
UI action → SystemCore.dispatch() → Services → Memory.save()
Audio action → AudioController → subscribe callback → UI update

---

## 4. STATE RULES

- AppRuntime.setState() — единственный способ обновить UI-состояние модуля
- AppRuntime.subscribe() возвращает функцию отписки — обязательно вызывать в onExit()
- DOM не является источником состояния
- Состояние не дублируется между модулями
- localStorage читается при старте, далее работа идёт через сервисы

### Где может ломаться консистентность

- Premium статус в profile vs реальный entitlement — проверять через isPremium(), не напрямую через profile.isPremium
- Кастомные треки в IndexedDB vs метаданные в localStorage — источник истины: localStorage (med_custom_tracks)

---

## 5. ACCESS / ENTITLEMENT MODEL

### Статусы premium

| Статус | Условие | isPremium() |
|---|---|---|
| free | нет premium | false |
| trial | premiumTrial.active && не истёк 7 дней | true |
| premium | isPremium && premiumExpiresAt не истёк | true |
| paid | premium_type === "paid" | true |
| expired | premium && premiumExpiresAt истёк | false |

### Что открывает premium

- Кастомные аудио-треки в медитации (до 5 штук)
- Премиум темы оформления
- Расширенная аналитика
- Google Drive бэкап

### Правила entitlement

- isPremium() вызывается при каждом рендере premium-контента
- При деактивации premium (deactivateExpiredPremium):
  - profile.isPremium = false
  - med_custom_tracks удаляется из localStorage
  - IndexedDB не очищается (данные сохраняются для восстановления при реактивации)
- Кастомные треки не загружаются в плеер если isPremium() === false

### ⚠️ Известная проблема (зафиксирована)

getPremiumInfo() вычисляет isExpired корректно, но isPremium в возвращаемом объекте не учитывал isExpired для статуса "premium". Исправлено в TASK-002.

---

## 6. WHAT IS NOT ALLOWED

- UI не вызывает AudioController напрямую — только через audioController.js API
- UI не вызывает engines (pattern-engine, insight-engine, resilience-engine) напрямую — только через SystemCore
- Хранить premium-контент в активном состоянии после истечения entitlement
- Дублировать состояние между модулями
- Использовать DOM как источник состояния
- Оставлять активные подписки после onExit()
- Вносить изменения в архитектуру без обновления PROJECT_BRAIN.md

TASK FOR OPENCODE
md# TASK FOR OPENCODE — BRAIN-001

## ДЕЙСТВИЕ
Полностью заменить содержимое файла PROJECT_BRAIN.md на Brain v2.

## ФАЙЛ
www/../PROJECT_BRAIN.md (корень проекта)

## ЧТО ДЕЛАТЬ
1. Открыть PROJECT_BRAIN.md
2. Удалить всё текущее содержимое
3. Вставить текст Brain v2 (см. выше полностью)

## ЧТО НЕ ДЕЛАТЬ
- Не добавлять новые разделы
- Не сохранять блоки из старого PROJECT_BRAIN.md
- Не изменять формулировки

## ПРОВЕРКА ПОСЛЕ
- Файл содержит ровно 6 разделов
- Нет упоминания TGP, DEV LOOP PROTOCOL в новом тексте
- Раздел 5 содержит таблицу статусов premium
- Раздел 6 содержит список запретов

## ЗАТРОНУТЫЕ ФАЙЛЫ
- PROJECT_BRAIN.md — полная замена содержимого
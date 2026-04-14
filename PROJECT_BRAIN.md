# PROJECT BRAIN v2 — NEYRA SYSTEM CORE

---

## CORE PURPOSE

Neyra — local-first wellness приложение для отслеживания настроения.
Основная ценность: AI-анализ текста, практики (медитация, дыхание, фокус),
инсайты на основе личной истории. Всё работает офлайн.
Данные хранятся локально. Облако — опциональный бэкап.

---

## SYSTEM PRINCIPLES

1. AppRuntime — единственный источник UI-состояния
2. AudioController — единственный источник аудио-состояния
3. UI не содержит бизнес-логику и не управляет аудио напрямую
4. Каждый экран обязан реализовать onEnter() и onExit()
5. Подписки отменяются в onExit() — утечки недопустимы
6. Premium-контент не загружается без активного entitlement
7. Любое состояние валидируется при изменении entitlement

---

## SYSTEM MODEL

### Сущности и связи
User
├── имеет Entitlement (free / trial / premium / paid / expired)
├── создаёт Mood (value, timestamp)
├── создаёт Session (type, moodBefore, moodAfter, result, duration)
└── владеет Track[] (builtin + custom, если Entitlement активен)
Track
├── builtin: true  → всегда доступен
└── builtin: false → доступен только при isPremium() === true
Queue (AudioController, in-memory)
├── содержит активный Track
├── формируется в meditation.js при onEnter()
└── очищается при onExit() через destroy()
Session
└── хранит результат практики (positive / negative)
и используется engines для аналитики

### Хранилища

| Сущность | Хранилище | Владелец |
|---|---|---|
| Mood history | localStorage | memory.js |
| Notes history | localStorage | memory.js |
| Session history | localStorage | memory.js |
| User profile + Entitlement | localStorage | user-profile.js |
| Track metadata (custom) | localStorage `med_custom_tracks` | meditation.js |
| Track data (custom) | IndexedDB `meditationDB` | meditation.js |
| UI state | AppRuntime (in-memory) | appRuntime.js |
| Audio / Queue state | AudioController (in-memory) | audioController.js |

### Слои
L1 CORE      appRuntime.js, audioController.js
L2 AI        offline-ai.js, avatar-brain.js, voice.js
L3 UI        screens/.js, breathing.js, mind-dump.js,
             visual-focus.js, tap-calm.js
L4 SERVICES  services/.js
SYSTEM       navigation.js, state.js, system-core.js, i18n.js

---

## STATE RULES

- AppRuntime.setState() — единственный способ обновить состояние модуля
- AppRuntime.subscribe() возвращает функцию отписки — вызывать в onExit()
- DOM не является источником состояния
- Состояние не дублируется между модулями
- localStorage читается при старте, далее работа через сервисы

### Консистентность

- Premium статус: читать через isPremium(), не через profile.isPremium напрямую
- Track metadata (localStorage) и Track data (IndexedDB) могут расходиться
  если IndexedDB запись удалена — трек пропускается при loadCustomTracks()

---

## ENTITLEMENT MODEL

### Статусы

| Статус | Условие | isPremium() |
|---|---|---|
| free | нет premium | false |
| trial | premiumTrial.active && < 7 дней | true |
| premium | isPremium && premiumExpiresAt не истёк | true |
| paid | premium_type === "paid" | true |
| expired | premium && premiumExpiresAt истёк | **false** |

### Что открывает активный entitlement

- Кастомные аудио-треки в медитации (до 5 штук)
- Премиум темы оформления
- Расширенная аналитика
- Firebase Cloud бэкап

### При истечении entitlement (deactivateExpiredPremium)

1. profile.isPremium = false → сохранить
2. med_custom_tracks → удалить из localStorage
3. IndexedDB не очищается (данные сохраняются для восстановления)
4. При следующем onEnter() meditation — треки не загружаются (isPremium() === false)
5. Queue очищается через destroy() в onExit()

### ⚠️ Зафиксированный баг (исправлен в TASK-002)

isPremium() возвращал true для статуса "premium" с истёкшим premiumExpiresAt.
Причина: isExpired не учитывался в расчёте поля isPremium внутри getPremiumInfo().

---

## WHAT IS NOT ALLOWED

- UI не вызывает AudioController напрямую
- UI не вызывает engines (pattern, insight, resilience) напрямую — только через SystemCore
- Хранить premium-контент в активном состоянии после истечения entitlement
- Загружать кастомные треки в Queue без проверки isPremium()
- Дублировать состояние между модулями
- Использовать DOM как источник состояния
- Оставлять активные подписки после onExit()
- Изменять архитектуру без обновления PROJECT_BRAIN.md


## LIFECYCLE GUARANTEE

Каждый экран обязан:

- полностью инициализироваться в onEnter()
- полностью очищаться в onExit()
- не сохранять ссылки на DOM или listeners между входами

Нарушение этого правила приводит к деградации системы

---

## BILLING SYSTEM

### Google Play Integration

- Используется `cordova-plugin-purchase` (window.store)
- Продукты: `premium_monthly`, `premium_yearly` (PAID_SUBSCRIPTION)
- Подписки: `approved`, `owned`, `cancelled`, `expired`

### Priority в isPremium()

1. `window._billingPremium` — флаг из billing проверки
2. fallback → localStorage профиль (для trial)

### Events

- При APPROVED → `activatePremiumPaid()`
- При CANCELLED → `deactivateExpiredPremium()` + `reconcileSystemState()`
- При EXPIRED → `deactivateExpiredPremium()` + `reconcileSystemState()`
- При resume (visibilitychange) → `refreshBilling()`

### ⚠️ Security Note

Нет серверной валидации purchase token. Это заглушка для MVP.

---

## BACKUP SYSTEM

### Free vs Premium

| Параметр | FREE | PREMIUM |
|----------|------|---------|
| Backup хранилище | 1 | 30 |
| Автобэкап | ❌ | ✅ (24h interval) |
| Объём данных | 7 дней | вся история |

### Что сохраняется

- mood_history (фильтр по 7 дням для FREE)
- notes_history (фильтр по 7 дням для FREE)
- session_history (фильтр по 7 дням для FREE)
- user_profile

### Что НЕ сохраняется

- Custom audio tracks (IndexedDB)
- Данные старше 7 дней для FREE

### Backup metadata (v3)

```js
{
  version: 3,
  backupType: "free" | "premium",
  backupRange: "7d" | "all",
  moodCount, notesCount, sessionCount,
  mood_history, notes_history, session_history,
  user_profile
}
```

---

## CHECKPOINT SYSTEM

### Цель

Восстановление состояния после краша/закрытия приложения.

### CheckpointManager API

```js
CheckpointManager.saveCheckpoint(data)     // Сохранить состояние
CheckpointManager.restoreCheckpoint()     // Восстановить
CheckpointManager.clearCheckpoint()     // Очистить
CheckpointManager.restoreAppState()     // Восстановить AppRuntime state
```

### Что сохраняется

- Текущий экран
- AppRuntime state (минимально)
- Profile (ключевые поля)
- Timestamp (для age check)

### Когда сохраняется

- При onExit() экрана → `saveCheckpointOnExit(screen, module)`
- При visibilitychange (уход в фон)
- При важных действиях

### Восстановление

При старте приложения:
1. `initCheckpointRecovery()` → восстанавливает AppRuntime state
2. `reconcileSystemState()` → синхронизирует entitlement
3. Старый checkpoint очищается после успешного восстановления

### Ограничения

- Максимум 24 часа (старые checkpoint удаляются)
- Version mismatch → checkpoint очищается

---

## SYSTEM STATE GOVERNANCE

### Source of Truth Hierarchy (высший → низший)

1. **billing-service** — авторитетный источник для premium
2. **checkpoint** — транзиентное состояние
3. **localStorage** — персистентное состояние пользователя
4. **AppRuntime** — только UI cache

### Offline Rules

- **billing unavailable** → last verified state wins
- **backup mismatch** → fallback to most recent valid backup
- **reconcile conflict** → billing always wins

### Audit Events

```js
PREMIUM_GRANTED      // premium активирован
PREMIUM_REVOKED      // premium деактивирован
BACKUP_RESTORE       // восстановление из backup
STATE_CONFLICT_RESOLVED // конфликт состояния разрешён
RECONCILE_STARTED    // начало reconciliation
RECONCILE_COMPLETED  // завершение reconciliation
BILLING_SYNC         // синхронизация с billing
MIGRATION_APPLIED    // применена миграция
```

### Migration Registry

Версии backup:
- V1: базовый backup
- V2: добавлены metadata (type, range, counts)
- V3: добавлен checksum

### Core Modules (TASK 78: Simplified)

- `audit-logger.js` — только essential events
- `state-governance.js` — billing абсолютный авторитет
- `migration-registry.js` — versioned migrations
- `state-execution-engine.js` — упрощённый pipeline
- `event-queue.js` — гарантированный drain

---

## TASK 78: SYSTEM STABILIZATION

### GOLDEN RULE
**BILLING ALWAYS WINS** — без исключений

### Simplifications Applied:
1. Убраны verbose логи
2. Упрощён audit до essentials
3. Execution engine: EVENT → VALIDATE → GOVERNANCE → COMMIT
4. Queue всегда drain до EMPTY
5. Billing — единственный источник истины для premium

### Audit Events (только essential):
- PREMIUM_GRANTED
- PREMIUM_REVOKED
- FINAL_COMMIT
- RECOVERY_COMPLETED
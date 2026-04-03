# AUDIT_PREMIUM_BACKUP.md
## Neyra Premium, Billing & Backup System Audit

**Дата аудита:** 2026-04-03
**Аудитор:** System Auditor
**Версия:** 1.0

---

# 1. КАК РАБОТАЕТ PREMIUM (ФАКТ)

## 1.1 Источник истины

**Источник:** `localStorage['user_profile']` (JSON)

**Иерархия проверки:**
```
isPremium() → getPremiumInfo() → getPremiumStatus() → profile
```

**Поля в profile:**
- `profile.isPremium` (boolean) — legacy флаг
- `profile.premium_type` ('paid') — для пожизненного premium
- `profile.premiumTrial` ({ active, startDate }) — trial 7 дней
- `profile.premiumPlan` ('monthly'|'yearly') — план подписки
- `profile.premiumExpiresAt` (timestamp) — срок истечения
- `profile.premium_since` (timestamp) — дата активации

**Статусы:**
| Статус | Условие | isPremium() |
|--------|----------|-------------|
| free | нет premium | false |
| trial | premiumTrial.active && < 7 дней | true |
| premium | isPremium && expiresAt > now | true |
| paid | premium_type === "paid" | true |
| expired | premium && expiresAt <= now | false |

## 1.2 Поток активации Premium

### Вариант A: Покупка через Google Play
```
billing-service.js:
  store.order("premium_monthly/yearly")
  → store.when().approved()
  → onPurchaseApproved()
  → activatePremiumPaid()
  → profile.premium = true
  → profile.premium_type = "paid"
  → window.systemState.premium = true
  → dispatchEvent("premiumChanged")
```

### Вариант B: Trial
```
settings.js → startTrialBtn.click()
  → activateTrial()
  → profile.premiumTrial = { active: true, startDate: ... }
  → dispatchEvent("premiumChanged")
```

### Вариант C: DEV (через консоль/dev buttons)
```
activatePremium(plan)
  → profile.isPremium = true
  → profile.premiumExpiresAt = Date.now() + duration
  → dispatchEvent("premiumChanged")
```

## 1.3 Поток деактивации

**Триггеры:**
1. `checkPremiumExpiry()` → вызывается в `startApp()` при загрузке
2. `reconcileSystemState()` → при visibilitychange, premiumChanged
3. `deactivateExpiredPremium()`:
   - `profile.isPremium = false`
   - `profile.premiumExpiresAt = null`
   - `localStorage.removeItem('med_custom_tracks')` — удаляет треки
   - `resetThemeToDefault()` — сбрасывает тему на default
   - `dispatchEvent('premiumChanged')`

## 1.4 Где используется isPremium()

| Файл | Использование |
|------|--------------|
| meditation.js | custom tracks загрузка, добавление, удаление |
| settings.js | premium темы, trial кнопка |
| insight.js | показ premium триггера |
| year-comparison.js | полный функционал |
| drive-backup.js | backup лимит (1 vs 30), автобэкап |
| daily-snapshots.js | расширенные снапшоты |
| report.js | период > 7 дней требует premium |

---

# 2. КАК РАБОТАЕТ BILLING (ФАКТ)

## 2.1 Интеграция с Google Play

**Используется:** `cordova-plugin-purchase` (window.store)

**Регистрация продуктов:**
```javascript
store.register([
  { id: "premium_monthly", type: store.PAID_SUBSCRIPTION },
  { id: "premium_yearly", type: store.PAID_SUBSCRIPTION }
]);
```

**Подписки на события:**
- `when("premium_*").approved()` → `activatePremiumPaid()`
- `when("premium_*").owned()` → `activatePremiumPaid()`
- `store.error()` → логирование
- `store.refresh()` → проверка существующих покупок

## 2.2 Валидация

**⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА:**

Отсутствует верификация purchase token на сервере!

```javascript
// Фактический код:
function onPurchaseApproved(order) {
  order.finish();  // Просто завершаем транзакцию
  activatePremiumPaid();  // Активируем без валидации
}
```

**Риски:**
- Нет проверки signature на сервере
- Нет валидации purchaseToken
- Любой может подменить localStorage и получить premium
- Google Play может отозвать подписку — приложение не узнает

## 2.3 Связь billing → entitlement

```
store.order() → approved → activatePremiumPaid()
                              ↓
                    profile.premium_type = "paid"
                              ↓
                    getPremiumStatus() → "paid"
                              ↓
                    isPremium() → true
```

**Рассинхрон:**
- После покупки — данные в localStorage
- При revoke подписки в Google Play — приложение не узнает до следующего `store.refresh()`
- `store.refresh()` вызывается только при инициализации и restorePurchases()

---

# 3. КАК РАБОТАЕТ BACKUP (ФАКТ)

## 3.1 Что сохраняется

```javascript
buildBackupData():
  - mood_history (все или последние 500)
  - notes_history (все или последние 500)
  - session_history (все или последние 500)
  - user_profile (целиком)
```

**НЕ сохраняется:**
- Custom audio tracks (IndexedDB)
- premium_status (только в user_profile)

## 3.2 Где хранится

**Хранение:** `localStorage['moodos_backups']` (массив backup entries)

**Структура:**
```javascript
{
  backups: [
    {
      id: "bkp_xxx",
      date: timestamp,
      data: {
        version: 2,
        isLimitedBackup: true/false,
        mood_history: [...],
        notes_history: [...],
        session_history: [...],
        user_profile: {...}
      }
    }
  ]
}
```

## 3.3 Когда происходит backup

| Тип | Условие |
|------|---------|
| Ручной | Кнопка "Создать backup" |
| Автоматический (PREMIUM ONLY) | 24 часа с момента последнего, если есть изменения |

## 3.4 Связь с Premium

| Параметр | FREE | PREMIUM |
|----------|------|---------|
| Лимит backup хранилища | 1 | 30 |
| Автобэкап | ❌ Недоступен | ✅ Каждые 24 часа |
| Объём данных | Последние 500 записей | Вся история |

**⚠️ РАСХОЖДЕНИЕ С ТЗ:**

Ожидалось:
- FREE → последние 7 дней
- PREMIUM → вся история

Фактически:
- FREE → последние 500 записей (не 7 дней!)
- PREMIUM → вся история

## 3.5 Восстановление

`restoreFromBackup(file)`:
- Парсит JSON файл
- Мержит по timestamp (deduplication)
- Сохраняет все типы данных
- Перезаписывает user_profile

**Конфликты:** Не обрабатываются, просто добавляются все записи.

---

# 4. РАСХОЖДЕНИЯ С PROJECT_BRAIN.md

## ❌ НЕ СОВПАДАЕТ

1. **Entitlement Model в Brain неполный:**
   - Brain не упоминает `premium_type === "paid"`
   - Brain не упоминает trial механизм
   - Brain не описывает reconcileSystemState

2. **Backup в Brain:**
   - Brain не описан механизм backup
   - Нет упоминания FREE = 1 backup, PREMIUM = 30

3. **Auto-backup:**
   - Brain не описывает автобэкап для premium

## ⚠️ ЧАСТИЧНО

1. **Custom tracks:**
   - Brain: "при реактивации premium вернутся" — ДА, метаданные в localStorage, данные в IndexedDB
   - Brain: "IndexedDB не очищается" — ДА, но нет функции восстановления

2. **Premium темы:**
   - Brain: сброс темы при expiry — ДА, реализовано в deactivateExpiredPremium()

## ✅ СОВПАДАЕТ

1. **Источник истины:** localStorage
2. **isPremium() как единая точка проверки**
3. **dispatchEvent('premiumChanged')** для уведомления UI
4. **deactivateExpiredPremium()** при истечении

---

# 5. РИСКИ

## 🔴 CRITICAL

### 5.1 Billing без серверной валидации
- Нет верификации purchase token
- Легко обойти через подмену localStorage
- При refund деньги не возвращаются автоматически

**Рекомендация:** Добавить backend для валидации покупок

### 5.2 Backup 500 записей вместо 7 дней
- FREE пользователь видит лимит 500 записей
- Если записей больше 500 в день — данные теряются

**Рекомендация:** Изменить на 7 дней или увеличить лимит

## 🟡 MEDIUM

### 5.3 Custom tracks не восстанавливаются
- При restore из backup восстанавливаются только metadata
- Audio файлы в IndexedDB не экспортируются

**Рекомендация:** Добавить export/import для IndexedDB или отказаться от custom tracks

### 5.4 Revoke подписки не отслеживается
- При отмене подписки в Google Play приложение узнает только при refresh
- Refresh вызывается редко

**Рекомендация:** Вызывать store.refresh() чаще или слушать store.when().cancelled()

## 🟢 LOW

### 5.5 Backup merge не учитывает конфликты
- Если backup старше локальных данных — записи дублируются
- Нет приоритета по дате

---

# 6. ЧТО НЕ РЕАЛИЗОВАНО ИЗ ИДЕЙ

| Идея | Статус |
|-------|--------|
| FREE = 7 дней backup | ❌ Реализовано как 500 записей |
| Custom tracks export/import | ❌ Отсутствует |
| Серверная валидация billing | ❌ Отсутствует |
| Google Drive sync | ❌ Только локальный backup |
| Restore preview (что изменится) | ❌ Отсутствует |

---

# 7. РЕКОМЕНДАЦИИ

## Без кода (только описание)

1. **Billing Security:**
   - Добавить backend endpoint для валидации Google Play receipts
   - Хранить purchaseToken и периодически сверять с Google Play API
   - Слушать события отмены подписки

2. **Backup Logic:**
   - Изменить FREE лимит с 500 записей на 7 дней
   - Добавить preview перед restore (показать что изменится)
   - Рассмотреть Google Drive integration вместо localStorage

3. **Custom Tracks:**
   - Либо добавить full export/import, либо убрать фичу
   - Документировать ограничение в UI

4. **Project Brain Update:**
   - Добавить секцию про billing
   - Добавить секцию про backup
   - Уточнить entitlement model

---

**Конец отчёта**

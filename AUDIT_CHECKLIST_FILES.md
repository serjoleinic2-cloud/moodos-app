# CHECKLIST: Файлы для Security & Integrity Audit

Я готов провести ПОЛНЫЙ аудит перед публикацией в Google Play.

Нужны следующие файлы:

---

## 🔴 SECTION 1: BILLING SECURITY (CRITICAL)

```
www/js/services/billing-service.js
www/js/services/user-profile.js (функция isPremium, setBillingPremium)
www/js/core/state-execution-engine.js
www/js/core/event-queue.js
```

**Что проверю:**
- Можно ли включить premium без Google Play
- Защита от прямого вызова setBillingPremium(true)
- Защита от изменения window._billingPremium
- Reinstall сценарий
- Есть ли реальная verifyPurchaseWithServer()

---

## 🔴 SECTION 2: TRIAL / LEGACY CLEANUP

```
www/js/services/user-profile.js (find activateTrial)
www/js/screens/premium.js
www/js/screens/paywall.js
www/js/app.js
```

**Что проверю:**
- activateTrial функция
- trial flags
- trial UI кнопки
- fake premium activation
- Тестовые бэкдоры

---

## 🔴 SECTION 3: EVENT QUEUE SAFETY

```
www/js/core/event-queue.js
www/js/core/state-execution-engine.js
www/js/services/billing-service.js
```

**Что проверю:**
- Infinite loop риск
- Event duplication
- maxAttempts логика
- Watchdog гонки

---

## 🔴 SECTION 4: STATE INTEGRITY

```
www/js/state.js
www/js/core/appRuntime.js
www/js/services/user-profile.js
www/js/app.js
```

**Что проверю:**
- Обходы execution engine
- Прямые изменения state
- Рассинхронизация:
  * window._billingPremium vs systemState vs UI

---

## 🔴 SECTION 5: BACKUP SECURITY

```
www/js/services/drive-backup.js
www/js/core/migration-registry.js
```

**Что проверу:**
- Защита от вредного JSON
- Prototype pollution
- XSS через backup
- Corrupted структуры

---

## 🔴 SECTION 6: UI CONSISTENCY

```
www/js/screens/insight.js
www/js/screens/report.js
www/js/screens/premium.js
www/js/screens/settings.js
www/js/navigation.js
```

**Что проверю:**
- Ложные кнопки
- Инсайт исчезает мгновенно
- Противоречия в UI

---

## 🔴 SECTION 7: PERFORMANCE / STABILITY

```
www/js/screens/*.js (все экраны)
www/js/core/appRuntime.js
```

**Что проверю:**
- Утечки подписок
- Лишние listeners
- Повторные подписки

---

## 📊 ДОПОЛНИТЕЛЬНО (ИЗ ЗАДАНИЯ 1)

```
www/js/i18n/en.js
www/js/i18n/es.js
www/js/i18n/ru.js
www/js/i18n/uk.js
www/js/services/analytics.js
www/js/screens/insight.js (дополнительно для расчётов)
```

---

## 🎯 ИТОГО НУЖНО:

**Минимум (основной фокус):**
- billing-service.js
- user-profile.js
- state-execution-engine.js
- event-queue.js
- drive-backup.js
- app.js

**Расширенно (для полного аудита):**
- ВСЕ файлы из /screens/
- ВСЕ файлы из /services/
- ВСЕ файлы из /core/
- ВСЕ файлы из /i18n/

---

## 📝 РЕКОМЕНДАЦИЯ

**Вариант 1 (БЫСТРО):**
Дай мне ссылки на файлы из раздела "Минимум" - проведу критический аудит за 1-2 часа

**Вариант 2 (ПОЛНЫЙ):**
Дай мне ВСЕ JS файлы - проведу ПОЛНЫЙ аудит (6-8 часов) с:
- Security проверкой
- Logic проверкой
- UI consistency проверкой
- Наследие (legacy) cleanup

---

## 🚀 НАЧИНАЯ С:

Дай мне ссылки вроде:
```
https://raw.githubusercontent.com/serjoleinic2-cloud/moodos-app/refs/heads/main/www/js/services/billing-service.js
https://raw.githubusercontent.com/serjoleinic2-cloud/moodos-app/refs/heads/main/www/js/services/user-profile.js
...
```

**Или скажи путь на диске** и я создам скрипт автоматической загрузки всех файлов.

Готов! 🔍

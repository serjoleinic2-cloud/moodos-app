# MoodOS — Project Overview

## Описание проекта
MoodOS — мобильное приложение для эмоционального трекинга и самопознания. Capacitor-based (Android/iOS), Vanilla JS (ES modules).

---

## Структура проекта

```
moodos-app/
├── www/                          # Исходный код приложения
│   ├── index.html               # Главная HTML страница
│   ├── manifest.json            # Web App Manifest
│   ├── sw.js                    # Service Worker
│   │
│   ├── css/
│   │   ├── style.css           # Основные стили + 5 тем (default/purple-blue/purple-pink/ocean-blue/warm-sunset)
│   │   └── avatar.css          # Стили аватара-компаньона
│   │
│   └── js/
│       ├── app.js               # Точка входа, инициализация
│       ├── state.js             # Глобальный state приложения
│       ├── navigation.js        # Навигация, экраны, languageChanged/premiumChanged listeners
│       ├── ui-controller.js     # Управление UI
│       ├── avatar.js           # Аватар-компаньон
│       ├── system-core.js       # Центральный оркестратор (dispatch, events)
│       ├── onboarding.js        # Онбординг
│       ├── premium-modal.js     # Модальное окно Premium
│       ├── monthly-check.js     # Месячные проверки
│       │
│       ├── i18n.js              # Система интернационализации (t, tSafe, getLang, setLang)
│       └── i18n/
│           ├── ru.js            # Русский
│           ├── en.js            # Английский
│           ├── es.js            # Испанский
│           └── uk.js            # Украинский
│       │
│       ├── ai/
│       │   ├── offline-ai.js         # Офлайн AI анализ текста
│       │   ├── voice-analysis.js       # Анализ голоса
│       │   ├── voice.js                # Запись голоса
│       │   └── avatar-brain.js        # Мозг аватара
│       │
│       ├── screens/             # Экраны приложения
│       │   ├── home.js         # Главный (слайдер настроения, locale-aware)
│       │   ├── insight.js      # Инсайты (period filter, Chart.js fallback, safe null guards)
│       │   ├── report.js       # Отчёты, календарь (resolveTimestamp, locale-aware dates)
│       │   ├── stability.js    # Анализ устойчивости
│       │   ├── history.js      # История записей
│       │   ├── settings.js     # Настройки (backup UI, Premium темы)
│       │   ├── premium.js      # Premium подписка
│       │   ├── paywall.js      # Ограничения Free
│       │   ├── tools.js        # Меню практик
│       │   ├── breathing.js    # Дыхание
│       │   ├── meditation.js   # Медитация
│       │   ├── visual-focus.js # Зрительный якорь
│       │   ├── mind-dump.js   # Выгрузка мыслей
│       │   ├── tap-calm.js     # Тактильная разрядка
│       │   ├── support-texts.js # Тексты поддержки
│       │   ├── voice.js       # Голосовые заметки
│       │   └── pdf-report.js  # PDF отчёты
│       │
│       └── services/           # Бизнес-логика
│           ├── memory.js               # localStorage (try/catch, resolveTimestamp, KNOWN_SAVE_FIELDS)
│           ├── analytics.js           # Базовые метрики
│           ├── session-analytics.js   # Аналитика практик (TIME_HORIZONS)
│           ├── insight-engine.js      # Генерация инсайтов
│           ├── pattern-engine.js      # Поиск паттернов
│           ├── resilience-engine.js    # Устойчивость
│           ├── state-engine.js        # Определение состояния
│           ├── weekly-analytics.js    # Недельная аналитика
│           ├── year-comparison.js     # Сравнение с прошлым годом
│           ├── daily-snapshots.js     # Ежедневные снапшоты
│           ├── drive-backup.js        # Backup (Premium full backup, resolveTimestamp)
│           ├── user-profile.js        # Профиль (systemState sync, try/catch)
│           └── voice-service.js        # Голосовые записи
│
├── android/                     # Capacitor Android
├── capacitor.config.json
├── package.json
└── PROJECT_STRUCTURE.md        # Этот файл
```

---

## Ключевые архитектурные решения

### i18n система
```javascript
t(key)           // fallback: "" (не показывает raw key)
tSafe(key, fallback)  // безопасная версия
```
Все пользовательские строки через `t()`. Raw ключи НЕ отображаются в UI.

### Timestamp унификация
```javascript
resolveTimestamp(entry)  // time → timestamp → date, возвращает Number или null
```
Используется во всех местах где нужен timestamp записи.

### Memory Service (memory.js)
- try/catch на всех операциях чтения/записи
- KNOWN_SAVE_FIELDS включает: `mood, state, feedback, lastSupportInsight, lastInsight, insights, patterns, resilience`
- Логирование неизвестных полей (dev warning)

### User Profile (user-profile.js)
- try/catch на getProfile/saveProfile
- activateTrial() / activatePremium() синхронизируют window.systemState
- Диспатчится событие `premiumChanged` → navigation.js обновляет текущий экран

### Premium синхронизация
```javascript
// user-profile.js (единая точка)
activateTrial() {
  saveProfile(...);
  window.systemState.premium = true;
  document.dispatchEvent(new CustomEvent('premiumChanged', ...));
}

// navigation.js (глобальный listener)
document.addEventListener('premiumChanged', () => {
  if (currentScreen) loadScreen(currentScreen);
});
```

### Period Filter в Insight
```javascript
const periodDays = TIME_HORIZONS[selectedTimeRange] || 30;
const filteredHistory = history.filter(e => (e.time || 0) >= periodCutoff);
const calcHistory = filteredHistory.length >= 3 ? filteredHistory : history;
// Все метрики (stability, trend, golden, avgMood) считаются по calcHistory
```

### Backup система (drive-backup.js)
- Free: лимит 1 backup, хранится последние 500 записей
- Premium: лимит 30 backup'ов, полный бэкап (Infinity)
- mergeByTimestamp использует resolveTimestamp

---

## Цветовые темы (5 тем)

| Ключ | Описание | Доступность |
|-------|---------|-------------|
| `default` | Зелёно-бежевая | Все |
| `purple-blue` | Фиолетово-синяя | Все |
| `purple-pink` | Фиолетово-розовая | Все |
| `ocean-blue` | Океанская | Premium |
| `warm-sunset` | Тёплый закат | Premium |

---

## Premium функционал

- Автобэкап (Premium: Infinity записей, Free: 500)
- До 30 локальных backup'ов (Free: 1)
- Все 5 цветовых тем
- Дополнительные инсайты и аналитика

---

## Константы

```javascript
// services/session-analytics.js
TIME_HORIZONS = { week: 7, month: 30, quarter: 90, year: 365 }

// services/user-profile.js
FREE_BACKUP_LIMIT = 1
PREMIUM_BACKUP_LIMIT = 30

// services/drive-backup.js
LS_BACKUPS = "moodos_backups"
```

---

## Важные паттерны

### Safe null guard
```javascript
// analyzeMoodOnly может вернуть null
const analysis = await SystemCore.analyzeMoodOnly(mood);
state = analysis?.state ?? 'NEUTRAL';
```

### Duplicate event handling
```javascript
// system-core.js
if (this.processingEvents.has(event)) {
  return { duplicate: true };  // UI различает дубликат и ошибку
}

// home.js
const result = await SystemCore.dispatch('MOOD_SUBMIT', moodValue);
if (!result || result.error) return;  // silent fail для дубликатов
```

### Retry при race conditions
```javascript
// navigation.js
if (!window.systemState?.isReady) {
  setTimeout(() => loadScreen(name), 300);
  return;
}
```

### Locale-aware dates
```javascript
const lang = localStorage.getItem('app_language') || 'ru';
const localeMap = { ru: 'ru-RU', en: 'en-GB', es: 'es-ES', uk: 'uk-UA' };
date.toLocaleDateString(localeMap[lang] || 'ru-RU', {...});
```

---

## Запуск

```bash
npm install
npm run dev      # Локальная разработка
npm run build    # Сборка
npx cap sync     # Синхронизация с Android
npx cap run     # Запуск на устройстве
```

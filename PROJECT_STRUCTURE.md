# MoodOS — Project Overview

## Описание проекта
MoodOS — мобильное приложение для эмоционального трекинга и самопознания. Приложение позволяет отслеживать настроение, вести дневник, практиковать mindfulness-практики и получать персонализированные инсайты.

**Платформа:** Capacitor (Android/iOS)
**Стек:** Vanilla JS (ES modules), HTML, CSS

---

## Структура проекта

```
moodos-app/
├── www/                    # Исходный код приложения
│   ├── index.html         # Главная HTML страница
│   ├── manifest.json       # Web App Manifest
│   ├── sw.js              # Service Worker
│   │
│   ├── css/
│   │   ├── style.css      # Основные стили приложения
│   │   └── avatar.css     # Стили аватара-компаньона
│   │
│   └── js/
│       ├── app.js          # Точка входа, инициализация приложения
│       ├── app.js
│       ├── state.js        # Глобальный state приложения
│       ├── navigation.js   # Навигация между экранами
│       ├── ui-controller.js # Управление UI
│       ├── avatar.js      # Аватар-компаньон (drag, tap)
│       ├── system-core.js  # Центральный оркестратор
│       ├── onboarding.js   # Онбординг новых пользователей
│       ├── premium-modal.js # Модальное окно Premium
│       │
│       ├── i18n.js        # Система интернационализации
│       └── i18n/
│           ├── ru.js       # Русский язык
│           ├── en.js       # Английский язык
│           ├── es.js       # Испанский язык
│           └── uk.js       # Украинский язык
│       │
│       ├── ai/            # AI модули
│       │   ├── offline-ai.js     # Офлайн AI анализ текста
│       │   ├── voice-analysis.js  # Анализ голосовых записей
│       │   ├── voice.js          # Запись голоса
│       │   └── avatar-brain.js   # Мозг аватара
│       │
│       ├── screens/       # Экраны приложения
│       │   ├── home.js         # Главный экран (слайдер настроения)
│       │   ├── insight.js       # Экран инсайтов и аналитики
│       │   ├── report.js        # Отчёты и календарь настроений
│       │   ├── stability.js    # Анализ устойчивости
│       │   ├── history.js       # История записей
│       │   ├── settings.js      # Настройки приложения
│       │   ├── premium.js       # Premium подписка
│       │   ├── paywall.js       # Экран ограничений Free
│       │   ├── tools.js         # Меню практик
│       │   ├── breathing.js     # Практика дыхания
│       │   ├── meditation.js    # Медитация
│       │   ├── visual-focus.js  # Зрительный якорь
│       │   ├── mind-dump.js     # Выгрузка мыслей
│       │   ├── tap-calm.js      # Тактильная разрядка
│       │   ├── support-texts.js # Тексты поддержки
│       │   ├── voice.js        # Голосовые заметки
│       │   └── pdf-report.js   # Генерация PDF отчётов
│       │
│       └── services/      # Бизнес-логика и сервисы
│           ├── memory.js           # Управление историей (localStorage)
│           ├── analytics.js       # Базовые аналитические функции
│           ├── session-analytics.js # Аналитика практик
│           ├── insight-engine.js   # Движок инсайтов
│           ├── pattern-engine.js   # Поиск паттернов
│           ├── resilience-engine.js # Устойчивость
│           ├── state-engine.js     # Определение состояния
│           ├── weekly-analytics.js # Недельная аналитика
│           ├── year-comparison.js  # Сравнение с прошлым годом
│           ├── daily-snapshots.js # Ежедневные снапшоты
│           ├── drive-backup.js     # Система резервного копирования
│           ├── user-profile.js     # Профиль пользователя
│           └── voice-service.js    # Сервис голосовых записей
│
├── android/               # Android проект (Capacitor)
│   └── app/
│       └── src/main/assets/  # Скомпилированные assets
│
├── capacitor.config.json # Конфигурация Capacitor
└── package.json         # Зависимости npm
```

---

## Архитектура

### Модель данных (localStorage)

```javascript
// Основные коллекции
mood_history      // Записи настроения { value, time }
notes_history     // Текстовые заметки { text, timestamp }
voice_history     // Голосовые записи { audioUrl, timestamp }
session_history   // Сессии практик { type, moodBefore, moodAfter, timestamp }

// Профиль
user_profile      // { moodBaseline, premium, theme, language, ... }

// Системные данные
systemState      // { mood, isReady, premium, ... }
daily_insights    // Ежедневные инсайты
daily_snapshots  // Снапшоты состояния
moodos_backups    // Локальные backup'ы
```

### Ключевые модули

#### `system-core.js`
Центральный оркестратор, управляющий потоком данных между сервисами.

#### `state.js`
Глобальный state приложения. Содержит текущее настроение, статус premium, и другие глобальные данные.

#### `memory.js`
Абстракция над localStorage. Предоставляет функции для чтения/записи истории.

#### `services/` — Аналитические движки

| Файл | Назначение |
|------|------------|
| `analytics.js` | Базовые метрики (стабильность, тренд, золотые часы) |
| `session-analytics.js` | Анализ эффективности практик по типам |
| `insight-engine.js` | Генерация персональных инсайтов |
| `pattern-engine.js` | Поиск паттернов в данных |
| `resilience-engine.js` | Оценка эмоциональной устойчивости |
| `state-engine.js` | Определение текущего состояния (LOW/NEUTRAL/GOOD) |
| `weekly-analytics.js` | Недельная аналитика и блоки |
| `year-comparison.js` | Сравнение с аналогичным периодом прошлого года |
| `daily-snapshots.js` | Ежедневные снапшоты состояния |

#### `ai/`
- `offline-ai.js` — Офлайн анализ текста (keyword-based, 4 языка)
- `voice-analysis.js` — Анализ голосовых записей
- `avatar-brain.js` — Логика аватара-компаньона

### UI архитектура

Приложение использует **SPA подход** с экранами, переключаемыми через CSS классы `.active`.

**Навигация:** нижняя панель + hamburger меню

**Экраны:**
- `home` — Главный экран с записью настроения
- `insight` — Аналитика и инсайты
- `report` — Отчёты, календарь
- `stability` — Анализ устойчивости
- `history` — История записей
- `settings` — Настройки

---

## Цветовые темы

Поддерживаются в `style.css` через `body[data-theme="..."]`:

| Тема | Описание | Доступность |
|------|---------|-------------|
| `default` | Зелёно-бежевая | Все |
| `purple-blue` | Фиолетово-синяя | Все |
| `purple-pink` | Фиолетово-розовая | Все |
| `ocean-blue` | Океанская | Premium |
| `warm-sunset` | Тёплый закат | Premium |

---

## Premium функционал

- Автобэкап данных (24h интервал)
- До 30 локальных backup'ов
- Все цветовые темы
- Сравнение с прошлым годом
- Безлимит AI запросов
- Расширенная аналитика

---

## i18n система

```javascript
// Использование
import { t, getLang, setLang } from "./i18n.js";
t("key_name");  // Получить перевод

// Fallback: если ключ не найден, возвращает ""
// tSafe(key, fallback) — безопасная версия с fallback
```

**Поддерживаемые языки:** RU, EN, ES, UK

---

## Запуск и сборка

```bash
# Установка зависимостей
npm install

# Локальная разработка (веб-сервер)
npm run dev

# Сборка веб-приложения
npm run build

# Синхронизация с Android
npx cap sync android

# Запуск на Android устройстве/эмуляторе
npx cap run android
```

---

## Конфигурация Capacitor

```json
// capacitor.config.json
{
  "appId": "com.moodos.app",
  "appName": "MoodOS",
  "webDir": "www",
  "server": { "androidScheme": "https" },
  "plugins": {
    "Share": {},
    "Filesystem": {}
  }
}
```

---

## Важные константы

```javascript
// services/session-analytics.js
TIME_HORIZONS = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365
};

// services/user-profile.js
FREE_BACKUP_LIMIT = 1;
PREMIUM_BACKUP_LIMIT = 30;
AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// services/drive-backup.js
LS_BACKUPS = "moodos_backups";  // Ключ для хранения backup'ов
```

---

## Стандарты кода

- **ES Modules** — все файлы используют `import/export`
- **i18n** — все пользовательские строки через `t()` функцию
- **Fallback** — безопасная работа с отсутствующими переводами
- **Data normalization** —的统一 времstamp формат (`Date.now()`)
- **No raw keys** — i18n ключи никогда не отображаются в UI

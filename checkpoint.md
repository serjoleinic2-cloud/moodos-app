# MoodOS — Чекпоинт сессии (Март 2026)

## Что такое MoodOS

MoodOS — это офлайн-приложение для отслеживания настроения на Android (WebView + Capacitor).

Цель — не просто трекер настроения, а **система эмоциональной рефлексии**. Помогает пользователю понять:
- эмоциональные паттерны и циклы
- триггеры ухудшения состояния
- личные инструменты восстановления
- динамику роста за месяцы и годы

Приложение полностью офлайн — нет сервера, нет базы данных. Все данные в localStorage.

---

## Репо
https://github.com/serjoleinic2-cloud/moodos-app
Разработчик: Сергей — не программист, работает через GitHub web-интерфейс
Сборка: GitHub → Android Studio → APK на реальное Android устройство
Правило: давать ТОЛЬКО полные файлы целиком
Мелкие точечные правки (1-2 строки) — Сергей вносит сам
OpenCode — терминальный инструмент для правок файлов локально

---

## Стек
- Capacitor 8 + Android WebView
- Vanilla JS ES-модули
- localStorage (нет сервера, нет БД)
- www/ — весь фронтенд

---

## Критические правила (выстраданные)

1. `closeAllOverlays()` — только в `navigation.js`
2. `pdf-report.js` — НЕ импортировать статически в `navigation.js` и `settings.js` — только динамический `import()`
3. `state.js` — НЕТ `subscribe()` и `notify()` — удалены навсегда. Файл ЗАМОРОЖЕН — не трогать
4. `home.js` — НЕ импортирует из `app.js` (циклический импорт)
5. `render()` в `app.js` — НЕ пишет `moodSlider.value` (триггерит events на WebView)
6. `home.js` — НЕ пишет `slider.value = currentMood` в `onEnter()`
7. `session-analytics.js` — в конце файла не должно быть мусора после `}`
8. `onboarding.js` — `finish()` без `location.reload`
9. PDF-документ — всегда на русском
10. Кэш-бастинг: `app.js?v=YYYYMMDD` в `index.html` — обновлять при каждом деплое. Текущая версия: `v=20260326`
11. Онбординг при переустановке — `androidScheme: "https"` сохраняет localStorage. Для сброса: Настройки → Приложения → MoodOS → Хранилище → Удалить данные
12. Бэкап — БЕЗ `photo_history` и `voice_history` (base64 вешает stringify)
13. Любые большие HTML-блоки — НЕ использовать вложенные template literals. Использовать конкатенацию строк
14. androidScheme: "https" — localStorage переживает переустановку APK
15. `pdf-report.js` — НЕ использовать вложенные template literals в `generatePdf`. Весь HTML строить через конкатенацию строк
16. Уведомления Android — НЕ использовать `repeats:true` + `every:"week"` — не работает на Android 12+. Планировать 8 недель вперёд отдельными уведомлениями (id 9000-9099) с `exact:true`
17. Samsung Android 12+ — требует разрешения "Будильники и напоминания". Использовать `exact:true` в schedule
18. `BatteryPlugin` — отдельный файл `BatteryPlugin.java`, не вложенный класс в `MainActivity.java`
19. `MutationObserver` в `index.html` — обёрнут в debounce 300мс иначе вешает UI при открытии модалов
20. `checkAutoReminder()` — все вызовы Capacitor плагинов обёрнуты в `withTimeout(promise, 4000)` иначе вешает JS поток
21. `MainActivity.java` — НЕ добавлять `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` при старте — открывает системный экран и вешает WebView
22. ⚠️ ВАЖНО: Capacitor + Android WebView НЕ поддерживает динамический `import()` из подпапок. Все JS файлы должны лежать максимум в одном уровне вложенности от точки импорта. Практики (`breathing.js`, `meditation.js` и др.) должны быть в `www/js/screens/`, НЕ в `www/js/screens/practices/`

---

## Структура файлов (актуальная)

```
www/js/
├── app.js
├── state.js          ← ЗАМОРОЖЕН
├── navigation.js
├── onboarding.js
├── i18n.js
├── monthly-check.js
├── ui-controller.js
│
├── ai/
│   ├── voice.js
│   ├── offline-ai.js
│   └── voice-analysis.js
│
├── screens/
│   ├── home.js
│   ├── pdf-report.js
│   ├── settings.js
│   ├── insight.js
│   ├── history.js
│   ├── report.js
│   ├── stability.js
│   ├── tools.js
│   ├── voice.js
│   ├── breathing.js       ← практика, НЕ в подпапке
│   ├── meditation.js      ← практика, НЕ в подпапке
│   ├── visual-focus.js    ← практика, НЕ в подпапке
│   ├── mind-dump.js       ← практика, НЕ в подпапке
│   └── tap-calm.js        ← практика, НЕ в подпапке
│
├── services/
│   ├── memory.js
│   ├── analytics.js
│   ├── weekly-analytics.js
│   ├── session-analytics.js
│   ├── drive-backup.js
│   ├── user-profile.js
│   ├── state-engine.js
│   ├── pattern-engine.js
│   ├── resilience-engine.js
│   ├── insight-engine.js
│   └── voice-service.js
│
└── i18n/
    ├── ru.js, en.js, es.js, uk.js
```

---

## Статус фич по стратегии

| # | Фича | Статус |
|---|---|---|
| 1 | Google Drive Backup (Фаза 1 — share) | ✅ Готово |
| 1 | Google Drive Backup (Фаза 2 — OAuth) | ❌ Невозможно без сервера (нарушает политику Google Play) |
| 2 | Weekly Data Blocks | ✅ Готово |
| 3 | Social Sharing | ✅ Готово |
| 4 | Year Pattern Comparison | ✅ Готово |
| 5 | Emotional Companion (AI персонаж) | ⏳ В разработке |

---

## Текущее состояние файлов в репо

| Файл | Статус |
|---|---|
| `www/js/app.js` | ✅ Рабочий |
| `www/js/state.js` | ✅ ЗАМОРОЖЕН — без subscribe/notify |
| `www/js/navigation.js` | ✅ Пути практик на screens/ без подпапки |
| `www/js/screens/home.js` | ✅ Без slider.value |
| `www/js/screens/settings.js` | ✅ Динамический импорт pdf-report |
| `www/js/screens/history.js` | ✅ Social Sharing работает |
| `www/js/screens/pdf-report.js` | ✅ Без тестовой кнопки, withTimeout, конкатенация строк |
| `www/js/screens/insight.js` | ✅ Year Pattern Comparison добавлен |
| `www/js/screens/breathing.js` | ✅ Перемещён из подпапки practices/ |
| `www/js/screens/meditation.js` | ✅ Перемещён из подпапки practices/ |
| `www/js/screens/visual-focus.js` | ✅ Перемещён из подпапки practices/ |
| `www/js/screens/mind-dump.js` | ✅ Перемещён из подпапки practices/ |
| `www/js/screens/tap-calm.js` | ✅ Перемещён из подпапки practices/ |
| `www/js/services/memory.js` | ✅ + weekly_history функции |
| `www/js/services/weekly-analytics.js` | ✅ + getYearComparison() |
| `www/js/services/drive-backup.js` | ✅ merge логика в restoreFromBackup |
| `capacitor.config.json` | ✅ androidScheme: https |
| `android/.../AndroidManifest.xml` | ✅ Все разрешения |
| `android/.../MainActivity.java` | ✅ Только registerPlugin(BatteryPlugin) |
| `android/.../BatteryPlugin.java` | ✅ Отдельный файл |
| `www/index.html` | ✅ v=20260326, MutationObserver с debounce |

---

## Следующая фича — Emotional Companion

Плавающий AI персонаж в углу экрана.

Поведение:
- появляется после сохранения настроения
- реагирует на уровень настроения коротким сообщением
- не навязчивый, можно отключить в настройках

Примеры сообщений:
- Низкое настроение: "Сегодня тяжело. Хочешь попробовать дыхание?"
- Хорошее настроение: "Отлично! Что-то сработало сегодня."

Реализация:
- floating div поверх всех экранов
- CSS анимация
- toggle в настройках (`companion_enabled` в localStorage)

---

## Установленные Capacitor плагины
```
@capacitor/android: ^8.1.0
@capacitor/core: ^8.1.0
@capacitor/filesystem: ^8.0.0
@capacitor/local-notifications: ^8.0.2
@capacitor/preferences: ^8.0.1
@capacitor/share: ^8.0.0
```

---

## localStorage ключи
| Ключ | Содержимое |
|---|---|
| `mood` | Текущее настроение (0-100) |
| `startDate` | Timestamp первого запуска |
| `mood_history` | [{value, state, time}] |
| `notes_history` | [{text, mood, result, time, timestamp}] |
| `voice_history` | [{text, audioUrl, duration, timestamp}] |
| `session_history` | [{type, result, moodBefore, moodAfter, timestamp}] |
| `photo_history` | [{dataUrl, timestamp, note}] ← base64, НЕ включать в бэкап |
| `weekly_history` | [{weekKey, averageMood, entries, dominantState...}] |
| `user_profile` | {takesMeds, medEffect, medReminder, moodBaseline} |
| `onboarding_done` | "true" |
| `moodos_app_id` | "20260320" — детекция переустановки |
| `app_language` | "ru"/"en"/"es"/"uk" |
| `pdf_report_settings` | {autoDays, autoPeriod, autoTime, lastFrom, lastTo} |
| `last_auto_backup` | timestamp последнего бэкапа |
| `companion_enabled` | "true"/"false" — AI персонаж вкл/выкл |

---

## Дизайн-система
- Фон: `linear-gradient(160deg, #d4ede8 0%, #e8e0d5 100%)`
- Карточки: `rgba(232,237,230,0.9)`
- Тень светлая: `#ffffff`, тёмная: `#b8c4b4`
- Акцент зелёный: `#4caf87`, голубой: `#7eb8d4`, фиолетовый: `#9f7aea`
- Текст: `#3a3530`, серый: `#888`
- Шрифт: `-apple-system, 'SF Pro Display', sans-serif`
- Стиль: неоморфизм

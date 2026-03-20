# MoodOS — Чекпоинт сессии (Март 2026)

## Репо
https://github.com/serjoleinic2-cloud/moodos-app
Разработчик: Сергей — не программист, работает через GitHub web-интерфейс
Сборка: GitHub → Android Studio → APK на реальное Android устройство
Правило: давать ТОЛЬКО полные файлы целиком

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
3. `state.js` — НЕТ `subscribe()` и `notify()` — удалены навсегда (вызывали каскадные зависания)
4. `home.js` — НЕ импортирует из `app.js` (циклический импорт)
5. `render()` в `app.js` — НЕ пишет `moodSlider.value` (триггерит events на WebView)
6. `home.js` — НЕ пишет `slider.value = currentMood` в `onEnter()`
7. `session-analytics.js` — в конце файла не должно быть мусора после `}`
8. `onboarding.js` — `finish()` без `location.reload`
9. PDF-документ — всегда на русском
10. Кэш-бастинг: `app.js?v=YYYYMMDD` в `index.html`
11. Онбординг при переустановке — через `@capacitor/app` + `sessionStorage` + `moodos_app_id` в localStorage
12. Бэкап — БЕЗ `photo_history` и `voice_history` (base64 вешает stringify)
13. `renderSettings()` — НЕ использовать вложенные template literals (незакрытый backtick роняет весь модуль)
14. androidScheme: "https" — localStorage переживает переустановку APK

---

## Что сделано в этой сессии ✅

### Исправлены баги
- Зависание UI — убраны `subscribe/notify` из `state.js`
- Онбординг пропускался при переустановке — `moodos_app_id` в localStorage
- `navigation.js` — убран статический импорт `pdf-report.js`
- `app.js` — убраны `setMood` в `updateStabilityHistory`, `subscribe(render)`, `moodSlider.value`
- `settings.js` — дублирующий импорт `getProfile`, вложенные template literals
- Уведомления каждую минуту — исправлен расчёт времени + `_reminderListenerAdded` флаг
- AndroidManifest.xml — добавлены `USE_EXACT_ALARM`, `VIBRATE`, `WAKE_LOCK`, BroadcastReceiver

### Новые фичи
- **Weekly Data Blocks** — `weekly-analytics.js` (новый сервис)
  - `updateWeeklyBlocks()` — вызывается при старте через setTimeout
  - `getRecentWeeks(n)`, `getWeekBlock(date)`, `getYearComparison()`, `getWeeklyTrend()`
  - `memory.js` — добавлены `getWeeklyHistory()`, `saveWeeklyHistory()`

- **Social Sharing** — `history.js`
  - Кнопка ↗ в детальном просмотре (настроение, заметки, практики)
  - Через `window.Capacitor.Plugins.Share` (нативное Android меню)
  - Установлен `@capacitor/share` плагин

- **PDF отчёт для врача** — `pdf-report.js`
  - Генерация через html2canvas → кириллица работает
  - Share через `Capacitor.Plugins.Share` + `Filesystem` (нативное Android меню)
  - Новые секции: стабильность, тренд, практики, **рекомендации для врача**
  - Установлены `@capacitor/share`, `@capacitor/filesystem` плагины
  - Исправлено расписание уведомлений (еженедельные, не каждую минуту)

- **Бэкап данных (Фаза 1)** — `drive-backup.js` + кнопки в `settings.js`
  - `backupAndShare()` через Android share-меню
  - `restoreFromBackup(file)` — восстановление из .json
  - Только лёгкие данные: mood, notes, sessions, user_profile

---

## Текущее состояние файлов в репо

| Файл | Статус |
|---|---|
| `www/js/app.js` | ✅ Рабочий — без subscribe/setMood/moodSlider |
| `www/js/navigation.js` | ✅ Без статического pdf-report импорта |
| `www/js/screens/home.js` | ✅ Без импорта из app.js |
| `www/js/screens/settings.js` | ⚠️ Последняя версия — проверить работу кнопок |
| `www/js/screens/history.js` | ✅ Social Sharing работает |
| `www/js/screens/pdf-report.js` | ✅ html2canvas + Capacitor Share |
| `www/js/services/memory.js` | ✅ + weekly_history функции |
| `www/js/services/weekly-analytics.js` | ✅ Новый файл |
| `www/js/services/drive-backup.js` | ⚠️ ОТСУТСТВУЕТ в репо — Сергей вернул старые файлы |
| `www/js/services/session-analytics.js` | ✅ Без изменений |
| `www/js/services/analytics.js` | ✅ Без изменений |
| `capacitor.config.json` | ✅ + plugins.LocalNotifications |
| `android/app/src/main/AndroidManifest.xml` | ✅ + USE_EXACT_ALARM, VIBRATE |
| `package.json` | ✅ + @capacitor/share, @capacitor/filesystem |

---

## Незакрытые задачи 🔴

### Бэкап на Google Drive
- **Статус:** ОТЛОЖЕНО — Сергей вернул старые файлы
- **Проблема:** OAuth popup не работает в Android WebView
- **Решение (одобрено):** Фаза 1 — share-меню (сделано), Фаза 2 — Google Drive API после MVP
- **drive-backup.js отсутствует в репо** — нужно загрузить при возврате к задаче
- При возврате: загрузить `drive-backup.js` из outputs прошлой сессии

### Технический долг (сделать перед ростом)
1. **Миграции данных** — добавить `data_version` в memory.js + `migrateIfNeeded()`
2. **Очистить index.html** — убрать старую кнопку `<button id="backup-drive">Backup Data</button>`
3. **Логгер ошибок** — `window.onerror` в app.js, последние 10 ошибок в localStorage
4. **Разбить pdf-report.js** — отделить `pdf-generator.js` от UI/уведомлений
5. **Динамические импорты** — в insight.js, report.js убрать статические импорты тяжёлых модулей

---

## Следующие фичи по стратегии

| # | Фича | Статус |
|---|---|---|
| 1 | Weekly Data Blocks | ✅ Готово |
| 2 | Social Sharing | ✅ Готово |
| 3 | Year Pattern Comparison | ⏳ Следующая — данные уже копятся |
| 4 | AI Companion | ⏳ После Year Comparison |
| 5 | Premium gate (7 дней) | ⏳ Перед релизом |
| 6 | Google Drive backup (Фаза 2) | ⏳ После MVP |

---

## Year Pattern Comparison — план реализации
- Данные: `getYearComparison()` из `weekly-analytics.js` уже готова
- UI: новая карточка в `insight.js`
- Формат: "Эта неделя vs та же неделя год назад"
- Нужно: добавить i18n ключи + карточка в insight экран

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

---

## Дизайн-система
- Фон: `linear-gradient(160deg, #d4ede8 0%, #e8e0d5 100%)`
- Карточки: `rgba(232,237,230,0.9)`
- Тень светлая: `#ffffff`, тёмная: `#b8c4b4`
- Акцент зелёный: `#4caf87`, голубой: `#7eb8d4`, фиолетовый: `#9f7aea`
- Текст: `#3a3530`, серый: `#888`
- Шрифт: `-apple-system, 'SF Pro Display', sans-serif`
- Стиль: неоморфизм

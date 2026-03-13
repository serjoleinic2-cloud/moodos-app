# MoodOS — Структура проекта

## Общее
Android-приложение на Capacitor (WebView). Весь код — HTML/CSS/JS в папке `www/`.
Сборка: GitHub → Android Studio → APK на реальное устройство.
Хранилище данных: `localStorage` (нет сервера, нет базы данных).

---

## Критические правила

1. `closeAllOverlays()` — живёт в `www/js/navigation.js`, экспортируется оттуда. Нигде больше не определяется.
2. `pdf-report.js` — НЕ содержит `closeAllOverlays`. Только логика PDF и напоминаний.
3. `session-analytics.js` — в конце файла не должно быть мусора после закрывающей `}`. Иначе экран Insight не загружается.
4. `onboarding.js` — функция `finish()` без перезагрузки страницы (`location.reload` — запрещено).
5. `state.js`, `services/*`, `ai/*` — не трогать без крайней необходимости.
6. Кнопка OK и слайдер настроения — только в `home.js`. В других файлах не дублировать.
7. `calculateGoldenHour()` возвращает объект `{ start, end }` — НЕ строку. Учитывать при отображении.
8. Все строки интерфейса — через `t()` из `i18n.js`. Хардкод текста запрещён.
9. PDF-документ (`generatePdf`) — всегда на русском, независимо от языка интерфейса.
10. При обновлении файлов менять версию в `index.html`: `app.js?v=YYYYMMDD` — иначе Android WebView кеширует старый код.

---

## Структура файлов

```
www/
├── index.html                  — единственная HTML-страница. Все экраны — div[data-screen].
│                                 Подключает app.js как ES-модуль. Встроенный скрипт применяет
│                                 i18n до инициализации через MutationObserver.
│
├── css/
│   └── style.css               — весь CSS. Неоморфизм, градиент фона, карточки, навигация.
│
└── js/
    ├── app.js                  — точка входа. DOMContentLoaded → initState → initUI →
    │                             onboarding или startApp. Логика кнопки анализа заметки,
    │                             голосовой записи, render() для главного экрана.
    │
    ├── i18n.js                 — экспортирует t(key), getLang(), getDaysLabel().
    │                             Загружает нужный локаль-файл по app_language из localStorage.
    │
    ├── state.js                — глобальное состояние: mood, startDate. initState(),
    │                             getMood(), setMood(), subscribe(), getUsageDays().
    │                             НЕ ТРОГАТЬ без необходимости.
    │
    ├── navigation.js           — initNavigation(). Управляет переключением экранов,
    │                             гамбургер-меню, панелью практик.
    │                             СОДЕРЖИТ closeAllOverlays() — единственное место определения.
    │                             Импортирует checkAutoReminder из pdf-report.js.
    │
    ├── ui-controller.js        — мелкие UI-эффекты, не связанные с конкретными экранами.
    │
    ├── onboarding.js           — онбординг (язык → terms → самочувствие → лекарства →
    │                             напоминание → базовое состояние). finish() БЕЗ reload.
    │
    ├── breathing.js            — практика «Дыхание». initBreathing(container).
    ├── mind-dump.js            — практика «Выгрузка мыслей». initMindDump(container).
    ├── tap-calm.js             — практика «Тактильная разрядка». initTapCalm(container).
    ├── visual-focus.js         — практика «Зрительный якорь». initVisualFocus(container).
    │
    ├── screens/
    │   ├── home.js             — экран «Главная». Логика кнопки OK, слайдера настроения,
    │   │                         сохранения mood в history. Всё про кнопку OK — только здесь.
    │   │
    │   ├── insight.js          — экран «Инсайт». onEnter() строит аналитику: стабильность,
    │   │                         тренд, золотые часы, эффективность практик, эмоциональная
    │   │                         память. Flip-карточки с Chart.js графиками.
    │   │                         goldenShort(g) принимает объект {start,end}.
    │   │
    │   ├── report.js           — экран «Отчёт». Сводка настроения, календарь настроений,
    │   │                         график. Кнопка «Отчёт для врача» вызывает showPdfReportModal()
    │   │                         из pdf-report.js.
    │   │
    │   ├── pdf-report.js       — оверлей «Отчёт для врача»: выбор периода, генерация PDF
    │   │                         (jsPDF), share через navigator.share / скачивание.
    │   │                         Push-напоминания через Capacitor LocalNotifications.
    │   │                         Экспортирует: showPdfReportModal(), checkAutoReminder().
    │   │                         НЕ содержит closeAllOverlays (она в navigation.js).
    │   │                         PDF-контент внутри всегда на русском.
    │   │
    │   ├── stability.js        — экран «Устойчивость». Метрики волатильности, динамика
    │   │                         за 14 дней, последние записи с состоянием.
    │   │
    │   ├── settings.js         — экран «Настройки». Лекарства, эффект, напоминание,
    │   │                         базовое состояние, язык, кнопка «Отчёт для врача».
    │   │
    │   ├── history.js          — экран «История». Список дней, детали записи (настроение,
    │   │                         заметка, голос, фото, практики). Добавление фото через
    │   │                         Capacitor Camera.
    │   │
    │   ├── tools.js            — контейнер для практик. Рендерит выбранную практику
    │   │                         в #tools-content.
    │   │
    │   ├── meditation.js       — практика «Медитация» как экран. initMeditation(container).
    │   │
    │   ├── premium.js          — экран «Премиум» (заглушка или будущий paywall).
    │   │
    │   └── voice.js            — экран голосовой записи (data-screen="voice").
    │
    ├── services/
    │   ├── memory.js           — всё чтение/запись localStorage:
    │   │                         getMoodHistory / saveMoodHistory
    │   │                         getNotesHistory / saveNotesHistory
    │   │                         getVoiceHistory / saveVoiceHistory
    │   │                         getSessionHistory / saveSessionHistory
    │   │                         getPhotoHistory / savePhotoHistory
    │   │
    │   ├── analytics.js        — calculateStabilityScore(history),
    │   │                         calculateTrend(history),
    │   │                         calculateGoldenHour(history) → {start, end} или null
    │   │                         (порог: минимум 3 записи)
    │   │
    │   ├── state-engine.js     — detectMoodState(mood) → строка состояния,
    │   │                         getStateLabel(state) → читаемая метка.
    │   │                         Состояния: LOW / STRESSED / NEUTRAL / GOOD / HIGH
    │   │
    │   ├── session-analytics.js — статистика по сессиям практик:
    │   │                          getEffectivenessRate(type), getAverageMoodLift(type),
    │   │                          getEffectivenessByState(type), getFullSessionStats(),
    │   │                          getPersonalRecommendation(state).
    │   │                          ВАЖНО: в конце файла не должно быть лишнего кода после }.
    │   │
    │   └── user-profile.js     — getProfile(), saveProfile(), isOnboardingDone(),
    │                              setOnboardingDone(). Данные онбординга: takesMeds,
    │                              medEffect, medReminder, moodBaseline.
    │
    ├── ai/
    │   ├── offline-ai.js       — analyzeText(text, mood) → { insight, state }.
    │   │                         Локальный анализ без интернета.
    │   │
    │   ├── voice.js            — startVoiceRecording(statusEl, onDone) → Promise.
    │   │                         Запись через Capacitor или Web API.
    │   │
    │   └── voice-analysis.js   — analyzeLatestVoice() → { insight }.
    │                             Анализ последней голосовой записи.
    │
    └── i18n/
        ├── ru.js               — export const ru = { ... }  (русский — основной)
        ├── en.js               — export const en = { ... }  (английский)
        ├── es.js               — export const es = { ... }  (испанский)
        └── uk.js               — export const uk = { ... }  (украинский)
```

---

## localStorage ключи

| Ключ | Содержимое |
|---|---|
| `mood` | Текущее значение настроения (число 0–100) |
| `startDate` | Timestamp первого запуска (для счётчика дней) |
| `mood_history` | JSON-массив `[{ value, state, time }]` |
| `notes_history` | JSON-массив `[{ text, mood, result, time, timestamp }]` |
| `voice_history` | JSON-массив голосовых записей |
| `session_history` | JSON-массив сессий практик `[{ type, result, moodBefore, moodAfter, timestamp }]` |
| `photo_history` | JSON-массив фото-записей |
| `user_profile` | JSON-объект `{ takesMeds, medEffect, medReminder, moodBaseline }` |
| `onboarding_done` | `"true"` если онбординг пройден |
| `med_reminder` | Настройки напоминания о лекарствах |
| `med_monthly_check` | Флаг ежемесячной проверки |
| `app_language` | `"ru"` / `"en"` / `"es"` / `"uk"` |
| `pdf_report_settings` | JSON `{ lastFrom, lastTo, autoDays, autoPeriod, autoTime }` |

---

## Навигация (как работает)

- В `index.html` все экраны — `<div class="screen" data-screen="NAME">`. Активный получает класс `active`.
- `navigation.js` → `openScreen(name)` переключает активный экран и вызывает `module.onEnter()`.
- Экраны загружаются через динамический `import()` и кешируются в `loadedScreens{}`.
- Если модуль упал с ошибкой — кеш сбрасывается (`delete loadedScreens[name]`), следующий тап попробует снова.
- `closeAllOverlays()` вызывается при каждом переключении экрана — убирает PDF-оверлей, календарь настроений, health-модалки.

---

## i18n (как работает)

- `i18n.js` экспортирует `t(key)` — возвращает строку по ключу для текущего языка.
- Язык читается из `localStorage.getItem("app_language")`, по умолчанию `"ru"`.
- В `index.html` встроенный `<script>` применяет переводы сразу при загрузке через `MutationObserver`.
- Элементы с `data-i18n="key"` — переводится `textContent`.
- Элементы с `data-i18n-placeholder="key"` — переводится `placeholder`.
- Все новые строки добавлять во все 4 файла: `ru.js`, `en.js`, `es.js`, `uk.js`.

---

## Дизайн-система

| Параметр | Значение |
|---|---|
| Фон | `linear-gradient(160deg, #d4ede8 0%, #e8e0d5 100%)` |
| Карточки | `rgba(232, 237, 230, 0.9)` |
| Тень светлая | `#ffffff` |
| Тень тёмная | `#b8c4b4` |
| Акцент зелёный | `#4caf87` |
| Акцент голубой | `#7eb8d4` |
| Акцент фиолетовый | `#9f7aea` |
| Текст основной | `#3a3530` |
| Текст серый | `#888` |
| Шрифт | `-apple-system, 'SF Pro Display', sans-serif` |
| Стиль | Неоморфизм (`box-shadow: 6px 6px 12px #b8c4b4, -6px -6px 12px #ffffff`) |

---

## Бэклог (не реализовано)

- Premium gate — 7 дней бесплатно, потом paywall
- Лимит AI-запросов — 5 в день
- Google Drive backup
- Голосовая рефлексия: таймер на экране ещё не виден пользователю во время записи

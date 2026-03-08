# 🔖 CHECKPOINT — MoodOS App
*Вставь это в начало нового диалога*

---

## 👤 Как работает пользователь

- Зовут Сергей, **не программист** — объяснять код не нужно, только говорить ЧТО делать и КУДА класть файл
- Workflow: редактирует файлы на **GitHub** (через веб или Desktop) → **Android Studio** → **тест на телефоне** (Android)
- Когда что-то ломается — Сергей присылает лог ошибки или ссылку на файл с GitHub
- Общение на **русском языке** — всегда
- Claude создаёт готовые файлы, Сергей их скачивает и заливает на GitHub по указанному пути

---

## 📱 Проект

**MoodOS** — мобильное приложение эмоциональной регуляции на **Capacitor/Ionic**
- Репозиторий: `https://github.com/serjoleinic2-cloud/moodos-app`
- Файлы приложения лежат в папке `www/`
- Точка входа: `www/index.html` + `www/js/app.js`
- Стили: `www/css/style.css`

---

## 🎨 Философия и дизайн

**Стиль: неоморфизм** — светлый фон `#e0e5ec`, тени `#b8bec7` / `#ffffff`
```css
/* Выпуклый элемент */
box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
/* Вдавленный (активный) */
box-shadow: inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff;
```

**Кнопки** — тёплый пастельный градиент:
```css
background: linear-gradient(160deg, #f5ede0, #ddd5cb);
```

**Философия приложения:**
- MoodOS — **попутчик**, не советчик
- Объясняет состояние (причины), а не оценивает
- Дружеский тон, не клинический
- Всё на **русском языке** (UI полностью русифицирован)
- Поддержка 4 языков: RU, EN, ES, UK (через offline-ai.js и планируемый i18n.js)

---

## 🗂 Структура файлов

```
www/
├── index.html                          ← главный HTML, все экраны здесь
├── css/
│   └── style.css                       ← неоморфизм стили
└── js/
    ├── app.js                          ← точка входа, boot логика
    ├── state.js                        ← глобальный стейт (mood, startDate)
    ├── navigation.js                   ← переключение экранов, меню
    ├── ui-controller.js                ← инициализация UI
    ├── onboarding.js                   ← онбординг (6 шагов, первый запуск)
    ├── monthly-check.js                ← ежемесячный чек о лекарствах
    ├── breathing.js                    ← практика дыхания
    ├── visual-focus.js                 ← практика зрительный якорь
    ├── mind-dump.js                    ← практика выгрузка мыслей
    ├── tap-calm.js                     ← практика тактильная разрядка
    ├── screens/
    │   ├── home.js                     ← главный экран (слайдер настроения)
    │   ├── insight.js                  ← инсайты, flip-карточки метрик
    │   ├── report.js                   ← отчёт с графиком
    │   ├── stability.js                ← экран устойчивости
    │   ├── history.js                  ← история записей + фото + голос
    │   ├── meditation.js               ← практика медитация
    │   └── settings.js                 ← настройки + здоровье
    ├── services/
    │   ├── memory.js                   ← localStorage: вся история
    │   ├── analytics.js                ← calculateStabilityScore, calculateTrend, calculateGoldenHour
    │   ├── state-engine.js             ← detectMoodState
    │   ├── user-profile.js             ← профиль юзера, медикаменты, baseline
    │   ├── pattern-engine.js           ← триггеры, лучшее время, паттерны
    │   ├── resilience-engine.js        ← индекс устойчивости 0-100
    │   ├── insight-engine.js           ← объяснения состояния, прогнозы
    │   └── session-analytics.js        ← эффективность практик
    └── ai/
        ├── offline-ai.js              ← офлайн ответы (4 языка, 3x база)
        ├── voice.js                   ← запись голоса → base64 audio/webm
        └── voice-analysis.js          ← анализ голоса
```

---

## ✅ Что сделано и работает

### Навигация (navigation.js)
- 5 кнопок нижнего меню + hamburger
- **Кнопка Tools (5)** — подсвечивается сразу при открытии панели практик
- **Hamburger** — подсвечивается при открытии, восстанавливается при закрытии без выбора
- Функция `openTool(importFn, initKey)` — единый способ запуска любой практики
- Пути практик: `./breathing.js`, `./screens/meditation.js`, `./visual-focus.js`, `./mind-dump.js`, `./tap-calm.js`

### Онбординг (onboarding.js)
- 6 шагов: приветствие → состояние → лекарства → эффект → напоминалка → калибровка
- Шаги 4-5 пропускаются если не принимает лекарства
- Показывается ТОЛЬКО при первом запуске — флаг `onboarding_done`
- **НЕ показывается повторно** — критично

### Экран Stability (screens/stability.js)
- 4 карточки в сетке 2×2: Устойчивость / Волатильность / Среднее 14 дней / Тренд
- Голубой значок **ⓘ** на каждой карточке → всплывашка с расшифровкой
- Последние 10 записей — аккордеон-жалюзи (раскрываются по тапу)
- Цветная интерпретация уровня

### Экран Insight (screens/insight.js)
- Секция «Твоя статистика»: 4 flip-карточки (Стабильность / Среднее настроение / Тренд / Золотые часы)
- Тап → карточка переворачивается, показывает Chart.js график
- Карточки НЕ наслаиваются: высота 110px обычная / 180px перевёрнутая
- Секция эффективности практик + таблица по состояниям
- Все мелкие подписи тёмные (#555–#666)

### История (screens/history.js)
- Таймлайн: настроение + заметки + голос + сессии (5 типов) + фото
- **Голосовые карточки**: плеер ▶/⏸ + ползунок + таймер прямо в карточке
- Голос хранится как base64 `audio/webm` в поле `entry.audio`
- Правильные иконки/цвета для всех 5 типов сессий
- Фильтр по дате, 📷 добавить фото, 🗑 удалить запись
- Детальный просмотр по тапу (с плеером для голоса)

### Стили (style.css)
- Фон `#e0e5ec` — body, .screen, .card
- Кнопки: `linear-gradient(160deg, #f5ede0, #ddd5cb)` — тёплый пастельный
- Нет дублирующихся правил
- textarea без рамки, вдавленные тени

### Memory (services/memory.js)
- Чистый файл без мусора
- Экспорты: get/save/add для mood, notes, voice, session, activity, photo

---

## 📋 Бэклог

### 🟠 Важно
- [ ] **i18n.js** — переключение языков в настройках
- [ ] **Premium gate** — 7 дней бесплатно, потом блокировка Insight/Report/История>7 дней
- [ ] **Лимит AI запросов** — 5 онлайн запросов в день для бесплатных

### 🟡 Средний приоритет
- [ ] **Google Drive backup** — `MoodOS/profile.json` + `MoodOS/data/YYYY-WXX.json` + `MoodOS/photos/`
- [ ] **PDF отчёт для врача** — генерация, 2 email поля, выбор периода

### 🟢 Запланировано
- [ ] **Privacy Policy + Terms of Use** — экран ДО онбординга, защита США/GDPR
- [ ] **Когнитивные искажения** — AI анализирует текст заметки офлайн
- [ ] **Интеграция с носимыми** — далёкое будущее

---

## 🏗 Архитектура данных Google Drive (запланировано)

```
MoodOS/
├── profile.json
├── data/
│   └── YYYY-WXX.json     ← по неделям
└── photos/
    └── YYYY-WXX/
```

---

## 🚫 Что нельзя ломать

1. **state.js** — не трогать без крайней необходимости
2. **memory.js** — хранит всю историю юзера, ломать = потеря данных
3. **navigation.js** — переключение экранов и меню
4. **Флаг onboarding_done** — онбординг ТОЛЬКО один раз
5. **Стиль** — фон `#e0e5ec`, тени `#b8bec7/#ffffff`, кнопки `#f5ede0→#ddd5cb`

---

## 🔑 Пути для заливки файлов

| Файл | Путь в репо |
|---|---|
| navigation.js | `www/js/navigation.js` |
| onboarding.js | `www/js/onboarding.js` |
| monthly-check.js | `www/js/monthly-check.js` |
| memory.js | `www/js/services/memory.js` |
| user-profile.js | `www/js/services/user-profile.js` |
| home.js | `www/js/screens/home.js` |
| insight.js | `www/js/screens/insight.js` |
| stability.js | `www/js/screens/stability.js` |
| history.js | `www/js/screens/history.js` |
| report.js | `www/js/screens/report.js` |
| settings.js | `www/js/screens/settings.js` |
| offline-ai.js | `www/js/ai/offline-ai.js` |
| style.css | `www/css/style.css` |

---

## 💡 Подсказки для нового Claude

- **Всегда читай файл с GitHub перед правкой** — `web_fetch` на raw ссылку
- Не используй `?.property =` для присваивания — синтаксическая ошибка JS
- Синтаксис проверяй: `node --check file.js`
- Все экраны рендерят HTML в `data-screen="name"` через `innerHTML`
- Chart.js глобально через CDN → `window.Chart`
- Canvas: `window.Chart.getChart(canvas)?.destroy()` перед пересозданием
- Практики в `www/js/` (НЕ в screens): `breathing.js`, `visual-focus.js`, `tap-calm.js`, `mind-dump.js`
- Медитация исключение: `www/js/screens/meditation.js`
- Голос: `entry.audio` = base64 `audio/webm`, хранится в `voice_history`
- Для сложных замен строк в JS — используй `python3` скрипт, надёжнее чем str_replace

### localStorage ключи
`mood`, `startDate`, `mood_history`, `notes_history`, `voice_history`, `session_history`, `activity_history`, `photo_history`, `user_profile`, `onboarding_done`, `med_reminder`, `med_monthly_check`, `app_language`

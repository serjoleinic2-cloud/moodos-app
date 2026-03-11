# MoodOS — Чекпоинт разработки
*Обновлён: март 2026*

---

## 👤 КТО ТАКОЙ СЕРГЕЙ
- Не программист, работает через GitHub web-интерфейс
- Сборка: GitHub → Android Studio → тест на реальном Android-устройстве
- Репо: `https://github.com/serjoleinic2-cloud/moodos-app`
- Язык общения: **только русский**
- Давать **ТОЛЬКО полные файлы целиком**, никаких "найди и замени"

---

## ⚠️ КРИТИЧЕСКИЕ ПРАВИЛА
1. `navigation.js`: `closeAllOverlays()` импортируется из `./screens/pdf-report.js`
2. `session-analytics.js`: в конце файла не должно быть мусора после закрывающей `}` — иначе insight не загружается
3. `onboarding.js`: `finish()` без перезагрузки страницы
4. Не трогать `state.js`, `services/*`, `ai/*` без крайней необходимости
5. **Вся логика кнопки OK (ползунок настроения) — только в `home.js`**, в `app.js` её нет
6. В `home.js` кнопка и слайдер **клонируются** перед навешиванием слушателей — это предотвращает накопление дублей

---

## ✅ ЧТО СДЕЛАНО

### i18n — полностью завершено
- [x] `i18n.js` — 4 языка (ru, en, es, uk), добавлены ключи: `rec_*`, `breath_*`, `md_*`, `tc_*`, `vf_*`, `med_*`
- [x] `session-analytics.js` — подключён `t()`, `getPersonalRecommendation()` переведена, `stateLabel()` переведена
- [x] `insight.js` — полностью переведён
- [x] `breathing.js` — переведён (были баги с backtick-синтаксисом, исправлены)
- [x] `mind-dump.js` — переведён
- [x] `tap-calm.js` — переведён
- [x] `visual-focus.js` — переведён
- [x] `meditation.js` — переведён
- [x] Смена языка в Settings — реализована

### История (`history.js`)
- [x] Кнопка 🗑 удаления на каждой карточке (функция `deleteItem()`)
- [x] Кнопка "Назад" поднята: `bottom:calc(160px + env(safe-area-inset-bottom))`
- [x] Фото сжимаются через `compressImage()` (800px, quality 0.7) перед сохранением в localStorage

### Медитация (`meditation.js`)
- [x] Ползунок поднят: `bottom:calc(160px + env(safe-area-inset-bottom))`

### Главный экран (`app.js`, `home.js`, `voice.js`)
- [x] При нажатии OK показывается `12:56 (11.03.2026)` — время и дата обновляются каждый раз
- [x] В историю пишется ровно **1 запись** при нажатии OK (исправлено клонированием кнопки)
- [x] Дневная рефлексия: снимается `data-i18n` с `aiResponse` после ответа — MutationObserver больше не перезаписывает
- [x] Инсайт дня: берёт последний AI-ответ из истории заметок
- [x] Золотые часы: если < 3 записей — "изучаю", иначе считает
- [x] Голосовая рефлексия: обратный отсчёт `⏱ 10, 9, 8...` в voiceStatus
- [x] После записи статус очищается (не показывает "Ожидание")
- [x] `voice.js`: добавлен `stream.getTracks().stop()` для освобождения микрофона

---

## 🔧 КАК УСТРОЕНА КНОПКА OK (ползунок настроения)

Вся логика — только в `home.js`, функция `onEnter()`:
1. Клонируется `moodSlider` → `newSlider`
2. Клонируется `moodConfirmBtn` → `newBtn`
3. `newBtn.click` → `addMoodEntry()` + обновление `savedLabel` с текущим временем
4. В `app.js` этого блока **НЕТ** — функция `showSavedTime()` удалена

---

## 📋 БЭКЛОГ (не сделано)
- [ ] Premium gate — 7 дней бесплатно
- [ ] Лимит AI запросов — 5 в день
- [ ] Google Drive backup
- [ ] Надписи в Инсайте и Отчёте — крупнее и темнее
- [ ] Переводы в `report.js`, `stability.js`, `settings.js` — не проверялись
- [ ] Голосовая рефлексия: таймер на экране ещё не виден пользователю — требует проверки после заливки

---

## 🗂 АРХИТЕКТУРА ФАЙЛОВ
```
www/
├── index.html
├── css/style.css
└── js/
    ├── app.js
    ├── i18n.js
    ├── state.js
    ├── navigation.js
    ├── ui-controller.js
    ├── onboarding.js
    ├── breathing.js
    ├── mind-dump.js
    ├── tap-calm.js
    ├── visual-focus.js
    ├── meditation.js
    ├── screens/
    │   ├── home.js
    │   ├── insight.js
    │   ├── report.js
    │   ├── stability.js
    │   ├── history.js
    │   ├── settings.js
    │   ├── tools.js
    │   ├── meditation.js
    │   └── pdf-report.js
    ├── services/
    │   ├── memory.js
    │   ├── analytics.js
    │   ├── state-engine.js
    │   ├── user-profile.js
    │   ├── session-analytics.js
    │   └── insight-engine.js
    └── ai/
        ├── offline-ai.js
        ├── voice.js
        └── voice-analysis.js
```

---

## 🔑 LOCALSTORAGE КЛЮЧИ
`mood`, `startDate`, `mood_history`, `notes_history`, `voice_history`, `session_history`, `photo_history`, `user_profile`, `onboarding_done`, `med_reminder`, `med_monthly_check`, `app_language`, `pdf_report_settings`

---

## 🎨 ДИЗАЙН — НЕЛЬЗЯ ЛОМАТЬ
| Элемент | Значение |
|---|---|
| Фон | `linear-gradient(160deg, #d4ede8 0%, #e8e0d5 100%)` |
| Карточки | `rgba(232, 237, 230, 0.9)` |
| Тень светлая | `#ffffff` |
| Тень тёмная | `#b8c4b4` |
| Акцент зелёный | `#4caf87` |
| Акцент голубой | `#7eb8d4` |
| Шрифт | `-apple-system, 'SF Pro Display', sans-serif` |
| Стиль | Неоморфизм — выпуклые карточки, вдавленные активные элементы |

---

## 🚦 С ЧЕГО НАЧИНАТЬ НОВУЮ СЕССИЮ
1. Сергей присылает этот чекпоинт (или ссылку на него в репо)
2. Сергей присылает ссылки на актуальные файлы с `?nocache=N`
3. Читаем, понимаем реальное состояние
4. Выясняем точно что не работает
5. Даём **полный готовый файл** — без инструкций "найди и замени"

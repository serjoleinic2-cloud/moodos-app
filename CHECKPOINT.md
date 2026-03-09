# MoodOS — Чекпоинт для нового чата

## Контекст проекта
- **Сергей**, не программист. Workflow: GitHub web/Desktop → Android Studio → тест на Android
- Репо: `https://github.com/serjoleinic2-cloud/moodos-app`
- Стек: Capacitor/Ionic, все файлы в `www/`
- Стиль: неоморфизм, градиент фона: `linear-gradient(160deg, #d4ede8 0%, #e8e0d5 100%)`
- Цвет карточек: `rgba(232, 237, 230, 0.9)`, тени `#b8c4b4 / #ffffff`
- Язык общения и UI: **русский**

---

## Архитектура файлов
```
www/
├── index.html
├── css/style.css
└── js/
    ├── app.js
    ├── state.js
    ├── navigation.js
    ├── ui-controller.js
    ├── onboarding.js
    ├── monthly-check.js
    ├── breathing.js              ← корень js/ (НЕ в screens/)
    ├── mind-dump.js              ← корень js/
    ├── tap-calm.js               ← корень js/
    ├── visual-focus.js           ← корень js/
    ├── screens/
    │   ├── home.js
    │   ├── insight.js
    │   ├── report.js
    │   ├── stability.js
    │   ├── history.js
    │   ├── settings.js
    │   ├── tools.js
    │   └── meditation.js         ← screens/ (НЕ в tools/)
    ├── services/
    │   ├── memory.js
    │   ├── analytics.js
    │   ├── state-engine.js       ← getStateLabel возвращает EN: "Very good","Good","Neutral","Stressed","Low mood"
    │   ├── user-profile.js
    │   ├── pattern-engine.js
    │   ├── resilience-engine.js
    │   ├── session-analytics.js
    │   └── insight-engine.js
    └── ai/
        ├── offline-ai.js
        ├── voice.js              ← сохраняет поле как "audio" (не "audioUrl"!)
        └── voice-analysis.js
```

---

## localStorage ключи
`mood`, `startDate`, `mood_history`, `notes_history`, `voice_history`, `session_history`, `photo_history`, `user_profile`, `onboarding_done`, `med_reminder`, `med_monthly_check`, `app_language`

---

## Важные детали реализации

### state-engine.js
- `getStateLabel()` возвращает EN строки → перевод через `STATE_RU` map в insight.js и history.js
- `detectMoodState(value)` возвращает код: `"LOW"/"STRESSED"/"NEUTRAL"/"GOOD"/"HIGH"`
- Перевод кодов: `{LOW:"Сниженное", STRESSED:"Напряжение", NEUTRAL:"Нейтральное", GOOD:"Хорошее", HIGH:"Отличное"}`

### Запись настроения (app.js)
- Запись в `mood_history` происходит **только** через `updateStabilityHistory()` в `app.js`
- Структура entry: `{ value: number, state: string (код), time: number (timestamp) }`
- `home.js.onEnter()` **не сохраняет** — только обновляет UI слайдера (после фикса двойного listener)
- Защита от дублей: `if (last && last.value === mood) return` + cooldown 5 сек

### voice.js
- Сохраняет `{ audio: base64, time }` — поле называется `audio`, НЕ `audioUrl`
- В `history.js`: маппинг `audioUrl: e.audioUrl || e.audio || null`

### Chart.js
- Подключён глобально через CDN как `window.Chart`
- Canvas нужно уничтожать перед пересозданием: `window.Chart.getChart(canvas)?.destroy()`
- Ширину брать от внешнего `flip-wrap` по id (не от `parentElement` — он `position:absolute`)

### navigation.js — пути импортов практик
```
breathing.js     → import("./breathing.js")
meditation.js    → import("./screens/meditation.js")
visual-focus.js  → import("./visual-focus.js")
mind-dump.js     → import("./mind-dump.js")
tap-calm.js      → import("./tap-calm.js")
```

### SESSION_META (history.js)
```js
const SESSION_META = {
  "breathing":    { icon:"🫁", label:"Дыхание" },
  "meditation":   { icon:"🧘", label:"Медитация" },
  "visual-focus": { icon:"👁",  label:"Зрительный якорь" },
  "mind-dump":    { icon:"🧠", label:"Выгрузка мыслей" },
  "tap-calm":     { icon:"✋", label:"Тактильная разрядка" }
};
```

### Единый стандарт карточки (.mo-metric, .card)
- bg: `rgba(232, 237, 230, 0.9)`
- shadow: `4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff`
- border-radius: `18px`

---

## Пути файлов для заливки в репо
| Файл | Путь в репо |
|---|---|
| `index.html` | `www/index.html` |
| `style.css` | `www/css/style.css` |
| `navigation.js` | `www/js/navigation.js` |
| `app.js` | `www/js/app.js` |
| `home.js` | `www/js/screens/home.js` |
| `insight.js` | `www/js/screens/insight.js` |
| `report.js` | `www/js/screens/report.js` |
| `stability.js` | `www/js/screens/stability.js` |
| `history.js` | `www/js/screens/history.js` |
| `analytics.js` | `www/js/services/analytics.js` |
| `mind-dump.js` | `www/js/mind-dump.js` |

---

## ✅ ВСЁ ЧТО СДЕЛАНО (все сессии)

### Раунд 1
- Русификация всего UI
- Градиентный фон
- hamburgerBtn не горит синим при активной странице
- Insight: переводы STATE_RU, зелёная подсказка
- Report: редизайн карточки, сетка 2×2, график
- Stability: последние 10 записей раскрываются по тапу
- History: голосовые записи с аудиоплеером

### Раунд 2
- История — белая страница → полностью переписан рендер
- Кнопки чёрные → `.card button` теперь бежевый
- Практики не открывались → исправлены пути в navigation.js
- Наслоение карточек Insight → `flip-front` задаёт высоту
- Дубли в Stability → дедупликация по секунде
- ℹ️ подсказки в Report и Stability
- Счётчик дней «Я с тобой уже N дней» на главной

### Раунд 3
- Insight пустой → ReferenceError: переменные использовались до объявления. Исправлен порядок
- Золотые часы на английском → analytics.js переведён на русский
- Голос "Нет транскрипции / аудио не сохранено" → history.js читает `e.audioUrl || e.audio`
- visual-focus/tap-calm/mind-dump показывались как "Медитация" → SESSION_META со всеми 5 типами
- Mind-dump двойная карточка → убрана запись в notes_history
- Камера → кнопка 📷 рядом с фильтром дат, меню «Сделать фото / Галерея / Отмена»

### Раунд 4 (текущая сессия)
- **Инсайт — диаграммы увеличены**: высота `min(55vh, 320px)`, ширина от `flip-wrap` (не от `parentElement`)
- **Инсайт — разрыв между карточками**: при закрытии карточки сбрасывается `minHeight` у всех
- **Баланс — дубляж записей**: убран двойной listener. `home.js` больше не вызывает `addMoodEntry` — только app.js
- **Баланс — последние 10 записей**: явная сортировка по времени перед `slice(-10)`; раскрытый блок показывает Настроение / Состояние / Время / Заметка
- **История — ведро 🗑**: кнопка удаления в каждой карточке (mood/note/voice/photo/session) с подтверждением
- **История — поле state**: карточка настроения теперь показывает эмоциональное состояние под значением; `buildTimeline` передаёт `state: e.state || "—"`
- **Баланс — state уже работал**: `stateLabel` в раскрытом блоке был реализован ранее, проверено

---

## 🔴 ОТКРЫТЫЕ ЗАДАЧИ (не сделано)

### Баги / улучшения UI
1. **Надписи в Инсайте** — (Стабильность, Среднее настроение, Тренд, Золотые часы, Дыхание, Медитация) сделать крупнее и темнее
2. **Надписи в Отчёте** — (Среднее настроение, Стабильность, Записей, Активных дней, Лучший момент, Сложный момент) крупнее и темнее
3. **Счётчик дней на главной** — «Я с тобой уже X дней» отображается, но нужно проверить привязку к карточке Home
4. **Баланс — последние 10 записей** — отложено, «там бардак» по словам Сергея, требует отдельного разбора

### Бэклог (не начинали)
- [ ] i18n.js — переключение языков EN/RU
- [ ] Premium gate — 7 дней бесплатно, затем пейвол
- [ ] Лимит AI запросов — 5 в день бесплатно
- [ ] Google Drive backup
- [ ] PDF отчёт для врача
- [ ] Privacy Policy + Terms of Use

---

## Важные паттерны кода

### Как читать файлы из репо (Claude не может напрямую)
Сергей даёт прямые ссылки вида:
`https://raw.githubusercontent.com/serjoleinic2-cloud/moodos-app/refs/heads/main/www/js/screens/history.js`

### Главный принцип работы
**Не менять структуру дизайна, расположение карточек, графических элементов** — если Сергей явно не описал что именно менять. Только точечные правки.

### Flip-карточки в Инсайте
- `.flip-wrap` — внешний контейнер (в потоке, имеет реальную ширину)
- `.flip-inner` — `position:relative`, `minHeight` управляется JS
- `.flip-front` — `position:relative` (задаёт высоту)
- `.flip-back` — `position:absolute, top:0, left:0, width:100%`
- При открытии: `inner.style.minHeight = front.offsetHeight + "px"` → после графика: `inner.style.minHeight = (canvas.height + 24) + "px"`
- При закрытии ЛЮБОЙ карточки: сбрасывать `minHeight = ""` у ВСЕХ `.flip-wrap`

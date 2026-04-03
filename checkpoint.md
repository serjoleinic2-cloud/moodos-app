CHECKPOINT — NEYRA APP (STABLE STATE)
🧠 PROJECT OVERVIEW

Тип:
Local-first wellness app

Основное:

AI = текст (основная фича)
Аудио = вторичная (медитации, заметки)
🏗 ARCHITECTURE (АКТУАЛЬНОЕ СОСТОЯНИЕ)
CORE
AppRuntime → state management (single source)
Navigation → ⚠️ требует фикса lifecycle
Storage → local
MEDIA ENGINE
AudioController (singleton)
play / pause / stop / destroy
subscribe state
нет дублирующих audio instances
SCREENS
Meditation
кастомные треки ✔
add/remove ✔
duplicate protection ✔
audio через AudioController ✔
⚠️ UI binding частично inline
Insight
period switch (7/30/90/365) ✔
корректный расчет ✔
stable state ✔
i18n ✔
❗ только что исправлен тренд
Voice Notes
без AI ✔
audio playback ✔
хранение ✔
Settings / History
стабильны ✔
⚠️ АКТИВНЫЕ БАГИ
🔴 1. NAVIGATION LIFECYCLE (CRITICAL)

Симптом:

Медитация не закрывается при открытии Меню
UI накладывается

Причина:

onExit() не вызывается
DOM не очищается

Статус:
❗ НЕ ИСПРАВЛЕНО

🟡 НЕ КРИТИЧНО
смешанный стиль событий (onclick + listeners)
design-system не полностью внедрён
📊 TASK STATE (ПОСЛЕДНЕЕ)
AudioController внедрён ✔
Meditation стабилизирована ✔
Add button fixed ✔
Insight logic fixed ✔
Trend UI fixed ✔
⚙️ SYSTEM RULES (ВАЖНО)
UI НЕ управляет аудио напрямую
AudioController = единственный источник
AppRuntime = state
каждый screen:
onEnter()
onExit()
🧪 ТЕКУЩАЯ ФАЗА

MANUAL TESTING / STABILIZATION

🚫 НЕ ДЕЛАТЬ СЕЙЧАС
рефакторинг архитектуры
новые системы
переписывание UI
✅ ДЕЛАТЬ
находить реальные баги
фиксить точечно через OPENCODE
проверять руками
🧾 ТЕКУЩАЯ ЗАДАЧА (ПЕРЕНЕСТИ В НОВЫЙ ЧАТ)
BUG:
При открытии Меню поверх Медитации экран не закрывается.
Виден плеер и список треков.

EXPECTED:
При навигации предыдущий экран должен полностью закрываться (onExit + очистка DOM).
🚀 КАК НАЧАТЬ НОВЫЙ ЧАТ

Просто вставь:

CHECKPOINT LOADED

BUG:
(вставляешь текущий баг)
💬 КРАТКО

Ты сейчас в состоянии:

🟢 приложение работает
🔴 один системный баг навигации
🧪 идёт финальная стабилизация
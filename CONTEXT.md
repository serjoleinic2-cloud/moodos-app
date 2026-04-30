# Neyra App — контекст для Claude

## Стек
Capacitor + Vite PWA, Android, www/ → dist/ → cap copy android

## Деплой
npm run deploy:android → Android Studio Clean → Run

## Что сделано в этой сессии
- Починен i18n getLang() — кэширование null
- voice.js — убран preparing, счётчик 10..1
- SW cache version bump + vite плагин copy-pwa-files
- history.js — иконки практик нормализованы
- report.js — календарь через resolveTimestamp + buildTimeline логика
- backup-service.js — free = 7 дней, premium = всё
- pdf-report.js — заблокирован для free
- premium.js — добавлены фичи PDF и export
- how-it-works.js — добавлены блоки про данные/экспорт/PDF
- i18n 5 языков — новые ключи

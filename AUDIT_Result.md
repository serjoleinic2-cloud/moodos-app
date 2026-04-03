ОБНОВЛЁННЫЙ АУДИТ
ДУБЛИКАТЫ ENGINE-ФАЙЛОВ
Проблемы нет. Файлы pattern-engine.js, resilience-engine.js, insight-engine.js существуют только в www/js/services/. system-core.js импортирует именно их. Аудит из AUDIT.txt был ошибочным.

REAL ISSUES (подтверждённые)
🔴 ISSUE 1 — AppRuntime.subscribe() не возвращает unsubscribe
Файл: www/js/core/appRuntime.js
jssubscribe(module, cb) {
  if (!this.listeners[module]) this.listeners[module] = [];
  this.listeners[module].push(cb);
  // return отсутствует
}
Файл: www/js/screens/meditation.js
jsstateUnsubscribe = AppRuntime.subscribe(MODULE_NAME, (state) => { ... });
// stateUnsubscribe = undefined

// в onExit():
stateUnsubscribe(); // TypeError: stateUnsubscribe is not a function
Последствия:

onExit() бросает ошибку при вызове stateUnsubscribe()
Подписки накапливаются при каждом повторном onEnter() — утечка памяти и множественные ре-рендеры


🔴 ISSUE 2 — Premium bug: isPremium() возвращает true для истёкшего статуса
Файл: www/js/services/user-profile.js
js// getPremiumInfo() выставляет isExpired: true, но:
return {
  ...
  isPremium: status === "premium" || status === "trial" || status === "paid"
  // isExpired не учитывается в isPremium
}

export function isPremium() {
  return getPremiumInfo().isPremium; // true даже при isExpired
}
При status === "premium" с истёкшим premiumExpiresAt — isPremium() возвращает true.

🔴 ISSUE 3 — deactivateExpiredPremium() не очищает кастомные треки
Файл: www/js/services/user-profile.js
jsexport function deactivateExpiredPremium() {
  if (info.isExpired) {
    profile.isPremium = false;
    profile.premiumExpiresAt = null;
    saveProfile(profile);
    return true;
    // med_custom_tracks в localStorage — не трогается
    // IndexedDB (meditationDB) — не трогается
  }
}
Треки физически остаются после деактивации. Нет механизма их блокировки или удаления.

NEED FILES
Для проверки как именно треки рендерятся после деактивации и есть ли premium-гейт при загрузке треков — всё необходимое уже есть в meditation.js. Дополнительные файлы не нужны.
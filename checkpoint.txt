TASK: UI + AUDIO + PREMIUM FIX (Stabilization)
🎯 Goal

Исправить:

темы (color schemes)
медитационный плеер (UI + логика)
загрузку кастомных мелодий
сравнение периодов в Insight
Premium описание
🔴 1. COLOR THEMES НЕ РАБОТАЮТ
PROBLEM:

темы не применяются или сбрасываются

FIX:
FILE: user-profile.js
export function setTheme(theme) {
  const profile = getProfile();
  profile.theme = theme;
  saveProfile(profile);

  applyTheme(theme);

  document.dispatchEvent(new Event("themeChanged"));
}
FILE: app.js
document.addEventListener("DOMContentLoaded", () => {
  const profile = getProfile();
  applyTheme(profile.theme || "default");
});
FILE: theme.js (или где стили)
export function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}
CSS (обязательно проверить)
body[data-theme="dark"] { ... }
body[data-theme="calm"] { ... }
❗ REQUIREMENT:
темы сохраняются после перезапуска
применяются сразу без reload
🔴 2. МЕДИТАЦИЯ — ПЛЕЕР СЛОМАН (UI)
PROBLEMS:
кнопка play уехала вниз
названия не по центру
список ломает layout
FIX (CSS)
FILE: meditation.css (или общий)
.track-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
}

.track-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
}

.track-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-btn {
  flex-shrink: 0;
}
❗ REQUIREMENT:
кнопка play НЕ двигается при добавлении треков
названия по центру
список скроллится, а не ломает layout
🔴 3. LOOP / NEXT НЕ РАБОТАЕТ ПРИ ВЫКЛЮЧЕННОМ ЭКРАНЕ
PROBLEM:

Audio останавливается при background

FIX:
FILE: meditation.js
audio.addEventListener("ended", () => {
  if (isLoop) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNextTrack();
  }
});
❗ ВАЖНО (Android WebView):

Добавить:

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && audio && isPlaying) {
    audio.play().catch(() => {});
  }
});
⚠️ LIMITATION:
полный background audio в WebView ограничен
это “best effort fix”
🔴 4. КАСТОМНЫЕ МЕЛОДИИ НЕ ДОБАВЛЯЮТСЯ
PROBLEM:

файл выбирается, но не появляется

FIX:
FILE: meditation.js
input.onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert(t("med_file_too_large"));
    return;
  }

  const reader = new FileReader();

  reader.onload = function(ev) {
    const tracks = JSON.parse(localStorage.getItem("custom_tracks") || "[]");

    tracks.push({
      name: file.name,
      data: ev.target.result
    });

    localStorage.setItem("custom_tracks", JSON.stringify(tracks));

    renderTracks(); // ОБЯЗАТЕЛЬНО
  };

  reader.readAsDataURL(file);
};
❗ REQUIREMENT:
после выбора файл сразу появляется
сохраняется после перезапуска
🔴 5. INSIGHT — НЕТ СРАВНЕНИЯ ПЕРИОДОВ
PROBLEM:

есть только 365 дней

🎯 НУЖНО:

Добавить сравнение:

7 vs предыдущие 7
30 vs предыдущие 30
90 vs предыдущие 90
FIX (логика)
FILE: insight.js
function getPeriodComparison(days) {
  const now = Date.now();

  const current = history.filter(e => 
    now - e.time <= days * 86400000
  );

  const prev = history.filter(e =>
    now - e.time > days * 86400000 &&
    now - e.time <= days * 2 * 86400000
  );

  return {
    currentAvg: avg(current),
    prevAvg: avg(prev)
  };
}
UI:
const cmp = getPeriodComparison(selectedTimeRange);

const diff = cmp.currentAvg - cmp.prevAvg;
❗ REQUIREMENT:
пользователь реально видит “лучше/хуже”
работает для 7 / 30 / 90
🔴 6. PREMIUM — ДОБАВИТЬ ЦЕННОСТЬ
PROBLEM:

не показано что входит

FIX:
FILE: premium.js

Добавить:

✔ Цветовые схемы
✔ До 5 своих мелодий для медитации
✔ Расширенная аналитика
✔ Полная история
✔ Авто-бэкап
i18n ключи:
premium_feature_themes
premium_feature_custom_tracks
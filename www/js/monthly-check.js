// =====================================
// MoodOS Monthly Med Check
// Мягкая ежемесячная проверка
// =====================================
import {
  getProfile,
  saveProfile,
  shouldShowMonthlyCheck,
  markMonthlyCheckDone
} from "./services/user-profile.js";

export function maybeShowMonthlyCheck() {
  if (!shouldShowMonthlyCheck()) return;

  const profile = getProfile();
  if (!profile) return;

  // Небольшая задержка — не сразу при открытии
  setTimeout(() => showCheck(profile), 2500);
}

function showCheck(profile) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 500;
    display: flex;
    align-items: flex-end;
  `;

  overlay.innerHTML = `
    <style>
      .check-sheet {
        width: 100%;
        background: #e0e5ec;
        border-radius: 24px 24px 0 0;
        padding: 28px 24px 48px;
        box-sizing: border-box;
        animation: checkSlide 0.35s ease;
      }
      @keyframes checkSlide {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      .check-icon { font-size: 36px; margin-bottom: 12px; }
      .check-title {
        font-size: 18px; font-weight: 700; color: #3d3d3d;
        margin-bottom: 8px;
      }
      .check-text {
        font-size: 14px; color: #888; line-height: 1.6;
        margin-bottom: 24px;
      }
      .check-btn {
        width: 100%;
        padding: 15px;
        border: none; border-radius: 16px;
        background: #e0e5ec;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        font-size: 15px; font-weight: 700; color: #7eb8d4;
        cursor: pointer;
        margin-bottom: 10px;
        -webkit-tap-highlight-color: transparent;
      }
      .check-btn-no {
        width: 100%;
        padding: 12px;
        border: none; background: none;
        font-size: 14px; color: #bbb;
        cursor: pointer;
      }
      .check-btn-stop {
        width: 100%;
        padding: 12px;
        border: none; background: none;
        font-size: 14px; color: #e05555;
        cursor: pointer;
        margin-top: 4px;
      }
    </style>

    <div class="check-sheet">
      <div class="check-icon">💊</div>
      <div class="check-title">Небольшой вопрос</div>
      <div class="check-text">
        Прошёл месяц. Ты всё ещё принимаешь
        <strong style="color:#555;">${medLabel(profile.takesMeds)}</strong>?<br><br>
        Это важно — я учитываю это при анализе твоего состояния.
      </div>

      <button class="check-btn" id="checkYes">Да, всё так же</button>
      <button class="check-btn" id="checkChanged">Кое-что изменилось</button>
      <button class="check-btn-stop" id="checkStop">Больше не принимаю</button>
      <button class="check-btn-no" id="checkLater">Напомни позже</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Да, всё так же
  overlay.querySelector("#checkYes").addEventListener("click", () => {
    markMonthlyCheckDone();
    close();
  });

  // Изменилось — открываем настройки
  overlay.querySelector("#checkChanged").addEventListener("click", () => {
    markMonthlyCheckDone();
    close();
    // Небольшая задержка перед открытием настроек
    setTimeout(() => {
      const settingsBtn = document.querySelector('[data-nav="settings"]');
      if (settingsBtn) settingsBtn.click();
      else {
        // Открываем через меню
        const menuBtn = document.getElementById("hamburgerBtn");
        if (menuBtn) menuBtn.click();
      }
    }, 300);
  });

  // Больше не принимаю
  overlay.querySelector("#checkStop").addEventListener("click", () => {
    const updated = { ...profile, takesMeds: "нет", medEffect: null, medReminder: null };
    saveProfile(updated);
    markMonthlyCheckDone();
    close();
  });

  // Позже — просто закрываем, не помечаем выполненным
  overlay.querySelector("#checkLater").addEventListener("click", () => {
    close();
  });

  function close() {
    overlay.style.transition = "opacity 0.3s";
    overlay.style.opacity    = "0";
    setTimeout(() => overlay.remove(), 300);
  }
}

function medLabel(type) {
  const labels = {
    "антидепрессанты": "антидепрессанты",
    "седативные":      "седативные",
    "другое":          "лекарства",
  };
  return labels[type] || "лекарства";
}

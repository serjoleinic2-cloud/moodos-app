// =====================================
// MoodOS Settings Screen
// =====================================
import {
  getProfile,
  saveProfile,
  saveMedReminder,
  removeMedReminder,
  getMedReminder,
  markOnboardingDone
} from "../services/user-profile.js";

export function onEnter() {
  const container = document.getElementById("stability-content");
  // Settings использует свой контейнер
  const el = document.querySelector('[data-screen="settings"]');
  if (!el) return;
  el.innerHTML = renderSettings();
  bindEvents(el);
}

function renderSettings() {
  const profile    = getProfile();
  const reminder   = getMedReminder();
  const takesMeds  = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";

  const medLabels = {
    "нет":             "Не принимаю",
    "антидепрессанты": "Антидепрессанты",
    "седативные":      "Седативные / успокоительные",
    "другое":          "Другое",
    "не_скажу":        "Не указано",
  };

  const effectLabels = {
    "лучше":           "Стало лучше",
    "примерно_так_же": "Примерно так же",
    "приглушённость":  "Чувствую приглушённость",
    "побочки":         "Есть побочки",
    "адаптация":       "Ещё подбираем дозировку",
  };

  const reminderLabels = {
    "нет":   "Без напоминания",
    "утро":  "Утром (8:00)",
    "день":  "Днём (13:00)",
    "вечер": "Вечером (20:00)",
  };

  return `
    <style>
      .settings-wrap {
        padding: 20px 16px 100px;
        font-family: -apple-system, 'SF Pro Display', sans-serif;
      }
      .settings-title {
        font-size: 22px; font-weight: 700; color: #3d3d3d;
        margin-bottom: 24px;
      }
      .settings-section {
        margin-bottom: 28px;
      }
      .settings-section-label {
        font-size: 11px; font-weight: 700;
        letter-spacing: 1.2px; text-transform: uppercase;
        color: #b0b8c4; margin-bottom: 10px; padding-left: 4px;
      }
      .neo-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #e0e5ec;
        border-radius: 18px;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        margin-bottom: 10px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .neo-row:active {
        box-shadow: inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff;
      }
      .neo-row-label {
        font-size: 15px; color: #555; font-weight: 500;
      }
      .neo-row-value {
        font-size: 13px; color: #aaa;
      }
      .neo-row-icon {
        font-size: 18px; margin-right: 12px;
      }
      .neo-row-left {
        display: flex; align-items: center;
      }

      /* МОДАЛКА РЕДАКТИРОВАНИЯ */
      .health-modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 200;
        display: flex; align-items: flex-end;
      }
      .health-modal {
        width: 100%;
        background: #e0e5ec;
        border-radius: 24px 24px 0 0;
        padding: 24px 20px 48px;
        box-sizing: border-box;
        animation: slideUp 0.35s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      .modal-title {
        font-size: 18px; font-weight: 700; color: #3d3d3d;
        margin-bottom: 6px;
      }
      .modal-subtitle {
        font-size: 13px; color: #aaa; margin-bottom: 20px;
      }
      .modal-options {
        display: flex; flex-direction: column; gap: 8px;
        margin-bottom: 20px;
      }
      .modal-option {
        padding: 13px 16px;
        border-radius: 14px;
        background: #e0e5ec;
        box-shadow: 4px 4px 9px #b8bec7, -4px -4px 9px #ffffff;
        font-size: 15px; color: #555;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: box-shadow 0.15s, color 0.15s;
      }
      .modal-option.selected {
        box-shadow: inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff;
        color: #7eb8d4; font-weight: 600;
      }
      .modal-save-btn {
        width: 100%;
        padding: 15px;
        border: none; border-radius: 16px;
        background: #e0e5ec;
        box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
        font-size: 16px; font-weight: 700; color: #7eb8d4;
        cursor: pointer;
      }
      .modal-cancel {
        width: 100%;
        padding: 12px;
        text-align: center;
        font-size: 14px; color: #bbb;
        cursor: pointer;
        margin-top: 8px;
      }
    </style>

    <div class="settings-wrap">
      <div class="settings-title">Настройки</div>

      <!-- ЗДОРОВЬЕ -->
      <div class="settings-section">
        <div class="settings-section-label">Здоровье и самочувствие</div>

        <div class="neo-row" id="settingMeds">
          <div class="neo-row-left">
            <span class="neo-row-icon">💊</span>
            <span class="neo-row-label">Приём лекарств</span>
          </div>
          <span class="neo-row-value">
            ${profile ? (medLabels[profile.takesMeds] || "Не указано") : "Не указано"} ›
          </span>
        </div>

        ${takesMeds ? `
        <div class="neo-row" id="settingEffect">
          <div class="neo-row-left">
            <span class="neo-row-icon">🔍</span>
            <span class="neo-row-label">Как влияет</span>
          </div>
          <span class="neo-row-value">
            ${profile ? (effectLabels[profile.medEffect] || "Не указано") : "Не указано"} ›
          </span>
        </div>

        <div class="neo-row" id="settingReminder">
          <div class="neo-row-left">
            <span class="neo-row-icon">⏰</span>
            <span class="neo-row-label">Напоминание о приёме</span>
          </div>
          <span class="neo-row-value">
            ${reminder?.active ? (reminderLabels[profile?.medReminder] || "Включено") : "Выключено"} ›
          </span>
        </div>
        ` : ""}
      </div>

      <!-- ПРИЛОЖЕНИЕ -->
      <div class="settings-section">
        <div class="settings-section-label">Приложение</div>

        <div class="neo-row" id="settingBaseFeeling">
          <div class="neo-row-left">
            <span class="neo-row-icon">🎯</span>
            <span class="neo-row-label">Базовое состояние</span>
          </div>
          <span class="neo-row-value">
            ${profile?.moodBaseline ?? 50}% ›
          </span>
        </div>

      </div>

    </div>
  `;
}

function bindEvents(el) {
  // Лекарства
  el.querySelector("#settingMeds")?.addEventListener("click", () => {
    showModal({
      title:    "Приём лекарств",
      subtitle: "Это помогает мне правильно читать твои данные",
      field:    "takesMeds",
      options: [
        { value: "нет",             label: "🙅 Не принимаю" },
        { value: "антидепрессанты", label: "💙 Антидепрессанты" },
        { value: "седативные",      label: "🌙 Седативные / успокоительные" },
        { value: "другое",          label: "💊 Другое" },
        { value: "не_скажу",        label: "🔒 Предпочитаю не говорить" },
      ]
    });
  });

  // Эффект
  el.querySelector("#settingEffect")?.addEventListener("click", () => {
    showModal({
      title:    "Как влияет препарат",
      subtitle: "Помогает правильно интерпретировать твои оценки",
      field:    "medEffect",
      options: [
        { value: "лучше",           label: "✨ Стало лучше" },
        { value: "примерно_так_же", label: "➡️ Примерно так же" },
        { value: "приглушённость",  label: "🔇 Чувствую приглушённость" },
        { value: "побочки",         label: "⚡ Есть побочки — терплю" },
        { value: "адаптация",       label: "⏳ Ещё подбираем дозировку" },
      ]
    });
  });

  // Напоминалка
  el.querySelector("#settingReminder")?.addEventListener("click", () => {
    showModal({
      title:    "Напоминание о приёме",
      subtitle: "Мягкое напоминание раз в день",
      field:    "medReminder",
      options: [
        { value: "нет",   label: "🙅 Без напоминания" },
        { value: "утро",  label: "🌅 Утром (8:00)" },
        { value: "день",  label: "☀️ Днём (13:00)" },
        { value: "вечер", label: "🌙 Вечером (20:00)" },
      ],
      onSave: (value) => {
        const times = { утро: "08:00", день: "13:00", вечер: "20:00" };
        if (times[value]) saveMedReminder(times[value]);
        else removeMedReminder();
      }
    });
  });

  // Базовое состояние — слайдер
  el.querySelector("#settingBaseFeeling")?.addEventListener("click", () => {
    showBaselineModal();
  });
}

// ---- МОДАЛКА ВЫБОРА ----
function showModal({ title, subtitle, field, options, onSave }) {
  const profile  = getProfile() || {};
  const current  = profile[field];

  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">${title}</div>
      <div class="modal-subtitle">${subtitle}</div>
      <div class="modal-options">
        ${options.map(o => `
          <div class="modal-option ${o.value === current ? 'selected' : ''}"
               data-value="${o.value}">
            ${o.label}
          </div>
        `).join('')}
      </div>
      <button class="modal-save-btn" id="modalSave">Сохранить</button>
      <div class="modal-cancel" id="modalCancel">Отмена</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Выбор
  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => {
      overlay.querySelectorAll(".modal-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      selected = opt.dataset.value;
    });
  });

  // Сохранить
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    if (selected) {
      const updated = { ...profile, [field]: selected };
      saveProfile(updated);
      if (onSave) onSave(selected);
    }
    overlay.remove();
    // Перерисовываем настройки
    const el = document.querySelector('[data-screen="settings"]');
    if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
  });

  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

// ---- МОДАЛКА СЛАЙДЕРА ----
function showBaselineModal() {
  const profile = getProfile() || {};
  const current = profile.moodBaseline ?? 50;

  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">Базовое состояние</div>
      <div class="modal-subtitle">
        Это моя точка отсчёта — я считаю изменения относительно неё
      </div>
      <div style="
        background:#e0e5ec;
        border-radius:16px;
        box-shadow:inset 3px 3px 7px #b8bec7,inset -3px -3px 7px #ffffff;
        padding:20px;
        margin-bottom:20px;
      ">
        <div style="text-align:center; font-size:28px; font-weight:800; color:#555; margin-bottom:12px;">
          <span id="baselineVal">${current}%</span>
        </div>
        <input type="range" id="baselineSlider" min="0" max="100" value="${current}"
          style="width:100%; accent-color:#7eb8d4;">
      </div>
      <button class="modal-save-btn" id="modalSave">Сохранить</button>
      <div class="modal-cancel" id="modalCancel">Отмена</div>
    </div>
  `;

  document.body.appendChild(overlay);

  const slider = overlay.querySelector("#baselineSlider");
  const val    = overlay.querySelector("#baselineVal");
  slider.addEventListener("input", () => { val.textContent = slider.value + "%"; });

  overlay.querySelector("#modalSave").addEventListener("click", () => {
    const updated = { ...profile, moodBaseline: Number(slider.value) };
    saveProfile(updated);
    overlay.remove();
    const el = document.querySelector('[data-screen="settings"]');
    if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
  });

  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

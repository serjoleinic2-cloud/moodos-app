// =====================================
// MoodOS Settings Screen
// =====================================

import { getProfile, saveProfile, saveMedReminder, removeMedReminder, getMedReminder } from "../services/user-profile.js";
import { showPdfReportModal } from "./pdf-report.js";
import { t, getLang, setLang, LANG_OPTIONS } from "../i18n.js";
import { backupAndShare, restoreFromBackup, isSignedIn, clearToken, getLastBackupTime, getClientId, saveClientId } from "../services/drive-backup.js";

export function onEnter() {
  const el = document.querySelector('[data-screen="settings"]');
  if (!el) return;
  el.innerHTML = renderSettings();
  bindEvents(el);
}

function formatBackupTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function renderSettings() {
  const profile   = getProfile();
  const reminder  = getMedReminder();
  const takesMeds = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
  const signedIn  = isSignedIn();
  const lastTime  = getLastBackupTime();
  const clientId  = getClientId();

  const medLabels = {
    "нет":             t("med_no"),
    "антидепрессанты": t("med_anti"),
    "седативные":      t("med_sed"),
    "другое":          t("med_other"),
    "не_скажу":        t("med_not_said"),
  };
  const effectLabels = {
    "лучше":           t("effect_better"),
    "примерно_так_же": t("effect_same"),
    "приглушённость":  t("effect_numb"),
    "побочки":         t("effect_side"),
    "адаптация":       t("effect_adapt"),
  };
  const reminderLabels = {
    "нет":   t("reminder_no"),
    "утро":  t("reminder_morning"),
    "день":  t("reminder_day"),
    "вечер": t("reminder_evening"),
  };

  const driveStatus = signedIn
    ? `<span style="color:#4caf87;">✓ Google Drive</span>${lastTime ? `<br><span style="font-size:11px;color:#aaa;">последний: ${formatBackupTime(lastTime)}</span>` : ""}`
    : (clientId ? "Войти ›" : "Настроить ›");

  return `
    <style>
      .settings-wrap { padding: 20px 16px 100px; font-family: -apple-system, 'SF Pro Display', sans-serif; }
      .settings-title { font-size: 22px; font-weight: 700; color: #3d3d3d; margin-bottom: 24px; }
      .settings-section { margin-bottom: 28px; }
      .settings-section-label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #b0b8c4; margin-bottom: 10px; padding-left: 4px; }
      .neo-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(232,237,230,0.9); border-radius: 18px; box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff; margin-bottom: 10px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .neo-row:active { box-shadow: inset 4px 4px 8px #b8c4b4, inset -4px -4px 8px #ffffff; }
      .neo-row-label { font-size: 15px; color: #555; font-weight: 500; }
      .neo-row-value { font-size: 13px; color: #aaa; text-align: right; line-height: 1.4; flex-shrink: 0; margin-left: 8px; }
      .neo-row-icon { font-size: 18px; margin-right: 12px; flex-shrink: 0; }
      .neo-row-left { display: flex; align-items: center; flex: 1; min-width: 0; }
      .neo-row-texts { flex: 1; min-width: 0; }
      .neo-row-sub { font-size: 12px; color: #aaa; margin-top: 2px; }
      .health-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: flex-end; }
      .health-modal { width: 100%; background: linear-gradient(160deg,#d4ede8,#e8e0d5); border-radius: 24px 24px 0 0; padding: 24px 20px 32px; max-height: 80vh; overflow-y: auto; box-sizing: border-box; animation: slideUp 0.35s ease; }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .modal-title { font-size: 18px; font-weight: 700; color: #3d3d3d; margin-bottom: 6px; }
      .modal-subtitle { font-size: 13px; color: #aaa; margin-bottom: 20px; }
      .modal-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      .modal-option { padding: 13px 16px; border-radius: 14px; background: rgba(232,237,230,0.9); box-shadow: 4px 4px 9px #b8c4b4, -4px -4px 9px #ffffff; font-size: 15px; color: #555; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: box-shadow 0.15s, color 0.15s; }
      .modal-option.selected { box-shadow: inset 3px 3px 7px #b8c4b4, inset -3px -3px 7px #ffffff; color: #7eb8d4; font-weight: 600; }
      .modal-save-btn { width: 100%; padding: 15px; border: none; border-radius: 16px; background: rgba(232,237,230,0.9); box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff; font-size: 16px; font-weight: 700; color: #7eb8d4; cursor: pointer; margin-bottom: 0; }
      .modal-cancel { width: 100%; padding: 12px; text-align: center; font-size: 14px; color: #bbb; cursor: pointer; margin-top: 8px; }
      .neo-input { width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 14px; border: none; background: rgba(232,237,230,0.9); box-shadow: inset 3px 3px 7px #b8c4b4, inset -3px -3px 7px #ffffff; font-size: 14px; color: #555; font-family: monospace; outline: none; }
    </style>

    <div class="settings-wrap">
      <div class="settings-title">${t("settings_title")}</div>

      <!-- ЗДОРОВЬЕ -->
      <div class="settings-section">
        <div class="settings-section-label">${t("settings_health")}</div>

        <div class="neo-row" id="settingMeds">
          <div class="neo-row-left">
            <span class="neo-row-icon">💊</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_meds_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">${medLabels[profile?.takesMeds] || t("med_not_said")} ›</span>
        </div>

        ${takesMeds ? `
        <div class="neo-row" id="settingEffect">
          <div class="neo-row-left">
            <span class="neo-row-icon">🔍</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_effect_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">${effectLabels[profile?.medEffect] || t("med_not_said")} ›</span>
        </div>

        <div class="neo-row" id="settingReminder">
          <div class="neo-row-left">
            <span class="neo-row-icon">⏰</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_reminder_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">${reminder?.active ? (reminderLabels[profile?.medReminder] || t("settings_reminder_on")) : t("settings_reminder_off")} ›</span>
        </div>
        ` : ""}
      </div>

      <!-- ПРИЛОЖЕНИЕ -->
      <div class="settings-section">
        <div class="settings-section-label">${t("settings_app")}</div>

        <div class="neo-row" id="settingBaseFeeling">
          <div class="neo-row-left">
            <span class="neo-row-icon">🎯</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_baseline_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">${profile?.moodBaseline ?? 50}% ›</span>
        </div>

        <div class="neo-row" id="settingLanguage">
          <div class="neo-row-left">
            <span class="neo-row-icon">🌍</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_language_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">
            ${LANG_OPTIONS.find(l => l.code === getLang())?.flag || "🌍"}
            ${LANG_OPTIONS.find(l => l.code === getLang())?.label || "Русский"} ›
          </span>
        </div>
      </div>

      <!-- ДАННЫЕ -->
      <div class="settings-section">
        <div class="settings-section-label">${t("settings_data")}</div>

        <div class="neo-row" id="settingPdfReport">
          <div class="neo-row-left">
            <span class="neo-row-icon">📄</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">${t("settings_pdf_label")}</div>
            </div>
          </div>
          <span class="neo-row-value">PDF ›</span>
        </div>

        <div class="neo-row" id="settingDrive">
          <div class="neo-row-left">
            <span class="neo-row-icon">☁️</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">Google Drive</div>
              <div class="neo-row-sub">Автосохранение раз в сутки</div>
            </div>
          </div>
          <span class="neo-row-value" id="driveStatus">${driveStatus}</span>
        </div>

        <div class="neo-row" id="settingBackup">
          <div class="neo-row-left">
            <span class="neo-row-icon">💾</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">Сохранить сейчас</div>
              <div class="neo-row-sub">Создать резервную копию</div>
            </div>
          </div>
          <span class="neo-row-value" id="backupStatus">Экспорт ›</span>
        </div>

        <div class="neo-row" id="settingRestore">
          <div class="neo-row-left">
            <span class="neo-row-icon">📥</span>
            <div class="neo-row-texts">
              <div class="neo-row-label">Восстановить данные</div>
              <div class="neo-row-sub">Загрузить из файла .json</div>
            </div>
          </div>
          <span class="neo-row-value">›</span>
        </div>

        <input type="file" id="restoreFileInput" accept=".json" style="display:none;">
      </div>

    </div>
  `;
}

function bindEvents(el) {
  el.querySelector("#settingMeds")?.addEventListener("click", () => {
    showModal({ title: t("meds_intake"), subtitle: t("settings_meds_subtitle"), field: "takesMeds",
      options: [
        { value: "нет",             label: t("ob_meds_no") },
        { value: "антидепрессанты", label: t("ob_meds_anti") },
        { value: "седативные",      label: t("ob_meds_sed") },
        { value: "другое",          label: t("ob_meds_other") },
        { value: "не_скажу",        label: t("ob_meds_skip") },
      ]
    });
  });

  el.querySelector("#settingEffect")?.addEventListener("click", () => {
    showModal({ title: t("settings_effect_title"), subtitle: t("settings_effect_subtitle"), field: "medEffect",
      options: [
        { value: "лучше",           label: t("ob_effect_better") },
        { value: "примерно_так_же", label: t("ob_effect_same") },
        { value: "приглушённость",  label: t("ob_effect_numb") },
        { value: "побочки",         label: t("ob_effect_side") },
        { value: "адаптация",       label: t("ob_effect_adapt") },
      ]
    });
  });

  el.querySelector("#settingReminder")?.addEventListener("click", () => {
    showModal({ title: t("med_reminder"), subtitle: t("settings_reminder_subtitle"), field: "medReminder",
      options: [
        { value: "нет",   label: t("ob_reminder_no") },
        { value: "утро",  label: t("ob_reminder_morning") },
        { value: "день",  label: t("ob_reminder_day") },
        { value: "вечер", label: t("ob_reminder_evening") },
      ],
      onSave: (value) => {
        const times = { утро: "08:00", день: "13:00", вечер: "20:00" };
        if (times[value]) saveMedReminder(times[value]);
        else removeMedReminder();
      }
    });
  });

  el.querySelector("#settingBaseFeeling")?.addEventListener("click", showBaselineModal);
  el.querySelector("#settingPdfReport")?.addEventListener("click", () => showPdfReportModal());
  el.querySelector("#settingLanguage")?.addEventListener("click", () => showLanguageModal());

  // ── Google Drive ──
  el.querySelector("#settingDrive")?.addEventListener("click", () => showDriveModal());

  // ── Сохранить сейчас ──
  el.querySelector("#settingBackup")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("backupStatus");
    if (statusEl) statusEl.textContent = "⏳ Создаю...";

    const result = await backupAndShare();

    if (!statusEl) return;
    if (result.message === "cancelled") {
      statusEl.textContent = "Экспорт ›";
    } else if (result.message === "need_setup") {
      statusEl.textContent = "Экспорт ›";
      showDriveModal();
    } else if (result.success) {
      const label = result.message === "drive_saved" ? "✅ Сохранено на Drive" : "✅ Файл сохранён";
      statusEl.textContent = label;
      // обновляем статус Drive
      const driveEl = document.getElementById("driveStatus");
      if (driveEl && result.message === "drive_saved") {
        const now = new Date();
        driveEl.innerHTML = `<span style="color:#4caf87;">✓ Google Drive</span><br><span style="font-size:11px;color:#aaa;">последний: ${formatDate(now)}</span>`;
      }
      setTimeout(() => { if (statusEl) statusEl.textContent = "Экспорт ›"; }, 3000);
    } else {
      statusEl.textContent = "❌ Ошибка";
      setTimeout(() => { if (statusEl) statusEl.textContent = "Экспорт ›"; }, 3000);
    }
  });

  // ── Восстановление ──
  const restoreBtn   = el.querySelector("#settingRestore");
  const restoreInput = el.querySelector("#restoreFileInput");
  restoreBtn?.addEventListener("click", () => restoreInput?.click());
  restoreInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showRestoreConfirmModal(file);
    restoreInput.value = "";
  });
}

function formatDate(date) {
  return date.toLocaleDateString("ru-RU") + " " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// ── Модал Google Drive ──────────────────────────────────────────
function showDriveModal() {
  const clientId = getClientId();
  const signedIn = isSignedIn();

  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">☁️ Google Drive</div>
      <div class="modal-subtitle">Автоматическое сохранение данных раз в сутки</div>

      ${signedIn ? `
        <div style="background:rgba(76,175,135,0.15);border-radius:14px;padding:14px;margin-bottom:16px;font-size:14px;color:#4caf87;font-weight:600;">
          ✓ Подключено. Бэкап происходит автоматически.
        </div>
        <button class="modal-save-btn" id="driveBackupNow">💾 Сохранить сейчас</button>
        <button class="modal-save-btn" id="driveSignOut" style="color:#e05555;margin-top:10px;">Отключить аккаунт</button>
      ` : `
        <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:16px;font-size:13px;color:#777;line-height:1.6;">
          Для автосохранения нужен <b>Google Client ID</b>.<br><br>
          1. Открой <b>console.cloud.google.com</b><br>
          2. APIs & Services → Credentials → Create → OAuth 2.0 Client ID<br>
          3. Тип: <b>Web application</b><br>
          4. Разрешённые origins: <code>capacitor://localhost</code> и <code>http://localhost</code><br>
          5. Скопируй Client ID и вставь ниже
        </div>
        <input class="neo-input" id="clientIdInput" placeholder="xxxx.apps.googleusercontent.com" value="${clientId}" style="margin-bottom:14px;">
        <button class="modal-save-btn" id="driveSaveClientId">Сохранить и войти в Google</button>
      `}

      <div class="modal-cancel" id="driveCancel">Закрыть</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#driveCancel")?.addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  if (signedIn) {
    overlay.querySelector("#driveBackupNow")?.addEventListener("click", async () => {
      const btn = overlay.querySelector("#driveBackupNow");
      btn.textContent = "⏳ Сохраняю...";
      btn.disabled = true;
      const result = await backupAndShare();
      btn.textContent = result.success ? "✅ Готово" : "❌ Ошибка";
      setTimeout(() => overlay.remove(), 1500);
      // перерисовываем настройки
      const el = document.querySelector('[data-screen="settings"]');
      if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
    });

    overlay.querySelector("#driveSignOut")?.addEventListener("click", () => {
      clearToken();
      overlay.remove();
      const el = document.querySelector('[data-screen="settings"]');
      if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
    });
  } else {
    overlay.querySelector("#driveSaveClientId")?.addEventListener("click", async () => {
      const input = overlay.querySelector("#clientIdInput");
      const id = input?.value?.trim();
      if (!id) { input.style.boxShadow = "inset 3px 3px 7px #e0b4b4, inset -3px -3px 7px #ffffff"; return; }

      saveClientId(id);
      const btn = overlay.querySelector("#driveSaveClientId");
      btn.textContent = "⏳ Открываю Google...";
      btn.disabled = true;

      const result = await backupAndShare();
      if (result.success) {
        btn.textContent = "✅ Подключено!";
        setTimeout(() => {
          overlay.remove();
          const el = document.querySelector('[data-screen="settings"]');
          if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
        }, 1000);
      } else if (result.message === "cancelled") {
        btn.textContent = "Сохранить и войти в Google";
        btn.disabled = false;
      } else {
        btn.textContent = "❌ Ошибка — проверь Client ID";
        btn.disabled = false;
      }
    });
  }
}

// ── Восстановление ──────────────────────────────────────────────
function showRestoreConfirmModal(file) {
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">📥 Восстановить данные</div>
      <div class="modal-subtitle" style="color:#e05555;">Внимание: текущие данные будут заменены данными из файла!</div>
      <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:20px;font-size:13px;color:#666;">
        📄 ${file.name}
      </div>
      <button class="modal-save-btn" id="restoreConfirm" style="color:#e05555;">Восстановить</button>
      <div class="modal-cancel" id="restoreCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#restoreConfirm").addEventListener("click", async () => {
    const btn = overlay.querySelector("#restoreConfirm");
    btn.textContent = "⏳ Восстанавливаю...";
    btn.disabled = true;
    const result = await restoreFromBackup(file);
    overlay.remove();
    if (result.success) {
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.textContent = "✅ Данные восстановлены";
      document.body.appendChild(msg);
      setTimeout(() => { window.location.href = window.location.href; }, 1500);
    } else {
      alert("Ошибка: " + result.message);
    }
  });

  overlay.querySelector("#restoreCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

// ── Стандартные модалы ──────────────────────────────────────────
function showModal({ title, subtitle, field, options, onSave }) {
  const profile = getProfile() || {};
  const current = profile[field];
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">${title}</div>
      <div class="modal-subtitle">${subtitle}</div>
      <div class="modal-options">
        ${options.map(o => `<div class="modal-option ${o.value === current ? "selected" : ""}" data-value="${o.value}">${o.label}</div>`).join("")}
      </div>
      <button class="modal-save-btn" id="modalSave">${t("save")}</button>
      <div class="modal-cancel" id="modalCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);

  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => {
      overlay.querySelectorAll(".modal-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      selected = opt.dataset.value;
    });
  });

  overlay.querySelector("#modalSave").addEventListener("click", () => {
    if (selected) { const u = { ...profile, [field]: selected }; saveProfile(u); if (onSave) onSave(selected); }
    overlay.remove();
    const el = document.querySelector('[data-screen="settings"]');
    if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function showLanguageModal() {
  const current = getLang();
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">🌍 Язык / Language</div>
      <div class="modal-subtitle">${t("settings_lang_subtitle")}</div>
      <div class="modal-options">
        ${LANG_OPTIONS.map(l => `
          <div class="modal-option ${l.code === current ? "selected" : ""}" data-value="${l.code}">
            <span style="font-size:20px;margin-right:10px;">${l.flag}</span>${l.label}
          </div>`).join("")}
      </div>
      <button class="modal-save-btn" id="modalSave">Сохранить / Save</button>
      <div class="modal-cancel" id="modalCancel">Отмена / Cancel</div>
    </div>`;
  document.body.appendChild(overlay);

  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => {
      overlay.querySelectorAll(".modal-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      selected = opt.dataset.value;
    });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    setLang(selected); overlay.remove();
    setTimeout(() => { window.location.href = window.location.href; }, 100);
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function showBaselineModal() {
  const profile = getProfile() || {};
  const current = profile.moodBaseline ?? 50;
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">${t("settings_baseline_title")}</div>
      <div class="modal-subtitle">${t("settings_baseline_subtitle")}</div>
      <div style="background:rgba(232,237,230,0.9);border-radius:16px;box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #ffffff;padding:20px;margin-bottom:20px;">
        <div style="text-align:center;font-size:28px;font-weight:800;color:#555;margin-bottom:12px;"><span id="baselineVal">${current}%</span></div>
        <input type="range" id="baselineSlider" min="0" max="100" value="${current}" style="width:100%;accent-color:#7eb8d4;">
      </div>
      <button class="modal-save-btn" id="modalSave">${t("save")}</button>
      <div class="modal-cancel" id="modalCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);

  const slider = overlay.querySelector("#baselineSlider");
  const val    = overlay.querySelector("#baselineVal");
  slider.addEventListener("input", () => { val.textContent = slider.value + "%"; });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    saveProfile({ ...profile, moodBaseline: Number(slider.value) });
    overlay.remove();
    const el = document.querySelector('[data-screen="settings"]');
    if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

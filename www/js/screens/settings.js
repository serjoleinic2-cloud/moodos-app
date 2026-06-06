// =====================================
// Neyra Settings Screen
// =====================================

import {
  getProfile,
  saveProfile,
  saveMedReminder,
  removeMedReminder,
  getMedReminder,
  getPremiumInfo,
  getTheme,
  saveTheme,
  setTheme,
  applyTheme,
  isPremium,
} from "../services/user-profile.js";
import { t, getLang, setLang, LANG_OPTIONS } from "../i18n.js";
import { getReminders } from '../services/reminders-service.js';
import { getAllMedalsWithState } from '../services/medals-engine.js';

function st(key, fallback = "") {
  try { const v = t(key); return v || fallback; } catch(e) { return fallback; }
}

function getEarnedCount() {
  try {
    const medals = getAllMedalsWithState();
    return medals.filter(m => m.earned).length;
  } catch(e) { return 0; }
}

function getTotalCount() {
  try {
    return getAllMedalsWithState().length;
  } catch(e) { return 0; }
}

export function onEnter() {
  const el = document.querySelector('[data-screen="settings"]');
  if (!el) return;
  el.innerHTML = renderSettings();
  bindEvents(el);
}

function renderSettings() {
  const profile   = getProfile();
  const reminder  = getMedReminder();
  const takesMeds = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
  const premiumInfo = getPremiumInfo();
  const reminderCount = getReminders().length;
  const hasReminders = reminderCount > 0;

  const medVal    = {нет:t("med_no"),антидепрессанты:t("med_anti"),седативные:t("med_sed"),другое:t("med_other"),не_скажу:t("med_not_said")};
  const effVal    = {лучше:t("effect_better"),примерно_так_же:t("effect_same"),приглушённость:t("effect_numb"),побочки:t("effect_side"),адаптация:t("effect_adapt")};
  const remVal    = {нет:t("settings_reminder_off"),утро:t("reminder_morning"),день:t("reminder_day"),вечер:t("reminder_evening")};
  const langInfo  = LANG_OPTIONS.find(l=>l.code===getLang()) || {flag:"🌍",label:"Русский"};

  const statusLabels = {
    free: t("premium_status_free"),
    premium: t("premium_status_premium")
  };
  const statusColors = {
    free: "#888",
    premium: "#4caf87"
  };
  const premiumStatusLabel = statusLabels[premiumInfo.status] || t("premium_status_free");
  const premiumStatusColor = statusColors[premiumInfo.status] || "#888";
  const showGetPremiumBtn = !premiumInfo.isPremium;

  const themeLabels = {
    "default":      t("theme_default"),
    "purple-blue":  t("theme_purple_blue"),
    "purple-pink":  t("theme_purple_pink"),
    "deep-ocean":   "🌊 Глубокий океан",
  };
  const currentThemeLabel = themeLabels[getTheme()] || themeLabels["default"];

  const medsSection = takesMeds ? (
    '<div class="neo-row" id="settingEffect">' +
      '<div class="neo-row-content">' +
        '<span class="neo-row-icon">🔍</span>' +
        '<div class="neo-row-text">' +
          '<div class="neo-row-label">' + t("settings_effect_label") + '</div>' +
          '<div class="neo-row-sub">' + (effVal[profile.medEffect]||t("not_specified")) + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="neo-row-arrow">›</span>' +
    '</div>' +
    '<div class="neo-row" id="settingReminder">' +
      '<div class="neo-row-content">' +
        '<span class="neo-row-icon">⏰</span>' +
        '<div class="neo-row-text">' +
          '<div class="neo-row-label">' + t("settings_med_reminders_label") + '</div>' +
          '<div class="neo-row-sub">' + reminderCount + ' ' + t("settings_alarms") + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="neo-row-arrow">›</span>' +
    '</div>'
  ) : hasReminders ? (
    '<div class="neo-row" id="settingReminder">' +
      '<div class="neo-row-content">' +
        '<span class="neo-row-icon">⏰</span>' +
        '<div class="neo-row-text">' +
          '<div class="neo-row-label">' + t("settings_med_reminders_label") + '</div>' +
          '<div class="neo-row-sub">' + reminderCount + ' ' + t("settings_alarms") + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="neo-row-arrow">›</span>' +
    '</div>'
  ) : "";

  return `
    <style>
      .settings-wrap{padding:20px 16px 80px;font-family:-apple-system,'SF Pro Display',sans-serif}
      .settings-title{font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:24px}
      .settings-section{margin-bottom:28px}
      .settings-section-label{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b0b8c4;margin-bottom:10px;padding-left:4px}
      .neo-row{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:rgba(232,237,230,0.9);border-radius:18px;box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;margin-bottom:10px;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .neo-row:active{box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff}
      .neo-row-content{display:flex;flex-direction:column;align-items:center;flex:1}
      .neo-row-icon{font-size:20px;margin-bottom:4px}
      .neo-row-text{text-align:center}
      .neo-row-label{font-size:15px;color:#555;font-weight:600}
      .neo-row-sub{font-size:11px;color:#bbb;margin-top:2px}
      .neo-row-value{font-size:11px;color:#bbb;text-align:center;flex-shrink:0;margin-top:2px}
      .neo-row-arrow{flex-shrink:0;margin-left:8px;font-size:18px;color:#bbb}
      .health-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:200;display:flex;align-items:flex-end}
      .health-modal{width:100%;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px calc(90px + env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto;box-sizing:border-box;animation:slideUp .35s ease}
      @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      .modal-title{font-size:18px;font-weight:700;color:#3d3d3d;margin-bottom:6px}
      .modal-subtitle{font-size:13px;color:#aaa;margin-bottom:20px}
      .modal-options{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
      .modal-option{padding:13px 16px;border-radius:14px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #ffffff;font-size:15px;color:#555;cursor:pointer}
      .modal-option.selected{box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #ffffff;color:#7eb8d4;font-weight:600}
      .modal-save-btn{width:100%;padding:15px;border:none;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;font-size:16px;font-weight:700;color:#7eb8d4;cursor:pointer;display:block;box-sizing:border-box}
      .modal-cancel{width:100%;padding:15px;border:none;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;font-size:16px;font-weight:700;color:#aaa;cursor:pointer;display:block;box-sizing:border-box;text-align:center;margin-top:8px}
      .backup-card{background:rgba(210,220,210,0.7);border-radius:16px;padding:16px;margin-bottom:10px}
      .backup-card-title{font-size:14px;font-weight:600;color:#555;margin-bottom:12px}
      .backup-card-btns{display:flex;gap:8px}
      .backup-card-btn{flex:1;padding:10px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;text-align:center;box-sizing:border-box}
      .backup-card-btn:active{opacity:0.8}
      .backup-card-btn.save{background:linear-gradient(145deg,#4caf87,#45a070);color:#fff}
      .backup-card-btn.restore{background:rgba(232,237,230,0.9);color:#555;box-shadow:2px 2px 6px #b8c4b4,-2px -2px 6px #ffffff}
      .backup-card-btn:disabled{opacity:0.5;cursor:not-allowed}
      .backup-card-premium{background:rgba(200,190,220,0.5);border:1px dashed rgba(159,122,234,0.4)}
      .backup-card-premium .backup-card-title{color:#805ad5}
    </style>
    <div class="settings-wrap">
      <div class="settings-title">${t("settings_title")}</div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_health")}</div>
        <div class="neo-row" id="settingMeds">
          <div class="neo-row-content">
            <span class="neo-row-icon">💊</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_meds_label")}</div>
              <div class="neo-row-sub">${medVal[profile?.takesMeds]||t("not_specified")}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        ${medsSection}
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_app")}</div>
        <div class="neo-row" id="settingBaseFeeling">
          <div class="neo-row-content">
            <span class="neo-row-icon">🎯</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_baseline_label")}</div>
              <div class="neo-row-sub">${profile?.moodBaseline??50}%</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        ${premiumInfo.isPremium ? `
        <div class="neo-row" id="settingTheme">
          <div class="neo-row-content">
            <span class="neo-row-icon">🎨</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_theme_label")}</div>
              <div class="neo-row-sub">${currentThemeLabel}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>` : ""}
        <div class="neo-row" id="settingLanguage">
          <div class="neo-row-content">
            <span class="neo-row-icon">🌍</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_language_label")}</div>
              <div class="neo-row-sub">${langInfo.flag} ${langInfo.label}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_data")}</div>
        <div class="neo-row" id="settingPdfReport">
          <div class="neo-row-content">
            <span class="neo-row-icon">📄</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_pdf_label")}</div>
              <div class="neo-row-sub">PDF</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        <input type="file" id="restoreFileInput" accept=".zip,.json,.txt" style="display:none;">
      </div>



      <div class="settings-section">
        <div class="settings-section-label">📦 ${t("backup_section") || "Резервное копирование"}</div>
        
        <div class="backup-card">
          <div class="backup-card-title">${t("backup_data_local")}</div>
          <div class="backup-card-btns">
            <button class="backup-card-btn save" id="btnExportBackup">${t("btn_export")}</button>
            <button class="backup-card-btn restore" id="btnImportBackup">${t("btn_import")}</button>
          </div>
          ${!premiumInfo.isPremium ? `<div style="font-size:10px;color:#805ad5;text-align:center;margin-top:6px;">${t("settings_backup_free_limit")}</div>` : ''}
        </div>
        
        <div class="backup-important-block" style="font-size:13px;color:#555;background:rgba(240,240,240,0.5);border-radius:10px;padding:12px;line-height:1.7;">
          <strong style="font-size:14px;">⚠️ ${t("important") || "Важно"}:</strong><br>
          ${t("settings_backup_info")}
          — ${t("backup_confirm_responsibility_short")}
        </div>
        ${premiumInfo.isPremium 
          ? `<div style="font-size:11px;color:#805ad5;margin-top:8px;">${t("settings_photo_premium_info")}</div>` 
          : `<div style="font-size:11px;color:#888;margin-top:8px;">${t("settings_photo_saved_info")}</div>`}
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("premium_section")}</div>
        <div id="premiumBlock" style="
          background: rgba(232,237,230,0.9);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
          margin-bottom: 10px;
          text-align: center;
        ">
          <div id="premiumStatus" style="font-size:16px;font-weight:700;color:${premiumStatusColor};margin-bottom:4px;">${premiumStatusLabel}</div>
          <div style="font-size:12px;color:#aaa;margin-top:8px;">${premiumInfo.isPremium ? t("premium_unlimited") : t("settings_free_version")}</div>
          ${showGetPremiumBtn ? `<button id="getPremiumBtn" style="
            margin-top:14px;width:100%;padding:13px;border:none;border-radius:14px;
            background:linear-gradient(145deg,#9f7aea,#805ad5);
            box-shadow:5px 5px 10px #c8bfb2,-5px -5px 10px #ffffff;
            font-size:15px;font-weight:600;color:#fff;cursor:pointer;
          ">${t("premium_open_btn")}</button>` : ""}
        </div>
        <div class="neo-row" id="settingMedals">
          <div class="neo-row-content">
            <span class="neo-row-icon">🏅</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("medals_title")}</div>
              <div class="neo-row-sub">${getEarnedCount()} / ${getTotalCount()}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        <div class="neo-row" id="settingHowItWorks">
          <div class="neo-row-content">
            <span class="neo-row-icon">📘</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("how_it_works_title")}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        <div class="neo-row" id="settingDataStorage">
          <div class="neo-row-content">
            <span class="neo-row-icon">💾</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("data_storage_title") || "Хранение данных"}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
      </div>
    </div>
  `;
}

function bindEvents(el) {
  let tapCount = 0;
  const title = document.querySelector('[data-screen="settings"] h1');
  if (title) {
    title.addEventListener("click", async () => {
      tapCount++;
      if (tapCount >= 5) {
        tapCount = 0;
        const { activatePremiumForTesting } = await import("../services/billing-service.js");
        activatePremiumForTesting("premium_yearly");
        alert("DEV: Premium activated!");
      }
    });
  }

  el.querySelector("#settingMeds")?.addEventListener("click", () => {
    showModal({ title: t("meds_intake"), subtitle: t("settings_meds_subtitle"), field: "takesMeds",
      options: [
        { value: "нет", label: t("ob_meds_no") }, { value: "антидепрессанты", label: t("ob_meds_anti") },
        { value: "седативные", label: t("ob_meds_sed") }, { value: "другое", label: t("ob_meds_other") },
        { value: "не_скажу", label: t("ob_meds_skip") },
      ]
    });
  });

  el.querySelector("#settingEffect")?.addEventListener("click", () => {
    showModal({ title: t("settings_effect_title"), subtitle: t("settings_effect_subtitle"), field: "medEffect",
      options: [
        { value: "лучше", label: t("ob_effect_better") }, { value: "примерно_так_же", label: t("ob_effect_same") },
        { value: "приглушённость", label: t("ob_effect_numb") }, { value: "побочки", label: t("ob_effect_side") },
        { value: "адаптация", label: t("ob_effect_adapt") },
      ]
    });
  });

  el.querySelector("#settingReminder")?.addEventListener("click", () => {
    showRemindersModal();
  });

  el.querySelector("#settingBaseFeeling")?.addEventListener("click", showBaselineModal);

  el.querySelector("#settingPdfReport")?.addEventListener("click", () => {
    import("./pdf-report.js")
      .then(m => m.showPdfReportModal())
      .catch(e => console.warn("pdf-report load failed:", e));
  });

  el.querySelector("#settingTheme")?.addEventListener("click", () => showThemeModal());
  el.querySelector("#settingLanguage")?.addEventListener("click", () => showLanguageModal(el));
  el.querySelector("#settingMedals")?.addEventListener("click", () => {
    if (window.navigateTo) window.navigateTo("medals");
  });
  el.querySelector("#settingHowItWorks")?.addEventListener("click", () => {
    if (window.navigateTo) window.navigateTo("howItWorks");
  });
  el.querySelector("#settingDataStorage")?.addEventListener("click", () => {
    if (window.navigateTo) window.navigateTo("dataStorage");
  });
  el.querySelector("#restoreFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    showRestoreConfirmModal(file);
  });

  el.querySelector("#btnExportBackup")?.addEventListener("click", async () => {
    const { isPremium } = await import("../services/user-profile.js");
    
    const isPrem = isPremium();
    let confirmText = "";
    
    if (isPrem) {
      confirmText = `${t("export_premium_title")}\n\n${t("export_premium_list")}\n\n${t("export_premium_subtitle")}`;
    } else {
      confirmText = `${t("export_free_warning_title")}\n\n${t("export_free_warning_text")}`;
    }
    
    const ok = confirm(confirmText);
    if (!ok) return;
    
    const btn = el.querySelector("#btnExportBackup");
    if (btn) { btn.textContent = "⏳"; btn.disabled = true; }
    try {
      const { exportData } = await import("../services/backup-service.js");
      const result = await exportData();
      if (result.success) {
        // Success + alert handled in backup-service.js
      } else if (result.error === 'cooldown' && result.message) {
        alert(result.message);
        if (window.openScreen) {
          setTimeout(() => window.openScreen("paywall"), 500);
        }
      } else {
        showToast("❌ " + (result.error || t("backup_error") || "Ошибка"));
      }
    } catch(e) {
      showToast("❌ " + (t("backup_error") || "Ошибка экспорта"));
    }
    if (btn) { btn.textContent = t("btn_export") || "Экспорт"; btn.disabled = false; }
  });

  el.querySelector("#btnImportBackup")?.addEventListener("click", () => {
    el.querySelector("#restoreFileInput")?.click();
  });

  const getPremiumBtn = el.querySelector("#getPremiumBtn");
  if (getPremiumBtn) {
    getPremiumBtn.addEventListener("click", () => {
      if (window.openScreen) {
        window.openScreen("paywall");
      } else {
        console.error("Navigation not ready");
      }
    });
  }
}

function showPrivacyModal() {
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal" style="max-height:85vh;overflow-y:auto;">
      <div class="modal-title">🔐 ${t("privacy_policy") || "Политика конфиденциальности"}</div>
      <div style="font-size:12px;color:#666;line-height:1.6;padding:0 4px 16px;">
        <p style="margin:0 0 12px;"><strong>📱 ${t("data_storage_title") || "Хранение данных"}</strong><br>
        ${t("data_storage_local") || "Все данные хранятся локально на устройстве."}<br>
        ${t("data_storage_backup") || "Для защиты от потери используйте резервное копирование."}</p>
        
        <p style="margin:0 0 12px;"><strong>📋 ${t("privacy_data_title") || "Какие данные"}</strong><br>
        ${t("privacy_data_text") || "Записи настроения, заметки, история практик, настройки приложения."}</p>
        
        <p style="margin:0;font-size:11px;color:#888;"><a href="#" id="btnTermsFull" style="color:#7eb8d4;">${t("terms_full_policy") || "Условия использования →"}</a> &nbsp; <a href="#" id="btnPrivacyFull" style="color:#7eb8d4;">${t("privacy_full_policy") || "Читать полностью →"}</a></p>
      </div>
      <div class="modal-cancel" id="privacyClose">${t("close") || "Закрыть"}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#privacyClose").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#btnPrivacyFull")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPrivacyInApp();
  });
  overlay.querySelector("#btnTermsFull")?.addEventListener("click", (e) => {
    e.preventDefault();
    showTermsInApp();
  });
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) overlay.remove(); });
}

function refresh() {
  const el = document.querySelector('[data-screen="settings"]');
  if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
}

function showToast(message) {
  const existing = document.querySelector(".backup-toast");
  if (existing) existing.remove();
  
  const toast = document.createElement("div");
  toast.className = "backup-toast";
  toast.style.cssText = "position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;white-space:nowrap;";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function showRestoreConfirmModal(file) {
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">${t("settings_restore_title") || "Восстановление данных"}</div>
      <div class="modal-subtitle" style="color:#e05555;">${t("settings_restore_warn") || "Текущие данные будут заменены!"}</div>
      <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:20px;font-size:13px;color:#666;">📄 ${file.name}</div>
      <button class="modal-save-btn" id="restoreConfirm" style="color:#e05555;">${t("settings_restore_confirm") || "Восстановить"}</button>
      <div class="modal-cancel" id="restoreCancel">${t("cancel") || "Отмена"}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#restoreConfirm").addEventListener("click", async () => {
    const btn = overlay.querySelector("#restoreConfirm");
    btn.textContent = "⏳..."; btn.disabled = true;
    console.log('[SETTINGS] Import started, file:', file.name, file.size);
    const { importData } = await import("../services/backup-service.js");
    const result = await importData(file);
    console.log('[SETTINGS] Import result:', result);
    overlay.remove();
    if (result.success) {
      showToast("✅ " + (result.message || t("settings_restore_success") || "Данные восстановлены"));
      setTimeout(() => { window.location.href = window.location.href; }, 1500);
    } else { 
      showToast("❌ " + (result.error || t("backup_error") || "Ошибка")); 
    }
  });
  overlay.querySelector("#restoreCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function showModal({ title, subtitle, field, options, onSave }) {
  const profile = getProfile() || {};
  const current = profile[field];
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">${title}</div>
      <div class="modal-subtitle">${subtitle}</div>
      <div class="modal-options">${options.map(o=>`<div class="modal-option ${o.value===current?"selected":""}" data-value="${o.value}">${o.label}</div>`).join("")}</div>
      <button class="modal-save-btn" id="modalSave">${t("save")}</button>
      <div class="modal-cancel" id="modalCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);
  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => { overlay.querySelectorAll(".modal-option").forEach(o=>o.classList.remove("selected")); opt.classList.add("selected"); selected=opt.dataset.value; });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    if (selected) { saveProfile({...profile,[field]:selected}); if(onSave) onSave(selected); }
    overlay.remove(); refresh();
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
}

function showLanguageModal(el) {
  const current = getLang();
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">🌍 ${t("settings_language_label")}</div>
      <div class="modal-subtitle">${t("settings_lang_subtitle")}</div>
      <div class="modal-options">${LANG_OPTIONS.map(l=>`<div class="modal-option ${l.code===current?"selected":""}" data-value="${l.code}"><span style="font-size:20px;margin-right:10px;">${l.flag}</span>${l.label}</div>`).join("")}</div>
      <button class="modal-save-btn" id="modalSave">${t("save")}</button>
      <div class="modal-cancel" id="modalCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);
  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => { overlay.querySelectorAll(".modal-option").forEach(o=>o.classList.remove("selected")); opt.classList.add("selected"); selected=opt.dataset.value; });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    setLang(selected); overlay.remove();
    setTimeout(() => { window.location.href = window.location.href; }, 100);
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
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
      <div style="background:rgba(232,237,230,0.9);border-radius:16px;box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #fff;padding:20px;margin-bottom:20px;">
        <div style="text-align:center;font-size:28px;font-weight:800;color:#555;margin-bottom:12px;"><span id="baselineVal">${current}%</span></div>
        <input type="range" id="baselineSlider" min="0" max="100" value="${current}" style="width:100%;accent-color:#7eb8d4;">
      </div>
      <button class="modal-save-btn" id="modalSave">${t("save")}</button>
      <div class="modal-cancel" id="modalCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);
  const slider = overlay.querySelector("#baselineSlider");
  slider.addEventListener("input", () => { overlay.querySelector("#baselineVal").textContent = slider.value+"%"; });
  overlay.querySelector("#modalSave").addEventListener("click", () => { saveProfile({...profile,moodBaseline:Number(slider.value)}); overlay.remove(); refresh(); });
  overlay.querySelector("#modalCancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
}

function showThemeModal() {
  const current = getTheme();
  const premium = isPremium();
  const themes = [
    { value: "default",      label: "🌿 " + t("theme_default") },
    { value: "purple-blue",  label: "💜 " + t("theme_purple_blue") },
    { value: "purple-pink",  label: "🌸 " + t("theme_purple_pink") },
  ];
  
  if (premium) {
    themes.push(
      { value: "warm-sunset", label: t("theme_warm_sunset") },
      { value: "deep-ocean",  label: "🌊 " + t("theme_deep_ocean") }
    );
  }
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">🎨 ${t("settings_theme_label")}</div>
      <div class="modal-subtitle">${t("settings_theme_subtitle")}</div>
      <div class="modal-options">${themes.map(th=>`<div class="modal-option ${th.value===current?"selected":""}" data-value="${th.value}">${th.label}</div>`).join("")}</div>
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
      document.body.setAttribute("data-theme", selected);
    });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    setTheme(selected);
    overlay.remove();
    refresh();
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => {
    document.body.setAttribute("data-theme", current);
    overlay.remove();
  });
  overlay.addEventListener("click", e => {
    if (e.target === overlay) {
      document.body.setAttribute("data-theme", current);
      overlay.remove();
    }
  });
}

export async function showRemindersModal() {
  const { getReminders, addReminder, deleteReminder, toggleReminder, updateReminder } = 
    await import('../services/reminders-service.js');

  const DAYS = ['пн','вт','ср','чт','пт','сб','вс'];
  const DAYS_LABELS = [t('dow_mon'),t('dow_tue'),t('dow_wed'),t('dow_thu'),t('dow_fri'),t('dow_sat'),t('dow_sun')];
  let editingId = null;
  let editSelectedDays = [];

  function renderEditForm(reminder) {
    return `
      <div id="editReminderForm" style="background:rgba(232,237,230,0.9);border-radius:16px;padding:16px;box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #fff;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;color:#3d3d3d;margin-bottom:12px;">${t('reminder_edit_title')}</div>
        <input id="editMedName" type="text" value="${reminder.medName || ''}" placeholder="${t('reminder_med_placeholder')}" style="width:100%;padding:12px 14px;border:none;border-radius:12px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:15px;color:#333;box-sizing:border-box;margin-bottom:12px;">
        <input id="editMedTime" type="time" value="${reminder.time}" style="width:100%;padding:12px 14px;border:none;border-radius:12px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:20px;font-weight:700;color:#3d3d3d;box-sizing:border-box;margin-bottom:12px;">
        <div style="font-size:12px;color:#aaa;margin-bottom:8px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${t('reminder_days')}</div>
        <div id="editDaysContainer" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
          ${DAYS.map((d,i) => {
            const isSelected = reminder.days.includes(d);
            return `<div class="edit-day-btn" data-day="${d}" style="width:38px;height:38px;border-radius:50%;${isSelected ? 'background:linear-gradient(145deg,#7eb8d4,#6aa5c0);color:#fff;box-shadow:inset 2px 2px 5px rgba(0,0,0,0.1);' : 'background:rgba(232,237,230,0.9);box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #fff;color:#888;'}display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;">${DAYS_LABELS[i]}</div>`;
          }).join('')}
        </div>
        <button id="updateReminderBtn" style="width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(145deg,#9f7aea,#805ad5);color:#fff;font-size:15px;font-weight:700;cursor:pointer;">${t('save')}</button>
        <button id="cancelEditBtn" style="width:100%;padding:13px;border:none;border-radius:14px;background:rgba(200,200,200,0.5);color:#666;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">${t('cancel')}</button>
      </div>
    `;
  }

  function renderList() {
    const reminders = getReminders();
    if (reminders.length === 0) {
      return `<div style="text-align:center;color:#bbb;padding:20px;font-size:14px;">
        ${t('reminder_empty') || 'Нет напоминаний'}<br>${t('reminder_empty_hint') || 'Добавьте первое 👇'}
      </div>`;
    }
    return reminders.map(r => `
      <div data-reminder-card="${r.id}" style="
        background:rgba(232,237,230,0.9);
        border-radius:16px;
        padding:14px 16px;
        box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #fff;
        margin-bottom:10px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        box-sizing:border-box;
      ">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-size:26px;font-weight:700;color:#3d3d3d;">${r.time}</div>
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(159,122,234,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;" data-edit="${r.id}">✏️</div>
          </div>
          <div style="font-size:18px;color:#805ad5;font-weight:700;margin-top:4px;word-break:break-word;">
            ${r.medName || t('reminder_medicine_default')}
          </div>
          <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
            ${DAYS.map((d,i) => {
              const isSelected = r.days.includes(d);
              return `<div style="width:26px;height:26px;border-radius:50%;${isSelected ? 'background:linear-gradient(145deg,#7eb8d4,#6aa5c0);color:#fff;' : 'background:rgba(200,200,200,0.3);color:#ccc;'}display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;">${DAYS_LABELS[i]}</div>`;
            }).join('')}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          <div style="
            width:40px;height:22px;border-radius:11px;
            background:${r.active ? '#4caf87' : '#ccc'};
            position:relative;cursor:pointer;transition:background 0.2s;
          " data-toggle="${r.id}">
            <div style="
              width:18px;height:18px;border-radius:50%;background:#fff;
              position:absolute;top:2px;
              ${r.active ? 'right:2px' : 'left:2px'};
              transition:all 0.2s;
              box-shadow:0 1px 3px rgba(0,0,0,0.2);
            "></div>
          </div>
          <div style="
            width:28px;height:28px;border-radius:50%;
            background:rgba(224,85,85,0.15);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;font-size:14px;color:#e05555;
          " data-delete="${r.id}">✕</div>
        </div>
      </div>
    `).join('');
  }

  function renderAddForm() {
    return `
      <div id="addReminderForm" style="
        background:rgba(232,237,230,0.9);
        border-radius:16px;
        padding:16px;
        box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #fff;
        margin-bottom:16px;
        display:none;
      ">
        <div style="font-size:14px;font-weight:700;color:#3d3d3d;margin-bottom:12px;">
          ${t('reminder_add_title') || '➕ Новое напоминание'}
        </div>
        
        <input id="newMedName" type="text" placeholder="${t('reminder_med_placeholder') || 'Название лекарства'}" style="
          width:100%;padding:12px 14px;border:none;border-radius:12px;
          background:rgba(255,255,255,0.8);
          box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;
          font-size:15px;color:#333;box-sizing:border-box;margin-bottom:12px;
        ">
        
        <input id="newMedTime" type="time" value="08:00" style="
          width:100%;padding:12px 14px;border:none;border-radius:12px;
          background:rgba(255,255,255,0.8);
          box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;
          font-size:20px;font-weight:700;color:#3d3d3d;
          box-sizing:border-box;margin-bottom:12px;
        ">
        
        <div style="font-size:12px;color:#aaa;margin-bottom:8px;font-weight:600;
          letter-spacing:0.5px;text-transform:uppercase;">${t('reminder_days') || 'Дни недели'}</div>
        <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
          ${DAYS.map((d,i) => `
            <div class="day-btn" data-day="${d}" style="
              width:38px;height:38px;border-radius:50%;
              background:rgba(232,237,230,0.9);
              box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #fff;
              display:flex;align-items:center;justify-content:center;
              font-size:12px;font-weight:700;color:#888;cursor:pointer;
              transition:all 0.15s;
            ">${DAYS_LABELS[i]}</div>
          `).join('')}
        </div>
        
        <button id="saveReminderBtn" style="
          width:100%;padding:13px;border:none;border-radius:14px;
          background:linear-gradient(145deg,#4caf87,#45a070);
          color:#fff;font-size:15px;font-weight:700;cursor:pointer;
        ">${t('save')}</button>
      </div>
    `;
  }

  const overlay = document.createElement('div');
  overlay.className = 'health-modal-overlay';
  
  // Проверяем звук и показываем баннер если нужно
  const { canPlaySound } = await import('../services/reminders-service.js');
  const hasSound = await canPlaySound();
  
  overlay.innerHTML = `
    <div class="health-modal" style="max-height:85vh;overflow-y:auto;">
      ${!hasSound ? `
      <div id="soundPermBanner" style="background:#fff3e0;border-radius:12px;padding:12px 14px;margin-bottom:14px;border-left:3px solid #f0a500;">
        <div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:4px;">🔔 ${t('sound_prompt_title')}</div>
        <div style="font-size:12px;color:#bf360c;margin-bottom:8px;">${t('sound_prompt_body')}</div>
        <button id="openSoundSettings" style="width:100%;padding:9px;border:none;border-radius:9px;background:#f0a500;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">${t('sound_prompt_open')}</button>
      </div>
      ` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div class="modal-title" style="margin-bottom:0;">⏰ ${t('med_reminder')}</div>
        <button id="addReminderToggle" style="
          padding:8px 14px;border:none;border-radius:12px;
          background:linear-gradient(145deg,#9f7aea,#805ad5);
          color:#fff;font-size:13px;font-weight:700;cursor:pointer;
        ">${t('reminder_add_btn') || '+ Добавить'}</button>
      </div>
      
      ${renderAddForm()}
      
      <div id="editFormContainer"></div>
      
      <div id="remindersList">${renderList()}</div>
      
      <div class="modal-cancel" id="remindersClose">${t('done') || 'Готово'}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Обработчик кнопки открытия настроек
  overlay.querySelector('#openSoundSettings')?.addEventListener('click', () => {
    try {
      const { App } = window.Capacitor?.Plugins || {};
      if (App?.openUrl) {
        App.openUrl({ url: 'app-settings:' });
      } else if (window.Capacitor?.getPlatform() === 'android') {
        window.Capacitor.Plugins.App?.openUrl({ url: 'android.settings.APPLICATION_DETAILS_SETTINGS' });
      }
    } catch(e) {}
});
  
  let selectedDays = [];

  overlay.querySelector('#addReminderToggle').addEventListener('click', () => {
    const form = overlay.querySelector('#addReminderForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  overlay.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.dataset.day;
      if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter(d => d !== day);
        btn.style.background = 'rgba(232,237,230,0.9)';
        btn.style.color = '#888';
        btn.style.boxShadow = '3px 3px 7px #b8c4b4,-3px -3px 7px #fff';
      } else {
        selectedDays.push(day);
        btn.style.background = 'linear-gradient(145deg,#7eb8d4,#6aa5c0)';
        btn.style.color = '#fff';
        btn.style.boxShadow = 'inset 2px 2px 5px rgba(0,0,0,0.1)';
      }
    });
  });

  overlay.querySelector('#saveReminderBtn').addEventListener('click', () => {
    const medName = overlay.querySelector('#newMedName').value.trim();
    const time = overlay.querySelector('#newMedTime').value;
    if (!medName) {
      overlay.querySelector('#newMedName').style.boxShadow = 
        'inset 3px 3px 6px #e8a0a0,inset -3px -3px 6px #fff';
      return;
    }
    if (selectedDays.length === 0) return;
    addReminder({ time, medName, days: selectedDays });
    overlay.querySelector('#remindersList').innerHTML = renderList();
    overlay.querySelector('#addReminderForm').style.display = 'none';
    overlay.querySelector('#newMedName').value = '';
    overlay.querySelector('#newMedTime').value = '08:00';
    overlay.querySelector('#newMedName').style.boxShadow = '';
    selectedDays = [];
    overlay.querySelectorAll('.day-btn').forEach(btn => {
      btn.style.background = 'rgba(232,237,230,0.9)';
      btn.style.color = '#888';
      btn.style.boxShadow = '3px 3px 7px #b8c4b4,-3px -3px 7px #fff';
    });
    refresh();
  });

  overlay.querySelector('#remindersList').addEventListener('click', (e) => {
    const editEl = e.target.closest('[data-edit]');
    const toggleEl = e.target.closest('[data-toggle]');
    const deleteEl = e.target.closest('[data-delete]');
    
    if (editEl) {
      const id = Number(editEl.dataset.edit);
      const reminder = getReminders().find(r => r.id === id);
      if (reminder) {
        editingId = id;
        editSelectedDays = [...reminder.days];
        overlay.querySelector('#addReminderForm').style.display = 'none';
        overlay.querySelector('#editFormContainer').innerHTML = renderEditForm(reminder);
        bindEditFormEvents();
        // Скрыть карточку редактируемого элемента
        const card = overlay.querySelector(`[data-reminder-card="${id}"]`);
        if (card) card.style.display = 'none';
      }
      return;
    }
    
    if (toggleEl) {
      toggleReminder(Number(toggleEl.dataset.toggle));
      overlay.querySelector('#remindersList').innerHTML = renderList();
    }
    if (deleteEl) {
      deleteReminder(Number(deleteEl.dataset.delete));
      overlay.querySelector('#remindersList').innerHTML = renderList();
      refresh();
    }
  });

  function bindEditFormEvents() {
    overlay.querySelectorAll('.edit-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = btn.dataset.day;
        if (editSelectedDays.includes(day)) {
          editSelectedDays = editSelectedDays.filter(d => d !== day);
          btn.style.background = 'rgba(232,237,230,0.9)';
          btn.style.color = '#888';
          btn.style.boxShadow = '3px 3px 7px #b8c4b4,-3px -3px 7px #fff';
        } else {
          editSelectedDays.push(day);
          btn.style.background = 'linear-gradient(145deg,#7eb8d4,#6aa5c0)';
          btn.style.color = '#fff';
          btn.style.boxShadow = 'inset 2px 2px 5px rgba(0,0,0,0.1)';
        }
      });
    });

    overlay.querySelector('#updateReminderBtn').addEventListener('click', () => {
      const medName = overlay.querySelector('#editMedName').value.trim();
      const time = overlay.querySelector('#editMedTime').value;
      if (!medName) {
        overlay.querySelector('#editMedName').style.boxShadow = 'inset 3px 3px 6px #e8a0a0,inset -3px -3px 6px #fff';
        return;
      }
      if (editSelectedDays.length === 0) return;
      updateReminder(editingId, { time, medName, days: editSelectedDays });
      overlay.querySelector('#editFormContainer').innerHTML = '';
      editingId = null;
      overlay.querySelector('#remindersList').innerHTML = renderList();
      refresh();
    });

    overlay.querySelector('#cancelEditBtn').addEventListener('click', () => {
      overlay.querySelector('#editFormContainer').innerHTML = '';
      editingId = null;
      // Восстановить список
      overlay.querySelector('#remindersList').innerHTML = renderList();
    });
  }

  overlay.querySelector('#remindersClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

export function onExit() {
  // cleanup listeners if needed
}

function showPrivacyInApp() {
  const m = document.createElement("div");
  m.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;";
  m.innerHTML = `
    <div style="width:100%;max-height:82vh;overflow-y:auto;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 48px;box-sizing:border-box;animation:slideUp 0.3s ease;">
      <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
      <div style="font-size:18px;font-weight:700;color:#3a3530;margin-bottom:16px;">${t('terms_read_privacy')}</div>
      <div style="font-size:14px;color:#555;line-height:1.7;">
        <h3 style="margin:0 0 8px;color:#3a3530;">1. Overview</h3>
        <p>Neyra is designed with privacy as a core principle. The app works entirely offline and does not use any servers to collect, store, or process your personal data.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">2. Data You Provide</h3>
        <p>All data you enter into Neyra remains on your device, including mood entries, notes (text, voice, images), practice usage data, and insights generated by the app. This data is not transmitted anywhere, not accessible to the developer, and not used for tracking or profiling.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">3. Local Processing</h3>
        <p>All features — including analysis, pattern detection, and recommendations — are performed locally on your device. Neyra does not use cloud processing, external APIs, or third-party AI services.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">4. No Accounts or Tracking</h3>
        <p>No account is required. No tracking is performed. No analytics systems are used.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">5. Third-Party Services</h3>
        <p>Neyra itself does not share your data. Certain technical data may be processed by platform providers such as Google Play (app distribution and subscription payments).</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">6. Payments</h3>
        <p>All purchases are processed via Google Play Billing. Neyra does not have access to your payment information.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">7. Data Storage</h3>
        <p>All data is stored locally on your device. You can delete the app at any time to remove your data.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">8. Your Rights (EU Users)</h3>
        <p>If you are located in the European Union, you have rights under GDPR. Since Neyra does not store data externally, you can fully control your data directly on your device.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">9. Age Requirement</h3>
        <p>Neyra is intended for users aged 18 and older.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">10. Contact</h3>
        <p>ideas@neyra-app.com<br><a href="https://www.neyra-app.com" style="color:#4a7c59;">www.neyra-app.com</a></p>
        <p style="margin-top:20px;font-size:12px;color:#aaa;">Effective date: 20.04.2026</p>
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;margin-top:24px;background:rgba(232,237,230,0.9);box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;font-size:15px;font-weight:700;color:#7eb8d4;cursor:pointer;">✕</button>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
}

function showTermsInApp() {
  const m = document.createElement("div");
  m.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;";
  m.innerHTML = `
    <div style="width:100%;max-height:82vh;overflow-y:auto;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 48px;box-sizing:border-box;animation:slideUp 0.3s ease;">
      <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
      <div style="font-size:18px;font-weight:700;color:#3a3530;margin-bottom:16px;">${t('terms_read_terms')}</div>
      <div style="font-size:14px;color:#555;line-height:1.7;">
        <h3 style="margin:0 0 8px;color:#3a3530;">1. Overview</h3>
        <p>Neyra is a self-reflection and emotional tracking application. By using the app, you agree to these terms.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">2. Not Medical Advice</h3>
        <p>Neyra does not provide medical or psychological advice. All insights are informational only and should not replace professional care.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">3. Local Data Processing</h3>
        <p>All data is processed locally on your device. The developer has no access to your personal data.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">4. Subscriptions</h3>
        <p>Neyra offers optional paid subscriptions billed via Google Play. Subscriptions renew automatically unless canceled. You can manage or cancel subscriptions via your Google Play account.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">5. Limitation of Liability</h3>
        <p>The app is provided "as is". The developer is not responsible for decisions made based on the app's insights.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">6. Acceptable Use</h3>
        <p>You agree to use the app for personal purposes and not attempt to interfere with its functionality.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">7. Termination</h3>
        <p>You may stop using the app at any time by deleting it.</p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">8. Changes</h3>
        <p>We may update these Terms from time to time. Continued use of the app means you accept the updated version. Latest version: <a href="https://www.neyra-app.com" style="color:#4a7c59;">www.neyra-app.com</a></p>
        <h3 style="margin:20px 0 8px;color:#3a3530;">9. Contact</h3>
        <p>ideas@neyra-app.com</p>
        <p style="margin-top:20px;font-size:12px;color:#aaa;">© Neyra</p>
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;margin-top:24px;background:rgba(232,237,230,0.9);box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;font-size:15px;font-weight:700;color:#7eb8d4;cursor:pointer;">✕</button>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
}

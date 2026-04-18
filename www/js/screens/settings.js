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

function st(key, fallback = "") {
  try { const v = t(key); return v || fallback; } catch(e) { return fallback; }
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
    "default":      "🌿 " + t("theme_default"),
    "purple-blue":  "💜 " + t("theme_purple_blue"),
    "purple-pink":  "🌸 " + t("theme_purple_pink"),
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
          '<div class="neo-row-label">' + t("settings_reminder_label") + '</div>' +
          '<div class="neo-row-sub">' + (reminder?.active ? (remVal[profile?.medReminder]||t("settings_reminder_on")) : t("settings_reminder_off")) + '</div>' +
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
        <input type="file" id="restoreFileInput" accept=".zip,.json" style="display:none;">
      </div>



      <div class="settings-section">
        <div class="settings-section-label">📦 ${t("backup_section") || "Резервное копирование"}</div>
        
        <div class="backup-card">
          <div class="backup-card-title">${t("backup_data_local") || "Экспорт данных"}</div>
          <div class="backup-card-btns">
            <button class="backup-card-btn save" id="btnExportBackup">${t("btn_export") || "Экспорт"}</button>
            <button class="backup-card-btn restore" id="btnImportBackup">${t("btn_import") || "Импорт"}</button>
          </div>
          ${!premiumInfo.isPremium ? '<div style="font-size:10px;color:#805ad5;text-align:center;margin-top:6px;">Free: 1 копия в 3 дня • Premium: без ограничений</div>' : ''}
        </div>
        
        <div style="font-size:11px;color:#888;padding:8px 0;line-height:1.6; background:rgba(240,240,240,0.5);border-radius:10px;padding:10px;">
          <strong>⚠️ Важно:</strong><br>
          Данные хранятся только на устройстве.<br>
          Чтобы не потерять:<br>
          — создавайте резервную копию регулярно<br>
          — сохраняйте файл в облаке (Google Drive)<br>
          — вы самостоятельно отвечаете за сохранность копии
        </div>
        ${premiumInfo.isPremium 
          ? '<div style="font-size:11px;color:#805ad5;margin-top:8px;">👑 Фото из альбома «Neyra» включены в резервную копию</div>' 
          : '<div style="font-size:11px;color:#888;margin-top:8px;">📷 Фото сохраняются в альбом «Neyra» в галерее и не удаляются вместе с приложением</div>'}
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
          <div style="font-size:12px;color:#aaa;margin-top:8px;">${premiumInfo.isPremium ? t("premium_unlimited") : "Бесплатная версия"}</div>
          ${showGetPremiumBtn ? `<button id="getPremiumBtn" style="
            margin-top:14px;width:100%;padding:13px;border:none;border-radius:14px;
            background:linear-gradient(145deg,#9f7aea,#805ad5);
            box-shadow:5px 5px 10px #c8bfb2,-5px -5px 10px #ffffff;
            font-size:15px;font-weight:600;color:#fff;cursor:pointer;
          ">${t("premium_open_btn")}</button>` : ""}
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
    showModal({ title: t("med_reminder"), subtitle: t("settings_reminder_subtitle"), field: "medReminder",
      options: [
        { value: "нет", label: t("ob_reminder_no") }, { value: "утро", label: t("ob_reminder_morning") },
        { value: "день", label: t("ob_reminder_day") }, { value: "вечер", label: t("ob_reminder_evening") },
      ],
      onSave: (v) => { const times={утро:"08:00",день:"13:00",вечер:"20:00"}; if(times[v]) saveMedReminder(times[v]); else removeMedReminder(); }
    });
  });

  el.querySelector("#settingBaseFeeling")?.addEventListener("click", showBaselineModal);

  el.querySelector("#settingPdfReport")?.addEventListener("click", () => {
    import("./pdf-report.js")
      .then(m => m.showPdfReportModal())
      .catch(e => console.warn("pdf-report load failed:", e));
  });

  el.querySelector("#settingTheme")?.addEventListener("click", () => showThemeModal());
  el.querySelector("#settingLanguage")?.addEventListener("click", () => showLanguageModal(el));
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
      confirmText = `${t("export_premium_title")}\n\n${t("export_premium_list")}\n\n${t("export_premium_subtitle")}\n\n${t("exit_warning")}`;
    } else {
      confirmText = `${t("export_free_warning_title")}\n\n${t("export_free_warning_text")}\n\n${t("exit_warning")}`;
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
        
        <p style="margin:0;font-size:11px;color:#888;"><a href="#" id="btnPrivacyFull" style="color:#7eb8d4;">${t("privacy_full_policy") || "Читать полностью →"}</a></p>
      </div>
      <div class="modal-cancel" id="privacyClose">${t("close") || "Закрыть"}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#privacyClose").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#btnPrivacyFull")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("docs/PRIVACY.md", "_blank");
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
      { value: "ocean-blue",  label: "🌊 " + t("theme_ocean_blue") },
      { value: "warm-sunset", label: "🌅 " + t("theme_warm_sunset") }
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

export function onExit() {
  // cleanup listeners if needed
}

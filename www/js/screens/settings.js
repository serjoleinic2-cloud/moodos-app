// =====================================
// MoodOS Settings Screen
// =====================================

import {
  getProfile,
  saveProfile,
  saveMedReminder,
  removeMedReminder,
  getMedReminder,
  getPremiumInfo,
  activateTrial,
  getTheme,
  saveTheme,
} from "../services/user-profile.js";
import { getLastBackupTime, getBackupStatus, getSystemBackupState, createBackup, shareBackup } from "../services/drive-backup.js";
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

function fmtTime(d) {
  if (!d) return t("settings_backup_never") || "никогда";
  return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function renderSettings() {
  const profile   = getProfile();
  const reminder  = getMedReminder();
  const takesMeds = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
  const premiumInfo = getPremiumInfo();
  const backupState = getSystemBackupState();

  const medVal    = {нет:t("med_no"),антидепрессанты:t("med_anti"),седативные:t("med_sed"),другое:t("med_other"),не_скажу:t("med_not_said")};
  const effVal    = {лучше:t("effect_better"),примерно_так_же:t("effect_same"),приглушённость:t("effect_numb"),побочки:t("effect_side"),адаптация:t("effect_adapt")};
  const remVal    = {нет:t("settings_reminder_off"),утро:t("reminder_morning"),день:t("reminder_day"),вечер:t("reminder_evening")};
  const langInfo  = LANG_OPTIONS.find(l=>l.code===getLang()) || {flag:"🌍",label:"Русский"};

  const statusLabels = {
    free: t("premium_status_free"),
    trial: t("premium_status_trial"),
    premium: t("premium_status_premium")
  };
  const statusColors = {
    free: "#888",
    trial: "#f59e0b",
    premium: "#4caf87"
  };
  const premiumStatusLabel = statusLabels[premiumInfo.status] || t("premium_status_free");
  const premiumStatusColor = statusColors[premiumInfo.status] || "#888";
  const trialInfo = premiumInfo.status === "trial" 
    ? `<div style="font-size:12px; color:#f59e0b; margin-top:4px;">${t("premium_trial_access")}: ${premiumInfo.trialDaysLeft}</div>` 
    : "";
  const showTrialBtn = premiumInfo.status === "free";

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

  const backupStatus = getBackupStatus();
  const lastBackupDate = backupState.lastBackupAt ? new Date(backupState.lastBackupAt) : null;
  const lastBackupText = lastBackupDate ? fmtTime(lastBackupDate) : (t("settings_backup_never") || "никогда");
  const statusIcon = backupState.pendingChanges ? '⏳' : '✔';
  const statusColor = backupState.pendingChanges ? '#f59e0b' : '#4caf87';

  const autoBackupNote = premiumInfo.isPremium 
    ? `<div style="font-size:11px; color:#888; margin-top:6px;">${t("auto_backup_enabled") || "Автобэкап включён"}</div>`
    : `<div style="font-size:11px; color:#aaa; margin-top:6px;">${t("auto_backup_premium") || "Автобэкап в Premium"}</div>`;

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
      .backup-card{background:rgba(232,237,230,0.9);border-radius:18px;padding:18px;box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;margin-bottom:10px}
      .backup-status{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .backup-status-icon{font-size:18px}
      .backup-status-text{font-size:13px;color:#555}
      .backup-last{font-size:12px;color:#888;margin-bottom:14px}
      .backup-btn{width:100%;padding:12px;border:none;border-radius:12px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px;box-sizing:border-box;text-align:center}
      .backup-btn:active{box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #ffffff}
      .backup-btn-primary{background:linear-gradient(145deg,#4caf87,#45a070);color:#fff;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff}
      .backup-btn-secondary{background:linear-gradient(145deg,#7eb8d4,#6aa8c4);color:#fff;box-shadow:4px 4px 10px #b8c4b4,-4px -4px 10px #ffffff}
      .backup-limit{font-size:11px;color:#aaa;text-align:center;margin-top:10px}
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
        <div class="neo-row" id="settingRestore">
          <div class="neo-row-content">
            <span class="neo-row-icon">📥</span>
            <div class="neo-row-text">
              <div class="neo-row-label">${t("settings_restore_label")}</div>
              <div class="neo-row-sub">${t("settings_restore_hint")}</div>
            </div>
          </div>
          <span class="neo-row-arrow">›</span>
        </div>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none;">
      </div>

      <div class="settings-section">
        <div class="settings-section-label">📦 ${t("backup_section") || "Резервное копирование"}</div>
        <div class="backup-card" id="backupCard">
          <div class="backup-status">
            <span class="backup-status-icon" style="color:${statusColor};">${statusIcon}</span>
            <span class="backup-status-text">${statusIcon === '⏳' ? (t("settings_backup_pending") || "есть изменения") : (t("settings_backup_saved") || "сохранено")}</span>
          </div>
          <div class="backup-last">${t("backup_last") || "Последний backup"}: ${lastBackupText}</div>
          
          <button class="backup-btn" id="btnCreateBackup">
            📋 ${t("btn_create_backup") || "Создать backup"}
          </button>
          
          <button class="backup-btn backup-btn-secondary" id="btnShareBackup">
            ☁️ ${t("btn_share_backup") || "Сохранить в облако"}
          </button>
          
          ${autoBackupNote}
          
          <div class="backup-limit">${t("backup_limit_info") || "Хранится"}: ${backupState.totalBackups}/${backupState.maxBackups}</div>
        </div>
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
          ${trialInfo}
          <div style="font-size:12px;color:#aaa;margin-top:8px;">${premiumInfo.isPremium ? t("premium_unlimited") : t("gemini_limit_reached")}</div>
          ${showTrialBtn ? `<button id="startTrialBtn" style="
            margin-top:14px;width:100%;padding:13px;border:none;border-radius:14px;
            background:linear-gradient(145deg,#fef3c7,#fde68a);
            box-shadow:5px 5px 10px #c8bfb2,-5px -5px 10px #ffffff;
            font-size:15px;font-weight:600;color:#92400e;cursor:pointer;
          ">${t("premium_try_btn")}</button>
          <div style="font-size:11px;color:#92400e;margin-top:6px;text-align:center;">${t("premium_try_desc")}</div>` : ""}
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

  el.querySelector("#settingRestore")?.addEventListener("click", () => el.querySelector("#restoreFileInput")?.click());
  el.querySelector("#restoreFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    showRestoreConfirmModal(file);
  });

  el.querySelector("#btnCreateBackup")?.addEventListener("click", async () => {
    const btn = el.querySelector("#btnCreateBackup");
    if (btn) { btn.textContent = "⏳..."; btn.disabled = true; }
    try {
      const result = createBackup();
      if (result.success) {
        showToast("✅ " + (t("backup_created") || "Backup создан"));
        setTimeout(() => refresh(), 1000);
      } else {
        showToast("❌ " + (t("backup_error") || "Ошибка"));
      }
    } catch(e) {
      showToast("❌ " + (t("backup_error") || "Ошибка"));
    }
    if (btn) { btn.textContent = "📋 " + (t("btn_create_backup") || "Создать backup"); btn.disabled = false; }
  });

  el.querySelector("#btnShareBackup")?.addEventListener("click", async () => {
    const btn = el.querySelector("#btnShareBackup");
    if (btn) { btn.textContent = "⏳..."; btn.disabled = true; }
    try {
      const result = await shareBackup();
      if (result.message === "cancelled") {
        showToast(t("backup_cancelled") || "Отменено");
      } else if (result.success) {
        showToast("✅ " + (result.message === "shared" ? (t("backup_shared") || "Отправлено") : (t("backup_downloaded") || "Скачано")));
      } else {
        showToast("❌ " + (t("backup_error") || "Ошибка"));
      }
    } catch(e) {
      showToast("❌ " + (t("backup_error") || "Ошибка"));
    }
    if (btn) { btn.textContent = "☁️ " + (t("btn_share_backup") || "Сохранить в облако"); btn.disabled = false; }
  });

  const trialBtn = el.querySelector("#startTrialBtn");
  if (trialBtn) {
    trialBtn.addEventListener("click", () => {
      activateTrial();
      
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.innerHTML = "✅ " + t("premium_access_granted");
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    });
  }

  el.querySelector("#settingHowItWorks")?.addEventListener("click", () => {
    openScreen("howItWorks");
  });
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
      <div class="modal-title">${t("settings_restore_title")}</div>
      <div class="modal-subtitle" style="color:#e05555;">${t("settings_restore_warn")}</div>
      <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:20px;font-size:13px;color:#666;">📄 ${file.name}</div>
      <button class="modal-save-btn" id="restoreConfirm" style="color:#e05555;">${t("settings_restore_confirm")}</button>
      <div class="modal-cancel" id="restoreCancel">${t("cancel")}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#restoreConfirm").addEventListener("click", async () => {
    const btn = overlay.querySelector("#restoreConfirm");
    btn.textContent = "⏳..."; btn.disabled = true;
    const { restoreFromBackup } = await import("../services/drive-backup.js");
    const result = await restoreFromBackup(file);
    overlay.remove();
    if (result.success) {
      showToast("✅ " + t("settings_restore_success"));
      setTimeout(() => { window.location.href = window.location.href; }, 1500);
    } else { 
      showToast("❌ " + t("settings_backup_error") + ": " + result.message); 
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
    saveTheme(selected);
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

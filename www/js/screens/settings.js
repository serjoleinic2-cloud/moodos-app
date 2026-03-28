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
import { t, getLang, setLang, LANG_OPTIONS } from "../i18n.js";

// Безопасная обёртка — если ключ не найден возвращает пустую строку
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
  return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function renderSettings() {
  const profile   = getProfile();
  const reminder  = getMedReminder();
  const takesMeds = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
  const lastTime  = null;
  const premiumInfo = getPremiumInfo();

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
    ? `<div style="font-size:12px; color:#f59e0b; margin-top:4px;">${t("premium_days_left")}: ${premiumInfo.trialDaysLeft}</div>` 
    : "";
  const showTrialBtn = premiumInfo.status === "free";

  const themeLabels = {
    "default": "🌿 Зелёно-бежевая",
    "purple-blue": "💜 Фиолетово-синяя",
    "purple-pink": "🌸 Фиолетово-розовая",
  };
  const currentThemeLabel = themeLabels[getTheme()] || themeLabels["default"];

  const medsSection = takesMeds ? (
    '<div class="neo-row" id="settingEffect">' +
      '<div class="neo-row-left"><span class="neo-row-icon">🔍</span><span class="neo-row-label">' + t("settings_effect_label") + '</span></div>' +
      '<span class="neo-row-value">' + (effVal[profile.medEffect]||t("not_specified")) + ' ›</span>' +
    '</div>' +
    '<div class="neo-row" id="settingReminder">' +
      '<div class="neo-row-left"><span class="neo-row-icon">⏰</span><span class="neo-row-label">' + t("settings_reminder_label") + '</span></div>' +
      '<span class="neo-row-value">' + (reminder?.active ? (remVal[profile?.medReminder]||t("settings_reminder_on")) : t("settings_reminder_off")) + ' ›</span>' +
    '</div>'
  ) : "";

  const backupSub = lastTime ? t("settings_backup_last") + " " + lastTime.toLocaleDateString("ru-RU") : t("settings_backup_never");

  return `
    <style>
      .settings-wrap{padding:20px 16px 100px;font-family:-apple-system,'SF Pro Display',sans-serif}
      .settings-title{font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:24px}
      .settings-section{margin-bottom:28px}
      .settings-section-label{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b0b8c4;margin-bottom:10px;padding-left:4px}
      .neo-row{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:rgba(232,237,230,0.9);border-radius:18px;box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;margin-bottom:10px;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .neo-row:active{box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff}
      .neo-row-label{font-size:15px;color:#555;font-weight:500}
      .neo-row-value{font-size:13px;color:#aaa;text-align:right;flex-shrink:0;margin-left:8px}
      .neo-row-icon{font-size:18px;margin-right:12px;flex-shrink:0}
      .neo-row-left{display:flex;align-items:center;flex:1}
      .neo-row-sub{font-size:11px;color:#bbb;margin-top:2px}
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
    </style>
    <div class="settings-wrap">
      <div class="settings-title">${t("settings_title")}</div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_health")}</div>
        <div class="neo-row" id="settingMeds">
          <div class="neo-row-left"><span class="neo-row-icon">💊</span><span class="neo-row-label">${t("settings_meds_label")}</span></div>
          <span class="neo-row-value">${medVal[profile?.takesMeds]||t("not_specified")} ›</span>
        </div>
        ${medsSection}
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_app")}</div>
        <div class="neo-row" id="settingBaseFeeling">
          <div class="neo-row-left"><span class="neo-row-icon">🎯</span><span class="neo-row-label">${t("settings_baseline_label")}</span></div>
          <span class="neo-row-value">${profile?.moodBaseline??50}% ›</span>
        </div>
        ${premiumInfo.isPremium ? `
        <div class="neo-row" id="settingTheme">
          <div class="neo-row-left"><span class="neo-row-icon">🎨</span><span class="neo-row-label">Цветовая схема</span></div>
          <span class="neo-row-value">${currentThemeLabel} ›</span>
        </div>` : ""}
        <div class="neo-row" id="settingLanguage">
          <div class="neo-row-left"><span class="neo-row-icon">🌍</span><span class="neo-row-label">${t("settings_language_label")}</span></div>
          <span class="neo-row-value">${langInfo.flag} ${langInfo.label} ›</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_data")}</div>
        <div class="neo-row" id="settingPdfReport">
          <div class="neo-row-left"><span class="neo-row-icon">📄</span><span class="neo-row-label">${t("settings_pdf_label")}</span></div>
          <span class="neo-row-value">PDF ›</span>
        </div>
        <div class="neo-row" id="settingBackup">
          <div class="neo-row-left">
            <span class="neo-row-icon">☁️</span>
            <div><div class="neo-row-label">${t("settings_backup_save")}</div><div class="neo-row-sub">${backupSub}</div></div>
          </div>
          <span class="neo-row-value" id="backupVal">${t("settings_backup_save_btn")} ›</span>
        </div>
        <div class="neo-row" id="settingRestore">
          <div class="neo-row-left">
            <span class="neo-row-icon">📥</span>
            <div><div class="neo-row-label">${t("settings_restore_label")}</div><div class="neo-row-sub">${t("settings_restore_hint")}</div></div>
          </div>
          <span class="neo-row-value">›</span>
        </div>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none;">
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("cloud_section")}</div>
        <div id="google-connect" style="
          background: rgba(232,237,230,0.9);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
          margin-bottom: 10px;
        ">
          <div style="display:flex; align-items:center; margin-bottom:10px;">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMy4yOTNBMTAuNjUgMTAuNjUgMCAwIDAgNy41IDE1Ljc1bDMuNSAzLjUgMy41LTMuNUExMC42NSAxMC42NSAwIDAgMCAxMiAzLjI5M3ptMCAxMi4xMzNWNi40NjRBMTAuNjUgMTAuNjUgMCAwIDAgNy41IDE1Ljc1bDMuNSAzLjUgMy41LTMuNUExMC42NSAxMC42NSAwIDAgMCAxMiA1Ljc1eiIgZmlsbD0iIzNBOUUzMyIvPjxwYXRoIGQ9Ik0xMiA1Ljc1bC0zLjUgMy41IDMuNSAzLjUgMy41LTMuNSAtMy41LTMuNXptMCAxMi4xMzNWMTcuNWwzLjUgMy41IDMuNS0zLjUgMy41LTMuNSAtMy41LTMuNSAtMy41IDMuNXoiIGZpbGw9IiNGQ0Y0RjQiLz48cGF0aCBkPSJNMTIgMTcuNWwtMy41IDMuNSAzLjUgMy41IDMuNS0zLjUgLTMuNS0zLjV6bTAtMTIuMTI1TDMuNSA3LjUgNyA0IDEwLjUgNyA3IDEwLjVsNS01LjI1WiIgZmlsbD0iIzNBOUUzMyIvPjxwYXRoIGQ9Ik0xMiA1Ljc1bC0zLjUgMy41IDMuNSAzLjUgMy41LTMuNSAtMy41LTMuNXptMCAxMi4xMzNWMTcuNWwzLjUgMy41IDMuNS0zLjUgMy41LTMuNSAtMy41LTMuNSAtMy41IDMuNXoiIGZpbGw9IiNGQ0Y0RjQiLz48cGF0aCBkPSJNMTIgMTcuNWwtMy41IDMuNSAzLjUgMy41IDMuNS0zLjUgLTMuNS0zLjV6bTAtMTIuMTI1TDMuNSA3LjUgNyA0IDEwLjUgNyA3IDEwLjVsNS01LjI1WiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==" style="width:24px; height:24px; margin-right:10px;">
            <span style="font-size:15px; font-weight:600; color:#555;">${t("google_connect_title")}</span>
          </div>
          <div id="googleConnectDesc" style="font-size:13px; color:#888; margin-bottom:14px; line-height:1.4;">
            ${t("google_connect_desc")}
          </div>
          <button id="connectGoogleBtn" style="
            width:100%; padding:13px; border:none; border-radius:14px;
            background: linear-gradient(145deg, #f5efe6, #ede5d8);
            box-shadow: 5px 5px 10px #c8bfb2, -5px -5px 10px #ffffff;
            font-size:15px; font-weight:600; color:#7a6a58; cursor:pointer;
          ">${t("google_connect_btn")}</button>
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
          <div id="premiumStatus" style="
            font-size: 16px;
            font-weight: 700;
            color: ${premiumStatusColor};
            margin-bottom: 4px;
          ">${premiumStatusLabel}</div>
          ${trialInfo}
          <div style="font-size:12px; color:#aaa; margin-top:8px;">${premiumInfo.isPremium ? t("premium_unlimited") : "5 " + t("gemini_limit_reached").toLowerCase().split(" ").slice(-2).join(" ")}</div>
          ${showTrialBtn ? `<button id="startTrialBtn" style="
            margin-top: 14px;
            width: 100%;
            padding: 13px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(145deg, #fef3c7, #fde68a);
            box-shadow: 5px 5px 10px #c8bfb2, -5px -5px 10px #ffffff;
            font-size: 15px;
            font-weight: 600;
            color: #92400e;
            cursor: pointer;
          ">${t("premium_open_access")} (7 ${t("premium_days_left").toLowerCase()})</button>` : ""}
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

  // PDF — динамический импорт чтобы не ломал загрузку settings
  el.querySelector("#settingPdfReport")?.addEventListener("click", () => {
    import("./pdf-report.js")
      .then(m => m.showPdfReportModal())
      .catch(e => console.warn("pdf-report load failed:", e));
  });

  el.querySelector("#settingTheme")?.addEventListener("click", () => showThemeModal());
  el.querySelector("#settingLanguage")?.addEventListener("click", () => showLanguageModal(el));

  // Бэкап
  el.querySelector("#settingBackup")?.addEventListener("click", async () => {
    const valEl = el.querySelector("#backupVal");
    if (valEl) valEl.textContent = t("settings_backup_processing");
    try {
      const m = await import("../services/drive-backup.js");
      const result = await m.backupAndShare();
      if (!valEl) return;
      if (result.message === "cancelled") { valEl.textContent = t("settings_backup_save_btn") + " ›"; return; }
      if (result.success) {
        valEl.textContent = result.message === "shared" ? "✅ " + t("settings_backup_sent") : "✅ " + t("settings_backup_downloaded");
        setTimeout(() => refresh(), 2000);
      } else {
        valEl.textContent = "❌ " + t("settings_backup_error");
        setTimeout(() => { if(valEl) valEl.textContent = t("settings_backup_save_btn") + " ›"; }, 3000);
      }
    } catch(e) {
      console.warn("drive-backup not available:", e);
      if (valEl) valEl.textContent = t("settings_backup_unavailable");
    }
  });

  // Восстановление
  el.querySelector("#settingRestore")?.addEventListener("click", () => el.querySelector("#restoreFileInput")?.click());
  el.querySelector("#restoreFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    showRestoreConfirmModal(file);
  });

  // Google Connect
  const googleBtn = el.querySelector("#connectGoogleBtn");
  if (googleBtn) {
    googleBtn.addEventListener("click", () => {
      const profile = getProfile();
      if (profile?.googleConnected) return;
      saveProfile({...profile, googleConnected: true});
      const btn = el.querySelector("#connectGoogleBtn");
      const desc = el.querySelector("#googleConnectDesc");
      if (btn) {
        btn.textContent = t("google_connected");
        btn.style.color = "#4caf87";
        btn.disabled = true;
      }
      if (desc) desc.textContent = t("google_connected");
    });
  }

  // Start Trial
  const trialBtn = el.querySelector("#startTrialBtn");
  if (trialBtn) {
    trialBtn.addEventListener("click", () => {
      activateTrial();
      refresh();
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.innerHTML = "✅ " + t("premium_status_trial") + "<br><small style='font-weight:400;opacity:0.9;'>7 " + t("premium_days_left").toLowerCase() + "</small>";
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 2500);
    });
  }
   
}

function refresh() {
  const el = document.querySelector('[data-screen="settings"]');
  if (el) { el.innerHTML = renderSettings(); bindEvents(el); }
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
      if (result.limitWarning) {
        const warn = document.createElement("div");
        warn.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#f59e0b;color:#fff;padding:20px 28px;border-radius:18px;font-size:15px;font-weight:600;z-index:9999;text-align:center;max-width:280px;";
        warn.innerHTML = "⚠️ " + result.limitWarning.title + "<br><small style='font-weight:400;opacity:0.9;'>" + result.limitWarning.desc + "</small>";
        document.body.appendChild(warn);
        setTimeout(() => { window.location.href = window.location.href; }, 3000);
      } else {
        const msg = document.createElement("div");
        msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;";
        msg.textContent = "✅ " + t("settings_restore_success");
        document.body.appendChild(msg);
        setTimeout(() => { window.location.href = window.location.href; }, 1500);
      }
    } else { alert(t("settings_backup_error") + ": " + result.message); }
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
  const themes = [
    { value: "default",      label: "🌿 Зелёно-бежевая (текущая)" },
    { value: "purple-blue",  label: "💜 Фиолетово-синяя" },
    { value: "purple-pink",  label: "🌸 Фиолетово-розовая" },
  ];
  const overlay = document.createElement("div");
  overlay.className = "health-modal-overlay";
  overlay.innerHTML = `
    <div class="health-modal">
      <div class="modal-title">🎨 Цветовая схема</div>
      <div class="modal-subtitle">Выбери оформление приложения</div>
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
      // превью темы сразу
      document.body.setAttribute("data-theme", selected);
    });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => {
    saveTheme(selected);
    overlay.remove();
    refresh();
  });
  overlay.querySelector("#modalCancel").addEventListener("click", () => {
    // откат превью
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

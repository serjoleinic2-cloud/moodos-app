// =====================================
// MoodOS Settings Screen
// =====================================

import { getProfile, saveProfile, saveMedReminder, removeMedReminder, getMedReminder } from "../services/user-profile.js";
import { showPdfReportModal } from "./pdf-report.js";
import { t, getLang, setLang, LANG_OPTIONS } from "../i18n.js";


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
  

  const medLabels = {
    "нет": t("med_no"), "антидепрессанты": t("med_anti"),
    "седативные": t("med_sed"), "другое": t("med_other"), "не_скажу": t("med_not_said"),
  };
  const effectLabels = {
    "лучше": t("effect_better"), "примерно_так_же": t("effect_same"),
    "приглушённость": t("effect_numb"), "побочки": t("effect_side"), "адаптация": t("effect_adapt"),
  };
  const reminderLabels = {
    "нет": t("reminder_no"), "утро": t("reminder_morning"),
    "день": t("reminder_day"), "вечер": t("reminder_evening"),
  };

  return `
    <style>
      .settings-wrap { padding: 20px 16px 100px; font-family: -apple-system, 'SF Pro Display', sans-serif; }
      .settings-title { font-size: 22px; font-weight: 700; color: #3d3d3d; margin-bottom: 24px; }
      .settings-section { margin-bottom: 28px; }
      .settings-section-label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #b0b8c4; margin-bottom: 10px; padding-left: 4px; }
      .neo-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(232,237,230,0.9); border-radius: 18px; box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff; margin-bottom: 10px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .neo-row:active { box-shadow: inset 4px 4px 8px #b8c4b4, inset -4px -4px 8px #ffffff; }
      .neo-row-label { font-size: 15px; color: #555; font-weight: 500; }
      .neo-row-value { font-size: 13px; color: #aaa; text-align: right; flex-shrink: 0; margin-left: 8px; }
      .neo-row-icon { font-size: 18px; margin-right: 12px; flex-shrink: 0; }
      .neo-row-left { display: flex; align-items: center; flex: 1; }
      .neo-row-sub { font-size: 11px; color: #bbb; margin-top: 2px; }
      .health-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: flex-end; }
      .health-modal { width: 100%; background: linear-gradient(160deg,#d4ede8,#e8e0d5); border-radius: 24px 24px 0 0; padding: 24px 20px 32px; max-height: 80vh; overflow-y: auto; box-sizing: border-box; animation: slideUp 0.35s ease; }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .modal-title { font-size: 18px; font-weight: 700; color: #3d3d3d; margin-bottom: 6px; }
      .modal-subtitle { font-size: 13px; color: #aaa; margin-bottom: 20px; }
      .modal-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      .modal-option { padding: 13px 16px; border-radius: 14px; background: rgba(232,237,230,0.9); box-shadow: 4px 4px 9px #b8c4b4, -4px -4px 9px #ffffff; font-size: 15px; color: #555; cursor: pointer; }
      .modal-option.selected { box-shadow: inset 3px 3px 7px #b8c4b4, inset -3px -3px 7px #ffffff; color: #7eb8d4; font-weight: 600; }
      .modal-save-btn { width: 100%; padding: 15px; border: none; border-radius: 16px; background: rgba(232,237,230,0.9); box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff; font-size: 16px; font-weight: 700; color: #7eb8d4; cursor: pointer; display: block; box-sizing: border-box; }
      .modal-cancel { width: 100%; padding: 12px; text-align: center; font-size: 14px; color: #bbb; cursor: pointer; margin-top: 8px; }
    </style>

    <div class="settings-wrap">
      <div class="settings-title">${t("settings_title")}</div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_health")}</div>
        <div class="neo-row" id="settingMeds">
          <div class="neo-row-left"><span class="neo-row-icon">💊</span><div><div class="neo-row-label">${t("settings_meds_label")}</div></div></div>
          <span class="neo-row-value">${medLabels[profile?.takesMeds] || t("med_not_said")} ›</span>
        </div>
        ${takesMeds ? `
        <div class="neo-row" id="settingEffect">
          <div class="neo-row-left"><span class="neo-row-icon">🔍</span><span class="neo-row-label">${t("settings_effect_label")}</span></div>
          <span class="neo-row-value">${effectLabels[profile?.medEffect] || t("med_not_said")} ›</span>
        </div>
        <div class="neo-row" id="settingReminder">
          <div class="neo-row-left"><span class="neo-row-icon">⏰</span><span class="neo-row-label">${t("settings_reminder_label")}</span></div>
          <span class="neo-row-value">${reminder?.active ? (reminderLabels[profile?.medReminder] || t("settings_reminder_on")) : t("settings_reminder_off")} ›</span>
        </div>` : ""}
      </div>

      <div class="settings-section">
        <div class="settings-section-label">${t("settings_app")}</div>
        <div class="neo-row" id="settingBaseFeeling">
          <div class="neo-row-left"><span class="neo-row-icon">🎯</span><span class="neo-row-label">${t("settings_baseline_label")}</span></div>
          <span class="neo-row-value">${profile?.moodBaseline ?? 50}% ›</span>
        </div>
        <div class="neo-row" id="settingLanguage">
          <div class="neo-row-left"><span class="neo-row-icon">🌍</span><span class="neo-row-label">${t("settings_language_label")}</span></div>
          <span class="neo-row-value">${LANG_OPTIONS.find(l=>l.code===getLang())?.flag||"🌍"} ${LANG_OPTIONS.find(l=>l.code===getLang())?.label||"Русский"} ›</span>
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
            <div>
              <div class="neo-row-label">Сохранить данные</div>
              <div class="neo-row-sub">Нет данных</div>
            </div>
          </div>
          <span class="neo-row-value" id="backupVal">Сохранить ›</span>
        </div>
        <div class="neo-row" id="settingRestore">
          <div class="neo-row-left">
            <span class="neo-row-icon">📥</span>
            <div>
              <div class="neo-row-label">Восстановить</div>
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
  el.querySelector("#settingPdfReport")?.addEventListener("click", () => showPdfReportModal());
  el.querySelector("#settingLanguage")?.addEventListener("click", () => showLanguageModal(el));

  // ── ТЕСТ: просто alert, без бэкапа ──
  el.querySelector("#settingBackup")?.addEventListener("click", () => {
    alert("ok");
  });

  // ── Восстановить ──
  el.querySelector("#settingRestore")?.addEventListener("click", () => el.querySelector("#restoreFileInput")?.click());
  el.querySelector("#restoreFileInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    showRestoreConfirmModal(file);
  });
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
      <div class="modal-title">📥 Восстановить данные</div>
      <div class="modal-subtitle" style="color:#e05555;">Текущие данные будут заменены!</div>
      <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:20px;font-size:13px;color:#666;">📄 ${file.name}</div>
      <button class="modal-save-btn" id="restoreConfirm" style="color:#e05555;">Восстановить</button>
      <div class="modal-cancel" id="restoreCancel">Отмена</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#restoreConfirm").addEventListener("click", async () => {
    const btn = overlay.querySelector("#restoreConfirm");
    btn.textContent = "⏳..."; btn.disabled = true;
    const result = await restoreFromBackup(file);
    overlay.remove();
    if (result.success) {
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;";
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
      <div class="modal-title">🌍 Язык / Language</div>
      <div class="modal-subtitle">${t("settings_lang_subtitle")}</div>
      <div class="modal-options">${LANG_OPTIONS.map(l=>`<div class="modal-option ${l.code===current?"selected":""}" data-value="${l.code}"><span style="font-size:20px;margin-right:10px;">${l.flag}</span>${l.label}</div>`).join("")}</div>
      <button class="modal-save-btn" id="modalSave">Сохранить / Save</button>
      <div class="modal-cancel" id="modalCancel">Отмена / Cancel</div>
    </div>`;
  document.body.appendChild(overlay);
  let selected = current;
  overlay.querySelectorAll(".modal-option").forEach(opt => {
    opt.addEventListener("click", () => { overlay.querySelectorAll(".modal-option").forEach(o=>o.classList.remove("selected")); opt.classList.add("selected"); selected=opt.dataset.value; });
  });
  overlay.querySelector("#modalSave").addEventListener("click", () => { setLang(selected); overlay.remove(); setTimeout(()=>{window.location.href=window.location.href;},100); });
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

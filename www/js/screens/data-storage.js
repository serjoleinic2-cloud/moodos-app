import { t } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";

export function onEnter() {
  const el = document.getElementById("dataStorage-content");
  if (!el) return;
  el.innerHTML = render();
  bindEvents(el);
  el.querySelector('#dsBackBtn')?.addEventListener('click', () => {
    if (window.navigateTo) window.navigateTo('settings');
  });
}

function bindEvents(el) {
  el.querySelector("#dsBackupBtn")?.addEventListener("click", () => {
    const isPrem = isPremium();
    let confirmText = "";
    
    if (isPrem) {
      confirmText = `${t("export_premium_title")}\n\n${t("export_premium_list")}\n\n${t("export_premium_subtitle")}`;
    } else {
      confirmText = `${t("export_free_warning_title")}\n\n${t("export_free_warning_text")}\n\n⚠️ ${t("export_free_7days") || "Будут экспортированы данные только за последние 7 дней. Для полного экспорта нужен Premium."}`;
    }
    
    const ok = confirm(confirmText);
    if (!ok) return;
    doExport();
  });
}

async function doExport() {
  const btn = document.getElementById("dsBackupBtn");
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
      alert(result.error || t("backup_error"));
    }
  } catch(e) {
    alert(t("backup_error") + ": " + e.message);
  }
  if (btn) { btn.textContent = t("btn_export") || "Создать копию"; btn.disabled = false; }
}

function render() {
  return `
    <style>
      .info-screen { padding: 20px 16px 100px; }
      .info-hero {
        text-align: center;
        padding: 24px 8px 28px;
      }
      .info-hero-title {
        font-size: 22px;
        font-weight: 700;
        color: #3a3530;
        line-height: 1.3;
        margin-bottom: 10px;
      }
      .info-hero-sub {
        font-size: 14px;
        color: #888;
        line-height: 1.6;
      }
      .info-section {
        margin-bottom: 12px;
        padding: 16px;
        border-radius: 18px;
        background: rgba(232,237,230,0.9);
        box-shadow: 4px 4px 10px #c8d4c4, -4px -4px 10px #ffffff;
      }
      .info-section-accent { border-left: 3px solid #4caf87; }
      .info-section-warning { border-left: 3px solid #e05555; }
      .info-row {
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }
      .info-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
      .info-label {
        font-size: 13px;
        font-weight: 700;
        color: #4caf87;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .info-label-warn { color: #e05555; }
      .info-title { font-size: 15px; font-weight: 600; color: #3a3530; margin-bottom: 4px; }
      .info-text { font-size: 13px; color: #666; line-height: 1.55; }
      .info-premium-tag {
        display: inline-block;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .info-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 10px 0; }
      .info-export-btn {
        width: 100%;
        padding: 15px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(145deg, #4caf87, #45a070);
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 8px;
        box-shadow: 4px 4px 10px #c8d4c4, -4px -4px 10px #ffffff;
      }
      .info-back-btn {
        width: 100%;
        padding: 15px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(145deg, #9f7aea, #805ad5);
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 10px;
        box-shadow: 4px 4px 10px #c8d4c4, -4px -4px 10px #ffffff;
      }
    </style>

    <div class="info-screen">

      <div class="info-hero">
        <div class="info-hero-title">${t("data_storage_title")}</div>
        <div class="info-hero-sub">${t("data_storage_records_desc")}</div>
      </div>

      <div class="info-section info-section-accent">
        <div class="info-row">
          <div class="info-icon">📱</div>
          <div>
            <div class="info-label">${t("ds_label_storage")}</div>
            <div class="info-title">${t("data_storage_local")}</div>
            <div class="info-text">${t("data_storage_control_desc")}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div class="info-icon">💾</div>
          <div>
            <div class="info-label">${t("ds_label_free")}</div>
            <div class="info-title">${t("ds_free_backup_title")}</div>
            <div class="info-text">${t("ds_free_backup_text")}</div>
          </div>
        </div>
        <div class="info-divider"></div>
        <div>
          <div class="info-premium-tag">👑 ${t("premium_label_tag")}</div>
          <div class="info-row">
            <div class="info-icon">📦</div>
            <div>
              <div class="info-title">${t("ds_premium_archive_title")}</div>
              <div class="info-text">${t("ds_premium_archive_text")}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="info-section info-section-warning">
        <div class="info-row">
          <div class="info-icon">⚠️</div>
          <div>
            <div class="info-label info-label-warn">${t("ds_label_important")}</div>
            <div class="info-text">${t("data_storage_responsibility_desc")}</div>
          </div>
        </div>
      </div>

      <button class="info-export-btn" id="dsBackupBtn">
        ${t("btn_export") || "Создать резервную копию"}
      </button>

      <button id="dsBackBtn" class="info-back-btn">
        ${t('back') || '← Назад'}
      </button>

    </div>
  `;
}
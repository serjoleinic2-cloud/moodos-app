import { t } from "../i18n.js";
import { isPremium } from "../services/user-profile.js";

export function onEnter() {
  const el = document.getElementById("dataStorage-content");
  if (!el) return;
  el.innerHTML = render();
  bindEvents(el);
}

function bindEvents(el) {
  el.querySelector("#dsBackupBtn")?.addEventListener("click", () => {
    const isPrem = isPremium();
    let confirmText = "";
    
    if (isPrem) {
      confirmText = `${t("export_premium_title")}\n\n${t("export_premium_list")}\n\n${t("export_premium_subtitle")}\n\n${t("exit_warning")}`;
    } else {
      confirmText = `${t("export_free_warning_title")}\n\n${t("export_free_warning_text")}\n\n${t("exit_warning")}`;
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
      alert(result.error || "Не удалось создать резервную копию");
    }
  } catch(e) {
    alert("Ошибка: " + e.message);
  }
  if (btn) { btn.textContent = t("btn_export") || "Создать копию"; btn.disabled = false; }
}

function block(icon, title, text) {
  return `
    <div class="ds-block">
      <div class="ds-icon">${icon}</div>
      <div class="ds-content">
        <div class="ds-title">${title}</div>
        <div class="ds-text">${text}</div>
      </div>
    </div>
  `;
}

function render() {
  return `
    <style>
      .ds-container {
        padding: 20px 16px 80px;
      }
      .ds-block {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        padding: 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
      }
      .ds-icon {
        font-size: 20px;
      }
      .ds-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .ds-text {
        font-size: 13px;
        opacity: 0.85;
        line-height: 1.4;
      }
      .ds-block.highlight {
        background: rgba(76,175,135,0.1);
        border: 1px solid rgba(76,175,135,0.3);
      }
      .ds-block.warning {
        background: rgba(255,107,107,0.1);
        border: 1px solid rgba(255,107,107,0.3);
      }
      .ds-block.warning .ds-title {
        color: #ff6b6b;
      }
      .ds-footer {
        text-align: center;
        font-size: 13px;
        color: #aaa;
        margin-top: 24px;
        padding: 16px;
      }
      .ds-btn {
        display: block;
        width: 100%;
        padding: 14px;
        margin-top: 16px;
        background: linear-gradient(145deg, #4caf87, #45a070);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
      }
      .ds-btn:active {
        opacity: 0.9;
      }
    </style>
    <div class="ds-container">
      <h2>${t("data_storage_title") || "Хранение данных"}</h2>
      
      ${block("📱", t("data_storage_local") || "Локальное хранение", 
        "Все ваши записи, фото и аудио хранятся только на вашем устройстве.")}
      
      ${block("🔒", "Контроль",
        "Только вы имеете доступ к своим данным. Приложение не передаёт их на сервер.")}
      
      ${block("💾", t("backup_section") || "Резервная копия",
        "Чтобы не потерять данные при переустановке, создайте резервную копию и сохраните её самостоятельно.")}
      
      ${block("☁️", "Облако (Premium)",
        "Автоматический backup в Google Drive. Перенос данных между устройствами.")}
      
      ${block("⚠️", t("data_storage_responsibility") || "Ответственность",
        "Вы самостоятельно отвечаете за сохранность резервной копии. Если файл будет утерян — восстановить данные будет невозможно.", true)}
      
      <button class="ds-btn" id="dsBackupBtn">
        ${t("btn_export") || "Создать копию"}
      </button>
    </div>
  `;
}
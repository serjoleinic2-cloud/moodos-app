import { t } from "../i18n.js";

export function onEnter() {
  const el = document.getElementById("dataStorage-content");
  if (!el) return;
  el.innerHTML = render();
  bindEvents(el);
}

function bindEvents(el) {
  el.querySelector("#dsBackupBtn")?.addEventListener("click", () => {
    const ok = confirm(
      "Сохраните копию ваших данных в безопасном месте.\nВы сами отвечаете за её сохранность."
    );
    if (!ok) return;
    doExport();
  });
}

async function doExport() {
  try {
    const { exportData } = await import("../services/backup-service.js");
    const result = await exportData();
  } catch(e) {
    alert("Ошибка: " + e.message);
  }
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
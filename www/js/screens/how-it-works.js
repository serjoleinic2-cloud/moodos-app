import { t } from "../i18n.js";

export function onEnter() {
  const el = document.querySelector('[data-screen="howItWorks"]');
  if (!el) return;
  el.innerHTML = render();
}

function block(icon, title, text) {
  return `
    <div class="how-block">
      <div class="how-icon">${icon}</div>
      <div class="how-content">
        <div class="how-title">${title}</div>
        <div class="how-text">${text}</div>
      </div>
    </div>
  `;
}

function render() {
  return `
    <style>
      .how-container {
        padding: 20px 16px 80px;
      }
      .how-block {
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
        padding: 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
      }
      .how-icon {
        font-size: 20px;
      }
      .how-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .how-text {
        font-size: 13px;
        opacity: 0.85;
        line-height: 1.4;
      }
      .how-footer {
        text-align: center;
        font-size: 13px;
        color: #aaa;
        margin-top: 24px;
        padding: 16px;
      }
    </style>
    <div class="how-container">
      ${block("🧠", t("how_block_1_title"), t("how_block_1_text"))}
      ${block("⚡", t("how_block_2_title"), t("how_block_2_text"))}
      ${block("📊", t("how_block_3_title"), t("how_block_3_text"))}
      ${block("🤖", t("how_block_4_title"), t("how_block_4_text"))}
      ${block("🎯", t("how_block_5_title"), t("how_block_5_text"))}
      <div class="how-footer">
        ${t("how_footer")}
      </div>
    </div>
  `;
}

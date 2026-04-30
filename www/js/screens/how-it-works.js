import { t } from "../i18n.js";

export function onEnter() {
  const el = document.querySelector('[data-screen="howItWorks"]');
  if (!el) return;
  el.innerHTML = render();
  el.querySelector('#howBackBtn')?.addEventListener('click', () => {
    if (window.navigateTo) window.navigateTo('settings');
  });
}

function section(title, text) {
  if (!title && !text) return '';
  return `
    <div class="how-section">
      ${title ? `<div class="how-section-title">${title}</div>` : ''}
      ${text ? `<div class="how-section-text">${text}</div>` : ''}
    </div>
  `;
}

function featureBlock(icon, title, text) {
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
      .how-hero {
        text-align: center;
        padding: 20px 10px 30px;
      }
      .how-hero-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 16px;
        line-height: 1.3;
      }
      .how-hero-text {
        font-size: 14px;
        line-height: 1.6;
        opacity: 0.85;
      }
      .how-section {
        margin-bottom: 24px;
        padding: 16px;
        border-radius: 14px;
        background: rgba(76,175,135,0.08);
      }
      .how-section-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #4caf87;
      }
      .how-section-text {
        font-size: 14px;
        line-height: 1.6;
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
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
      }
      .how-premium-badge {
        display: inline-block;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }
    </style>
    <div class="how-container">
      <div class="how-hero">
        <div class="how-hero-title">${t("how_hero_title")}</div>
        <div class="how-hero-text">${t("how_hero_text")}</div>
      </div>
      
      ${section(t("how_sec_1_title"), t("how_sec_1_text"))}
      ${section(t("how_sec_2_title"), t("how_sec_2_text"))}
      ${section(t("how_sec_3_title"), t("how_sec_3_text"))}
      ${section(t("how_sec_4_title"), t("how_sec_4_text"))}
      
      <div style="margin-top: 20px;">
        ${featureBlock("📱", t("how_device_title"), t("how_device_text"))}
        ${featureBlock("☁️", t("how_cloud_title"), t("how_cloud_text"))}
      </div>
      
      <div style="margin-top: 20px;">
        ${featureBlock("🔒", t("how_data_local_title"), t("how_data_local_text"))}
        ${featureBlock("💾", t("how_export_title"), t("how_export_text"))}
        ${featureBlock("📄", t("how_pdf_title"), t("how_pdf_text"))}
      </div>
      
      <div class="how-footer">
        ${t("how_footer")}
      </div>
      
      <button id="howBackBtn" style="
        width:100%;padding:14px;border:none;border-radius:14px;
        background:linear-gradient(145deg,#9f7aea,#805ad5);
        color:#fff;font-size:15px;font-weight:700;cursor:pointer;
        margin-top:20px;
      ">${t('back') || '← Back'}</button>
    </div>
  `;
}

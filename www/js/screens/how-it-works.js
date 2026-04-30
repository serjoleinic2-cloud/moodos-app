import { t } from "../i18n.js";

export function onEnter() {
  const el = document.querySelector('[data-screen="howItWorks"]');
  if (!el) return;
  el.innerHTML = render();
  el.querySelector('#howBackBtn')?.addEventListener('click', () => {
    if (window.navigateTo) window.navigateTo('settings');
  });
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
      .info-section-accent {
        border-left: 3px solid #4caf87;
      }
      .info-row {
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }
      .info-icon {
        font-size: 22px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .info-label {
        font-size: 13px;
        font-weight: 700;
        color: #4caf87;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .info-title {
        font-size: 15px;
        font-weight: 600;
        color: #3a3530;
        margin-bottom: 4px;
      }
      .info-text {
        font-size: 13px;
        color: #666;
        line-height: 1.55;
      }
      .info-divider {
        height: 1px;
        background: rgba(0,0,0,0.06);
        margin: 10px 0;
      }
      .info-footer {
        text-align: center;
        font-size: 13px;
        color: #aaa;
        margin-top: 20px;
        padding: 16px;
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
        margin-top: 8px;
        box-shadow: 4px 4px 10px #c8d4c4, -4px -4px 10px #ffffff;
      }
    </style>

    <div class="info-screen">

      <div class="info-hero">
        <div class="info-hero-title">${t("how_hero_title")}</div>
        <div class="info-hero-sub">${t("how_hero_text")}</div>
      </div>

      <div class="info-section info-section-accent">
        <div class="info-row">
          <div class="info-icon">🔄</div>
          <div>
            <div class="info-label">${t("how_label_how_it_works")}</div>
            <div class="info-text">${t("how_sec_1_text")}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_device_title")}</div>
            <div class="info-text">${t("how_device_text")}</div>
          </div>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_sec_2_title")}</div>
            <div class="info-text">${t("how_sec_2_text")}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_sec_3_title")}</div>
            <div class="info-text">${t("how_sec_3_text")}</div>
          </div>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_sec_4_title")}</div>
            <div class="info-text">${t("how_sec_4_text")}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_cloud_title")}</div>
            <div class="info-text">${t("how_cloud_text")}</div>
          </div>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_pdf_title")}</div>
            <div class="info-text">${t("how_pdf_text")}</div>
          </div>
        </div>
        <div class="info-divider"></div>
        <div class="info-row">
          <div>
            <div class="info-title">${t("how_export_title")}</div>
            <div class="info-text">${t("how_export_text")}</div>
          </div>
        </div>
      </div>

      <div class="info-footer">${t("how_footer")}</div>

      <button id="howBackBtn" class="info-back-btn">${t('back') || '← Назад'}</button>

    </div>
  `;
}

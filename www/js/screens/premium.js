// ===============================
// Neyra Premium Screen
// Status screen (not paywall)
// ===============================
import { getPremiumInfo } from "../services/user-profile.js";
import { t } from "../i18n.js";

export function onEnter() {
  const container = document.getElementById("premium-content");
  if (!container) return;
  
  container.innerHTML = renderPremium();
  bindEvents();
}

function renderPremium() {
  const premiumInfo = getPremiumInfo();
  const isActive = premiumInfo.isPremium;
  const statusClass = premiumInfo.status === "premium" ? "premium-active" : "premium-free";
  
  let statusText = "";
  if (premiumInfo.status === "premium") {
    statusText = "👑 " + t("premium_status_active");
  } else {
    statusText = t("premium_status_free");
  }
  
  return `
    <style>
      .premium-screen {
        padding: var(--neyra-space-lg) var(--neyra-space-lg) 80px;
        text-align: center;
      }
      .premium-icon {
        font-size: 64px;
        margin-bottom: var(--neyra-space-xl);
      }
      .premium-title {
        font-size: var(--neyra-font-size-2xl);
        font-weight: var(--neyra-font-weight-bold);
        color: var(--neyra-color-text-primary);
        margin-bottom: var(--neyra-space-xl);
      }
      .premium-features {
        text-align: left;
        background: rgba(232,237,230,0.9);
        border-radius: var(--neyra-radius-xl);
        padding: var(--neyra-space-lg);
        margin-bottom: var(--neyra-space-xl);
        box-shadow: var(--neyra-shadow-card);
      }
      .premium-feature {
        display: flex;
        align-items: center;
        padding: var(--neyra-space-md) 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        font-size: var(--neyra-font-size-base);
        color: var(--neyra-color-text-secondary);
      }
      .premium-feature:last-child {
        border-bottom: none;
      }
      .premium-feature-icon {
        font-size: var(--neyra-font-size-xl);
        margin-right: var(--neyra-space-md);
        flex-shrink: 0;
      }
      .premium-btn {
        width: 100%;
        padding: var(--neyra-space-lg);
        border: none;
        border-radius: var(--neyra-radius-lg);
        background: linear-gradient(145deg, var(--neyra-color-purple), #805ad5);
        color: var(--neyra-color-text-inverse);
        font-size: var(--neyra-font-size-md);
        font-weight: var(--neyra-font-weight-bold);
        cursor: pointer;
        box-shadow: var(--neyra-shadow-card);
        transition: transform var(--neyra-transition-fast);
      }
      .premium-btn:active {
        transform: scale(0.97);
      }
      .premium-btn:disabled {
        background: linear-gradient(145deg, #d1fae5, #a7f3d0);
        cursor: default;
      }
      .premium-status-badge {
        display: inline-block;
        padding: var(--neyra-space-sm) var(--neyra-space-lg);
        border-radius: var(--neyra-radius-full);
        font-size: var(--neyra-font-size-sm);
        font-weight: var(--neyra-font-weight-semibold);
        margin-bottom: var(--neyra-space-xl);
      }
      .premium-free .premium-status-badge {
        background: rgba(136,136,136,0.2);
        color: #888;
      }
      .premium-active .premium-status-badge {
        background: var(--neyra-color-primary-light);
        color: var(--neyra-color-primary);
      }
      .premium-desc {
        font-size: var(--neyra-font-size-xs);
        color: var(--neyra-color-text-muted);
        margin-top: var(--neyra-space-xs);
      }
    </style>
    
    <div class="premium-screen ${statusClass}">
      <div class="premium-icon">👑</div>
      <div class="premium-status-badge">${statusText}</div>
      <h2 class="premium-title">${t("premium_title")}</h2>
      
      <div class="premium-features">
        <div class="premium-feature">
          <span class="premium-feature-icon">🎨</span>
          <span>${t("premium_feature_themes")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">🧘</span>
          <div>
            <span>${t("premium_feature_practices")}</span>
            <div class="premium-desc">${t("premium_feature_practices_desc")}</div>
          </div>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">🎵</span>
          <span>${t("premium_feature_custom_tracks")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">📊</span>
          <span>${t("premium_feature_history")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">💡</span>
          <span>${t("premium_feature_ai")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">☁️</span>
          <span>${t("premium_feature_auto")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">🔄</span>
          <span>${t("premium_feature_restore")}</span>
        </div>
        <div class="premium-feature">
          <span class="premium-feature-icon">📅</span>
          <div>
            <span>${t("premium_feature_yearly")}</span>
            <div class="premium-desc">${t("premium_feature_yearly_desc")}</div>
          </div>
        </div>
      </div>
      
      ${!isActive ? `
        <button id="premiumBtn" class="premium-btn">
          ${t("premium_open_btn")}
        </button>
        ${window.store ? `
          <button id="restoreBtn" class="neyra-btn neyra-btn-ghost" style="margin-top: var(--neyra-space-sm);">
            ${t("restore_purchases")}
          </button>
        ` : ""}
      ` : `
        <button id="premiumBtn" class="premium-btn" disabled>
          ✓ ${t("premium_unlimited")}
        </button>
      `}
    </div>
  `;
}

function bindEvents() {
  const btn = document.getElementById("premiumBtn");
  const restoreBtn = document.getElementById("restoreBtn");
  
  const premiumInfo = getPremiumInfo();
  
  if (!premiumInfo.isPremium && btn) {
    btn.addEventListener("click", () => {
      if (window.navigateTo) {
        window.navigateTo("paywall");
      }
    });
  }
  
  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      try {
        const { restorePurchases } = await import("../services/billing-service.js");
        restorePurchases();
      } catch(e) {
        console.warn("restorePurchases not available:", e);
      }
    });
  }
}

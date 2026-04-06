// ===============================
// Neyra Paywall Screen
// ===============================
import { getPremiumInfo } from "../services/user-profile.js";
import { t } from "../i18n.js";

export function onEnter(fromLimitParam = false) {
  const container = document.getElementById("paywall-content");
  if (!container) return;
  
  container.innerHTML = renderPaywall();
  bindEvents();
}

function renderPaywall() {
  const premiumInfo = getPremiumInfo();
  const isPremium = premiumInfo.isPremium;
  
  return `
    <style>
      .paywall-screen {
        padding: 20px 16px 80px;
        text-align: center;
      }
      .paywall-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      .paywall-limit-badge {
        display: inline-block;
        background: rgba(224, 85, 85, 0.15);
        color: #e05555;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
      }
      .paywall-title {
        font-size: 24px;
        font-weight: 700;
        color: #3a3530;
        margin-bottom: 24px;
      }
      .paywall-features {
        text-align: left;
        background: rgba(232,237,230,0.9);
        border-radius: 18px;
        padding: 20px;
        margin-bottom: 24px;
        box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
      }
      .paywall-feature {
        display: flex;
        align-items: center;
        padding: 10px 0;
        font-size: 15px;
        color: #555;
      }
      .paywall-feature-icon {
        margin-right: 10px;
        font-size: 18px;
      }
      .paywall-status {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 20px;
      }
      .paywall-status-active {
        background: rgba(76,175,135,0.2);
        color: #4caf87;
      }
      .paywall-get-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(145deg, #9f7aea, #805ad5);
        color: white;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
        transition: transform 0.15s;
      }
      .paywall-get-btn:active {
        transform: scale(0.97);
      }
      .paywall-active-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(145deg, #d1fae5, #a7f3d0);
        color: #065f46;
        font-size: 16px;
        font-weight: 700;
        cursor: default;
      }
    </style>
    
    <div class="paywall-screen">
      <div class="paywall-icon">👑</div>
      ${isPremium ? '<div class="paywall-status paywall-status-active">' + t("premium_status_active") + '</div>' : ''}
      ${fromLimit && !isPremium ? '<div class="paywall-limit-badge">' + t("paywall_limit_reached") + '</div>' : ''}
      <h2 class="paywall-title">${t("premium_title")}</h2>
      
      <div class="paywall-features">
        <div class="paywall-feature">
          <span class="paywall-feature-icon">📊</span>
          <span>${t("premium_feature_history")}</span>
        </div>
        <div class="paywall-feature">
          <span class="paywall-feature-icon">🧘</span>
          <div>
            <span>${t("premium_feature_practices")}</span>
            <div class="premium-desc">${t("premium_feature_practices_desc")}</div>
          </div>
        </div>
        <div class="paywall-feature">
          <span class="paywall-feature-icon">💡</span>
          <span>${t("premium_feature_ai")}</span>
        </div>
        <div class="paywall-feature">
          <span class="paywall-feature-icon">☁️</span>
          <span>${t("premium_feature_auto")}</span>
        </div>
        <div class="paywall-feature">
          <span class="paywall-feature-icon">🔄</span>
          <span>${t("premium_feature_restore")}</span>
        </div>
      </div>
      
      ${isPremium 
        ? '<button class="paywall-active-btn" disabled>✓ ' + t("premium_unlimited") + '</button>'
        : '<button class="paywall-get-btn" id="getPremiumBtn">' + t("premium_open_btn") + '</button>'
      }
    </div>
  `;
}

function bindEvents() {
  const getBtn = document.getElementById("getPremiumBtn");
  
  if (getBtn) {
    getBtn.addEventListener("click", () => {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Billing) {
        window.Capacitor.Plugins.Billing.purchase('premium_monthly');
      } else {
        showToast(t("premium_payments_later") || "Payment system coming soon");
      }
    });
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.style.cssText = "position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;white-space:nowrap;";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

export function openPaywall(fromLimitParam = false) {
  onEnter(fromLimitParam);
  
  const screens = document.querySelectorAll(".screen");
  const buttons = document.querySelectorAll("[data-nav]");
  
  screens.forEach(s => s.classList.remove("active"));
  buttons.forEach(b => b.classList.remove("active"));
  
  const paywallScreen = document.querySelector('[data-screen="paywall"]');
  if (paywallScreen) paywallScreen.classList.add("active");
}

// ===============================
// MoodOS Premium Screen
// ===============================
import { getPremiumInfo, activateTrial } from "../services/user-profile.js";
import { t } from "../i18n.js";

export function onEnter() {
  const container = document.getElementById("premium-content");
  if (!container) return;
  
  container.innerHTML = renderPremium();
  bindEvents();
}

function renderPremium() {
  const premiumInfo = getPremiumInfo();
  const statusClass = premiumInfo.status === "premium" ? "premium-active" : 
                       premiumInfo.status === "trial" ? "premium-trial" : "premium-free";
  const statusLabel = premiumInfo.status === "premium" ? t("premium_status_premium") :
                      premiumInfo.status === "trial" ? t("premium_status_trial") : t("premium_status_free");
  
  return `
    <style>
      .premium-screen {
        padding: 20px 16px 100px;
        text-align: center;
      }
      .premium-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      .premium-title {
        font-size: 24px;
        font-weight: 700;
        color: #3a3530;
        margin-bottom: 24px;
      }
      .premium-features {
        text-align: left;
        background: rgba(232,237,230,0.9);
        border-radius: 18px;
        padding: 20px;
        margin-bottom: 24px;
        box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
      }
      .premium-feature {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        font-size: 15px;
        color: #555;
      }
      .premium-feature:last-child {
        border-bottom: none;
      }
      .premium-feature-icon {
        font-size: 20px;
        margin-right: 12px;
        flex-shrink: 0;
      }
      .premium-trial {
        background: linear-gradient(145deg, #fef3c7, #fde68a);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 20px;
        font-size: 18px;
        font-weight: 700;
        color: #92400e;
        box-shadow: 4px 4px 10px rgba(0,0,0,0.1);
      }
      .premium-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(145deg, #9f7aea, #805ad5);
        color: white;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
        transition: transform 0.15s;
      }
      .premium-btn:active {
        transform: scale(0.97);
      }
      .premium-btn:disabled {
        background: linear-gradient(145deg, #9f7aea80, #805ad580);
        cursor: default;
      }
      .premium-status {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 20px;
      }
      .premium-free .premium-status {
        background: rgba(136,136,136,0.2);
        color: #888;
      }
      .premium-trial .premium-status {
        background: rgba(245,158,11,0.2);
        color: #f59e0b;
      }
      .premium-active .premium-status {
        background: rgba(76,175,135,0.2);
        color: #4caf87;
      }
    </style>
    
    <div class="premium-screen ${statusClass}">
      <div class="premium-icon">👑</div>
      <div class="premium-status">${statusLabel}${premiumInfo.status === "trial" ? " · " + premiumInfo.trialDaysLeft + " " + t("premium_days_left").toLowerCase() : ""}</div>
      <h2 class="premium-title">${t("premium_title")}</h2>
      
      <div class="premium-features">
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
            <div style="font-size:11px;color:#888;margin-top:2px;">${t("premium_feature_yearly_desc")}</div>
          </div>
        </div>
      </div>
      
      ${premiumInfo.status === "free" ? '<div style="font-size:12px;color:#888;margin-bottom:16px;">💡 ' + t("premium_yearly_savings") + '</div>' : ''}
      
      ${premiumInfo.status === "free" ? '<div class="premium-trial">' + t("premium_trial_days") + '</div>' : ''}
      
      <button id="premiumBtn" class="premium-btn" ${premiumInfo.status === "premium" ? "disabled" : ""}>
        ${premiumInfo.status === "premium" ? "✓ " + t("premium_unlimited") : t("premium_open_btn")}
      </button>
    </div>
  `;
}

function bindEvents() {
  const btn = document.getElementById("premiumBtn");
  if (!btn) return;
  
  const premiumInfo = getPremiumInfo();
  
  if (premiumInfo.status === "premium") {
    return;
  }
  
  btn.addEventListener("click", () => {
    if (premiumInfo.status === "free") {
      activateTrial();
      onEnter();
      
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.innerHTML = "✅ " + t("premium_status_trial") + "<br><small style='font-weight:400;opacity:0.9;'>7 " + t("premium_days_left").toLowerCase() + "</small>";
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 2500);
    } else if (premiumInfo.status === "trial") {
      alert(t("premium_payments_later"));
    }
  });
}

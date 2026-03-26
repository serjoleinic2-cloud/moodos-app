// ===============================
// MoodOS Paywall Screen
// ===============================
import { getPremiumInfo, activateTrial } from "../services/user-profile.js";
import { t } from "../i18n.js";

let fromLimit = false;

export function onEnter(fromLimitParam = false) {
  fromLimit = fromLimitParam;
  const container = document.getElementById("paywall-content");
  if (!container) return;
  
  container.innerHTML = renderPaywall();
  bindEvents();
}

function renderPaywall() {
  const premiumInfo = getPremiumInfo();
  const hasUsedTrial = premiumInfo.status === "trial" || premiumInfo.status === "premium";
  const showTrialBtn = !hasUsedTrial;
  
  return `
    <style>
      .paywall-screen {
        padding: 20px 16px 100px;
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
      .paywall-plans {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }
      .paywall-plan {
        width: 100%;
        padding: 16px;
        border: 2px solid transparent;
        border-radius: 16px;
        background: rgba(232,237,230,0.9);
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
      }
      .paywall-plan:active {
        transform: scale(0.98);
      }
      .paywall-plan.selected {
        border-color: #9f7aea;
        background: rgba(159, 122, 234, 0.1);
      }
      .paywall-plan-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .paywall-plan-name {
        font-size: 16px;
        font-weight: 600;
        color: #3a3530;
      }
      .paywall-plan-price {
        font-size: 18px;
        font-weight: 700;
        color: #9f7aea;
      }
      .paywall-plan-best {
        display: inline-block;
        background: linear-gradient(145deg, #fef3c7, #fde68a);
        color: #92400e;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 10px;
        margin-left: 8px;
      }
      .paywall-trial-btn {
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
      .paywall-trial-btn:active {
        transform: scale(0.97);
      }
      .paywall-trial-used {
        font-size: 13px;
        color: #888;
        margin-top: 12px;
      }
    </style>
    
    <div class="paywall-screen">
      <div class="paywall-icon">👑</div>
      ${fromLimit ? '<div class="paywall-limit-badge">' + t("paywall_limit_reached") + '</div>' : ''}
      <h2 class="paywall-title">${t("paywall_title")}</h2>
      
      <div class="paywall-features">
        <div class="paywall-feature">
          <span class="paywall-feature-icon">📊</span>
          <span>${t("premium_feature_history")}</span>
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
      
      <div class="paywall-plans">
        <button class="paywall-plan" id="planMonth">
          <div class="paywall-plan-header">
            <span class="paywall-plan-name">${t("paywall_plan_month")}</span>
            <span class="paywall-plan-price">${t("paywall_price_month")}</span>
          </div>
        </button>
        
        <button class="paywall-plan selected" id="planYear">
          <div class="paywall-plan-header">
            <span class="paywall-plan-name">
              ${t("paywall_plan_year")}
              <span class="paywall-plan-best">${t("paywall_best_value")}</span>
            </span>
            <span class="paywall-plan-price">${t("paywall_price_year")}</span>
          </div>
        </button>
      </div>
      
      ${showTrialBtn 
        ? '<button class="paywall-trial-btn" id="startTrialBtn">' + t("paywall_trial") + '</button>'
        : '<div class="paywall-trial-used">' + t("paywall_trial_used") + '</div>'
      }
    </div>
  `;
}

function bindEvents() {
  const planMonth = document.getElementById("planMonth");
  const planYear = document.getElementById("planYear");
  const trialBtn = document.getElementById("startTrialBtn");
  
  if (planMonth) {
    planMonth.addEventListener("click", () => {
      planMonth.classList.add("selected");
      if (planYear) planYear.classList.remove("selected");
      alert(t("premium_payments_later"));
    });
  }
  
  if (planYear) {
    planYear.addEventListener("click", () => {
      planYear.classList.add("selected");
      if (planMonth) planMonth.classList.remove("selected");
      alert(t("premium_payments_later"));
    });
  }
  
  if (trialBtn) {
    trialBtn.addEventListener("click", () => {
      activateTrial();
      
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.innerHTML = "✅ " + t("premium_status_trial") + "<br><small style='font-weight:400;opacity:0.9;'>7 " + t("premium_days_left").toLowerCase() + "</small>";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.remove();
        openScreen("home");
      }, 2000);
    });
  }
}

function openScreen(name) {
  const menuPanel = document.getElementById("menuPanel");
  const menuOverlay = document.getElementById("menuOverlay");
  if (menuPanel) menuPanel.style.bottom = "-400px";
  if (menuOverlay) menuOverlay.style.display = "none";
  
  const screens = document.querySelectorAll(".screen");
  const buttons = document.querySelectorAll("[data-nav]");
  
  screens.forEach(s => s.classList.remove("active"));
  buttons.forEach(b => b.classList.remove("active"));
  
  const targetScreen = document.querySelector(`[data-screen="${name}"]`);
  const targetButton = document.querySelector(`[data-nav="${name}"]`);
  
  if (targetScreen) targetScreen.classList.add("active");
  if (targetButton) targetButton.classList.add("active");
  
  import("./home.js").then(m => {
    if (m.onEnter) m.onEnter();
  }).catch(() => {});
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

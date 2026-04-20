// ===============================
// Neyra Paywall Screen (with plan selection)
// ===============================

import { t } from "../i18n.js";

let selectedPlan = "premium_monthly";

export function onEnter() {
  const container = document.getElementById("paywall-content");
  if (!container) return;

  selectedPlan = "premium_monthly";

  container.innerHTML = `
    <div style="padding:24px;text-align:center;">
      
      <div style="font-size:48px;margin-bottom:16px;">👑</div>
      
      <h2 style="font-size:22px;margin-bottom:12px;">
        ${t("paywall_title") || "Полный доступ к себе"}
      </h2>

      <p style="font-size:14px;color:#666;margin-bottom:24px;">
        ${t("paywall_subtitle") || "Разблокируй все функции приложения"}
      </p>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
        <div id="planMonthly" class="plan-card selected" data-plan="premium_monthly" style="
          padding:16px;
          border:2px solid #805ad5;
          border-radius:12px;
          background:#f8f4ff;
          cursor:pointer;
          text-align:left;
        ">
          <div style="font-size:16px;font-weight:600;color:#333;">${t("paywall_monthly") || "Месяц"}</div>
          <div style="font-size:14px;color:#805ad5;font-weight:700;">299₽<span style="font-size:12px;color:#888;font-weight:400;">/мес</span></div>
        </div>

        <div id="planYearly" class="plan-card" data-plan="premium_yearly" style="
          padding:16px;
          border:2px solid #e0e0e0;
          border-radius:12px;
          background:#fff;
          cursor:pointer;
          text-align:left;
          position:relative;
        ">
          <div style="position:absolute;top:-8px;right:12px;background:#4caf87;color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;">
            ${t("paywall_best_value") || "ВЫГОДНО"}
          </div>
          <div style="font-size:16px;font-weight:600;color:#333;">${t("paywall_yearly") || "Год"}</div>
          <div style="font-size:14px;color:#4caf87;font-weight:700;">1990₽<span style="font-size:12px;color:#888;font-weight:400;">/год</span></div>
          <div style="font-size:11px;color:#888;">${t("paywall_save") || "-33%"}</div>
        </div>
      </div>

      <button id="subscribeBtn" style="
        width:100%;
        padding:16px;
        border:none;
        border-radius:12px;
        background:#805ad5;
        color:#fff;
        font-size:16px;
        font-weight:600;
      ">
        ${t("paywall_subscribe") || "Оформить подписку"}
      </button>

      <button id="backBtn" style="
        margin-top:12px;
        background:none;
        border:none;
        color:#888;
      ">
        ${t("paywall_back") || "Назад"}
      </button>

    </div>
  `;

  bindEvents();
}

function bindEvents() {
  const planMonthly = document.getElementById("planMonthly");
  const planYearly = document.getElementById("planYearly");
  const subscribeBtn = document.getElementById("subscribeBtn");
  const backBtn = document.getElementById("backBtn");

  function selectPlan(plan) {
    selectedPlan = plan;
    
    if (planMonthly && planYearly) {
      if (plan === "premium_monthly") {
        planMonthly.style.borderColor = "#805ad5";
        planMonthly.style.background = "#f8f4ff";
        planYearly.style.borderColor = "#e0e0e0";
        planYearly.style.background = "#fff";
      } else {
        planMonthly.style.borderColor = "#e0e0e0";
        planMonthly.style.background = "#fff";
        planYearly.style.borderColor = "#805ad5";
        planYearly.style.background = "#f8f4ff";
      }
    }
  }

  if (planMonthly) {
    planMonthly.addEventListener("click", () => selectPlan("premium_monthly"));
  }

  if (planYearly) {
    planYearly.addEventListener("click", () => selectPlan("premium_yearly"));
  }

  if (subscribeBtn) {
    subscribeBtn.addEventListener("click", async () => {
      try {
        const { buyMonthly, buyYearly, isStoreReady } = await import("../services/billing-service.js");
        
        if (!isStoreReady()) {
          alert(t("paywall_billing_unavailable") || "Billing temporarily unavailable. Try later.");
          return;
        }

        if (selectedPlan === "premium_monthly") {
          await buyMonthly();
        } else if (selectedPlan === "premium_yearly") {
          await buyYearly();
        }
      } catch (e) {
        console.warn('[billing] purchase failed:', e);
        alert(t("paywall_purchase_failed") || "Purchase failed. Try again later.");
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.openScreen) {
        window.openScreen("premium");
      }
    });
  }
}

export function openPaywall() {
  onEnter();
  
  const screens = document.querySelectorAll(".screen");
  const buttons = document.querySelectorAll("[data-nav]");
  
  screens.forEach(s => s.classList.remove("active"));
  buttons.forEach(b => b.classList.remove("active"));
  
  const paywallScreen = document.querySelector('[data-screen="paywall"]');
  if (paywallScreen) paywallScreen.classList.add("active");
}

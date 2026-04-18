// ===============================
// Neyra Paywall Screen (Minimal)
// ===============================

import { t } from "../i18n.js";

export function onEnter() {
  const container = document.getElementById("paywall-content");
  if (!container) return;

  container.innerHTML = `
    <div style="padding:24px;text-align:center;">
      
      <div style="font-size:48px;margin-bottom:16px;">👑</div>
      
      <h2 style="font-size:22px;margin-bottom:12px;">
        ${t("paywall_title") || "Полный доступ к себе"}
      </h2>

      <p style="font-size:14px;color:#666;margin-bottom:24px;">
        ${t("paywall_subtitle") || "Разблокируй все функции приложения"}
      </p>

      <button id="buyBtn" style="
        width:100%;
        padding:16px;
        border:none;
        border-radius:12px;
        background:#805ad5;
        color:#fff;
        font-size:16px;
        font-weight:600;
      ">
        ${t("paywall_open_btn") || "Открыть доступ"}
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
  const buyBtn = document.getElementById("buyBtn");
  const backBtn = document.getElementById("backBtn");

  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      if (!window.store) {
        alert(t("paywall_billing_unavailable") || "Billing temporarily unavailable. Try later.");
        return;
      }
      try {
        const { buyMonthly } = await import("../services/billing-service.js");
        await buyMonthly();
      } catch (e) {
        console.warn('[billing] purchase failed');
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

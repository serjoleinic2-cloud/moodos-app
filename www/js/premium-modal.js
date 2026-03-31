// =====================================
// Neyra Premium Modal
// =====================================
import { t } from "./i18n.js";
import { activateTrial, getPremiumInfo } from "./services/user-profile.js";

let isShowing = false;

export function showPremiumModal({ title, desc, fromLimit = false }) {
  if (isShowing) return;
  isShowing = true;
  
  const premiumInfo = getPremiumInfo();
  const isPremium = premiumInfo.isPremium;
  
  const modal = document.getElementById("premium-modal");
  const titleEl = document.getElementById("premium-modal-title");
  const descEl = document.getElementById("premium-modal-desc");
  const btnEl = document.getElementById("premium-modal-btn");
  const closeEl = document.getElementById("premium-modal-close");
  
  if (!modal) {
    console.warn("Premium modal not found");
    return;
  }
  
  if (titleEl) titleEl.textContent = title || "";
  if (descEl) descEl.textContent = desc || "";
  if (btnEl) btnEl.textContent = isPremium ? t("premium_unlimited") : t("premium_try_btn");
  
  modal.style.display = "flex";
  
  const closeModal = () => {
    modal.style.display = "none";
    isShowing = false;
  };
  
  if (closeEl) {
    closeEl.onclick = closeModal;
  }
  
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  if (btnEl) {
    btnEl.onclick = () => {
      if (isPremium) {
        closeModal();
        return;
      }
      
      activateTrial();
      
      if (window.systemState) {
        window.systemState.premium = true;
      }
      
      closeModal();
      
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999;text-align:center;";
      msg.innerHTML = "✅ " + t("premium_access_granted");
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    };
  }
}

export function hidePremiumModal() {
  const modal = document.getElementById("premium-modal");
  if (modal) modal.style.display = "none";
  isShowing = false;
}

export function showGeminiLimitModal() {
  const premiumInfo = getPremiumInfo();
  if (premiumInfo.isPremium) return;
  
  const i18n = window._t || {};
  showPremiumModal({
    title: i18n["gemini_limit_reached"] || "Дневной лимит запросов исчерпан",
    desc: (i18n["gemini_limit_desc"] || "Premium даёт безлимит").replace("{used}", "5").replace("{limit}", "5"),
    fromLimit: true
  });
}

export function showHistoryLimitModal() {
  const premiumInfo = getPremiumInfo();
  if (premiumInfo.isPremium) return;
  
  const i18n = window._t || {};
  showPremiumModal({
    title: i18n["free_history_limit_title"] || "Доступна только последняя неделя",
    desc: i18n["free_history_limit_desc"] || "Полная история доступна в Premium",
    fromLimit: true
  });
}

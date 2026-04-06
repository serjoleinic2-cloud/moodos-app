// =====================================
// Neyra Premium Modal
// =====================================
import { t } from "./i18n.js";
import { getPremiumInfo } from "./services/user-profile.js";

let isShowing = false;

export function showPremiumModal({ title, desc, fromLimit = false }) {
  if (isShowing) return;
  isShowing = true;
  
  const premiumInfo = getPremiumInfo();
  const isPremiumUser = premiumInfo.isPremium;
  
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
  if (btnEl) btnEl.textContent = isPremiumUser ? t("premium_unlimited") : t("premium_open_btn");
  if (closeEl) closeEl.textContent = t("close");
  
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
      closeModal();
      if (window.navigateTo) {
        window.navigateTo("paywall");
      }
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
  
  showPremiumModal({
    title: t("gemini_limit_reached"),
    desc: t("gemini_limit_desc").replace("{used}", "5").replace("{limit}", "5"),
    fromLimit: true
  });
}

export function showHistoryLimitModal() {
  const premiumInfo = getPremiumInfo();
  if (premiumInfo.isPremium) return;
  
  showPremiumModal({
    title: t("free_history_limit_title"),
    desc: t("free_history_limit_desc"),
    fromLimit: true
  });
}

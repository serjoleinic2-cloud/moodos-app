// =====================================
// MoodOS Premium Modal
// =====================================
import { t } from "./i18n.js";

let isShowing = false;

export function showPremiumModal({ title, desc, fromLimit = false }) {
  if (isShowing) return;
  isShowing = true;
  
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
  if (btnEl) btnEl.textContent = t("premium_open_btn");
  
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
      openPremiumScreen(fromLimit);
    };
  }
}

export function hidePremiumModal() {
  const modal = document.getElementById("premium-modal");
  if (modal) modal.style.display = "none";
  isShowing = false;
}

function openPremiumScreen(fromLimit = false) {
  const menuPanel = document.getElementById("menuPanel");
  const menuOverlay = document.getElementById("menuOverlay");
  if (menuPanel) menuPanel.style.bottom = "-400px";
  if (menuOverlay) menuOverlay.style.display = "none";
  
  const screens = document.querySelectorAll(".screen");
  const buttons = document.querySelectorAll("[data-nav]");
  
  screens.forEach(s => s.classList.remove("active"));
  buttons.forEach(b => b.classList.remove("active"));
  
  const paywallScreen = document.querySelector('[data-screen="paywall"]');
  if (paywallScreen) paywallScreen.classList.add("active");
  
  import("./screens/paywall.js").then(m => {
    if (m.onEnter) m.onEnter(fromLimit);
  }).catch(e => console.warn("Failed to load paywall screen:", e));
}

export function showGeminiLimitModal() {
  const i18n = window._t || {};
  showPremiumModal({
    title: i18n["gemini_limit_reached"] || "Дневной лимит запросов исчерпан",
    desc: (i18n["gemini_limit_desc"] || "Premium даёт безлимит").replace("{used}", "5").replace("{limit}", "5"),
    fromLimit: true
  });
}

export function showHistoryLimitModal() {
  const i18n = window._t || {};
  showPremiumModal({
    title: i18n["free_history_limit_title"] || "Доступна только последняя неделя",
    desc: i18n["free_history_limit_desc"] || "Полная история доступна в Premium",
    fromLimit: true
  });
}

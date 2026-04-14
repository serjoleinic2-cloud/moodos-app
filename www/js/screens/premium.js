// ===============================
// Neyra Premium Screen
// Status screen (not paywall)
// ===============================
import { getPremiumInfo } from "../services/user-profile.js";
import { t } from "../i18n.js";

export function onEnter() {
  console.log('[PREMIUM] onEnter called');
  try {
    const container = document.getElementById("premium-content");
    if (!container) {
      console.error('[PREMIUM] Container not found');
      return;
    }
    
    container.innerHTML = renderPremium();
    bindEvents();
    console.log('[PREMIUM] Rendered successfully');
  } catch(e) {
    console.error('[PREMIUM] Render error:', e);
    const container = document.getElementById("premium-content");
    if (container) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:#e05555;">Error: ${e.message}</div>`;
    }
  }
}

const features = [
  { icon: "☁️", title: "Облачное сохранение", desc: "Синхронизация между устройствами" },
  { icon: "📊", title: "Полная история", desc: "Доступ к старым данным" },
  { icon: "🧘", title: "Медитации", desc: "Расширенная библиотека практик" },
  { icon: "🎵", title: "Музыка и звуки", desc: "Фоновые треки и атмосфера" },
  { icon: "🎨", title: "Темы оформления", desc: "Цветовые схемы интерфейса" },
  { icon: "📈", title: "Аналитика", desc: "Глубокий анализ состояния" },
  { icon: "🔒", title: "Без рекламы", desc: "Чистый интерфейс" }
];

function renderPremium() {
  const premiumInfo = getPremiumInfo();
  const isActive = premiumInfo.isPremium;
  const statusClass = premiumInfo.status === "premium" ? "premium-active" : "premium-free";
  
  let statusText = "";
  if (premiumInfo.status === "premium") {
    statusText = "👑 " + (t("premium_status_active") || "Активен");
  } else {
    statusText = t("premium_status_free") || "Бесплатная версия";
  }
  
  return `
    <style>
      .premium-screen {
        padding: 20px 16px 80px;
        text-align: center;
      }
      .premium-icon {
        font-size: 64px;
        margin-bottom: 24px;
      }
      .premium-title {
        font-size: 24px;
        font-weight: 700;
        color: #333;
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
        font-size: 14px;
        color: #666;
      }
      .premium-feature:last-child {
        border-bottom: none;
      }
      .premium-feature-icon {
        font-size: 20px;
        margin-right: 12px;
        flex-shrink: 0;
      }
      .premium-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 14px;
        background: linear-gradient(145deg, #9f7aea, #805ad5);
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 6px 6px 14px #b8c4b4, -6px -6px 14px #ffffff;
        transition: transform 0.15s;
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
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 24px;
      }
      .premium-free .premium-status-badge {
        background: rgba(136,136,136,0.2);
        color: #888;
      }
      .premium-active .premium-status-badge {
        background: rgba(76,175,135,0.2);
        color: #4caf87;
      }
      .premium-desc {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
      }
    </style>
    
    <div class="premium-screen ${statusClass}">
      <div class="premium-icon">👑</div>
      <div class="premium-status-badge">${statusText}</div>
      <h2 class="premium-title">${t("premium_title")}</h2>
      
      <div class="premium-features">
        ${features.map(f => `
          <div class="premium-feature">
            <span class="premium-feature-icon">${f.icon}</span>
            <div>
              <div>${f.title}</div>
              <div class="premium-desc">${f.desc}</div>
            </div>
          </div>
        `).join("")}
      </div>
      
      ${!isActive ? `
        <button id="premiumBtn" class="premium-btn">
          ${t("premium_open_btn")}
        </button>
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
  const premiumInfo = getPremiumInfo();
  
  if (btn) {
    btn.addEventListener("click", () => {
      if (premiumInfo.isPremium) {
        alert("У тебя уже активирован Premium");
        return;
      }

      if (window.openScreen) {
        window.openScreen("paywall");
      }
    });
  }
}

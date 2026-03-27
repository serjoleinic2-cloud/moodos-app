// ===============================
// Support Texts Module
// ===============================
import { t, getLang } from "../i18n.js";
import SystemCore from "../system-core.js";

let currentType = null;
let currentIndex = 0;
let container = null;

export function initSupportTexts(cont) {
  container = cont;
  currentType = null;
  currentIndex = 0;
  render();
}

export function onEnter() {
  currentType = null;
  currentIndex = 0;
  render();
}

function render() {
  if (!container) return;
  
  container.innerHTML = `
    <div class="support-texts-screen" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      padding: 20px;
      text-align: center;
    ">
      <h2 style="
        margin-bottom: 30px;
        color: #4a6fa5;
        font-size: 22px;
      ">${t('support_texts_title')}</h2>
      
      ${currentType === null ? renderTypeSelector() : renderTextDisplay()}
    </div>
  `;
  
  bindEvents();
}

function renderTypeSelector() {
  return `
    <div class="type-selector" style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 300px;
    ">
      <button class="type-btn" data-type="calm" style="
        padding: 16px 24px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(135deg, #a8d8ea 0%, #aa96da 100%);
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 4px 4px 12px rgba(0,0,0,0.1);
      ">🧘 ${t('support_texts_calm')}</button>
      
      <button class="type-btn" data-type="affirmations" style="
        padding: 16px 24px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(135deg, #a8e6cf 0%, #88d8b0 100%);
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 4px 4px 12px rgba(0,0,0,0.1);
      ">💬 ${t('support_texts_affirmations')}</button>
      
      <button class="type-btn" data-type="prayer" style="
        padding: 16px 24px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(135deg, #ffd3a5 0%, #fd9953 100%);
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 4px 4px 12px rgba(0,0,0,0.1);
      ">🙏 ${t('support_texts_prayer')}</button>
    </div>
  `;
}

function renderTextDisplay() {
  const texts = getTexts(currentType);
  const text = texts[currentIndex % texts.length];
  
  return `
    <div class="text-display" style="
      background: rgba(255,255,255,0.95);
      border-radius: 24px;
      padding: 32px 24px;
      margin: 20px 0;
      max-width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      animation: fadeIn 0.5s ease;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <p class="support-text" style="
        font-size: 18px;
        line-height: 1.6;
        color: #3a3a3a;
        margin: 0;
      ">${text}</p>
    </div>
    
    <button id="supportTextNext" style="
      padding: 14px 32px;
      border: none;
      border-radius: 12px;
      background: #e0e5ec;
      color: #555;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 4px 4px 8px #b8bec7, -4px -4px 8px #ffffff;
      margin-bottom: 16px;
    ">${t('support_texts_next')}</button>
    
    <div class="feedback-buttons" style="
      display: flex;
      gap: 12px;
      margin-top: 8px;
    ">
      <button id="supportTextNegative" style="
        padding: 12px 20px;
        border: none;
        border-radius: 10px;
        background: #ffebee;
        color: #c62828;
        font-size: 14px;
        cursor: pointer;
      ">${t('support_texts_not_helped')}</button>
      
      <button id="supportTextPositive" style="
        padding: 12px 20px;
        border: none;
        border-radius: 10px;
        background: #e8f5e9;
        color: #2e7d32;
        font-size: 14px;
        cursor: pointer;
      ">${t('support_texts_helped')}</button>
    </div>
    
    <button id="supportTextDone" style="
      margin-top: 24px;
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #888;
      font-size: 14px;
      cursor: pointer;
      text-decoration: underline;
    ">${t('support_texts_done')}</button>
  `;
}

function getTexts(type) {
  switch(type) {
    case 'calm':
      return t('support_texts_calm_list');
    case 'affirmations':
      return t('support_texts_affirmations_list');
    case 'prayer':
      return t('support_texts_prayer_list');
    default:
      return [];
  }
}

function sendFeedback(result) {
  if (SystemCore) {
    SystemCore.dispatch('SUPPORT_TEXT_FEEDBACK', {
      result: result,
      type: currentType,
      textIndex: currentIndex
    });
  }
}

function bindEvents() {
  const typeBtns = document.querySelectorAll('.type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      currentIndex = 0;
      render();
    });
  });
  
  const nextBtn = document.getElementById('supportTextNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentIndex++;
      render();
    });
  }
  
  const positiveBtn = document.getElementById('supportTextPositive');
  if (positiveBtn) {
    positiveBtn.addEventListener('click', () => {
      sendFeedback('positive');
      currentIndex++;
      render();
    });
  }
  
  const negativeBtn = document.getElementById('supportTextNegative');
  if (negativeBtn) {
    negativeBtn.addEventListener('click', () => {
      sendFeedback('negative');
      currentIndex++;
      render();
    });
  }
  
  const doneBtn = document.getElementById('supportTextDone');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      if (window.navigateTo) {
        window.navigateTo('home');
      }
    });
  }
}

window.SupportTextsModule = {
  init: initSupportTexts,
  onEnter: onEnter
};

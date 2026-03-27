// ===============================
// Support Texts Module
// ===============================
import { getMood } from "../state.js";
import { addSessionEntry } from "../services/memory.js";
import SystemCore from "../system-core.js";
import { t } from "../i18n.js";

let currentType = null;
let currentIndex = 0;
let container = null;
let sessionStartTime = null;
let moodBeforeSession = null;
let result = null;

function showToast(message) {
  const existing = document.getElementById('stToast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'stToast';
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 9999;
    animation: fadeInUp 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

export function initSupportTexts(cont) {
  container = cont;
  currentType = null;
  currentIndex = 0;
  sessionStartTime = Date.now();
  moodBeforeSession = getMood();
  render();
  bindEvents();
}

export function onEnter() {
  currentType = null;
  currentIndex = 0;
  sessionStartTime = Date.now();
  moodBeforeSession = getMood();
  render();
  bindEvents();
}

function render() {
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align:center; margin-top:20px;">
      <h2 style="margin-bottom:6px;">${t("support_texts_title")}</h2>
      
      ${currentType === null ? renderTypeSelector() : renderTextDisplay()}
    </div>
  `;
}

function renderTypeSelector() {
  return `
    <div style="display:flex;flex-direction:column;gap:14px;padding:0 4px;">
      <div id="stCalm" style="padding:16px 20px;border-radius:16px;cursor:pointer;background:#a8d8ea;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#fff;font-size:16px;font-weight:500;">🧘 ${t("support_texts_calm")}</div>
      <div id="stAffirmations" style="padding:16px 20px;border-radius:16px;cursor:pointer;background:#a8e6cf;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#fff;font-size:16px;font-weight:500;">💬 ${t("support_texts_affirmations")}</div>
      <div id="stPrayer" style="padding:16px 20px;border-radius:16px;cursor:pointer;background:#ffd3a5;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#fff;font-size:16px;font-weight:500;">🙏 ${t("support_texts_prayer")}</div>
    </div>
  `;
}

function renderTextDisplay() {
  const texts = getTexts(currentType);
  const text = texts[currentIndex % texts.length];
  
  return `
    <div style="margin:20px 4px 16px;padding:24px 16px;border-radius:20px;background:#fff;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;min-height:100px;display:flex;align-items:center;justify-content:center;">
      <p style="font-size:17px;line-height:1.6;color:#444;margin:0;">${text}</p>
    </div>
    
    <div style="display:flex;justify-content:center;gap:10px;margin-bottom:20px;">
      <div id="stNext" style="padding:14px 24px;border-radius:14px;cursor:pointer;background:#e0e5ec;box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;color:#555;font-size:15px;">${t("support_texts_next")}</div>
    </div>
    
    <div id="stFeedback" style="flex-direction:column;gap:14px;align-items:center;margin-top:10px;">
      <div style="font-size:16px;color:#666;margin-bottom:6px;">${t("md_how_feel")}</div>
      <div id="stHelped" style="width:75%;padding:16px;border-radius:18px;cursor:pointer;background:#e0e5ec;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;color:#4a7c59;font-size:18px;text-align:center;">👍 ${t("hist_helped")}</div>
      <div id="stNotHelped" style="width:75%;padding:16px;border-radius:18px;cursor:pointer;background:#e0e5ec;box-shadow:6px 6px 12px #b8bec7,-6px -6px 12px #ffffff;color:#888;font-size:18px;text-align:center;">👎 ${t("hist_not_helped")}</div>
    </div>
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

function bindEvents() {
  const stCalm = document.getElementById("stCalm");
  if (stCalm) {
    const newBtn = stCalm.cloneNode(true);
    stCalm.replaceWith(newBtn);
    newBtn.onclick = () => selectType('calm');
  }
  
  const stAffirmations = document.getElementById("stAffirmations");
  if (stAffirmations) {
    const newBtn = stAffirmations.cloneNode(true);
    stAffirmations.replaceWith(newBtn);
    newBtn.onclick = () => selectType('affirmations');
  }
  
  const stPrayer = document.getElementById("stPrayer");
  if (stPrayer) {
    const newBtn = stPrayer.cloneNode(true);
    stPrayer.replaceWith(newBtn);
    newBtn.onclick = () => selectType('prayer');
  }
  
  const stNext = document.getElementById("stNext");
  if (stNext) {
    const newBtn = stNext.cloneNode(true);
    stNext.replaceWith(newBtn);
    newBtn.onclick = () => {
      currentIndex++;
      render();
      bindEvents();
    };
  }
  
  const stHelped = document.getElementById("stHelped");
  if (stHelped) {
    const newBtn = stHelped.cloneNode(true);
    stHelped.replaceWith(newBtn);
    newBtn.onclick = () => saveSessionWithResult("positive");
  }
  
  const stNotHelped = document.getElementById("stNotHelped");
  if (stNotHelped) {
    const newBtn = stNotHelped.cloneNode(true);
    stNotHelped.replaceWith(newBtn);
    newBtn.onclick = () => saveSessionWithResult("negative");
  }
}

function selectType(type) {
  currentType = type;
  currentIndex = 0;
  sessionStartTime = Date.now();
  moodBeforeSession = getMood();
  render();
  bindEvents();
}

async function saveSessionWithResult(res) {
  result = res;
  
  const moodAfter = getMood();
  const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  const analysisResult = await SystemCore.analyzeMoodOnly(moodAfter);
  const stateAfter = analysisResult ? analysisResult.state : null;
  
  addSessionEntry({
    type: "support-texts",
    moodBefore: moodBeforeSession,
    stateBefore: null,
    moodAfter,
    stateAfter,
    result: result,
    duration,
    category: currentType,
    textIndex: currentIndex,
    timestamp: Date.now()
  });
  
  SystemCore.dispatch('GENERATE_INSIGHT', {
    type: 'practice',
    source: 'support_texts',
    result: result
  });
  
  showToast('✓ ' + t("saved_check"));
  
  sessionStartTime = null;
  moodBeforeSession = null;
  result = null;
  
  setTimeout(() => {
    if (window.navigateTo) {
      window.navigateTo('home');
    }
  }, 500);
}

window.SupportTextsModule = {
  init: initSupportTexts,
  onEnter: onEnter
};

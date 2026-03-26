import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
import { analyzeLatestVoice } from "./ai/voice-analysis.js";
import SystemCore from "./system-core.js";

window.SystemCore = SystemCore;
import {
  getMoodHistory, getNotesHistory
} from "./services/memory.js";
import {
  calculateStabilityScore, calculateTrend, calculateGoldenHour
} from "./services/analytics.js";
import {
  initState, getUsageDays, getMood, setMood, getAvatarState, setAvatarState
} from "./state.js";
import { isOnboardingDone, canMakeGeminiRequest, incrementGeminiCounter } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang } from "./i18n.js";
import { showAvatar, initAvatarTap, maybeShowAvatarProactive, trackUserActivity } from "./avatar.js";
import { showPremiumModal } from "./premium-modal.js";
import { checkPremiumExpiry, deactivateExpiredPremium } from "./services/user-profile.js";

/* ---------- ИНСАЙТ ДНЯ ---------- */
function buildDayInsight() {
  const today = new Date();
  const todayStr = today.toDateString();
  const moodHistory = getMoodHistory();
  const notesHistory = getNotesHistory();
  const todayMoods = moodHistory.filter(h => new Date(h.time).toDateString() === todayStr);
  const todayNotes = notesHistory.filter(n => new Date(n.time || n.timestamp).toDateString() === todayStr);

  if (todayMoods.length === 0 && todayNotes.length === 0) return t("insight_first");

  const parts = [];
  const total = todayMoods.length + todayNotes.length;
  if (total === 1) parts.push(t("insight_entries_1"));
  else parts.push(t("insight_entries_many").replace("{n}", total));

  if (todayMoods.length >= 2) {
    const first = todayMoods[0].value;
    const last  = todayMoods[todayMoods.length - 1].value;
    const diff  = last - first;
    if (diff > 5)       parts.push(t("insight_mood_up").replace("{a}", first).replace("{b}", last));
    else if (diff < -5) parts.push(t("insight_mood_down").replace("{a}", first).replace("{b}", last));
    else                parts.push(t("insight_mood_stable").replace("{v}", last));
  } else if (todayMoods.length === 1) {
    parts.push(t("insight_mood_now").replace("{v}", todayMoods[0].value));
  }

  if (todayNotes.length > 0) {
    const lastNote = todayNotes[todayNotes.length - 1];
    if (lastNote.result && lastNote.result.state) {
      parts.push(t("insight_topic").replace("{s}", lastNote.result.state));
    }
  }

  return parts.join(" ");
}

/* ---------- RENDER ----------- */
export function render() {
  const mood = getMood();

  const daysEl = document.getElementById("daysTogether");
  if (daysEl) {
    const days = getUsageDays ? getUsageDays() : getDaysFromStorage();
    daysEl.textContent = `${t("home_days")} ${days} ${getDaysLabel(days)}`;
  }

  const moodValue = document.getElementById("moodValue");
  if (moodValue) moodValue.textContent = mood + "%";

  // НЕ пишем moodSlider.value — триггерит events на Android WebView

  const fill = document.querySelector(".ecs-fill");
  if (fill) fill.style.width = mood + "%";

  const insightEl = document.getElementById("todayInsight");
  if (insightEl) {
    insightEl.textContent = buildDayInsight();
    insightEl.removeAttribute("data-user-set");
  }

  const history = getMoodHistory();
  const stability = calculateStabilityScore(history);
  const trend     = calculateTrend(history);
  const valueEl   = document.getElementById("stabilityValue");
  const trendEl   = document.getElementById("stabilityTrend");
  if (valueEl) valueEl.textContent = stability !== null ? stability + "%" : "—";
  if (trendEl) trendEl.textContent = trend;

  const goldenEl = document.getElementById("goldenHours");
  if (goldenEl) {
    const g = calculateGoldenHour(history);
    if (g === null) goldenEl.textContent = t("golden_studying");
    else goldenEl.textContent = t("golden_peak").replace("{start}", g.start).replace("{end}", g.end);
  }
}

function getDaysFromStorage() {
  try {
    const history = JSON.parse(localStorage.getItem("mood_history") || "[]");
    
    if (history && history.length > 0) {
      const validHistory = history.filter(e => e.time || e.date);
      if (validHistory.length > 0) {
        const sorted = [...validHistory].sort((a, b) => (a.time || a.date) - (b.time || b.date));
        const firstEntry = sorted[0];
        const firstDate = firstEntry?.time || firstEntry?.date;
        
        if (firstDate) {
          const start = new Date(parseInt(firstDate));
          const diff = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)) + 1;
          return Math.max(1, diff);
        }
      }
    }
    
    const start = localStorage.getItem("startDate");
    if (!start) { localStorage.setItem("startDate", Date.now()); return 1; }
    return Math.max(1, Math.ceil((Date.now() - parseInt(start)) / 86400000));
  } catch(e) { return 1; }
}

/* ---------- DOM TRANSLATIONS ---------- */
function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.getAttribute("data-user-set") === "true") return;
    const val = t(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-placeholder'));
    if (val) el.placeholder = val;
  });
}

/* ---------- BOOT ---------- */
console.log('[BOOT] DOMContentLoaded listener registered');

document.addEventListener("DOMContentLoaded", () => {
  console.log('[BOOT] DOMContentLoaded fired');
  try {
    initState();
    console.log('[BOOT] initState done');
  } catch (e) {
    console.error('[BOOT ERROR] initState:', e);
  }
  
  try {
    initUI();
    console.log('[BOOT] initUI done');
  } catch (e) {
    console.error('[BOOT ERROR] initUI:', e);
  }
  
  applyDomTranslations();

  if (!isOnboardingDone()) {
    initOnboarding(() => {
      applyDomTranslations();
      try {
        startApp();
        console.log('[BOOT] startApp done (after onboarding)');
      } catch (e) {
        console.error('[BOOT ERROR] startApp:', e);
      }
    });
  } else {
    try {
      startApp();
      console.log('[BOOT] startApp done');
    } catch (e) {
      console.error('[BOOT ERROR] startApp:', e);
    }
  }
});

const AVATAR_WIDTH = 50;
const AVATAR_HEIGHT = 50;

console.log('[AUDIT] === APP STARTING ===');

function startApp() {
  console.log('[AUDIT] startApp called');
  
  try {
    initAvatarTap();
    console.log('[AUDIT] initAvatarTap done');
  } catch (e) {
    console.error('[AUDIT ERROR] initAvatarTap:', e);
  }
  
  setTimeout(() => {
    try {
      console.log('[AUDIT] Setting avatar state');
      setAvatarState({ visible: true, isIdle: true });
      renderAvatar();
      console.log('[AUDIT] Avatar rendered');
    } catch (e) {
      console.error('[AUDIT ERROR] renderAvatar:', e);
    }
  }, 100);
  
  trackUserActivity();
  
  document.addEventListener('click', trackUserActivity, { passive: true });
  document.addEventListener('touchstart', trackUserActivity, { passive: true });
  document.addEventListener('scroll', trackUserActivity, { passive: true });
  
  setTimeout(() => {
    maybeShowAvatarProactive();
  }, 3000);
  
  if (checkPremiumExpiry()) {
    deactivateExpiredPremium();
    showPremiumModal({
      title: t("premium_expired_title"),
      desc: t("premium_expired_desc")
    });
  }
  
  initNavigation();

  // Обновляем недельные блоки тихо в фоне
  setTimeout(() => {
    import("./services/weekly-analytics.js")
      .then(m => m.updateWeeklyBlocks())
      .catch(() => {});
  }, 2000);

  setTimeout(async () => {
    try {
      const { checkAutoReminder } = await import("./screens/pdf-report.js");
      checkAutoReminder();
    } catch(e) {
      console.warn("checkAutoReminder failed:", e);
    }
  }, 3000);

  const btn         = document.getElementById("analyzeNoteBtn");
  const note        = document.getElementById("dailyNote");
  const output      = document.getElementById("aiResponse");
  const voiceOutput = document.getElementById("voiceAIResponse");

  if (btn && note) {
    btn.addEventListener("click", () => {
      console.log('AI note clicked');
      const text   = note.value;
      const mood   = getMood();
      const slider = document.getElementById("moodSlider");
      const moodValue = slider ? Number(slider.value) : mood;

      const limitCheck = canMakeGeminiRequest();
      if (!limitCheck.allowed) {
        showPremiumModal({
          title: t("gemini_limit_reached"),
          desc: t("gemini_limit_desc")
            .replace("{used}", limitCheck.used)
            .replace("{limit}", limitCheck.limit)
        });
        return;
      }

      incrementGeminiCounter();
      const result = analyzeText(text, moodValue);

      if (output) {
        output.textContent = result.insight;
        output.setAttribute("data-user-set", "true");
        output.removeAttribute("data-i18n");
        output.classList.add("ai-message");
        output.style.opacity = "0";
        requestAnimationFrame(() => { output.style.opacity = "1"; });
      }

      SystemCore.dispatch('SAVE_NOTE', { text, mood, result });
      render();
    });
  }

  render();
  // subscribe(render) убран — вызывал бесконечный цикл

  const recordBtn   = document.getElementById("recordVoiceBtn");
  const voiceStatus = document.getElementById("voiceStatus");

  if (recordBtn && voiceStatus) {
    recordBtn.addEventListener("click", () => {
      if (output) output.classList.remove("ai-message");

      const timerEl = document.getElementById("voiceTimer");
      recordBtn.disabled = true;
      voiceStatus.textContent = t("voice_recording");

      let countdown = 10;
      if (timerEl) timerEl.textContent = countdown;

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          if (timerEl) timerEl.textContent = countdown;
        } else {
          clearInterval(countdownInterval);
          if (timerEl) timerEl.textContent = "";
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(countdownInterval);
        if (timerEl) timerEl.textContent = "";
        voiceStatus.textContent = "";
        recordBtn.disabled = false;
      };

      startVoiceRecording(voiceStatus, () => {
        cleanup();
        const result = analyzeLatestVoice();
        if (result && voiceOutput) {
          voiceOutput.textContent = result.insight;
          voiceOutput.classList.add("ai-message");
        }
      }).catch(() => {
        cleanup();
        voiceStatus.textContent = "❌";
      });
    });
  }
}

/* ---------- HELPERS ---------- */
// updateStabilityHistory moved to SystemCore

function getViewportWidth() {
  return window.visualViewport?.width || window.innerWidth;
}

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight;
}

let renderCounter = 0;
const MAX_RENDERS = 100;
let lastRenderTime = 0;

/* ---------- AVATAR RENDERER ---------- */
export function renderAvatar() {
  renderCounter++;
  const now = Date.now();
  
  if (renderCounter > MAX_RENDERS) {
    console.error('[AUDIT ERROR] Too many renders! Possible infinite loop.');
    return;
  }
  
  if (now - lastRenderTime < 16) {
    console.warn('[AUDIT] Rapid renders detected:', renderCounter);
  }
  lastRenderTime = now;
  
  console.log('[AUDIT] renderAvatar #', renderCounter);
  
  const container = document.getElementById('avatar-container');
  if (!container) {
    console.error('[AUDIT] Container not found');
    return;
  }
  
  const avatarState = getAvatarState();
  console.log('[AUDIT] Avatar state:', JSON.stringify(avatarState));
  
  let x = avatarState.position?.x;
  let y = avatarState.position?.y;
  
  if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
    console.log('[AUDIT] Invalid position, resetting');
    x = 20;
    y = 100;
    setAvatarState({ position: { x, y } });
  }
  
  const viewportWidth = getViewportWidth();
  const viewportHeight = getViewportHeight();
  console.log('[AUDIT] Viewport:', { width: viewportWidth, height: viewportHeight });
  
  if (avatarState.isIdle) {
    x = viewportWidth - (AVATAR_WIDTH + 10);
    y = Math.min(y || 100, viewportHeight - AVATAR_HEIGHT - 80);
  }
  
  console.log('[AUDIT] Final position:', { x, y });
  container.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  
  if (avatarState.isIdle) {
    container.classList.add('idle');
  } else {
    container.classList.remove('idle');
  }
  
  const textEl = document.getElementById('avatar-text');
  const actionsEl = document.getElementById('avatar-actions');
  const bubble = document.getElementById('avatar-bubble');
  
  if (avatarState.visible) {
    if (textEl) textEl.textContent = avatarState.message;
    if (actionsEl) actionsEl.innerHTML = '';
    
    if (avatarState.actions && avatarState.actions.length > 0) {
      avatarState.actions.slice(0, 2).forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'avatar-action-btn';
        btn.textContent = action.label;
        btn.onclick = () => {
          if (window.navigateTo) {
            window.navigateTo(action.action);
          }
          setAvatarState({ visible: false });
          renderAvatar();
        };
        if (actionsEl) actionsEl.appendChild(btn);
      });
    }
    
    container.classList.add('active');
  } else {
    container.classList.remove('active');
  }
  
  if (bubble) {
    const viewportWidth = getViewportWidth();
    const isRightSide = x > (viewportWidth / 2);
    const isNearTop = y < 80;
    
    bubble.classList.remove('right', 'left', 'bottom');
    
    if (isRightSide) {
      bubble.classList.add('left');
    } else {
      bubble.classList.add('right');
    }
    
    if (isNearTop) {
      bubble.classList.add('bottom');
    }
  }
}

window.renderAvatarApp = renderAvatar;

window.AUDIT = {
  disableAvatar: function() {
    const el = document.getElementById('avatar-container');
    if (el) {
      el.style.pointerEvents = 'none';
      el.style.display = 'none';
      console.log('[AUDIT] Avatar disabled');
    }
  },
  enableAvatar: function() {
    const el = document.getElementById('avatar-container');
    if (el) {
      el.style.pointerEvents = 'auto';
      el.style.display = 'block';
      console.log('[AUDIT] Avatar enabled');
    }
  },
  testUI: function() {
    console.log('=== UI TEST ===');
    const el = document.elementFromPoint(100, 100);
    console.log('elementAt100,100:', el?.tagName, el?.id);
    const avatarEl = document.getElementById('avatar-container');
    if (avatarEl) {
      const rect = avatarEl.getBoundingClientRect();
      console.log('Avatar rect:', rect);
    }
  },
  getState: function() {
    return window.renderAvatarApp ? 'renderAvatar available' : 'renderAvatar NOT available';
  }
};

console.log('[AUDIT] Functions registered. Use: AUDIT.disableAvatar(), AUDIT.enableAvatar(), AUDIT.testUI()');

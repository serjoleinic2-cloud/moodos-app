// app.js — Neyra boot
// ⚠️ IMPORTS ДОЛЖНЫ быть в начале файла (ES modules requirement)

// ✅ Export для импорта из других модулей
export function _trustedSetBillingPremium(val) {
  window.__NEYRA_SECURITY__ = window.__NEYRA_SECURITY__ || { billingPremium: false };
  window.__NEYRA_SECURITY__.billingPremium = val === true;
}

import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
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
import { isOnboardingDone, canMakeGeminiRequest, incrementGeminiCounter, getTheme, applyTheme } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang } from "./i18n.js";
import { showAvatar, initAvatarTap, maybeShowAvatarProactive, trackUserActivity } from "./avatar.js";
import { showPremiumModal } from "./premium-modal.js";
import { checkPremiumExpiry, deactivateExpiredPremium, reconcileSystemState, isPremium } from "./services/user-profile.js";
import { initCheckpointRecovery } from "./services/checkpoint-manager.js";
import { refreshBilling, initBilling } from "./services/billing-service.js";
import { stateGovernance } from "./core/state-governance.js";
import { enqueuePremiumChanged, recoverEvents } from "./core/event-queue.js";
import { runReconciliation } from "./core/state-execution-engine.js";

// =====================================
// 🛡️ MULTI INIT GUARD
// =====================================
if (!window.__neyraAppRunning) {
  window.__neyraAppRunning = true;

  // 🔐 GLOBAL SINGLETON STORAGE
  window.__NEYRA_SECURITY__ = window.__NEYRA_SECURITY__ || {
    billingPremium: false
  };

  // ❗ defineProperty ТОЛЬКО ОДИН РАЗ
  if (!Object.getOwnPropertyDescriptor(window, '_billingPremium')) {
    Object.defineProperty(window, '_billingPremium', {
      get: () => window.__NEYRA_SECURITY__.billingPremium,
      set: () => {
        console.warn('[SECURITY] BLOCKED direct write to _billingPremium');
      },
      configurable: false
    });
    console.log('[SECURITY] billingPremium LOCKED');
  }

  // ✅ TRUSTED SETTER на window
  window._trustedSetBillingPremium = function(val) {
    window.__NEYRA_SECURITY__.billingPremium = val === true;
  };

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
  function render() {
    const mood = getMood();

    const daysEl = document.getElementById("daysTogether");
    if (daysEl) {
      const days = getUsageDays ? getUsageDays() : getDaysFromStorage();
      daysEl.textContent = `${t("home_days")} ${days} ${getDaysLabel(days)}`;
    }

    const moodValue = document.getElementById("moodValue");
    if (moodValue) moodValue.textContent = mood + "%";

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

  // ✅ Export render на window для других модулей
  window.__neyraRender = render;

  function getDaysFromStorage() {
    try {
      const history = JSON.parse(localStorage.getItem("mood_history") || "[]");
      
      if (history && history.length > 0) {
        const validHistory = history.filter(e => e.time || e.date);
        if (validHistory.length > 0) {
          const sorted = [...validHistory].sort((a, b) => (a.time || a.date) - (b.time || a.date));
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
    
    // Используем trusted setter
    window._trustedSetBillingPremium(false);
    
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

    // Инициализация daily snapshots
    setTimeout(() => {
      import("./services/daily-snapshots.js")
        .then(m => m.initSnapshots())
        .catch(e => console.warn("[BOOT] initSnapshots failed:", e));
    }, 100);

    // Применяем тему при запуске
    try {
      const theme = getTheme();
      applyTheme(theme);
    } catch (e) {
      console.warn('[BOOT] theme apply failed:', e);
    }

    // Слушаем изменение темы
    document.addEventListener("themeChanged", (e) => {
      applyTheme(e.detail.theme);
    });
    
    // Слушаем изменения entitlement
    document.addEventListener("premiumChanged", () => {
      enqueuePremiumChanged();
      reconcileSystemState();
    });
    
    // Reconciliation при resume приложения
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        runReconciliation();
        refreshBilling();
      } else {
        if (window.systemState?.currentScreen) {
          import("./services/checkpoint-manager.js").then(m => {
            m.saveCheckpointOnExit(window.systemState.currentScreen, window.systemState.currentScreen);
          });
        }
      }
    });
    
    applyDomTranslations();

    if (!isOnboardingDone()) {
      initOnboarding(() => {
        applyDomTranslations();
        startApp();
      });
    } else {
      startApp();
    }
  });

  function startApp() {
    console.log('[APP] startApp called');
    
    stateGovernance.enable();
    
    initBilling();
    
    initCheckpointRecovery();
    
    setTimeout(() => {
      runReconciliation();
      refreshBilling();
      recoverEvents();
    }, 500);
    
    try {
      initNavigation();
    } catch (e) {
      console.error('[APP ERROR] initNavigation:', e);
    }
    
    const initAvatar = () => {
      try {
        initAvatarTap();
        showAvatar({ text: t("home_welcome"), source: 'welcome', force: true });
        maybeShowAvatarProactive();
      } catch (e) {
        console.warn('[APP] Avatar init failed:', e);
      }
    };
    
    const moodSlider = document.getElementById("moodSlider");
    if (moodSlider) {
      moodSlider.addEventListener("input", () => {
        trackUserActivity();
      });
      moodSlider.addEventListener("change", () => {
        trackUserActivity();
      });
    }
    
    function setRecordingUI(isRecording) {
      document.body.classList.toggle('recording', isRecording);
    }
    
    const analyzeNoteBtn = document.getElementById("analyzeNoteBtn");
    if (analyzeNoteBtn) {
      analyzeNoteBtn.addEventListener("click", async () => {
        const noteEl = document.getElementById("dailyNote");
        const responseEl = document.getElementById("aiResponse");
        if (!noteEl || !responseEl) return;
        
        const text = noteEl.value.trim();
        if (!text) return;
        
        const mood = getMood();
        responseEl.textContent = t("home_ai_listening") || "Анализирую...";
        
        SystemCore.dispatch('GENERATE_INSIGHT', {
          type: 'note',
          source: 'daily-reflection',
          result: null,
          text: text,
          mood: mood
        }).then(() => {
          if (responseEl) responseEl.textContent = "";
        });
      });
    }
    
    const voiceBtn = document.getElementById("recordVoiceBtn");
    if (voiceBtn) {
      voiceBtn.addEventListener("click", () => {
        trackUserActivity();
        const voiceStatus = document.getElementById("voiceStatus");
        
        SystemCore.dispatch('VOICE_START');
        setRecordingUI(true);
        
        let recordSeconds = 0;
        const timerEl = document.createElement("div");
        timerEl.id = "voiceRecordingTimer";
        document.body.appendChild(timerEl);

        const timerInterval = setInterval(() => {
          recordSeconds++;
          const m = String(Math.floor(recordSeconds/60)).padStart(2,'0');
          const s = String(recordSeconds%60).padStart(2,'0');
          timerEl.textContent = '⏺ ' + m + ':' + s;
        }, 1000);

        const cleanup = () => {
          clearInterval(timerInterval);
          const existingTimer = document.getElementById("voiceRecordingTimer");
          if (existingTimer) existingTimer.remove();
          if (voiceStatus) voiceStatus.textContent = "";
          voiceBtn.disabled = false;
          setRecordingUI(false);
        };

        startVoiceRecording(voiceStatus, () => {
          cleanup();
        }).catch(() => {
          cleanup();
          if (voiceStatus) voiceStatus.textContent = "❌";
        });
      });
    }
    
    initAvatar();
    console.log('[BOOT] startApp done');
  }

  window.addEventListener("resize", () => {
    // debounce
  }, { passive: true });
}

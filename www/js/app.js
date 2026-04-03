// app.js — Neyra boot

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
import { refreshBilling } from "./services/billing-service.js";
import { stateGovernance } from "./core/state-governance.js";
import { enqueuePremiumChanged, recoverEvents } from "./core/event-queue.js";

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
  
  // FIX 1: Safe default state — prevents undefined premium state
  window._billingPremium = false;
  
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
      // Save checkpoint when app goes to background
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



function startApp() {
  stateGovernance.enable();
  
  setTimeout(async () => {
    const recoveryResult = await recoverEvents();
    if (recoveryResult.recovered > 0) {
      console.log('[APP] Recovered', recoveryResult.recovered, 'events from queue');
    }
  }, 500);
  
  // ── Avatar ──
  try {
    initAvatarTap(); // sets up drag, tap, restores position
  } catch (e) {
    console.error('[BOOT] initAvatarTap:', e);
  }

  setTimeout(() => {
    maybeShowAvatarProactive();
  }, 3000);
  
  // ── Activity tracking ──
  trackUserActivity();
  document.addEventListener('click',      trackUserActivity, { passive: true });
  document.addEventListener('touchstart', trackUserActivity, { passive: true });
  document.addEventListener('scroll',     trackUserActivity, { passive: true });

  if (checkPremiumExpiry()) {
    deactivateExpiredPremium();
    showPremiumModal({
      title: t("premium_expired_title"),
      desc: t("premium_expired_desc")
    });
  }
  
  reconcileSystemState();
  
  const checkpoint = initCheckpointRecovery();
  if (checkpoint) {
    console.log("[APP] Recovered from checkpoint:", checkpoint.screen);
  }
  
  initNavigation();

  // Устанавливаем флаг готовности
  if (window.systemState) {
    window.systemState.isReady = true;
  }

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

  setTimeout(async () => {
    try {
      const { initBackupSystem, autoBackup } = await import("./services/drive-backup.js");
      initBackupSystem();
      await autoBackup();
    } catch(e) {
      console.warn("autoBackup failed:", e);
    }
  }, 4500);

  setTimeout(async () => {
    try {
      const { initBilling } = await import("./services/billing-service.js");
      initBilling();
    } catch(e) {
      console.warn("initBilling failed:", e);
    }
  }, 500);



  const btn         = document.getElementById("analyzeNoteBtn");
  const note        = document.getElementById("dailyNote");
  const output      = document.getElementById("aiResponse");

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

// renderAvatar is defined in avatar.js and imported via initAvatarTap.
// app.js does NOT re-implement it — that was the source of the x/y bug.
// window.renderAvatarApp is set inside avatar.js itself if needed.

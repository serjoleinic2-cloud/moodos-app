// Cache-bust — версия подтягивается автоматически из package.json
const _savedAppVersion = localStorage.getItem('app_version');
if (_savedAppVersion !== __APP_VERSION__) {
  localStorage.setItem('app_version', __APP_VERSION__);
  if (_savedAppVersion !== null) {
    window.location.reload(true);
  }
}

// app.js — Neyra boot
// ⚠️ IMPORTS ДОЛЖНЫ быть в начале файла (ES modules requirement)

// ✅ Export для импорта из других модулей
export function _trustedSetBillingPremium(val) {
  window.__NEYRA_SECURITY__ = window.__NEYRA_SECURITY__ || { billingPremium: false };
  window.__NEYRA_SECURITY__.billingPremium = val === true;
}

// Cloud restore flags
window._appReady = false;
window._pendingCloudData = null;

import { initNavigation } from "./navigation.js";
import { initUI } from "./ui-controller.js";
import { analyzeText } from "./ai/offline-ai.js";
import { startVoiceRecording } from "./ai/voice.js";
import SystemCore from "./system-core.js";

window.SystemCore = SystemCore;
import { restoreFromCloudIfEmpty } from "./services/cloud-restore.js";

// Cloud restore callback (called from Android)
window.onCloudData = function(data) {
  console.log('[CLOUD] DATA RECEIVED');

  if (window._appReady) {
    restoreFromCloudIfEmpty(data);
  } else {
    window._pendingCloudData = data;
  }
};

import {
  getMoodHistory, getNotesHistory, migrateVoiceStorage
} from "./services/memory.js";
import {
  calculateStabilityScore, calculateTrend, calculateGoldenHour
} from "./services/analytics.js";
import {
  initState, getUsageDays, getMood, setMood, getAvatarState, setAvatarState
} from "./state.js";
import { isOnboardingDone, canMakeGeminiRequest, incrementGeminiCounter, getTheme, applyTheme } from "./services/user-profile.js";
import { initOnboarding } from "./onboarding.js";
import { t, getDaysLabel, getLang, setLang } from "./i18n.js";
import { getSelectedEvents } from "./events.js";
import { showAvatar, initAvatarTap, maybeShowAvatarProactive, trackUserActivity } from "./avatar.js";
import { showPremiumModal } from "./premium-modal.js";
import { safeGenerateInsight, generateInsight } from "./ai/offline-ai.js";
import { checkPremiumExpiry, deactivateExpiredPremium, reconcileSystemState, isPremium } from "./services/user-profile.js";

// Make isPremium globally accessible
window.isPremium = isPremium;
import { initCheckpointRecovery } from "./services/checkpoint-manager.js";
import { refreshBilling, initBilling } from "./services/billing-service.js";
import { stateGovernance } from "./core/state-governance.js";
import { enqueuePremiumChanged, recoverEvents } from "./core/event-queue.js";
import { runReconciliation } from "./core/state-execution-engine.js";
import { checkAutoReminder } from './screens/pdf-report.js';
import { checkRemindersOnBoot } from './services/reminders-service.js';

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
  window._trustedSetBillingPremium = function(value) {
    console.log("[SECURITY] trusted premium set:", value);
    window.__NEYRA_SECURITY__.billingPremium = value === true;
    window.__internalPremium = value === true;
  };




  function showMedalAvatarNotification(medal, onDismiss) {
    const existing = document.getElementById('medalNotification');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'medalNotification';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      animation: fadeInMedal 0.3s ease;
    `;

    const medalName = t('medal_' + medal.id) || medal.id;
    const medalDesc = t('medal_' + medal.id + '_desc') || '';

    overlay.innerHTML = `
      <style>
        @keyframes fadeInMedal {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popInMedal {
          from { transform: scale(0.6) translateY(40px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        @keyframes shineEffect {
          0%   { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(300%)  rotate(25deg); }
        }
        .medal-notif-card {
          background: linear-gradient(160deg, #d4ede8, #e8e0d5);
          border-radius: 28px;
          padding: 36px 28px 28px;
          text-align: center;
          max-width: 300px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(0,0,0,0.25);
          animation: popInMedal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .medal-notif-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 40px;
          height: 200%;
          background: rgba(255,255,255,0.3);
          animation: shineEffect 1.2s ease 0.5s forwards;
        }
        .medal-notif-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #9f7aea;
          margin-bottom: 12px;
        }
        .medal-notif-emoji {
          font-size: 72px;
          display: block;
          margin-bottom: 14px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        }
        .medal-notif-name {
          font-size: 20px;
          font-weight: 700;
          color: #3d3d3d;
          margin-bottom: 6px;
        }
        .medal-notif-desc {
          font-size: 13px;
          color: #888;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .medal-notif-btns {
          display: flex;
          gap: 10px;
        }
        .medal-notif-btn-primary {
          flex: 1;
          padding: 14px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(145deg, #9f7aea, #805ad5);
          box-shadow: 4px 4px 10px rgba(128,90,213,0.3);
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
        }
        .medal-notif-btn-secondary {
          padding: 14px 16px;
          border: none;
          border-radius: 16px;
          background: rgba(232,237,230,0.9);
          box-shadow: 4px 4px 10px #b8c4b4, -4px -4px 10px #ffffff;
          font-size: 14px;
          color: #aaa;
          cursor: pointer;
        }
      </style>

      <div class="medal-notif-card">
        <div class="medal-notif-label">🎉 ${t('medal_notification_new') || 'Новая награда!'}</div>
        <span class="medal-notif-emoji">${medal.emoji}</span>
        <div class="medal-notif-name">${medalName}</div>
        <div class="medal-notif-desc">${medalDesc}</div>
        <div class="medal-notif-btns">
          <button class="medal-notif-btn-primary" id="medalNotifView">
            ${t('medal_notification_view') || 'Посмотреть'}
          </button>
          <button class="medal-notif-btn-secondary" id="medalNotifClose">
            ${t('medal_notification_later') || 'Позже'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('medalNotifView').addEventListener('click', () => {
      overlay.remove();
      if (onDismiss) onDismiss();
      if (window.navigateTo) window.navigateTo('medals');
    });

    document.getElementById('medalNotifClose').addEventListener('click', () => {
      overlay.remove();
      if (onDismiss) onDismiss();
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.remove();
        if (onDismiss) onDismiss();
      }
    });

    // Автозакрытие через 8 секунд
    setTimeout(() => {
      const el = document.getElementById('medalNotification');
      if (el) {
        el.remove();
        if (onDismiss) onDismiss();
      }
    }, 8000);
  }


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

  /* ---------- INSIGHT CARD ---------- */
  const STORAGE_KEY = 'neyra_last_insight';
  
  function saveInsightToStorage(insight) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        moodLevel: insight.moodLevel,
        events: insight.events,
        pattern: insight.pattern,
        insightText: insight.insightText,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }
  
  function showInsightCard(insight) {
    const card = document.getElementById("homeInsightCard");
    const text = document.getElementById("homeInsightText");
    const patternCard = document.getElementById("homePatternCard");
    const patternText = document.getElementById("homePatternText");
    
    if (!card || !text) return;
    
    text.textContent = insight.insightText;
    card.style.display = 'block';
    card.style.opacity = '1';
    
    if (!insight.pattern || !patternCard || !patternText) {
      if (patternCard) patternCard.style.display = 'none';
      return;
    }
    
    const label = t('event_' + insight.pattern.event) || insight.pattern.event;
    if (!label || label.includes('event_') || label === insight.pattern.event) {
      if (patternCard) patternCard.style.display = 'none';
      return;
    }
    
    const timeKey = insight.meta?.timeBucket ? 'time_' + insight.meta.timeBucket : null;
    const timeLabel = timeKey ? t(timeKey) : null;
    
    if (insight.pattern.score > 0) {
      if (timeLabel && insight.meta?.timeBucket) {
        patternText.innerHTML = t('pattern_positive_time')?.replace('{label}', label).replace('{time}', timeLabel) || label;
      } else {
        patternText.innerHTML = t('pattern_positive')?.replace('{label}', label) || label;
      }
    } else {
      patternText.innerHTML = t('pattern_negative')?.replace('{label}', label) || label;
    }
    
    patternCard.style.display = 'block';
    patternCard.style.opacity = '1';
  }

  /* ---------- BOOT ---------- */
  console.log('[BOOT] DOMContentLoaded listener registered');

  document.addEventListener("DOMContentLoaded", () => {
    document.body.style.visibility = 'visible';
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

  function initCloudAuth() {
    console.log('[Cloud] Auth disabled (native setup phase)');
  }

  function startApp() {
    console.log('[APP] startApp called');
    
    import("./services/exit-guard.js")
      .then(m => m.setupExitGuard())
      .catch(() => {});
    
    const detectedLang = getLang();
    setLang(detectedLang);
    
    const recordBtn = document.getElementById('recordVoiceBtn');
    if (recordBtn) recordBtn.textContent = t('home_start_recording');
    
    document.addEventListener('languageChanged', () => {
      const btn = document.getElementById('recordVoiceBtn');
      if (btn && !btn.disabled) btn.textContent = t('home_start_recording');
      applyDomTranslations();
    });
    
    stateGovernance.enable();
    
    initBilling();
    
    initCloudAuth();
    
    initCheckpointRecovery();
    
    migrateVoiceStorage();
    
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
    
    // Восстановление уведомлений — откладываем чтобы Capacitor успел инициализироваться
    setTimeout(() => {
      checkAutoReminder();
      checkRemindersOnBoot();
    }, 1500);

    // Проверка медалей при каждом запуске
    setTimeout(async () => {
      try {
        const { checkAndUpdateMedals, getUnshownNewMedals, markMedalsAsShown, getAllMedalsWithState } =
          await import('./services/medals-engine.js');

        checkAndUpdateMedals();

        const newMedals = getUnshownNewMedals();
        if (newMedals.length === 0) return;

        // Показываем первую незасчитанную медаль через аватар
        const medalId = newMedals[0];
        const all = getAllMedalsWithState();
        const medal = all.find(m => m.id === medalId);
        if (!medal) return;

        // Даём время аватару инициализироваться
        await new Promise(r => setTimeout(r, 500));

        showMedalAvatarNotification(medal, () => {
          markMedalsAsShown(newMedals);
        });

      } catch(e) {
        console.warn('[MEDALS] check failed:', e);
      }
    }, 2500);
    
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
        if (confirmBtn) {
          const reflectionInput = document.getElementById("reflectionInput");
          const hasContent = (reflectionInput?.value.trim()) || getSelectedEvents().length > 0;
          confirmBtn.disabled = !hasContent;
        }
      });
    }
    
    function setRecordingUI(isRecording) {
      document.body.classList.toggle('recording', isRecording);
    }
    
    const confirmBtn = document.getElementById("confirmBtn");
    if (confirmBtn && !confirmBtn.dataset.bound) {
      confirmBtn.dataset.bound = 'true';
      
      const reflectionInput = document.getElementById("reflectionInput");
      
      if (reflectionInput) {
        reflectionInput.addEventListener('input', () => {
          const hasContent = reflectionInput.value.trim() || getSelectedEvents().length > 0;
          confirmBtn.disabled = !hasContent;
        });
      }
      
      confirmBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        
        const reflectionInput = document.getElementById("reflectionInput");
        const text = reflectionInput?.value.trim() || '';
        const mood = getMood();
        const events = getSelectedEvents();
        const now = Date.now();
        
        if (!text && !mood && events.length === 0) {
          return;
        }
        
        confirmBtn.disabled = true;
        
        try {
          if (text) {
            SystemCore.dispatch('SAVE_REFLECTION', {
              text,
              mood,
              time: now
            });
            const savedText = t('reflection_saved_short') || 'Сохранено';
            const responseEl = document.getElementById("aiResponse");
            if (responseEl) {
              responseEl.textContent = savedText;
              setTimeout(() => { responseEl.textContent = ''; }, 2000);
            }
            if (window.showAvatar) {
              window.showAvatar({
                text: t('reflection_saved') || 'Записал. Это поможет заметить важные моменты.',
                type: 'reflection',
                force: true
              });
            }
          }
          
          const hasText = text && text.trim().length > 0;
          const hasEvents = events && events.length > 0;
          
          console.log('[APP] confirmBtn | hasText:', hasText, '| hasEvents:', hasEvents, '| events:', events);
          
          let insight;
          
          if (hasText) {
            insight = await safeGenerateInsight({
              mood,
              events: [],
              text,
              type: 'reflection'
            });
          } else if (hasEvents) {
            insight = await safeGenerateInsight({
              mood,
              events,
              text: '',
              type: 'events'
            });
          } else {
            return;
          }
          
          if (hasText && insight?.insightText) {
            // Не показывать в avatar — уже есть feedback "Сохранено"
          } else if (hasEvents && insight?.insightText) {
            showInsightCard(insight);
            saveInsightToStorage(insight);
          }
          
          if (reflectionInput) {
            reflectionInput.value = '';
          }
          
          if (typeof clearEventsUI === 'function') {
            clearEventsUI();
          } else {
            const { clearSelectedEvents } = await import('./events.js');
            clearSelectedEvents();
          }
          
        } catch (err) {
          console.error('[HOME] confirmBtn error:', err);
        } finally {
          confirmBtn.disabled = false;
        }
      });
    }
    
    const openHistoryBtn = document.getElementById("openHistoryBtn");
    if (openHistoryBtn && !openHistoryBtn.dataset.bound) {
      openHistoryBtn.dataset.bound = 'true';
      openHistoryBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.openScreen) {
          window.openScreen('history');
        }
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
        
        if (voiceStatus) {
          voiceStatus.classList.add('recording');
          voiceStatus.textContent = t('voice_recording');
        }
        voiceBtn.disabled = true;

        const timerInterval = setInterval(() => {
          recordSeconds++;
          const m = String(Math.floor(recordSeconds/60)).padStart(2,'0');
          const s = String(recordSeconds%60).padStart(2,'0');
          timerEl.textContent = '⏺ ' + m + ':' + s;
        }, 1000);

        const cleanup = (saved = false) => {
          clearInterval(timerInterval);
          const existingTimer = document.getElementById("voiceRecordingTimer");
          if (existingTimer) existingTimer.remove();
          if (voiceStatus) {
            voiceStatus.classList.remove('recording');
            voiceStatus.textContent = saved ? t('voice_done') : '';
          }
          voiceBtn.disabled = false;
          setRecordingUI(false);
        };

        startVoiceRecording(voiceStatus, (data) => {
          console.log('[VOICE] recorded', data);
          cleanup(true);
          if (data && data.audio) {
            SystemCore.dispatch('VOICE_SAVE', {
              audio: data.audio,
              duration: data.duration,
              mood: data.mood,
              date: data.date
            });
          }
        }).catch(() => {
          cleanup();
          if (voiceStatus) voiceStatus.textContent = "❌";
        });
      });
    }
    
    initAvatar();
    console.log('[BOOT] startApp done');
    
    // Cloud restore: process pending data
    window._appReady = true;
    if (window._pendingCloudData) {
      restoreFromCloudIfEmpty(window._pendingCloudData);
      window._pendingCloudData = null;
    }
  }

  window.addEventListener("resize", () => {
    // debounce
  }, { passive: true });
}

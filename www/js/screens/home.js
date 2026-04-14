import { getMood } from "../state.js";
import SystemCore from "../system-core.js";
import { showAvatarHint, showAvatarAfterSave, showAvatar } from "../avatar.js";
import { initEventsModule, renderEventsGrid, getSelectedEvents, clearSelectedEvents, updateEventsUI, cleanupEventsListener } from "../events.js";

import { showAvatarForMood } from "../avatar.js";
import { AppRuntime } from "../core/appRuntime.js";
import { t } from "../i18n.js";
import { setAvatarMood, avatarReact, initAvatarController } from "../ui/avatar-controller.js";
import { safeGenerateInsight } from "../ai/offline-ai.js";

function getTimeBucket() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}

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

function getLastInsight() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
}

function getPatternEventLabel(eventId) {
  return t('event_' + eventId) || eventId;
}

function renderInsightCard(state) {
  const card = document.getElementById("homeInsightCard");
  const text = document.getElementById("homeInsightText");
  const patternCard = document.getElementById("homePatternCard");
  const patternText = document.getElementById("homePatternText");
  if (!card || !text) return;

  const stored = getLastInsight();
  if (stored && stored.insightText) {
    // Показываем сохранённый текст (не генерируем новый!)
    text.textContent = stored.insightText;
    card.style.display = 'block';
    card.style.opacity = '1';
    
    if (stored.pattern && patternCard && patternText) {
      const label = getPatternEventLabel(stored.pattern.event);
      if (!label || label.includes('event_') || label === stored.pattern.event) {
        if (patternCard) patternCard.style.display = 'none';
      } else {
        if (stored.pattern.type === 'positive') {
          patternText.textContent = t('pattern_positive').replace('{label}', label);
        } else {
          patternText.textContent = t('pattern_negative').replace('{label}', label);
        }
        patternCard.style.display = 'block';
        patternCard.style.opacity = '1';
      }
    } else if (patternCard) {
      patternCard.style.display = 'none';
    }
  } else {
    card.style.display = 'none';
    if (patternCard) patternCard.style.display = 'none';
  }
}

export function onEnter() {
  console.log('home.onEnter() called');
  
  initEventsModule();
  
  // Update app-level values (days, stability, golden hours, insight)
  setTimeout(() => {
    if (window.__neyraRender) window.__neyraRender();
  }, 0);
  
  const slider = document.getElementById("moodSlider");
  const valueLabel = document.getElementById("moodValue");
  const savedLabel = document.getElementById("moodSavedLabel");
  const eventsContainer = document.getElementById("eventsContainer");

  if (!slider) {
    console.error('home.onEnter: slider not found');
    return;
  }

  const currentMood = getMood();
  valueLabel.textContent = currentMood + "%";

  // Clone slider to remove old listeners
  const newSlider = slider.cloneNode(true);
  slider.parentNode.replaceChild(newSlider, slider);
  newSlider.id = "moodSlider";
  newSlider.value = currentMood;
  showAvatarHint(Number(currentMood));
  
  if (eventsContainer) {
    renderEventsGrid(eventsContainer);
  }
  
  renderInsightCard();
  initAvatarController();

  newSlider.addEventListener("input", () => {
    valueLabel.textContent = newSlider.value + "%";
    showAvatarHint(Number(newSlider.value));
    setAvatarMood(Number(newSlider.value));
  });

  const confirmBtn = document.getElementById("moodConfirmBtn");
  if (!confirmBtn) {
    console.error('home.onEnter: confirmBtn not found');
    return;
  }
  
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.id = "moodConfirmBtn";

  newBtn.addEventListener("click", async () => {
    console.log('MOOD_SUBMIT clicked');
    if (newBtn.disabled) return;
    newBtn.disabled = true;

    const moodValue = Number(newSlider.value);
    const selectedEvents = getSelectedEvents();
    const timeBucket = getTimeBucket();
    
    try {
      const result = await SystemCore.dispatch('MOOD_SUBMIT', { 
        mood: moodValue, 
        events: selectedEvents,
        timeBucket: timeBucket
      });

      if (!result || result.error) {
        console.warn('UI received error or duplicate:', result);
        newBtn.disabled = false;
        return;
      }

      const savedMood = moodValue;
      newSlider.value = savedMood;
      valueLabel.textContent = savedMood + '%';

      const lang = localStorage.getItem('app_language') || 'ru';
      const localeMap = { ru: 'ru-RU', en: 'en-GB', es: 'es-ES', uk: 'uk-UA' };
      const locale = localeMap[lang] || 'ru-RU';
      const now  = new Date();
      const time = now.toLocaleTimeString(locale, { hour:"2-digit", minute:"2-digit" });
      const date = now.toLocaleDateString(locale, { day:"2-digit", month:"2-digit", year:"numeric" });
      if (savedLabel) savedLabel.textContent = `${time} (${date})`;
      
      showAvatarForMood(moodValue);
      avatarReact();
      
      if (selectedEvents.length > 0) {
        console.log('[INSIGHT PAYLOAD]', {
          mood: moodValue,
          events: selectedEvents
        });
        
        const insight = await safeGenerateInsight({
          mood: moodValue,
          events: selectedEvents,
          type: 'events'
        });
        
        console.log('[INSIGHT RESULT]', insight);
        
        if (insight && insight.insightText) {
          saveInsightToStorage(insight);
          showInsightCard(insight);
        } else {
          console.warn('[INSIGHT] Empty result', insight);
        }
      }
      
      AppRuntime.setState('home', { selectedEvents: [] });
      document.querySelectorAll('.event-item').forEach(el => {
        el.classList.remove('active');
      });

    } finally {
      newBtn.disabled = false;
    }
  });
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
  
  const label = getPatternEventLabel(insight.pattern.event);
  if (!label || label.includes('event_') || label === insight.pattern.event) {
    console.warn('[PATTERN] label not found for event:', insight.pattern.event);
    if (patternCard) patternCard.style.display = 'none';
    return;
  }
  
  const timeKey = insight.meta?.timeBucket ? 'time_' + insight.meta.timeBucket : null;
  const timeLabel = timeKey ? t(timeKey) : null;
  
  if (insight.pattern.score > 0) {
    if (timeLabel && insight.meta?.timeBucket) {
      patternText.innerHTML = t('pattern_positive_time').replace('{label}', label).replace('{time}', timeLabel);
    } else {
      patternText.innerHTML = t('pattern_positive').replace('{label}', label);
    }
  } else {
    patternText.innerHTML = t('pattern_negative').replace('{label}', label);
  }
  
  if (insight.meta) {
    const metaEl = document.createElement('div');
    metaEl.style.cssText = 'font-size:10px;color:#888;margin-top:4px;';
    metaEl.textContent = `Основано на ${insight.meta.count} записях • влияние ${insight.meta.impact > 0 ? '+' : ''}${insight.meta.impact}`;
    patternText.appendChild(metaEl);
  }
  
  patternCard.style.display = 'block';
  patternCard.style.opacity = '1';
}

export function onExit() {
  const container = document.getElementById('eventsContainer');
  if (container) {
    cleanupEventsListener(container);
  }
}

document.addEventListener("languageChanged", () => {
  renderInsightCard();
});

import { getMood } from "../state.js";
import SystemCore from "../system-core.js";
import { render } from "../app.js";
import { showAvatarHint, showAvatarAfterSave } from "../avatar.js";
import { initEventsModule, renderEventsGrid, getSelectedEvents, clearSelectedEvents, updateEventsUI, cleanupEventsListener } from "../events.js";
import { generateInsight } from "../ai/offline-ai.js";
import { showAvatarForMood } from "../avatar.js";
import { AppRuntime } from "../core/appRuntime.js";
import { t } from "../i18n.js";
import { setAvatarMood, avatarReact, initAvatarController } from "../ui/avatar-controller.js";

const STORAGE_KEY = 'neyra_last_insight';

function getLastInsight() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
}

function saveInsightToStorage(insight) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      moodLevel: insight.moodLevel,
      events: insight.events,
      pattern: insight.pattern,
      timestamp: Date.now()
    }));
  } catch (e) {}
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
  if (stored) {
    const moodValue = stored.moodLevel === 'low' ? 25 : stored.moodLevel === 'high' ? 80 : 50;
    const insight = generateInsight({ 
      mood: moodValue, 
      events: stored.events || [] 
    });
    
    text.textContent = insight.insightText;
    card.style.display = 'block';
    card.style.opacity = '1';
    
    if (insight.pattern && patternCard && patternText) {
      const label = getPatternEventLabel(insight.pattern.event);
      if (insight.pattern.type === 'positive') {
        patternText.textContent = t('pattern_positive').replace('{event}', label);
      } else {
        patternText.textContent = t('pattern_negative').replace('{event}', label);
      }
      patternCard.style.display = 'block';
      patternCard.style.opacity = '1';
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
    
    try {
      const result = await SystemCore.dispatch('MOOD_SUBMIT', { 
        mood: moodValue, 
        events: selectedEvents 
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
      
      const insight = generateInsight({ 
        mood: moodValue, 
        events: selectedEvents 
      });
      
      saveInsightToStorage(insight);
      showInsightCard(insight);
      showAvatarForMood(moodValue);
      avatarReact();
      showAvatarAfterSave({ 
        mood: moodValue, 
        events: selectedEvents,
        pattern: insight.pattern
      });
      
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
  
  if (insight.pattern && patternCard && patternText) {
    const label = getPatternEventLabel(insight.pattern.event);
    if (insight.pattern.type === 'positive') {
      patternText.textContent = t('pattern_positive').replace('{event}', label);
    } else {
      patternText.textContent = t('pattern_negative').replace('{event}', label);
    }
    patternCard.style.display = 'block';
    patternCard.style.opacity = '1';
  } else if (patternCard) {
    patternCard.style.display = 'none';
  }
}

export function onExit() {
  AppRuntime.setState('home', { selectedEvents: [] });
  const container = document.getElementById('eventsContainer');
  if (container) {
    cleanupEventsListener(container);
  }
}

document.addEventListener("languageChanged", () => {
  renderInsightCard();
});

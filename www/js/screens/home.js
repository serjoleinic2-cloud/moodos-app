import { getMood } from "../state.js";
import SystemCore from "../system-core.js";
import { showAvatarHint, showAvatarAfterSave, showAvatar } from "../avatar.js";
import { initEventsModule, renderEventsGrid, getSelectedEvents, clearSelectedEvents, updateEventsUI, cleanupEventsListener } from "../events.js";

import { showAvatarForMood } from "../avatar.js";
import { AppRuntime } from "../core/appRuntime.js";
import { t } from "../i18n.js";
import { setAvatarMood, avatarReact, initAvatarController } from "../ui/avatar-controller.js";
import { safeGenerateInsight } from "../ai/offline-ai.js";
import { getResilienceIndex, getResilienceLabel, getMoodStability } from '../services/resilience-engine.js';
import { getMoodHistory } from '../services/memory.js';

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
  initDailyChallenge();
  initResilienceCard();
  initAvatarController();

  // Баннер после восстановления бэкапа
  if (localStorage.getItem('show_profile_update_banner') === '1') {
    localStorage.removeItem('show_profile_update_banner');
    setTimeout(() => showProfileUpdateBanner(), 800);
  }

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

function showProfileUpdateBanner() {
  const existing = document.getElementById('profileUpdateBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'profileUpdateBanner';
  banner.style.cssText = `
    position:fixed;bottom:90px;left:16px;right:16px;
    background:linear-gradient(145deg,#e8f5e9,#f1f8e9);
    border-radius:18px;
    padding:16px 18px;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);
    z-index:1000;
    animation:slideUpBanner 0.4s ease;
  `;
  banner.innerHTML = `
    <style>@keyframes slideUpBanner{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    <div style="font-size:14px;font-weight:700;color:#2e7d32;margin-bottom:4px;">${t('profile_update_banner_title')}</div>
    <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">
      ${t('profile_update_banner_body')}
    </div>
    <div style="display:flex;gap:8px;">
      <button id="bannerUpdateBtn" style="flex:1;padding:10px;border:none;border-radius:12px;background:linear-gradient(145deg,#4caf87,#45a070);color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
        ${t('profile_update_banner_btn')}
      </button>
      <button id="bannerDismissBtn" style="padding:10px 14px;border:none;border-radius:12px;background:rgba(200,200,200,0.4);color:#888;font-size:13px;cursor:pointer;">
        ${t('profile_update_banner_later')}
      </button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('bannerUpdateBtn').addEventListener('click', () => {
    banner.remove();
    if (window.navigateTo) window.navigateTo('settings');
  });
  document.getElementById('bannerDismissBtn').addEventListener('click', () => {
    // Показать ещё раз через день
    localStorage.setItem('show_profile_update_banner_delay', String(Date.now() + 86400000));
    banner.remove();
  });
}


async function initDailyChallenge() {
  try {
    const { getTodayChallenge, isChallengeCompleted, completeChallenge } =
      await import('../services/challenge-engine.js');

    const bar = document.getElementById('dailyChallengeBar');
    const textEl = document.getElementById('challengeText');
    const btn = document.getElementById('challengeBtn');
    if (!bar || !textEl || !btn) return;

    const challenge = getTodayChallenge();
    const completed = isChallengeCompleted();

    textEl.textContent = challenge.text;
    btn.textContent = completed ? t('challenge_done') : t('challenge_start');
    btn.disabled = completed;
    btn.style.background = completed
      ? 'rgba(76,175,135,0.3)'
      : 'linear-gradient(145deg,#9f7aea,#805ad5)';
    btn.style.color = completed ? '#4caf87' : '#fff';

    bar.style.display = 'block';

    if (!completed) {
      btn.addEventListener('click', async () => {
        // Открываем меню практик напрямую
        if (window.openToolsMenuDirect) {
          window.openToolsMenuDirect();
        } else if (window.navigateTo) {
          window.navigateTo('tools');
        }

        completeChallenge();
        btn.textContent = t('challenge_done');
        btn.disabled = true;
        btn.style.background = 'rgba(76,175,135,0.3)';
        btn.style.color = '#4caf87';

        try {
          const { checkAndUpdateMedals } = await import('../services/medals-engine.js');
          checkAndUpdateMedals();
        } catch(e) {}
      });
    }
  } catch(e) {
    console.warn('[CHALLENGE] init failed:', e);
  }
}

function initResilienceCard() {
  try {
    const card = document.getElementById('resilienceFlipCard');
    if (!card) return;

    // Сбрасываем состояние при каждом входе
    card.classList.remove('resilience-flipped');

    const index = getResilienceIndex();
    const label = getResilienceLabel(index);
    const history = getMoodHistory();

    const valEl = document.getElementById('resilienceIndexValue');
    const labelEl = document.getElementById('resilienceIndexLabel');
    const deltaEl = document.getElementById('resilienceDelta');

    if (valEl) valEl.textContent = index !== null ? index + '%' : '—';
    if (labelEl) labelEl.textContent = label;

    // Добавляем обработчик только один раз
    if (!card._flipListenerAdded) {
      card.addEventListener('click', () => {
        const wasFlipped = card.classList.contains('resilience-flipped');
        card.classList.toggle('resilience-flipped');
        if (!wasFlipped) {
          setTimeout(() => drawSparkline(history), 280);
        }
      });
      card._flipListenerAdded = true;
    }

    if (deltaEl && history.length >= 5) {
      const now = Date.now();
      const monthAgo = now - 30 * 86400000;
      const twoMonthsAgo = now - 60 * 86400000;

      const recentHistory = history.filter(e => e.time >= monthAgo);
      const prevHistory = history.filter(e => e.time >= twoMonthsAgo && e.time < monthAgo);

      if (recentHistory.length >= 3 && prevHistory.length >= 3) {
        const avgRecent = recentHistory.reduce((s, e) => s + e.value, 0) / recentHistory.length;
        const avgPrev = prevHistory.reduce((s, e) => s + e.value, 0) / prevHistory.length;
        const delta = Math.round(avgRecent - avgPrev);

        if (delta > 0) {
          deltaEl.textContent = '↑ +' + delta;
          deltaEl.style.color = '#4caf87';
        } else if (delta < 0) {
          deltaEl.textContent = '↓ ' + delta;
          deltaEl.style.color = '#e05555';
        } else {
          deltaEl.textContent = '→ 0';
          deltaEl.style.color = '#aaa';
        }
      }
    }

    if (valEl && index !== null) {
      valEl.style.color = index >= 70 ? '#4caf87' : index >= 40 ? '#f0a500' : '#e05555';
    }

    card.addEventListener('click', () => {
      const wasFlipped = card.classList.contains('resilience-flipped');
      card.classList.toggle('resilience-flipped');
      if (!wasFlipped) {
        setTimeout(() => drawSparkline(history), 280);
      }
    });

    card._flipListenerAdded = true;

  } catch(e) {
    console.warn('[RESILIENCE CARD]', e);
  }
}

function drawSparkline(history) {
  try {
    const canvas = document.getElementById('resilienceSparkline');
    if (!canvas) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 300;
    canvas.height = 60 * window.devicePixelRatio || 60;
    canvas.style.width = '100%';
    canvas.style.height = '60px';

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W, H);

    const now = Date.now();
    const monthAgo = now - 30 * 86400000;
    const recent = history.filter(e => e.time >= monthAgo);

    if (recent.length < 3) {
      ctx.font = (11 * dpr) + 'px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText(t('no_data_short') || '—', W / 2, H / 2);
      return;
    }

    const byDay = {};
    recent.forEach(e => {
      const d = new Date(e.time).toDateString();
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(e.value);
    });

    const points = Object.keys(byDay)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(d => Math.round(byDay[d].reduce((s, v) => s + v, 0) / byDay[d].length));

    if (points.length < 2) return;

    const minVal = Math.max(0,  Math.min(...points) - 10);
    const maxVal = Math.min(100, Math.max(...points) + 10);
    const range  = maxVal - minVal || 1;

    const pad = 8 * dpr;
    const chartW = W - pad * 2;
    const chartH = H - pad * 2;

    const xStep = chartW / (points.length - 1);

    const toX = i => pad + i * xStep;
    const toY = v => pad + chartH - ((v - minVal) / range) * chartH;

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, 'rgba(76,175,135,0.25)');
    gradient.addColorStop(1, 'rgba(76,175,135,0)');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(points[i - 1]), cpX, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.lineTo(toX(points.length - 1), H);
    ctx.lineTo(toX(0), H);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const cpX = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpX, toY(points[i - 1]), cpX, toY(points[i]), toX(i), toY(points[i]));
    }
    ctx.strokeStyle = '#4caf87';
    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = 'round';
    ctx.stroke();

    const lastX = toX(points.length - 1);
    const lastY = toY(points[points.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#4caf87';
    ctx.fill();

    const labelEl = document.getElementById('resilienceSparklineLabel');
    if (labelEl) {
      const first = points[0];
      const last  = points[points.length - 1];
      const delta = last - first;
      if (delta > 3) {
        labelEl.textContent = '↑ +' + delta + ' ' + (t('resilience_sparkline_growth') || 'за месяц');
        labelEl.style.color = '#4caf87';
      } else if (delta < -3) {
        labelEl.textContent = '↓ ' + delta + ' ' + (t('resilience_sparkline_growth') || 'за месяц');
        labelEl.style.color = '#e05555';
      } else {
        labelEl.textContent = t('resilience_sparkline_stable') || 'Стабильно за месяц';
        labelEl.style.color = '#aaa';
      }
    }

  } catch(e) {
    console.warn('[SPARKLINE]', e);
  }
}

export function onExit() {
  const container = document.getElementById('eventsContainer');
  if (container) {
    cleanupEventsListener(container);
  }

  // Сбрасываем flip карточку при выходе
  const card = document.getElementById('resilienceFlipCard');
  if (card) {
    card.classList.remove('resilience-flipped');
  }
}

document.addEventListener("languageChanged", () => {
  renderInsightCard();
});

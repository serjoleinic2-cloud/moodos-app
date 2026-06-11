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
import { initLetterEngine } from '../ai/avatar-letter-engine.js';
import { renderLetterCard } from '../ui/letter-overlay.js';
import { getGreeting } from '../ai/home-greetings.js';
import {
  getCurrentPoolChallenge, isChallengeCompleted, completeChallenge,
  skipToNext, startChallengeTimer, getChallengeTimerState, resetChallengeTimer
} from '../services/challenge-engine.js';

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

  // Приветствие по времени суток
  const greetingEl = document.getElementById('homeGreeting');
  if (greetingEl) {
    greetingEl.textContent = getGreeting(getTimeBucket());
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

  // Восстанавливаем время последней отметки
  const lastSavedTime = localStorage.getItem('neyra_last_saved_time');
  if (lastSavedTime && savedLabel) savedLabel.textContent = lastSavedTime;

  // Показываем карточку вызова сразу чтобы не мигала
  const challengeBar = document.getElementById('dailyChallengeBar');
  if (challengeBar) challengeBar.style.display = 'block';

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
      try { localStorage.setItem('neyra_last_saved_time', `${time} (${date})`); } catch(e) {}

      showAvatarForMood(moodValue);
      avatarReact();

      setTimeout(() => {
        initResilienceCard();
        if (window.__neyraRender) window.__neyraRender();
        renderInsightCard();
      }, 300);

      try {
        const { showAvatarForMood: showAvatarForMood2 } = await import("../avatar.js");
        showAvatarForMood2(moodValue);
      } catch(e) {
        console.warn('[home] avatar insight error:', e);
      }

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

  // Письма от Нейры
  initLetterEngine();
  const homeContainer = document.getElementById('home-screen') || document.querySelector('[data-screen="home"]');
  if (homeContainer) renderLetterCard(homeContainer);
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
    metaEl.textContent = t('pattern_based_on')
      .replace('{count}', insight.meta.count)
      .replace('{diff}', (insight.meta.impact > 0 ? '+' : '') + insight.meta.impact);
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


const challengeUI = {
  start:     t('challenge_start'),
  done:      t('challenge_done'),
  skipped:   t('challenge_skipped'),
  completed: t('challenge_done'),
}

function initDailyChallenge() {
  try {
    const bar    = document.getElementById('dailyChallengeBar');
    const textEl = document.getElementById('challengeText');
    let btn      = document.getElementById('challengeBtn');
    if (!bar || !textEl || !btn) return;

    bar.style.display = 'block';

    const completed = isChallengeCompleted();

    Promise.resolve(getCurrentPoolChallenge()).then(ch => {
      if (!ch || !ch.text) { bar.style.display = 'none'; return; }
      _challengeRender(bar, textEl, btn, ch, completed);
    }).catch(() => { bar.style.display = 'none'; });

  } catch(e) {
    console.warn('[CHALLENGE] init failed:', e);
  }
}

function _challengeRender(bar, textEl, btn, ch, completed) {

  // ── утилиты ──────────────────────────────────────────────
  function fmtTime(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // Попап "Вызов выполнен?" — стиль из history.js
  function showDoneConfirm(onYes, onNo) {
    const existing = document.getElementById('challengeDonePopup');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'challengeDonePopup';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:2000;display:flex;align-items:center;justify-content:center;padding:32px;';
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px;padding:28px 24px;width:100%;max-width:300px;box-shadow:0 16px 48px rgba(0,0,0,0.2);text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🎯</div>
        <div style="font-size:17px;font-weight:700;color:#3a3530;margin-bottom:8px;">${t('challenge_done_confirm')}</div>
        <div style="font-size:13px;color:#888;margin-bottom:24px;">${t('challenge_done_confirm_sub')}</div>
        <div style="display:flex;gap:10px;">
          <button id="challengePopupNo" style="flex:1;padding:14px;border:none;border-radius:16px;background:linear-gradient(145deg,#e74c3c,#c0392b);box-shadow:4px 4px 10px rgba(231,76,60,0.3);font-size:15px;font-weight:700;color:#fff;cursor:pointer;">${t('challenge_done_no')}</button>
          <button id="challengePopupYes" style="flex:1;padding:14px;border:none;border-radius:16px;background:linear-gradient(145deg,#4caf87,#3a9a72);box-shadow:4px 4px 10px rgba(76,175,135,0.3);font-size:15px;font-weight:700;color:#fff;cursor:pointer;">${t('challenge_done_yes')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('challengePopupNo').addEventListener('click', () => { overlay.remove(); onNo(); });
    document.getElementById('challengePopupYes').addEventListener('click', () => { overlay.remove(); onYes(); });
  }

  // Свернуть и исчезнуть
  function collapseAndHide(barEl) {
    barEl.style.transition = 'opacity 0.3s ease';
    barEl.style.opacity = '0';
    setTimeout(() => {
      barEl.style.display = 'none';
      barEl.style.opacity = '';
      barEl.style.transition = '';
    }, 300);
  }

  // ── рендер состояний ─────────────────────────────────────
  function render(challenge, isCompleted) {
    textEl.textContent = challenge.text;

    // Чистим всё что могли добавить
    document.getElementById('challengeBtnWrap')?.remove();
    document.getElementById('challengeCollapsed')?.remove();

    // Восстанавливаем оригинальный btn если был скрыт
    btn.style.display = 'block';

    if (isCompleted) {
      // Уже выполнено сегодня — показываем статус, больше ничего
      btn.textContent   = challengeUI.done;
      btn.disabled      = true;
      btn.style.cssText = 'background:rgba(76,175,135,0.3);color:#4caf87;border:none;border-radius:14px;padding:10px 20px;font-size:14px;font-weight:600;cursor:default;width:100%;margin-top:10px;';
      return;
    }

    const timerState = getChallengeTimerState();

    if (!timerState.active) {
      // ── Состояние: не начато ─────────────────────────────
      btn.textContent   = challengeUI.start;
      btn.disabled      = false;
      btn.style.cssText = 'background:linear-gradient(145deg,#9f7aea,#805ad5);color:#fff;border:none;border-radius:14px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;width:100%;margin-top:10px;';

      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      btn = newBtn;

      btn.addEventListener('click', () => {
        startChallengeTimer();
        setTimeout(() => renderCollapsed(challenge), 50);
      });

    } else {
      // Таймер уже идёт — сразу показываем свёрнутый вид
      btn.style.display = 'none';
      renderCollapsed(challenge);
    }
  }

  // ── Свёрнутый вид пока идёт таймер ──────────────────────
  let timerInterval = null;

  function renderCollapsed(challenge) {
    document.getElementById('challengeBtnWrap')?.remove();
    document.getElementById('challengeCollapsed')?.remove();
    btn.style.display = 'none';

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const wrap = document.createElement('div');
    wrap.id = 'challengeCollapsed';
    wrap.style.cssText = 'margin-top:10px;';

    // Строка: [↻ Другое]  [таймер]  [✕ Закрыть]
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const otherBtn = document.createElement('button');
    otherBtn.textContent = '↻ Другое';
    otherBtn.style.cssText = 'flex:1;background:rgba(224,85,85,0.1);color:#e05555;border:1px solid rgba(224,85,85,0.3);border-radius:14px;padding:10px 6px;font-size:13px;font-weight:600;cursor:pointer;';

    const timerEl = document.createElement('div');
    timerEl.style.cssText = 'flex:1.2;text-align:center;font-size:15px;font-weight:700;color:#9f7aea;font-variant-numeric:tabular-nums;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Закрыть';
    closeBtn.style.cssText = 'flex:1;background:rgba(180,180,180,0.15);color:#aaa;border:1px solid rgba(180,180,180,0.25);border-radius:14px;padding:10px 6px;font-size:13px;font-weight:500;cursor:pointer;';

    row.appendChild(otherBtn);
    row.appendChild(timerEl);
    row.appendChild(closeBtn);
    wrap.appendChild(row);
    btn.parentNode.insertBefore(wrap, btn.nextSibling);

    // Обновляем таймер каждую секунду
    function tick() {
      const state = getChallengeTimerState();
      if (!state.active) {
        timerEl.textContent = '✓';
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        return;
      }
      timerEl.textContent = state.ready ? '✓ Готово' : fmtTime(state.msLeft);
    }
    tick();
    timerInterval = setInterval(tick, 1000);

    // ── Кнопка "↻ Другое" ────────────────────────────────
    otherBtn.addEventListener('click', () => {
      resetChallengeTimer();
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      Promise.resolve(skipToNext()).then(next => {
        const nextCh = next || challenge;
        render(nextCh, false);
      });
    });

    // ── Кнопка "✕ Закрыть" → попап ──────────────────────
    closeBtn.addEventListener('click', () => {
      showDoneConfirm(
        // Да — выполнено
        async () => {
          resetChallengeTimer();
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          completeChallenge();

          if (challenge.trigger) {
            try {
              const counts = JSON.parse(localStorage.getItem('trigger_challenges_completed') || '{}');
              counts[challenge.trigger] = (counts[challenge.trigger] || 0) + 1;
              localStorage.setItem('trigger_challenges_completed', JSON.stringify(counts));
            } catch(e) {}
          }

          try {
            const { checkAndUpdateMedals } = await import('../services/medals-engine.js');
            checkAndUpdateMedals();
          } catch(e) {}

          collapseAndHide(bar);
        },
        // Нет — новое задание
        () => {
          resetChallengeTimer();
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          Promise.resolve(skipToNext()).then(next => {
            const nextCh = next || challenge;
            render(nextCh, false);
          });
        }
      );
    });
  }

  // Запуск
  render(ch, completed);
}

function initResilienceCard() {
  try {
    const card = document.getElementById('resilienceFlipCard');
    if (!card) return;

    const isOcean = document.body.getAttribute('data-theme') === 'deep-ocean';
    const cardBg      = isOcean ? 'rgba(20,45,70,0.95)' : 'rgba(232,237,230,0.98)';
    const cardShadow  = isOcean ? '0 4px 16px rgba(0,0,0,0.35)' : '6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff';
    const textMain    = isOcean ? '#ffffff' : '#3a3530';
    const textBlue    = isOcean ? '#54ACBF' : '#666';
    const textMuted   = isOcean ? '#4a7a9b' : '#999';

    const front = card.querySelector('.flip-front-home');
    const back = card.querySelector('.flip-back-home');
    if (front) { front.style.background = cardBg; front.style.boxShadow = cardShadow; }
    if (back) { back.style.background = cardBg; back.style.boxShadow = cardShadow; }

    card.querySelectorAll('.flip-label-home').forEach(el => { el.style.color = textMuted; });
    card.querySelectorAll('.flip-sub-home').forEach(el => { el.style.color = textMuted; });
    const frontValue = card.querySelector('.flip-value-home');
    if (frontValue) frontValue.style.color = textMain;

    // Сбрасываем флип при каждом входе
    card.classList.remove('flipped');

    const index = getResilienceIndex();
    const label = getResilienceLabel(index);
    const history = getMoodHistory();

    const valEl   = document.getElementById('resilienceIndexValue');
    const labelEl = document.getElementById('resilienceIndexLabel');
    const deltaEl = document.getElementById('resilienceDelta');

    if (valEl) {
      valEl.textContent  = index !== null ? index + '%' : '—';
      valEl.style.color  = index !== null
        ? (index >= 70 ? '#4caf87' : index >= 40 ? '#f0a500' : '#e05555')
        : textMuted;
    }
    if (labelEl) labelEl.textContent = label || '';

    // Дельта за месяц
    if (deltaEl && history.length >= 5) {
      const now          = Date.now();
      const monthAgo     = now - 30 * 86400000;
      const twoMonthsAgo = now - 60 * 86400000;
      const recentH      = history.filter(e => e.time >= monthAgo);
      const prevH        = history.filter(e => e.time >= twoMonthsAgo && e.time < monthAgo);

      if (recentH.length >= 3 && prevH.length >= 3) {
        const avgR = recentH.reduce((s, e) => s + e.value, 0) / recentH.length;
        const avgP = prevH.reduce((s, e) => s + e.value, 0) / prevH.length;
        const delta = Math.round(avgR - avgP);
        deltaEl.textContent = delta > 0 ? '↑ +' + delta : delta < 0 ? '↓ ' + delta : '→ 0';
        deltaEl.style.color = delta > 0 ? '#4caf87' : delta < 0 ? '#e05555' : '#aaa';
      }
    }

    // Добавляем цветную боковинку в зависимости от значения
    const frontEl = card.querySelector('.flip-front') || card.querySelector('[class*="flip-front"]');
    if (frontEl) {
      frontEl.classList.add('resilience-flip-front');
      if (index !== null) {
        if (index < 40) frontEl.classList.add('alert');
        else if (index < 70) frontEl.classList.add('warn');
      }
    }

    // Удаляем старый обработчик через замену ноды
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);

    // Вешаем единственный обработчик на свежую ноду
    newCard.addEventListener('click', () => {
      const wasFlipped = newCard.classList.contains('flipped');
      newCard.classList.toggle('flipped');
      if (!wasFlipped) {
        setTimeout(() => drawSparkline(history), 280);
      }
    });

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
  if (card) card.classList.remove('flipped');
}

document.addEventListener("languageChanged", () => {
  // Сбросить сохранённый инсайт — он на старом языке
  try {
    localStorage.removeItem('neyra_last_insight');
  } catch(e) {}
  // Перерисовать плашку
  renderInsightCard();
  initDailyChallenge();
});

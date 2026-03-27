/**
 * avatar.js — MoodOS Avatar Module
 * Clean Architecture v2
 *
 * Responsibilities:
 *   - initAvatar()        → one-time setup: DOM listeners, restore position
 *   - handleDrag()        → sole owner of position (no other code moves the element)
 *   - handleTap()         → dispatches AVATAR_TAP via SystemCore
 *   - showAvatar(msg)     → updates state + triggers render
 *   - renderAvatar()      → pure visual update, NEVER touches position
 *
 * Rules enforced:
 *   ✅ Single source of position truth = drag handler
 *   ✅ renderAvatar only updates text / classes / bubble side
 *   ✅ document listeners gated by isDragging flag
 *   ✅ No z-index > 10000
 *   ✅ No pointer-events:none on container
 *   ✅ No duplicate init
 */

import { setAvatarState, getAvatarState } from './state.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_SIZE       = 60;
const SAFE_SIDE         = 8;
const SAFE_TOP          = 8;
const SAFE_BOTTOM       = 90;
const MIN_INTERVAL      = 2 * 60 * 1000;
const SLIDER_COOLDOWN   = 5000;
const BUBBLE_DURATION   = 5000;
const IDLE_TIMEOUT      = 8000;
const PROACTIVE_COOLDOWN = 6 * 60 * 60 * 1000;
const ACTIVITY_TIMEOUT  = 10000;
const EFFECT_COOLDOWN   = 30000;
const SILENT_SCREENS    = ['meditation','breathing','tap-calm','visual-focus','mind-dump'];
const EFFECT_COLORS     = ['#ffd54f','#ff8a65','#81c784','#64b5f6','#ba68c8'];

// ─── Module-private state ────────────────────────────────────────────────────

let _initialized      = false;
let _enabled          = true;
let _lastShowTime     = 0;
let _lastSliderTime   = 0;
let _lastEffectTime   = 0;
let _lastActivityTime = 0;
let _bubbleTimer      = null;
let _idleTimer        = null;

// ─── Viewport helpers ─────────────────────────────────────────────────────────

function vw() { return window.visualViewport?.width  || window.innerWidth;  }
function vh() { return window.visualViewport?.height || window.innerHeight; }
function clampX(x) { return Math.max(SAFE_SIDE, Math.min(x, vw() - AVATAR_SIZE - SAFE_SIDE)); }
function clampY(y) { return Math.max(SAFE_TOP,  Math.min(y, vh() - AVATAR_SIZE - SAFE_BOTTOM)); }

// ─── Language helpers ────────────────────────────────────────────────────────

function getLang() { return localStorage.getItem('app_language') || 'ru'; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Message tables ───────────────────────────────────────────────────────────

const MESSAGES = {
  mood: {
    ru: { low:['Похоже, сейчас непросто','Ты можешь немного замедлиться','Я рядом, не спеши'], mid:['Ты держишь баланс','Неплохое состояние','Можно зафиксировать это'], high:['Хороший момент','Это состояние можно запомнить','Ты сейчас в ресурсе'] },
    en: { low:["Seems like it's not easy right now","You can slow down a bit","I'm here, no rush"], mid:["You're holding balance","Not bad","You can note this"], high:["Good moment","This state is worth remembering","You're resourced right now"] },
    es: { low:['Parece que no es fácil ahora','Puedes ralentizar un poco','Estoy aquí, sin prisa'], mid:['Mantienes el equilibrio','No está mal','Puedes anotar esto'], high:['Buen momento','Este estado vale la pena recordar','Estás con recursos ahora'] },
    uk: { low:['Схоже, зараз непросто','Ти можеш трохи сповільнитись','Я поруч, не квапся'], mid:['Ти тримаєш баланс','Непоганий стан','Можна зафіксувати це'], high:['Гарний момент',"Цей стан можна запам'ятати","Ти зараз у ресурсі"] }
  },
  trend: {
    ru: { up:['Стало легче','Ты немного поднялся','Есть движение вверх'], down:['Похоже, стало тяжелее','Небольшой спад — это нормально','Ты можешь немного замедлиться'] },
    en: { up:['Feeling lighter',"You're a bit up",'Moving upward'], down:['Seems a bit harder',"Small dip — that's normal",'You can slow down a bit'] },
    es: { up:['Te sientes más ligero','Has subido un poco','Hay movimiento hacia arriba'], down:['Parece un poco más difícil','Pequeña caída — es normal','Puedes ralentizar un poco'] },
    uk: { up:['Стало легше','Ти трохи піднявся','Є рух вгору'], down:['Схоже, стало важче','Невеликий спад — це нормально','Ти можеш трохи сповільнитись'] }
  },
  tap: {
    ru:['Я здесь','Можешь продолжить','Попробуй ещё раз зафиксировать состояние'],
    en:["I'm here","You can continue","Try to note your state again"],
    es:['Estoy aquí','Puedes continuar','Intenta notar tu estado de nuevo'],
    uk:['Я тут','Можеш продовжити','Спробуй ще раз зафіксувати стан']
  },
  proactive: {
    ru:{ inactive:['Ты давно не заходил','Можешь зафиксировать состояние'], noEntry:['Сегодня ещё нет записи','Как ты сейчас?'], decline:['Последнее время тяжеловато','Хочешь зафиксировать состояние?'] },
    en:{ inactive:["You haven't been here for a while","You can note your state"], noEntry:['No entry today yet','How are you now?'], decline:['These days have been tough','Want to note your state?'] },
    es:{ inactive:['Hace tiempo que no vienes','Puedes anotar tu estado'], noEntry:['Aún no hay registro hoy','¿Cómo estás ahora?'], decline:['Últimamente ha sido difícil','¿Quieres anotar tu estado?'] },
    uk:{ inactive:['Ти давно не заходив','Можеш зафіксувати стан'], noEntry:['Сьогодні ще немає запису','Як ти зараз?'], decline:['Останнім часом важкувато','Хочеш зафіксувати стан?'] }
  },
  slider: {
    ru:{ low:['Похоже, сейчас тяжело','Я рядом','Можно зафиксировать это'], mid:['Нормальное состояние','Ты держишь баланс','Можно отметить'], high:['Хороший уровень','Отличное состояние','Ты в ресурсе'] },
    en:{ low:['Seems tough right now',"I'm here",'Can note this'], mid:['Normal state',"You're balanced",'Can mark it'], high:['Good level','Great state',"You're resourced"] },
    es:{ low:['Parece difícil ahora','Estoy aquí','Se puede anotar'], mid:['Estado normal','Estás equilibrado','Se puede marcar'], high:['Buen nivel','Gran estado','Estás con recursos'] },
    uk:{ low:['Схоже, зараз важко','Я поруч','Можна зафіксувати'], mid:['Нормальний стан','Ти тримаєш баланс','Можна відзначити'], high:['Добрий рівень','Відмінний стан','Ти у ресурсі'] }
  },
  actions: {
    ru:{ low:[{label:'Подышать',action:'breathing'},{label:'Выгрузить',action:'mind-dump'}], high:[{label:'Зафиксировать',action:'home'}] },
    en:{ low:[{label:'Breathe',action:'breathing'},{label:'Mind dump',action:'mind-dump'}], high:[{label:'Save this',action:'home'}] },
    es:{ low:[{label:'Respirar',action:'breathing'},{label:'Vaciar mente',action:'mind-dump'}], high:[{label:'Guardar',action:'home'}] },
    uk:{ low:[{label:'Подихати',action:'breathing'},{label:'Вивантажити',action:'mind-dump'}], high:[{label:'Зберегти',action:'home'}] }
  }
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function getMoodType(mood) {
  if (mood < 40) return 'low';
  if (mood < 70) return 'mid';
  return 'high';
}

function getLastMood() {
  try {
    const h = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (h.length > 0) {
      const s = [...h].sort((a,b) => (b.time||b.date) - (a.time||a.date));
      return s[0]?.value ?? null;
    }
  } catch(_) {}
  return null;
}

function getTrend(prev, curr) {
  if (prev === null) return 'same';
  if (curr > prev + 5) return 'up';
  if (curr < prev - 5) return 'down';
  return 'same';
}

function isSilentScreen() {
  const el = document.querySelector('.screen.active');
  return el ? SILENT_SCREENS.includes(el.getAttribute('data-screen')) : false;
}

function hasOpenModal() {
  return !!document.querySelector('.health-modal-overlay') ||
    document.querySelector('#premium-modal[style*="flex"]') !== null ||
    document.querySelector('#menuPanel[style*="bottom: 0"]') !== null;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function trackUserActivity() { _lastActivityTime = Date.now(); }
function isUserActive() { return (Date.now() - _lastActivityTime) < ACTIVITY_TIMEOUT; }

// ─── Drag — SOLE owner of position ───────────────────────────────────────────

function _initDrag(container) {
  let dragging = false;
  let startClientX = 0, startClientY = 0;
  let startPosX    = 0, startPosY    = 0;
  let currentX     = 0, currentY     = 0;

  // Restore position
  const saved = getAvatarState().position;
  currentX = clampX(saved?.x ?? 20);
  currentY = clampY(saved?.y ?? 100);
  _applyPosition(container, currentX, currentY);

  // Touch
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    dragging = true;
    const t = e.touches[0];
    startClientX = t.clientX; startClientY = t.clientY;
    startPosX = currentX;     startPosY    = currentY;
    container.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    currentX = clampX(startPosX + (t.clientX - startClientX));
    currentY = clampY(startPosY + (t.clientY - startClientY));
    _applyPosition(container, currentX, currentY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('dragging');
    const t = e.changedTouches[0];
    _savePosition(currentX, currentY);
    if (Math.abs(t.clientX - startClientX) < 8 && Math.abs(t.clientY - startClientY) < 8) {
      _onTap();
    }
  }, { passive: true });

  // Mouse
  container.addEventListener('mousedown', (e) => {
    dragging = true;
    startClientX = e.clientX; startClientY = e.clientY;
    startPosX = currentX;     startPosY    = currentY;
    container.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    currentX = clampX(startPosX + (e.clientX - startClientX));
    currentY = clampY(startPosY + (e.clientY - startClientY));
    _applyPosition(container, currentX, currentY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('dragging');
    _savePosition(currentX, currentY);
    if (Math.abs(e.clientX - startClientX) < 8 && Math.abs(e.clientY - startClientY) < 8) {
      _onTap();
    }
  });
}

function _applyPosition(container, x, y) {
  container.style.left = x + 'px';
  container.style.top  = y + 'px';
  _updateBubbleSide(x);
}

function _savePosition(x, y) {
  setAvatarState({ position: { x, y } });
}

// ─── Tap ──────────────────────────────────────────────────────────────────────

function _onTap() {
  if (window.SystemCore) {
    window.SystemCore.dispatch('AVATAR_TAP');
  } else {
    showAvatar(pickRandom(MESSAGES.tap[getLang()] || MESSAGES.tap.ru), true);
  }
}

// ─── Bubble side ─────────────────────────────────────────────────────────────

function _updateBubbleSide(x) {
  const bubble = document.getElementById('avatar-bubble');
  if (!bubble) return;
  const right = x > vw() / 2;
  bubble.classList.toggle('left',  right);
  bubble.classList.toggle('right', !right);
}

// ─── renderAvatar — visual only, NEVER moves the element ─────────────────────

export function renderAvatar() {
  const container = document.getElementById('avatar-container');
  if (!container) return;

  const s = getAvatarState();

  container.classList.toggle('idle', !!s.isIdle);

  const textEl    = document.getElementById('avatar-text');
  const actionsEl = document.getElementById('avatar-actions');
  const bubble    = document.getElementById('avatar-bubble');

  if (s.visible) {
    if (textEl) textEl.textContent = s.message || '';
    if (actionsEl) {
      actionsEl.innerHTML = '';
      if (s.actions && s.actions.length > 0) {
        s.actions.slice(0, 2).forEach(action => {
          const btn = document.createElement('button');
          btn.className   = 'avatar-action-btn';
          btn.textContent = action.label;
          btn.onclick = () => {
            if (window.navigateTo) window.navigateTo(action.action);
            _hideBubble();
          };
          actionsEl.appendChild(btn);
        });
      }
    }
    container.classList.add('active');
    if (bubble) bubble.classList.add('visible');
    if (BUBBLE_DURATION > 0) {
      if (_bubbleTimer) clearTimeout(_bubbleTimer);
      _bubbleTimer = setTimeout(_hideBubble, BUBBLE_DURATION);
    }
  } else {
    container.classList.remove('active');
    if (bubble) bubble.classList.remove('visible');
  }
}

function _hideBubble() {
  if (_bubbleTimer) { clearTimeout(_bubbleTimer); _bubbleTimer = null; }
  setAvatarState({ visible: false });
  const container = document.getElementById('avatar-container');
  const bubble    = document.getElementById('avatar-bubble');
  if (container) container.classList.remove('active');
  if (bubble)    bubble.classList.remove('visible');
}

// ─── showAvatar — public API ──────────────────────────────────────────────────

export function showAvatar(message, immediate = false, actions = null) {
  if (!_enabled) return;
  const now    = Date.now();
  const config = typeof message === 'object' ? message : { text: message };
  const force  = config.force || immediate;
  if (!force && now - _lastShowTime < MIN_INTERVAL) return;
  _lastShowTime = now;

  const text       = config.text || _getDefaultMessage();
  const actionList = config.actions || actions;

  setAvatarState({ visible: true, message: text, type: config.source || 'default', actions: actionList, timestamp: now, isIdle: false });
  if (_idleTimer) clearTimeout(_idleTimer);

  const doShow = () => {
    renderAvatar();
    _idleTimer = setTimeout(() => { setAvatarState({ isIdle: true }); renderAvatar(); }, IDLE_TIMEOUT);
  };

  if (force) {
    doShow();
  } else {
    setTimeout(() => {
      if (!isUserActive() && !isSilentScreen() && !hasOpenModal()) doShow();
    }, 2000);
  }
}

// ─── Public reactions ─────────────────────────────────────────────────────────

export function showAvatarForMood(mood) {
  const prev  = getLastMood();
  const trend = getTrend(prev, mood);
  const type  = getMoodType(mood);
  const lang  = getLang();
  let text;
  if (trend !== 'same') {
    text = pickRandom((MESSAGES.trend[lang] || MESSAGES.trend.ru)[trend]);
  } else {
    text = pickRandom((MESSAGES.mood[lang] || MESSAGES.mood.ru)[type]);
  }
  showAvatar(text, true);
  if (Date.now() - _lastEffectTime > EFFECT_COOLDOWN) {
    _lastEffectTime = Date.now();
    if (trend === 'up'   || type === 'high') _showConfetti();
    if (trend === 'down' || type === 'low')  _showCloud();
  }
}

export function showAvatarHint(mood) {
  const now = Date.now();
  if (now - _lastSliderTime < SLIDER_COOLDOWN) return;
  _lastSliderTime = now;
  const lang    = getLang();
  const type    = getMoodType(mood);
  const msgs    = (MESSAGES.slider[lang] || MESSAGES.slider.ru)[type];
  const text    = pickRandom(msgs);
  let   actions = null;
  if (type !== 'mid') {
    const map = MESSAGES.actions[lang] || MESSAGES.actions.ru;
    actions   = map[type] || null;
  }
  showAvatar(text, true, actions);
  if (mood >= 70) _showConfetti();
  else if (mood < 30) _showCloud();
}

export function maybeShowAvatarProactive() {
  const now           = Date.now();
  const lastProactive = parseInt(localStorage.getItem('avatar_last_proactive') || '0');
  if (now - lastProactive < PROACTIVE_COOLDOWN) return;
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const lang    = getLang();
    let   type    = null;
    if (history.length === 0) {
      type = 'inactive';
    } else {
      const sorted    = [...history].sort((a,b) => (b.time||b.date) - (a.time||a.date));
      const lastTime  = sorted[0]?.time || sorted[0]?.date;
      if (lastTime && (now - parseInt(lastTime)) > 6 * 60 * 60 * 1000) {
        type = 'inactive';
      } else {
        const today = new Date().toDateString();
        const hasEntryToday = sorted.some(e => {
          const t = e.time || e.date;
          return t && new Date(parseInt(t)).toDateString() === today;
        });
        if (!hasEntryToday) {
          type = 'noEntry';
        } else if (sorted.length >= 2) {
          const last = sorted[0]?.value, prev = sorted[1]?.value;
          if (last !== null && prev !== null && last < prev - 10) type = 'decline';
        }
      }
    }
    if (type) {
      const msgs = (MESSAGES.proactive[lang] || MESSAGES.proactive.ru)[type];
      showAvatar(pickRandom(msgs));
      localStorage.setItem('avatar_last_proactive', String(now));
    }
  } catch(e) { console.warn('[AVATAR] proactive error:', e); }
}

// ─── Effects ──────────────────────────────────────────────────────────────────

function _showConfetti() {
  const c = document.getElementById('avatar-effects');
  if (!c) return;
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className   = 'confetti';
    el.style.left  = Math.random() * 40 + 'px';
    el.style.background = EFFECT_COLORS[Math.floor(Math.random() * EFFECT_COLORS.length)];
    c.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

function _showCloud() {
  const c = document.getElementById('avatar-effects');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'cloud'; el.textContent = '☁️';
  c.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function _getDefaultMessage() {
  const d = {
    ru:['Я вижу, как меняется твоё состояние','Ты сейчас сделал важную вещь для себя','Давай закрепим это ощущение'],
    en:['I can see your mood changing','You just did something important for yourself',"Let's lock in this feeling"],
    es:['Veo cómo cambia tu estado','Acabas de hacer algo importante para ti','Fijemos esta sensación'],
    uk:['Я бачу, як змінюється твій стан','Ти зараз зробив важливу річ для себе','Давай закріпимо це відчуття']
  };
  return pickRandom(d[getLang()] || d.ru);
}

// ─── Enable / disable ────────────────────────────────────────────────────────

export function setAvatarEnabled(enabled) { _enabled = enabled; }
export function isAvatarEnabled()          { return _enabled;   }

// ─── initAvatar — single entry point ─────────────────────────────────────────

export function initAvatar() {
  if (_initialized) { console.warn('[AVATAR] Already initialized'); return; }
  _initialized = true;

  const container = document.getElementById('avatar-container');
  if (!container) { console.error('[AVATAR] #avatar-container not found'); return; }

  // Minimal inline CSS safety net (CSS file is authoritative)
  container.style.position    = 'fixed';
  container.style.zIndex      = '9000';
  container.style.touchAction = 'none';

  _initDrag(container);
  setAvatarState({ visible: false, isIdle: true });
  renderAvatar();

  console.log('[AVATAR] initAvatar complete');
}

// Alias: app.js calls initAvatarTap
export { initAvatar as initAvatarTap };

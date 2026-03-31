/**
 * avatar.js — Neyra Avatar Module v3
 * Personalized + Context-aware + Priority system
 */

import { setAvatarState, getAvatarState } from './state.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_SIZE        = 60;
const SAFE_SIDE          = 8;
const SAFE_TOP           = 8;
const SAFE_BOTTOM        = 90;
const BUBBLE_DURATION    = 5000;
const IDLE_TIMEOUT       = 8000;
const PROACTIVE_COOLDOWN = 6 * 60 * 60 * 1000;
const ACTIVITY_TIMEOUT   = 10000;
const EFFECT_COOLDOWN    = 30000;
const SLIDER_COOLDOWN    = 5000;

// Cooldown по типу сообщения (мс)
const COOLDOWNS = {
  support : 10000,
  insight : 15000,
  idle    : 30000,
  practice: 45000,
  mood    : 60000,
  default : 10000,
};

// Приоритеты (меньше = важнее)
const PRIORITY = {
  practice: 1,
  mood    : 1,
  insight : 2,
  idle    : 3,
  tap     : 4,
};

const SILENT_SCREENS = ['meditation','breathing','tap-calm','visual-focus','mind-dump'];
const EFFECT_COLORS  = ['#ffd54f','#ff8a65','#81c784','#64b5f6','#ba68c8'];

// ─── Module state ─────────────────────────────────────────────────────────────

let _initialized      = false;
let _enabled          = true;
let _lastShowTime     = 0;
let _lastShowType     = 'default';
let _lastSliderTime   = 0;
let _lastEffectTime   = 0;
let _lastActivityTime = 0;
let _currentPriority  = 99;
let _bubbleTimer      = null;
let _idleTimer        = null;
let _lastAction       = null; // 'practice_positive' | 'practice_negative' | 'insight' | 'idle'

// ─── Viewport ────────────────────────────────────────────────────────────────

function vw() { return window.visualViewport?.width  || window.innerWidth;  }
function vh() { return window.visualViewport?.height || window.innerHeight; }
function clampX(x) { return Math.max(SAFE_SIDE, Math.min(x, vw() - AVATAR_SIZE - SAFE_SIDE)); }
function clampY(y) { return Math.max(SAFE_TOP,  Math.min(y, vh() - AVATAR_SIZE - SAFE_BOTTOM)); }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLang()        { return localStorage.getItem('app_language') || 'ru'; }
function pickRandom(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }

function getMoodType(mood) {
  if (mood < 40) return 'low';
  if (mood < 70) return 'mid';
  return 'high';
}

function getMoodLabel(mood) {
  const lang = getLang();
  const map = {
    ru: { low: 'при тревоге', mid: 'в нейтральном состоянии', high: 'в хорошем настроении' },
    en: { low: 'when anxious', mid: 'in a neutral state', high: 'in a good mood' },
    es: { low: 'cuando ansioso', mid: 'en estado neutro', high: 'de buen humor' },
    uk: { low: 'при тривозі', mid: 'у нейтральному стані', high: 'у гарному настрої' },
  };
  return (map[lang] || map.ru)[getMoodType(mood)];
}

function getLastMood() {
  try {
    const h = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (!h.length) return null;
    const s = [...h].sort((a,b) => (b.time||b.date) - (a.time||a.date));
    return s[0]?.value ?? null;
  } catch(_) { return null; }
}

function getTrend(prev, curr) {
  if (prev === null) return 'same';
  if (curr > prev + 5) return 'up';
  if (curr < prev - 5) return 'down';
  return 'same';
}

function getMostUsedPractice() {
  try {
    const h = JSON.parse(localStorage.getItem('practice_history') || '[]');
    if (h.length < 3) return null;
    const counts = {};
    h.slice(-20).forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
    return top && top[1] >= 3 ? top[0] : null;
  } catch(_) { return null; }
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

// ─── Activity ────────────────────────────────────────────────────────────────

export function trackUserActivity() { _lastActivityTime = Date.now(); }
function isUserActive() { return (Date.now() - _lastActivityTime) < ACTIVITY_TIMEOUT; }

// ─── Messages ────────────────────────────────────────────────────────────────

const MSG = {
  practice: {
    ru: {
      positive: {
        low : ['Вижу, {practice} помогает тебе при тревоге', 'Это работает — особенно когда тяжело'],
        mid : ['Хороший выбор для этого момента', 'Ты нашёл что тебе подходит'],
        high: ['Отлично, ты в ресурсе', 'Это состояние стоит запомнить'],
      },
      negative: {
        low : ['Похоже, это не лучший вариант при грусти', 'Попробуем что-то другое?'],
        mid : ['Не всегда работает одно и то же', 'Давай попробуем другой подход'],
        high: ['Окей, попробуем другой вариант', 'Не страшно, найдём что подходит'],
      },
    },
    en: {
      positive: {
        low : ['I see {practice} helps you when anxious', 'This works — especially when it\'s tough'],
        mid : ['Good choice for this moment', 'You found what works for you'],
        high: ['Great, you\'re resourced', 'This state is worth remembering'],
      },
      negative: {
        low : ['Seems this isn\'t the best when sad', 'Want to try something else?'],
        mid : ['Not everything works the same way', 'Let\'s try a different approach'],
        high: ['Okay, let\'s try another option', 'No worries, we\'ll find what fits'],
      },
    },
    es: {
      positive: {
        low : ['Veo que {practice} te ayuda cuando estás ansioso', 'Esto funciona — especialmente cuando es difícil'],
        mid : ['Buena elección para este momento', 'Encontraste lo que te funciona'],
        high: ['Genial, tienes recursos', 'Vale la pena recordar este estado'],
      },
      negative: {
        low : ['Parece que esto no es lo mejor cuando estás triste', '¿Probamos otra cosa?'],
        mid : ['No siempre funciona lo mismo', 'Probemos un enfoque diferente'],
        high: ['Okay, probemos otra opción', 'No pasa nada, encontraremos lo que encaja'],
      },
    },
    uk: {
      positive: {
        low : ['Бачу, {practice} допомагає тобі при тривозі', 'Це працює — особливо коли важко'],
        mid : ['Хороший вибір для цього моменту', 'Ти знайшов що тобі підходить'],
        high: ['Чудово, ти у ресурсі', 'Цей стан варто запам\'ятати'],
      },
      negative: {
        low : ['Схоже, це не найкращий варіант при смутку', 'Спробуємо щось інше?'],
        mid : ['Не завжди працює одне й те саме', 'Давай спробуємо інший підхід'],
        high: ['Окей, спробуємо інший варіант', 'Нічого, знайдемо що підходить'],
      },
    },
  },

  memory: {
    ru: [
      'Ты часто выбираешь это — похоже, это работает для тебя',
      'Замечаю паттерн: тебе помогает этот подход',
      'Ты нашёл своё — это хорошо',
    ],
    en: [
      'You often choose this — seems it works for you',
      'I notice a pattern: this approach helps you',
      'You found your way — that\'s great',
    ],
    es: [
      'Eliges esto con frecuencia — parece que te funciona',
      'Noto un patrón: este enfoque te ayuda',
      'Encontraste tu camino — eso es genial',
    ],
    uk: [
      'Ти часто обираєш це — схоже, це працює для тебе',
      'Помічаю паттерн: тобі допомагає цей підхід',
      'Ти знайшов своє — це добре',
    ],
  },

  insight: {
    ru : ['Интересно, правда?', 'Это стоит запомнить', 'Полезная находка'],
    en : ['Interesting, right?', 'Worth remembering', 'Useful finding'],
    es : ['Interesante, ¿verdad?', 'Vale la pena recordarlo', 'Hallazgo útil'],
    uk : ['Цікаво, правда?', 'Це варто запам\'ятати', 'Корисна знахідка'],
  },

  returnApp: {
    ru : ['Рад, что ты вернулся', 'Снова здесь — хорошо', 'Приятно видеть тебя снова'],
    en : ['Glad you\'re back', 'Here again — good', 'Nice to see you again'],
    es : ['Me alegra que hayas vuelto', 'Aquí de nuevo — bien', 'Qué bueno verte de nuevo'],
    uk : ['Радий, що ти повернувся', 'Знову тут — добре', 'Приємно бачити тебе знову'],
  },

  idle: {
    ru : ['Хочешь продолжить?', 'Я рядом, если нужно', 'Хочешь попробовать практику?'],
    en : ['Want to continue?', 'I\'m here if needed', 'Want to try a practice?'],
    es : ['¿Quieres continuar?', 'Estoy aquí si lo necesitas', '¿Quieres probar una práctica?'],
    uk : ['Хочеш продовжити?', 'Я поруч, якщо потрібно', 'Хочеш спробувати практику?'],
  },

  tap: {
    ru: {
      practice_positive: ['Ты хорошо справился', 'Это помогло — запомни', 'Отличный выбор был'],
      practice_negative: ['Я рядом, если нужно', 'Попробуем другой подход?', 'Не страшно'],
      insight          : ['Это полезно, правда?', 'Стоит вернуться к этому', 'Интересная находка'],
      idle             : ['Я рядом, если нужно', 'Всё хорошо?', 'Как ты сейчас?'],
      default          : ['Я здесь', 'Ты справляешься', 'Как ты сейчас?', 'Продолжай'],
    },
    en: {
      practice_positive: ['You did well', 'That helped — remember it', 'Great choice'],
      practice_negative: ['I\'m here if needed', 'Want to try another approach?', 'No worries'],
      insight          : ['That\'s useful, right?', 'Worth coming back to', 'Interesting finding'],
      idle             : ['I\'m here if needed', 'Everything okay?', 'How are you now?'],
      default          : ['I\'m here', 'You\'re doing well', 'How are you now?', 'Keep going'],
    },
    es: {
      practice_positive: ['Lo hiciste bien', 'Eso ayudó — recuérdalo', 'Gran elección'],
      practice_negative: ['Estoy aquí si lo necesitas', '¿Probamos otro enfoque?', 'No pasa nada'],
      insight          : ['Eso es útil, ¿verdad?', 'Vale la pena volver', 'Hallazgo interesante'],
      idle             : ['Estoy aquí si lo necesitas', '¿Todo bien?', '¿Cómo estás ahora?'],
      default          : ['Estoy aquí', 'Lo estás haciendo bien', '¿Cómo estás ahora?', 'Continúa'],
    },
    uk: {
      practice_positive: ['Ти добре впорався', 'Це допомогло — запам\'ятай', 'Відмінний вибір'],
      practice_negative: ['Я поруч, якщо потрібно', 'Спробуємо інший підхід?', 'Нічого страшного'],
      insight          : ['Це корисно, правда?', 'Варто повернутись до цього', 'Цікава знахідка'],
      idle             : ['Я поруч, якщо потрібно', 'Все добре?', 'Як ти зараз?'],
      default          : ['Я тут', 'Ти справляєшся', 'Як ти зараз?', 'Продовжуй'],
    },
  },

  mood: {
    ru: { low:['Похоже, сейчас непросто','Я рядом, не спеши','Ты можешь немного замедлиться'], mid:['Ты держишь баланс','Неплохое состояние','Можно зафиксировать это'], high:['Хороший момент','Ты сейчас в ресурсе','Это состояние можно запомнить'] },
    en: { low:["Seems tough right now","I'm here, no rush","You can slow down"], mid:["You're holding balance","Not bad","You can note this"], high:["Good moment","You're resourced","This state is worth remembering"] },
    es: { low:['Parece difícil ahora','Estoy aquí, sin prisa','Puedes ralentizar'], mid:['Mantienes el equilibrio','No está mal','Puedes anotar esto'], high:['Buen momento','Estás con recursos','Este estado vale la pena recordar'] },
    uk: { low:['Схоже, зараз непросто','Я поруч, не квапся','Ти можеш трохи сповільнитись'], mid:['Ти тримаєш баланс','Непоганий стан','Можна зафіксувати це'], high:['Гарний момент','Ти зараз у ресурсі','Цей стан можна запам\'ятати'] },
  },

  trend: {
    ru: { up:['Стало легче','Есть движение вверх','Ты немного поднялся'], down:['Похоже, стало тяжелее','Небольшой спад — это нормально','Ты можешь немного замедлиться'] },
    en: { up:['Feeling lighter','Moving upward','You\'re a bit up'], down:['Seems a bit harder','Small dip — that\'s normal','You can slow down'] },
    es: { up:['Te sientes más ligero','Hay movimiento hacia arriba','Has subido un poco'], down:['Parece un poco más difícil','Pequeña caída — es normal','Puedes ralentizar'] },
    uk: { up:['Стало легше','Є рух вгору','Ти трохи піднявся'], down:['Схоже, стало важче','Невеликий спад — це нормально','Ти можеш трохи сповільнитись'] },
  },

  proactive: {
    ru: { inactive:['Ты давно не заходил','Можешь зафиксировать состояние'], noEntry:['Сегодня ещё нет записи','Как ты сейчас?'], decline:['Последнее время тяжеловато','Хочешь зафиксировать состояние?'] },
    en: { inactive:["You haven't been here for a while","You can note your state"], noEntry:['No entry today yet','How are you now?'], decline:['These days have been tough','Want to note your state?'] },
    es: { inactive:['Hace tiempo que no vienes','Puedes anotar tu estado'], noEntry:['Aún no hay registro hoy','¿Cómo estás ahora?'], decline:['Últimamente ha sido difícil','¿Quieres anotar tu estado?'] },
    uk: { inactive:['Ти давно не заходив','Можеш зафіксувати стан'], noEntry:['Сьогодні ще немає запису','Як ти зараз?'], decline:['Останнім часом важкувато','Хочеш зафіксувати стан?'] },
  },

  actions: {
    ru: { low:[{label:'Подышать',action:'breathing'},{label:'Выгрузить',action:'mind-dump'}], high:[{label:'Зафиксировать',action:'home'}] },
    en: { low:[{label:'Breathe',action:'breathing'},{label:'Mind dump',action:'mind-dump'}], high:[{label:'Save this',action:'home'}] },
    es: { low:[{label:'Respirar',action:'breathing'},{label:'Vaciar mente',action:'mind-dump'}], high:[{label:'Guardar',action:'home'}] },
    uk: { low:[{label:'Подихати',action:'breathing'},{label:'Вивантажити',action:'mind-dump'}], high:[{label:'Зберегти',action:'home'}] },
  },
};

// ─── Drag ─────────────────────────────────────────────────────────────────────

function _initDrag(container) {
  let dragging = false;
  let startClientX = 0, startClientY = 0;
  let startPosX = 0, startPosY = 0;
  let currentX  = 0, currentY  = 0;

  const saved = getAvatarState().position;
  currentX = clampX(saved?.x ?? (vw() - AVATAR_SIZE - 16));
  currentY = clampY(saved?.y ?? (vh() - AVATAR_SIZE - 90));
  _applyPosition(container, currentX, currentY);

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
    if (Math.abs(t.clientX - startClientX) < 8 && Math.abs(t.clientY - startClientY) < 8) _onTap();
  }, { passive: true });

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
    if (Math.abs(e.clientX - startClientX) < 8 && Math.abs(e.clientY - startClientY) < 8) _onTap();
  });
}

function _applyPosition(container, x, y) {
  container.style.left = x + 'px';
  container.style.top  = y + 'px';
  _updateBubblePosition(x, y);
}

function _savePosition(x, y) {
  setAvatarState({ position: { x, y } });
}

// ─── Bubble positioning ───────────────────────────────────────────────────────

function _updateBubblePosition(x, y) {
  const bubble = document.getElementById('avatar-bubble');
  if (!bubble) return;

  // Горизонталь
  const toRight = x > vw() / 2;
  bubble.classList.toggle('left',  toRight);
  bubble.classList.toggle('right', !toRight);

  // Вертикаль — если аватар в верхней трети экрана, bubble идёт вниз
  const isNearTop = y < vh() / 3;
  bubble.classList.toggle('below', isNearTop);
}

// ─── Tap ──────────────────────────────────────────────────────────────────────

function _onTap() {
  const container = document.getElementById('avatar-container');
  if (container) {
    container.classList.remove('tapped');
    void container.offsetWidth; // reflow
    container.classList.add('tapped');
    setTimeout(() => container.classList.remove('tapped'), 400);
  }

  if (window.SystemCore) {
    window.SystemCore.dispatch('AVATAR_TAP');
  } else {
    const lang = getLang();
    const pool = MSG.tap[lang] || MSG.tap.ru;
    const msgs = pool[_lastAction] || pool.default;
    showAvatar(pickRandom(msgs), true, null, 'tap');
  }
}

// ─── renderAvatar ─────────────────────────────────────────────────────────────

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
      (s.actions || []).slice(0, 2).forEach(action => {
        const btn = document.createElement('button');
        btn.className   = 'avatar-action-btn';
        btn.textContent = action.label;
        btn.onclick = () => { if (window.navigateTo) window.navigateTo(action.action); _hideBubble(); };
        actionsEl.appendChild(btn);
      });
    }
    container.classList.add('active');
    if (bubble) bubble.classList.add('visible');
    if (_bubbleTimer) clearTimeout(_bubbleTimer);
    _bubbleTimer = setTimeout(_hideBubble, BUBBLE_DURATION);
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

// ─── showAvatar — core ────────────────────────────────────────────────────────

export function showAvatar(message, immediate = false, actions = null, type = 'default') {
  if (!_enabled) return;
  const now      = Date.now();
  const config   = typeof message === 'object' ? message : { text: message };
  const force    = config.force || immediate;
  const msgType  = config.type || type;
  const priority = PRIORITY[msgType] || PRIORITY.tap;
  const cooldown = COOLDOWNS[msgType] || COOLDOWNS.default;

  if (!force) {
    if (now - _lastShowTime < cooldown) return;
    if (priority > _currentPriority) return; // текущее важнее
  }

  _lastShowTime    = now;
  _lastShowType    = msgType;
  _currentPriority = priority;

  const text       = config.text || message;
  const actionList = config.actions || actions;

  setAvatarState({ visible: true, message: text, type: msgType, actions: actionList, timestamp: now, isIdle: false });
  if (_idleTimer) clearTimeout(_idleTimer);

  const doShow = () => {
    renderAvatar();
    _idleTimer = setTimeout(() => {
      setAvatarState({ isIdle: true });
      renderAvatar();
      _currentPriority = 99;
    }, IDLE_TIMEOUT);
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
    text = pickRandom((MSG.trend[lang] || MSG.trend.ru)[trend]);
  } else {
    text = pickRandom((MSG.mood[lang] || MSG.mood.ru)[type]);
  }
  let actions = null;
  if (type !== 'mid') actions = (MSG.actions[lang] || MSG.actions.ru)[type] || null;
  showAvatar(text, true, actions, 'support');

  if (Date.now() - _lastEffectTime > EFFECT_COOLDOWN) {
    _lastEffectTime = Date.now();
    if (trend === 'up'   || type === 'high') _showConfetti();
    if (trend === 'down' || type === 'low')  _showCloud();
  }
}

export function showAvatarHint(mood) {
  const now = Date.now();
  if (now - _lastSliderTime < 5000) return;
  _lastSliderTime = now;
  const lang    = getLang();
  const type    = getMoodType(mood);
  const text    = pickRandom((MSG.mood[lang] || MSG.mood.ru)[type]);
  let   actions = null;
  if (type !== 'mid') actions = (MSG.actions[lang] || MSG.actions.ru)[type] || null;
  showAvatar(text, true, actions, 'support');
  if (mood >= 70) _showConfetti();
  else if (mood < 30) _showCloud();
}

// Вызывается после завершения практики
export function showAvatarForPractice(practiceType, result, mood) {
  _lastAction = result === 'positive' ? 'practice_positive' : 'practice_negative';
  const lang      = getLang();
  const moodType  = getMoodType(mood ?? 50);
  const pool      = ((MSG.practice[lang] || MSG.practice.ru)[result] || {})[moodType] || [];
  let   text      = pickRandom(pool) || '';
  const moodLabel = getMoodLabel(mood ?? 50);
  text = text.replace('{practice}', practiceType || '').replace('{mood}', moodLabel);

  // Проверяем паттерн — часто используемая практика
  const top = getMostUsedPractice();
  if (top && top === practiceType && result === 'positive') {
    text = pickRandom(MSG.memory[lang] || MSG.memory.ru);
  }

  showAvatar(text, true, null, 'practice');
  if (result === 'positive') _showConfetti();
  else _showCloud();
}

// Вызывается после показа инсайта
export function showAvatarForInsight() {
  _lastAction = 'insight';
  const lang = getLang();
  const text = pickRandom(MSG.insight[lang] || MSG.insight.ru);
  showAvatar(text, true, null, 'insight');
}

// Вызывается при возврате в приложение (visibilitychange)
export function showAvatarOnReturn() {
  const lang = getLang();
  const text = pickRandom(MSG.returnApp[lang] || MSG.returnApp.ru);
  showAvatar(text, false, null, 'support');
}

export function maybeShowAvatarProactive() {
  const now           = Date.now();
  const lastProactive = parseInt(localStorage.getItem('avatar_last_proactive') || '0');
  if (now - lastProactive < PROACTIVE_COOLDOWN) return;
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const lang    = getLang();
    let   type    = null;
    if (!history.length) {
      type = 'inactive';
    } else {
      const sorted   = [...history].sort((a,b) => (b.time||b.date) - (a.time||a.date));
      const lastTime = sorted[0]?.time || sorted[0]?.date;
      if (lastTime && (now - parseInt(lastTime)) > 6 * 60 * 60 * 1000) {
        type = 'inactive';
      } else {
        const today = new Date().toDateString();
        const hasToday = sorted.some(e => {
          const t = e.time || e.date;
          return t && new Date(parseInt(t)).toDateString() === today;
        });
        if (!hasToday) {
          type = 'noEntry';
        } else if (sorted.length >= 2) {
          const last = sorted[0]?.value, prev = sorted[1]?.value;
          if (last != null && prev != null && last < prev - 10) type = 'decline';
        }
      }
    }
    if (type) {
      const msgs = (MSG.proactive[lang] || MSG.proactive.ru)[type];
      showAvatar(pickRandom(msgs), false, null, 'idle');
      localStorage.setItem('avatar_last_proactive', String(now));
    }
  } catch(e) { console.warn('[AVATAR] proactive error:', e); }
}

// ─── Idle trigger (бездействие) ───────────────────────────────────────────────

export function showAvatarIdle() {
  _lastAction = 'idle';
  const lang = getLang();
  const text = pickRandom(MSG.idle[lang] || MSG.idle.ru);
  showAvatar(text, false, null, 'idle');
}

// ─── Effects ──────────────────────────────────────────────────────────────────

function _showConfetti() {
  const c = document.getElementById('avatar-effects');
  if (!c) return;
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className  = 'confetti';
    el.style.left = Math.random() * 40 + 'px';
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

// ─── Enable / disable ────────────────────────────────────────────────────────

export function setAvatarEnabled(enabled) { _enabled = enabled; }
export function isAvatarEnabled()          { return _enabled;   }

// ─── initAvatar ───────────────────────────────────────────────────────────────

export function initAvatar() {
  if (_initialized) { console.warn('[AVATAR] Already initialized'); return; }
  _initialized = true;

  const container = document.getElementById('avatar-container');
  if (!container) { console.error('[AVATAR] #avatar-container not found'); return; }

  container.style.position    = 'fixed';
  container.style.zIndex      = '9000';
  container.style.touchAction = 'none';

  _initDrag(container);
  setAvatarState({ visible: false, isIdle: true });
  renderAvatar();

  // Слушаем возврат в приложение
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) showAvatarOnReturn();
  });

  console.log('[AVATAR] initAvatar v3 complete');
}

export { initAvatar as initAvatarTap };

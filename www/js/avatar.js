import { setAvatarState, getAvatarState } from './state.js';

console.log('🔥🔥🔥 NEW VERSION 20260334 LOADED - avatar.js 🔥🔥🔥');
console.log('[BOOT] avatar.js loaded');

let avatarEnabled = true;
let lastShowTime = 0;
let lastEffectTime = 0;
let lastActivityTime = 0;
let lastSliderReaction = 0;
const MIN_INTERVAL = 2 * 60 * 1000;
const EFFECT_COOLDOWN = 30000;
const ACTIVITY_TIMEOUT = 10000;
const SHOW_DELAY = 2000;
const SLIDER_COOLDOWN = 5000;

function getViewportWidth() {
  return window.visualViewport?.width || window.innerWidth;
}

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight;
}

const SAFE_TOP = 10;
const SAFE_BOTTOM = 80;
const SAFE_SIDE = 10;
const AVATAR_WIDTH = 50;
const AVATAR_HEIGHT = 50;
const IDLE_TIMEOUT = 8000;

let idleTimer = null;

function exitIdleMode() {
  if (idleTimer) clearTimeout(idleTimer);
  setAvatarState({ isIdle: false });
  triggerAvatarRender();
  // TEMP disable idle timer
  // idleTimer = setTimeout(() => {
  //   setAvatarState({ isIdle: true });
  //   triggerAvatarRender();
  // }, IDLE_TIMEOUT);
}

function triggerAvatarRender() {
  if (window.renderAvatarApp) {
    window.renderAvatarApp();
  }
}

const SILENT_SCREENS = ['meditation', 'breathing', 'tap-calm', 'visual-focus', 'mind-dump'];

const EFFECT_COLORS = ['#ffd54f', '#ff8a65', '#81c784', '#64b5f6', '#ba68c8'];

export function trackUserActivity() {
  lastActivityTime = Date.now();
}

function isUserActive() {
  return (Date.now() - lastActivityTime) < ACTIVITY_TIMEOUT;
}

function isSilentScreen() {
  const activeScreen = document.querySelector('.screen.active');
  if (!activeScreen) return false;
  const screenName = activeScreen.getAttribute('data-screen');
  return SILENT_SCREENS.includes(screenName);
}

function hasOpenModal() {
  return document.querySelector('.health-modal-overlay') !== null ||
         document.querySelector('#premium-modal[style*="flex"]') !== null ||
         document.querySelector('#menuPanel[style*="bottom: 0"]') !== null;
}

function shouldShowAvatar() {
  if (isUserActive()) return false;
  if (isSilentScreen()) return false;
  if (hasOpenModal()) return false;
  return true;
}

const moodMessages = {
  ru: {
    low: [
      "Похоже, сейчас непросто",
      "Ты можешь немного замедлиться",
      "Я рядом, не спеши"
    ],
    mid: [
      "Ты держишь баланс",
      "Неплохое состояние",
      "Можно зафиксировать это"
    ],
    high: [
      "Хороший момент",
      "Это состояние можно запомнить",
      "Ты сейчас в ресурсе"
    ]
  },
  en: {
    low: [
      "Seems like it's not easy right now",
      "You can slow down a bit",
      "I'm here, no rush"
    ],
    mid: [
      "You're holding balance",
      "Not bad",
      "You can note this"
    ],
    high: [
      "Good moment",
      "This state is worth remembering",
      "You're resourced right now"
    ]
  },
  es: {
    low: [
      "Parece que no es fácil ahora",
      "Puedes ralentizar un poco",
      "Estoy aquí, sin prisa"
    ],
    mid: [
      "Mantienes el equilibrio",
      "No está mal",
      "Puedes anotar esto"
    ],
    high: [
      "Buen momento",
      "Este estado vale la pena recordar",
      "Estás con recursos ahora"
    ]
  },
  uk: {
    low: [
      "Схоже, зараз непросто",
      "Ти можеш трохи сповільнитись",
      "Я поруч, не квапся"
    ],
    mid: [
      "Ти тримаєш баланс",
      "Непоганий стан",
      "Можна зафіксувати це"
    ],
    high: [
      "Гарний момент",
      "Цей стан можна запам'ятати",
      "Ти зараз у ресурсі"
    ]
  }
};

const tapMessages = {
  ru: [
    "Я здесь",
    "Можешь продолжить",
    "Попробуй ещё раз зафиксировать состояние"
  ],
  en: [
    "I'm here",
    "You can continue",
    "Try to note your state again"
  ],
  es: [
    "Estoy aquí",
    "Puedes continuar",
    "Intenta notar tu estado de nuevo"
  ],
  uk: [
    "Я тут",
    "Можеш продовжити",
    "Спробуй ще раз зафіксувати стан"
  ]
};

const trendMessages = {
  ru: {
    up: [
      "Стало легче",
      "Ты немного поднялся",
      "Есть движение вверх"
    ],
    down: [
      "Похоже, стало тяжелее",
      "Небольшой спад — это нормально",
      "Ты можешь немного замедлиться"
    ]
  },
  en: {
    up: [
      "Feeling lighter",
      "You're a bit up",
      "Moving upward"
    ],
    down: [
      "Seems a bit harder",
      "Small dip — that's normal",
      "You can slow down a bit"
    ]
  },
  es: {
    up: [
      "Te sientes más ligero",
      "Has subido un poco",
      "Hay movimiento hacia arriba"
    ],
    down: [
      "Parece un poco más difícil",
      "Pequeña caída — es normal",
      "Puedes ralentizar un poco"
    ]
  },
  uk: {
    up: [
      "Стало легше",
      "Ти трохи піднявся",
      "Є рух вгору"
    ],
    down: [
      "Схоже, стало важче",
      "Невеликий спад — це нормально",
      "Ти можеш трохи сповільнитись"
    ]
  }
};

const proactiveMessages = {
  ru: {
    inactive: [
      "Ты давно не заходил",
      "Можешь зафиксировать состояние"
    ],
    noEntry: [
      "Сегодня ещё нет записи",
      "Как ты сейчас?"
    ],
    decline: [
      "Последнее время тяжеловато",
      "Хочешь зафиксировать состояние?"
    ]
  },
  en: {
    inactive: [
      "You haven't been here for a while",
      "You can note your state"
    ],
    noEntry: [
      "No entry today yet",
      "How are you now?"
    ],
    decline: [
      "These days have been tough",
      "Want to note your state?"
    ]
  },
  es: {
    inactive: [
      "Hace tiempo que no vienes",
      "Puedes anotar tu estado"
    ],
    noEntry: [
      "Aún no hay registro hoy",
      "¿Cómo estás ahora?"
    ],
    decline: [
      "Últimamente ha sido difícil",
      "¿Quieres anotar tu estado?"
    ]
  },
  uk: {
    inactive: [
      "Ти давно не заходив",
      "Можеш зафіксувати стан"
    ],
    noEntry: [
      "Сьогодні ще немає запису",
      "Як ти зараз?"
    ],
    decline: [
      "Останнім часом важкувато",
      "Хочеш зафіксувати стан?"
    ]
  }
};

const sliderHintMessages = {
  ru: {
    low: ["Похоже, сейчас тяжело", "Я рядом", "Можно зафиксировать это"],
    mid: ["Нормальное состояние", "Ты держишь баланс", "Можно отметить"],
    high: ["Хороший уровень", "Отличное состояние", "Ты в ресурсе"]
  },
  en: {
    low: ["Seems tough right now", "I'm here", "Can note this"],
    mid: ["Normal state", "You're balanced", "Can mark it"],
    high: ["Good level", "Great state", "You're resourced"]
  },
  es: {
    low: ["Parece difícil ahora", "Estoy aquí", "Se puede anotar"],
    mid: ["Estado normal", "Estás equilibrado", "Se puede marcar"],
    high: ["Buen nivel", "Gran estado", "Estás con recursos"]
  },
  uk: {
    low: ["Схоже, зараз важко", "Я поруч", "Можна зафіксувати"],
    mid: ["Нормальний стан", "Ти тримаєш баланс", "Можна відзначити"],
    high: ["Дobrый рівень", "Відмінний стан", "Ти у ресурсі"]
  }
};

const avatarActions = {
  ru: {
    low: [
      [{ label: "Подышать", action: "breathing" }, { label: "Выгрузить", action: "mind-dump" }]
    ],
    high: [
      [{ label: "Зафиксировать", action: "home" }]
    ]
  },
  en: {
    low: [
      [{ label: "Breathe", action: "breathing" }, { label: "Mind dump", action: "mind-dump" }]
    ],
    high: [
      [{ label: "Save this", action: "home" }]
    ]
  },
  es: {
    low: [
      [{ label: "Respirar", action: "breathing" }, { label: "Vaciar mente", action: "mind-dump" }]
    ],
    high: [
      [{ label: "Guardar", action: "home" }]
    ]
  },
  uk: {
    low: [
      [{ label: "Подихати", action: "breathing" }, { label: "Вивантажити", action: "mind-dump" }]
    ],
    high: [
      [{ label: "Зберегти", action: "home" }]
    ]
  }
};

const PROACTIVE_COOLDOWN = 6 * 60 * 60 * 1000;

function getMoodType(mood) {
  if (mood < 40) return 'low';
  if (mood < 70) return 'mid';
  return 'high';
}

function getLastMood() {
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    if (history && history.length > 0) {
      const sorted = [...history].sort((a, b) => (b.time || b.date) - (a.time || a.date));
      const lastEntry = sorted[0];
      return lastEntry?.value || null;
    }
  } catch (e) {}
  return null;
}

function getTrend(previousMood, currentMood) {
  if (previousMood === null) return 'same';
  if (currentMood > previousMood + 5) return 'up';
  if (currentMood < previousMood - 5) return 'down';
  return 'same';
}

function getLang() {
  return localStorage.getItem('app_language') || 'ru';
}

export function maybeShowAvatarProactive() {
  const now = Date.now();
  const lastProactive = parseInt(localStorage.getItem('avatar_last_proactive') || '0');
  
  if (now - lastProactive < PROACTIVE_COOLDOWN) return;
  
  try {
    const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
    const lang = getLang();
    let proactiveType = null;
    
    if (history.length === 0) {
      proactiveType = 'inactive';
    } else {
      const sorted = [...history].sort((a, b) => (b.time || b.date) - (a.time || a.date));
      const lastEntry = sorted[0];
      const lastTime = lastEntry?.time || lastEntry?.date;
      
      if (lastTime && (now - parseInt(lastTime)) > 6 * 60 * 60 * 1000) {
        proactiveType = 'inactive';
      } else {
        const today = new Date().toDateString();
        const hasEntryToday = sorted.some(e => {
          const entryTime = e.time || e.date;
          return entryTime && new Date(parseInt(entryTime)).toDateString() === today;
        });
        
        if (!hasEntryToday) {
          proactiveType = 'noEntry';
        } else if (sorted.length >= 2) {
          const last = sorted[0]?.value;
          const prev = sorted[1]?.value;
          if (last !== null && prev !== null && last < prev - 10) {
            proactiveType = 'decline';
          }
        }
      }
    }
    
    if (proactiveType) {
      const msgs = proactiveMessages[lang] || proactiveMessages.ru;
      const typeMsgs = msgs[proactiveType] || msgs.noEntry;
      const text = typeMsgs[Math.floor(Math.random() * typeMsgs.length)];
      
      showAvatar(text);
      localStorage.setItem('avatar_last_proactive', String(now));
    }
  } catch (e) {
    console.warn('maybeShowAvatarProactive error:', e);
  }
}

export function showAvatar(message, immediate = false, actions = null) {
  if (!avatarEnabled) return;
  
  const now = Date.now();
  
  let config = typeof message === 'object' ? message : { text: message };
  const force = config.force || immediate;
  
  if (!force && now - lastShowTime < MIN_INTERVAL) {
    return;
  }
  
  lastShowTime = now;
  
  const container = document.getElementById('avatar-container');
  const textEl = document.getElementById('avatar-text');
  const actionsEl = document.getElementById('avatar-actions');
  
  if (!container || !textEl || !actionsEl) {
    return;
  }
  
  const showNow = () => {
    const text = config.text || getDefaultMessage();
    const actionList = config.actions || actions;
    
    exitIdleMode();
    
    setAvatarState({
      visible: true,
      message: text,
      type: config.source || 'default',
      actions: actionList,
      timestamp: now
    });
    
    textEl.textContent = text;
    actionsEl.innerHTML = '';
    
    if (actionList && actionList.length > 0) {
      actionList.slice(0, 2).forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'avatar-action-btn';
        btn.textContent = action.label;
        btn.onclick = () => {
          handleAvatarAction(action.action);
          setAvatarState({ visible: false });
          container.classList.remove('active');
        };
        actionsEl.appendChild(btn);
      });
    }
    
    container.classList.add('active');
    
    // TEMP disable auto-hide
    // const duration = actionList && actionList.length > 0 ? 6000 : 4000;
    // setTimeout(() => {
    //   setAvatarState({ visible: false });
    //   container.classList.remove('active');
    // }, duration);
  };
  
  if (immediate || force) {
    showNow();
  } else {
    setTimeout(() => {
      if (shouldShowAvatar()) {
        showNow();
      }
    }, SHOW_DELAY);
  }
}

function handleAvatarAction(actionType) {
  if (window.navigateTo) {
    window.navigateTo(actionType);
  }
}

function getDefaultMessage() {
  const lang = getLang();
  const defaultMessages = {
    ru: ["Я вижу, как меняется твоё состояние", "Ты сейчас сделал важную вещь для себя", "Давай закрепим это ощущение"],
    en: ["I can see your mood changing", "You just did something important for yourself", "Let's lock in this feeling"],
    es: ["Veo cómo cambia tu estado", "Acabas de hacer algo importante para ti", "Fijemos esta sensación"],
    uk: ["Я бачу, як змінюється твій стан", "Ти зараз зробив важливу річ для себе", "Давай закріпимо це відчуття"]
  };
  const msgs = defaultMessages[lang] || defaultMessages.ru;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function showAvatarHint(mood) {
  const now = Date.now();
  
  if (now - lastSliderReaction < SLIDER_COOLDOWN) return;
  lastSliderReaction = now;
  
  const lang = getLang();
  const msgs = sliderHintMessages[lang] || sliderHintMessages.ru;
  
  let type = 'mid';
  if (mood < 30) type = 'low';
  else if (mood >= 70) type = 'high';
  
  const useText = Math.random() > 0.3;
  const showActions = Math.random() > 0.5;
  
  let actions = null;
  if (showActions && type !== 'mid') {
    const actionMsgs = avatarActions[lang] || avatarActions.ru;
    actions = actionMsgs[type] || null;
  }
  
  if (useText) {
    const typeMsgs = msgs[type] || msgs.mid;
    const text = typeMsgs[Math.floor(Math.random() * typeMsgs.length)];
    showAvatar(text, true, actions);
  } else if (actions) {
    const typeMsgs = msgs[type] || msgs.mid;
    const text = typeMsgs[Math.floor(Math.random() * typeMsgs.length)];
    showAvatar(text, true, actions);
  }
  
  if (mood >= 70) {
    showConfetti();
  } else if (mood < 30) {
    showCloud();
  }
}

export function showAvatarForMood(mood) {
  const previousMood = getLastMood();
  const trend = getTrend(previousMood, mood);
  const type = getMoodType(mood);
  const lang = getLang();
  
  let text;
  
  if (trend !== 'same') {
    const trendMsgs = trendMessages[lang] || trendMessages.ru;
    const trendList = trend === 'up' ? trendMsgs.up : trendMsgs.down;
    text = trendList[Math.floor(Math.random() * trendList.length)];
  } else {
    const messages = moodMessages[lang] || moodMessages.ru;
    const typeMessages = messages[type] || messages.mid;
    text = typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }
  
  showAvatar(text, true);
  
  if (Date.now() - lastEffectTime > EFFECT_COOLDOWN) {
    lastEffectTime = Date.now();
    if (trend === 'up' || type === 'high') showConfetti();
    if (trend === 'down' || type === 'low') showCloud();
  }
}

function showConfetti() {
  const container = document.getElementById('avatar-effects');
  if (!container) return;
  
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 40 + 'px';
    el.style.background = EFFECT_COLORS[Math.floor(Math.random() * EFFECT_COLORS.length)];
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

function showCloud() {
  const container = document.getElementById('avatar-effects');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = 'cloud';
  el.textContent = '☁️';
  container.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function getTapMessage() {
  const lang = getLang();
  const msgs = tapMessages[lang] || tapMessages.ru;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function initAvatarTap() {
  console.log('[AVATAR NEW INIT]');
  
  if (window.__avatarInitialized) {
    console.log('[AVATAR] Already initialized, skipping');
    return;
  }
  window.__avatarInitialized = true;
  
  const oldContainer = document.getElementById('avatar-container');
  if (!oldContainer) {
    console.warn('[AVATAR INIT] Container not found!');
    return;
  }
  
  const rect = oldContainer.getBoundingClientRect();
  console.log('[AVATAR INIT] container rect:', { width: rect.width, height: rect.height, top: rect.top, left: rect.left });
  
  const avatarContainer = oldContainer.cloneNode(true);
  oldContainer.parentNode.replaceChild(avatarContainer, oldContainer);
  console.log('[AVATAR INIT] container cloned, new:', avatarContainer ? 'found' : 'NULL');
  console.log('[EVENT] initAvatarTap - listeners about to be added');
  
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let startX = 0;
  let startY = 0;
  
  // TEMP DISABLED - avatar pointer-events: none
  // avatarContainer.addEventListener('touchstart', (e) => {
  //   console.log('[EVENT] touchstart fired!');
  //   e.preventDefault();
  //   const touch = e.touches[0];
  //   const elRect = avatarContainer.getBoundingClientRect();
  //   console.log('[EVENT] touch pos:', { x: touch.clientX, y: touch.clientY, elRect });
  //   
  //   isDragging = true;
  //   startX = touch.clientX;
  //   startY = touch.clientY;
  //   dragOffsetX = touch.clientX - elRect.left;
  //   dragOffsetY = touch.clientY - elRect.top;
  // }, { passive: false });
  
  // TEMP DISABLED - global listeners blocked UI
  // document.addEventListener('touchmove', (e) => {
  //   if (!isDragging) return;
  //   console.log('[DRAG MOVE NEW]');
  //   
  //   const touch = e.touches[0];
  //   let x = touch.clientX - dragOffsetX;
  //   let y = touch.clientY - dragOffsetY;
  //   
  //   const maxX = window.innerWidth - 60;
  //   const maxY = window.innerHeight - 60;
  //   
  //   x = Math.max(10, Math.min(x, maxX));
  //   y = Math.max(10, Math.min(y, maxY));
  //   
  //   avatarContainer.style.transform = `translate(${x}px, ${y}px)`;
  // }, { passive: false });
  // 
  // document.addEventListener('touchend', (e) => {
  //   if (!isDragging) return;
  //   
  //   const movedX = Math.abs(startX - (e.changedTouches[0]?.clientX || startX));
  //   const movedY = Math.abs(startY - (e.changedTouches[0]?.clientY || startY));
  //   
  //   const rect = avatarContainer.getBoundingClientRect();
  //   const finalX = rect.left;
  //   const finalY = rect.top;
  //   setAvatarState({ position: { x: finalX, y: finalY } });
  //   
  //   if (movedX < 10 && movedY < 10) {
  //     onAvatarTap();
  //   }
  //   
  //   isDragging = false;
  // });
  // 
  // avatarContainer.addEventListener('mousedown', (e) => {
  //   isDragging = true;
  //   startX = e.clientX;
  //   startY = e.clientY;
  //   const rect = avatarContainer.getBoundingClientRect();
  //   dragOffsetX = e.clientX - rect.left;
  //   dragOffsetY = e.clientY - rect.top;
  // });
  // 
  // document.addEventListener('mousemove', (e) => {
  //   if (!isDragging) return;
  //   
  //   let x = e.clientX - dragOffsetX;
  //   let y = e.clientY - dragOffsetY;
  //   
  //   const maxX = window.innerWidth - 60;
  //   const maxY = window.innerHeight - 60;
  //   
  //   x = Math.max(10, Math.min(x, maxX));
  //   y = Math.max(10, Math.min(y, maxY));
  //   
  //   avatarContainer.style.transform = `translate(${x}px, ${y}px)`;
  // });
  // 
  // document.addEventListener('mouseup', () => {
  //   if (isDragging) {
  //     const rect = avatarContainer.getBoundingClientRect();
  //     setAvatarState({ position: { x: rect.left, y: rect.top } });
  //   }
  //   isDragging = false;
  // });
}

function updateBubblePosition(x, y = 0) {
  const bubble = document.getElementById('avatar-bubble');
  if (!bubble) return;
  
  const isRightSide = x > getViewportWidth() / 2;
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

function onAvatarTap() {
  if (window.SystemCore) {
    window.SystemCore.dispatch('AVATAR_TAP');
  } else {
    showAvatar(getTapMessage(), true);
  }
}

function handleAvatarTap() {
  showAvatar(getTapMessage(), true);
}

export function setAvatarEnabled(enabled) {
  avatarEnabled = enabled;
}

export function isAvatarEnabled() {
  return avatarEnabled;
}

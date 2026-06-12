let currentMood = 50;
let lookInterval = null;

// Default brow positions (нейтральные)
const BROW_DEFAULT = {
  left: { x1: 44, y1: 52, x2: 52, y2: 51 },
  right: { x1: 68, y1: 51, x2: 76, y2: 52 }
};

// Worried/sad brow positions (mood < 30) — сводятся к центру, ближе к глазам
const BROW_WORRIED = {
  left: { x1: 45, y1: 53, x2: 50, y2: 53 },
  right: { x1: 70, y1: 53, x2: 75, y2: 53 }
};

// Surprised flash (mood 30-40)
const BROW_SURPRISED = {
  left: { x1: 42, y1: 48, x2: 50, y2: 47 },
  right: { x1: 70, y1: 47, x2: 78, y2: 48 }
};

// Happy brows (high mood)
const BROW_HAPPY = {
  left: { x1: 44, y1: 50, x2: 52, y2: 48 },
  right: { x1: 68, y1: 48, x2: 76, y2: 50 }
};

export function setAvatarMood(value) {
  currentMood = value;
  updateFace();
}

export function avatarReact() {
  const el = document.getElementById('avatarSvg');
  if (!el) return;

  el.classList.add('react');

  setTimeout(() => {
    el.classList.remove('react');
  }, 500);
}

// Reaction to event icons
export function avatarReactToEvent(type) {
  const el = document.getElementById('avatarSvg');
  if (!el) return;

  // Remove any existing event classes
  el.classList.remove('event-coffee', 'event-walk', 'event-work', 'event-sport', 'event-social', 'event-music', 'event-food', 'event-rest', 'event-sleep', 'event-stress');

  switch(type) {
    case 'coffee':
    case 'work':
      el.classList.add('event-coffee');
      break;
    case 'walk':
    case 'rest':
    case 'sleep':
      el.classList.add('event-walk');
      break;
    case 'sport':
    case 'social':
      el.classList.add('event-sport');
      break;
    case 'music':
      el.classList.add('event-coffee');
      break;
    case 'food':
      el.classList.add('event-walk');
      break;
    case 'stress':
      el.classList.add('event-walk');
      break;
    default:
      el.classList.add('react');
  }

  setTimeout(() => {
    el.classList.remove('event-coffee', 'event-walk', 'event-work', 'event-sport', 'event-social', 'event-music', 'event-food', 'event-rest', 'event-sleep', 'event-stress', 'react');
  }, 800);
}

function setBrowPositions(browId, pos) {
  const brow = document.getElementById(browId);
  if (!brow) return;
  // Новый SVG использует path для бровей — обновляем d атрибут
  if (brow.tagName === 'path' || brow.tagName === 'PATH') {
    if (browId === 'browLeft') {
      brow.setAttribute('d', `M${pos.x1},${pos.y1} Q${Math.round((pos.x1+pos.x2)/2)},${pos.y1-1} ${pos.x2},${pos.y2}`);
    } else {
      brow.setAttribute('d', `M${pos.x1},${pos.y1} Q${Math.round((pos.x1+pos.x2)/2)},${pos.y1-1} ${pos.x2},${pos.y2}`);
    }
  } else {
    brow.setAttribute('x1', pos.x1);
    brow.setAttribute('y1', pos.y1);
    brow.setAttribute('x2', pos.x2);
    brow.setAttribute('y2', pos.y2);
  }
}

function animateBrows(target) {
  setBrowPositions('browLeft', target.left);
  setBrowPositions('browRight', target.right);
}

function resetBrows() {
  animateBrows(BROW_DEFAULT);
}

export function startAvatarMicroBehavior() {
  if (lookInterval) return;
  
  lookInterval = setInterval(() => {
    const el = document.getElementById('avatarSvg');
    if (!el) return;

    el.classList.add('avatar-look');

    setTimeout(() => {
      el.classList.remove('avatar-look');
    }, 800);
  }, 6000);
}

export function stopAvatarMicroBehavior() {
  if (lookInterval) {
    clearInterval(lookInterval);
    lookInterval = null;
  }
}

function updateFace() {
  const el = document.getElementById('avatarSvg');
  if (!el) return;

  el.classList.remove(
    'avatar-support',
    'avatar-engaged',
    'avatar-positive',
    'avatar-happy'
  );

  if (currentMood < 30) {
    el.classList.add('avatar-support');
    animateBrows(BROW_WORRIED);
  } else if (currentMood < 40) {
    el.classList.add('avatar-support');
    // Brief surprised flash then worried
    animateBrows(BROW_SURPRISED);
    setTimeout(() => animateBrows(BROW_WORRIED), 400);
  } else if (currentMood < 70) {
    el.classList.add('avatar-engaged');
    resetBrows();
  } else if (currentMood < 90) {
    el.classList.add('avatar-positive');
    animateBrows(BROW_HAPPY);
  } else {
    el.classList.add('avatar-happy');
    animateBrows(BROW_HAPPY);
  }
}

export function initAvatarController() {
  updateFace();
  startAvatarMicroBehavior();
  window.avatarReactToEvent = avatarReactToEvent;
}

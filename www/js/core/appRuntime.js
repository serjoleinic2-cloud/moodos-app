// =====================================
// AppRuntime Layer (ARL)
// Single source of truth + safe render
// =====================================

export const AppRuntime = {
  state: {},
  listeners: {},

  setState(module, newState) {
    this.state[module] = {
      ...(this.state[module] || {}),
      ...newState
    };
    this.emit(module);
  },

  getState(module) {
    return this.state[module] || {};
  },

  subscribe(module, cb) {
    if (!this.listeners[module]) this.listeners[module] = [];
    this.listeners[module].push(cb);
  },

  emit(module) {
    (this.listeners[module] || []).forEach(cb => cb(this.getState(module)));
  },

  initModule(module, initialState = {}) {
    if (!this.state[module]) {
      this.state[module] = initialState;
    }
    return this.getState(module);
  },

  resetModule(module) {
    this.state[module] = {};
    this.emit(module);
  }
};

// =====================================
// Event Delegation Helper
// =====================================

export function createDelegatedHandler(containerSelector, handlers) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.addEventListener('click', (e) => {
    for (const [selector, handler] of Object.entries(handlers)) {
      const target = e.target.closest(selector);
      if (target) {
        handler(e, target);
        return;
      }
    }
  });
}

// =====================================
// Safe Counter Formatter
// =====================================

export function formatCounter(count, max, label = '') {
  return `${label}${count}/${max}`;
}

export function isCounterAtMax(count, max) {
  return count >= max;
}

export function isCounterAtZero(count) {
  return count === 0;
}

// =====================================
// Layout Safety Helpers
// =====================================

export function constrainListHeight(containerSelector, maxHeight = 200) {
  const container = document.querySelector(containerSelector);
  if (container) {
    container.style.maxHeight = `${maxHeight}px`;
    container.style.overflowY = 'auto';
  }
}

export function makeControlsSticky(controlsSelector) {
  const controls = document.querySelector(controlsSelector);
  if (controls) {
    controls.style.position = 'sticky';
    controls.style.bottom = '0';
    controls.style.background = 'inherit';
  }
}

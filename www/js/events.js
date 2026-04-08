// =====================================
// Neyra Events System
// Fixed set of events linked to mood entries
// =====================================

import { AppRuntime } from "./core/appRuntime.js";
import { t } from "./i18n.js";

export const EVENTS = [
  { id: 'coffee', icon: 'coffee.svg', labelKey: 'event_coffee' },
  { id: 'walk',   icon: 'walk.svg',   labelKey: 'event_walk' },
  { id: 'work',   icon: 'work.svg',   labelKey: 'event_work' },
  { id: 'sport',  icon: 'sport.svg',  labelKey: 'event_sport' },
  { id: 'social', icon: 'social.svg', labelKey: 'event_social' },
  { id: 'sleep',  icon: 'sleep.svg',  labelKey: 'event_sleep' },
  { id: 'music',  icon: 'music.svg',  labelKey: 'event_music' },
  { id: 'food',   icon: 'food.svg',   labelKey: 'event_food' },
  { id: 'rest',   icon: 'rest.svg',   labelKey: 'event_rest' },
  { id: 'stress', icon: 'stress.svg', labelKey: 'event_stress' },
];

const MODULE_NAME = 'home';
let eventsClickHandler = null;

export function initEventsModule() {
  AppRuntime.initModule(MODULE_NAME, {
    selectedEvents: []
  });
}

export function getSelectedEvents() {
  return AppRuntime.getState(MODULE_NAME).selectedEvents || [];
}

export function toggleEvent(eventId) {
  const state = AppRuntime.getState(MODULE_NAME);
  const current = state.selectedEvents || [];
  
  let newEvents;
  if (current.includes(eventId)) {
    newEvents = current.filter(e => e !== eventId);
  } else {
    newEvents = [...current, eventId];
  }
  
  AppRuntime.setState(MODULE_NAME, { selectedEvents: newEvents });
  return newEvents;
}

export function clearSelectedEvents() {
  AppRuntime.setState(MODULE_NAME, { selectedEvents: [] });
  updateEventsUI();
}

export function subscribeToEvents(callback) {
  return AppRuntime.subscribe(MODULE_NAME, callback);
}

export function renderEventsGrid(container, onToggle) {
  if (eventsClickHandler) {
    container.removeEventListener('click', eventsClickHandler);
    eventsClickHandler = null;
  }
  
  const selectedEvents = getSelectedEvents();
  
  container.innerHTML = `
    <style>
      #eventsGrid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        margin: 12px -4px;
        width: calc(100% + 8px);
        box-sizing: border-box;
      }

      .event-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 6px 4px;
        border-radius: 10px;
        transition: all 0.15s ease;
        cursor: pointer;
        background: rgba(232, 237, 230, 0.5);
        min-width: 0;
      }

      .event-icon {
        width: 26px;
        height: 26px;
        margin-bottom: 3px;
        filter: grayscale(1);
        opacity: 0.7;
        object-fit: contain;
      }

      .event-label {
        font-size: 9px;
        opacity: 0.7;
        color: #666;
        text-align: center;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .event-item.active {
        background: rgba(76, 175, 135, 0.15);
      }

      .event-item.active .event-icon {
        filter: none;
        opacity: 1;
      }

      .event-item.active .event-label {
        opacity: 1;
        color: #2e7d32;
        font-weight: 600;
      }

      .event-item:active {
        transform: scale(0.95);
      }
    </style>
    <div id="eventsGrid">
      ${EVENTS.map(event => `
        <div class="event-item ${selectedEvents.includes(event.id) ? 'active' : ''}" data-id="${event.id}">
          <img src="assets/icons/${event.icon}" class="event-icon" alt="${t(event.labelKey) || event.id}" />
          <div class="event-label">${t(event.labelKey) || event.id}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  eventsClickHandler = (e) => {
    const item = e.target.closest('.event-item');
    if (!item) return;

    const id = item.dataset.id;
    const state = AppRuntime.getState(MODULE_NAME);
    let selected = [...(state.selectedEvents || [])];

    if (selected.includes(id)) {
      selected = selected.filter(x => x !== id);
      item.classList.remove('active');
    } else {
      selected.push(id);
      item.classList.add('active');
    }

    AppRuntime.setState(MODULE_NAME, { selectedEvents: selected });
    if (onToggle) onToggle(id);
    
    // Also trigger avatar reaction
    if (window.avatarReactToEvent) {
      window.avatarReactToEvent(id);
    }
  };
  
  container.addEventListener('click', eventsClickHandler);
}

export function updateEventsUI() {
  const selectedEvents = getSelectedEvents();
  document.querySelectorAll('.event-item').forEach(item => {
    const id = item.dataset.id;
    if (selectedEvents.includes(id)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

export function cleanupEventsListener(container) {
  if (eventsClickHandler && container) {
    container.removeEventListener('click', eventsClickHandler);
    eventsClickHandler = null;
  }
}

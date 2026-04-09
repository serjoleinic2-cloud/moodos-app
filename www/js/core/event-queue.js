// =====================================
// Neyra Event Queue (TASK 78: Simplified)
// Guaranteed delivery with drain
// =====================================
//
// FLOW: Event → Queue → Process → Done (always drains)
// =====================================

import { executionEngine, ExecutionEvent } from "./state-execution-engine.js";
import { auditLogger, AuditEvent } from "./audit-logger.js";

const LS_EVENT_QUEUE = "neyra_event_queue";
const LS_PROCESSED = "neyra_processed";

class EventQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.processed = this.loadProcessed();
  }

  loadQueue() {
    try {
      const raw = localStorage.getItem(LS_EVENT_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  loadProcessed() {
    try {
      const raw = localStorage.getItem(LS_PROCESSED);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  save() {
    try {
      localStorage.setItem(LS_EVENT_QUEUE, JSON.stringify(this.queue));
      localStorage.setItem(LS_PROCESSED, JSON.stringify(Array.from(this.processed)));
    } catch (e) {}
  }

  enqueue(event) {
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    this.queue.push({ eventId, type: event.type, data: event.data || {} });
    this.save();
    this.drain();
    return { eventId };
  }

  async drain() {
    const MAX_ATTEMPTS = 5;
    
    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      if (this.processed.has(item.eventId)) {
        this.queue.shift();
        this.save();
        continue;
      }

      item.attempts = (item.attempts || 0) + 1;
      
      if (item.attempts > MAX_ATTEMPTS) {
        console.warn('[event-queue] Max attempts exceeded for event:', item.eventId);
        this.processed.add(item.eventId);
        this.queue.shift();
        this.save();
        continue;
      }

      const result = await executionEngine.execute({ type: item.type, data: item.data });
      
      if (result.status === 'committed') {
        this.processed.add(item.eventId);
        this.queue.shift();
        this.save();
      } else if (result.status === 'waiting' || result.status === 'locked') {
        await this.sleep(100);
        continue;
      } else if (result.status === 'failed') {
        this.processed.add(item.eventId);
        this.queue.shift();
        this.save();
        continue;
      } else {
        await this.sleep(50);
        continue;
      }
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recover() {
    this.drain();
    return { queueLength: this.queue.length };
  }

  clear() {
    console.warn('[SECURITY] eventQueue.clear() blocked');
  }
    auditLogger.log(AuditEvent.RECOVERY_COMPLETED, {
      source: 'event-queue',
      details: { action: 'cleared' }
    });
  }
}

export const eventQueue = new EventQueue();

eventQueue.startWatchdog = function() {
  this._watchdogInterval = setInterval(() => {
    if (this.queue.length > 0 && !this._draining) {
      this._draining = true;
      this.drain().finally(() => {
        this._draining = false;
      });
    }
  }, 2000);
};

eventQueue.stopWatchdog = function() {
  if (this._watchdogInterval) {
    clearInterval(this._watchdogInterval);
    this._watchdogInterval = null;
  }
};

eventQueue.startWatchdog();

export function enqueuePremiumChanged() {
  return eventQueue.enqueue({ type: ExecutionEvent.PREMIUM_CHANGED });
}

export function enqueueBillingSync(isPremium) {
  return eventQueue.enqueue({ type: ExecutionEvent.BILLING_SYNC, data: { isPremium } });
}

export function enqueueBillingStateUpdate(premium) {
  return eventQueue.enqueue({ type: ExecutionEvent.BILLING_STATE_UPDATE, data: { premium } });
}

export function recoverEvents() {
  return eventQueue.recover();
}

export function clearEventQueue() {
  eventQueue.clear();
}

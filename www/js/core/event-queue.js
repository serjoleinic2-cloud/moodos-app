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
    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      if (this.processed.has(item.eventId)) {
        this.queue.shift();
        this.save();
        continue;
      }

      const result = await executionEngine.execute({ type: item.type, data: item.data });
      
      if (result.status === 'committed' || result.status === 'failed') {
        this.processed.add(item.eventId);
        this.queue.shift();
        this.save();
      } else if (result.status === 'waiting') {
        // FIX 2: Wait for billing init, retry after short delay
        await this.sleep(100);
      } else {
        break;
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
    this.queue = [];
    this.processed.clear();
    this.save();
    auditLogger.log(AuditEvent.RECOVERY_COMPLETED, {
      source: 'event-queue',
      details: { action: 'cleared' }
    });
  }
}

export const eventQueue = new EventQueue();

export function enqueuePremiumChanged() {
  return eventQueue.enqueue({ type: ExecutionEvent.PREMIUM_CHANGED });
}

export function enqueueBillingSync(isPremium) {
  return eventQueue.enqueue({ type: ExecutionEvent.BILLING_SYNC, data: { isPremium } });
}

export function recoverEvents() {
  return eventQueue.recover();
}

export function clearEventQueue() {
  eventQueue.clear();
}

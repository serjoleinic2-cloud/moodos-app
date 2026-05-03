// =====================================
// Neyra State Execution Engine (TASK 78: Simplified)
// Single entry point for all state changes
// =====================================
//
// PIPELINE: EVENT → VALIDATE → GOVERNANCE → COMMIT
//
// GOLDEN RULE: BILLING ALWAYS WINS
// =====================================

import { auditLogger, AuditEvent } from "./audit-logger.js";

export const ExecutionEvent = {
  PREMIUM_CHANGED: 'PREMIUM_CHANGED',
  BILLING_SYNC: 'BILLING_SYNC',
  BILLING_STATE_UPDATE: 'BILLING_STATE_UPDATE',
  AVATAR_UPDATE: 'AVATAR_UPDATE'
};

export const ExecutionStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMMITTED: 'committed',
  FAILED: 'failed'
};

class StateExecutionEngine {
  constructor() {
    this.status = ExecutionStatus.IDLE;
    this.stateLock = false;
    this.lastCommittedAt = null;
    this.executionCount = 0;
  }

  async execute(event) {
    // FIX 2: Wait-safe mode during billing init
    if (window._billingInitializing) {
      return { status: 'waiting', reason: 'billing_initializing' };
    }

    if (this.stateLock) {
      return { status: 'locked', event };
    }

    this.stateLock = true;
    this.status = ExecutionStatus.RUNNING;

    try {
      if (!event || !event.type) {
        this.unlock();
        return { status: ExecutionStatus.FAILED, reason: 'invalid_event' };
      }

      const result = this.processEvent(event);
      
      this.lastCommittedAt = Date.now();
      this.executionCount++;
      
      auditLogger.log(AuditEvent.FINAL_COMMIT, {
        source: 'execution-engine',
        details: { eventType: event.type, premium: result.isPremium }
      });

      this.unlock();
      return { status: ExecutionStatus.COMMITTED, isPremium: result.isPremium };

    } catch (error) {
      console.error('[EXEC] Error:', error);
      this.unlock();
      return { status: ExecutionStatus.FAILED, error: error.message };
    }
  }

  processEvent(event) {
    let isPremium = false;

    switch (event.type) {
      case ExecutionEvent.PREMIUM_CHANGED:
        isPremium = window.__NEYRA_SECURITY__?.billingPremium === true;
        break;

      case ExecutionEvent.BILLING_SYNC:
        isPremium = event.data?.isPremium ?? false;
        window._trustedSetBillingPremium?.(isPremium);
        break;

      case ExecutionEvent.BILLING_STATE_UPDATE:
        const next = event.data?.premium === true;
        window._trustedSetBillingPremium?.(next);
        isPremium = next;
        break;

      default:
        isPremium = window.__NEYRA_SECURITY__?.billingPremium === true;
    }

    if (window.systemState) {
      window.systemState.premium = isPremium;
    }

    return { isPremium };
  }

  unlock() {
    this.stateLock = false;
    this.status = ExecutionStatus.IDLE;
  }

  getStatus() {
    return {
      status: this.status,
      isLocked: this.stateLock,
      lastCommittedAt: this.lastCommittedAt,
      executionCount: this.executionCount
    };
  }
}

export const executionEngine = new StateExecutionEngine();

export async function runReconciliation() {
  return executionEngine.execute({ type: 'RECONCILE' });
}

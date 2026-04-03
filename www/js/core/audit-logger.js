// =====================================
// Neyra Audit Logger (TASK 78: Simplified)
// Only essential events
// =====================================
//
// ESSENTIAL EVENTS ONLY:
// - PREMIUM_GRANTED / PREMIUM_REVOKED
// - FINAL_COMMIT (from execution engine)
// - RECOVERY_COMPLETED
// =====================================

const LS_AUDIT_LOG = "neyra_audit_log";
const MAX_AUDIT_ENTRIES = 100;

export const AuditEvent = {
  PREMIUM_GRANTED: 'PREMIUM_GRANTED',
  PREMIUM_REVOKED: 'PREMIUM_REVOKED',
  FINAL_COMMIT: 'FINAL_COMMIT',
  RECOVERY_COMPLETED: 'RECOVERY_COMPLETED'
};

class AuditLogger {
  constructor() {
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      const raw = localStorage.getItem(LS_AUDIT_LOG);
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }

  saveLogs() {
    try {
      if (this.logs.length > MAX_AUDIT_ENTRIES) {
        this.logs = this.logs.slice(-MAX_AUDIT_ENTRIES);
      }
      localStorage.setItem(LS_AUDIT_LOG, JSON.stringify(this.logs));
    } catch(e) {
      console.warn('[AUDIT] Failed to save logs:', e);
    }
  }

  log(event, data = {}) {
    const entry = {
      id: this.generateId(),
      event,
      timestamp: Date.now(),
      source: data.source || 'system',
      details: data.details || {}
    };

    this.logs.push(entry);
    this.saveLogs();
    
    return entry;
  }

  generateId() {
    return 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  getLogs(filter = null, limit = 50) {
    let logs = [...this.logs];
    
    if (filter) {
      if (typeof filter === 'string') {
        logs = logs.filter(l => l.event === filter);
      } else if (typeof filter === 'object') {
        logs = logs.filter(l => {
          if (filter.event && l.event !== filter.event) return false;
          if (filter.since && l.timestamp < filter.since) return false;
          return true;
        });
      }
    }
    
    return logs.slice(-limit).reverse();
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }
}

export const auditLogger = new AuditLogger();

export function logPremiumGranted(source, details = {}) {
  return auditLogger.log(AuditEvent.PREMIUM_GRANTED, {
    source,
    details
  });
}

export function logPremiumRevoked(source, details = {}) {
  return auditLogger.log(AuditEvent.PREMIUM_REVOKED, {
    source,
    details
  });
}

// =====================================
// Neyra State Governance
// TASK 78: Simplified - BILLING IS THE ONLY AUTHORITY
// =====================================
//
// GOLDEN RULE: Billing ALWAYS overrides anything else
// No exceptions, no fallbacks
//
// =====================================

class StateGovernance {
  constructor() {
    this.governanceEnabled = true;
  }

  enable() {
    this.governanceEnabled = true;
  }

  resolvePremiumState(billingPremium, localPremium) {
    if (billingPremium !== undefined && billingPremium !== null) {
      return billingPremium;
    }
    return localPremium ?? false;
  }

  reconcile() {
    if (!this.governanceEnabled) return null;
    
    const billingPremium = window.__NEYRA_SECURITY__?.billingPremium ?? false;
    
    return {
      resolvedPremium: billingPremium ?? false,
      billingPremium,
      timestamp: Date.now()
    };
  }
}

export const stateGovernance = new StateGovernance();

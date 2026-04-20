import { activatePremiumPaid, deactivateExpiredPremium, reconcileSystemState, isPremium } from "./user-profile.js";
import { logPremiumGranted, logPremiumRevoked } from "../core/audit-logger.js";
import { enqueueBillingStateUpdate } from "../core/event-queue.js";
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';

let storeReady = false;

export function isStoreReady() {
  return storeReady;
}

export function initBilling() {
  if (window._billingInitialized) return;
  window._billingInitialized = true;
  
  window._billingInitializing = true;
  
  window.store = store;

  store.register([
    { id: "premium_monthly", type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY },
    { id: "premium_yearly", type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY }
  ]);

  store.when("premium_monthly").approved((p) => {
    console.log('[billing] approved:', p.id);
    p.verify();
  });

  store.when("premium_monthly").verified((p) => {
    console.log('[billing] verified:', p.id);
    p.finish();
    activatePremiumPaid(p.id);
    enqueueBillingStateUpdate(true);
    logPremiumGranted('billing_approved', { productId: p.id });
  });

  store.when("premium_monthly").owned((p) => {
    console.log('[billing] owned:', p.id);
    activatePremiumPaid(p.id);
    enqueueBillingStateUpdate(true);
    logPremiumGranted('billing_own', { productId: p.id });
  });

  store.when("premium_monthly").cancelled((p) => {
    console.log('[billing] cancelled:', p.id);
    enqueueBillingStateUpdate(false);
    deactivateExpiredPremium();
    reconcileSystemState();
  });

  store.when("premium_monthly").expired((p) => {
    console.log('[billing] expired:', p.id);
    enqueueBillingStateUpdate(false);
    deactivateExpiredPremium();
    reconcileSystemState();
  });

  store.when("premium_yearly").approved((p) => {
    console.log('[billing] approved:', p.id);
    p.verify();
  });

  store.when("premium_yearly").verified((p) => {
    console.log('[billing] verified:', p.id);
    p.finish();
    activatePremiumPaid(p.id);
    enqueueBillingStateUpdate(true);
    logPremiumGranted('billing_approved', { productId: p.id });
  });

  store.when("premium_yearly").owned((p) => {
    console.log('[billing] owned:', p.id);
    activatePremiumPaid(p.id);
    enqueueBillingStateUpdate(true);
    logPremiumGranted('billing_own', { productId: p.id });
  });

  store.when("premium_yearly").cancelled((p) => {
    console.log('[billing] cancelled:', p.id);
    enqueueBillingStateUpdate(false);
    deactivateExpiredPremium();
    reconcileSystemState();
  });

  store.when("premium_yearly").expired((p) => {
    console.log('[billing] expired:', p.id);
    enqueueBillingStateUpdate(false);
    deactivateExpiredPremium();
    reconcileSystemState();
  });

  store.error((err) => {
    console.error('[billing] error:', err);
  });

  store.initialize()
    .then(() => {
      console.log('[billing] initialized successfully');
      storeReady = true;
      getPremiumFromBilling();
    })
    .catch(err => {
      console.error('[billing] init failed:', err);
    })
    .finally(() => {
      window._billingInitializing = false;
    });
}

export function getPremiumFromBilling() {
  if (!store || !storeReady) return false;
  
  try {
    const monthly = store.get("premium_monthly");
    const yearly = store.get("premium_yearly");
    
    const isPremiumBilling = 
      monthly?.owned || yearly?.owned ||
      monthly?.state === "APPROVED" || yearly?.state === "APPROVED" ||
      monthly?.state === "VALID" || yearly?.state === "VALID";
    
    enqueueBillingStateUpdate(isPremiumBilling);
    return isPremiumBilling;
  } catch(e) {
    console.warn('[billing] getPremiumFromBilling error:', e);
    enqueueBillingStateUpdate(false);
    return false;
  }
}

export async function refreshBilling() {
  if (!store || !storeReady) {
    console.warn('[billing] refresh skipped — store not ready');
    return;
  }
  await store.update();
}

export async function buyMonthly() {
  if (!store || !storeReady) {
    console.warn('[billing] store not ready');
    return;
  }
  await store.order("premium_monthly");
}

export async function buyYearly() {
  if (!store || !storeReady) {
    console.warn('[billing] store not ready');
    return;
  }
  await store.order("premium_yearly");
}

export async function restorePurchases() {
  if (!store) return;
  await store.refresh();
}

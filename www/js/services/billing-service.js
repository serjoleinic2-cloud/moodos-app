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

  store.when()
    .productUpdated((product) => {
      console.log('[billing] product updated:', product.id, product.state);
    })
    .approved(p => {
      console.log('[billing] approved:', p.productId);
      p.finish();
      activatePremiumPaid(p.productId);
      enqueueBillingStateUpdate(true);
      logPremiumGranted('billing_approved', { productId: p.productId });
    })
    .owned(p => {
      console.log('[billing] owned:', p.productId);
      activatePremiumPaid(p.productId);
      enqueueBillingStateUpdate(true);
      logPremiumGranted('billing_own', { productId: p.productId });
    })
    .cancelled(p => {
      console.log('[billing] cancelled:', p.productId);
      enqueueBillingStateUpdate(false);
      deactivateExpiredPremium();
      reconcileSystemState();
    })
    .expired(p => {
      console.log('[billing] expired:', p.productId);
      enqueueBillingStateUpdate(false);
      deactivateExpiredPremium();
      reconcileSystemState();
    })
    .error(err => {
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
  if (!store) return;
  await store.refresh();
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

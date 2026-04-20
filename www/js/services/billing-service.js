import { activatePremiumPaid, deactivateExpiredPremium, reconcileSystemState, isPremium } from "./user-profile.js";
import { logPremiumGranted, logPremiumRevoked } from "../core/audit-logger.js";
import { enqueueBillingStateUpdate } from "../core/event-queue.js";
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';

let storeReady = false;

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
      activatePremiumPaid();
      enqueueBillingStateUpdate(true);
      logPremiumGranted('billing_approved', { productId: p.productId });
    })
    .owned(p => {
      console.log('[billing] owned:', p.productId);
      activatePremiumPaid();
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

async function onPurchaseApproved(order) {
  try {
    if (!order || !order.productId) {
      console.error('[billing] invalid order');
      return;
    }

    const token = order?.transaction?.token || order?.id;

    const verification = await verifyPurchaseWithServer(token);

    if (!verification || verification.valid !== true) {
      console.error('[billing] verification failed');
      return;
    }

    order.finish();
    activatePremiumPaid();
    enqueueBillingStateUpdate(true);
    logPremiumGranted('billing', { productId: order.productId });
  } catch (e) {
    console.error('[billing] approve error', e);
  }
}

export async function verifyPurchaseWithServer(token) {
  console.warn('[billing] server verification not implemented');

  if (!token) {
    return { valid: false };
  }

  return { valid: false };
}

function onOwned(product) {
  activatePremiumPaid();
  enqueueBillingStateUpdate(true);
  logPremiumGranted('billing_own', { productId: product?.id });
}

function onCancelled(product) {
  enqueueBillingStateUpdate(false);
  deactivateExpiredPremium();
  reconcileSystemState();
}

function onExpired(product) {
  enqueueBillingStateUpdate(false);
  deactivateExpiredPremium();
  reconcileSystemState();
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
  if (!store) return;
  await store.order("premium_monthly");
}

export async function buyYearly() {
  if (!store) return;
  await store.order("premium_yearly");
}

export async function restorePurchases() {
  if (!store) return;
  await store.refresh();
}

import { activatePremiumPaid, deactivateExpiredPremium, reconcileSystemState } from "./user-profile.js";
import { logPremiumGranted, logPremiumRevoked } from "../core/audit-logger.js";
import { enqueueBillingStateUpdate } from "../core/event-queue.js";

let storeReady = false;

export function initBilling() {
  // FIX 2: Guard flag for timing risk
  window._billingInitializing = true;
  
  if (!window.store) {
    console.warn('[billing] not available');
    window._billingInitializing = false;
    return;
  }

  const store = window.store;

  store.register([
    { id: "premium_monthly", type: store.PAID_SUBSCRIPTION },
    { id: "premium_yearly", type: store.PAID_SUBSCRIPTION }
  ]);

  store.when("premium_monthly").approved(onPurchaseApproved);
  store.when("premium_yearly").approved(onPurchaseApproved);
  store.when("premium_monthly").owned(onOwned);
  store.when("premium_yearly").owned(onOwned);
  store.when("premium_monthly").cancelled(onCancelled);
  store.when("premium_yearly").cancelled(onCancelled);
  store.when("premium_monthly").expired(onExpired);
  store.when("premium_yearly").onExpired(onExpired);

  store.error(function(err) {
    console.error('[billing] error:', err);
  });

  store.refresh();
  storeReady = true;
  
  // FIX 2: Set flag to false after initial sync
  getPremiumFromBilling();
  window._billingInitializing = false;
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

  return { valid: true }; // MVP fallback
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
  if (!window.store || !storeReady) return false;
  
  try {
    const monthly = window.store.get("premium_monthly");
    const yearly = window.store.get("premium_yearly");
    
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

export function refreshBilling() {
  if (!window.store) return;
  window.store.refresh();
}

export function buyMonthly() {
  if (!window.store) return;
  window.store.order("premium_monthly");
}

export function buyYearly() {
  if (!window.store) return;
  window.store.order("premium_yearly");
}

export function restorePurchases() {
  if (!window.store) return;
  window.store.refresh();
}

export async function verifyPurchaseWithServer(token) {
  // TODO: POST /verify
  return { valid: true };
}

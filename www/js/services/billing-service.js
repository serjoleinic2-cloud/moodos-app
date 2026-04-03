import { activatePremiumPaid, deactivateExpiredPremium, reconcileSystemState, setBillingPremium } from "./user-profile.js";

let storeReady = false;

export function initBilling() {
  if (!window.store) {
    console.warn('[billing] not available');
    return;
  }

  const store = window.store;

  store.register([
    {
      id: "premium_monthly",
      type: store.PAID_SUBSCRIPTION
    },
    {
      id: "premium_yearly",
      type: store.PAID_SUBSCRIPTION
    }
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
  
  setTimeout(() => getPremiumFromBilling(), 1000);
}

function onPurchaseApproved(order) {
  try {
    order.finish();
    activatePremiumPaid();
  } catch (e) {
    console.error('[billing] approve error', e);
  }
}

function onOwned(product) {
  activatePremiumPaid();
}

function onCancelled(product) {
  console.log('[billing] subscription cancelled:', product?.id);
  deactivateExpiredPremium();
  reconcileSystemState();
}

function onExpired(product) {
  console.log('[billing] subscription expired:', product?.id);
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
    
    setBillingPremium(isPremiumBilling);
    return isPremiumBilling;
  } catch(e) {
    console.warn('[billing] getPremiumFromBilling error:', e);
    setBillingPremium(false);
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

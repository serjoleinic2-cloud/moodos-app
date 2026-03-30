import { activatePremiumPaid } from "./user-profile.js";

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

  store.error(function(err) {
    console.error('[billing] error:', err);
  });

  store.refresh();
  storeReady = true;
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

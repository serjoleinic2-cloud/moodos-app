import { t } from "../i18n.js";
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
      console.log('[billing] product updated:', product.id);
    })
    .approved((transaction) => {
      console.log('[billing] approved:', transaction.products[0]?.id);
      transaction.finish();
      const productId = transaction.products[0]?.id;
      if (productId) {
        activatePremiumPaid(productId);
        enqueueBillingStateUpdate(true);
        logPremiumGranted('billing_approved', { productId });
      }
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
    const isPremiumBilling = store.owned(monthly) || store.owned(yearly);
    enqueueBillingStateUpdate(!!isPremiumBilling);
    return !!isPremiumBilling;
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
  const product = store.get("premium_monthly", Platform.GOOGLE_PLAY);
  if (!product) {
    console.warn('[billing] product premium_monthly not found');
    alert(t('billing_product_not_ready') || 'Платёжная система загружается. Попробуйте через несколько секунд.');
    return;
  }
  const offer = product.getOffer();
  if (!offer) {
    console.warn('[billing] no offer for premium_monthly');
    return;
  }
  const error = await offer.order();
  if (error) {
    console.error('[billing] order error:', error);
  }
}

export async function buyYearly() {
  if (!store || !storeReady) {
    console.warn('[billing] store not ready');
    return;
  }
  const product = store.get("premium_yearly", Platform.GOOGLE_PLAY);
  if (!product) {
    console.warn('[billing] product premium_yearly not found');
    alert(t('billing_product_not_ready') || 'Платёжная система загружается. Попробуйте через несколько секунд.');
    return;
  }
  const offer = product.getOffer();
  if (!offer) {
    console.warn('[billing] no offer for premium_yearly');
    return;
  }
  const error = await offer.order();
  if (error) {
    console.error('[billing] order error:', error);
  }
}

export async function restorePurchases() {
  if (!store) return;
  await store.refresh();
}

export function activatePremiumForTesting(plan = "premium_monthly") {
  if (import.meta.env.DEV) {
    console.warn('[billing] DEV MODE — activating premium locally');
    activatePremiumPaid(plan);
    enqueueBillingStateUpdate(true);
  }
}

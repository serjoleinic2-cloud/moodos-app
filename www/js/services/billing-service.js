import { t } from "../i18n.js";
import { activatePremiumPaid, deactivateExpiredPremium, reconcileSystemState, isPremium, restorePremiumFromProfile, getProfile } from "./user-profile.js";
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
  
  try {
    const profile = getProfile();
    if (profile?.premium_type === 'paid' && profile?.premiumExpiresAt > Date.now()) {
      window._trustedSetBillingPremium?.(true);
      if (window.systemState) window.systemState.premium = true;
    }
  } catch(e) {}
  
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
      const productId = transaction.products?.[0]?.id;
      if (productId) {
        // Активируем без проверки store.owned() — approved = Google подтвердил
        activatePremiumPaid(productId);
        window._trustedSetBillingPremium?.(true);
        if (window.systemState) window.systemState.premium = true;
        enqueueBillingStateUpdate(true);
        logPremiumGranted('billing_approved', { productId });
        console.log('[billing] premium activated via approved:', productId);
      }
      transaction.finish();
    })
    .verified((receipt) => {
      console.log('[billing] verified');
      const productId = receipt.transactions?.[0]?.products?.[0]?.id;
      if (productId) {
        activatePremiumPaid(productId);
        window._trustedSetBillingPremium?.(true);
        if (window.systemState) window.systemState.premium = true;
        enqueueBillingStateUpdate(true);
        logPremiumGranted('billing_verified', { productId });
      }
      receipt.finish();
    })
    .expired((product) => {
      console.log('[billing] subscription expired:', product.id);
      const monthly = store.get('premium_monthly');
      const yearly  = store.get('premium_yearly');
      const stillOwned = (monthly && store.owned(monthly)) || (yearly && store.owned(yearly));
      if (!stillOwned) {
        console.warn('[billing] confirmed expired — deactivating premium');
        deactivateExpiredPremium();
        window._trustedSetBillingPremium?.(false);
        if (window.systemState) window.systemState.premium = false;
        enqueueBillingStateUpdate(false);
        logPremiumRevoked('billing_expired', { productId: product.id });
      }
    });

  store.error((err) => {
    console.error('[billing] error:', err);
  });

  store.initialize()
      .then(async () => {
        console.log('[billing] initialized successfully');
        storeReady = true;
        restorePremiumFromProfile();
        try {
          // update() триггерит .approved() для всех активных подписок
          await store.update();
          console.log('[billing] update complete');
        } catch(e) {
          console.warn('[billing] update failed:', e);
        }
        // restorePurchases() нужен только если пользователь явно нажал "восстановить"
        // или если update() не вернул покупки (смена устройства/чистка данных)
        const monthly = store.get('premium_monthly');
        const yearly  = store.get('premium_yearly');
        const alreadyOwned = (monthly && store.owned(monthly)) || (yearly && store.owned(yearly));
        if (!alreadyOwned) {
          console.log('[billing] not owned after update — trying restorePurchases');
          try {
            await store.restorePurchases();
          } catch(e) {
            console.warn('[billing] restorePurchases failed:', e);
          }
        }
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

    if (isPremiumBilling) {
      enqueueBillingStateUpdate(true);
      return true;
    }

    const profile = getProfile();
    const profileHasValid = profile?.premium_type === 'paid' && profile?.premiumExpiresAt > Date.now();
    if (profileHasValid) {
      console.warn('[billing] store.owned()=false but profile has valid expiry — trusting profile');
      return true;
    }
    if (profile?.premium_type === 'paid' && profile?.premiumExpiresAt <= Date.now()) {
      console.warn('[billing] profile premium expired — deactivating');
      deactivateExpiredPremium();
    }

    return false;
  } catch(e) {
    console.warn('[billing] getPremiumFromBilling error:', e);
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
  if (!store || !storeReady) return;
  try {
    await store.restorePurchases();
  } catch(e) {
    console.warn('[billing] restorePurchases error:', e);
  }
}

export function activatePremiumForTesting(plan = "premium_monthly") {
  if (import.meta.env.DEV) {
    console.warn('[billing] DEV MODE — activating premium locally');
    activatePremiumPaid(plan);
    enqueueBillingStateUpdate(true);
  }
}

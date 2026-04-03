// =====================================
// Neyra User Profile Service
// Профиль юзера — база для калибровки
// =====================================

const PROFILE_KEY      = "user_profile";
const ONBOARDING_KEY   = "onboarding_done";
const MED_REMINDER_KEY = "med_reminder";
const MED_CHECK_KEY    = "med_monthly_check";

// ---- ПРОФИЛЬ ----

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
  } catch(e) {
    console.warn('[user-profile] getProfile parse error:', e);
    return null;
  }
}

export function saveProfile(profile) {
  profile.updatedAt = Date.now();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch(e) {
    console.error('[user-profile] saveProfile failed (quota?):', e);
  }
}

export function isOnboardingDone() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

// ---- БАЗОВЫЙ УРОВЕНЬ НАСТРОЕНИЯ ----
// Если юзер на седативных — его "норма" ниже
// Используется во всех расчётах как offset

export function getMoodBaseline() {
  const profile = getProfile();
  if (!profile) return 50;

  // Если принимает седативные или антидепрессанты в адаптации
  if (profile.medEffect === "приглушённость") return 38;
  if (profile.medEffect === "адаптация")      return 42;
  if (profile.medEffect === "побочки")         return 40;

  // По базовому состоянию при регистрации
  if (profile.baseFeeling === "непростой_период") return 35;
  if (profile.baseFeeling === "трудные_дни")      return 42;
  if (profile.baseFeeling === "хорошо")           return 58;

  return 50;
}

// ---- КОНТЕКСТ ДЛЯ ОБЪЯСНЕНИЙ ----
// Возвращает строку-подсказку для insight-engine

export function getMedContext() {
  const profile = getProfile();
  if (!profile || !profile.takesMeds || profile.takesMeds === "нет") return null;

  const contexts = {
    "приглушённость": "Возможно это связано с эффектом препарата — ощущение приглушённости может быть нормой в твоём случае",
    "адаптация":      "Организм ещё адаптируется к препарату — перепады настроения в этот период естественны",
    "побочки":        "Некоторые симптомы могут быть побочным эффектом — стоит обсудить это с врачом",
    "лучше":          "Препарат помогает — продолжай отслеживать как ты себя чувствуешь",
    "примерно_так_же": null,
  };

  return contexts[profile.medEffect] || null;
}

// ---- НАПОМИНАЛКА О ТАБЛЕТКАХ ----

export function getMedReminder() {
  return JSON.parse(localStorage.getItem(MED_REMINDER_KEY)) || null;
}

export function saveMedReminder(time) {
  localStorage.setItem(MED_REMINDER_KEY, JSON.stringify({ time, active: true }));
}

export function removeMedReminder() {
  localStorage.removeItem(MED_REMINDER_KEY);
}

// ---- ЕЖЕМЕСЯЧНАЯ ПРОВЕРКА ----
// Показывать ли мягкий чек "всё ещё принимаешь?"

export function shouldShowMonthlyCheck() {
  const profile = getProfile();
  if (!profile || !profile.takesMeds || profile.takesMeds === "нет") return false;

  const lastCheck = localStorage.getItem(MED_CHECK_KEY);
  if (!lastCheck) return true;

  const daysSince = (Date.now() - Number(lastCheck)) / (1000 * 60 * 60 * 24);
  return daysSince >= 30;
}

export function markMonthlyCheckDone() {
  localStorage.setItem(MED_CHECK_KEY, String(Date.now()));
}

// ---- PREMIUM ----

const PREMIUM_KEY = "premium_status";
const GEMINI_COUNTER_KEY = "gemini_daily_counter";
const GEMINI_COUNTER_DATE_KEY = "gemini_counter_date";
const FREE_GEMINI_LIMIT = 5;

export function getPremiumStatus() {
  const profile = getProfile();
  if (!profile) return "free";
  if (profile.premium_type === "paid") return "paid";
  if (profile.isPremium) return "premium";
  if (profile.premiumTrial?.active) {
    const startDate = new Date(profile.premiumTrial.startDate);
    const trialEnd = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Date.now() <= trialEnd.getTime()) return "trial";
    return "free";
  }
  return "free";
}

export function getPremiumInfo() {
  const profile = getProfile();
  const status = getPremiumStatus();
  let trialDaysLeft = 0;
  let trialEndDate = null;
  let plan = null;
  let expiresAt = null;
  let isExpired = false;
  
  if (status === "trial" && profile?.premiumTrial?.startDate) {
    const startDate = new Date(profile.premiumTrial.startDate);
    const trialEnd = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    trialEndDate = trialEnd;
    expiresAt = trialEnd;
    const msLeft = trialEnd.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    plan = "trial";
  } else if (status === "premium") {
    plan = profile.premiumPlan || "monthly";
    expiresAt = profile.premiumExpiresAt ? new Date(profile.premiumExpiresAt) : null;
    if (expiresAt && Date.now() > expiresAt.getTime()) {
      isExpired = true;
    }
  } else if (status === "paid") {
    plan = profile.premiumPlan || "monthly";
  }
  
  return {
    status,
    trialDaysLeft,
    trialEndDate,
    plan,
    expiresAt,
    isExpired,
    isPremium: (status === "premium" && !isExpired) || status === "trial" || status === "paid"
  };
}

export function isPremium() {
  return getPremiumInfo().isPremium;
}

export function activateTrial() {
  const profile = getProfile() || {};
  if (profile.premium_type === "paid") return;
  profile.premiumTrial = {
    active: true,
    startDate: new Date().toISOString()
  };
  saveProfile(profile);
  if (window.systemState) {
    window.systemState.premium = true;
  }
  document.dispatchEvent(new CustomEvent('premiumChanged', { detail: { status: 'trial' } }));
}

export function activatePremiumPaid() {
  try {
    const profile = getProfile() || {};

    profile.premium = true;
    profile.premium_type = "paid";
    profile.premium_since = Date.now();

    saveProfile(profile);

    window.systemState.premium = true;

    document.dispatchEvent(new Event("premiumChanged"));
  } catch (e) {
    console.error('[premium] activation failed', e);
  }
}

export function activatePremium(plan = "monthly") {
  const profile = getProfile() || {};
  const durationMs = plan === "yearly" ? 365 : 30;
  const expiresAt = new Date(Date.now() + durationMs * 24 * 60 * 60 * 1000);
  
  profile.isPremium = true;
  profile.premiumTrial = { active: false };
  profile.premiumPlan = plan;
  profile.premiumExpiresAt = expiresAt.getTime();
  saveProfile(profile);
  if (window.systemState) {
    window.systemState.premium = true;
  }
  document.dispatchEvent(new CustomEvent('premiumChanged', { detail: { status: 'premium', plan } }));
}

export function getGeminiCounter() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem(GEMINI_COUNTER_DATE_KEY);
  
  if (savedDate !== today) {
    localStorage.setItem(GEMINI_COUNTER_DATE_KEY, today);
    localStorage.setItem(GEMINI_COUNTER_KEY, "0");
    return 0;
  }
  
  return parseInt(localStorage.getItem(GEMINI_COUNTER_KEY) || "0");
}

export function incrementGeminiCounter() {
  const count = getGeminiCounter() + 1;
  localStorage.setItem(GEMINI_COUNTER_KEY, String(count));
  return count;
}

export function canMakeGeminiRequest() {
  if (isPremium()) return { allowed: true, remaining: Infinity };
  
  const used = getGeminiCounter();
  const remaining = Math.max(0, FREE_GEMINI_LIMIT - used);
  
  return {
    allowed: remaining > 0,
    used,
    remaining,
    limit: FREE_GEMINI_LIMIT
  };
}

export function checkPremiumExpiry() {
  const info = getPremiumInfo();
  return info.isExpired;
}

export function deactivateExpiredPremium() {
  const info = getPremiumInfo();
  if (info.isExpired) {
    const profile = getProfile() || {};
    profile.isPremium = false;
    profile.premiumExpiresAt = null;
    saveProfile(profile);
    localStorage.removeItem('med_custom_tracks');
    return true;
  }
  return false;
}

// ---- ТЕМА ----

export function getTheme() {
  const profile = getProfile();
  return profile?.colorTheme || "default";
}

export function saveTheme(theme) {
  const profile = getProfile() || {};
  profile.colorTheme = theme;
  saveProfile(profile);
}

export function setTheme(theme) {
  const profile = getProfile() || {};
  profile.colorTheme = theme;
  saveProfile(profile);
  applyTheme(theme);
  document.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
}

export function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}

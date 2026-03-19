// =====================================
// MoodOS User Profile Service
// =====================================

const PROFILE_KEY      = "user_profile";
const ONBOARDING_KEY   = "onboarding_done";
const MED_REMINDER_KEY = "med_reminder";
const MED_CHECK_KEY    = "med_monthly_check";

function safeParse(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Corrupted:", key);
    localStorage.removeItem(key);
    return fallback;
  }
}

export function getProfile() {
  return safeParse(PROFILE_KEY, null);
}

export function saveProfile(profile) {
  profile.updatedAt = Date.now();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isOnboardingDone() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function getMoodBaseline() {
  const profile = getProfile();
  if (!profile) return 50;
  if (profile.medEffect === "приглушённость") return 38;
  if (profile.medEffect === "адаптация")      return 42;
  if (profile.medEffect === "побочки")         return 40;
  if (profile.baseFeeling === "непростой_период") return 35;
  if (profile.baseFeeling === "трудные_дни")      return 42;
  if (profile.baseFeeling === "хорошо")           return 58;
  return 50;
}

export function getMedContext() {
  const profile = getProfile();
  if (!profile || !profile.takesMeds || profile.takesMeds === "нет") return null;
  const contexts = {
    "приглушённость": "Возможно это связано с эффектом препарата",
    "адаптация":      "Организм ещё адаптируется к препарату",
    "побочки":        "Некоторые симптомы могут быть побочным эффектом",
    "лучше":          "Препарат помогает — продолжай отслеживать",
    "примерно_так_же": null,
  };
  return contexts[profile.medEffect] || null;
}

export function getMedReminder() {
  return safeParse(MED_REMINDER_KEY, null);
}

export function saveMedReminder(time) {
  localStorage.setItem(MED_REMINDER_KEY, JSON.stringify({ time, active: true }));
}

export function removeMedReminder() {
  localStorage.removeItem(MED_REMINDER_KEY);
}

export function shouldShowMonthlyCheck() {
  const profile = getProfile();
  if (!profile || !profile.takesMeds || profile.takesMeds === "нет") return false;
  const lastCheck = localStorage.getItem(MED_CHECK_KEY);
  if (!lastCheck) return true;
  return (Date.now() - Number(lastCheck)) / 86400000 >= 30;
}

export function markMonthlyCheckDone() {
  localStorage.setItem(MED_CHECK_KEY, String(Date.now()));
}

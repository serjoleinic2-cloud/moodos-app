// =====================================
// MoodOS User Profile Service
// Профиль юзера — база для калибровки
// =====================================

const PROFILE_KEY      = "user_profile";
const ONBOARDING_KEY   = "onboarding_done";
const MED_REMINDER_KEY = "med_reminder";
const MED_CHECK_KEY    = "med_monthly_check";

// ---- ПРОФИЛЬ ----

export function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
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

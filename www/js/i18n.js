// =====================================
// Neyra i18n — index
// =====================================
import { ru } from "./i18n/ru.js";
import { en } from "./i18n/en.js";
import { es } from "./i18n/es.js";
import { uk } from "./i18n/uk.js";
import { hi } from "./i18n/hi.js";

const LANG_KEY = "app_language";

let CURRENT_LANG = null;

export function getLang() {
  if (CURRENT_LANG !== null) return CURRENT_LANG;
  const stored = localStorage.getItem(LANG_KEY);
  if (stored) {
    CURRENT_LANG = stored;
    return CURRENT_LANG;
  }
  return stored || "en";
}

export function setLang(lang) {
  CURRENT_LANG = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.dispatchEvent(new CustomEvent('languageChanged'));
}

const TRANSLATIONS = { ru, en, es, uk, hi };

export function t(key) {
  const lang = getLang();
  const translations = TRANSLATIONS[lang];
  if (translations && translations[key]) {
    return translations[key];
  }
  const enTranslations = TRANSLATIONS["en"];
  if (enTranslations && enTranslations[key]) {
    return enTranslations[key];
  }
  console.warn(`[i18n] Missing key: ${key}`);
  return key;
}

export function tSafe(key, fallback = "") {
  const lang = getLang();
  const result = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS["en"]?.[key];
  if (result === undefined || result === "") return fallback;
  return result;
}

export function getDaysLabel(days) {
  const lang = getLang();
  if (lang === "ru" || lang === "uk") {
    if (days === 1) return t("days_together_1");
    if (days >= 2 && days <= 4) return t("days_together_2");
    return t("days_together_5");
  }
  return days === 1 ? t("days_together_1") : t("days_together_2");
}

export const LANG_OPTIONS = [
  { code: "ru", label: "Русский",    flag: "🇷🇺" },
  { code: "en", label: "English",    flag: "🇺🇸" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "hi", label: "हिन्दी",      flag: "🇮🇳" },
];

window._i18nReady = true;

// =====================================
// Neyra i18n — index
// =====================================
import { ru } from "./i18n/ru.js";
import { en } from "./i18n/en.js";
import { es } from "./i18n/es.js";
import { uk } from "./i18n/uk.js";

const LANG_KEY = "app_language";

export function getLang() {
  return localStorage.getItem(LANG_KEY) || "ru";
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.dispatchEvent(new CustomEvent('languageChanged'));
}

const TRANSLATIONS = { ru, en, es, uk };

export function t(key) {
  const lang = getLang();
  const translations = TRANSLATIONS[lang] || TRANSLATIONS["ru"];
  return translations?.[key] || key;
}

export function tSafe(key, fallback = "") {
  const lang = getLang();
  const result = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS["ru"]?.[key];
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
];

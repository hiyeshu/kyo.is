import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "./locales/en/translation.json";
import zhCNTranslation from "./locales/zh-CN/translation.json";
import zhTWTranslation from "./locales/zh-TW/translation.json";
import jaTranslation from "./locales/ja/translation.json";
import koTranslation from "./locales/ko/translation.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  "zh-CN": {
    translation: zhCNTranslation,
  },
  "zh-TW": {
    translation: zhTWTranslation,
  },
  ja: {
    translation: jaTranslation,
  },
  ko: {
    translation: koTranslation,
  },
};

export const SUPPORTED_LANGUAGES = ["en", "zh-CN", "zh-TW", "ja", "ko"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Maps a browser locale to our supported languages with fuzzy matching.
 * Examples:
 * - zh, zh-Hans, zh-CN, zh-Hans-CN, zh-Hant, zh-Hant-TW -> zh-TW
 * - ja, ja-JP -> ja
 * - ko, ko-KR -> ko
 * - fr, fr-FR, fr-CA -> fr
 * - de, de-DE, de-AT, de-CH -> de
 * - es, es-ES, es-MX, es-AR -> es
 * - pt, pt-BR, pt-PT -> pt
 * - it, it-IT -> it
 * - ru, ru-RU -> ru
 * - en, en-US, en-GB -> en
 */
export const detectLanguageFromLocale = (locale: string): SupportedLanguage | null => {
  const normalizedLocale = locale.toLowerCase();
  
  // Exact match first (case-insensitive)
  const exactMatch = SUPPORTED_LANGUAGES.find(
    lang => lang.toLowerCase() === normalizedLocale
  );
  if (exactMatch) return exactMatch;
  
  // Extract language code (first part before hyphen)
  const langCode = normalizedLocale.split("-")[0];
  
  // Special case: Chinese variants
  // zh-Hans, zh-CN, zh-SG → 简体中文
  // zh-Hant, zh-TW, zh-HK, zh-MO → 繁体中文
  if (langCode === "zh") {
    const lowerLocale = normalizedLocale.toLowerCase();
    if (lowerLocale.includes("hant") || lowerLocale.includes("tw") || 
        lowerLocale.includes("hk") || lowerLocale.includes("mo")) {
      return "zh-TW";
    }
    return "zh-CN"; // 默认简体中文
  }
  
  // Check if language code matches any supported language
  const langMatch = SUPPORTED_LANGUAGES.find(
    lang => lang.toLowerCase() === langCode || lang.toLowerCase().startsWith(langCode + "-")
  );
  if (langMatch) return langMatch;
  
  return null;
};

/**
 * Auto-detects the best matching language from browser settings.
 * Checks navigator.languages (array of preferred languages) for fuzzy matches.
 */
export const autoDetectLanguage = (): SupportedLanguage => {
  // Get browser's preferred languages
  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const browserLang of browserLanguages) {
    const matched = detectLanguageFromLocale(browserLang);
    if (matched) {
      return matched;
    }
  }
  
  return "zh-CN"; // 默认简体中文
};

// Storage keys
const LANGUAGE_KEY = "ryos:language";
const LANGUAGE_INITIALIZED_KEY = "ryos:language-initialized";
const LEGACY_LANGUAGE_KEY = "ryos_language";
const LEGACY_LANGUAGE_INITIALIZED_KEY = "ryos_language_initialized";

// Get initial language from localStorage, or auto-detect on first initialization
const getInitialLanguage = (): string => {
  // Try new keys first, fall back to legacy
  let saved = localStorage.getItem(LANGUAGE_KEY);
  let isInitialized = localStorage.getItem(LANGUAGE_INITIALIZED_KEY);

  // Check legacy keys if new ones don't exist
  if (!saved) {
    const legacySaved = localStorage.getItem(LEGACY_LANGUAGE_KEY);
    if (legacySaved) {
      saved = legacySaved;
      // Migrate to new key
      localStorage.setItem(LANGUAGE_KEY, saved);
      localStorage.removeItem(LEGACY_LANGUAGE_KEY);
    }
  }
  if (!isInitialized) {
    const legacyInitialized = localStorage.getItem(LEGACY_LANGUAGE_INITIALIZED_KEY);
    if (legacyInitialized) {
      isInitialized = legacyInitialized;
      // Migrate to new key
      localStorage.setItem(LANGUAGE_INITIALIZED_KEY, isInitialized);
      localStorage.removeItem(LEGACY_LANGUAGE_INITIALIZED_KEY);
    }
  }
  
  // If user has previously set a language, use it
  if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
    return saved;
  }
  
  // If this is first initialization, auto-detect
  if (!isInitialized) {
    const detectedLanguage = autoDetectLanguage();
    // Store the detected language and mark as initialized
    localStorage.setItem(LANGUAGE_KEY, detectedLanguage);
    localStorage.setItem(LANGUAGE_INITIALIZED_KEY, "true");
    return detectedLanguage;
  }
  
  return "zh-CN";
};

const initialLanguage = getInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    defaultNS: "translation",
    ns: ["translation"],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "ryos_language",
      caches: ["localStorage"],
    },
  });

// Set initial HTML lang attribute for CSS :lang() selectors
document.documentElement.lang = initialLanguage;

// ═══════════════════════════════════════════════════════════════════════════════
// 语言标签 - 单一真相源，用于 UI 显示
// ═══════════════════════════════════════════════════════════════════════════════

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 语言切换 - 同时更新 i18n、localStorage、HTML lang 属性
// ═══════════════════════════════════════════════════════════════════════════════

export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
};

export default i18n;


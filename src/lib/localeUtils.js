/**
 * Multilingual localization helpers for The Best Idea Eatery
 * Designed to support BG, EN, and ready for IT, FR, DE and beyond.
 */

export const SUPPORTED_LANGUAGES = ['bg', 'en', 'it', 'fr', 'de'];

export const LANGUAGE_LABELS = {
  bg: { name: 'Български', flag: '🇧🇬' },
  en: { name: 'English', flag: '🇬🇧' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  fr: { name: 'Français', flag: '🇫🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' }
};

/**
 * Returns localized string from a field that can be either:
 * - A multilingual map: { bg: '...', en: '...', it: '...' }
 * - A plain string
 * 
 * @param {Object|string} value - Map of translations or direct string
 * @param {string} lang - Desired language code (e.g. 'bg', 'en')
 * @param {string} fallbackLang - Fallback language code (default 'en')
 * @returns {string}
 */
export const getLocalizedText = (value, lang = 'bg', fallbackLang = 'en') => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[lang] || value[fallbackLang] || value['bg'] || Object.values(value).find(Boolean) || '';
  }
  return String(value);
};

/**
 * Retrieves a localized field from an object supporting both:
 * - Map field: obj[fieldName] = { bg: '...', en: '...' }
 * - Flat fields: obj[`${fieldName}_${lang}`] (e.g. obj.title_bg, obj.title_en)
 * 
 * @param {Object} obj - Target entity
 * @param {string} fieldName - Base field name (e.g. 'title', 'description', 'notes', 'name')
 * @param {string} lang - Desired language code
 * @param {string} fallbackLang - Fallback language code
 * @returns {string}
 */
export const getLocalizedField = (obj, fieldName, lang = 'bg', fallbackLang = 'en') => {
  if (!obj) return '';

  // 1. Check if obj[fieldName] is a multilingual map
  if (obj[fieldName] && typeof obj[fieldName] === 'object') {
    const fromMap = getLocalizedText(obj[fieldName], lang, fallbackLang);
    if (fromMap) return fromMap;
  }

  // 2. Check flat localized properties: obj.title_bg, obj.title_en, etc.
  if (obj[`${fieldName}_${lang}`]) return obj[`${fieldName}_${lang}`];
  if (obj[`${fieldName}_${fallbackLang}`]) return obj[`${fieldName}_${fallbackLang}`];
  if (obj[`${fieldName}_bg`]) return obj[`${fieldName}_bg`];
  if (obj[`${fieldName}_en`]) return obj[`${fieldName}_en`];

  // 3. Fallback to direct string property if exists
  if (typeof obj[fieldName] === 'string') return obj[fieldName];

  return '';
};

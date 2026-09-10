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
  if (typeof value === 'string') {
    return value === '[object Object]' ? '' : value;
  }
  if (typeof value === 'object') {
    const candidate = value[lang] || value[fallbackLang] || value['bg'] || Object.values(value).find(v => typeof v === 'string' && v && v !== '[object Object]') || '';
    if (typeof candidate === 'string') {
      return candidate === '[object Object]' ? '' : candidate;
    }
    return '';
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
  const checkFlat = (val) => {
    if (typeof val === 'string' && val !== '[object Object]') return val;
    if (val && typeof val === 'object') return getLocalizedText(val, lang, fallbackLang);
    return '';
  };

  const fLang = checkFlat(obj[`${fieldName}_${lang}`]);
  if (fLang) return fLang;
  const fFallback = checkFlat(obj[`${fieldName}_${fallbackLang}`]);
  if (fFallback) return fFallback;
  const fBg = checkFlat(obj[`${fieldName}_bg`]);
  if (fBg) return fBg;
  const fEn = checkFlat(obj[`${fieldName}_en`]);
  if (fEn) return fEn;

  // 3. Fallback to direct string property if exists
  if (typeof obj[fieldName] === 'string' && obj[fieldName] !== '[object Object]') return obj[fieldName];

  return '';
};

/**
 * Safely extracts a note string for a specific language from an ingredient or object,
 * guarding against objects, undefined values, or '[object Object]' strings.
 * 
 * @param {string|Object} noteVal - Direct note property (e.g. ing.notes_bg)
 * @param {string|Object} notesObj - Object note map (e.g. ing.notes)
 * @param {string} lang - Language code ('bg', 'en', etc.)
 * @returns {string}
 */
export const extractLocalizedNote = (noteVal, notesObj, lang = 'bg') => {
  if (typeof noteVal === 'string') {
    return noteVal === '[object Object]' ? '' : noteVal;
  }
  if (noteVal && typeof noteVal === 'object') {
    const fromVal = noteVal[lang] || '';
    if (typeof fromVal === 'string' && fromVal !== '[object Object]') return fromVal;
  }
  if (notesObj) {
    if (typeof notesObj === 'string' && notesObj !== '[object Object]') return notesObj;
    if (typeof notesObj === 'object') {
      const fromObj = notesObj[lang] || '';
      if (typeof fromObj === 'string' && fromObj !== '[object Object]') return fromObj;
    }
  }
  return '';
};

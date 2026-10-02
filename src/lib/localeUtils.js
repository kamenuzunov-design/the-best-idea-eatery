/**
 * Multilingual localization helpers for The Best Idea Eatery
 * Designed to support BG, EN, and ready for IT, FR, DE and beyond.
 */

export const SUPPORTED_LANGUAGES = ['en', 'it', 'fr', 'de', 'bg'];

export const LANGUAGE_LABELS = {
  en: { name: 'EN', flagUrl: '/flags/gb.svg', flag: '🇬🇧', fullName: 'English' },
  it: { name: 'IT', flagUrl: '/flags/it.svg', flag: '🇮🇹', fullName: 'Italiano' },
  fr: { name: 'FR', flagUrl: '/flags/fr.svg', flag: '🇫🇷', fullName: 'Français' },
  de: { name: 'DE', flagUrl: '/flags/de.svg', flag: '🇩🇪', fullName: 'Deutsch' },
  bg: { name: 'BG', flagUrl: '/flags/bg.svg', flag: '🇧🇬', fullName: 'Български' }
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

/**
 * Returns localized recipe title based on language code
 * @param {Object} recipe
 * @param {string} lang
 * @returns {string}
 */
export const getLocalizedRecipeTitle = (recipe, lang = 'bg') => {
  if (!recipe) return '';
  if (recipe[`title_${lang}`]) return recipe[`title_${lang}`];
  if (recipe.title) {
    const fromTitle = getLocalizedText(recipe.title, lang);
    if (fromTitle) return fromTitle;
  }
  return lang === 'bg' ? (recipe.title_bg || recipe.title_en || '') : (recipe.title_en || recipe.title_bg || '');
};

/**
 * Smart multilingual search matching helper.
 * - Case-insensitive
 * - Normalizes French/Latin ligatures (œ -> oe, æ -> ae)
 * - Guards short search terms (<= 3 characters, e.g. "ail", "лед", "egg", "tea")
 *   from matching substrings inside unrelated longer words (e.g. "cocktail", "mocktail", "detail", "сладолед")
 *   using Unicode word boundaries.
 * 
 * @param {string} candidateText - Text from title, description, or ingredient
 * @param {string} term - Search keyword
 * @returns {boolean}
 */
export const matchesSearchTerm = (candidateText, term) => {
  if (!candidateText || !term) return false;
  const t = String(candidateText).toLowerCase().replace(/\u0153/g, 'oe').replace(/\u00E6/g, 'ae').trim();
  const q = String(term).toLowerCase().replace(/\u0153/g, 'oe').replace(/\u00E6/g, 'ae').trim();
  if (!q) return false;
  if (t === q) return true;

  if (q.length <= 3) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp('(^|[^\\p{L}\\p{N}])' + escaped + '([^\\p{L}\\p{N}]|$)', 'iu');
    return rx.test(t);
  }

  return t.includes(q);
};

/**
 * Evaluates whether a recipe matches a list of search keywords.
 * Checks titles, descriptions, and ingredients across all supported languages (bg, en, it, fr, de).
 * 
 * @param {Object} recipe - Recipe object
 * @param {string[]} searchTerms - Array of keywords (e.g. ['patate'] or ['домати', 'краставица'])
 * @param {Array} ingredientsList - Full list of ingredients from database
 * @param {'some'|'every'} mode - Match mode ('some' for quick search, 'every' for multi-keyword filter)
 * @returns {boolean}
 */
export const matchesRecipeSearch = (recipe, searchTerms, ingredientsList = [], mode = 'some') => {
  if (!recipe || !searchTerms || searchTerms.length === 0) return true;

  // 1. Collect title candidates across all languages
  const titleCandidates = [];
  if (recipe.title && typeof recipe.title === 'object') {
    Object.values(recipe.title).forEach(v => {
      if (typeof v === 'string') titleCandidates.push(v);
    });
  } else if (typeof recipe.title === 'string') {
    titleCandidates.push(recipe.title);
  }
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (recipe[`title_${lang}`]) titleCandidates.push(recipe[`title_${lang}`]);
  });

  // 2. Collect description candidates across all languages
  const descCandidates = [];
  if (recipe.description && typeof recipe.description === 'object') {
    Object.values(recipe.description).forEach(v => {
      if (typeof v === 'string') descCandidates.push(v);
    });
  } else if (typeof recipe.description === 'string') {
    descCandidates.push(recipe.description);
  }
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (recipe[`description_${lang}`]) descCandidates.push(recipe[`description_${lang}`]);
  });

  // 3. Collect ingredient candidates across all languages
  const ingCandidates = [];
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    for (const ing of recipe.ingredients) {
      if (ing.ingredient_id) ingCandidates.push(ing.ingredient_id);
      if (ing.id) ingCandidates.push(ing.id);
      if (ing.slug) ingCandidates.push(ing.slug);

      if (ing.name && typeof ing.name === 'object') {
        Object.values(ing.name).forEach(v => {
          if (typeof v === 'string') ingCandidates.push(v);
        });
      } else if (typeof ing.name === 'string') {
        ingCandidates.push(ing.name);
      }

      SUPPORTED_LANGUAGES.forEach(lang => {
        if (ing[`ingredient_${lang}`]) ingCandidates.push(ing[`ingredient_${lang}`]);
        if (ing[`name_${lang}`]) ingCandidates.push(ing[`name_${lang}`]);
      });

      if (ing.notes && typeof ing.notes === 'object') {
        Object.values(ing.notes).forEach(v => {
          if (typeof v === 'string') ingCandidates.push(v);
        });
      } else if (typeof ing.notes === 'string') {
        ingCandidates.push(ing.notes);
      }
      SUPPORTED_LANGUAGES.forEach(lang => {
        if (ing[`notes_${lang}`]) ingCandidates.push(ing[`notes_${lang}`]);
      });

      // Match against master ingredientsList
      if (ingredientsList && ingredientsList.length > 0) {
        const dbIng = ingredientsList.find(dbI => 
          dbI.id === ing.ingredient_id || 
          dbI.id === ing.id || 
          (dbI.slug && (dbI.slug === ing.ingredient_id || dbI.slug === ing.slug))
        );
        if (dbIng) {
          if (dbIng.id) ingCandidates.push(dbIng.id);
          if (dbIng.slug) ingCandidates.push(dbIng.slug);

          if (dbIng.name && typeof dbIng.name === 'object') {
            Object.values(dbIng.name).forEach(v => {
              if (typeof v === 'string') ingCandidates.push(v);
            });
          } else if (typeof dbIng.name === 'string') {
            ingCandidates.push(dbIng.name);
          }

          SUPPORTED_LANGUAGES.forEach(lang => {
            if (dbIng[`name_${lang}`]) ingCandidates.push(dbIng[`name_${lang}`]);
          });
        }
      }
    }
  }

  const checkTerm = (term) => {
    if (!term) return true;
    if (titleCandidates.some(c => matchesSearchTerm(c, term))) return true;
    if (descCandidates.some(c => matchesSearchTerm(c, term))) return true;
    if (ingCandidates.some(c => matchesSearchTerm(c, term))) return true;
    return false;
  };

  if (mode === 'every') {
    return searchTerms.every(term => checkTerm(term));
  }
  return searchTerms.some(term => checkTerm(term));
};

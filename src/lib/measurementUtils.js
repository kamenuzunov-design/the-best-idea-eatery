/**
 * Bulgarian culinary unit translation dictionary
 */
export const BULGARIAN_UNIT_DICTIONARY = {
  'чаена чаша': 'teacup',
  'ч.ч.': 'teacup',
  'ч. ч.': 'teacup',
  'кафена чаша': 'coffee_cup',
  'к.ч.': 'coffee_cup',
  'к. ч.': 'coffee_cup',
  'супена лъжица': 'tablespoon',
  'с.л.': 'tablespoon',
  'с. л.': 'tablespoon',
  'кафена лъжичка': 'teaspoon',
  'ч.л.': 'teaspoon',
  'ч. л.': 'teaspoon',
  'десертна лъжица': 'dessert_spoon',
  'десертна лъжичка': 'dessert_spoon',
  'щипка': 'pinch',
  'щипки': 'pinch',
  'пакет': 'packet',
  'пакетче': 'packet',
  'пакетчета': 'packet',
  'връзка': 'bunch',
  'връзки': 'bunch',
  'скилидка': 'clove',
  'скилидки': 'clove',
  'филия': 'slice',
  'филии': 'slice',
  'стрък': 'sprig',
  'стръка': 'sprig',
  'стръкове': 'sprig',
  'брой': 'piece',
  'броя': 'piece',
  'бр.': 'piece',
  'бр': 'piece',
  'парче': 'piece',
  'парчета': 'piece',
  'капка': 'drop',
  'капки': 'drop',
  'бучка': 'cube',
  'бучки': 'cube',
  'кубче': 'cube',
  'кубчета': 'cube',
  'лист': 'sheet',
  'листа': 'sheet',
  'кора': 'sheet',
  'кори': 'sheet',
  'кутия': 'box',
  'кутии': 'box',
  'консерва': 'can',
  'консерви': 'can',
  'буркан': 'jar',
  'буркани': 'jar',
  'бутилка': 'bottle',
  'бутилки': 'bottle',
  'глава': 'head',
  'глави': 'head',
  'кочан': 'ear',
  'кочана': 'ear',
  'шепа': 'handful',
  'шепи': 'handful',
  'порция': 'portion',
  'порции': 'portion',
  'доза': 'dose',
  'дози': 'dose',
  'грам': 'g',
  'грама': 'g',
  'килограм': 'kg',
  'килограма': 'kg',
  'милилитър': 'ml',
  'милилитра': 'ml',
  'литър': 'l',
  'литра': 'l'
};

/**
 * Checks if a unit ID looks like a Firestore auto-generated hash or has invalid slug format
 */
export const isWeirdId = (id) => {
  if (!id) return false;
  // Firestore auto-generated IDs are ~20 alphanumeric characters with mixed casing
  const isAutoHash = id.length >= 15 && /[A-Z]/.test(id) && /[a-z]/.test(id);
  // Contains spaces, capitals or characters not matching lowercase slug
  const hasNonSlugChars = /[^a-z0-9_-]/.test(id);
  return isAutoHash || hasNonSlugChars;
};

/**
 * Proposes a clean, lowercase English slug ID
 */
export const suggestEnglishId = (unit) => {
  // 1. Try unit.name_en if valid and sensible
  if (unit.name_en && unit.name_en.trim() && !isWeirdId(unit.name_en)) {
    const slug = unit.name_en.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (slug) return slug;
  }

  // 2. Try unit.name_bg from dictionary
  const bgName = (unit.name_bg || unit.name || '').toLowerCase().trim();
  if (bgName && BULGARIAN_UNIT_DICTIONARY[bgName]) {
    return BULGARIAN_UNIT_DICTIONARY[bgName];
  }

  // Partial match in dictionary
  for (const [key, val] of Object.entries(BULGARIAN_UNIT_DICTIONARY)) {
    if (bgName.includes(key)) {
      return val;
    }
  }

  // 3. Try short_en
  if (unit.short_en && !isWeirdId(unit.short_en)) {
    const shortSlug = unit.short_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
    if (shortSlug) return shortSlug;
  }

  // 4. Default fallback: sanitized unit_id or blank
  return (unit.unit_id || unit.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

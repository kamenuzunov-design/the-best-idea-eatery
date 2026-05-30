const TAG_ALIASES = {
  'vegan': ['vegan', 'веган', 'веганска', 'веганско', 'вегански'],
  'vegetarian': ['vegetarian', 'вегетарианска', 'вегетариански', 'вегетарианско', 'вегетариански'],
  'keto': ['keto', 'кето'],
  'pescatarian': ['pescatarian', 'пескатерианска', 'пескетарианска', 'пескетарианско', 'пескатерианско', 'пескатериански'],
  'gluten-free': ['gluten-free', 'gluten free', 'без глутен', 'безглутеново', 'безглутенов', 'безглутенова'],
  'superfood': ['superfood', 'суперхрана', 'суперхрани'],
  'high-protein': ['high-protein', 'high protein', 'високопротеинова', 'високопротеинов', 'високопротеиново', 'високо протеини', 'високопротеинови', 'високо-протеинова', 'високо-протеинов']
};

const hasIngredientTag = (ing, targetTag) => {
  const tags = ing.meta?.tags || [];
  const aliases = TAG_ALIASES[targetTag] || [targetTag];
  return tags.some(t => {
    const norm = String(t).trim().toLowerCase();
    return aliases.some(alias => norm === alias.toLowerCase());
  });
};

export const getRecipeTags = (recipe, ingredientsList) => {
  if (!recipe || !recipe.ingredients || !recipe.ingredients.length || !ingredientsList?.length) return [];

  // Tags that require ALL ingredients to have them
  const allRequiredTags = ['vegan', 'vegetarian', 'keto', 'pescatarian', 'gluten-free'];
  
  // Tags that require AT LEAST ONE ingredient to have them
  const someRequiredTags = ['superfood', 'high-protein'];

  const recipeTags = new Set();
  const dbIngredients = recipe.ingredients.map(reqIng => {
    const ingId = reqIng.ingredient_id || reqIng.ingredientId || reqIng.id;
    if (!ingId) return null;
    const cleanId = String(ingId).trim().toLowerCase();
    return ingredientsList.find(i => 
      String(i.id).trim().toLowerCase() === cleanId ||
      (i.slug && String(i.slug).trim().toLowerCase() === cleanId)
    );
  }).filter(Boolean);

  if (dbIngredients.length === 0) return [];

  // Check "ALL" tags
  allRequiredTags.forEach(tag => {
    const hasTagAll = dbIngredients.every(ing => hasIngredientTag(ing, tag));
    if (hasTagAll) recipeTags.add(tag);
  });

  // Check "SOME" tags
  someRequiredTags.forEach(tag => {
    const hasTagSome = dbIngredients.some(ing => hasIngredientTag(ing, tag));
    if (hasTagSome) recipeTags.add(tag);
  });

  return Array.from(recipeTags);
};

export const translateTag = (tag, isBg) => {
  const map = {
    'vegan': { bg: 'Веган', en: 'Vegan' },
    'vegetarian': { bg: 'Вегетарианско', en: 'Vegetarian' },
    'keto': { bg: 'Кето', en: 'Keto' },
    'pescatarian': { bg: 'Пескатерианско', en: 'Pescatarian' },
    'gluten-free': { bg: 'Без глутен', en: 'Gluten-Free' },
    'superfood': { bg: 'Суперхрана', en: 'Superfood' },
    'high-protein': { bg: 'Високопротеиново', en: 'High-Protein' }
  };
  
  if (map[tag]) return isBg ? map[tag].bg : map[tag].en;
  // Fallback translation if not found in map (just capitalize)
  return tag.charAt(0).toUpperCase() + tag.slice(1);
};

export const normalizeMainGroup = (mg) => {
  if (!mg) return 'other';
  const val = String(mg).toLowerCase().trim();
  
  if (val === 'vegetables' || val === 'зеленчуци') return 'vegetables';
  if (val === 'fruits' || val === 'плодове') return 'fruits';
  if (val === 'meat' || val === 'месо') return 'meat';
  if (val === 'seafood' || val === 'морски дарове') return 'seafood';
  if (val === 'dairy' || val === 'млечни') return 'dairy';
  if (val === 'grains' || val === 'зърнени') return 'grains';
  if (val === 'fats' || val === 'мазнини') return 'fats';
  if (val === 'spices' || val === 'подправки' || val === 'подправки и сосове') return 'spices';
  if (val === 'nuts_and_seeds' || val === 'ядки и семена') return 'nuts_and_seeds';
  if (val === 'sweeteners' || val === 'подсладители') return 'sweeteners';
  if (val === 'other' || val === 'други') return 'other';
  
  return val;
};

export const getMainGroupLabel = (groupKey, isBg) => {
  const map = {
    'vegetables': { bg: 'Зеленчуци', en: 'Vegetables' },
    'fruits': { bg: 'Плодове', en: 'Fruits' },
    'meat': { bg: 'Месо', en: 'Meat' },
    'seafood': { bg: 'Морски дарове', en: 'Seafood' },
    'dairy': { bg: 'Млечни', en: 'Dairy & Eggs' },
    'grains': { bg: 'Зърнени', en: 'Grains' },
    'fats': { bg: 'Мазнини', en: 'Fats' },
    'spices': { bg: 'Подправки', en: 'Spices & Herbs' },
    'nuts_and_seeds': { bg: 'Ядки и семена', en: 'Nuts & Seeds' },
    'sweeteners': { bg: 'Подсладители', en: 'Sweeteners' },
    'other': { bg: 'Други', en: 'Other' }
  };
  
  const norm = normalizeMainGroup(groupKey);
  if (map[norm]) return isBg ? map[norm].bg : map[norm].en;
  
  return groupKey;
};

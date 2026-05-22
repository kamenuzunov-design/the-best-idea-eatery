export const getRecipeTags = (recipe, ingredientsList) => {
  if (!recipe || !recipe.ingredients || !recipe.ingredients.length || !ingredientsList?.length) return [];

  // Tags that require ALL ingredients to have them
  const allRequiredTags = ['веган', 'вегетарианска', 'кето', 'пескатерианска', 'безглутеново'];
  
  // Tags that require AT LEAST ONE ingredient to have them
  const someRequiredTags = ['суперхрана', 'високопротеинова'];

  const recipeTags = new Set();
  const dbIngredients = recipe.ingredients.map(reqIng => 
    ingredientsList.find(i => i.id === reqIng.ingredient_id)
  ).filter(Boolean);

  if (dbIngredients.length === 0) return [];

  // Check "ALL" tags
  allRequiredTags.forEach(tag => {
    const hasTagAll = dbIngredients.every(ing => ing.meta?.tags?.includes(tag));
    if (hasTagAll) recipeTags.add(tag);
  });

  // Check "SOME" tags
  someRequiredTags.forEach(tag => {
    const hasTagSome = dbIngredients.some(ing => ing.meta?.tags?.includes(tag));
    if (hasTagSome) recipeTags.add(tag);
  });

  return Array.from(recipeTags);
};

export const translateTag = (tag, isBg) => {
  const map = {
    'веган': { bg: 'Веган', en: 'Vegan' },
    'вегетарианска': { bg: 'Вегетарианско', en: 'Vegetarian' },
    'кето': { bg: 'Кето', en: 'Keto' },
    'пескатерианска': { bg: 'Пескатерианско', en: 'Pescatarian' },
    'безглутеново': { bg: 'Без глутен', en: 'Gluten-Free' },
    'суперхрана': { bg: 'Суперхрана', en: 'Superfood' },
    'високопротеинова': { bg: 'Високопротеиново', en: 'High-Protein' }
  };
  
  if (map[tag]) return isBg ? map[tag].bg : map[tag].en;
  return tag;
};

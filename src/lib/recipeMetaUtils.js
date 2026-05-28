export const getRecipeTags = (recipe, ingredientsList) => {
  if (!recipe || !recipe.ingredients || !recipe.ingredients.length || !ingredientsList?.length) return [];

  // Tags that require ALL ingredients to have them
  const allRequiredTags = ['vegan', 'vegetarian', 'keto', 'pescatarian', 'gluten-free'];
  
  // Tags that require AT LEAST ONE ingredient to have them
  const someRequiredTags = ['superfood', 'high-protein'];

  const recipeTags = new Set();
  const dbIngredients = recipe.ingredients.map(reqIng => {
    const ingId = reqIng.ingredient_id || reqIng.ingredientId || reqIng.id;
    return ingredientsList.find(i => i.id === ingId);
  }).filter(Boolean);

  if (dbIngredients.length === 0) return [];

  // Check "ALL" tags
  allRequiredTags.forEach(tag => {
    const hasTagAll = dbIngredients.every(ing => 
      ing.meta?.tags?.map(t => t.toLowerCase()).includes(tag.toLowerCase())
    );
    if (hasTagAll) recipeTags.add(tag);
  });

  // Check "SOME" tags
  someRequiredTags.forEach(tag => {
    const hasTagSome = dbIngredients.some(ing => 
      ing.meta?.tags?.map(t => t.toLowerCase()).includes(tag.toLowerCase())
    );
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

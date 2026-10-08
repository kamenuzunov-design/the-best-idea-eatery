/**
 * Recipe Matcher Engine for "The Best Idea Eatery"
 * 
 * Deterministic, instant algorithmic matching between user's Pantry items
 * and the Recipe Database. Categorizes recipes into 3 actionable tiers:
 * 1. 🟢 Ready to Cook (100% matched non-staples)
 * 2. 🟡 Missing 1 Ingredient (Quick shop -> cook)
 * 3. 🟠 Ready to Shop (Missing 2 to 5 ingredients)
 * 
 * Features:
 * - Pantry Staples tolerance (salt, black pepper, water, oil, etc. don't block 100% match)
 * - Expiring ingredient priority boost
 * - Multi-language ingredient name & ID matching (BG, EN, IT, FR, DE)
 * - Deterministic rotation / shuffle support
 */

// Common basic pantry staples found in nearly every kitchen
export const PANTRY_STAPLES = [
  // IDs & Slugs
  'salt', 'black-pepper', 'black_pepper', 'pepper', 'water', 'oil', 
  'sunflower-oil', 'sunflower_oil', 'olive-oil', 'olive_oil', 'sugar', 'vinegar',
  // Bulgarian names
  'сол', 'черен пипер', 'пипер', 'вода', 'олио', 'слънчогледово олио', 
  'зехтин', 'захар', 'оцет', 'растително масло',
  // English names
  'salt', 'black pepper', 'pepper', 'water', 'cooking oil', 'oil', 
  'sunflower oil', 'olive oil', 'sugar', 'white vinegar', 'vinegar'
];

/**
 * Checks if an ingredient is a basic pantry staple
 */
export function isPantryStaple(ing) {
  if (!ing) return false;
  const id = String(ing.ingredient_id || ing.ingredientId || ing.id || '').toLowerCase().trim();
  const slug = String(ing.slug || '').toLowerCase().trim();
  const nameBg = String(ing.ingredient_bg || ing.name_bg || ing.nameBg || '').toLowerCase().trim();
  const nameEn = String(ing.ingredient_en || ing.name_en || ing.nameEn || '').toLowerCase().trim();
  const genericName = String(ing.name || '').toLowerCase().trim();

  return PANTRY_STAPLES.some(st => 
    id === st || slug === st || nameBg === st || nameEn === st || genericName === st ||
    nameBg.includes(st) || nameEn.includes(st)
  );
}

/**
 * Normalizes text for matching
 */
function normalizeStr(s) {
  return String(s || '').toLowerCase().trim().replace(/[\s-_]+/g, ' ');
}

/**
 * Checks if a required recipe ingredient matches an item in the user's pantry
 */
export function matchesPantryItem(reqIng, pantryItem) {
  if (!reqIng || !pantryItem) return false;

  const reqId = normalizeStr(reqIng.ingredient_id || reqIng.ingredientId || reqIng.id);
  const pId = normalizeStr(pantryItem.ingredientId || pantryItem.ingredient_id || pantryItem.id);

  // Exact ID / Slug match
  if (reqId && pId && reqId === pId) return true;

  const reqSlug = normalizeStr(reqIng.slug);
  const pSlug = normalizeStr(pantryItem.slug);
  if (reqSlug && pSlug && reqSlug === pSlug) return true;

  // Cross ID/Slug
  if (reqId && pSlug && reqId === pSlug) return true;
  if (reqSlug && pId && reqSlug === pId) return true;

  // Extract all name candidates
  const getNames = (item) => {
    if (!item) return [];
    return [
      item.ingredient_bg,
      item.name_bg,
      item.nameBg,
      item.ingredient_en,
      item.name_en,
      item.nameEn,
      item.name_it,
      item.nameIt,
      item.name_fr,
      item.nameFr,
      item.name_de,
      item.nameDe,
      typeof item.name === 'string' ? item.name : null,
      item.name?.bg,
      item.name?.en,
      item.name?.it,
      item.name?.fr,
      item.name?.de
    ].filter(Boolean).map(normalizeStr);
  };

  const reqNames = getNames(reqIng);
  const pNames = getNames(pantryItem);

  for (const rName of reqNames) {
    for (const pName of pNames) {
      if (rName === pName) return true;
      if (rName.includes(pName) || pName.includes(rName)) return true;
      // Stem / plural check (e.g. "яйца"/"яйце", "домати"/"домат")
      const rStem = rName.replace(/(а|и|е|ове|ища)$/g, '');
      const pStem = pName.replace(/(а|и|е|ове|ища)$/g, '');
      if (rStem.length >= 3 && pStem.length >= 3 && rStem === pStem) return true;
    }
  }

  return false;
}

/**
 * Checks if a pantry item is expiring within the next 3 days
 */
export function isItemExpiring(pantryItem) {
  if (!pantryItem?.expirationDate) return false;
  try {
    const exp = new Date(pantryItem.expirationDate).getTime();
    if (isNaN(exp)) return false;
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return exp >= now - (24 * 60 * 60 * 1000) && exp <= now + threeDaysMs;
  } catch {
    return false;
  }
}

/**
 * Evaluates a recipe against a user's pantry/ingredient inventory
 */
export function evaluateRecipe(recipe, pantryList = [], ingredientsDB = []) {
  if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return {
      recipe,
      matchPercentage: 0,
      matchedCount: 0,
      missingCount: 0,
      expiringUsedCount: 0,
      matchedIngredients: [],
      missingIngredients: [],
      stapleIngredients: [],
      tier: 'unmatched'
    };
  }

  const matchedIngredients = [];
  const missingIngredients = [];
  const stapleIngredients = [];
  let expiringUsedCount = 0;

  recipe.ingredients.forEach(reqIng => {
    // Attempt to match in pantry
    const matchedPantry = pantryList.find(p => matchesPantryItem(reqIng, p));

    if (matchedPantry) {
      if (isItemExpiring(matchedPantry)) {
        expiringUsedCount++;
      }
      matchedIngredients.push({
        ...reqIng,
        pantryItem: matchedPantry
      });
      return;
    }

    // Check if it's a basic pantry staple
    const dbIng = ingredientsDB.find(i => 
      i.id === reqIng.ingredient_id || i.slug === reqIng.ingredient_id || i.id === reqIng.id
    );

    const isStaple = isPantryStaple(reqIng) || (dbIng && isPantryStaple(dbIng));
    if (isStaple) {
      stapleIngredients.push({
        ...reqIng,
        isStaple: true,
        dbItem: dbIng
      });
    } else {
      missingIngredients.push({
        ...reqIng,
        dbItem: dbIng
      });
    }
  });

  const totalNonStaples = matchedIngredients.length + missingIngredients.length;
  const matchPercentage = totalNonStaples > 0
    ? Math.round((matchedIngredients.length / totalNonStaples) * 100)
    : (recipe.ingredients.length > 0 ? 100 : 0);

  const missingCount = missingIngredients.length;
  const matchedCount = matchedIngredients.length;

  // Determine Tier
  let tier = 'unmatched';
  if (missingCount === 0 && (matchedCount > 0 || stapleIngredients.length > 0)) {
    tier = 'ready'; // 🟢 100% Match: Ready to cook right now!
  } else if (missingCount === 1) {
    tier = 'missing_one'; // 🟡 Missing only 1 ingredient
  } else if (missingCount >= 2 && missingCount <= 5 && matchedCount >= 1) {
    tier = 'shopping_ready'; // 🟠 Missing 2 to 5 ingredients, but user has key base
  }

  return {
    recipe,
    matchPercentage,
    matchedCount,
    missingCount,
    expiringUsedCount,
    matchedIngredients,
    missingIngredients,
    stapleIngredients,
    tier
  };
}

/**
 * Classifies an array of recipes into the 3 tiers
 */
export function classifyRecipes(recipes = [], pantryList = [], ingredientsDB = [], filters = {}) {
  const evaluated = recipes
    .filter(r => r && r.is_active !== false && r.is_deleted !== true)
    .map(r => evaluateRecipe(r, pantryList, ingredientsDB));

  // Tiers
  let readyToCook = evaluated.filter(e => e.tier === 'ready');
  let missingOne = evaluated.filter(e => e.tier === 'missing_one');
  let readyToShop = evaluated.filter(e => e.tier === 'shopping_ready');

  // Apply optional quick filters
  if (filters.quickOnly) {
    // Under 30 minutes total time
    const isQuick = (r) => {
      const time = Number(r.prep_time || 0) + Number(r.cook_time || 0) || Number(r.time || 0) || 0;
      return time > 0 && time <= 30;
    };
    readyToCook = readyToCook.filter(e => isQuick(e.recipe));
    missingOne = missingOne.filter(e => isQuick(e.recipe));
    readyToShop = readyToShop.filter(e => isQuick(e.recipe));
  }

  if (filters.expiringFirst) {
    readyToCook = readyToCook.filter(e => e.expiringUsedCount > 0);
    missingOne = missingOne.filter(e => e.expiringUsedCount > 0);
    readyToShop = readyToShop.filter(e => e.expiringUsedCount > 0);
  }

  // Sorter: expiring items first, then rating, then least missing
  const sortFn = (a, b) => {
    if (b.expiringUsedCount !== a.expiringUsedCount) {
      return b.expiringUsedCount - a.expiringUsedCount;
    }
    const rateA = Number(a.recipe.rating || 0);
    const rateB = Number(b.recipe.rating || 0);
    if (rateB !== rateA) return rateB - rateA;
    return a.missingCount - b.missingCount;
  };

  readyToCook.sort(sortFn);
  missingOne.sort(sortFn);
  readyToShop.sort(sortFn);

  return {
    readyToCook,
    missingOne,
    readyToShop,
    totalMatches: readyToCook.length + missingOne.length + readyToShop.length
  };
}

/**
 * Deterministic batch rotation (Shuffle / Reroll) helper
 */
export function getRotatedBatch(list = [], offset = 0, batchSize = 3) {
  if (!list.length) return [];
  if (list.length <= batchSize) return list;

  const start = offset % list.length;
  const result = [];
  for (let i = 0; i < batchSize; i++) {
    const idx = (start + i) % list.length;
    result.push(list[idx]);
  }
  return result;
}

/**
 * Centralized Nutrition Calculator for The Best Idea Eatery
 * Calculates calories, protein, fat, and carbohydrates per serving from recipe ingredients.
 */

/**
 * Finds a matching ingredient in the master ingredients list
 */
export const findDbIngredient = (ing, ingredientsList = []) => {
  if (!ing || !Array.isArray(ingredientsList) || ingredientsList.length === 0) return null;

  const targetId = String(ing.ingredient_id || ing.id || '').trim().toLowerCase();
  const targetSlug = String(ing.slug || '').trim().toLowerCase();
  const targetNameEn = String(ing.ingredient_en || ing.name_en || ing.name?.en || '').trim().toLowerCase();
  const targetNameBg = String(ing.ingredient_bg || ing.name_bg || ing.name?.bg || '').trim().toLowerCase();

  return ingredientsList.find(i => {
    const id = String(i.id || '').trim().toLowerCase();
    const slug = String(i.slug || '').trim().toLowerCase();
    if (targetId && (id === targetId || slug === targetId)) return true;
    if (targetSlug && (slug === targetSlug || id === targetSlug)) return true;
    if (targetNameEn) {
      const en = String(i.name_en || i.name?.en || '').trim().toLowerCase();
      if (en && en === targetNameEn) return true;
    }
    if (targetNameBg) {
      const bg = String(i.name_bg || i.name?.bg || '').trim().toLowerCase();
      if (bg && bg === targetNameBg) return true;
    }
    return false;
  }) || null;
};

/**
 * Calculates weight in grams for a given ingredient amount and unit
 */
export const getIngredientWeightGrams = (ing, dbIng, measurements = null) => {
  const amount = parseFloat(ing.amount ?? ing.quantity ?? 0);
  if (!amount || isNaN(amount) || amount <= 0) return 0;

  const rawUnit = String(ing.unit_id || ing.unit || '').trim().toLowerCase();

  // 1. Check custom units_mapping on master ingredient
  if (dbIng?.units_mapping && Array.isArray(dbIng.units_mapping)) {
    const mapping = dbIng.units_mapping.find(m => {
      const mId = String(m.unit_id || m.unit || '').trim().toLowerCase();
      return mId === rawUnit;
    });
    if (mapping && parseFloat(mapping.weight_grams) > 0) {
      return parseFloat(mapping.weight_grams) * amount;
    }
  }

  // 2. Standard unit conversions
  if (['g', 'gram', 'grams', 'гр', 'г', 'ml', 'мл', 'milliliter', 'milliliters'].includes(rawUnit)) {
    return amount;
  }
  if (['kg', 'кг', 'kilogram', 'kilograms', 'l', 'л', 'liter', 'liters'].includes(rawUnit)) {
    return amount * 1000;
  }
  if (['oz', 'ounce', 'ounces'].includes(rawUnit)) {
    return amount * 28.3495;
  }
  if (['lb', 'lbs', 'pound', 'pounds'].includes(rawUnit)) {
    return amount * 453.592;
  }
  if (['tbsp', 'tablespoon', 'tablespoons', 'с.л.', 'сл'].includes(rawUnit)) {
    return amount * 15;
  }
  if (['tsp', 'teaspoon', 'teaspoons', 'ч.л.', 'чл'].includes(rawUnit)) {
    return amount * 5;
  }
  if (['cup', 'cups', 'ч.ч.', 'чч'].includes(rawUnit)) {
    return amount * 240;
  }
  if (['pinch', 'щипка'].includes(rawUnit)) {
    return amount * 0.5;
  }
  if (['clove', 'cloves', 'скилидка', 'скилидки'].includes(rawUnit)) {
    return amount * 3;
  }
  if (['slice', 'slices', 'филия', 'филии', 'парче', 'резан'].includes(rawUnit)) {
    return amount * 30;
  }
  if (['pcs', 'pc', 'бр', 'бр.', 'piece', 'pieces', 'head', 'глава', 'stalk', 'стрък'].includes(rawUnit)) {
    const pcsMap = dbIng?.units_mapping?.find(m => {
      const mId = String(m.unit_id || m.unit || '').trim().toLowerCase();
      return ['pcs', 'pc', 'бр', 'бр.', 'piece', 'pieces'].includes(mId);
    });
    if (pcsMap && parseFloat(pcsMap.weight_grams) > 0) {
      return parseFloat(pcsMap.weight_grams) * amount;
    }
    return amount * 50;
  }

  // 3. Fallback to measurements lookup table
  if (measurements) {
    const unitObj = Array.isArray(measurements)
      ? measurements.find(m => String(m.id || m.unit_id || '').toLowerCase() === rawUnit)
      : measurements[rawUnit];
    if (unitObj) {
      if (['g', 'ml'].includes(unitObj.unit_id) || ['g', 'ml'].includes(unitObj.base_unit)) {
        const factor = parseFloat(unitObj.conversion_factor) || 1;
        return amount * factor;
      }
    }
  }

  return 0;
};

/**
 * Calculates nutrition per serving from ingredients list
 * @param {Object} options
 * @param {Array} options.ingredients - Array of recipe ingredient objects
 * @param {number} [options.servings=1] - Number of servings the ingredient amounts represent
 * @param {Array} [options.ingredientsList=[]] - Master list of db ingredients
 * @param {Array|Object} [options.measurements=null] - Master list/map of units
 * @param {Array} [options.subRecipes=[]] - Master list of recipes for sub-recipe resolution
 * @returns {{ calories: number, protein: number, fat: number, carbs: number, hasCalculatedAny: boolean }}
 */
export const calculateNutritionFromIngredients = ({
  ingredients = [],
  servings = 1,
  ingredientsList = [],
  measurements = null,
  subRecipes = []
}) => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0, hasCalculatedAny: false };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let hasCalculatedAny = false;

  ingredients.forEach(ing => {
    // 1. Sub-recipe support
    if (ing.type === 'recipe' || ing.type === 'sub_recipe') {
      const subId = ing.recipe_id || ing.ingredient_id || ing.id;
      const subRec = Array.isArray(subRecipes)
        ? subRecipes.find(r => r.id === subId || r.slug === subId)
        : null;

      if (subRec) {
        const amt = parseFloat(ing.amount ?? ing.quantity) || 1;
        const subCal = parseFloat(subRec.calories_per_serving || subRec.calories) || 0;
        const subProt = parseFloat(subRec.protein_per_serving || subRec.protein) || 0;
        const subFat = parseFloat(subRec.fat_per_serving || subRec.fat) || 0;
        const subCarbs = parseFloat(subRec.carbs_per_serving || subRec.carbs) || 0;

        totalCalories += subCal * amt;
        totalProtein += subProt * amt;
        totalFat += subFat * amt;
        totalCarbs += subCarbs * amt;
        hasCalculatedAny = true;
      }
      return;
    }

    // 2. Master ingredient lookup
    const dbIng = findDbIngredient(ing, ingredientsList);
    if (!dbIng || !dbIng.nutrition_per_100) return;

    const weightGrams = getIngredientWeightGrams(ing, dbIng, measurements);
    if (weightGrams > 0) {
      const nut = dbIng.nutrition_per_100;
      const c = parseFloat(nut.calories) || 0;
      const p = parseFloat(nut.proteins ?? nut.protein) || 0;
      const f = parseFloat(nut.fats ?? nut.fat) || 0;
      const ch = parseFloat(nut.carbs) || 0;

      totalCalories += (c / 100) * weightGrams;
      totalProtein += (p / 100) * weightGrams;
      totalFat += (f / 100) * weightGrams;
      totalCarbs += (ch / 100) * weightGrams;
      hasCalculatedAny = true;
    }
  });

  const srv = Math.max(1, parseInt(servings) || 1);

  return {
    calories: Math.round(totalCalories / srv),
    protein: Math.round((totalProtein / srv) * 10) / 10,
    fat: Math.round((totalFat / srv) * 10) / 10,
    carbs: Math.round((totalCarbs / srv) * 10) / 10,
    hasCalculatedAny
  };
};

/**
 * Returns scaled display nutrition for a recipe, automatically falling back
 * to dynamic calculation from ingredients if protein/fat/calories are missing or zero.
 */
export const getRecipeNutritionDisplay = (
  recipe,
  currentServings = 1,
  ingredientsList = [],
  measurements = null,
  subRecipes = []
) => {
  if (!recipe) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0 };
  }

  const srvMultiplier = Math.max(1, Number(currentServings) || 1);

  let calPerServing = parseFloat(recipe.calories_per_serving || recipe.calories) || 0;
  let proteinPerServing = parseFloat(recipe.protein_per_serving || recipe.protein) || 0;
  let fatPerServing = parseFloat(recipe.fat_per_serving || recipe.fat) || 0;
  let carbsPerServing = parseFloat(recipe.carbs_per_serving || recipe.carbs) || 0;

  // If protein or fat are missing/zero, calculate dynamically from ingredients!
  // In stored recipe documents, ingredient amounts are stored per 1 serving.
  if ((proteinPerServing === 0 || fatPerServing === 0 || calPerServing === 0) && Array.isArray(recipe.ingredients)) {
    const calculated = calculateNutritionFromIngredients({
      ingredients: recipe.ingredients,
      servings: 1, // Stored amounts in recipe.ingredients are normalized per 1 serving
      ingredientsList,
      measurements,
      subRecipes
    });

    if (calculated.hasCalculatedAny) {
      if (calPerServing === 0 && calculated.calories > 0) {
        calPerServing = calculated.calories;
      }
      if (proteinPerServing === 0 && calculated.protein > 0) {
        proteinPerServing = calculated.protein;
      }
      if (fatPerServing === 0 && calculated.fat > 0) {
        fatPerServing = calculated.fat;
      }
      if (carbsPerServing === 0 && calculated.carbs > 0) {
        carbsPerServing = calculated.carbs;
      }
    }
  }

  return {
    calories: Math.round(calPerServing * srvMultiplier),
    protein: Math.round(proteinPerServing * srvMultiplier),
    fat: Math.round(fatPerServing * srvMultiplier),
    carbs: Math.round(carbsPerServing * srvMultiplier)
  };
};

export const calculateEstimatedPrice = (recipe, ingredientsList) => {
  if (!recipe || !recipe.ingredients || !ingredientsList?.length) return null;
  let totalPrice = 0;
  
  recipe.ingredients.forEach(reqIng => {
    const dbIng = ingredientsList.find(i => i.id === reqIng.ingredient_id);
    if (!dbIng || !dbIng.price_per_100) return;
    
    let weightInGrams = 0;
    const amount = Number(reqIng.amount) || 0;
    
    if (reqIng.unit_id === 'g' || reqIng.unit_id === 'ml') {
      weightInGrams = amount;
    } else if (reqIng.unit_id === 'kg' || reqIng.unit_id === 'l') {
      weightInGrams = amount * 1000;
    } else {
      if (dbIng.units_mapping && Array.isArray(dbIng.units_mapping)) {
        const mapping = dbIng.units_mapping.find(m => m.unit_id === reqIng.unit_id);
        if (mapping && mapping.weight_grams) {
          weightInGrams = amount * mapping.weight_grams;
        }
      }
    }
    
    const totalWeight = weightInGrams; // Since DB stores normalized amounts for 1 serving
    totalPrice += (totalWeight / 100) * Number(dbIng.price_per_100);
  });
  
  return totalPrice > 0 ? totalPrice.toFixed(2) : null;
};

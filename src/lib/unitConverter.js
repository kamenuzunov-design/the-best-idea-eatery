/**
 * Culinary Unit Conversion Engine for The Best Idea Eatery
 * Handles accurate conversion between Metric and Imperial measurement systems,
 * taking into account ingredient state (liquid vs dry) and culinary conventions.
 */

// Precise scientific conversion factors
export const GRAMS_PER_OZ = 28.349523125;
export const ML_PER_FL_OZ = 29.5735295625;
export const OZ_PER_LB = 16;
export const FL_OZ_PER_PINT = 16;
export const FL_OZ_PER_CUP = 8;

/**
 * Standard canonical unit keys:
 * Metric: 'g', 'kg', 'ml', 'l'
 * Imperial: 'oz', 'lb', 'fl_oz'
 */

// Alias map to normalize raw unit IDs or text variations
export const UNIT_ALIASES = {
  // Mass metric
  'g': 'g',
  'gram': 'g',
  'grams': 'g',
  'гр': 'g',
  'грам': 'g',
  'грама': 'g',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'кг': 'kg',
  'килограм': 'kg',
  'килограма': 'kg',

  // Volume metric
  'ml': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'мл': 'ml',
  'милилитра': 'ml',
  'милилитър': 'ml',
  'l': 'l',
  'liter': 'l',
  'liters': 'l',
  'л': 'l',
  'литър': 'l',
  'литра': 'l',

  // Mass imperial
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'унция': 'oz',
  'унции': 'oz',
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',
  'паунд': 'lb',
  'паунда': 'lb',

  // Volume imperial
  'fl_oz': 'fl_oz',
  'fl oz': 'fl_oz',
  'floz': 'fl_oz',
  'fluid_ounce': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fluid_ounces': 'fl_oz',
  'fluid ounces': 'fl_oz',
  'течна унция': 'fl_oz',
  'течни унции': 'fl_oz',
  'cup': 'cup',
  'cups': 'cup',
  'pint': 'pint',
  'pints': 'pint'
};

/**
 * Normalizes any unit ID or label to its canonical key
 * 
 * @param {string} unitId 
 * @returns {string}
 */
export const normalizeUnitId = (unitId) => {
  if (!unitId) return '';
  const clean = String(unitId).trim().toLowerCase();
  return UNIT_ALIASES[clean] || clean;
};

/**
 * Checks if a unit belongs to the Metric system
 * 
 * @param {string} unitId 
 * @returns {boolean}
 */
export const isMetricUnit = (unitId) => {
  const norm = normalizeUnitId(unitId);
  return ['g', 'kg', 'ml', 'l'].includes(norm);
};

/**
 * Checks if a unit belongs to the Imperial system
 * 
 * @param {string} unitId 
 * @returns {boolean}
 */
export const isImperialUnit = (unitId) => {
  const norm = normalizeUnitId(unitId);
  return ['oz', 'lb', 'fl_oz', 'cup', 'pint'].includes(norm);
};

/**
 * Determines whether a unit is mass, volume, or discrete/count
 * 
 * @param {string} unitId 
 * @returns {'mass' | 'volume' | 'discrete'}
 */
export const getUnitCategory = (unitId) => {
  const norm = normalizeUnitId(unitId);
  if (['g', 'kg', 'oz', 'lb'].includes(norm)) return 'mass';
  if (['ml', 'l', 'fl_oz', 'cup', 'pint'].includes(norm)) return 'volume';
  return 'discrete';
};

/**
 * Smart culinary rounding:
 * Avoids awkward fractions like 2.3789 oz -> rounds cleanly (e.g. 2.4 oz or 2 oz).
 * For small values (< 1), keeps 1 or 2 decimal places as needed.
 * 
 * @param {number} val 
 * @param {number} [maxDecimals=1] 
 * @returns {number}
 */
export const roundCulinary = (val, maxDecimals = 1) => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  if (val === 0) return 0;

  if (val >= 100) {
    // Large numbers: round to whole integer or at most 1 decimal
    return Math.round(val);
  }

  if (val >= 10) {
    // Medium numbers (e.g. 12.3 oz or 15 g)
    const factor = Math.pow(10, Math.min(maxDecimals, 1));
    return Math.round(val * factor) / factor;
  }

  if (val >= 1) {
    // 1 - 10: 1 decimal place (e.g. 1.5, 2.3)
    const factor = Math.pow(10, maxDecimals);
    return Math.round(val * factor) / factor;
  }

  // Under 1: keep up to 2 decimal places (e.g. 0.25, 0.5)
  return Math.round(val * 100) / 100;
};

/**
 * Formats a numeric quantity cleanly for UI display (e.g. 2.5, 0.75, 500)
 * 
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatQuantity = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  const num = Number(amount);
  if (Number.isInteger(num)) return String(num);
  // Avoid floating point inaccuracies like 0.30000000000000004
  return String(parseFloat(num.toFixed(2)));
};

/**
 * Normalizes any quantity and unit to a canonical base (grams or milliliters)
 * Discrete units remain unchanged.
 * 
 * @param {Object} params
 * @param {number|string} params.amount
 * @param {string} params.unitId
 * @param {boolean} [params.isLiquid=false]
 * @returns {{ amount: number, unit: string, type: 'mass' | 'volume' | 'discrete' }}
 */
export const normalizeToCanonical = ({ amount, unitId, isLiquid = false }) => {
  const numericAmount = Number(amount) || 0;
  const norm = normalizeUnitId(unitId);

  // Mass units -> Canonical 'g' (or 'ml' if ingredient is liquid: 1g ≈ 1ml)
  if (norm === 'g') {
    return isLiquid
      ? { amount: numericAmount, unit: 'ml', type: 'volume' }
      : { amount: numericAmount, unit: 'g', type: 'mass' };
  }
  if (norm === 'kg') {
    return isLiquid
      ? { amount: numericAmount * 1000, unit: 'ml', type: 'volume' }
      : { amount: numericAmount * 1000, unit: 'g', type: 'mass' };
  }
  if (norm === 'oz') {
    const grams = numericAmount * GRAMS_PER_OZ;
    return isLiquid
      ? { amount: grams, unit: 'ml', type: 'volume' }
      : { amount: grams, unit: 'g', type: 'mass' };
  }
  if (norm === 'lb') {
    const grams = numericAmount * OZ_PER_LB * GRAMS_PER_OZ;
    return isLiquid
      ? { amount: grams, unit: 'ml', type: 'volume' }
      : { amount: grams, unit: 'g', type: 'mass' };
  }

  // Volume units -> Canonical 'ml'
  if (norm === 'ml') {
    return { amount: numericAmount, unit: 'ml', type: 'volume' };
  }
  if (norm === 'l') {
    return { amount: numericAmount * 1000, unit: 'ml', type: 'volume' };
  }
  if (norm === 'fl_oz') {
    return { amount: numericAmount * ML_PER_FL_OZ, unit: 'ml', type: 'volume' };
  }
  if (norm === 'cup') {
    return { amount: numericAmount * FL_OZ_PER_CUP * ML_PER_FL_OZ, unit: 'ml', type: 'volume' };
  }
  if (norm === 'pint') {
    return { amount: numericAmount * FL_OZ_PER_PINT * ML_PER_FL_OZ, unit: 'ml', type: 'volume' };
  }

  // Discrete / non-standard unit (e.g. piece, clove, tbsp, pinch)
  return { amount: numericAmount, unit: norm || unitId, type: 'discrete' };
};

/**
 * Converts a Metric quantity to Imperial
 * 
 * Rules:
 * - Liquid ingredients (isLiquid: true) in g/kg/ml/l -> fl_oz
 * - Dry ingredients in g/kg -> oz (or lb if >= 32 oz / 2 lb)
 * - Volume in ml/l -> fl_oz
 * - Discrete units -> remain unchanged
 * 
 * @param {Object} params
 * @param {number|string} params.amount
 * @param {string} params.unitId
 * @param {boolean} [params.isLiquid=false]
 * @param {boolean} [params.preferLb=false]
 * @returns {{ amount: number, unit: string, converted: boolean }}
 */
export const convertMetricToImperial = ({ amount, unitId, isLiquid = false, preferLb = false }) => {
  const numericAmount = Number(amount) || 0;
  const norm = normalizeUnitId(unitId);

  // If discrete or already imperial, cannot or need not convert
  if (!isMetricUnit(norm)) {
    return { amount: numericAmount, unit: unitId, converted: false };
  }

  // Case 1: Liquid ingredient measured in mass ('g' or 'kg') or volume ('ml' or 'l')
  if (isLiquid) {
    let ml = 0;
    if (norm === 'ml') ml = numericAmount;
    else if (norm === 'l') ml = numericAmount * 1000;
    else if (norm === 'g') ml = numericAmount; // culinary approximation for liquids: 1g ≈ 1ml
    else if (norm === 'kg') ml = numericAmount * 1000;

    const flOz = ml / ML_PER_FL_OZ;
    return {
      amount: roundCulinary(flOz),
      unit: 'fl_oz',
      converted: true
    };
  }

  // Case 2: Volume units for non-liquid (or standard volume)
  if (norm === 'ml' || norm === 'l') {
    const ml = norm === 'l' ? numericAmount * 1000 : numericAmount;
    const flOz = ml / ML_PER_FL_OZ;
    return {
      amount: roundCulinary(flOz),
      unit: 'fl_oz',
      converted: true
    };
  }

  // Case 3: Dry Mass ('g' or 'kg')
  if (norm === 'g' || norm === 'kg') {
    const grams = norm === 'kg' ? numericAmount * 1000 : numericAmount;
    const oz = grams / GRAMS_PER_OZ;

    // Use lb if >= 32 oz (or >= 16 oz with preferLb)
    if ((preferLb && oz >= 16) || oz >= 32) {
      const lbs = oz / OZ_PER_LB;
      return {
        amount: roundCulinary(lbs, 2),
        unit: 'lb',
        converted: true
      };
    }

    return {
      amount: roundCulinary(oz),
      unit: 'oz',
      converted: true
    };
  }

  return { amount: numericAmount, unit: unitId, converted: false };
};

/**
 * Converts an Imperial quantity to Metric
 * 
 * Rules:
 * - oz / lb -> g (or kg if >= 1000 g)
 * - fl_oz -> ml (or l if >= 1000 ml)
 * - Discrete units -> remain unchanged
 * 
 * @param {Object} params
 * @param {number|string} params.amount
 * @param {string} params.unitId
 * @param {boolean} [params.preferKgOrL=true]
 * @returns {{ amount: number, unit: string, converted: boolean }}
 */
export const convertImperialToMetric = ({ amount, unitId, preferKgOrL = true }) => {
  const numericAmount = Number(amount) || 0;
  const norm = normalizeUnitId(unitId);

  if (!isImperialUnit(norm)) {
    return { amount: numericAmount, unit: unitId, converted: false };
  }

  // Mass imperial: oz or lb
  if (norm === 'oz' || norm === 'lb') {
    const oz = norm === 'lb' ? numericAmount * OZ_PER_LB : numericAmount;
    const grams = oz * GRAMS_PER_OZ;

    if (preferKgOrL && grams >= 1000) {
      return {
        amount: roundCulinary(grams / 1000, 2),
        unit: 'kg',
        converted: true
      };
    }

    return {
      amount: roundCulinary(grams, 0),
      unit: 'g',
      converted: true
    };
  }

  // Volume imperial: fl_oz, cup, pint
  if (norm === 'fl_oz' || norm === 'cup' || norm === 'pint') {
    let flOz = numericAmount;
    if (norm === 'cup') flOz = numericAmount * FL_OZ_PER_CUP;
    if (norm === 'pint') flOz = numericAmount * FL_OZ_PER_PINT;

    const ml = flOz * ML_PER_FL_OZ;

    if (preferKgOrL && ml >= 1000) {
      return {
        amount: roundCulinary(ml / 1000, 2),
        unit: 'l',
        converted: true
      };
    }

    return {
      amount: roundCulinary(ml, 0),
      unit: 'ml',
      converted: true
    };
  }

  return { amount: numericAmount, unit: unitId, converted: false };
};

/**
 * Universal dispatcher for converting to target system
 * 
 * @param {Object} params
 * @param {number|string} params.amount
 * @param {string} params.unitId
 * @param {string} [params.targetSystem='metric'] - 'metric' | 'imperial'
 * @param {boolean} [params.isLiquid=false]
 * @param {boolean} [params.preferLargeUnits=true]
 * @returns {{ amount: number, unit: string, converted: boolean }}
 */
export const convertQuantityToSystem = ({
  amount,
  unitId,
  targetSystem = 'metric',
  isLiquid = false,
  preferLargeUnits = true
}) => {
  const numericAmount = Number(amount) || 0;
  const norm = normalizeUnitId(unitId);

  if (targetSystem === 'imperial') {
    // If already imperial, return as is
    if (isImperialUnit(norm)) {
      return { amount: numericAmount, unit: norm, converted: false };
    }
    return convertMetricToImperial({
      amount: numericAmount,
      unitId: norm,
      isLiquid,
      preferLb: preferLargeUnits
    });
  }

  // Target system: metric
  if (targetSystem === 'metric') {
    // If already metric, return as is
    if (isMetricUnit(norm)) {
      return { amount: numericAmount, unit: norm, converted: false };
    }
    return convertImperialToMetric({
      amount: numericAmount,
      unitId: norm,
      preferKgOrL: preferLargeUnits
    });
  }

  return { amount: numericAmount, unit: unitId, converted: false };
};

/**
 * Compares two quantities across potentially different unit systems.
 * Useful for pantry inventory matching (e.g. does pantry have enough?).
 * 
 * Returns:
 * > 0 if available > required
 * = 0 if available == required
 * < 0 if available < required
 * null if units cannot be compared (e.g. piece vs grams)
 * 
 * @param {Object} availableItem - { amount, unit / unit_id }
 * @param {Object} requiredItem - { amount, unit / unit_id }
 * @param {boolean} [isLiquid=false]
 * @returns {number|null}
 */
export const compareQuantities = (availableItem, requiredItem, isLiquid = false) => {
  if (!availableItem || !requiredItem) return null;

  const a = normalizeToCanonical({
    amount: availableItem.amount !== undefined ? availableItem.amount : (availableItem.quantity || 0),
    unitId: availableItem.unit || availableItem.unit_id,
    isLiquid
  });

  const r = normalizeToCanonical({
    amount: requiredItem.amount !== undefined ? requiredItem.amount : (requiredItem.quantity || 0),
    unitId: requiredItem.unit || requiredItem.unit_id,
    isLiquid
  });

  // If discrete, can only compare if exact unit matches
  if (a.type === 'discrete' || r.type === 'discrete') {
    if (normalizeUnitId(a.unit) !== normalizeUnitId(r.unit)) {
      return null;
    }
    return a.amount - r.amount;
  }

  // If both are mass or both are volume
  if (a.type === r.type) {
    return a.amount - r.amount;
  }

  // Cross-comparison if liquid (1g ≈ 1ml)
  if (isLiquid) {
    return a.amount - r.amount;
  }

  return null;
};

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField, matchesRecipeSearch } from '../lib/localeUtils';
import { isPantryStaple, matchesPantryItem } from '../lib/recipeMatcherEngine';
import { normalizeUnitId, normalizeToCanonical } from '../lib/unitConverter';

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_SLOTS = [
  { id: 'breakfast', icon: 'wb_twilight' },
  { id: 'lunch', icon: 'sunny' },
  { id: 'dinner', icon: 'dark_mode' },
  { id: 'snack', icon: 'cookie' }
];

const EMPTY_WEEK_MENU = {
  Mon: { breakfast: null, lunch: null, dinner: null, snack: null },
  Tue: { breakfast: null, lunch: null, dinner: null, snack: null },
  Wed: { breakfast: null, lunch: null, dinner: null, snack: null },
  Thu: { breakfast: null, lunch: null, dinner: null, snack: null },
  Fri: { breakfast: null, lunch: null, dinner: null, snack: null },
  Sat: { breakfast: null, lunch: null, dinner: null, snack: null },
  Sun: { breakfast: null, lunch: null, dinner: null, snack: null }
};

function getCurrentWeekDays() {
  const now = new Date();
  const jsDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const todayKey = DAY_KEYS[jsDay === 0 ? 6 : jsDay - 1] || 'Mon';

  const days = DAY_KEYS.map((id, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      id,
      dateNum: String(d.getDate()).padStart(2, '0'),
      isToday: id === todayKey
    };
  });

  return { days, todayKey };
}

function normalizeSlotValue(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    return { recipeId: val, servings: 2 };
  }
  if (val.recipeId) {
    return {
      recipeId: val.recipeId,
      servings: Math.max(1, Number(val.servings) || 2)
    };
  }
  return null;
}

function normalizeWeeklyMenu(raw) {
  const result = {};
  DAY_KEYS.forEach(day => {
    const dayObj = raw?.[day] || {};
    result[day] = {
      breakfast: normalizeSlotValue(dayObj.breakfast),
      lunch: normalizeSlotValue(dayObj.lunch),
      dinner: normalizeSlotValue(dayObj.dinner),
      snack: normalizeSlotValue(dayObj.snack)
    };
  });
  return result;
}

function getRecipeTotalTime(recipe) {
  if (!recipe) return 0;
  const prep = Number(recipe.prep_time || recipe.prep_time_minutes || 0);
  const cook = Number(recipe.cook_time || recipe.cook_time_minutes || 0);
  if (prep + cook > 0) return prep + cook;
  if (recipe.cooking_time) return Number(recipe.cooking_time) || 0;
  if (recipe.total_time) return Number(recipe.total_time) || 0;
  if (recipe.time) return Number(recipe.time) || 0;
  return 0;
}

function isRecipeRecommendedForSlot(recipe, slotId) {
  if (!recipe) return false;
  const cats = [
    recipe.category_id,
    recipe.category,
    recipe.subcategory_id,
    ...(Array.isArray(recipe.category_ids) ? recipe.category_ids : []),
    ...(Array.isArray(recipe.tags) ? recipe.tags : [])
  ]
    .filter(Boolean)
    .map(c => String(c).toLowerCase());

  if (slotId === 'breakfast') {
    return cats.some(c => c.includes('breakfast') || c.includes('pastry') || c.includes('закуск') || c.includes('тестен'));
  }
  if (slotId === 'lunch') {
    return cats.some(c => c.includes('soup') || c.includes('salad') || c.includes('main') || c.includes('appetizer'));
  }
  if (slotId === 'dinner') {
    return cats.some(c => c.includes('main') || c.includes('special') || c.includes('pastry') || c.includes('appetizer'));
  }
  if (slotId === 'snack') {
    return cats.some(c => c.includes('dessert') || c.includes('salad') || c.includes('appetizer') || c.includes('breakfast'));
  }
  return true;
}

const WeeklyMenuPlanner = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'bg').split('-')[0];
  const { user } = useAuth();
  const { pantry, shoppingList, setShoppingList, ingredientsList } = useAppContext();

  const { days, todayKey } = useMemo(() => getCurrentWeekDays(), []);
  const [activeDay, setActiveDay] = useState(todayKey);

  const [weeklyMenu, setWeeklyMenu] = useState(EMPTY_WEEK_MENU);
  const [savedRecipeIds, setSavedRecipeIds] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [unitsMap, setUnitsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Recipe picker modal state
  const [pickerSlot, setPickerSlot] = useState(null); // 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilter, setPickerFilter] = useState('recommended'); // 'recommended' | 'saved' | 'all'

  // Shopping list generation modal state
  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);
  const [shoppingCandidates, setShoppingCandidates] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // 1. Load & Sync Weekly Menu + Saved Recipes from user profile (or localStorage for guests)
  useEffect(() => {
    if (!user || user.role === 'guest') {
      const timer = setTimeout(() => {
        try {
          const local = localStorage.getItem('weekly_menu');
          setWeeklyMenu(local ? normalizeWeeklyMenu(JSON.parse(local)) : EMPTY_WEEK_MENU);
        } catch {
          setWeeklyMenu(EMPTY_WEEK_MENU);
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setWeeklyMenu(normalizeWeeklyMenu(data.weekly_menu));
          setSavedRecipeIds(Array.isArray(data.saved_recipes) ? data.saved_recipes : []);
        } else {
          setWeeklyMenu(EMPTY_WEEK_MENU);
        }
      },
      (err) => {
        console.error('Error syncing weekly menu:', err);
      }
    );
    return () => unsub();
  }, [user]);

  // 2. Load active recipes from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'recipes'),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const active = all.filter(
          r =>
            r.is_deleted !== true &&
            (!r.parent_recipe_id || r.is_public_variation === true) &&
            r.is_active !== false
        );
        setRecipes(active);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading recipes for planner:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 3. Load measurements for unit conversions
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'measurements'), (snap) => {
      const uMap = {};
      snap.docs.forEach(d => {
        uMap[d.id] = { id: d.id, ...d.data() };
      });
      setUnitsMap(uMap);
    });
    return () => unsub();
  }, []);

  // Recipe map by ID for fast lookup
  const recipesById = useMemo(() => {
    const map = {};
    recipes.forEach(r => {
      map[r.id] = r;
    });
    return map;
  }, [recipes]);

  // Persist changes to weeklyMenu
  const saveWeeklyMenu = async (nextMenu) => {
    const normalized = normalizeWeeklyMenu(nextMenu);
    setWeeklyMenu(normalized);

    if (!user || user.role === 'guest') {
      try {
        localStorage.setItem('weekly_menu', JSON.stringify(normalized));
      } catch (err) {
        console.warn('Failed to save weekly menu to localStorage:', err);
      }
    } else {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { weekly_menu: normalized });
      } catch (err) {
        console.error('Error saving weekly menu to Firestore:', err);
      }
    }
  };

  // Assign a recipe to a slot on activeDay
  const handleSelectRecipeForSlot = (recipeId) => {
    if (!pickerSlot) return;
    const currentSlot = weeklyMenu[activeDay]?.[pickerSlot];
    const nextServings = currentSlot?.servings || 2;
    const nextMenu = {
      ...weeklyMenu,
      [activeDay]: {
        ...weeklyMenu[activeDay],
        [pickerSlot]: { recipeId, servings: nextServings }
      }
    };
    saveWeeklyMenu(nextMenu);
    setPickerSlot(null);
    setPickerSearch('');
  };

  // Remove a recipe from a slot
  const handleRemoveSlot = (slotId) => {
    const nextMenu = {
      ...weeklyMenu,
      [activeDay]: {
        ...weeklyMenu[activeDay],
        [slotId]: null
      }
    };
    saveWeeklyMenu(nextMenu);
  };

  // Change servings for a slot
  const handleChangeServings = (slotId, delta) => {
    const current = weeklyMenu[activeDay]?.[slotId];
    if (!current) return;
    const nextServings = Math.max(1, Math.min(20, (current.servings || 2) + delta));
    const nextMenu = {
      ...weeklyMenu,
      [activeDay]: {
        ...weeklyMenu[activeDay],
        [slotId]: { ...current, servings: nextServings }
      }
    };
    saveWeeklyMenu(nextMenu);
  };

  // Auto-fill active day with balanced recipes
  const handleAutoFillDay = () => {
    if (recipes.length === 0) return;

    const pickRandom = (pool, excludeIds) => {
      const filtered = pool.filter(r => !excludeIds.has(r.id));
      const list = filtered.length > 0 ? filtered : pool;
      if (list.length === 0) return null;
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    };

    const usedIds = new Set();
    const breakfastPool = recipes.filter(r => isRecipeRecommendedForSlot(r, 'breakfast'));
    const lunchPool = recipes.filter(r => isRecipeRecommendedForSlot(r, 'lunch'));
    const dinnerPool = recipes.filter(r => isRecipeRecommendedForSlot(r, 'dinner'));

    const bRecipe = pickRandom(breakfastPool.length > 0 ? breakfastPool : recipes, usedIds);
    if (bRecipe) usedIds.add(bRecipe.id);

    const lRecipe = pickRandom(lunchPool.length > 0 ? lunchPool : recipes, usedIds);
    if (lRecipe) usedIds.add(lRecipe.id);

    const dRecipe = pickRandom(dinnerPool.length > 0 ? dinnerPool : recipes, usedIds);
    if (dRecipe) usedIds.add(dRecipe.id);

    const nextMenu = {
      ...weeklyMenu,
      [activeDay]: {
        ...weeklyMenu[activeDay],
        breakfast: bRecipe ? { recipeId: bRecipe.id, servings: 2 } : weeklyMenu[activeDay]?.breakfast,
        lunch: lRecipe ? { recipeId: lRecipe.id, servings: 2 } : weeklyMenu[activeDay]?.lunch,
        dinner: dRecipe ? { recipeId: dRecipe.id, servings: 2 } : weeklyMenu[activeDay]?.dinner
      }
    };
    saveWeeklyMenu(nextMenu);
  };

  // Clear active day
  const handleClearDay = () => {
    const nextMenu = {
      ...weeklyMenu,
      [activeDay]: { breakfast: null, lunch: null, dinner: null, snack: null }
    };
    saveWeeklyMenu(nextMenu);
  };

  // Clear entire week
  const handleClearWeek = () => {
    if (window.confirm(t('weekly_planner.confirm_clear_week'))) {
      saveWeeklyMenu(EMPTY_WEEK_MENU);
    }
  };

  // Count total planned meals across the week and per day
  const totalPlannedMeals = useMemo(() => {
    let count = 0;
    DAY_KEYS.forEach(d => {
      MEAL_SLOTS.forEach(s => {
        const entry = weeklyMenu[d]?.[s.id];
        if (entry?.recipeId && recipesById[entry.recipeId]) {
          count += 1;
        }
      });
    });
    return count;
  }, [weeklyMenu, recipesById]);

  const activeDayPlannedCount = useMemo(() => {
    let count = 0;
    MEAL_SLOTS.forEach(s => {
      const entry = weeklyMenu[activeDay]?.[s.id];
      if (entry?.recipeId && recipesById[entry.recipeId]) {
        count += 1;
      }
    });
    return count;
  }, [weeklyMenu, activeDay, recipesById]);

  // Filtered recipes for the Picker Modal
  const pickerRecipes = useMemo(() => {
    if (!pickerSlot) return [];
    let list = [...recipes];

    if (pickerFilter === 'recommended') {
      const rec = list.filter(r => isRecipeRecommendedForSlot(r, pickerSlot));
      if (rec.length > 0) list = rec;
    } else if (pickerFilter === 'saved') {
      const savedSet = new Set(savedRecipeIds);
      list = list.filter(r => savedSet.has(r.id));
    }

    if (pickerSearch.trim()) {
      const keywords = pickerSearch
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      list = list.filter(r => matchesRecipeSearch(r, keywords, ingredientsList, 'every'));
    }

    list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    return list;
  }, [recipes, pickerSlot, pickerFilter, savedRecipeIds, pickerSearch, ingredientsList]);

  // Convert amount to grams/ml when possible
  const convertToBaseGrams = (amount, unitId, dbIng = null) => {
    if (!unitId || !amount) return amount || 0;
    const norm = normalizeUnitId(unitId);

    const canonical = normalizeToCanonical({ amount, unitId: norm });
    if (canonical.unit === 'g' || canonical.unit === 'ml') {
      return canonical.amount;
    }

    if (dbIng?.units_mapping && Array.isArray(dbIng.units_mapping)) {
      const mapEntry = dbIng.units_mapping.find(
        m => normalizeUnitId(m.unit_id) === norm || m.unit_id === unitId
      );
      if (mapEntry && (mapEntry.weight_grams || mapEntry.to_g)) {
        return amount * (mapEntry.weight_grams || mapEntry.to_g);
      }
    }

    const unitObj = unitsMap[unitId] || unitsMap[norm];
    if (unitObj) {
      const toG = unitObj.conversions?.metric?.to_g_average || unitObj.base_weight_grams;
      if (toG !== undefined && toG !== null && toG > 0) return amount * toG;
      const toMl = unitObj.conversions?.metric?.to_ml;
      if (toMl !== undefined && toMl !== null && toMl > 0) return amount * toMl;
    }
    return null;
  };

  // Calculate missing ingredients for the week or active day
  const handleOpenShoppingModal = (scope = 'week') => {
    const targetDays = scope === 'day' ? [activeDay] : DAY_KEYS;
    const aggregatedMap = {};

    targetDays.forEach(d => {
      MEAL_SLOTS.forEach(s => {
        const slotEntry = weeklyMenu[d]?.[s.id];
        if (!slotEntry?.recipeId) return;
        const recipe = recipesById[slotEntry.recipeId];
        if (!recipe || !Array.isArray(recipe.ingredients)) return;

        const servings = Math.max(1, Number(slotEntry.servings) || 2);

        recipe.ingredients.forEach(reqIng => {
          if (reqIng.type === 'sub_recipe') return;
          if (isPantryStaple(reqIng)) return;

          const rawAmount = (parseFloat(reqIng.amount) || 0) * servings;
          if (rawAmount <= 0) return;

          const origUnit = reqIng.unit_id || reqIng.unit || 'g';
          const normUnit = normalizeUnitId(origUnit);

          const dbIng = (ingredientsList || []).find(
            i =>
              i.id === reqIng.ingredient_id ||
              i.slug === reqIng.ingredient_id ||
              (reqIng.id && (i.id === reqIng.id || i.slug === reqIng.id))
          );

          const key = String(
            dbIng?.id ||
              reqIng.ingredient_id ||
              reqIng.ingredient_en ||
              reqIng.ingredient_bg ||
              reqIng.name ||
              ''
          )
            .toLowerCase()
            .trim();
          if (!key) return;

          const isLiquid = dbIng?.meta?.is_liquid === true;
          const baseGrams = convertToBaseGrams(rawAmount, origUnit, dbIng);

          const nameBg =
            reqIng.ingredient_bg || reqIng.name_bg || dbIng?.name_bg || reqIng.ingredient_id || key;
          const nameEn =
            reqIng.ingredient_en || reqIng.name_en || dbIng?.name_en || reqIng.ingredient_id || key;
          const localizedName =
            getLocalizedField(reqIng, 'ingredient', currentLang) ||
            getLocalizedField(reqIng, 'name', currentLang) ||
            getLocalizedField(dbIng, 'name', currentLang) ||
            (currentLang === 'bg' ? nameBg : nameEn) ||
            key;

          if (!aggregatedMap[key]) {
            aggregatedMap[key] = {
              key,
              ingredient_id: dbIng?.id || reqIng.ingredient_id || key,
              reqIngSample: reqIng,
              dbIng,
              nameBg,
              nameEn,
              name: localizedName,
              isLiquid,
              useBaseGrams: baseGrams !== null,
              totalBaseGrams: baseGrams !== null ? baseGrams : 0,
              discreteQty: baseGrams === null ? rawAmount : 0,
              discreteUnit: normUnit || origUnit
            };
          } else {
            const entry = aggregatedMap[key];
            if (entry.useBaseGrams && baseGrams !== null) {
              entry.totalBaseGrams += baseGrams;
            } else {
              entry.useBaseGrams = false;
              entry.discreteQty += rawAmount;
            }
          }
        });
      });
    });

    const entries = Object.values(aggregatedMap);
    if (entries.length === 0 && totalPlannedMeals === 0) {
      alert(t('weekly_planner.no_planned_meals'));
      return;
    }

    // Deduct available pantry quantities and check existing shoppingList
    const missingCandidates = [];
    entries.forEach(item => {
      const pantryItem = (pantry || []).find(p =>
        matchesPantryItem(item.reqIngSample, p)
      );
      const pantryQty = pantryItem ? parseFloat(pantryItem.quantity) || 0 : 0;
      const pantryUnit = pantryItem ? pantryItem.unit || pantryItem.unit_id || '' : '';

      const cartItem = (shoppingList || []).find(ex => {
        const exId = String(ex.ingredient_id || ex.id || '').toLowerCase();
        const itemId = String(item.ingredient_id || item.key || '').toLowerCase();
        if (exId && itemId && exId === itemId) return true;
        return matchesPantryItem(item.reqIngSample, {
          ingredientId: ex.ingredient_id || ex.id,
          name: ex.nameBg || ex.nameEn || ex.name
        });
      });
      const cartQty = cartItem
        ? parseFloat(cartItem.quantityToBuy ?? cartItem.amount ?? 0) || 0
        : 0;
      const cartUnit = cartItem ? cartItem.unit || cartItem.unit_id || '' : '';

      if (item.useBaseGrams) {
        const pantryGrams = pantryItem
          ? convertToBaseGrams(pantryQty, pantryUnit, item.dbIng) || 0
          : 0;
        const neededAfterPantry = item.totalBaseGrams - pantryGrams;
        if (neededAfterPantry > 1) {
          const finalUnit = item.isLiquid ? 'ml' : 'g';
          const totalNeededRounded = Math.round(neededAfterPantry);
          const inCartGrams = cartItem
            ? convertToBaseGrams(cartQty, cartUnit, item.dbIng) || 0
            : 0;
          const inCartRounded = Math.round(inCartGrams);
          const remainingGrams = Math.round(neededAfterPantry - inCartGrams);
          const alreadyInCart = inCartRounded > 0 && remainingGrams <= 1;

          missingCandidates.push({
            id: item.ingredient_id,
            ingredient_id: item.ingredient_id,
            nameBg: item.nameBg,
            nameEn: item.nameEn,
            name: item.name,
            quantityToBuy: alreadyInCart
              ? totalNeededRounded
              : remainingGrams > 0
              ? remainingGrams
              : totalNeededRounded,
            unit: finalUnit,
            unit_id: finalUnit,
            inCartQty: inCartRounded,
            alreadyInCart,
            checked: !alreadyInCart
          });
        }
      } else {
        const normPantry = normalizeUnitId(pantryUnit);
        const normItem = normalizeUnitId(item.discreteUnit);
        const neededDiscrete =
          pantryItem && normPantry === normItem
            ? item.discreteQty - pantryQty
            : item.discreteQty;
        if (neededDiscrete > 0) {
          const normCart = normalizeUnitId(cartUnit);
          const inCartDiscrete =
            cartItem && normCart === normItem ? Number(cartQty.toFixed(1)) : 0;
          const remainingDiscrete = Number((neededDiscrete - inCartDiscrete).toFixed(1));
          const alreadyInCart = inCartDiscrete > 0 && remainingDiscrete <= 0;
          const totalDiscreteRounded = Number(neededDiscrete.toFixed(1));

          missingCandidates.push({
            id: item.ingredient_id,
            ingredient_id: item.ingredient_id,
            nameBg: item.nameBg,
            nameEn: item.nameEn,
            name: item.name,
            quantityToBuy: alreadyInCart
              ? totalDiscreteRounded
              : remainingDiscrete > 0
              ? remainingDiscrete
              : totalDiscreteRounded,
            unit: item.discreteUnit,
            unit_id: item.discreteUnit,
            inCartQty: inCartDiscrete,
            alreadyInCart,
            checked: !alreadyInCart
          });
        }
      }
    });

    // Sort so items that need adding (checked: true) appear first, and already-in-cart items below
    missingCandidates.sort((a, b) => Number(b.checked) - Number(a.checked));

    setShoppingCandidates(missingCandidates);
    setShoppingModalOpen(true);
  };

  // Confirm adding selected candidates into shoppingList
  const handleConfirmAddToShoppingList = () => {
    const selected = shoppingCandidates.filter(c => c.checked);
    if (selected.length === 0) {
      setShoppingModalOpen(false);
      return;
    }

    const updated = [...(shoppingList || [])];
    selected.forEach(newItem => {
      const existingIdx = updated.findIndex(ex => {
        const exId = String(ex.ingredient_id || ex.id || ex.name || '').toLowerCase();
        const newId = String(newItem.ingredient_id || newItem.id || newItem.name || '').toLowerCase();
        return exId && newId && exId === newId;
      });

      if (existingIdx !== -1) {
        const ex = updated[existingIdx];
        const exUnit = normalizeUnitId(ex.unit || ex.unit_id || 'g');
        const newUnit = normalizeUnitId(newItem.unit || newItem.unit_id || 'g');
        const exQty = Number(ex.quantityToBuy ?? ex.amount ?? 0);
        const addQty = Number(newItem.quantityToBuy ?? 0);

        if (exUnit === newUnit) {
          updated[existingIdx] = {
            ...ex,
            quantityToBuy: Number((exQty + addQty).toFixed(1)),
            checked: false
          };
        } else if (
          (exUnit === 'kg' && newUnit === 'g') ||
          (exUnit === 'l' && newUnit === 'ml')
        ) {
          const totalBase = exQty * 1000 + addQty;
          updated[existingIdx] = {
            ...ex,
            unit: newUnit,
            unit_id: newUnit,
            quantityToBuy: Math.round(totalBase),
            checked: false
          };
        } else {
          updated[existingIdx] = {
            ...ex,
            quantityToBuy: Number((exQty + addQty).toFixed(1)),
            checked: false
          };
        }
      } else {
        updated.push({
          ingredient_id: newItem.ingredient_id,
          nameBg: newItem.nameBg,
          nameEn: newItem.nameEn,
          name: newItem.name,
          quantityToBuy: newItem.quantityToBuy,
          unit: newItem.unit,
          unit_id: newItem.unit_id,
          checked: false
        });
      }
    });

    setShoppingList(updated);
    setShoppingModalOpen(false);
    showToast(t('weekly_planner.added_toast', { count: selected.length }));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] bg-surface-dark border-2 border-primary text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[416px] w-[92%]">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <span className="text-xs font-extrabold flex-1">{toastMessage}</span>
          <button
            onClick={() => navigate('/saved')}
            className="px-3 py-1.5 rounded-xl bg-primary text-background-dark text-[11px] font-black shrink-0 cursor-pointer"
          >
            {t('weekly_planner.go_to_shopping_list')}
          </button>
        </div>
      )}

      {/* Header Section */}
      <header className="sticky top-0 z-20 flex items-center bg-surface-dark/95 backdrop-blur-md p-4 border-b border-primary/20 justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-primary text-[10px] font-bold uppercase tracking-widest">
            {t('weekly_planner.subtitle')}
          </h1>
          <h2 className="text-slate-100 text-lg font-extrabold leading-tight">
            {t('weekly_planner.title')}
          </h2>
        </div>
        <button
          onClick={() => navigate('/saved')}
          className="text-primary hover:bg-primary/15 transition-colors bg-primary/10 border border-primary/30 rounded-full size-10 flex items-center justify-center cursor-pointer"
          title={t('weekly_planner.go_to_shopping_list')}
        >
          <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
        </button>
      </header>

      {/* 7-Day Selector Grid (No Horizontal Scrollbar) */}
      <div className="bg-surface-dark border-b border-primary/15 px-3 py-3.5 shadow-inner">
        <div className="max-w-3xl mx-auto grid grid-cols-7 gap-1.5">
          {days.map(day => {
            const isActive = activeDay === day.id;
            const daySlots = weeklyMenu[day.id] || {};
            const filledCount = MEAL_SLOTS.filter(
              s => daySlots[s.id]?.recipeId && recipesById[daySlots[s.id].recipeId]
            ).length;

            return (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-gradient-to-b from-primary to-[#b8860b] text-background-dark shadow-lg'
                    : day.isToday
                    ? 'border-2 border-primary/60 bg-background-dark text-slate-100'
                    : 'border border-primary/25 bg-background-dark text-slate-300 hover:border-primary/50'
                }`}
              >
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-tighter ${
                    isActive ? 'text-background-dark' : 'text-primary'
                  }`}
                >
                  {t(`weekly_planner.days_short.${day.id}`)}
                </span>
                <span className="text-sm sm:text-base font-black leading-tight mt-0.5">
                  {day.dateNum}
                </span>
                {/* Dots indicating planned meals */}
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {[1, 2, 3, 4].map(idx => (
                    <span
                      key={idx}
                      className={`size-1 rounded-full ${
                        idx <= filledCount
                          ? isActive
                            ? 'bg-background-dark'
                            : 'bg-primary'
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-5 max-w-3xl mx-auto w-full flex flex-col gap-5">
        {/* Active Day Header & Quick Actions */}
        <div className="flex flex-col gap-3 border-b border-primary/15 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-slate-100 text-2xl font-extrabold tracking-tight">
                {t(`weekly_planner.days_full.${activeDay}`)}
              </h2>
              <p className="text-xs font-bold text-primary/80 mt-0.5">
                {t('weekly_planner.planned_week_count', { count: totalPlannedMeals })}
              </p>
            </div>
            {totalPlannedMeals > 0 && (
              <button
                onClick={handleClearWeek}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-[11px] font-extrabold transition-colors cursor-pointer"
              >
                {t('weekly_planner.clear_week')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleAutoFillDay}
              className="px-3.5 py-2.5 rounded-2xl bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span className="truncate">{t('weekly_planner.auto_fill_day')}</span>
            </button>
            <button
              onClick={handleClearDay}
              disabled={activeDayPlannedCount === 0}
              className="px-3.5 py-2.5 rounded-2xl bg-surface-dark hover:bg-rose-500/15 border border-primary/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 disabled:opacity-40 disabled:pointer-events-none text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              <span className="truncate">{t('weekly_planner.clear_day')}</span>
            </button>
          </div>
        </div>

        {/* Meal Slots for Active Day */}
        <div className="flex flex-col gap-4">
          {MEAL_SLOTS.map(slot => {
            const slotEntry = weeklyMenu[activeDay]?.[slot.id];
            const recipe = slotEntry?.recipeId ? recipesById[slotEntry.recipeId] : null;
            const slotLabel = t(`weekly_planner.slots.${slot.id}`);
            const servings = slotEntry?.servings || 2;

            if (!recipe) {
              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    setPickerSlot(slot.id);
                    setPickerFilter('recommended');
                    setPickerSearch('');
                  }}
                  className="group relative flex flex-col gap-2 rounded-2xl border-2 border-dashed border-primary/30 p-5 bg-surface-dark/40 hover:bg-primary/10 hover:border-primary/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">
                        {slot.icon}
                      </span>
                      <span className="text-xs font-extrabold text-primary uppercase tracking-widest">
                        {slotLabel}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-primary/70 group-hover:scale-110 transition-transform">
                      add_circle
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                    + {t('weekly_planner.add_recipe_to_slot', { slot: slotLabel })}
                  </p>
                </div>
              );
            }

            const title =
              getLocalizedField(recipe, 'title', currentLang) ||
              recipe.title_bg ||
              recipe.title_en ||
              '';
            const desc =
              getLocalizedField(recipe, 'description', currentLang) ||
              recipe.description_bg ||
              recipe.description_en ||
              '';
            const totalTime = getRecipeTotalTime(recipe);
            const calories = Number(recipe.calories_per_portion || recipe.calories || 0);

            return (
              <div
                key={slot.id}
                className="group relative flex flex-col gap-3 rounded-2xl bg-surface-dark p-4 border border-primary/25 shadow-lg hover:border-primary/50 transition-all"
              >
                {/* Slot Top Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                      {slot.icon}
                    </span>
                    <span className="text-xs font-extrabold text-primary uppercase tracking-widest">
                      {slotLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setPickerSlot(slot.id);
                        setPickerFilter('recommended');
                        setPickerSearch('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">swap_horiz</span>
                      <span>{t('weekly_planner.change_recipe')}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title={t('weekly_planner.remove_recipe')}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>

                {/* Recipe Info Row */}
                <div
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="flex items-center gap-3.5 cursor-pointer"
                >
                  <img
                    src={getRecipeImageUrl(recipe)}
                    alt={title}
                    className="size-16 sm:size-20 rounded-xl object-cover shadow-md border border-primary/25 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    {desc && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{desc}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold text-primary/90">
                      {totalTime > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {totalTime} {t('weekly_planner.min_suffix')}
                        </span>
                      )}
                      {calories > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-400/90">
                          <span className="material-symbols-outlined text-xs">
                            local_fire_department
                          </span>
                          {calories} {t('weekly_planner.kcal_suffix')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Servings Control Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-primary/10">
                  <span className="text-xs font-bold text-slate-300">
                    {t('weekly_planner.servings_label')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChangeServings(slot.id, -1)}
                      className="size-7 rounded-lg bg-background-dark border border-primary/30 text-primary font-black flex items-center justify-center hover:bg-primary/15 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold text-slate-100 min-w-[24px] text-center">
                      {servings}
                    </span>
                    <button
                      onClick={() => handleChangeServings(slot.id, 1)}
                      className="size-7 rounded-lg bg-background-dark border border-primary/30 text-primary font-black flex items-center justify-center hover:bg-primary/15 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shopping List Action Buttons */}
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            onClick={() => handleOpenShoppingModal('week')}
            className="w-full py-4 px-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-2xl flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-[0_10px_30px_rgba(212,175,53,0.25)] hover:opacity-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            <span className="text-sm sm:text-base uppercase tracking-wider">
              {t('weekly_planner.generate_week_list')}
            </span>
          </button>

          {activeDayPlannedCount > 0 && (
            <button
              onClick={() => handleOpenShoppingModal('day')}
              className="w-full py-3 px-4 bg-surface-dark border border-primary/35 hover:border-primary text-primary font-extrabold rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">today</span>
              <span>
                {t('weekly_planner.generate_day_list', {
                  day: t(`weekly_planner.days_full.${activeDay}`)
                })}
              </span>
            </button>
          )}
        </div>
      </main>

      {/* =====================================================================
          MODAL 1: RECIPE PICKER FOR SELECTED MEAL SLOT
         ===================================================================== */}
      {pickerSlot && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-dark border border-primary/30 w-full max-w-[416px] rounded-3xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-primary/20 flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-100 truncate">
                {t('weekly_planner.modal_select_title', {
                  slot: t(`weekly_planner.slots.${pickerSlot}`),
                  day: t(`weekly_planner.days_full.${activeDay}`)
                })}
              </h3>
              <button
                onClick={() => setPickerSlot(null)}
                className="size-8 rounded-full bg-background-dark text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div className="p-4 border-b border-primary/15 flex flex-col gap-3">
              <div className="relative w-full">
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={t('weekly_planner.search_placeholder')}
                  className="w-full bg-background-dark border border-primary/30 rounded-2xl py-2.5 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-lg">
                  search
                </span>
                {pickerSearch && (
                  <button
                    onClick={() => setPickerSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'recommended', label: t('weekly_planner.filter_recommended') },
                  { key: 'saved', label: t('weekly_planner.filter_saved') },
                  { key: 'all', label: t('weekly_planner.filter_all') }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPickerFilter(tab.key)}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer truncate ${
                      pickerFilter === tab.key
                        ? 'bg-primary text-background-dark border-primary'
                        : 'bg-background-dark border-primary/20 text-slate-300 hover:border-primary/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipes List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-xs">...</div>
              ) : pickerRecipes.length > 0 ? (
                pickerRecipes.map(r => {
                  const rTitle =
                    getLocalizedField(r, 'title', currentLang) || r.title_bg || r.title_en || '';
                  const rTime = getRecipeTotalTime(r);
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRecipeForSlot(r.id)}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-background-dark/80 hover:bg-primary/15 border border-primary/15 hover:border-primary transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getRecipeImageUrl(r)}
                          alt={rTitle}
                          className="size-13 rounded-xl object-cover border border-primary/25 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-100 line-clamp-2">
                            {rTitle}
                          </h4>
                          {rTime > 0 && (
                            <span className="text-[10px] font-bold text-primary/80">
                              {rTime} {t('weekly_planner.min_suffix')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-primary text-background-dark text-xs font-extrabold shrink-0">
                        {t('weekly_planner.select_btn')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  {t('weekly_planner.empty_recipes')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: SHOPPING LIST PREVIEW & CONFIRMATION
         ===================================================================== */}
      {shoppingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-dark border border-primary/30 w-full max-w-[416px] rounded-3xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-primary/20 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-100">
                  {t('weekly_planner.shopping_modal_title')}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t('weekly_planner.shopping_modal_subtitle')}
                </p>
              </div>
              <button
                onClick={() => setShoppingModalOpen(false)}
                className="size-8 rounded-full bg-background-dark text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {shoppingCandidates.length > 0 ? (
              <>
                <div className="px-4 py-2.5 bg-background-dark/60 border-b border-primary/10 flex items-center justify-between shrink-0">
                  <button
                    onClick={() => {
                      const allChecked = shoppingCandidates.every(c => c.checked);
                      setShoppingCandidates(prev =>
                        prev.map(c => ({ ...c, checked: !allChecked }))
                      );
                    }}
                    className="text-xs font-extrabold text-primary hover:underline cursor-pointer"
                  >
                    {shoppingCandidates.every(c => c.checked)
                      ? t('weekly_planner.deselect_all')
                      : t('weekly_planner.select_all')}
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    {shoppingCandidates.filter(c => c.checked).length} / {shoppingCandidates.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2">
                  {shoppingCandidates.map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        item.checked
                          ? 'bg-background-dark border-primary/35 text-slate-100'
                          : 'bg-background-dark/40 border-white/5 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() =>
                            setShoppingCandidates(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c))
                            )
                          }
                          className="size-4 accent-[#d4af35] rounded cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold truncate">{item.name}</span>
                          {item.alreadyInCart ? (
                            <span className="text-[10px] font-bold text-emerald-400">
                              ✓{' '}
                              {t('weekly_planner.already_in_cart_badge', {
                                qty: item.inCartQty,
                                unit: item.unit
                              })}
                            </span>
                          ) : item.inCartQty > 0 ? (
                            <span className="text-[10px] font-bold text-amber-400">
                              {t('weekly_planner.partial_in_cart_badge', {
                                qty: item.inCartQty,
                                unit: item.unit
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-primary shrink-0">
                        {item.quantityToBuy} {item.unit}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="p-3.5 border-t border-primary/20 bg-surface-dark shrink-0">
                  <button
                    onClick={handleConfirmAddToShoppingList}
                    disabled={shoppingCandidates.filter(c => c.checked).length === 0}
                    className="w-full py-3.5 px-3 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-2xl text-xs sm:text-sm uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow-lg"
                  >
                    {t('weekly_planner.confirm_add_to_cart', {
                      count: shoppingCandidates.filter(c => c.checked).length
                    })}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-4xl">
                  inventory
                </span>
                <p className="text-sm font-extrabold text-slate-100">
                  {t('weekly_planner.all_in_pantry_title')}
                </p>
                <p className="text-xs text-slate-400">{t('weekly_planner.all_in_pantry_desc')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMenuPlanner;

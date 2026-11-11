/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { mockRecipes } from '../data/mockRecipes';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [pantry, setPantry] = useState([]);
  const [shoppingList, setShoppingListState] = useState([]);

  // Sync shopping list from Firestore (or localStorage for guests)
  useEffect(() => {
    if (!user || user.role === 'guest') {
      const timer = setTimeout(() => {
        try {
          const local = localStorage.getItem('shopping_list');
          setShoppingListState(local ? JSON.parse(local) : []);
        } catch (err) {
          console.warn("Failed to load shopping list from localStorage:", err);
          setShoppingListState([]);
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setShoppingListState(data.shopping_list || []);
      } else {
        setShoppingListState([]);
      }
    }, (error) => {
      console.error("Error fetching shopping list from Firestore:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const setShoppingList = async (newListOrFn) => {
    let newList;
    if (typeof newListOrFn === 'function') {
      newList = newListOrFn(shoppingList);
    } else {
      newList = newListOrFn;
    }

    if (!user || user.role === 'guest') {
      setShoppingListState(newList);
      try {
        localStorage.setItem('shopping_list', JSON.stringify(newList));
      } catch (err) {
        console.warn("Failed to save shopping list to localStorage:", err);
      }
    } else {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          shopping_list: newList
        });
      } catch (err) {
        console.error("Error saving shopping list to Firestore:", err);
      }
    }
  };

  // Sync pantry from Firestore
  useEffect(() => {
    if (!user || user.role === 'guest') {
      const timer = setTimeout(() => {
        setPantry([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const pantryRef = collection(db, 'users', user.uid, 'pantry');
    const unsubscribe = onSnapshot(pantryRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPantry(items);
    }, (error) => {
      console.error("Error fetching pantry:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const addPantryItem = async (item) => {
    if (!user || user.role === 'guest') return;
    try {
      const pantryRef = collection(db, 'users', user.uid, 'pantry');
      await addDoc(pantryRef, {
        ...item,
        addedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error adding pantry item:", err);
    }
  };

  const updatePantryItem = async (id, data) => {
    if (!user || user.role === 'guest') return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'pantry', id);
      await updateDoc(itemRef, data);
    } catch (err) {
      console.error("Error updating pantry item:", err);
    }
  };

  const removePantryItem = async (id) => {
    if (!user || user.role === 'guest') return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'pantry', id);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error("Error deleting pantry item:", err);
    }
  };

  // Helper to convert between compatible metric/common units when merging or deducting pantry quantities
  const convertToTargetUnit = (qty, fromUnit, toUnit) => {
    const amount = Number(qty) || 0;
    const f = String(fromUnit || 'g').toLowerCase().trim();
    const t = String(toUnit || 'g').toLowerCase().trim();
    if (f === t) return amount;
    if ((f === 'kg' || f === 'кг' || f === 'кг.') && (t === 'g' || t === 'гр' || t === 'гр.')) return amount * 1000;
    if ((f === 'g' || f === 'гр' || f === 'гр.') && (t === 'kg' || t === 'кг' || t === 'кг.')) return amount / 1000;
    if ((f === 'l' || f === 'л' || f === 'л.') && (t === 'ml' || t === 'мл' || t === 'мл.')) return amount * 1000;
    if ((f === 'ml' || f === 'мл' || f === 'мл.') && (t === 'l' || t === 'л' || t === 'л.')) return amount / 1000;
    return null; // incompatible units
  };

  // Smart Upsert: merges quantity if item already exists in Pantry, or adds with full metadata & shelf life
  const upsertPantryItem = async (itemPayload, dbIngredient = null) => {
    if (!user || user.role === 'guest') return null;

    const ingId = dbIngredient?.id || itemPayload.ingredientId || itemPayload.ingredient_id || itemPayload.id || '';
    const shelfDays = Number(dbIngredient?.meta?.average_shelf_life_days || itemPayload.shelfLifeDays || 7);
    const defaultExpDate = new Date();
    defaultExpDate.setDate(defaultExpDate.getDate() + shelfDays);
    const expDateStr = itemPayload.expirationDate || defaultExpDate.toISOString().split('T')[0];

    const nameBg = dbIngredient?.name_bg || dbIngredient?.name?.bg || itemPayload.nameBg || itemPayload.name_bg || (typeof itemPayload.name === 'string' ? itemPayload.name : itemPayload.name?.bg) || '';
    const nameEn = dbIngredient?.name_en || dbIngredient?.name?.en || itemPayload.nameEn || itemPayload.name_en || (typeof itemPayload.name === 'string' ? itemPayload.name : itemPayload.name?.en) || nameBg;
    const nameEs = dbIngredient?.name_es || dbIngredient?.name?.es || itemPayload.nameEs || itemPayload.name_es || itemPayload.name?.es || nameEn;
    const nameIt = dbIngredient?.name_it || dbIngredient?.name?.it || itemPayload.nameIt || itemPayload.name_it || itemPayload.name?.it || nameEn;
    const nameFr = dbIngredient?.name_fr || dbIngredient?.name?.fr || itemPayload.nameFr || itemPayload.name_fr || itemPayload.name?.fr || nameEn;
    const nameDe = dbIngredient?.name_de || dbIngredient?.name?.de || itemPayload.nameDe || itemPayload.name_de || itemPayload.name?.de || nameEn;

    const incomingQty = Number(itemPayload.quantity ?? itemPayload.quantityToBuy ?? itemPayload.amount ?? 1) || 1;
    const incomingUnit = itemPayload.unit || itemPayload.unit_id || dbIngredient?.units_mapping?.[0]?.unit_id || 'pcs';
    const category = dbIngredient?.classification?.main_group || itemPayload.category || 'other';

    // Check if item already exists in Pantry
    const existing = (pantry || []).find(p => {
      if (ingId && p.ingredientId && String(p.ingredientId) === String(ingId)) return true;
      const pBg = String(p.nameBg || p.name?.bg || '').toLowerCase().trim();
      const pEn = String(p.nameEn || p.name?.en || '').toLowerCase().trim();
      if (nameBg && pBg && pBg === nameBg.toLowerCase().trim()) return true;
      if (nameEn && pEn && pEn === nameEn.toLowerCase().trim()) return true;
      return false;
    });

    if (existing) {
      const converted = convertToTargetUnit(incomingQty, incomingUnit, existing.unit);
      if (converted !== null) {
        const nextQty = Number(((Number(existing.quantity) || 0) + converted).toFixed(2));
        await updatePantryItem(existing.id, {
          quantity: nextQty,
          expirationDate: expDateStr,
          category: existing.category && existing.category !== 'other' ? existing.category : category
        });
        return { action: 'updated', id: existing.id };
      }
    }

    await addPantryItem({
      ingredientId: ingId || `custom_${Date.now()}`,
      nameBg: nameBg || nameEn,
      nameEn: nameEn || nameBg,
      nameEs,
      nameIt,
      nameFr,
      nameDe,
      name: {
        bg: nameBg || nameEn,
        en: nameEn || nameBg,
        es: nameEs || nameEn,
        it: nameIt || nameEn,
        fr: nameFr || nameEn,
        de: nameDe || nameEn
      },
      category,
      quantity: Number(incomingQty.toFixed(2)),
      unit: incomingUnit,
      expirationDate: expDateStr
    });
    return { action: 'added' };
  };

  // Automatically deduct used recipe ingredients from Pantry after finishing cooking
  const deductRecipeFromPantry = async (recipeIngredients = [], scaleFactor = 1) => {
    if (!user || user.role === 'guest' || !Array.isArray(pantry) || pantry.length === 0) {
      return { deductedCount: 0, depletedCount: 0 };
    }
    let deductedCount = 0;
    let depletedCount = 0;

    for (const rIng of recipeIngredients) {
      if (!rIng || rIng.sub_recipe_id) continue;
      const rId = rIng.ingredient_id || rIng.id || '';
      const rNameBg = String(rIng.ingredient_bg || rIng.name_bg || rIng.name || '').toLowerCase().trim();
      const rNameEn = String(rIng.ingredient_en || rIng.name_en || rIng.name || '').toLowerCase().trim();

      const matchedPantryItem = pantry.find(p => {
        if (rId && p.ingredientId && String(p.ingredientId) === String(rId)) return true;
        const pBg = String(p.nameBg || p.name?.bg || '').toLowerCase().trim();
        const pEn = String(p.nameEn || p.name?.en || '').toLowerCase().trim();
        if (rNameBg && pBg && pBg === rNameBg) return true;
        if (rNameEn && pEn && pEn === rNameEn) return true;
        return false;
      });

      if (!matchedPantryItem) continue;

      const rawUsed = (Number(rIng.amount ?? rIng.quantity ?? 0) || 0) * (Number(scaleFactor) || 1);
      if (rawUsed <= 0) continue;

      const rUnit = rIng.unit_id || rIng.unit || matchedPantryItem.unit;
      const convertedUsed = convertToTargetUnit(rawUsed, rUnit, matchedPantryItem.unit);

      if (convertedUsed !== null) {
        const currentQty = Number(matchedPantryItem.quantity) || 0;
        const remaining = Number((currentQty - convertedUsed).toFixed(2));
        if (remaining <= 0.01) {
          await removePantryItem(matchedPantryItem.id);
          depletedCount++;
          deductedCount++;
        } else {
          await updatePantryItem(matchedPantryItem.id, { quantity: remaining });
          deductedCount++;
        }
      }
    }

    return { deductedCount, depletedCount };
  };

  const generateShoppingList = (missingItems) => {
    setShoppingList(prev => [...prev, ...missingItems]);
    alert(`Added ${missingItems.length} items to your shopping list!`);
  };

  return (
    <AppContext.Provider value={{
      pantry,
      addPantryItem,
      upsertPantryItem,
      deductRecipeFromPantry,
      updatePantryItem,
      removePantryItem,
      recipes: mockRecipes,
      shoppingList,
      setShoppingList,
      generateShoppingList
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

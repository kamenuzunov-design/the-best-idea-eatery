import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot, getDoc, updateDoc, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { getLocalizedCuisine } from '../data/cuisines';
import { translateTag, getRecipeTags } from '../lib/recipeMetaUtils';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import { getLocalizedField } from '../lib/localeUtils';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { findBestIngredientMatch } from '../lib/ingredientMatcher';
import { 
  normalizeUnitId, 
  convertQuantityToSystem, 
  formatQuantity, 
  roundCulinary 
} from '../lib/unitConverter';

const SavedRecipes = () => {
  const { shoppingList, setShoppingList, upsertPantryItem } = useAppContext();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'bg';

  const [savedRecipes, setSavedRecipes] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [measurementsDB, setMeasurementsDB] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [tempList, setTempList] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [movingToPantry, setMovingToPantry] = useState(false);
  const [pantrySuccessCount, setPantrySuccessCount] = useState(0);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customUnit, setCustomUnit] = useState('pcs');

  useEffect(() => {
    // Fetch ingredients for price calculation
    getDocs(collection(db, 'ingredients'))
      .then(snap => setIngredientsList(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => console.warn("Could not fetch ingredients for price calc"));

    // Fetch measurements for unit translation
    getDocs(collection(db, 'measurements'))
      .then(snap => setMeasurementsDB(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => console.warn("Could not fetch measurements for unit translation"));

    if (!user || user.role === 'guest') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
      if (userDoc.exists()) {
        const uData = userDoc.data();
        const recipeIds = uData.saved_recipes || [];
        
        if (recipeIds.length === 0) {
          setSavedRecipes([]);
          setLoading(false);
          return;
        }

        try {
          // Fetch recipes by ID
          const recipePromises = recipeIds.map(id => getDoc(doc(db, 'recipes', id)));
          const recipeDocs = await Promise.all(recipePromises);
          
          const fetchedRecipes = recipeDocs
            .filter(d => d.exists() && !d.data().is_deleted)
            .map(d => ({ id: d.id, ...d.data() }));
            
          setSavedRecipes(fetchedRecipes);
        } catch (error) {
          console.error("Error fetching saved recipes:", error);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const getUnitName = (unitId) => {
    if (!unitId) return '';
    const norm = normalizeUnitId(unitId);
    const key = `saved.units.${norm}`;
    if (i18n.exists(key)) {
      return t(key);
    }

    const found = measurementsDB.find(m => (
      m.unit_id === unitId || 
      m.id === unitId || 
      normalizeUnitId(m.unit_id || m.id || m.slug) === norm
    ));
    if (found) {
      return getLocalizedField(found, 'short_name', currentLang) || 
             getLocalizedField(found, 'name', currentLang) || 
             found.name_en || found.name_bg || found.name || norm;
    }
    return unitId;
  };

  const getItemName = (item) => {
    return getLocalizedField(item, 'name', currentLang)
      || getLocalizedField(item, 'ingredient', currentLang)
      || (currentLang === 'bg' ? (item.nameBg || item.ingredient_bg || item.name_bg) : (item.nameEn || item.ingredient_en || item.name_en))
      || item.nameEn
      || item.nameBg
      || item.name
      || item.ingredient_id
      || '';
  };

  const handleStartEdit = () => {
    setTempList(shoppingList.map((item, index) => {
      const qty = item.quantityToBuy !== undefined ? item.quantityToBuy : (item.amount || 0);
      const unit = item.unit || item.unit_id || 'g';
      const dbIng = ingredientsList.find(i => i.id === item.ingredient_id || i.id === item.id);
      const isLiquid = dbIng?.meta?.is_liquid === true || ['ml', 'l', 'fl_oz'].includes(normalizeUnitId(unit));
      const formatted = formatShoppingItem(qty, unit, isLiquid);
      const resolvedName = getItemName(item);
      return {
        ...item,
        name: resolvedName,
        nameBg: item.nameBg || item.ingredient_bg || item.name_bg || resolvedName,
        nameEn: item.nameEn || item.ingredient_en || item.name_en || resolvedName,
        quantityToBuy: Number(formatted.qty) || formatted.qty,
        unit: formatted.unit,
        checked: checkedItems.has(index)
      };
    }));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempList([]);
  };

  const handleSaveEdit = () => {
    const newChecked = new Set();
    const normalized = tempList.map((item, index) => {
      let qty = item.quantityToBuy;
      let unit = item.unit || 'g';
      if (unit === 'kg') {
        qty = qty * 1000;
        unit = 'g';
      } else if (unit === 'l') {
        qty = qty * 1000;
        unit = 'ml';
      }
      if (item.checked) {
        newChecked.add(index);
      }
      const rest = { ...item };
      delete rest.checked;
      return {
        ...rest,
        quantityToBuy: qty,
        unit: unit,
        unit_id: unit
      };
    });
    setShoppingList(normalized);
    setCheckedItems(newChecked);
    setIsEditing(false);
    setTempList([]);
  };

  const handleTempItemChange = (idx, field, value) => {
    const updated = [...tempList];
    if (field === 'quantityToBuy') {
      updated[idx][field] = Number(value) || 0;
    } else {
      updated[idx][field] = value;
    }
    setTempList(updated);
  };

  const handleDeleteTempItem = (idx) => {
    setTempList(prev => prev.filter((_, i) => i !== idx));
  };

  const moveTempListItem = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tempList.length - 1) return;
    
    const newTempList = [...tempList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedItem] = newTempList.splice(index, 1);
    newTempList.splice(targetIndex, 0, movedItem);
    setTempList(newTempList);
  };

  const moveShoppingListItem = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === shoppingList.length - 1) return;
    
    const newList = [...shoppingList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);
    setShoppingList(newList);

    const newCheckedItems = new Set();
    checkedItems.forEach(itemIndex => {
      if (itemIndex === index) {
        newCheckedItems.add(targetIndex);
      } else if (itemIndex === targetIndex) {
        newCheckedItems.add(index);
      } else {
        newCheckedItems.add(itemIndex);
      }
    });
    setCheckedItems(newCheckedItems);
  };

  const toggleCheckedItem = (idx) => {
    const next = new Set(checkedItems);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setCheckedItems(next);
  };

  const getUnitOptions = (item) => {
    const standard = ['g', 'kg', 'ml', 'pcs', 'oz', 'fl_oz', 'lb'];
    const ing = ingredientsList.find(i => i.id === item.ingredient_id || i.id === item.id);
    const mapped = ing?.units_mapping?.map(u => u.unit_id) || [];
    const all = Array.from(new Set([
      ...mapped,
      ...(measurementsDB.map(m => m.unit_id || m.id)),
      ...standard
    ])).filter(Boolean);
    return all;
  };

  const formatShoppingItem = (rawQty, rawUnit, isLiquid = false) => {
    const qty = Number(rawQty) || 0;
    const norm = normalizeUnitId(rawUnit);
    const userSystem = user?.preferences?.unit_system || 'metric';

    if (userSystem === 'imperial') {
      const converted = convertQuantityToSystem({
        amount: qty,
        unitId: norm,
        targetSystem: 'imperial',
        isLiquid,
        preferLargeUnits: true
      });
      if (converted.unit === 'oz' && converted.amount >= 16) {
        return {
          qty: formatQuantity(roundCulinary(converted.amount / 16, 2)),
          unit: 'lb'
        };
      }
      return {
        qty: formatQuantity(converted.amount),
        unit: converted.unit
      };
    }

    // Target system is Metric:
    const converted = convertQuantityToSystem({
      amount: qty,
      unitId: norm,
      targetSystem: 'metric',
      isLiquid,
      preferLargeUnits: true
    });

    if (converted.unit === 'g' && converted.amount >= 1000) {
      return {
        qty: formatQuantity(roundCulinary(converted.amount / 1000, 2)),
        unit: 'kg'
      };
    }
    if (converted.unit === 'ml' && converted.amount >= 1000) {
      return {
        qty: formatQuantity(roundCulinary(converted.amount / 1000, 2)),
        unit: 'l'
      };
    }

    return {
      qty: formatQuantity(converted.amount),
      unit: converted.unit
    };
  };

  const handleUnsave = async (e, recipeId) => {
    e.stopPropagation();
    if (window.confirm(t('saved.confirm_unsave'))) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          saved_recipes: arrayRemove(recipeId)
        });
      } catch(err) {
        console.error(err);
      }
    }
  };

  const handleClearShoppingList = () => {
    if (window.confirm(t('saved.confirm_clear'))) {
      setShoppingList([]);
      setCheckedItems(new Set());
    }
  };

  const handleRemoveShoppingListItem = (idx) => {
    if (window.confirm(t('saved.confirm_remove_item'))) {
      const newList = shoppingList.filter((_, i) => i !== idx);
      setShoppingList(newList);

      // Adjust checkedItems indexes
      const newChecked = new Set();
      checkedItems.forEach(itemIndex => {
        if (itemIndex < idx) {
          newChecked.add(itemIndex);
        } else if (itemIndex > idx) {
          newChecked.add(itemIndex - 1);
        }
      });
      setCheckedItems(newChecked);
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newItem = {
      name: customName.trim(),
      nameBg: customName.trim(),
      nameEn: customName.trim(),
      quantityToBuy: parseFloat(customQty) || 1,
      unit: customUnit,
      unit_id: customUnit
    };

    setShoppingList([...shoppingList, newItem]);
    setCustomName('');
    setCustomQty('1');
    setCustomUnit('pcs');
  };

  const handleToggleAllChecked = () => {
    if (checkedItems.size === shoppingList.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(shoppingList.map((_, i) => i)));
    }
  };

  const handleMoveCheckedToPantry = async () => {
    if (checkedItems.size === 0 || movingToPantry) return;
    setMovingToPantry(true);
    try {
      const indicesToMove = Array.from(checkedItems);
      let moved = 0;

      for (const idx of indicesToMove) {
        const item = shoppingList[idx];
        if (!item) continue;
        let dbIng = ingredientsList.find(
          i => i.id === item.ingredient_id || i.id === item.id || i.id === item.ingredientId
        );
        if (!dbIng && ingredientsList.length > 0) {
          dbIng = findBestIngredientMatch(
            {
              name_bg: item.nameBg || item.name_bg || item.name,
              name_en: item.nameEn || item.name_en || item.name
            },
            ingredientsList
          );
        }
        await upsertPantryItem(
          {
            ...item,
            quantity: item.quantityToBuy !== undefined ? item.quantityToBuy : (item.amount || 1),
            unit: item.unit || item.unit_id || 'pcs'
          },
          dbIng
        );
        moved++;
      }

      const remainingList = shoppingList.filter((_, idx) => !checkedItems.has(idx));
      await setShoppingList(remainingList);
      setCheckedItems(new Set());
      setPantrySuccessCount(moved);
      setTimeout(() => setPantrySuccessCount(0), 6000);
    } catch (err) {
      console.error('Error moving checked items to pantry:', err);
    } finally {
      setMovingToPantry(false);
    }
  };

  return (
    <div className="flex-1 pb-32 px-4 py-8">
      <h2 className="text-3xl font-extrabold text-slate-100 mb-8 tracking-tight">{t('saved.title')}</h2>
      
      {/* Shopping List Section */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2 drop-shadow-sm">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            {t('saved.shopping_list')}
          </h3>
          <div className="flex gap-2 flex-wrap justify-end items-center">
            <button
              type="button"
              onClick={() => navigate('/scanner?mode=receipt')}
              className="text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/35 hover:bg-amber-500/25 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              title={t('saved.scan_receipt_btn')}
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              <span>{t('saved.scan_receipt_btn')}</span>
            </button>

            {shoppingList.length > 0 && (
              !isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAllChecked}
                    className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {checkedItems.size === shoppingList.length ? 'deselect' : 'done_all'}
                    </span>
                    {checkedItems.size === shoppingList.length ? t('saved.deselect_all_btn') : t('saved.select_all_btn')}
                  </button>
                  <button 
                    onClick={handleClearShoppingList}
                    className="text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    {t('saved.clear_btn')}
                  </button>
                  <button 
                    onClick={handleStartEdit}
                    className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    {t('saved.edit_btn')}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveEdit}
                    className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {t('saved.save_btn')}
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="text-xs font-bold uppercase tracking-wider bg-slate-700/50 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    {t('saved.cancel_btn')}
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* 1-Click Move Checked Items to Pantry Action Banner */}
        {!isEditing && checkedItems.size > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/15 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-semibold">
              <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0">inventory_2</span>
              <span>{t('saved.move_to_pantry_hint', { count: checkedItems.size })}</span>
            </div>
            <button
              type="button"
              onClick={handleMoveCheckedToPantry}
              disabled={movingToPantry}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className="material-symbols-outlined text-base font-black">
                {movingToPantry ? 'sync' : 'kitchen'}
              </span>
              <span>
                {movingToPantry
                  ? t('saved.moving_to_pantry')
                  : t('saved.move_to_pantry_btn', { count: checkedItems.size })}
              </span>
            </button>
          </div>
        )}

        {/* Success Toast after moving items to Pantry */}
        {pantrySuccessCount > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-3 text-emerald-300 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
              <span>{t('saved.moved_to_pantry_success', { count: pantrySuccessCount })}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/pantry')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer"
            >
              {t('saved.open_pantry_btn')}
            </button>
          </div>
        )}
        
        {shoppingList.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">remove_shopping_cart</span>
              <p className="text-slate-400 text-sm font-medium">{t('saved.empty_list')}</p>
            </div>
            
            {!isEditing && (
              <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-2 shadow-lg">
                <form onSubmit={handleAddCustomItem} className="flex flex-col gap-2 p-3 w-full">
                  <input 
                    type="text"
                    required
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder={t('saved.add_custom_placeholder')}
                    className="w-full bg-background-dark border border-primary/10 rounded-xl px-3 py-2 text-slate-100 text-sm font-semibold focus:border-primary/50 placeholder:text-slate-500 shadow-inner outline-none"
                  />
                  <div className="flex gap-2 justify-between items-center w-full">
                    <div className="flex-1 flex gap-2 items-center min-w-0">
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={customQty}
                        onChange={e => setCustomQty(e.target.value)}
                        placeholder={t('saved.qty_placeholder')}
                        className="w-16 bg-background-dark border border-primary/10 rounded-xl px-2 py-2 text-slate-100 text-center text-sm font-semibold focus:border-primary/50 shadow-inner outline-none shrink-0"
                      />
                      <select
                        value={customUnit}
                        onChange={e => setCustomUnit(e.target.value)}
                        className="flex-1 min-w-[70px] max-w-[120px] bg-background-dark border border-primary/10 rounded-xl px-2 py-2 text-slate-100 text-sm font-semibold focus:border-primary/50 shadow-inner outline-none"
                      >
                        <option value="pcs">{t('saved.units.pcs')}</option>
                        <option value="g">{t('saved.units.g')}</option>
                        <option value="kg">{t('saved.units.kg')}</option>
                        <option value="ml">{t('saved.units.ml')}</option>
                        <option value="l">{t('saved.units.l')}</option>
                        <option value="oz">{t('saved.units.oz')}</option>
                        <option value="fl_oz">{t('saved.units.fl_oz')}</option>
                        <option value="lb">{t('saved.units.lb')}</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-background-dark transition-all px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 shrink-0 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {t('saved.add_btn')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : isEditing ? (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-3 shadow-lg space-y-3">
            {tempList.map((item, index) => (
              <div key={index} className="flex flex-col border-b border-primary/5 pb-3 last:border-0 last:pb-0 gap-2">
                <div className="w-full">
                  <input 
                    type="text" 
                    value={item.name || getItemName(item)}
                    onChange={e => {
                      handleTempItemChange(index, 'name', e.target.value);
                      handleTempItemChange(index, currentLang === 'bg' ? 'nameBg' : 'nameEn', e.target.value);
                    }}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-2.5 text-slate-100 text-sm font-bold focus:border-primary shadow-inner"
                    placeholder={t('saved.item_name_placeholder')}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex-1 flex gap-2 items-center min-w-0">
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.quantityToBuy}
                      onChange={e => handleTempItemChange(index, 'quantityToBuy', e.target.value)}
                      className="w-16 bg-background-dark border border-primary/20 rounded-xl p-2 text-slate-100 text-center text-sm font-bold shadow-inner outline-none shrink-0"
                      placeholder={t('saved.qty_placeholder')}
                    />
                    <select 
                      value={item.unit || item.unit_id || 'g'}
                      onChange={e => handleTempItemChange(index, 'unit', e.target.value)}
                      className="flex-1 min-w-[70px] max-w-[120px] bg-background-dark border border-primary/20 rounded-xl p-2 text-slate-100 text-sm font-bold shadow-inner outline-none"
                    >
                      {getUnitOptions(item).map(u => (
                        <option key={u} value={u}>{getUnitName(u)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center shrink-0 w-6 justify-center">
                      <button
                        type="button"
                        onClick={() => moveTempListItem(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-5 w-5 flex items-center justify-center cursor-pointer"
                        title={t('saved.move_up')}
                      >
                        <span className="material-symbols-outlined text-[22px] select-none">arrow_drop_up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTempListItem(index, 'down')}
                        disabled={index === tempList.length - 1}
                        className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-5 w-5 flex items-center justify-center cursor-pointer"
                        title={t('saved.move_down')}
                      >
                        <span className="material-symbols-outlined text-[22px] select-none">arrow_drop_down</span>
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTempItem(index)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 cursor-pointer"
                      title={t('saved.delete_btn')}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-2 shadow-lg">
            {shoppingList.map((item, index) => {
              const name = getItemName(item);
              const isChecked = checkedItems.has(index);
              const rawQty = item.quantityToBuy !== undefined ? item.quantityToBuy : (item.amount || 0);
              const rawUnit = item.unit || item.unit_id || 'g';
              const dbIng = ingredientsList.find(i => i.id === item.ingredient_id || i.id === item.id);
              const isLiquid = dbIng?.meta?.is_liquid === true || ['ml', 'l', 'fl_oz'].includes(normalizeUnitId(rawUnit));
              const { qty, unit } = formatShoppingItem(rawQty, rawUnit, isLiquid);
              return (
                <div key={index} className="flex items-center justify-between border-b border-primary/10 p-3 last:border-0 hover:bg-white/5 rounded-xl transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <button 
                      onClick={() => toggleCheckedItem(index)}
                      className={`size-6 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer shrink-0 ${isChecked ? 'bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20' : 'border-primary/40 hover:border-primary'}`}
                    >
                      {isChecked && (
                        <span className="material-symbols-outlined text-base font-black">check</span>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-slate-100 text-base font-bold truncate transition-all ${isChecked ? 'line-through opacity-40 text-slate-400' : ''}`}>{name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`px-3 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary font-extrabold text-sm shadow-inner shrink-0 transition-all flex items-center gap-1 ${isChecked ? 'opacity-40' : ''}`}>
                      <span>{qty}</span>
                      <span className="text-[10px] text-primary/70">
                        {getUnitName(unit)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 w-6 justify-center">
                      <button
                        type="button"
                        onClick={() => moveShoppingListItem(index, 'up')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-5 w-5 flex items-center justify-center cursor-pointer"
                        title={t('saved.move_up')}
                      >
                        <span className="material-symbols-outlined text-[22px] select-none">arrow_drop_up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveShoppingListItem(index, 'down')}
                        disabled={index === shoppingList.length - 1}
                        className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-5 w-5 flex items-center justify-center cursor-pointer"
                        title={t('saved.move_down')}
                      >
                        <span className="material-symbols-outlined text-[22px] select-none">arrow_drop_down</span>
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleRemoveShoppingListItem(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/30 rounded-lg shrink-0 cursor-pointer"
                      title={t('saved.delete_btn')}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {!isEditing && (
              <form onSubmit={handleAddCustomItem} className="flex flex-col gap-2 p-3 border-t border-primary/10 mt-1 w-full">
                <input 
                  type="text"
                  required
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={t('saved.add_custom_placeholder')}
                  className="w-full bg-background-dark border border-primary/10 rounded-xl px-3 py-2 text-slate-100 text-sm font-semibold focus:border-primary/50 placeholder:text-slate-500 shadow-inner outline-none"
                />
                <div className="flex gap-2 justify-between items-center w-full">
                  <div className="flex-1 flex gap-2 items-center min-w-0">
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={customQty}
                      onChange={e => setCustomQty(e.target.value)}
                      placeholder={t('saved.qty_placeholder')}
                      className="w-16 bg-background-dark border border-primary/10 rounded-xl px-2 py-2 text-slate-100 text-center text-sm font-semibold focus:border-primary/50 shadow-inner outline-none shrink-0"
                    />
                    <select
                      value={customUnit}
                      onChange={e => setCustomUnit(e.target.value)}
                      className="flex-1 min-w-[70px] max-w-[120px] bg-background-dark border border-primary/10 rounded-xl px-2 py-2 text-slate-100 text-sm font-semibold focus:border-primary/50 shadow-inner outline-none"
                    >
                      <option value="pcs">{t('saved.units.pcs')}</option>
                      <option value="g">{t('saved.units.g')}</option>
                      <option value="kg">{t('saved.units.kg')}</option>
                      <option value="ml">{t('saved.units.ml')}</option>
                      <option value="l">{t('saved.units.l')}</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-background-dark transition-all px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 shrink-0 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('saved.add_btn')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Saved Recipes Section */}
      <div>
        <h3 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-primary text-2xl">bookmark</span>
          {t('saved.recipes')}
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
          </div>
        ) : savedRecipes.length === 0 ? (
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-lg">
            <span className="material-symbols-outlined text-5xl text-primary/40">bookmark_border</span>
            <p className="text-slate-400 text-sm font-medium">{t('saved.empty_recipes')}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-black">explore</span>
              <span>{t('saved.discover_recipes')}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5">
              {savedRecipes.map(recipe => {
                const title = getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || '';
                const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
                const difficultyMap = {
                  easy: t('saved.difficulty.easy', 'Лесно'),
                  medium: t('saved.difficulty.medium', 'Средно'),
                  hard: t('saved.difficulty.hard', 'Трудно')
                };
                const difficulty = difficultyMap[recipe.difficulty] || difficultyMap.medium;
                const imageUrl = getRecipeImageUrl(recipe);
                const cuisineName = getLocalizedCuisine(recipe.cuisine_id || recipe.cuisine_bg, currentLang) || t('saved.global_selection');
                const calculatedTags = getRecipeTags(recipe, ingredientsList);
                const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);
                const isLongTitle = typeof title === 'string' && title.trim().length > 20;

                return (
                  <div 
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:border-primary/50 transition-colors flex flex-col group cursor-pointer relative hover:z-10"
                  >
                    <div className="flex h-auto min-h-[10rem]">
                      <div className="w-[35%] overflow-hidden relative bg-slate-900">
                        <img 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
                          alt={title} 
                          src={imageUrl}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/recipe-placeholder.png';
                          }}
                        />
                      </div>
                      <div className="w-[65%] p-4 flex flex-col justify-between relative">
                        <div>
                          <div className="relative group/title inline-block w-full">
                            <h4 
                              className="text-slate-100 font-bold text-lg leading-tight line-clamp-1 group-hover/title:text-primary transition-colors"
                              aria-label={title}
                            >
                              {title}
                            </h4>
                            {isLongTitle && (
                              <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-30 opacity-0 invisible group-hover/title:opacity-100 group-hover/title:visible transition-all duration-200 w-full">
                                <div className="relative bg-[#161b26]/95 backdrop-blur-md text-slate-100 text-xs font-semibold p-2.5 rounded-xl border border-primary/40 shadow-2xl shadow-black/80 flex items-start gap-1.5">
                                  <div className="absolute -top-1 left-4 size-2 rotate-45 bg-[#161b26] border-t border-l border-primary/40"></div>
                                  <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">restaurant_menu</span>
                                  <span className="leading-snug break-words text-slate-100 drop-shadow-sm">{title}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[9px] font-bold uppercase tracking-tighter shadow-md">
                              {cuisineName}
                            </span>
                            {tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold uppercase tracking-tighter shadow-md">
                                {translateTag(tag, currentLang)}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-medium flex-wrap">
                            <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-0.5 rounded"><span className="material-symbols-outlined text-[13px] text-primary">schedule</span> {prepTime}m</span>
                            <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-0.5 rounded"><span className="material-symbols-outlined text-[13px] text-primary">local_fire_department</span> {difficulty}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-medium flex-wrap">
                            <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-0.5 rounded text-primary">
                              <span className="material-symbols-outlined text-[13px] fill-[1]">star</span> 
                              {(recipe.rating || 0).toFixed(1)} ({recipe.votes_count || 0})
                            </span>
                            {calculateEstimatedPrice(recipe, ingredientsList) && (
                              <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded">
                                <span className="material-symbols-outlined text-[13px]">payments</span>
                                <span>~{calculateEstimatedPrice(recipe, ingredientsList)} {t('saved.currency_eur')}</span>
                              </span>
                            )}
                            {recipe.video_url && (
                              <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                                <span className="material-symbols-outlined text-[13px]">play_circle</span>
                                <span>{t('saved.video_badge')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end mt-auto pt-1">
                          <button 
                            onClick={(e) => handleUnsave(e, recipe.id)}
                            className="size-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                            title={t('saved.remove_from_saved')}
                          >
                            <span className="material-symbols-outlined text-sm font-bold">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Navigation Buttons */}
            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base font-black">explore</span>
                <span>{t('saved.discover_more_recipes')}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/ai-assistant')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                title={t('pantry.chef_ai_btn')}
              >
                <span className="material-symbols-outlined text-base font-black">auto_awesome</span>
                <span>{t('pantry.chef_ai_btn')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedRecipes;

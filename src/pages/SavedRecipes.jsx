import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot, getDoc, updateDoc, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { getCuisineById } from '../data/cuisines';
import { translateTag } from '../lib/recipeMetaUtils';
import { calculateEstimatedPrice } from '../lib/priceUtils';

const SavedRecipes = () => {
  const { shoppingList, setShoppingList } = useAppContext();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';

  const [savedRecipes, setSavedRecipes] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [measurementsDB, setMeasurementsDB] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shopping List Editing and interaction
  const [isEditing, setIsEditing] = useState(false);
  const [tempList, setTempList] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());

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
    const found = measurementsDB.find(m => (m.unit_id === unitId || m.id === unitId));
    if (found) {
      return isBg ? (found.name_bg || found.name || unitId) : (found.name_en || found.name || unitId);
    }
    return unitId;
  };

  const getItemName = (item) => {
    if (isBg) {
      return item.nameBg || item.ingredient_bg || item.name_bg || item.name || item.ingredient_id || '';
    }
    return item.nameEn || item.ingredient_en || item.name_en || item.name || item.ingredient_id || '';
  };

  const handleStartEdit = () => {
    setTempList(shoppingList.map(item => ({
      ...item,
      name: item.name || '',
      nameBg: item.nameBg || item.ingredient_bg || item.name_bg || item.name || '',
      nameEn: item.nameEn || item.ingredient_en || item.name_en || item.name || '',
      quantityToBuy: item.quantityToBuy !== undefined ? item.quantityToBuy : (item.amount || 0),
      unit: item.unit || item.unit_id || 'g'
    })));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempList([]);
  };

  const handleSaveEdit = () => {
    setShoppingList(tempList);
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
    const standard = ['g', 'kg', 'ml', 'pcs'];
    const ing = ingredientsList.find(i => i.id === item.ingredient_id);
    const mapped = ing?.units_mapping?.map(u => u.unit_id) || [];
    const all = Array.from(new Set([
      ...mapped,
      ...(measurementsDB.map(m => m.unit_id || m.id)),
      ...standard
    ])).filter(Boolean);
    return all;
  };

  const handleUnsave = async (e, recipeId) => {
    e.stopPropagation();
    if (window.confirm(isBg ? 'Сигурни ли сте, че искате да премахнете тази рецепта от запазените?' : 'Are you sure you want to remove this recipe from saved?')) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          saved_recipes: arrayRemove(recipeId)
        });
      } catch(err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex-1 pb-32 px-4 py-8">
      <h2 className="text-3xl font-extrabold text-slate-100 mb-8 tracking-tight">{t('saved.title')}</h2>
      
      {/* Shopping List Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2 drop-shadow-sm">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            {t('saved.shopping_list')}
          </h3>
          {shoppingList.length > 0 && (
            <div>
              {!isEditing ? (
                <button 
                  onClick={handleStartEdit}
                  className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  {isBg ? 'Редактирай' : 'Edit'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveEdit}
                    className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isBg ? 'Запиши' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="text-xs font-bold uppercase tracking-wider bg-slate-700/50 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    {isBg ? 'Отказ' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {shoppingList.length === 0 ? (
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">remove_shopping_cart</span>
            <p className="text-slate-400 text-sm font-medium">{t('saved.empty_list')}</p>
          </div>
        ) : isEditing ? (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-3 shadow-lg space-y-3">
            {tempList.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-primary/5 pb-3 last:border-0 last:pb-0 gap-3">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={isBg ? (item.nameBg || '') : (item.nameEn || '')}
                    onChange={e => {
                      handleTempItemChange(index, isBg ? 'nameBg' : 'nameEn', e.target.value);
                      handleTempItemChange(index, 'name', e.target.value);
                    }}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-2.5 text-slate-100 text-sm font-bold focus:border-primary shadow-inner"
                    placeholder={isBg ? 'Име на продукт' : 'Product Name'}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input 
                    type="number" 
                    step="0.01"
                    value={item.quantityToBuy}
                    onChange={e => handleTempItemChange(index, 'quantityToBuy', e.target.value)}
                    className="w-20 bg-background-dark border border-primary/20 rounded-xl p-2.5 text-slate-100 text-center text-sm font-bold shadow-inner"
                    placeholder={isBg ? 'Кол.' : 'Qty'}
                  />
                  <select 
                    value={item.unit || item.unit_id || 'g'}
                    onChange={e => handleTempItemChange(index, 'unit', e.target.value)}
                    className="w-28 bg-background-dark border border-primary/20 rounded-xl p-2.5 text-slate-100 text-sm font-bold shadow-inner"
                  >
                    {getUnitOptions(item).map(u => (
                      <option key={u} value={u}>{getUnitName(u)}</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => handleDeleteTempItem(index)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all shrink-0"
                    title={isBg ? 'Изтрий' : 'Delete'}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-2 shadow-lg">
            {shoppingList.map((item, index) => {
              const name = getItemName(item);
              const isChecked = checkedItems.has(index);
              const unitId = item.unit || item.unit_id || 'g';
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
                  <div className={`bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 text-primary font-extrabold text-sm shadow-inner shrink-0 transition-opacity ${isChecked ? 'opacity-40' : ''}`}>
                    {item.quantityToBuy !== undefined ? item.quantityToBuy : (item.amount || 0)} <span className="text-[10px] text-primary/70">{getUnitName(unitId)}</span>
                  </div>
                </div>
              );
            })}
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
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">bookmark_border</span>
            <p className="text-slate-400 text-sm font-medium">{isBg ? 'Нямате запазени рецепти.' : 'No saved recipes yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {savedRecipes.map(recipe => {
              const title = isBg ? recipe.title_bg : recipe.title_en;
              const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
              const difficulty = isBg ? (recipe.difficulty === 'easy' ? 'Лесно' : recipe.difficulty === 'hard' ? 'Трудно' : 'Средно') : (recipe.difficulty || 'medium');
              const imageUrl = recipe.images?.main || "/placeholder.jpg";
              const cuisineObj = recipe.cuisine_id ? getCuisineById(recipe.cuisine_id) : null;
              const cuisineName = cuisineObj ? (isBg ? cuisineObj.name.bg : cuisineObj.name.en) : (isBg ? 'Световна Селекция' : 'Global Selection');
              const tags = recipe.tags || [];

              return (
                <div 
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:border-primary/50 transition-colors flex flex-col group cursor-pointer"
                >
                  <div className="flex h-auto min-h-[10rem]">
                    <div className="w-[35%] overflow-hidden relative bg-slate-900">
                      <img 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
                        alt={title} 
                        src={imageUrl}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    <div className="w-[65%] p-4 flex flex-col justify-between relative">
                      <div>
                        <h4 className="text-slate-100 font-bold text-lg leading-tight line-clamp-1">{title}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[9px] font-bold uppercase tracking-tighter shadow-md">
                            {cuisineName}
                          </span>
                          {tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold uppercase tracking-tighter shadow-md">
                              {translateTag(tag, isBg)}
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
                              <span>~{calculateEstimatedPrice(recipe, ingredientsList)} {isBg ? 'Евро' : 'EUR'}</span>
                            </span>
                          )}
                          {recipe.video_url && (
                            <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                              <span className="material-symbols-outlined text-[13px]">play_circle</span>
                              <span>{isBg ? 'Видео' : 'Video'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end mt-auto pt-1">
                        <button 
                          onClick={(e) => handleUnsave(e, recipe.id)}
                          className="size-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                          title={isBg ? 'Премахни от запазени' : 'Remove from saved'}
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
        )}
      </div>
    </div>
  );
};

export default SavedRecipes;

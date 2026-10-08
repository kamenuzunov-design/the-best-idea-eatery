import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { getLocalizedField, getLocalizedRecipeTitle } from '../lib/localeUtils';
import { classifyRecipes, getRotatedBatch, isItemExpiring } from '../lib/recipeMatcherEngine';
import { translateTag, getRecipeTags } from '../lib/recipeMetaUtils';

const getFallbackId = (prefix = 'item') => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

const AIIngredientsSearch = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const { pantry, shoppingList, setShoppingList } = useAppContext();

  // Reference & Data State
  const [recipes, setRecipes] = useState([]);
  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom added ingredients on top of pantry
  const [customIngredients, setCustomIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Quick Filter: 'all' | 'quick' | 'expiring' | 'light'
  const [activeFilter, setActiveFilter] = useState('all');

  // Shuffle / Batch rotation offsets
  const [offsets, setOffsets] = useState({
    ready: 0,
    missingOne: 0,
    readyToShop: 0
  });

  // Tracking added items for visual button feedback
  const [addedMap, setAddedMap] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  // Fetch Firestore Recipes & Ingredients
  useEffect(() => {
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snap) => {
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => 
          r.is_deleted !== true && 
          (!r.parent_recipe_id || r.is_public_variation === true) &&
          r.is_active !== false
        );
      setRecipes(active);
      setLoading(false);
    }, (err) => {
      console.warn("Could not load recipes for what to cook:", err);
      setLoading(false);
    });

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snap) => {
      setIngredientsDB(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Could not load ingredients for what to cook:", err);
    });

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  // Display Toast Notification
  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Combine Pantry items + User's Custom Added items
  const activeIngredientsPool = useMemo(() => {
    const list = [...(pantry || [])];
    customIngredients.forEach(ci => {
      const exists = list.some(p => {
        const pId = p.ingredientId || p.ingredient_id || p.id;
        const ciId = ci.ingredientId || ci.ingredient_id || ci.id;
        return (pId && ciId && pId === ciId) || (ci.name && p.name && ci.name.toLowerCase() === p.name.toLowerCase());
      });
      if (!exists) {
        list.push(ci);
      }
    });
    return list;
  }, [pantry, customIngredients]);

  // Check if any items in pantry are expiring
  const hasExpiringItems = useMemo(() => {
    return (pantry || []).some(isItemExpiring);
  }, [pantry]);

  // Classify recipes into the 3 tiers using the deterministic engine
  const classified = useMemo(() => {
    const filterOptions = {
      quickOnly: activeFilter === 'quick',
      expiringFirst: activeFilter === 'expiring'
    };

    let res = classifyRecipes(recipes, activeIngredientsPool, ingredientsDB, filterOptions);

    if (activeFilter === 'light') {
      const isLight = (r) => {
        const tags = getRecipeTags(r, ingredientsDB).map(t => t.toLowerCase());
        const cat = String(r.category_id || '').toLowerCase();
        return tags.includes('vegetarian') || tags.includes('vegan') || cat.includes('salad') || (r.calories_per_serving && r.calories_per_serving < 450);
      };
      res = {
        readyToCook: res.readyToCook.filter(e => isLight(e.recipe)),
        missingOne: res.missingOne.filter(e => isLight(e.recipe)),
        readyToShop: res.readyToShop.filter(e => isLight(e.recipe)),
        totalMatches: 0
      };
      res.totalMatches = res.readyToCook.length + res.missingOne.length + res.readyToShop.length;
    }

    return res;
  }, [recipes, activeIngredientsPool, ingredientsDB, activeFilter]);

  // Rotated visible slices (3 items per section)
  const visibleReady = useMemo(() => {
    return getRotatedBatch(classified.readyToCook, offsets.ready, 3);
  }, [classified.readyToCook, offsets.ready]);

  const visibleMissingOne = useMemo(() => {
    return getRotatedBatch(classified.missingOne, offsets.missingOne, 3);
  }, [classified.missingOne, offsets.missingOne]);

  const visibleReadyToShop = useMemo(() => {
    return getRotatedBatch(classified.readyToShop, offsets.readyToShop, 3);
  }, [classified.readyToShop, offsets.readyToShop]);

  const handleRotate = (tierKey, listLength) => {
    setOffsets(prev => ({
      ...prev,
      [tierKey]: (prev[tierKey] + 3) % (listLength || 1)
    }));
  };

  // Add a single missing ingredient to shopping list
  const handleAddSingleToCart = async (missingItem, recipe) => {
    const id = missingItem.ingredient_id || missingItem.id || missingItem.ingredientId || getFallbackId();
    const nameBg = missingItem.name_bg || missingItem.ingredient_bg || missingItem.name || '';
    const nameEn = missingItem.name_en || missingItem.ingredient_en || missingItem.name || '';
    const localizedName = getLocalizedField(missingItem, 'name', currentLang) || 
                          getLocalizedField(missingItem, 'ingredient', currentLang) || 
                          (currentLang === 'bg' ? nameBg : nameEn) || missingItem.name || id;

    const rTitle = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || '';

    const newItem = {
      ingredient_id: id,
      id,
      name: localizedName,
      nameBg,
      nameEn,
      amount: Number(missingItem.amount) || 1,
      unit: missingItem.unit_id || missingItem.unit || 'бр.',
      quantityToBuy: Number(missingItem.amount) || 1,
      fromRecipe: rTitle
    };

    const updated = [...(shoppingList || []), newItem];
    await setShoppingList(updated);
    setAddedMap(prev => ({ ...prev, [id]: true, [`${recipe.id}_${id}`]: true }));
    showToast(t('what_to_cook.added_to_cart_toast'));
  };

  // Add all missing ingredients of a recipe to shopping list
  const handleAddAllToCart = async (missingList, recipe) => {
    const rTitle = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || '';
    const newItems = missingList.map(mi => {
      const id = mi.ingredient_id || mi.id || mi.ingredientId || getFallbackId();
      const nameBg = mi.name_bg || mi.ingredient_bg || mi.name || '';
      const nameEn = mi.name_en || mi.ingredient_en || mi.name || '';
      const localizedName = getLocalizedField(mi, 'name', currentLang) || 
                            getLocalizedField(mi, 'ingredient', currentLang) || 
                            (currentLang === 'bg' ? nameBg : nameEn) || mi.name || id;
      return {
        ingredient_id: id,
        id,
        name: localizedName,
        nameBg,
        nameEn,
        amount: Number(mi.amount) || 1,
        unit: mi.unit_id || mi.unit || 'бр.',
        quantityToBuy: Number(mi.amount) || 1,
        fromRecipe: rTitle
      };
    });

    const updated = [...(shoppingList || []), ...newItems];
    await setShoppingList(updated);
    setAddedMap(prev => ({ ...prev, [recipe.id]: true }));
    showToast(t('what_to_cook.all_added_to_cart_toast'));
  };

  // Navigate to Chef AI with tailor-made prompt
  const handleAskChefAI = (recipe, contextType = 'general', missingItem = null) => {
    const title = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || 'рецептата';
    let prompt = '';

    if (contextType === 'substitute' && missingItem) {
      const missingName = getLocalizedField(missingItem, 'name', currentLang) || 
                          getLocalizedField(missingItem, 'ingredient', currentLang) || 
                          missingItem.name || missingItem.ingredient_id;
      if (currentLang === 'bg') {
        prompt = `Искам да сготвя "${title}", но нямам "${missingName}". С какво мога да го заменя от типични домашни продукти или как да адаптирам ястието?`;
      } else if (currentLang === 'it') {
        prompt = `Vorrei cucinare "${title}", ma non ho "${missingName}". Con cosa posso sostituirlo usando ingredienti comuni a casa?`;
      } else if (currentLang === 'fr') {
        prompt = `J'aimerais cuisiner "${title}", mais je n'ai pas de "${missingName}". Par quoi puis-je le remplacer avec les ingrédients du placard ?`;
      } else if (currentLang === 'de') {
        prompt = `Ich möchte "${title}" kochen, habe aber kein "${missingName}". Womit kann ich es mit haushaltsüblichen Zutaten ersetzen?`;
      } else {
        prompt = `I want to cook "${title}", but I don't have "${missingName}". What common pantry ingredients can I substitute it with?`;
      }
    } else if (contextType === 'ready') {
      if (currentLang === 'bg') {
        prompt = `Имам всички съставки за "${title}" и започвам готвене сега! Сподели ми своята висша Шеф тайна за перфектно изпълнение и сомелиерско съчетание.`;
      } else if (currentLang === 'it') {
        prompt = `Ho tutti gli ingredienti per "${title}" e inizio a cucinare ora! Condividi il tuo segreto da chef e un abbinamento perfetto di bevande.`;
      } else if (currentLang === 'fr') {
        prompt = `J'ai tous les ingrédients pour "${title}" et je commence à cuisiner ! Partage ton secret de chef et un accord parfait de boisson.`;
      } else if (currentLang === 'de') {
        prompt = `Ich habe alle Zutaten für "${title}" und fange jetzt an zu kochen! Verrate mir dein Chef-Geheimnis und eine passende Wein-/Getränkeempfehlung.`;
      } else {
        prompt = `I have all ingredients for "${title}" and I'm ready to cook now! Share your executive chef pro-tip and a perfect beverage pairing.`;
      }
    } else {
      if (currentLang === 'bg') {
        prompt = `Планирам да сготвя "${title}". Дай ми готварски съвети, насоки за сервиране и сомелиерска идея за това ястие!`;
      } else {
        prompt = `I'm planning to cook "${title}". Please share culinary pro-tips, plating advice, and a beverage pairing for this dish!`;
      }
    }

    navigate('/ai-assistant', { state: { autoPrompt: prompt, recipeId: recipe.id } });
  };

  // Add custom ingredient from search bar
  const handleAddCustom = (ing) => {
    const name = getLocalizedField(ing, 'name', currentLang) || ing.name_en || ing.name_bg || ing.name;
    const exists = customIngredients.some(c => c.id === ing.id || c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setCustomIngredients(prev => [...prev, {
        id: ing.id,
        ingredient_id: ing.id,
        name,
        nameBg: ing.name_bg,
        nameEn: ing.name_en,
        isCustom: true
      }]);
    }
    setSearchTerm('');
  };

  const handleRemoveCustom = (idx) => {
    setCustomIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  // Autocomplete filtering for ingredients search
  const filteredSearchMaster = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return ingredientsDB.filter(ing => {
      const bg = (ing.name_bg || '').toLowerCase();
      const en = (ing.name_en || '').toLowerCase();
      const loc = (getLocalizedField(ing, 'name', currentLang) || '').toLowerCase();
      return bg.includes(term) || en.includes(term) || loc.includes(term);
    }).slice(0, 8);
  }, [searchTerm, ingredientsDB, currentLang]);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-primary/20 bg-surface-dark/95 backdrop-blur-md sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="text-primary hover:bg-primary/10 rounded-xl p-1.5 transition-colors cursor-pointer flex items-center"
            title={t('common.buttons.back')}
          >
            <span className="material-symbols-outlined text-xl font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
              <span>{t('what_to_cook.header_title')}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-primary/20 text-primary text-[9px] font-black tracking-normal">
                {classified.totalMatches}
              </span>
            </h1>
            <p className="text-[10px] text-primary/80 font-bold leading-tight">
              {t('what_to_cook.header_subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/pantry')}
          className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
          title={t('nav.pantry')}
        >
          <span className="material-symbols-outlined text-[13px]">kitchen</span>
          <span>{pantry.length}</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-5 max-w-2xl mx-auto w-full">
        {/* Active Ingredients Box */}
        <section className="bg-surface-dark/80 p-3.5 rounded-2xl border border-primary/20 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              <span>{t('what_to_cook.pantry_badge', { count: activeIngredientsPool.length })}</span>
            </div>
            {customIngredients.length > 0 && (
              <button 
                onClick={() => setCustomIngredients([])}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-bold transition-colors cursor-pointer"
              >
                {t('common.buttons.clear')} (+{customIngredients.length})
              </button>
            )}
          </div>

          {/* Chips list */}
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-0.5">
            {activeIngredientsPool.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-1">
                {t('what_to_cook.empty_pantry_desc')}
              </p>
            ) : (
              activeIngredientsPool.map((item, idx) => {
                const name = getLocalizedField(item, 'name', currentLang) || item.name || item.nameBg || item.nameEn;
                const isCustom = item.isCustom === true;
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm transition-all ${
                      isCustom 
                        ? 'bg-primary/20 border border-primary/40 text-primary' 
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <span>{isCustom ? '✨' : '🏠'}</span>
                    <span className="truncate max-w-[130px]">{name}</span>
                    {isCustom && (
                      <button
                        onClick={() => handleRemoveCustom(customIngredients.indexOf(item))}
                        className="hover:text-rose-400 text-slate-400 font-black ml-0.5 cursor-pointer"
                        title={t('common.buttons.delete')}
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>

          {/* Quick Search & Add row */}
          <div className="relative pt-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('what_to_cook.search_placeholder')}
                className="w-full bg-background-dark/90 border border-primary/25 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary/60 focus:outline-none transition-all shadow-inner"
              />
              <span className="material-symbols-outlined text-slate-400 text-sm absolute left-2.5 top-2.5">
                search
              </span>
            </div>

            {/* Autocomplete dropdown */}
            {searchTerm && filteredSearchMaster.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface-dark border border-primary/30 rounded-xl p-1.5 z-30 shadow-2xl space-y-1 max-h-48 overflow-y-auto">
                {filteredSearchMaster.map(ing => (
                  <button
                    key={ing.id}
                    onClick={() => handleAddCustom(ing)}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-primary/15 text-xs font-bold text-slate-200 flex justify-between items-center transition-colors cursor-pointer"
                  >
                    <span>{getLocalizedField(ing, 'name', currentLang) || ing.name_bg || ing.name_en}</span>
                    <span className="material-symbols-outlined text-primary text-sm">add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Filter Buttons */}
        <section className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: t('what_to_cook.filters.all'), icon: 'apps' },
            { id: 'quick', label: t('what_to_cook.filters.quick'), icon: 'timer' },
            ...(hasExpiringItems ? [{ id: 'expiring', label: t('what_to_cook.filters.expiring'), icon: 'event_busy' }] : []),
            { id: 'light', label: t('what_to_cook.filters.light'), icon: 'spa' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                activeFilter === f.id
                  ? 'bg-primary text-background-dark shadow-primary/20 scale-[1.02]'
                  : 'bg-surface-dark/80 text-slate-400 border border-primary/15 hover:border-primary/40'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </section>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            <p className="text-xs text-slate-400 font-bold uppercase">{t('common.status.loading')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 🟢 TIER 1: 100% Ready to Cook */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div>
                  <h2 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{t('what_to_cook.tier_ready.title')}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                      {classified.readyToCook.length}
                    </span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {t('what_to_cook.tier_ready.subtitle')}
                  </p>
                </div>

                {classified.readyToCook.length > 3 && (
                  <button
                    onClick={() => handleRotate('ready', classified.readyToCook.length)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title={t('what_to_cook.tier_ready.shuffle')}
                  >
                    <span className="material-symbols-outlined text-xs">sync</span>
                    <span>{t('what_to_cook.tier_ready.shuffle')}</span>
                  </button>
                )}
              </div>

              {classified.readyToCook.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-dark/40 border border-primary/10 text-center space-y-1">
                  <p className="text-xs text-slate-400 italic">
                    {t('what_to_cook.tier_ready.empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {visibleReady.map(({ recipe, expiringUsedCount }) => {
                    const title = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || 'Recipe';
                    const tags = getRecipeTags(recipe, ingredientsDB);
                    const prepTime = Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0) || Number(recipe.time || 0);

                    return (
                      <div
                        key={recipe.id}
                        className="p-3.5 bg-surface-dark border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl shadow-lg transition-all space-y-3 group"
                      >
                        <div className="flex gap-3">
                          <div 
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            className="size-20 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 relative cursor-pointer"
                          >
                            <img
                              src={recipe.images?.main || recipe.imageUrl || "/images/recipe-placeholder.png"}
                              alt={title}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-emerald-600/90 text-white text-[8px] font-black uppercase">
                              100%
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h3 
                                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                                  className="text-xs font-bold text-slate-100 hover:text-primary transition-colors cursor-pointer truncate"
                                >
                                  {title}
                                </h3>
                                {expiringUsedCount > 0 && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">timer</span>
                                    <span>{expiringUsedCount}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {prepTime > 0 && (
                                  <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[11px]">schedule</span>
                                    <span>{prepTime}m</span>
                                  </span>
                                )}
                                {tags.slice(0, 2).map(tg => (
                                  <span key={tg} className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                                    {translateTag(tg, currentLang)}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              <span>{t('what_to_cook.tier_ready.badge')}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/10">
                          <button
                            onClick={() => navigate(`/recipe/${recipe.id}/cooking`)}
                            className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm font-black">play_arrow</span>
                            <span>{t('what_to_cook.tier_ready.action_cook')}</span>
                          </button>

                          <button
                            onClick={() => handleAskChefAI(recipe, 'ready')}
                            className="py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">auto_awesome</span>
                            <span>{t('what_to_cook.tier_ready.action_ai')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 🟡 TIER 2: Missing only 1 ingredient */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div>
                  <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">shopping_cart</span>
                    <span>{t('what_to_cook.tier_missing_one.title')}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black">
                      {classified.missingOne.length}
                    </span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {t('what_to_cook.tier_missing_one.subtitle')}
                  </p>
                </div>

                {classified.missingOne.length > 3 && (
                  <button
                    onClick={() => handleRotate('missingOne', classified.missingOne.length)}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title={t('what_to_cook.tier_missing_one.shuffle')}
                  >
                    <span className="material-symbols-outlined text-xs">sync</span>
                    <span>{t('what_to_cook.tier_missing_one.shuffle')}</span>
                  </button>
                )}
              </div>

              {classified.missingOne.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-dark/40 border border-primary/10 text-center space-y-1">
                  <p className="text-xs text-slate-400 italic">
                    {t('what_to_cook.tier_missing_one.empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {visibleMissingOne.map(({ recipe, missingIngredients, expiringUsedCount }) => {
                    const title = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || 'Recipe';
                    const missingItem = missingIngredients[0] || {};
                    const missingId = missingItem.ingredient_id || missingItem.id || missingItem.ingredientId;
                    const missingName = getLocalizedField(missingItem, 'name', currentLang) || 
                                        getLocalizedField(missingItem, 'ingredient', currentLang) || 
                                        (currentLang === 'bg' ? (missingItem.name_bg || missingItem.ingredient_bg) : (missingItem.name_en || missingItem.ingredient_en)) || 
                                        missingItem.name || missingItem.ingredient_id || '';

                    const isAdded = addedMap[missingId] || addedMap[`${recipe.id}_${missingId}`] === true;
                    const prepTime = Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0) || Number(recipe.time || 0);

                    return (
                      <div
                        key={recipe.id}
                        className="p-3.5 bg-surface-dark border border-amber-500/30 hover:border-amber-500/60 rounded-2xl shadow-lg transition-all space-y-3 group"
                      >
                        <div className="flex gap-3">
                          <div 
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            className="size-20 rounded-xl overflow-hidden shrink-0 border border-amber-500/20 relative cursor-pointer"
                          >
                            <img
                              src={recipe.images?.main || recipe.imageUrl || "/images/recipe-placeholder.png"}
                              alt={title}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-amber-600/90 text-white text-[8px] font-black uppercase">
                              -1
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h3 
                                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                                  className="text-xs font-bold text-slate-100 hover:text-primary transition-colors cursor-pointer truncate"
                                >
                                  {title}
                                </h3>
                                {expiringUsedCount > 0 && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">timer</span>
                                    <span>{expiringUsedCount}</span>
                                  </span>
                                )}
                              </div>

                              {prepTime > 0 && (
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  <span>{prepTime}m</span>
                                </p>
                              )}
                            </div>

                            {/* Missing ingredient badge */}
                            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-bold flex items-center justify-between mt-1">
                              <span className="truncate">
                                🛒 {t('what_to_cook.tier_missing_one.badge')} <strong className="text-amber-200">{missingName}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/10">
                          <button
                            onClick={() => handleAddSingleToCart(missingItem, recipe)}
                            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm font-black">
                              {isAdded ? 'done' : 'add_shopping_cart'}
                            </span>
                            <span>
                              {isAdded ? t('what_to_cook.tier_missing_one.action_in_cart') : t('what_to_cook.tier_missing_one.action_add_to_cart')}
                            </span>
                          </button>

                          <button
                            onClick={() => handleAskChefAI(recipe, 'substitute', missingItem)}
                            className="py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-[10px] flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">sync_alt</span>
                            <span>{t('what_to_cook.tier_missing_one.action_ai_substitute')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 🟠 TIER 3: Ready to Shop (Missing 2 to 5 ingredients) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-orange-500/20 pb-2">
                <div>
                  <h2 className="text-sm font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">format_list_bulleted_add</span>
                    <span>{t('what_to_cook.tier_ready_to_shop.title')}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-500/20 text-orange-300 text-[10px] font-black">
                      {classified.readyToShop.length}
                    </span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {t('what_to_cook.tier_ready_to_shop.subtitle')}
                  </p>
                </div>

                {classified.readyToShop.length > 3 && (
                  <button
                    onClick={() => handleRotate('readyToShop', classified.readyToShop.length)}
                    className="px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title={t('what_to_cook.tier_ready_to_shop.shuffle')}
                  >
                    <span className="material-symbols-outlined text-xs">sync</span>
                    <span>{t('what_to_cook.tier_ready_to_shop.shuffle')}</span>
                  </button>
                )}
              </div>

              {classified.readyToShop.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-dark/40 border border-primary/10 text-center space-y-1">
                  <p className="text-xs text-slate-400 italic">
                    {t('what_to_cook.tier_ready_to_shop.empty')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {visibleReadyToShop.map(({ recipe, missingIngredients, expiringUsedCount }) => {
                    const title = getLocalizedRecipeTitle(recipe, currentLang) || recipe.title || 'Recipe';
                    const isAdded = addedMap[recipe.id] === true;
                    const prepTime = Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0) || Number(recipe.time || 0);

                    const missingNamesPreview = missingIngredients.slice(0, 3).map(mi => {
                      return getLocalizedField(mi, 'name', currentLang) || 
                             getLocalizedField(mi, 'ingredient', currentLang) || 
                             (currentLang === 'bg' ? (mi.name_bg || mi.ingredient_bg) : (mi.name_en || mi.ingredient_en)) || 
                             mi.name || mi.ingredient_id;
                    }).join(', ');

                    return (
                      <div
                        key={recipe.id}
                        className="p-3.5 bg-surface-dark border border-orange-500/25 hover:border-orange-500/50 rounded-2xl shadow-lg transition-all space-y-3 group"
                      >
                        <div className="flex gap-3">
                          <div 
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            className="size-20 rounded-xl overflow-hidden shrink-0 border border-orange-500/20 relative cursor-pointer"
                          >
                            <img
                              src={recipe.images?.main || recipe.imageUrl || "/images/recipe-placeholder.png"}
                              alt={title}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-orange-600/90 text-white text-[8px] font-black uppercase">
                              -{missingIngredients.length}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h3 
                                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                                  className="text-xs font-bold text-slate-100 hover:text-primary transition-colors cursor-pointer truncate"
                                >
                                  {title}
                                </h3>
                                {expiringUsedCount > 0 && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">timer</span>
                                    <span>{expiringUsedCount}</span>
                                  </span>
                                )}
                              </div>

                              {prepTime > 0 && (
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  <span>{prepTime}m</span>
                                </p>
                              )}
                            </div>

                            <p className="text-[10px] text-orange-300 font-medium line-clamp-1 mt-1">
                              {t('what_to_cook.tier_ready_to_shop.badge', { count: missingIngredients.length })} <strong>{missingNamesPreview}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/10">
                          <button
                            onClick={() => handleAddAllToCart(missingIngredients, recipe)}
                            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
                                : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm font-black">
                              {isAdded ? 'done' : 'playlist_add'}
                            </span>
                            <span>
                              {isAdded 
                                ? t('what_to_cook.tier_ready_to_shop.action_in_cart') 
                                : t('what_to_cook.tier_ready_to_shop.action_add_all_to_cart', { count: missingIngredients.length })}
                            </span>
                          </button>

                          <button
                            onClick={() => handleAskChefAI(recipe, 'general')}
                            className="py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-[10px] flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">auto_awesome</span>
                            <span>{t('what_to_cook.tier_ready_to_shop.action_ai')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Bottom Bridge Banner to Chef AI */}
        <section className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-surface-dark border border-primary/25 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
              <span>{t('what_to_cook.chef_ai_banner_title')}</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {t('what_to_cook.chef_ai_banner_desc')}
            </p>
          </div>
          <button
            onClick={() => navigate('/ai-assistant')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-black text-xs shrink-0 shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{t('what_to_cook.chef_ai_banner_btn')}</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </section>
      </main>
    </div>
  );
};

export default AIIngredientsSearch;

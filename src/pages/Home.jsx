import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import { getCuisineById } from '../data/cuisines';
import { translateTag, getRecipeTags, normalizeMainGroup } from '../lib/recipeMetaUtils';
import { getRootCategories } from '../data/recipe_categories';

const getPluralCategoryName = (id, lang) => {
  const plurals = {
    bg: {
      salad: 'Салати',
      soup: 'Супи',
      appetizer: 'Предястия',
      main: 'Основни',
      dessert: 'Десерти',
      pastry: 'Тестени',
      drink: 'Напитки',
      sauce: 'Сос/Марината',
      breakfast: 'Закуска',
      special: 'Специален повод'
    },
    en: {
      salad: 'Salads',
      soup: 'Soups',
      appetizer: 'Appetizers',
      main: 'Mains',
      dessert: 'Desserts',
      pastry: 'Pastries',
      drink: 'Drinks',
      sauce: 'Sauces',
      breakfast: 'Breakfast',
      special: 'Special Occasion'
    }
  };
  return plurals[lang]?.[id] || id;
};

const Home = () => {
  const { pantry } = useAppContext();
  const { t, i18n } = useTranslation();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authorFilter = searchParams.get('author');
  const authorNameFilter = searchParams.get('authorName');
  const isBg = i18n.language === 'bg';

  const [realRecipes, setRealRecipes] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('newest'); // 'smart' | 'newest' | 'top' | 'popular'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTop10, setShowTop10] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [measurementsList, setMeasurementsList] = useState([]);

  const convertToGrams = useCallback((amount, unitId) => {
    if (!unitId) return amount;
    const unit = measurementsList.find(m => m.id === unitId || m.unit_id === unitId);
    if (!unit) return amount;
    
    const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
    if (toG !== undefined && toG !== null && toG > 0) {
      return amount * toG;
    }
    
    const toMl = unit.conversions?.metric?.to_ml;
    if (toMl !== undefined && toMl !== null && toMl > 0) {
      return amount * toMl;
    }
    
    return amount;
  }, [measurementsList]);

  const convertFromGrams = useCallback((amountInGrams, unitId) => {
    if (!unitId) return amountInGrams;
    const unit = measurementsList.find(m => m.id === unitId || m.unit_id === unitId);
    if (!unit) return amountInGrams;
    
    const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
    if (toG && toG > 0) {
      return amountInGrams / toG;
    }
    
    const toMl = unit.conversions?.metric?.to_ml;
    if (toMl && toMl > 0) {
      return amountInGrams / toMl;
    }
    
    return amountInGrams;
  }, [measurementsList]);

  const analyzeRecipe = useCallback((recipe) => {
    let missingIngredients = [];
    if (!recipe.ingredients) return [];
    
    recipe.ingredients.forEach(reqIng => {
      // Find in pantry by ID matching
      const pantryItem = pantry.find(p => {
        const pId = p.ingredientId || p.ingredient_id || p.id;
        const rId = reqIng.ingredient_id || reqIng.id;
        return pId && rId && pId === rId;
      });
      
      const requiredAmount = parseFloat(reqIng.amount) || 0;
      const servings = recipe.servings || 2;
      const scaledAmount = requiredAmount * servings;
      
      const scaledAmountInGrams = convertToGrams(scaledAmount, reqIng.unit_id || reqIng.unit);
      
      const pantryAmount = pantryItem ? (parseFloat(pantryItem.quantity) || 0) : 0;
      const pantryAmountInGrams = pantryItem ? convertToGrams(pantryAmount, pantryItem.unit || pantryItem.unit_id) : 0;

      if (pantryAmountInGrams < scaledAmountInGrams) {
        const missingInGrams = scaledAmountInGrams - pantryAmountInGrams;
        const missingInRecipeUnit = convertFromGrams(missingInGrams, reqIng.unit_id || reqIng.unit);
        
        missingIngredients.push({
          ...reqIng,
          name: isBg 
            ? (reqIng.ingredient_bg || reqIng.name_bg || reqIng.ingredient_id) 
            : (reqIng.ingredient_en || reqIng.name_en || reqIng.ingredient_id),
          quantityToBuy: Math.max(0, missingInRecipeUnit)
        });
      }
    });

    return missingIngredients;
  }, [pantry, isBg, convertToGrams, convertFromGrams]);

  useEffect(() => {
    const unsubIng = onSnapshot(query(collection(db, 'ingredients')), (snapshot) => {
      setIngredientsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Could not load ingredients:", err.message);
    });

    const unsubMeas = onSnapshot(query(collection(db, 'measurements')), (snapshot) => {
      setMeasurementsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Could not load measurements:", err.message);
    });

    return () => {
      unsubIng();
      unsubMeas();
    };
  }, []);

  useEffect(() => {
    // We will fetch a general batch of recipes and sort/filter them client-side.
    // This avoids the need for manual composite indexes in Firebase for now.
    const q = query(collection(db, 'recipes')); 

    const unsub = onSnapshot(q, 
      (snapshot) => {
        let all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // 1. Filter out deleted and private variations. Include active public variations.
        let filtered = all.filter(r => 
          r.is_deleted !== true && 
          (!r.parent_recipe_id || r.is_public_variation === true) &&
          r.is_active !== false
        );

        // 2. Apply search filter
        if (searchQuery) {
          const queryLower = searchQuery.toLowerCase();
          filtered = filtered.filter(r => {
            const titleBg = r.title_bg || '';
            const titleEn = r.title_en || '';
            if (titleBg.toLowerCase().includes(queryLower) || titleEn.toLowerCase().includes(queryLower)) {
              return true;
            }

            if (r.ingredients && Array.isArray(r.ingredients)) {
              for (const ing of r.ingredients) {
                // Check inline names
                const ingBg = ing.ingredient_bg || ing.name_bg || '';
                const ingEn = ing.ingredient_en || ing.name_en || '';
                if (ingBg.toLowerCase().includes(queryLower) || ingEn.toLowerCase().includes(queryLower)) {
                  return true;
                }

                // Check master ingredientsList match by ID
                const dbIng = ingredientsList.find(dbI => dbI.id === ing.ingredient_id);
                if (dbIng) {
                  const dbNameBg = dbIng.name_bg || '';
                  const dbNameEn = dbIng.name_en || '';
                  if (dbNameBg.toLowerCase().includes(queryLower) || dbNameEn.toLowerCase().includes(queryLower)) {
                    return true;
                  }
                }
              }
            }
            return false;
          });
        }

        // 2.5 Apply category filter
        if (selectedCategory) {
          filtered = filtered.filter(r => r.category_id === selectedCategory);
        }

        // 2.6 Apply author filter
        if (authorFilter) {
          filtered = filtered.filter(r => 
            r.publisher_id === authorFilter || 
            (authorNameFilter && (r.publisher_name === authorNameFilter || r.original_author === authorNameFilter))
          );
        }

        // 3. Apply sorting based on tab
        if (activeTab === 'newest' || activeTab === 'all') {
          const getTime = (val) => {
            if (!val) return 0;
            if (val.seconds) return val.seconds * 1000;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            return new Date(val).getTime() || 0;
          };
          filtered.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        } else if (activeTab === 'top') {
          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (activeTab === 'popular') {
          filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        }

        // If searching or filtering by category, show all matching results.
        // If active tab is 'all', show up to 150 recipes.
        // Otherwise, limit to top 10.
        if (searchQuery || selectedCategory || authorFilter) {
          setRealRecipes(filtered);
        } else if (activeTab === 'all') {
          setRealRecipes(filtered.slice(0, 150));
        } else {
          setRealRecipes(filtered.slice(0, 10));
        }
        setFetchError(null);
        setLoading(false);
      },
      (err) => {
        console.warn("Could not load recipes:", err.message);
        setFetchError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeTab, searchQuery, selectedCategory, authorFilter, authorNameFilter, pantry, ingredientsList, analyzeRecipe]); // Re-run when tab, search, category, pantry, ingredientsList or analyzeRecipe changes

  useEffect(() => {
    // Fetch a featured recipe pool (up to 100) to select from
    const qFeatured = query(
      collection(db, 'recipes'), 
      limit(100)
    );
    const unsubFeatured = onSnapshot(qFeatured, 
      (snapshot) => {
        if (!snapshot.empty) {
          const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const valid = all.filter(r => r.is_deleted !== true);
          
          if (valid.length > 0) {
            // Sort by id to ensure stable ordering across all devices
            valid.sort((a, b) => a.id.localeCompare(b.id));
            
            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            // Generate stable hash from the date string
            let hash = 0;
            for (let i = 0; i < dateStr.length; i++) {
              hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Pick a recipe based on the hash
            const index = Math.abs(hash) % valid.length;
            setFeaturedRecipe(valid[index]);
          }
        }
      },
      (err) => {
        console.warn("Featured recipe fetch error:", err.message);
      }
    );
    return () => unsubFeatured();
  }, []);
  const featuredCuisineObj = featuredRecipe?.cuisine_id ? getCuisineById(featuredRecipe.cuisine_id) : null;
  const featuredCuisineName = featuredCuisineObj ? (isBg ? featuredCuisineObj.name.bg : featuredCuisineObj.name.en) : (isBg ? 'Световна Селекция' : 'Global Selection');
  const calculatedFeaturedTags = getRecipeTags(featuredRecipe, ingredientsList);
  const featuredTags = calculatedFeaturedTags.length > 0 ? calculatedFeaturedTags : (featuredRecipe?.tags || []);

  const top10Ingredients = useMemo(() => {
    if (!showTop10 || !realRecipes.length || !ingredientsList.length) return [];
    
    const usageCount = {};
    realRecipes.forEach(recipe => {
      if (recipe.ingredients) {
        const uniqueIds = new Set();
        recipe.ingredients.forEach(ing => {
          if (ing.ingredient_id) uniqueIds.add(ing.ingredient_id);
        });
        uniqueIds.forEach(id => {
          if (!usageCount[id]) usageCount[id] = 0;
          usageCount[id]++;
        });
      }
    });

    // 1. Map to DB ingredients and filter out invalid ones
    const allCounted = Object.keys(usageCount).map(id => {
      const dbIng = ingredientsList.find(i => i.id === id);
      return {
        ...dbIng,
        id,
        count: usageCount[id]
      };
    }).filter(i => i.name_bg || i.name_en);

    // 2. Filter out basic staples
    const filtered = allCounted.filter(i => {
      const mainGroup = i.classification?.main_group || '';
      const name = (i.name_bg || '').toLowerCase();
      
      const normGroup = normalizeMainGroup(mainGroup);
      const isSpiceOrFat = normGroup === 'spices' || normGroup === 'fats';
      const isBasicStaple = name.includes('вода') || name.includes('сол') || name.includes('захар') || name.includes('брашно') || name.includes('оцет');
      
      return !(isSpiceOrFat || isBasicStaple);
    });

    // 3. Sort by count and take top 12
    return filtered.sort((a, b) => b.count - a.count).slice(0, 12);
  }, [showTop10, realRecipes, ingredientsList]);

  return (
    <div className="flex-1 pb-4">
      {/* Featured Section (Dynamic Accent) */}
      <section className="p-4">
        {featuredRecipe ? (
          <div 
            className="relative group @container cursor-pointer" 
            onClick={() => navigate(`/recipe/${featuredRecipe.id}`)}
          >
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-surface-dark shadow-[0_10px_40px_rgba(212,175,53,0.15)] transition-all duration-500 hover:shadow-[0_15px_50px_rgba(212,175,53,0.25)] border border-primary/20">
              <img 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt={isBg ? featuredRecipe.title_bg : featuredRecipe.title_en} 
                src={featuredRecipe.images?.main || "/images/recipe-placeholder.png"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent opacity-90"></div>
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <span className="inline-block px-3 py-1 mb-3 rounded-full bg-primary text-background-dark text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-primary/30">
                  {isBg ? 'АКЦЕНТ НА ДЕНЯ' : 'TODAY\'S FEATURE'}
                </span>
                <h2 className="text-white text-3xl font-extrabold leading-tight drop-shadow-lg">
                  {isBg ? featuredRecipe.title_bg : featuredRecipe.title_en}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-2 py-1 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-bold uppercase tracking-tighter shadow-md">
                    {featuredCuisineName}
                  </span>
                  {featuredTags.map(tag => (
                    <span key={tag} className="px-2 py-1 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-tighter shadow-md">
                      {translateTag(tag, isBg)}
                    </span>
                  ))}
                </div>
                 <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-sm fill-[1]">star</span>
                    <span className="text-sm font-black">{(featuredRecipe.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    <span className="text-xs font-bold">{featuredRecipe.views_count || 0}</span>
                  </div>
                  {calculateEstimatedPrice(featuredRecipe, ingredientsList) && (
                    <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[10px] font-bold" title={isBg ? 'Ориентировъчна цена за порция' : 'Estimated price per serving'}>
                      <span className="material-symbols-outlined text-[13px]">payments</span>
                      <span>~{calculateEstimatedPrice(featuredRecipe, ingredientsList)} {isBg ? 'Евро/порция' : 'EUR/serving'}</span>
                    </div>
                  )}
                  {featuredRecipe.video_url && (
                    <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold">
                      <span className="material-symbols-outlined text-[13px]">play_circle</span>
                      <span>{isBg ? 'Видео' : 'Video'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-72 w-full bg-surface-dark rounded-2xl animate-pulse"></div>
        )}
      </section>

      {/* Search Header */}
      <section className="px-4 py-2">
        <div className="relative group">
          <input 
            type="text"
            placeholder={isBg ? "Потърси рецепта..." : "Search recipes..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-dark border-2 border-primary/20 rounded-2xl py-4 pl-12 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none transition-all shadow-lg"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>
      </section>

      {/* Dynamic Tabs */}
      <section className="px-4 mt-2">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'newest', bg: 'Най-нови', en: 'Newest' },
            { id: 'top', bg: 'Най-оценявани', en: 'Top Rated' },
            { id: 'popular', bg: 'Най-гледани', en: 'Most Viewed' },
            { id: 'all', bg: 'Всички', en: 'All' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center ${
                activeTab === tab.id 
                  ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'bg-surface-dark text-slate-400 border border-primary/10 hover:border-primary/30'
              }`}
            >
              {isBg ? tab.bg : tab.en}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-100 text-2xl font-bold tracking-tight">
            {activeTab === 'all' ? (isBg ? 'Всички рецепти' : 'All Recipes') : 
             activeTab === 'newest' ? (isBg ? 'Най-нови' : 'Newest Recipes') :
             activeTab === 'top' ? (isBg ? 'Най-оценявани' : 'Top Rated') : 
             (isBg ? 'Най-гледани' : 'Most Viewed')}
            {selectedCategory && ` • ${getPluralCategoryName(selectedCategory, isBg ? 'bg' : 'en')}`}
          </h3>
        </div>

        {/* Author Filter Badge */}
        {authorFilter && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary shrink-0">person_search</span>
              <p className="text-xs font-bold text-slate-100 truncate">
                {isBg ? `Рецепти от готвач: ${authorNameFilter || 'Готвача'}` : `Recipes by chef: ${authorNameFilter || 'Chef'}`}
              </p>
            </div>
            <button 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('author');
                newParams.delete('authorName');
                setSearchParams(newParams);
              }}
              className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0 ml-2 flex items-center justify-center rounded-lg hover:bg-primary/20"
              title={isBg ? 'Премахни филтъра' : 'Clear filter'}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Category Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              selectedCategory === null
                ? 'bg-primary text-background-dark shadow-md shadow-primary/20 scale-[1.02]'
                : 'bg-surface-dark text-slate-300 border border-primary/10 hover:border-primary/20'
            }`}
          >
            <span>🍽️</span>
            <span>{isBg ? 'Всички' : 'All'}</span>
          </button>
          {getRootCategories().map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-background-dark shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-surface-dark text-slate-300 border border-primary/10 hover:border-primary/20'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{getPluralCategoryName(cat.id, isBg ? 'bg' : 'en')}</span>
              </button>
            );
          })}
        </div>
        
        <div className="grid grid-cols-1 gap-5">
          {loading ? (
            <div className="flex justify-center p-10"><span className="material-symbols-outlined animate-spin text-primary">refresh</span></div>
          ) : fetchError ? (
            <div className="text-center py-10 px-6 border border-rose-500/20 rounded-2xl bg-rose-500/5">
              <span className="material-symbols-outlined text-rose-500 text-4xl mb-2">error</span>
              <p className="text-rose-500 text-sm font-bold uppercase tracking-tight">{isBg ? 'Грешка при зареждане' : 'Load Error'}</p>
              <p className="text-[10px] text-slate-400 mt-1 mb-4">{fetchError}</p>
              {fetchError.includes('index') && (
                <a 
                  href="https://console.firebase.google.com/v1/r/project/project-08fabab9-ca3c-4140-9d7/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9wcm9qZWN0LTA4ZmFiYWI5LWNhM2MtNDE0MC05ZDcvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3JlY2lwZXMvaW5kZXhlcy9fEAEaDgoKaXNfZGVsZXRlZBABGgoKBnJhdGluZxACGgwKCF9fbmFtZV9fEAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-rose-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-500/20"
                >
                  {isBg ? 'СЪЗДАЙ ИНДЕКС' : 'CREATE INDEX'}
                </a>
              )}
            </div>
          ) : realRecipes.length === 0 ? (
            <div className="text-center py-10 text-slate-500 uppercase text-[10px] tracking-widest font-bold border border-primary/10 rounded-2xl bg-surface-dark/30">
              {isBg ? 'Все още няма въведени рецепти' : 'No recipes found yet'}
            </div>
          ) : realRecipes.map(recipe => {
            const title = isBg ? recipe.title_bg : recipe.title_en;
            const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
            const difficulty = isBg ? (recipe.difficulty === 'easy' ? 'Лесно' : recipe.difficulty === 'hard' ? 'Трудно' : 'Средно') : (recipe.difficulty || 'medium');
            const imageUrl = recipe.images?.main || "/images/recipe-placeholder.png";

            const cuisineObj = recipe.cuisine_id ? getCuisineById(recipe.cuisine_id) : null;
            const cuisineName = cuisineObj ? (isBg ? cuisineObj.name.bg : cuisineObj.name.en) : (isBg ? 'Световна Селекция' : 'Global Selection');
            const calculatedTags = getRecipeTags(recipe, ingredientsList);
            const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);

            return (
              <div key={recipe.id} className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:border-primary/50 transition-colors flex flex-col group cursor-pointer" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                <div className="flex h-auto min-h-[10rem]">
                  <div className="w-[35%] overflow-hidden relative">
                    <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={title} src={imageUrl}/>
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
                        <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-0.5 rounded text-slate-300">
                          <span className="material-symbols-outlined text-[13px]">visibility</span> 
                          {recipe.views_count || 0}
                        </span>
                        {calculateEstimatedPrice(recipe, ingredientsList) && (
                          <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded" title={isBg ? 'Ориентировъчна цена за порция' : 'Estimated price per serving'}>
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>~{calculateEstimatedPrice(recipe, ingredientsList)} {isBg ? 'Евро/порция' : 'EUR/serving'}</span>
                          </span>
                        )}
                        {recipe.video_url && (
                          <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded" title={isBg ? 'Има видео рецепта' : 'Has Video Recipe'}>
                            <span className="material-symbols-outlined text-[13px]">play_circle</span>
                            <span>{isBg ? 'Видео' : 'Video'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-auto pt-1">
                      <button className="size-8 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {realRecipes.length > 0 && (
          <div className="mt-8 px-2">
            <button 
              onClick={() => setShowTop10(!showTop10)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-dark border border-primary/20 text-primary font-bold hover:bg-primary/10 transition-colors shadow-md"
            >
              <span className="material-symbols-outlined">{showTop10 ? 'expand_less' : 'workspace_premium'}</span>
              {isBg ? 'Най-използвани 12 продукта' : 'Top 12 Most Used Ingredients'}
            </button>

            {showTop10 && (
              <div className="mt-4 grid grid-cols-3 gap-3 pb-4">
                {top10Ingredients.map((ing, idx) => (
                  <div key={ing.id} className="w-full bg-surface-dark/80 rounded-2xl p-2.5 border border-primary/10 flex flex-col items-center justify-center text-center shadow-lg relative">
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-[#b8860b] text-background-dark font-black text-[10px] flex items-center justify-center shadow-md border border-background-dark">
                      {idx + 1}
                    </div>
                    <span className="material-symbols-outlined text-3xl text-primary/50 mb-2">{ing.icon || 'restaurant'}</span>
                    <span className="text-slate-100 text-[11px] font-bold line-clamp-2 leading-tight h-8 flex items-center">
                      {isBg ? (ing.name_bg || ing.name_en) : ing.name_en}
                    </span>
                    <span className="text-primary text-[10px] mt-1 font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                      {ing.count} {isBg ? 'рецепти' : 'recipes'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="px-4 mt-10">
        <div className="bg-gradient-to-br from-primary/20 via-surface-dark to-background-dark p-6 rounded-3xl border border-primary/30 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h4 className="text-primary font-extrabold text-xl mb-2">{t('home.what_to_cook')}</h4>
            <p className="text-slate-300 text-sm mb-6 font-medium">{t('home.find_based_on_ingredients')}</p>
            <Link to="/ai-assistant" className="inline-block bg-gradient-to-r from-primary to-[#b8860b] text-background-dark px-6 py-3 rounded-xl text-sm font-bold shadow-[0_5px_20px_rgba(212,175,53,0.4)] hover:shadow-[0_8px_25px_rgba(212,175,53,0.5)] hover:-translate-y-1 transition-all active:translate-y-0">
              {t('home.try_ai')}
            </Link>
          </div>
          <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-primary/10 text-[140px] rotate-12">lightbulb</span>
        </div>
      </section>

      <section className="px-4 mt-8 pb-8">
        <h3 className="text-slate-100 text-2xl font-bold tracking-tight mb-4">{isBg ? 'Открий & Планирай' : 'Discover & Plan'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/planner" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">calendar_month</span>
            <span className="text-sm font-bold text-slate-100 text-center">{isBg ? 'Седмично меню' : 'Weekly Menu'}</span>
          </Link>
          <Link to="/seasonal" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">ac_unit</span>
            <span className="text-sm font-bold text-slate-100 text-center">{isBg ? 'Сезонно меню' : 'Seasonal Menu'}</span>
          </Link>
          <Link to="/cuisines" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group col-span-2">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">public</span>
            <span className="text-sm font-bold text-slate-100">{isBg ? 'Световни кухни' : 'Explore Cuisines'}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

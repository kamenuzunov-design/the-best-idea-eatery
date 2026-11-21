import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import { getLocalizedCuisine } from '../data/cuisines';
import { translateTag, getRecipeTags, normalizeMainGroup, passesDietaryProfile } from '../lib/recipeMetaUtils';
import { getRootCategories } from '../data/recipe_categories';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedRecipeTitle, getLocalizedField, matchesRecipeSearch } from '../lib/localeUtils';
import { 
  normalizeUnitId, 
  normalizeToCanonical, 
  GRAMS_PER_OZ, 
  ML_PER_FL_OZ, 
  OZ_PER_LB 
} from '../lib/unitConverter';
import { matchesPantryItem } from '../lib/recipeMatcherEngine.js';

const getPluralCategoryName = (id, t) => {
  return t ? t(`categories.${id}`, { defaultValue: id }) : id;
};

const getVotesCount = (recipe) => {
  if (!recipe) return 0;
  return Number(recipe.votes_count ?? recipe.reviews_count ?? (Array.isArray(recipe.ratings) ? recipe.ratings.length : 0)) || 0;
};

const Home = () => {
  const { user } = useAuth();
  const { pantry } = useAppContext();
  const { t, i18n } = useTranslation();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authorFilter = searchParams.get('author');
  const authorNameFilter = searchParams.get('authorName');
  const isBg = i18n.language === 'bg';

  const [realRecipes, setRealRecipes] = useState([]);
  const [allPublicRecipes, setAllPublicRecipes] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('newest'); // 'smart' | 'newest' | 'top' | 'popular'
  const initialQuery = searchParams.get('search') || searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTop10, setShowTop10] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [measurementsList, setMeasurementsList] = useState([]);

  // Pagination (12 recipes per page -> exactly 3 rows of 4 on desktop)
  const [currentPage, setCurrentPage] = useState(1);
  const RECIPES_PER_PAGE = 12;

  const authorFilterRef = useRef(null);
  const searchInputRef = useRef(null);
  const recipeCatalogRef = useRef(null);

  useEffect(() => {
    const qFromUrl = searchParams.get('search') || searchParams.get('q');
    if (qFromUrl !== null && qFromUrl !== undefined) {
      const timer = setTimeout(() => {
        setSearchQuery(qFromUrl);
        if (qFromUrl && searchInputRef.current) {
          searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authorFilter && authorFilterRef.current) {
      const timer = setTimeout(() => {
        authorFilterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [authorFilter]);

  const convertToGrams = useCallback((amount, unitId) => {
    if (!unitId || !amount) return amount || 0;
    const norm = normalizeUnitId(unitId);

    const canonical = normalizeToCanonical({ amount, unitId: norm });
    if (canonical.unit === 'g' || canonical.unit === 'ml') {
      return canonical.amount;
    }

    const unit = measurementsList.find(m => 
      m.id === unitId || 
      m.unit_id === unitId || 
      normalizeUnitId(m.id || m.unit_id || m.slug) === norm
    );
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
    if (!unitId || !amountInGrams) return amountInGrams || 0;
    const norm = normalizeUnitId(unitId);

    if (norm === 'g' || norm === 'ml') return amountInGrams;
    if (norm === 'kg' || norm === 'l') return amountInGrams / 1000;
    if (norm === 'oz') return amountInGrams / GRAMS_PER_OZ;
    if (norm === 'lb') return amountInGrams / (OZ_PER_LB * GRAMS_PER_OZ);
    if (norm === 'fl_oz') return amountInGrams / ML_PER_FL_OZ;

    const unit = measurementsList.find(m => 
      m.id === unitId || 
      m.unit_id === unitId || 
      normalizeUnitId(m.id || m.unit_id || m.slug) === norm
    );
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
      // Find in pantry by robust matching (ID, slug, or multi-lingual name)
      const pantryItem = pantry.find(p => matchesPantryItem(reqIng, p));
      
      const requiredAmount = parseFloat(reqIng.amount) || 0;
      const servings = recipe.servings || 2;
      const scaledAmount = requiredAmount * servings;
      
      const origUnit = reqIng.unit_id || reqIng.unit || '';
      const normOrig = normalizeUnitId(origUnit);

      const pantryAmount = pantryItem ? (parseFloat(pantryItem.quantity) || 0) : 0;
      const pantryUnit = pantryItem ? (pantryItem.unit || pantryItem.unit_id || '') : '';
      const normPantryUnit = normalizeUnitId(pantryUnit);

      const dbIng = ingredientsList.find(i => 
        i.id === reqIng.ingredient_id || 
        i.slug === reqIng.ingredient_id ||
        (reqIng.id && (i.id === reqIng.id || i.slug === reqIng.id))
      );

      const convertIngToGrams = (amt, uId) => {
        if (!uId || !amt) return amt || 0;
        const normU = normalizeUnitId(uId);

        const canonical = normalizeToCanonical({ amount: amt, unitId: normU });
        if (canonical.unit === 'g' || canonical.unit === 'ml') {
          return canonical.amount;
        }

        if (dbIng?.units_mapping && Array.isArray(dbIng.units_mapping)) {
          const mapEntry = dbIng.units_mapping.find(m => 
            normalizeUnitId(m.unit_id) === normU || m.unit_id === uId
          );
          if (mapEntry && (mapEntry.weight_grams || mapEntry.to_g)) {
            return amt * (mapEntry.weight_grams || mapEntry.to_g);
          }
        }

        return convertToGrams(amt, uId);
      };

      let isMissing = false;
      let missingInRecipeUnit = 0;

      if (!pantryItem) {
        isMissing = true;
        missingInRecipeUnit = scaledAmount;
      } else if (normOrig && normPantryUnit && normOrig === normPantryUnit) {
        if (pantryAmount < scaledAmount) {
          isMissing = true;
          missingInRecipeUnit = scaledAmount - pantryAmount;
        }
      } else {
        const scaledGrams = convertIngToGrams(scaledAmount, origUnit);
        const pantryGrams = convertIngToGrams(pantryAmount, pantryUnit);

        if (pantryGrams < scaledGrams) {
          isMissing = true;
          const missingInGrams = scaledGrams - pantryGrams;
          missingInRecipeUnit = convertFromGrams(missingInGrams, origUnit);
        }
      }

      if (isMissing) {
        missingIngredients.push({
          ...reqIng,
          name: isBg 
            ? (reqIng.ingredient_bg || reqIng.name_bg || dbIng?.name_bg || reqIng.ingredient_id) 
            : (reqIng.ingredient_en || reqIng.name_en || dbIng?.name_en || reqIng.ingredient_id),
          quantityToBuy: Math.max(0, missingInRecipeUnit)
        });
      }
    });

    return missingIngredients;
  }, [pantry, isBg, convertToGrams, convertFromGrams, ingredientsList]);

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

        setAllPublicRecipes(filtered);

        // 1.5 Apply Dietary Profile Filter (diets, allergies, excluded foods) - ONLY when browsing (no search query)
        if (!searchQuery && user?.preferences) {
          filtered = filtered.filter(r => passesDietaryProfile(r, user.preferences, ingredientsList));
        }

        // 2. Apply search filter (When searching, show ALL matching recipes regardless of dietary profile)
        if (searchQuery) {
          const searchTerms = searchQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          if (searchTerms.length > 0) {
            filtered = filtered.filter(r => matchesRecipeSearch(r, searchTerms, ingredientsList, 'some'));
          }
        }

        // 2.5 Apply category filter
        if (selectedCategory) {
          filtered = filtered.filter(r => 
            (Array.isArray(r.category_ids) && r.category_ids.includes(selectedCategory)) || 
            r.category_id === selectedCategory
          );
        }

        // 2.6 Apply author filter
        if (authorFilter) {
          filtered = filtered.filter(r => 
            r.publisher_id === authorFilter || 
            (authorNameFilter && (r.publisher_name === authorNameFilter || r.original_author === authorNameFilter))
          );
        }

        // 3. Apply sorting based on tab
        const getTime = (val) => {
          if (!val) return 0;
          if (val.seconds) return val.seconds * 1000;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          return new Date(val).getTime() || 0;
        };

        if (activeTab === 'newest' || activeTab === 'all') {
          filtered.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        } else if (activeTab === 'top') {
          filtered.sort((a, b) => {
            const ratingA = Number(a.rating) || 0;
            const ratingB = Number(b.rating) || 0;
            if (ratingB !== ratingA) {
              return ratingB - ratingA;
            }
            const votesA = getVotesCount(a);
            const votesB = getVotesCount(b);
            if (votesB !== votesA) {
              return votesB - votesA;
            }
            const viewsA = Number(a.views_count) || 0;
            const viewsB = Number(b.views_count) || 0;
            if (viewsB !== viewsA) {
              return viewsB - viewsA;
            }
            return getTime(b.createdAt) - getTime(a.createdAt);
          });
        } else if (activeTab === 'popular') {
          filtered.sort((a, b) => {
            const viewsA = Number(a.views_count) || 0;
            const viewsB = Number(b.views_count) || 0;
            if (viewsB !== viewsA) {
              return viewsB - viewsA;
            }
            const ratingA = Number(a.rating) || 0;
            const ratingB = Number(b.rating) || 0;
            if (ratingB !== ratingA) {
              return ratingB - ratingA;
            }
            const votesA = getVotesCount(a);
            const votesB = getVotesCount(b);
            if (votesB !== votesA) {
              return votesB - votesA;
            }
            return getTime(b.createdAt) - getTime(a.createdAt);
          });
        }

        // Store all filtered recipes for client-side pagination (12 per page)
        setRealRecipes(filtered);
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
  }, [activeTab, searchQuery, selectedCategory, authorFilter, authorNameFilter, pantry, ingredientsList, analyzeRecipe, user]); // Re-run when tab, search, category, pantry, ingredientsList, analyzeRecipe or user changes

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
  const featuredCuisineName = getLocalizedCuisine(featuredRecipe?.cuisine_id || featuredRecipe?.cuisine_bg, i18n.language) || t('home.global_selection');
  const calculatedFeaturedTags = getRecipeTags(featuredRecipe, ingredientsList);
  const featuredTags = calculatedFeaturedTags.length > 0 ? calculatedFeaturedTags : (featuredRecipe?.tags || []);

  const top10Ingredients = useMemo(() => {
    if (!showTop10 || !allPublicRecipes.length || !ingredientsList.length) return [];
    
    const usageCount = {};
    allPublicRecipes.forEach(recipe => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        const uniqueIds = new Set();
        recipe.ingredients.forEach(ing => {
          let foundId = ing.ingredient_id || ing.id;
          if (!foundId) {
            const ingText = (ing.ingredient_bg || ing.name_bg || ing.ingredient_en || ing.name_en || '').trim().toLowerCase();
            if (ingText) {
              const matched = ingredientsList.find(dbI => 
                (dbI.name_bg && dbI.name_bg.toLowerCase() === ingText) ||
                (dbI.name_en && dbI.name_en.toLowerCase() === ingText)
              );
              if (matched) foundId = matched.id;
            }
          }
          if (foundId) uniqueIds.add(foundId);
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
      return dbIng ? {
        ...dbIng,
        id,
        count: usageCount[id]
      } : null;
    }).filter(i => i && (i.name_bg || i.name_en || i.name));

    // 2. Filter out basic staples (water, salt, sugar, flour, vinegar, spices, fats)
    const filtered = allCounted.filter(i => {
      const mainGroup = i.classification?.main_group || '';
      const nameBg = (i.name_bg || '').toLowerCase();
      const nameEn = (i.name_en || '').toLowerCase();
      
      const normGroup = normalizeMainGroup(mainGroup);
      const isSpiceOrFat = normGroup === 'spices' || normGroup === 'fats';
      const isBasicStaple = nameBg.includes('вода') || nameBg.includes('сол') || nameBg.includes('захар') || nameBg.includes('брашно') || nameBg.includes('оцет') || nameEn.includes('water') || nameEn.includes('salt') || nameEn.includes('sugar') || nameEn.includes('flour') || nameEn.includes('vinegar');
      
      return !(isSpiceOrFat || isBasicStaple);
    });

    // 3. Sort by count descending and take top 12
    return filtered.sort((a, b) => b.count - a.count).slice(0, 12);
  }, [showTop10, allPublicRecipes, ingredientsList]);

  const handleIngredientClick = useCallback((ingName) => {
    if (!ingName) return;
    setSearchQuery(ingName);
    setSearchParams({ search: ingName });
    if (window.innerWidth < 1024 && searchInputRef.current) {
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (recipeCatalogRef.current) {
      recipeCatalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [setSearchParams]);

  // Reset pagination to page 1 on filter or search changes
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${searchQuery}|${selectedCategory}|${activeTab}|${authorFilter}`;
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  const totalRecipes = realRecipes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecipes / RECIPES_PER_PAGE));

  const paginatedRecipes = useMemo(() => {
    const startIndex = (currentPage - 1) * RECIPES_PER_PAGE;
    return realRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
  }, [realRecipes, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (recipeCatalogRef.current) {
      recipeCatalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const rootCategories = getRootCategories();

  const renderCategoryPill = (cat) => {
    const isActive = selectedCategory === cat.id;
    return (
      <button
        key={cat.id}
        onClick={() => setSelectedCategory(isActive ? null : cat.id)}
        className={`w-full lg:w-[244px] min-h-9 lg:min-h-10 h-full px-1.5 lg:px-4 py-1.5 rounded-xl text-[10.5px] sm:text-[11px] lg:text-xs font-bold leading-tight transition-all lg:whitespace-nowrap flex items-center justify-center text-center gap-1 lg:gap-2 shrink-0 border cursor-pointer ${
          isActive
            ? 'bg-brand-amber text-brand-charcoal border-brand-amber shadow-sm'
            : 'bg-surface-dark lg:bg-brand-surface text-brand-cream border-brand-border hover:border-brand-amber/50'
        }`}
      >
        <span className="shrink-0">{cat.icon}</span>
        <span>{getPluralCategoryName(cat.id, t)}</span>
      </button>
    );
  };

  const renderAllCategoriesPill = () => (
    <button
      onClick={() => setSelectedCategory(null)}
      className={`w-full lg:w-[244px] min-h-9 lg:min-h-10 h-full px-1.5 lg:px-4 py-1.5 rounded-xl text-[10.5px] sm:text-[11px] lg:text-xs font-bold leading-tight transition-all lg:whitespace-nowrap flex items-center justify-center text-center gap-1 lg:gap-2 shrink-0 border cursor-pointer ${
        selectedCategory === null
          ? 'bg-brand-amber text-brand-charcoal border-brand-amber shadow-sm'
          : 'bg-surface-dark lg:bg-brand-surface text-brand-cream border-brand-border hover:border-brand-amber/50'
      }`}
    >
      <span className="shrink-0">🍽️</span>
      <span>{t('home.all_categories')}</span>
    </button>
  );

  return (
    <div className="flex-1 pb-8 w-full lg:max-w-[1000px] mx-auto px-4 lg:px-12 py-4 space-y-6">
      {/* Featured Section (Hero Ribbon) */}
      <section className="w-full">
        {featuredRecipe ? (
          <>
            {/* Desktop Hero Ribbon (>= lg) */}
            <div 
              className="hidden lg:flex relative rounded-2xl bg-brand-surface border border-brand-border overflow-hidden shadow-xl min-h-[220px] transition-all hover:border-brand-amber/50 cursor-pointer group"
              onClick={() => navigate(`/recipe/${featuredRecipe.id}`)}
            >
              {/* Left 50% Image Container */}
              <div className="relative w-1/2 min-h-[220px] overflow-hidden shrink-0">
                <img 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  alt={getLocalizedRecipeTitle(featuredRecipe, i18n.language)} 
                  src={featuredRecipe.images?.main || "/images/recipe-placeholder.png"}
                />
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-amber text-brand-charcoal shadow-md">
                  {t('home.featured_badge')}
                </span>
              </div>

              {/* Right 50% Information Content */}
              <div className="w-1/2 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-brand-amber/15 text-brand-amber border border-brand-amber/40">
                      {featuredCuisineName}
                    </span>
                    {featuredTags.map(tag => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {translateTag(tag, i18n.language)}
                      </span>
                    ))}
                    <span className="text-xs text-brand-muted">•</span>
                    <span className="text-xs text-brand-cream font-medium">⏱ {(featuredRecipe.prep_time || 0) + (featuredRecipe.cook_time || 0)} мин</span>
                  </div>

                  <h2 className="text-2xl font-black text-white tracking-tight leading-snug group-hover:text-brand-amber transition-colors">
                    {getLocalizedRecipeTitle(featuredRecipe, i18n.language)}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-amber">
                      <span>★</span>
                      <span className="text-slate-100 font-extrabold">{(featuredRecipe.rating || 0).toFixed(1)}</span>
                      <span className="text-brand-muted font-normal text-[11px]">({getVotesCount(featuredRecipe)} {t('home.ratings_count', 'оценки')})</span>
                    </div>
                    <div className="h-3 w-[1px] bg-brand-border"></div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-cream" title={t('home.views_title', 'Брой гледания')}>
                      <span className="material-symbols-outlined text-[15px] text-brand-amber">visibility</span>
                      <span className="text-slate-100 font-extrabold">{featuredRecipe.views_count || 0}</span>
                      <span className="text-brand-muted font-normal text-[11px]">{t('home.views_label', 'гледания')}</span>
                    </div>
                    {calculateEstimatedPrice(featuredRecipe, ingredientsList) && (
                      <>
                        <div className="h-3 w-[1px] bg-brand-border"></div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-emeraldBg/90 border border-brand-emerald/40 text-brand-emerald text-xs font-bold">
                          <span className="material-symbols-outlined text-[14px]">payments</span>
                          <span>~{calculateEstimatedPrice(featuredRecipe, ingredientsList)} € / порция</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/recipe/${featuredRecipe.id}`);
                    }}
                    className="inline-flex items-center justify-center gap-2 w-44 py-2.5 px-4 rounded-xl bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    <span>{t('home.view_btn', 'Прегледай')}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/recipe/${featuredRecipe.id}/cooking`);
                    }}
                    className="inline-flex items-center justify-center gap-2 w-44 py-2.5 px-4 rounded-xl bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                    <span>{t('home.cook_now_btn', 'Сготви сега')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Hero Card (< lg) */}
            <div 
              className="lg:hidden relative group @container cursor-pointer" 
              onClick={() => navigate(`/recipe/${featuredRecipe.id}`)}
            >
              <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-surface-dark shadow-[0_10px_40px_rgba(212,175,53,0.15)] transition-all duration-500 hover:shadow-[0_15px_50px_rgba(212,175,53,0.25)] border border-primary/20">
                <img 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={getLocalizedRecipeTitle(featuredRecipe, i18n.language)} 
                  src={featuredRecipe.images?.main || "/images/recipe-placeholder.png"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent opacity-90"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="inline-block px-3 py-1 mb-3 rounded-full bg-primary text-background-dark text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-primary/30">
                    {t('home.featured_badge')}
                  </span>
                  <h2 className="text-white text-3xl font-extrabold leading-tight drop-shadow-lg">
                    {getLocalizedRecipeTitle(featuredRecipe, i18n.language)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="px-2 py-1 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-bold uppercase tracking-tighter shadow-md">
                      {featuredCuisineName}
                    </span>
                    {featuredTags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-tighter shadow-md">
                        {translateTag(tag, i18n.language)}
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
                      <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[10px] font-bold" title={t('home.estimated_price_title')}>
                        <span className="material-symbols-outlined text-[13px]">payments</span>
                        <span>{t('home.per_serving', { price: calculateEstimatedPrice(featuredRecipe, ingredientsList) })}</span>
                      </div>
                    )}
                    {featuredRecipe.video_url && (
                      <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold" title={t('home.has_video_title')}>
                        <span className="material-symbols-outlined text-[13px]">play_circle</span>
                        <span>{t('home.video_badge')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-64 w-full bg-surface-dark rounded-2xl animate-pulse"></div>
        )}
      </section>

      {/* What to Cook Now Banner */}
      <section className="w-full">
        <div className="p-4 rounded-xl bg-gradient-to-r from-brand-surface to-brand-surfaceMuted border border-brand-border/90 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full lg:flex-1 flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="size-11 rounded-xl bg-brand-amber/15 border border-brand-amber/30 text-brand-amber flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-2xl font-black">kitchen</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t('what_to_cook.home_banner_btn', 'Какво да сготвя сега?')}</span>
                {pantry && pantry.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-amber text-brand-charcoal shrink-0">
                    {pantry.length}
                  </span>
                )}
              </h4>
              <p className="text-xs text-brand-muted mt-0.5 leading-snug">
                {t('what_to_cook.home_banner_desc', 'Вижте кои рецепти можете да приготвите веднага с продуктите от килера си!')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 shrink-0 w-full lg:w-auto">
            <Link
              to="/ai-search"
              className="inline-flex items-center justify-center gap-1.5 px-3 lg:px-5 py-2.5 rounded-xl bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal font-black text-[11px] lg:text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="truncate">{t('home.find_by_pantry', 'Намери рецепти')}</span>
              <span className="material-symbols-outlined text-base font-black shrink-0">arrow_forward</span>
            </Link>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center justify-center gap-1.5 px-3 lg:px-5 py-2.5 rounded-xl bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal font-black text-[11px] lg:text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              title={t('pantry.chef_ai_btn')}
            >
              <span className="material-symbols-outlined text-base font-black shrink-0">auto_awesome</span>
              <span className="truncate">{t('pantry.chef_ai_btn')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Top 12 Most Used Ingredients */}
      {allPublicRecipes.length > 0 && (
        <section className="w-full">
          <button 
            onClick={() => setShowTop10(!showTop10)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-dark lg:bg-brand-surface border border-primary/20 lg:border-brand-border text-primary lg:text-brand-amber font-bold hover:bg-primary/10 lg:hover:border-brand-amber/60 transition-colors shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined">{showTop10 ? 'expand_less' : 'workspace_premium'}</span>
            {t('home.top_ingredients_btn')}
          </button>

          {showTop10 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 pb-2">
              {top10Ingredients.map((ing, idx) => {
                const ingName = getLocalizedField(ing, 'name', i18n.language) || ing[`name_${i18n.language}`] || (isBg ? ing.name_bg : ing.name_en) || ing.name_en || ing.name_bg || ing.id;
                return (
                  <button
                    key={ing.id}
                    onClick={() => handleIngredientClick(ingName)}
                    className="w-full bg-surface-dark/80 lg:bg-brand-surface rounded-2xl p-2.5 border border-primary/10 lg:border-brand-border flex flex-col items-center justify-center text-center shadow-lg relative hover:border-primary/50 lg:hover:border-brand-amber hover:bg-primary/10 hover:scale-[1.03] transition-all cursor-pointer group"
                    title={t('home.search_with_ingredient', { name: ingName })}
                  >
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-[#b8860b] text-background-dark font-black text-[10px] flex items-center justify-center shadow-md border border-background-dark">
                      {idx + 1}
                    </div>
                    <span className="material-symbols-outlined text-3xl text-primary/50 group-hover:text-primary mb-2 transition-colors">
                      {ing.icon || 'restaurant'}
                    </span>
                    <span className="text-slate-100 group-hover:text-primary text-[11px] font-bold line-clamp-2 leading-tight h-8 flex items-center underline decoration-primary/30 group-hover:decoration-primary underline-offset-2 transition-colors">
                      {ingName}
                    </span>
                    <span className="text-primary text-[10px] mt-1 font-bold bg-primary/10 group-hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors">
                      {t('home.recipes_count', { count: ing.count })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Dynamic Tabs (Sorting Pills) */}
      <section className="w-full">
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center justify-center mx-auto gap-2.5 lg:gap-3 py-1">
          {[
            { id: 'newest', label: t('home.tabs.newest') },
            { id: 'top', label: t('home.tabs.top') },
            { id: 'popular', label: t('home.tabs.popular') },
            { id: 'all', label: t('home.tabs.all') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full lg:w-[200px] h-9 lg:h-10 px-3 lg:px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center text-center border cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-brand-amber text-brand-charcoal border-brand-amber shadow-sm' 
                  : 'bg-surface-dark lg:bg-brand-surface text-brand-cream border-brand-border hover:border-brand-amber/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Catalog & Filter Section */}
      <section ref={recipeCatalogRef} className="w-full space-y-4 scroll-mt-32">
        <div className="w-full lg:w-fit mx-auto space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-white text-lg lg:text-xl font-extrabold tracking-tight">
              {t(`home.headings.${activeTab}`)}
              {selectedCategory && ` • ${getPluralCategoryName(selectedCategory, t)}`}
            </h3>
            <span className="text-xs text-brand-muted font-medium">
              {t('home.total_count', 'Показани:')} <strong className="text-slate-100">{paginatedRecipes.length} от {totalRecipes}</strong>
              {totalPages > 1 && (
                <span className="text-[11px] text-brand-muted ml-1.5 font-normal">
                  (Стр. {currentPage}/{totalPages})
                </span>
              )}
            </span>
          </div>

          {/* Author Filter Badge */}
          {authorFilter && (
            <div ref={authorFilterRef} className="scroll-mt-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between shadow-md animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary shrink-0">person_search</span>
                <p className="text-xs font-bold text-slate-100 truncate">
                  {t('home.author_filter', { name: authorNameFilter || t('home.author_default') })}
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
                title={t('home.clear_filter')}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* Category Filter Pills (4 rows x 3 columns on both Desktop & Mobile, centered, enlarged width on Desktop) */}
          <div className="grid grid-cols-3 lg:w-fit gap-2 lg:gap-3 py-1">
            {renderAllCategoriesPill()}
            {rootCategories.map(renderCategoryPill)}
          </div>
        </div>

        {/* Instant Recipe Search (desktop & mobile, directly before Recipe Grid) */}
        <div ref={searchInputRef} className="relative group scroll-mt-24">
          <input 
            type="text"
            placeholder={t('home.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-dark border-2 border-primary/20 rounded-xl py-3 pl-11 pr-10 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none transition-all shadow-md text-sm"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xl">search</span>
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchParams({}); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>
        
        {/* Recipe Grid (1 column on mobile < lg; 3-4 columns on desktop >= lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span></div>
          ) : fetchError ? (
            <div className="col-span-full text-center py-10 px-6 border border-rose-500/20 rounded-2xl bg-rose-500/5">
              <span className="material-symbols-outlined text-rose-500 text-4xl mb-2">error</span>
              <p className="text-rose-500 text-sm font-bold uppercase tracking-tight">{t('home.load_error')}</p>
              <p className="text-[10px] text-slate-400 mt-1 mb-4">{fetchError}</p>
              {fetchError.includes('index') && (
                <a 
                  href="https://console.firebase.google.com/v1/r/project/project-08fabab9-ca3c-4140-9d7/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9wcm9qZWN0LTA4ZmFiYWI5LWNhM2MtNDE0MC05ZDcvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3JlY2lwZXMvaW5kZXhlcy9fEAEaDgoKaXNfZGVsZXRlZBABGgoKBnJhdGluZxACGgwKCF9fbmFtZV9fEAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-rose-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-500/20"
                >
                  {t('home.create_index')}
                </a>
              )}
            </div>
          ) : realRecipes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 uppercase text-xs tracking-widest font-bold border border-brand-border rounded-2xl bg-brand-surface/40">
              {t('home.empty_recipes')}
            </div>
          ) : paginatedRecipes.map(recipe => {
            const title = getLocalizedRecipeTitle(recipe, i18n.language);
            const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
            const difficulty = t(`home.difficulty.${recipe.difficulty || 'medium'}`);
            const imageUrl = getRecipeImageUrl(recipe);

            const cuisineName = getLocalizedCuisine(recipe.cuisine_id || recipe.cuisine_bg, i18n.language) || t('home.global_selection');
            const calculatedTags = getRecipeTags(recipe, ingredientsList);
            const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);
            const isLongTitle = typeof title === 'string' && title.trim().length > 20;

            return (
              <div 
                key={recipe.id} 
                className="bg-surface-dark/95 lg:bg-brand-surface backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 lg:border-brand-border shadow-lg hover:border-primary/50 lg:hover:border-brand-amber transition-all duration-300 flex flex-col justify-between group cursor-pointer relative" 
                onClick={() => navigate(`/recipe/${recipe.id}`)}
              >
                {/* MOBILE VIEW (< lg): Classic horizontal layout in 1 column */}
                <div className="flex lg:hidden h-auto min-h-[10rem]">
                  <div className="w-[35%] overflow-hidden relative">
                    <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={title} src={imageUrl}/>
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
                            <div className="relative bg-surface-dark/95 backdrop-blur-md text-slate-100 text-xs font-semibold p-2.5 rounded-xl border border-primary/40 shadow-2xl shadow-black/20 dark:shadow-black/80 flex items-start gap-1.5">
                              <div className="absolute -top-1 left-4 size-2 rotate-45 bg-surface-dark border-t border-l border-primary/40"></div>
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
                            {translateTag(tag, i18n.language)}
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
                          {(recipe.rating || 0).toFixed(1)} ({getVotesCount(recipe)})
                        </span>
                        <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-0.5 rounded text-slate-300">
                          <span className="material-symbols-outlined text-[13px]">visibility</span> 
                          {recipe.views_count || 0}
                        </span>
                        {calculateEstimatedPrice(recipe, ingredientsList) && (
                          <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded" title={t('home.estimated_price_title')}>
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>{t('home.per_serving', { price: calculateEstimatedPrice(recipe, ingredientsList) })}</span>
                          </span>
                        )}
                        {recipe.video_url && (
                          <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded" title={t('home.has_video_title')}>
                            <span className="material-symbols-outlined text-[13px]">play_circle</span>
                            <span>{t('home.video_badge')}</span>
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

                {/* DESKTOP VIEW (>= lg): Vertical Gourmet Artisan Card from Stitch */}
                <div className="hidden lg:flex flex-col h-full justify-between">
                  <div>
                    <div className="relative h-48 w-full overflow-hidden bg-brand-charcoal shrink-0">
                      <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={title} src={imageUrl} />
                      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent"></div>
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[85%]">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-brand-amber text-brand-charcoal shadow-sm">
                          {cuisineName}
                        </span>
                        {tags.slice(0, 1).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/80 text-white shadow-sm">
                            {translateTag(tag, i18n.language)}
                          </span>
                        ))}
                      </div>
                      {recipe.video_url && (
                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white border border-white/20">
                          <span className="material-symbols-outlined text-[13px] text-rose-500">smart_display</span>
                          <span>Видео</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-brand-amber transition-colors" title={title}>
                        {title}
                      </h4>
                      <div className="flex flex-col gap-1.5 text-xs text-brand-muted pt-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            <span className="material-symbols-outlined text-[14px] text-brand-amber">schedule</span>
                            <span>{prepTime}m</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <span className="material-symbols-outlined text-[14px] text-brand-amber">local_fire_department</span>
                            <span>{difficulty}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-brand-amber font-bold">
                          <span className="material-symbols-outlined text-[14px] fill-[1]">star</span>
                          <span className="text-slate-100">{(recipe.rating || 0).toFixed(1)}</span>
                          <span className="text-[10px] text-brand-muted">({getVotesCount(recipe)})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 bg-brand-charcoal/80 border-t border-brand-border/60 flex items-center justify-between gap-2 mt-2">
                    {calculateEstimatedPrice(recipe, ingredientsList) ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-emeraldBg border border-brand-emerald/30 text-emerald-400 text-[11px] font-bold whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px] shrink-0">payments</span>
                        <span>~{calculateEstimatedPrice(recipe, ingredientsList)} € / порция</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider truncate">The Best Idea</span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recipe/${recipe.id}`);
                      }}
                      className="size-8 shrink-0 rounded-full bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer"
                      title={t('common.buttons.view', 'Прегледай')}
                    >
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls (< 1 2 3 ... 16 >) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-8 pb-4 select-none" data-purpose="pagination">
            {/* Previous Page (<) */}
            <button 
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="size-8 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-amber hover:border-brand-amber/50 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('common.pagination.prev', 'Предишна страница')}
              aria-label="Previous Page"
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
            </button>

            {/* Page Numbers with Ellipsis */}
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="text-xs text-brand-muted px-1 select-none">
                    ...
                  </span>
                );
              }

              const isCurrent = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={`size-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-brand-amber text-brand-charcoal font-black shadow-md'
                      : 'bg-brand-surface border border-brand-border text-brand-cream hover:border-brand-amber/50 hover:text-brand-amber'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page (>) */}
            <button 
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="size-8 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-amber hover:border-brand-amber/50 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('common.pagination.next', 'Следваща страница')}
              aria-label="Next Page"
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
            </button>
          </div>
        )}
      </section>

      <section className="w-full pt-4 pb-6">
        <h3 className="text-slate-100 text-lg lg:text-xl font-extrabold tracking-tight mb-4">{t('home.discover_plan')}</h3>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
          <Link to="/planner" className="bg-surface-dark lg:bg-brand-surface border border-primary/20 lg:border-brand-border p-3 sm:p-5 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 lg:hover:border-brand-amber hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-2xl sm:text-3xl text-primary lg:text-brand-amber group-hover:scale-110 transition-transform">calendar_month</span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 text-center leading-tight">{t('home.weekly_menu')}</span>
          </Link>
          <Link to="/seasonal" className="bg-surface-dark lg:bg-brand-surface border border-primary/20 lg:border-brand-border p-3 sm:p-5 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 lg:hover:border-brand-amber hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-2xl sm:text-3xl text-primary lg:text-brand-amber group-hover:scale-110 transition-transform">ac_unit</span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 text-center leading-tight">{t('home.seasonal_menu')}</span>
          </Link>
          <Link to="/cuisines" className="bg-surface-dark lg:bg-brand-surface border border-primary/20 lg:border-brand-border p-3 sm:p-5 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 lg:hover:border-brand-amber hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-2xl sm:text-3xl text-primary lg:text-brand-amber group-hover:scale-110 transition-transform">public</span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 text-center leading-tight">{t('home.explore_cuisines')}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

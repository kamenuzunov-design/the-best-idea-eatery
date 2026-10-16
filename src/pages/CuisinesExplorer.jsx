import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField, matchesRecipeSearch } from '../lib/localeUtils';
import {
  mergeCuisinesList,
  getLocalizedCuisine,
  getDescendantCuisineIds,
  getCuisineBreadcrumbs,
  resolveRecipeCuisineId
} from '../data/cuisines';

const FALLBACK_CUISINE_IMAGES = {
  european: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?auto=format&fit=crop&w=900&q=80',
  mediterranean: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
  italian: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
  french: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  balkan: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  bulgarian: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  greek: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
  spanish: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=900&q=80',
  asian: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  east_asian: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  chinese: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80',
  indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80',
  american: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80',
  mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80',
  middle_eastern_african: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=80',
  middle_eastern: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=80',
  global_fusion: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  vegan_vegetarian: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  seafood: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80',
  street_food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
  tropical: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=900&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'
};

const REGION_ICONS = {
  european: 'castle',
  asian: 'ramen_dining',
  american: 'lunch_dining',
  middle_eastern_african: 'local_cafe',
  global_fusion: 'public',
  vegan_vegetarian: 'eco',
  seafood: 'set_meal',
  street_food: 'fastfood',
  tropical: 'beach_access'
};

const getRootTabForCuisine = (cuisineId, cuisinesList) => {
  const crumbs = getCuisineBreadcrumbs(cuisineId, cuisinesList);
  const rootId = crumbs[0]?.id || cuisineId;
  if (['european', 'asian', 'american', 'middle_eastern_african'].includes(rootId)) {
    return rootId;
  }
  return 'special';
};

const CuisinesExplorer = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'bg').split('-')[0];
  const { ingredientsList } = useAppContext();

  const selectedCuisineId = searchParams.get('id') || searchParams.get('cuisine') || '';

  const [firestoreCuisines, setFirestoreCuisines] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Mode A (Atlas) states
  const [atlasSearch, setAtlasSearch] = useState('');
  const [activeRegionTab, setActiveRegionTab] = useState('all');
  const [onlyWithRecipes, setOnlyWithRecipes] = useState(true);

  // Mode B (Selected Cuisine Detail) states
  const [recipeSearch, setRecipeSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  // 1. Subscribe to Firestore cuisines (synced with /admin/cuisines)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'cuisines'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreCuisines(list);
      },
      (err) => {
        console.error('Error loading cuisines:', err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to active recipes
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
        console.error('Error loading recipes for cuisines explorer:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 3. Subscribe to users for author nicknames
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap = {};
      snap.docs.forEach(d => {
        const u = d.data();
        uMap[d.id] = u.profile?.nickname || u.displayName || u.email || '';
      });
      setUsersMap(uMap);
    });
    return () => unsub();
  }, []);

  // Merged hierarchical cuisines catalog
  const cuisinesList = useMemo(() => {
    return mergeCuisinesList(firestoreCuisines);
  }, [firestoreCuisines]);

  // Helper to get total time of a recipe
  const getRecipeTotalTime = (recipe) => {
    if (!recipe) return 0;
    const prep = Number(recipe.prep_time || recipe.prep_time_minutes || 0);
    const cook = Number(recipe.cook_time || recipe.cook_time_minutes || 0);
    if (prep + cook > 0) return prep + cook;
    if (recipe.cooking_time) return Number(recipe.cooking_time) || 0;
    if (recipe.total_time) return Number(recipe.total_time) || 0;
    if (recipe.time) return Number(recipe.time) || 0;
    return 0;
  };

  // Helper to get recipe author
  const getRecipeAuthorName = (recipe) => {
    if (!recipe) return t('cuisines_explorer.chef_cook');
    if (recipe.publisher_id && usersMap[recipe.publisher_id]) {
      return usersMap[recipe.publisher_id];
    }
    const name =
      recipe.publisher_name ||
      recipe.original_author ||
      recipe.author_nickname ||
      recipe.author_name ||
      recipe.author?.nickname ||
      recipe.author?.name ||
      recipe.publisher_email ||
      recipe.author_email;
    if (name && name.trim()) return name.trim();
    return t('cuisines_explorer.chef_cook');
  };

  // Precompute direct recipes and hierarchical rolled-up recipes for every cuisine
  const cuisineStats = useMemo(() => {
    const directByCuisine = {};
    cuisinesList.forEach(c => {
      directByCuisine[c.id] = [];
    });

    recipes.forEach(r => {
      const cid = resolveRecipeCuisineId(r, cuisinesList);
      if (cid) {
        if (!directByCuisine[cid]) directByCuisine[cid] = [];
        directByCuisine[cid].push(r);
      }
    });

    const stats = {};
    cuisinesList.forEach(c => {
      const descIds = getDescendantCuisineIds(c.id, cuisinesList);
      const aggregated = [];
      descIds.forEach(id => {
        if (directByCuisine[id]) {
          aggregated.push(...directByCuisine[id]);
        }
      });

      // Sort aggregated by rating descending so we pick the best cover image
      aggregated.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

      let coverImage = null;
      if (aggregated.length > 0) {
        coverImage = getRecipeImageUrl(aggregated[0]);
      }
      if (!coverImage) {
        const breadcrumbs = getCuisineBreadcrumbs(c.id, cuisinesList);
        for (let i = breadcrumbs.length - 1; i >= 0; i--) {
          const bid = breadcrumbs[i].id;
          if (FALLBACK_CUISINE_IMAGES[bid]) {
            coverImage = FALLBACK_CUISINE_IMAGES[bid];
            break;
          }
        }
      }
      if (!coverImage) {
        coverImage = FALLBACK_CUISINE_IMAGES.default;
      }

      const directChildren = cuisinesList.filter(child => child.parentId === c.id);

      stats[c.id] = {
        cuisine: c,
        directRecipes: directByCuisine[c.id] || [],
        allRecipes: aggregated,
        count: aggregated.length,
        directCount: (directByCuisine[c.id] || []).length,
        coverImage,
        topRecipe: aggregated[0] || null,
        children: directChildren
      };
    });

    return stats;
  }, [cuisinesList, recipes]);

  // Select a cuisine in URL
  const handleSelectCuisine = (cuisineId) => {
    setRecipeSearch('');
    if (!cuisineId) {
      setSearchParams({});
    } else {
      setSearchParams({ id: cuisineId });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to Chef AI with contextual cuisine prompt
  const handleAskChefAI = (cuisineObj) => {
    const localizedName = getLocalizedCuisine(cuisineObj.id, currentLang, cuisinesList);
    const promptsByLang = {
      bg: `Разкажи ми за кулинарните традиции на „${localizedName}“ – кои са най-емблематичните ястия, ключовите подправки и тайни за автентичен вкус, и ми предложи една класическа рецепта!`,
      en: `Tell me about the culinary traditions of "${localizedName}" – what are the most iconic dishes, key spices, and secrets for authentic flavor, and suggest a classic recipe!`,
      it: `Parlami delle tradizioni culinarie di "${localizedName}": quali sono i piatti più iconici, le spezie chiave e i segreti per un sapore autentico, e suggeriscimi una ricetta classica!`,
      fr: `Parlez-moi des traditions culinaires de « ${localizedName} » : quels sont les plats les plus emblématiques, les épices clés et les secrets d'une saveur authentique, et proposez-moi une recette classique !`,
      de: `Erzähle mir von den kulinarischen Traditionen der „${localizedName}“ – was sind die bekanntesten Gerichte, wichtigsten Gewürze und Geheimnisse für authentischen Geschmack, und schlage mir ein klassisches Rezept vor!`
    };
    navigate('/ai-assistant', {
      state: { autoPrompt: promptsByLang[currentLang] || promptsByLang.bg }
    });
  };

  // Featured traditions (non-root cuisines with recipes, sorted by count desc)
  const featuredCuisines = useMemo(() => {
    return cuisinesList
      .filter(c => c.level > 0)
      .filter(c => {
        if (activeRegionTab !== 'all' && getRootTabForCuisine(c.id, cuisinesList) !== activeRegionTab) {
          return false;
        }
        const count = cuisineStats[c.id]?.count || 0;
        return onlyWithRecipes ? count > 0 : true;
      })
      .sort((a, b) => {
        const countDiff = (cuisineStats[b.id]?.count || 0) - (cuisineStats[a.id]?.count || 0);
        if (countDiff !== 0) return countDiff;
        return a.level - b.level;
      })
      .slice(0, 8);
  }, [cuisinesList, cuisineStats, activeRegionTab, onlyWithRecipes]);

  // Filtered cuisines when user types in the Atlas search box
  const searchedCuisines = useMemo(() => {
    const q = atlasSearch.trim().toLowerCase();
    if (!q) return [];
    return cuisinesList
      .filter(c => {
        const matchesName =
          c.name_bg?.toLowerCase().includes(q) ||
          c.name_en?.toLowerCase().includes(q) ||
          c.name_it?.toLowerCase().includes(q) ||
          c.name_fr?.toLowerCase().includes(q) ||
          c.name_de?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q);
        if (!matchesName) return false;
        if (activeRegionTab !== 'all' && getRootTabForCuisine(c.id, cuisinesList) !== activeRegionTab) {
          return false;
        }
        if (onlyWithRecipes && (cuisineStats[c.id]?.count || 0) === 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (cuisineStats[b.id]?.count || 0) - (cuisineStats[a.id]?.count || 0));
  }, [atlasSearch, cuisinesList, cuisineStats, activeRegionTab, onlyWithRecipes]);

  // Root regions for the Hierarchical Culinary Map section
  const rootRegions = useMemo(() => {
    return cuisinesList.filter(c => {
      if (c.parentId !== null) return false;
      if (activeRegionTab !== 'all' && getRootTabForCuisine(c.id, cuisinesList) !== activeRegionTab) {
        return false;
      }
      if (onlyWithRecipes && (cuisineStats[c.id]?.count || 0) === 0) {
        return false;
      }
      return true;
    });
  }, [cuisinesList, cuisineStats, activeRegionTab, onlyWithRecipes]);

  // Selected cuisine details for Mode B
  const selectedStat = selectedCuisineId ? cuisineStats[selectedCuisineId] : null;
  const selectedBreadcrumbs = useMemo(() => {
    if (!selectedCuisineId) return [];
    return getCuisineBreadcrumbs(selectedCuisineId, cuisinesList);
  }, [selectedCuisineId, cuisinesList]);

  // Recipes filtered & sorted in Mode B
  const displayedRecipes = useMemo(() => {
    if (!selectedStat) return [];
    let list = [...selectedStat.allRecipes];

    if (recipeSearch.trim()) {
      const keywords = recipeSearch
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      list = list.filter(r => matchesRecipeSearch(r, keywords, ingredientsList, 'every'));
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'quick') {
      list.sort((a, b) => {
        const ta = getRecipeTotalTime(a) || 9999;
        const tb = getRecipeTotalTime(b) || 9999;
        return ta - tb;
      });
    } else if (sortBy === 'newest') {
      list.sort((a, b) => {
        const da = a.created_at?.seconds || a.updated_at?.seconds || 0;
        const dbTime = b.created_at?.seconds || b.updated_at?.seconds || 0;
        return dbTime - da;
      });
    }

    return list;
  }, [selectedStat, recipeSearch, sortBy, ingredientsList]);

  const formatRecipesCount = (count) => {
    return count === 1
      ? t('cuisines_explorer.recipes_count_one', { count })
      : t('cuisines_explorer.recipes_count_other', { count });
  };

  // ============================================================================
  // MODE B: SELECTED CUISINE / REGION DETAIL VIEW
  // ============================================================================
  if (selectedCuisineId && selectedStat) {
    const { cuisine, count, coverImage, children } = selectedStat;
    const localizedTitle = getLocalizedCuisine(cuisine.id, currentLang, cuisinesList);
    const visibleChildren = children.filter(ch =>
      onlyWithRecipes ? (cuisineStats[ch.id]?.count || 0) > 0 : true
    );

    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display pb-32">
        {/* Sticky Header */}
        <header className="flex items-center justify-between bg-surface-dark/95 backdrop-blur-md px-4 py-3.5 sticky top-0 z-20 border-b border-primary/20 shadow-md">
          <button
            onClick={() => handleSelectCuisine('')}
            className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors"
            title={t('cuisines_explorer.back_to_atlas')}
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex-1 text-center px-2 truncate">
            <h1 className="text-base sm:text-lg font-extrabold leading-tight tracking-tight text-slate-100 truncate">
              {localizedTitle}
            </h1>
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">
              {formatRecipesCount(count)}
            </p>
          </div>
          <button
            onClick={() => handleAskChefAI(cuisine)}
            className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors border border-primary/30"
            title={t('cuisines_explorer.ask_chef_ai_btn')}
          >
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </button>
        </header>

        <div className="max-w-5xl mx-auto w-full px-4 pt-4 flex flex-col gap-5">
          {/* Interactive Hierarchy Breadcrumbs */}
          <nav className="flex flex-wrap items-center gap-1.5 text-xs bg-surface-dark/80 border border-primary/15 px-3.5 py-2.5 rounded-2xl shadow-sm">
            <button
              onClick={() => handleSelectCuisine('')}
              className="flex items-center gap-1 text-slate-300 hover:text-primary font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-primary">public</span>
              <span>{t('cuisines_explorer.all_cuisines_breadcrumb')}</span>
            </button>
            {selectedBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === selectedBreadcrumbs.length - 1;
              const crumbName = getLocalizedCuisine(crumb.id, currentLang, cuisinesList);
              return (
                <React.Fragment key={crumb.id}>
                  <span className="text-slate-600 font-bold">›</span>
                  {isLast ? (
                    <span className="text-primary font-extrabold">{crumbName}</span>
                  ) : (
                    <button
                      onClick={() => handleSelectCuisine(crumb.id)}
                      className="text-slate-300 hover:text-primary font-bold transition-colors"
                    >
                      {crumbName}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Hero Banner for Selected Cuisine */}
          <div className="relative rounded-3xl overflow-hidden border border-primary/30 shadow-xl min-h-[220px] sm:min-h-[250px] flex flex-col justify-end">
            <img
              src={coverImage}
              alt={localizedTitle}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/70 to-transparent" />
            <div className="relative z-10 p-5 sm:p-7 flex flex-col items-start gap-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-extrabold uppercase tracking-wider">
                <span className="material-symbols-outlined text-xs">restaurant</span>
                <span>{formatRecipesCount(count)}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md tracking-tight break-words max-w-full">
                {localizedTitle}
              </h2>
              <button
                onClick={() => handleAskChefAI(cuisine)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-background-dark font-extrabold text-xs sm:text-sm shadow-lg hover:bg-primary/90 transition-all max-w-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg shrink-0">auto_awesome</span>
                <span className="truncate">{t('cuisines_explorer.ask_chef_ai_btn')}</span>
              </button>
            </div>
          </div>

          {/* Sub-cuisines Drilldown Chips (if this cuisine/region has children) */}
          {children.length > 0 && (
            <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">account_tree</span>
                  <span>{t('cuisines_explorer.subcuisines_label')}</span>
                </span>
                <button
                  onClick={() => setOnlyWithRecipes(!onlyWithRecipes)}
                  className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {onlyWithRecipes
                    ? t('cuisines_explorer.show_all_catalog', { count: children.length })
                    : t('cuisines_explorer.only_with_recipes')}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-full px-3.5 py-2 rounded-xl bg-primary text-background-dark text-xs font-extrabold shadow-sm text-center">
                  {t('cuisines_explorer.all_subcuisines_chip', { count })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(visibleChildren.length > 0 ? visibleChildren : children).map(child => {
                    const childCount = cuisineStats[child.id]?.count || 0;
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleSelectCuisine(child.id)}
                        className="w-full px-2.5 py-2 rounded-xl bg-background-dark/80 hover:bg-primary/15 border border-primary/25 hover:border-primary text-slate-200 hover:text-primary text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer"
                      >
                        <span className="truncate text-left">
                          {getLocalizedCuisine(child.id, currentLang, cuisinesList)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold shrink-0">
                          {childCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Filter & Sort Controls for Recipes */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Search Input */}
            <div className="relative w-full">
              <input
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder={t('cuisines_explorer.filter_recipes_placeholder')}
                className="w-full bg-surface-dark border border-primary/25 rounded-2xl py-3 pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
              />
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/70 text-lg">
                search
              </span>
              {recipeSearch && (
                <button
                  onClick={() => setRecipeSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Row 2: Sort Buttons (3 equal columns, no scrollbar) */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {[
                { key: 'rating', icon: 'star', label: t('cuisines_explorer.sort_rating') },
                { key: 'quick', icon: 'schedule', label: t('cuisines_explorer.sort_quick') },
                { key: 'newest', icon: 'new_releases', label: t('cuisines_explorer.sort_newest') }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`w-full px-2.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer text-center ${
                    sortBy === opt.key
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'bg-surface-dark border-primary/15 text-slate-300 hover:text-white hover:border-primary/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm shrink-0">{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipes Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-56 bg-surface-dark rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : displayedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedRecipes.map(recipe => {
                const rCuisineId = resolveRecipeCuisineId(recipe, cuisinesList);
                const rCuisineLabel = rCuisineId
                  ? getLocalizedCuisine(rCuisineId, currentLang, cuisinesList)
                  : '';
                const totalTime = getRecipeTotalTime(recipe);
                const ratingVal = Number(recipe.rating);
                const ratingDisplay = !isNaN(ratingVal) && ratingVal > 0 ? ratingVal.toFixed(1) : '0';
                const votesCount =
                  recipe.votes_count ||
                  recipe.reviews_count ||
                  (recipe.ratings ? recipe.ratings.length : 0) ||
                  0;

                return (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="group bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={getRecipeImageUrl(recipe)}
                        alt={
                          getLocalizedField(recipe, 'title', currentLang) ||
                          recipe.title_bg ||
                          recipe.title_en ||
                          ''
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Specific Cuisine Tag when viewing parent region */}
                      {rCuisineLabel && rCuisineId !== selectedCuisineId && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-background-dark/85 backdrop-blur-md border border-primary/35 text-primary text-[10px] font-extrabold shadow-md">
                          {rCuisineLabel}
                        </div>
                      )}
                      {/* Prep + Cook Time */}
                      {totalTime > 0 && (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-background-dark/85 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-extrabold shadow-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          <span>
                            {totalTime} {t('cuisines_explorer.min_suffix')}
                          </span>
                        </div>
                      )}
                      {/* Rating Badge */}
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-background-dark/85 backdrop-blur-md border border-amber-400/30 text-amber-400 text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs fill-[1]">star</span>
                        <span>{ratingDisplay}</span>
                        {votesCount > 0 && (
                          <span className="text-[9px] text-slate-300 font-medium">({votesCount})</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-100 group-hover:text-primary transition-colors line-clamp-2">
                          {getLocalizedField(recipe, 'title', currentLang) ||
                            recipe.title_bg ||
                            recipe.title_en ||
                            ''}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {getLocalizedField(recipe, 'description', currentLang) ||
                            recipe.description_bg ||
                            recipe.description_en ||
                            ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-primary/10 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <span className="material-symbols-outlined text-primary text-sm">person</span>
                          <span className="truncate max-w-[200px]">{getRecipeAuthorName(recipe)}</span>
                        </div>
                        <span className="text-primary text-xs font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-surface-dark border border-primary/20 rounded-3xl flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">restaurant_menu</span>
              <p className="text-base font-extrabold text-slate-100">
                {t('cuisines_explorer.empty_recipes_title')}
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                {t('cuisines_explorer.empty_recipes_desc')}
              </p>
              <button
                onClick={() => handleAskChefAI(cuisine)}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-background-dark text-xs font-extrabold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>{t('cuisines_explorer.ask_chef_ai_btn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE A: WORLD CUISINES ATLAS (DEFAULT VIEW)
  // ============================================================================
  const regionTabs = [
    { id: 'all', icon: 'public', label: t('cuisines_explorer.regions.all') },
    { id: 'european', icon: 'castle', label: t('cuisines_explorer.regions.european') },
    { id: 'asian', icon: 'ramen_dining', label: t('cuisines_explorer.regions.asian') },
    { id: 'american', icon: 'lunch_dining', label: t('cuisines_explorer.regions.american') },
    {
      id: 'middle_eastern_african',
      icon: 'local_cafe',
      label: t('cuisines_explorer.regions.middle_eastern_african')
    },
    { id: 'special', icon: 'auto_awesome', label: t('cuisines_explorer.regions.special') }
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display pb-32">
      {/* Header */}
      <header className="flex items-center bg-surface-dark/95 backdrop-blur-md p-4 sticky top-0 z-20 border-b border-primary/20 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-100">
            {t('cuisines_explorer.title')}
          </h1>
          <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">
            {t('cuisines_explorer.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/ai-assistant')}
          className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors border border-primary/30"
          title="Chef AI"
        >
          <span className="material-symbols-outlined text-xl">smart_toy</span>
        </button>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 pt-5 flex flex-col gap-6">
        {/* Search & Catalog Filter Controls */}
        <div className="flex flex-col gap-3">
          {/* Row 1: Full-width Search Bar */}
          <div className="w-full flex items-stretch rounded-2xl h-13 bg-surface-dark border border-primary/25 focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(212,175,53,0.25)] transition-all shadow-md">
            <div className="text-primary/70 flex items-center justify-center pl-4">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              type="text"
              value={atlasSearch}
              onChange={(e) => setAtlasSearch(e.target.value)}
              className="flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 text-slate-100 placeholder:text-slate-500 text-sm font-medium px-3"
              placeholder={t('cuisines_explorer.search_placeholder')}
            />
            {atlasSearch && (
              <button
                onClick={() => setAtlasSearch('')}
                className="pr-4 text-slate-400 hover:text-rose-400 flex items-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>

          {/* Row 2: Toggle Only With Recipes vs Full Catalog */}
          <div className="grid grid-cols-2 items-center bg-surface-dark border border-primary/20 rounded-2xl p-1 w-full">
            <button
              onClick={() => setOnlyWithRecipes(true)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                onlyWithRecipes
                  ? 'bg-primary text-background-dark shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('cuisines_explorer.only_with_recipes')}
            </button>
            <button
              onClick={() => setOnlyWithRecipes(false)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                !onlyWithRecipes
                  ? 'bg-primary text-background-dark shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('cuisines_explorer.show_all_catalog', { count: cuisinesList.length })}
            </button>
          </div>

          {/* Region Filter Tabs (2 per row grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            {regionTabs.map(tab => {
              const isActive = activeRegionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveRegionTab(tab.id)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 border transition-all cursor-pointer text-center ${
                    isActive
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : 'bg-surface-dark/80 border-primary/15 text-slate-300 hover:border-primary/40 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base shrink-0">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SEARCH RESULTS MODE IN ATLAS */}
        {atlasSearch.trim() !== '' ? (
          searchedCuisines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchedCuisines.map(c => {
                const stat = cuisineStats[c.id];
                const crumbs = getCuisineBreadcrumbs(c.id, cuisinesList);
                const parentTrail = crumbs
                  .slice(0, -1)
                  .map(cr => getLocalizedCuisine(cr.id, currentLang, cuisinesList))
                  .join(' › ');

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCuisine(c.id)}
                    className="relative overflow-hidden rounded-2xl aspect-[16/10] group cursor-pointer border border-primary/25 shadow-lg hover:border-primary transition-all"
                  >
                    <img
                      src={stat?.coverImage || FALLBACK_CUISINE_IMAGES.default}
                      alt={getLocalizedCuisine(c.id, currentLang, cuisinesList)}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/55 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4 w-full flex flex-col gap-1">
                      {parentTrail && (
                        <span className="text-[10px] font-bold text-primary/90 uppercase tracking-wider truncate">
                          {parentTrail}
                        </span>
                      )}
                      <div className="flex justify-between items-end gap-2">
                        <h3 className="text-white text-lg font-extrabold drop-shadow-md leading-snug">
                          {getLocalizedCuisine(c.id, currentLang, cuisinesList)}
                        </h3>
                        <span className="bg-background-dark/80 backdrop-blur-md text-primary text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary/35 shrink-0">
                          {formatRecipesCount(stat?.count || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-surface-dark border border-primary/20 rounded-3xl flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-amber-400 text-4xl">travel_explore</span>
              <p className="text-base font-extrabold text-slate-100">
                {t('cuisines_explorer.empty_cuisines_title')}
              </p>
              <p className="text-xs text-slate-400">{t('cuisines_explorer.empty_cuisines_desc')}</p>
              {onlyWithRecipes && (
                <button
                  onClick={() => setOnlyWithRecipes(false)}
                  className="mt-1 px-4 py-2 rounded-xl bg-primary/20 border border-primary/40 text-primary text-xs font-extrabold hover:bg-primary/30 transition-colors cursor-pointer"
                >
                  {t('cuisines_explorer.show_all_catalog', { count: cuisinesList.length })}
                </button>
              )}
            </div>
          )
        ) : (
          <>
            {/* SECTION 1: FEATURED / LEADING CULINARY TRADITIONS */}
            {featuredCuisines.length > 0 && (
              <section className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="h-px w-6 bg-gradient-to-r from-primary to-transparent" />
                    <span>{t('cuisines_explorer.featured_title')}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {featuredCuisines.map(c => {
                    const stat = cuisineStats[c.id];
                    const crumbs = getCuisineBreadcrumbs(c.id, cuisinesList);
                    const parentName =
                      crumbs.length > 1
                        ? getLocalizedCuisine(crumbs[crumbs.length - 2].id, currentLang, cuisinesList)
                        : '';

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCuisine(c.id)}
                        className="relative overflow-hidden rounded-2xl aspect-[16/10] group cursor-pointer border border-primary/25 shadow-lg hover:border-primary hover:shadow-primary/15 transition-all"
                      >
                        <img
                          src={stat?.coverImage || FALLBACK_CUISINE_IMAGES.default}
                          alt={getLocalizedCuisine(c.id, currentLang, cuisinesList)}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent opacity-95 group-hover:opacity-85 transition-opacity" />

                        <div className="absolute top-3 right-3">
                          <span className="bg-background-dark/80 backdrop-blur-md text-primary text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-primary/35 shadow-md">
                            {formatRecipesCount(stat?.count || 0)}
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 p-4 sm:p-5 w-full">
                          {parentName && (
                            <p className="text-[10px] sm:text-xs font-bold text-primary/90 uppercase tracking-wider truncate mb-0.5">
                              {parentName}
                            </p>
                          )}
                          <h3 className="text-white text-base sm:text-xl font-extrabold drop-shadow-md leading-tight">
                            {getLocalizedCuisine(c.id, currentLang, cuisinesList)}
                          </h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 2: HIERARCHICAL CULINARY MAP BY REGIONS */}
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="h-px w-6 bg-gradient-to-r from-primary to-transparent" />
                <span>{t('cuisines_explorer.hierarchy_title')}</span>
              </h2>

              <div className="flex flex-col gap-5">
                {rootRegions.map(root => {
                  const rootStat = cuisineStats[root.id];
                  const level1Children = (rootStat?.children || []).filter(l1 =>
                    onlyWithRecipes ? (cuisineStats[l1.id]?.count || 0) > 0 : true
                  );
                  const rootIcon = REGION_ICONS[root.id] || 'public';

                  return (
                    <div
                      key={root.id}
                      className="bg-surface-dark border border-primary/20 rounded-3xl overflow-hidden shadow-lg"
                    >
                      {/* Root Region Banner Header */}
                      <div
                        onClick={() => handleSelectCuisine(root.id)}
                        className="relative h-32 sm:h-36 w-full overflow-hidden cursor-pointer group"
                      >
                        <img
                          src={rootStat?.coverImage || FALLBACK_CUISINE_IMAGES.default}
                          alt={getLocalizedCuisine(root.id, currentLang, cuisinesList)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/75 to-background-dark/30" />
                        <div className="absolute inset-0 p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="size-12 rounded-2xl bg-primary/20 backdrop-blur-md border border-primary/40 flex items-center justify-center text-primary shadow-md shrink-0">
                              <span className="material-symbols-outlined text-2xl">{rootIcon}</span>
                            </div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-primary transition-colors">
                                {getLocalizedCuisine(root.id, currentLang, cuisinesList)}
                              </h3>
                              <p className="text-xs font-bold text-primary/90 mt-0.5">
                                {formatRecipesCount(rootStat?.count || 0)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCuisine(root.id);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-background-dark/80 hover:bg-primary hover:text-background-dark text-primary border border-primary/35 text-xs font-extrabold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span className="hidden sm:inline">
                              {t('cuisines_explorer.explore_region_btn')}
                            </span>
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                          </button>
                        </div>
                      </div>

                      {/* Level 1 Sub-regions & Level 2/3 National Cuisines */}
                      {level1Children.length > 0 && (
                        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {level1Children.map(l1 => {
                            const l1Stat = cuisineStats[l1.id];
                            // Collect Level 2 and Level 3 descendants of this Level 1 sub-region
                            const l2Children = (l1Stat?.children || []).filter(l2 =>
                              onlyWithRecipes ? (cuisineStats[l2.id]?.count || 0) > 0 : true
                            );

                            return (
                              <div
                                key={l1.id}
                                className="bg-background-dark/60 border border-primary/15 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-primary/35 transition-all"
                              >
                                <div
                                  onClick={() => handleSelectCuisine(l1.id)}
                                  className="flex items-center justify-between gap-2 cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={l1Stat?.coverImage || FALLBACK_CUISINE_IMAGES.default}
                                      alt={getLocalizedCuisine(l1.id, currentLang, cuisinesList)}
                                      className="size-10 rounded-xl object-cover border border-primary/30 shrink-0"
                                    />
                                    <span className="text-sm font-extrabold text-slate-100 group-hover:text-primary transition-colors truncate">
                                      {getLocalizedCuisine(l1.id, currentLang, cuisinesList)}
                                    </span>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-extrabold shrink-0">
                                    {l1Stat?.count || 0}
                                  </span>
                                </div>

                                {l2Children.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-primary/10">
                                    {l2Children.map(l2 => {
                                      const l2Stat = cuisineStats[l2.id];
                                      const l3Children = (l2Stat?.children || []).filter(l3 =>
                                        onlyWithRecipes ? (cuisineStats[l3.id]?.count || 0) > 0 : true
                                      );

                                      return (
                                        <React.Fragment key={l2.id}>
                                          <button
                                            onClick={() => handleSelectCuisine(l2.id)}
                                            className="px-2.5 py-1 rounded-lg bg-surface-dark hover:bg-primary/20 border border-primary/20 hover:border-primary text-slate-200 hover:text-primary text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>
                                              {getLocalizedCuisine(l2.id, currentLang, cuisinesList)}
                                            </span>
                                            {(l2Stat?.count || 0) > 0 && (
                                              <span className="text-[10px] text-primary font-extrabold">
                                                ({l2Stat.count})
                                              </span>
                                            )}
                                          </button>
                                          {l3Children.map(l3 => {
                                            const l3Stat = cuisineStats[l3.id];
                                            return (
                                              <button
                                                key={l3.id}
                                                onClick={() => handleSelectCuisine(l3.id)}
                                                className="px-2.5 py-1 rounded-lg bg-surface-dark/70 hover:bg-primary/20 border border-primary/15 hover:border-primary text-slate-300 hover:text-primary text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                                              >
                                                <span>
                                                  ↳ {getLocalizedCuisine(l3.id, currentLang, cuisinesList)}
                                                </span>
                                                {(l3Stat?.count || 0) > 0 && (
                                                  <span className="text-[10px] text-primary font-extrabold">
                                                    ({l3Stat.count})
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default CuisinesExplorer;

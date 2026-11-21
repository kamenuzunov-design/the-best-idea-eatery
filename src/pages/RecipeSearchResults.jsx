import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField, matchesRecipeSearch } from '../lib/localeUtils';
import {
  getLocalizedCuisine,
  getDescendantCuisineIds,
  resolveRecipeCuisineId
} from '../data/cuisines';

const RecipeSearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const { ingredientsList } = useAppContext();

  const queryFromUrl = searchParams.get('q') || searchParams.get('search') || '';
  const cuisineFromUrl = searchParams.get('cuisine') || '';
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});
  const RECIPES_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const resultsRef = useRef(null);

  // Sync search input when URL query changes
  useEffect(() => {
    const qFromUrl = searchParams.get('q') || searchParams.get('search') || '';
    const timer = setTimeout(() => {
      setSearchTerm(qFromUrl);
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Subscribe to users for resolving author nicknames
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

  // Subscribe to recipes from Firestore
  useEffect(() => {
    const q = collection(db, 'recipes');
    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter active non-deleted recipes
      const active = all.filter(r => 
        r.is_deleted !== true && 
        (!r.parent_recipe_id || r.is_public_variation === true) &&
        r.is_active !== false
      );
      setRecipes(active);
      setLoading(false);
    }, (err) => {
      console.error("Error loading recipes for search:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getRecipeAuthorName = (recipe) => {
    if (!recipe) return t('recipe_search.chef_cook');

    if (recipe.publisher_id && usersMap[recipe.publisher_id]) {
      return usersMap[recipe.publisher_id];
    }

    const name = recipe.publisher_name || 
                 recipe.original_author || 
                 recipe.author_nickname || 
                 recipe.author_name || 
                 recipe.author?.nickname || 
                 recipe.author?.name || 
                 recipe.publisher_email || 
                 recipe.author_email;

    if (name && name.trim()) return name.trim();

    return t('recipe_search.chef_cook');
  };

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

  const getRecipeRatingDisplay = (recipe) => {
    if (!recipe) return '0';
    const ratingVal = Number(recipe.rating);
    if (!isNaN(ratingVal) && ratingVal > 0) {
      return ratingVal.toFixed(1);
    }
    return '0';
  };

  const getRecipeVotesCount = (recipe) => {
    if (!recipe) return 0;
    return recipe.votes_count || recipe.reviews_count || (recipe.ratings ? recipe.ratings.length : 0) || 0;
  };

  // Split comma-separated keywords
  const activeKeywords = searchTerm
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const handleRemoveKeyword = (kwToRemove) => {
    const updated = activeKeywords.filter(k => k.toLowerCase() !== kwToRemove.toLowerCase());
    const newQuery = updated.join(', ');
    setSearchTerm(newQuery);
    const nextParams = {};
    if (newQuery) nextParams.q = newQuery;
    if (cuisineFromUrl) nextParams.cuisine = cuisineFromUrl;
    setSearchParams(nextParams);
  };

  const handleRemoveCuisine = () => {
    const nextParams = {};
    if (searchTerm.trim()) nextParams.q = searchTerm.trim();
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextParams = {};
    if (searchTerm.trim()) nextParams.q = searchTerm.trim();
    if (cuisineFromUrl) nextParams.cuisine = cuisineFromUrl;
    setSearchParams(nextParams);
  };

  const allowedCuisineIds = cuisineFromUrl
    ? new Set(getDescendantCuisineIds(cuisineFromUrl))
    : null;

  // Filter and rank recipes according to cuisineFromUrl and activeKeywords (supporting multi-ingredient matching)
  const filteredRecipes = recipes
    .filter(r => {
      if (allowedCuisineIds) {
        const rCid = resolveRecipeCuisineId(r);
        if (!rCid || !allowedCuisineIds.has(rCid)) return false;
      }
      return true;
    })
    .map(r => {
      if (activeKeywords.length === 0) return { ...r, _matchCount: 0 };
      const matchCount = activeKeywords.filter(kw => matchesRecipeSearch(r, [kw], ingredientsList, 'some')).length;
      return { ...r, _matchCount: matchCount };
    })
    .filter(r => activeKeywords.length === 0 || r._matchCount > 0)
    .sort((a, b) => {
      if (b._matchCount !== a._matchCount) return b._matchCount - a._matchCount;
      const rA = Number(a.rating ?? a.rating_avg ?? 0);
      const rB = Number(b.rating ?? b.rating_avg ?? 0);
      return rB - rA;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * RECIPES_PER_PAGE;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === safePage) return;
    setCurrentPage(newPage);
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-7">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b lg:border border-primary/20 bg-surface-dark/90 backdrop-blur-md sticky top-0 z-10 shadow-md w-full lg:max-w-[1000px] mx-auto lg:mt-4 lg:rounded-2xl">
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-slate-100 text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {t('recipe_search.title')}
        </h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-2xl lg:max-w-[1000px] mx-auto w-full">
        {/* Search Bar Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative group">
          <input 
            type="text"
            placeholder={t('recipe_search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-dark border-2 border-primary/30 rounded-2xl py-3.5 pl-11 pr-10 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none transition-all shadow-inner text-sm font-medium"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xl">search</span>
          {searchTerm && (
            <button 
              type="button"
              onClick={() => { setSearchTerm(''); setSearchParams(cuisineFromUrl ? { cuisine: cuisineFromUrl } : {}); }} 
              title={t('recipe_search.clear_tooltip')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 p-1"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </form>

        {/* Active Keyword & Cuisine Chips */}
        {(activeKeywords.length > 0 || cuisineFromUrl) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-dark/60 rounded-2xl border border-primary/10 shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {t('recipe_search.filter_label')}
            </span>
            {cuisineFromUrl && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/20 border border-primary/50 rounded-xl text-xs font-extrabold text-primary shadow-sm">
                <span className="material-symbols-outlined text-xs">public</span>
                <span>{getLocalizedCuisine(cuisineFromUrl, currentLang) || cuisineFromUrl}</span>
                <button
                  onClick={handleRemoveCuisine}
                  className="hover:text-rose-400 transition-colors text-xs font-bold"
                  title={t('recipe_search.remove_keyword')}
                >
                  ×
                </button>
              </div>
            )}
            {activeKeywords.map((kw, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/40 rounded-xl text-xs font-bold text-primary shadow-sm"
              >
                <span>{kw}</span>
                <button 
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-rose-400 transition-colors text-xs font-bold"
                  title={t('recipe_search.remove_keyword')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Count Bar */}
        <div ref={resultsRef} className="flex justify-between items-center px-1 border-b border-primary/10 pb-2 scroll-mt-20">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            <span>{t('recipe_search.found_recipes')}</span>
            {totalPages > 1 && (
              <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal">
                ({safePage}/{totalPages})
              </span>
            )}
          </span>
          <span className="text-xs font-bold text-slate-400">
            {loading ? '...' : (filteredRecipes.length === 1 ? t('recipe_search.recipes_count_one', { count: filteredRecipes.length }) : t('recipe_search.recipes_count_other', { count: filteredRecipes.length }))}
          </span>
        </div>

        {/* Recipe Cards Grid (1 Column Mobile, 4 Columns Desktop, 12 per page) */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 w-full bg-surface-dark rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {paginatedRecipes.map(recipe => (
              <div 
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="group bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-44 w-full overflow-hidden bg-surface-dark/90">
                  <img 
                    src={getRecipeImageUrl(recipe)} 
                    alt={getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Top Left Multi-Keyword Match Badge */}
                  {activeKeywords.length > 1 && (
                    <div
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-full backdrop-blur-md border text-[10px] font-extrabold shadow-md flex items-center gap-1 ${
                        recipe._matchCount === activeKeywords.length
                          ? 'bg-emerald-600/85 border-emerald-400/50 text-white'
                          : 'bg-background-dark/80 border-primary/40 text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      <span>{recipe._matchCount}/{activeKeywords.length}</span>
                    </div>
                  )}
                  {/* Top Right Prep Time Badge */}
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background-dark/80 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-extrabold shadow-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">schedule</span>
                    <span>{getRecipeTotalTime(recipe)} {t('recipe_search.min_suffix')}</span>
                  </div>

                  {/* Bottom Left Rating Badge ON PHOTO */}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-background-dark/85 backdrop-blur-md border border-amber-400/30 text-amber-400 text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs fill-[1]">star</span>
                    <span>{getRecipeRatingDisplay(recipe)}</span>
                    {getRecipeVotesCount(recipe) > 0 ? (
                      <span className="text-[9px] text-slate-300 font-medium">({getRecipeVotesCount(recipe)})</span>
                    ) : null}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100 group-hover:text-primary transition-colors line-clamp-2">
                      {getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || ''}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {getLocalizedField(recipe, 'description', currentLang) || recipe.description_bg || recipe.description_en || ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-primary/10 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <span className="material-symbols-outlined text-primary text-sm">person</span>
                      <span className="truncate max-w-[200px]">{getRecipeAuthorName(recipe)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-4 pb-0 select-none" data-purpose="pagination">
                <button
                  type="button"
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage === 1}
                  className="size-8 rounded-lg bg-surface-dark border border-primary/20 text-slate-300 hover:text-primary hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common.pagination.prev', 'Предишна страница')}
                  aria-label="Previous Page"
                >
                  <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
                </button>

                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="text-xs text-slate-400 px-1 select-none">
                        ...
                      </span>
                    );
                  }

                  const isCurrent = p === safePage;
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`size-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-primary text-background-dark font-black shadow-md'
                          : 'bg-surface-dark border border-primary/20 text-slate-200 hover:border-primary/50 hover:text-primary'
                      }`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handlePageChange(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="size-8 rounded-lg bg-surface-dark border border-primary/20 text-slate-300 hover:text-primary hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common.pagination.next', 'Следваща страница')}
                  aria-label="Next Page"
                >
                  <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center bg-surface-dark border border-primary/20 rounded-3xl flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-4xl">search_off</span>
            <p className="text-sm font-bold text-slate-200">
              {t('recipe_search.empty_title')}
            </p>
            <p className="text-xs text-slate-400">
              {t('recipe_search.empty_desc')}
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSearchParams({}); }}
              className="mt-2 px-4 py-2 bg-primary/20 border border-primary/40 text-primary text-xs font-bold rounded-xl hover:bg-primary/30 transition-colors"
            >
              {t('recipe_search.clear_search_btn')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeSearchResults;

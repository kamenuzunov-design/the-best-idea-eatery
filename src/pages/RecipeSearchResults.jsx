import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { getRecipeImageUrl } from '../lib/imageUtils';

const RecipeSearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  const { ingredientsList } = useAppContext();

  const queryFromUrl = searchParams.get('q') || searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});

  // Sync search input when URL query changes
  useEffect(() => {
    const qFromUrl = searchParams.get('q') || searchParams.get('search') || '';
    const timer = setTimeout(() => {
      setSearchTerm(qFromUrl);
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
    if (!recipe) return isBg ? 'Шеф Готвач' : 'Chef Cook';

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

    return isBg ? 'Шеф Готвач' : 'Chef Cook';
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
    setSearchParams({ q: newQuery });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchTerm });
  };

  // Filter recipes according to activeKeywords (EVERY keyword must match to avoid excess/irrelevant results)
  const filteredRecipes = recipes.filter(r => {
    if (activeKeywords.length === 0) return true;

    const titleBg = (r.title_bg || '').toLowerCase();
    const titleEn = (r.title_en || '').toLowerCase();
    const descBg = (r.description_bg || '').toLowerCase();
    const descEn = (r.description_en || '').toLowerCase();

    return activeKeywords.every(kw => {
      const term = kw.toLowerCase().trim();
      if (!term) return true;

      if (titleBg.includes(term) || titleEn.includes(term) || descBg.includes(term) || descEn.includes(term)) {
        return true;
      }

      if (r.ingredients && Array.isArray(r.ingredients)) {
        for (const ing of r.ingredients) {
          const ingBg = (ing.ingredient_bg || ing.name_bg || ing.name || '').toLowerCase();
          const ingEn = (ing.ingredient_en || ing.name_en || ing.name || '').toLowerCase();
          if (ingBg.includes(term) || ingEn.includes(term)) return true;

          if (ingredientsList && Array.isArray(ingredientsList)) {
            const dbIng = ingredientsList.find(dbI => dbI.id === ing.ingredient_id);
            if (dbIng) {
              const dbNameBg = (dbIng.name_bg || '').toLowerCase();
              const dbNameEn = (dbIng.name_en || '').toLowerCase();
              if (dbNameBg.includes(term) || dbNameEn.includes(term)) return true;
            }
          }
        }
      }
      return false;
    });
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-primary/20 bg-surface-dark/90 backdrop-blur-md sticky top-0 z-40 shadow-md">
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-slate-100 text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {isBg ? 'Резултати от търсенето' : 'Search Results'}
        </h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 max-w-2xl mx-auto w-full">
        {/* Search Bar Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative group">
          <input 
            type="text"
            placeholder={isBg ? "Търси по съставки или име..." : "Search ingredients or recipe name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-dark border-2 border-primary/30 rounded-2xl py-3.5 pl-11 pr-10 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none transition-all shadow-inner text-sm font-medium"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xl">search</span>
          {searchTerm && (
            <button 
              type="button"
              onClick={() => { setSearchTerm(''); setSearchParams({}); }} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 p-1"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </form>

        {/* Active Keyword Chips (Allow removing keywords easily) */}
        {activeKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-dark/60 rounded-2xl border border-primary/10 shadow-sm">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {isBg ? 'Филтър съставки:' : 'Filtered ingredients:'}
            </span>
            {activeKeywords.map((kw, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/40 rounded-xl text-xs font-bold text-primary shadow-sm"
              >
                <span>{kw}</span>
                <button 
                  onClick={() => handleRemoveKeyword(kw)}
                  className="hover:text-rose-400 transition-colors text-xs font-bold"
                  title={isBg ? 'Премахни' : 'Remove'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Count Bar */}
        <div className="flex justify-between items-center px-1 border-b border-primary/10 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">restaurant_menu</span>
            <span>{isBg ? 'Намерени рецепти' : 'Found Recipes'}</span>
          </span>
          <span className="text-xs font-bold text-slate-400">
            {loading ? '...' : `${filteredRecipes.length} ${isBg ? 'рецепти' : 'recipes'}`}
          </span>
        </div>

        {/* Recipe Cards List (Strictly 1 Column on All Screens) */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 w-full bg-surface-dark rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredRecipes.map(recipe => (
              <div 
                key={recipe.id}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                className="group bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-44 w-full overflow-hidden bg-neutral-900">
                  <img 
                    src={getRecipeImageUrl(recipe)} 
                    alt={isBg ? recipe.title_bg : recipe.title_en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Top Right Prep Time Badge */}
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-background-dark/80 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-extrabold shadow-md flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">schedule</span>
                    <span>{getRecipeTotalTime(recipe)} {isBg ? 'мин' : 'min'}</span>
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
                      {isBg ? (recipe.title_bg || recipe.title_en) : (recipe.title_en || recipe.title_bg)}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {isBg ? recipe.description_bg : recipe.description_en}
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
        ) : (
          <div className="p-8 text-center bg-surface-dark border border-primary/20 rounded-3xl flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-4xl">search_off</span>
            <p className="text-sm font-bold text-slate-200">
              {isBg ? 'Няма намерени рецепти за тези съставки' : 'No recipes found for these ingredients'}
            </p>
            <p className="text-xs text-slate-400">
              {isBg ? 'Опитайте с други съставки или премахнете част от филтрите.' : 'Try different ingredients or clear some filters.'}
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSearchParams({}); }}
              className="mt-2 px-4 py-2 bg-primary/20 border border-primary/40 text-primary text-xs font-bold rounded-xl hover:bg-primary/30 transition-colors"
            >
              {isBg ? 'Изчисти търсенето' : 'Clear Search'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RecipeSearchResults;

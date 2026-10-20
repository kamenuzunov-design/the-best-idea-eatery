import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedRecipeTitle, getLocalizedField, matchesRecipeSearch } from '../lib/localeUtils';
import { getLocalizedCuisine } from '../data/cuisines';
import { getRecipeTags, translateTag } from '../lib/recipeMetaUtils';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import {
  SEASON_IDS,
  SEASONS_CONFIG,
  SEASONAL_PRODUCE_CATALOG,
  getCurrentSeasonId,
  evaluateRecipeSeasonality
} from '../lib/seasonalMatcher';

const getVotesCount = (recipe) => {
  if (!recipe) return 0;
  return Number(recipe.votes_count ?? recipe.reviews_count ?? (Array.isArray(recipe.ratings) ? recipe.ratings.length : 0)) || 0;
};

const getRecipeTotalTime = (recipe) => {
  if (!recipe) return 0;
  const prep = Number(recipe.prep_time || recipe.prep_time_minutes || 0);
  const cook = Number(recipe.cook_time || recipe.cook_time_minutes || 0);
  if (prep + cook > 0) return prep + cook;
  return Number(recipe.cooking_time || recipe.total_time || recipe.time || 0) || 0;
};

const SeasonalMenu = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user, isGuest } = useAuth();
  const currentLang = (i18n.language || 'bg').split('-')[0];

  const currentCalendarSeason = useMemo(() => getCurrentSeasonId(), []);
  const urlSeason = searchParams.get('season');
  const activeSeason = SEASON_IDS.includes(urlSeason) ? urlSeason : currentCalendarSeason;

  const [recipes, setRecipes] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters within the selected season
  const [selectedProduceId, setSelectedProduceId] = useState(null);
  const [activeCourseTab, setActiveCourseTab] = useState('all'); // 'all' | 'salads_soups' | 'mains' | 'desserts_pastry' | 'drinks'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('seasonal'); // 'seasonal' | 'rating' | 'fast'
  const [toastMsg, setToastMsg] = useState('');

  // 1. Subscribe to active public recipes
  useEffect(() => {
    const unsubRecipes = onSnapshot(
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
        console.error('Error loading recipes in SeasonalMenu:', err);
        setLoading(false);
      }
    );

    const unsubIngredients = onSnapshot(
      collection(db, 'ingredients'),
      (snap) => {
        setIngredientsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn('Error loading ingredients in SeasonalMenu:', err);
      }
    );

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  // 2. Subscribe to user's saved_recipes
  useEffect(() => {
    if (!user || isGuest || !user.uid) {
      return;
    }
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setSavedIds(snap.data().saved_recipes || []);
      }
    });
    return () => unsubUser();
  }, [user, isGuest]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 2600);
  };

  // Switch season and reset produce filter
  const handleSelectSeason = (seasonId) => {
    setSelectedProduceId(null);
    setActiveCourseTab('all');
    setSearchParams({ season: seasonId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle favorite status
  const handleToggleFavorite = async (e, recipeId) => {
    e.stopPropagation();
    if (!user || isGuest || !user.uid) {
      navigate('/login');
      return;
    }
    const isAlreadySaved = savedIds.includes(recipeId);
    try {
      const userRef = doc(db, 'users', user.uid);
      if (isAlreadySaved) {
        await updateDoc(userRef, { saved_recipes: arrayRemove(recipeId) });
        showToast(t('seasonal_menu.removed_toast'));
      } else {
        await updateDoc(userRef, { saved_recipes: arrayUnion(recipeId) });
        showToast(t('seasonal_menu.saved_toast'));
      }
    } catch (err) {
      console.error('Failed to toggle favorite recipe:', err);
    }
  };

  // Evaluate all recipes across all 4 seasons so we have accurate counts per season
  const seasonalDataBySeason = useMemo(() => {
    const result = {
      spring: [],
      summer: [],
      autumn: [],
      winter: []
    };

    SEASON_IDS.forEach(sId => {
      const evaluated = [];
      recipes.forEach(rec => {
        const ev = evaluateRecipeSeasonality(rec, sId, ingredientsList, currentLang);
        if (ev.matches) {
          evaluated.push({
            recipe: rec,
            score: ev.score,
            matchedProduce: ev.matchedProduce,
            courseGroup: ev.courseGroup
          });
        }
      });

      // Sort by seasonal score + rating tie-breaker
      evaluated.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (Number(b.recipe.rating) || 0) - (Number(a.recipe.rating) || 0);
      });

      result[sId] = evaluated;
    });

    return result;
  }, [recipes, ingredientsList, currentLang]);

  const currentSeasonEntries = useMemo(() => {
    return seasonalDataBySeason[activeSeason] || [];
  }, [seasonalDataBySeason, activeSeason]);

  const seasonMeta = SEASONS_CONFIG[activeSeason] || SEASONS_CONFIG.winter;
  const seasonProduceCatalog = useMemo(() => {
    return SEASONAL_PRODUCE_CATALOG[activeSeason] || [];
  }, [activeSeason]);

  // Count how many recipes in the active season match each spotlight produce item
  const produceCounts = useMemo(() => {
    const counts = {};
    seasonProduceCatalog.forEach(p => {
      counts[p.id] = 0;
    });
    currentSeasonEntries.forEach(entry => {
      entry.matchedProduce.forEach(mp => {
        if (counts[mp.id] !== undefined) {
          counts[mp.id] += 1;
        }
      });
    });
    return counts;
  }, [seasonProduceCatalog, currentSeasonEntries]);

  // Pick a hero recipe for the banner (prefer one that has a real user/custom image, highest score/rating)
  const heroHighlight = useMemo(() => {
    if (currentSeasonEntries.length === 0) return null;
    const withRealPhoto = currentSeasonEntries.find(e => {
      const img = getRecipeImageUrl(e.recipe);
      return img && !img.includes('recipe-placeholder.png');
    });
    return withRealPhoto || currentSeasonEntries[0];
  }, [currentSeasonEntries]);

  const heroImageUrl = useMemo(() => {
    if (heroHighlight) {
      const img = getRecipeImageUrl(heroHighlight.recipe);
      if (img && !img.includes('recipe-placeholder.png')) {
        return img;
      }
    }
    return seasonMeta.fallbackImage;
  }, [heroHighlight, seasonMeta]);

  // Course counts (respecting selectedProduceId and searchQuery)
  const preCourseFiltered = useMemo(() => {
    return currentSeasonEntries.filter(entry => {
      if (selectedProduceId) {
        const hasProd = entry.matchedProduce.some(mp => mp.id === selectedProduceId);
        if (!hasProd) return false;
      }
      if (searchQuery.trim()) {
        if (!matchesRecipeSearch(entry.recipe, searchQuery, ingredientsList)) {
          return false;
        }
      }
      return true;
    });
  }, [currentSeasonEntries, selectedProduceId, searchQuery, ingredientsList]);

  const courseCounts = useMemo(() => {
    const c = {
      all: preCourseFiltered.length,
      salads_soups: 0,
      mains: 0,
      desserts_pastry: 0,
      drinks: 0
    };
    preCourseFiltered.forEach(entry => {
      if (c[entry.courseGroup] !== undefined) {
        c[entry.courseGroup] += 1;
      }
    });
    return c;
  }, [preCourseFiltered]);

  // Final filtered & sorted recipes for display
  const displayedEntries = useMemo(() => {
    const filtered = preCourseFiltered.filter(entry => {
      if (activeCourseTab === 'all') return true;
      return entry.courseGroup === activeCourseTab;
    });

    const sorted = [...filtered];
    if (sortBy === 'rating') {
      sorted.sort((a, b) => (Number(b.recipe.rating) || 0) - (Number(a.recipe.rating) || 0));
    } else if (sortBy === 'fast') {
      sorted.sort((a, b) => {
        const tA = getRecipeTotalTime(a.recipe) || 999;
        const tB = getRecipeTotalTime(b.recipe) || 999;
        return tA - tB;
      });
    } else {
      sorted.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (Number(b.recipe.rating) || 0) - (Number(a.recipe.rating) || 0);
      });
    }
    return sorted;
  }, [preCourseFiltered, activeCourseTab, sortBy]);

  // Contextual prompt for Chef AI
  const handleAskChefAI = () => {
    const seasonName = t(`seasonal_menu.seasons.${activeSeason}.name`);
    const activeProduceObj = seasonProduceCatalog.find(p => p.id === selectedProduceId);
    const produceLabel = activeProduceObj
      ? (activeProduceObj.name[currentLang] || activeProduceObj.name.bg)
      : '';

    const promptsByLang = {
      bg: produceLabel
        ? `Предложи ми вдъхновяваща сезонна рецепта за сезон „${seasonName}“ с фокус върху „${produceLabel}“ и сподели професионална кулинарна тайна за приготвянето!`
        : `Какви са най-добрите сезонни ястия и кулинарни идеи за сезон „${seasonName}“? Предложи ми рецепта с продукти в пика на сезона!`,
      en: produceLabel
        ? `Suggest an inspiring "${seasonName}" seasonal recipe featuring "${produceLabel}" and share a professional chef's secret for preparing it!`
        : `What are the best seasonal dishes and culinary ideas for "${seasonName}"? Suggest a recipe using peak-season produce!`,
      it: produceLabel
        ? `Suggeriscimi un'ispirante ricetta stagionale per "${seasonName}" con protagonista "${produceLabel}" e condividi un segreto dello chef!`
        : `Quali sono i migliori piatti di stagione e le idee culinarie per "${seasonName}"? Suggeriscimi una ricetta con prodotti di stagione!`,
      fr: produceLabel
        ? `Proposez-moi une recette de saison inspirante pour « ${seasonName} » mettant à l'honneur « ${produceLabel} » et partagez un secret de chef !`
        : `Quels sont les meilleurs plats de saison et idées culinaires pour « ${seasonName} » ? Suggérez-moi une recette avec des produits de saison !`,
      de: produceLabel
        ? `Schlage mir ein inspirierendes saisonales Rezept für „${seasonName}“ mit Fokus auf „${produceLabel}“ vor und verrate mir einen Profi-Küchentipp!`
        : `Was sind die besten saisonalen Gerichte und kulinarischen Ideen für „${seasonName}“? Schlage mir ein Rezept mit frischen Saisonprodukten vor!`
    };

    navigate('/ai-assistant', {
      state: { autoPrompt: promptsByLang[currentLang] || promptsByLang.bg }
    });
  };

  const seasonNameLocalized = t(`seasonal_menu.seasons.${activeSeason}.name`);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-16 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] max-w-[380px] w-[90%] bg-emerald-500 text-background-dark px-4 py-3 rounded-2xl font-extrabold text-xs shadow-2xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="material-symbols-outlined text-base font-black">check_circle</span>
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* 4-Season Selector Bar (grid-cols-4, fits strictly inside frame without horizontal scrollbar) */}
      <section className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-2">
          {SEASON_IDS.map((sId) => {
            const cfg = SEASONS_CONFIG[sId];
            const isSelected = activeSeason === sId;
            const isCurrentCalendar = currentCalendarSeason === sId;
            const count = (seasonalDataBySeason[sId] || []).length;

            return (
              <button
                key={sId}
                type="button"
                onClick={() => handleSelectSeason(sId)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? `bg-gradient-to-br ${cfg.badgeGradient} text-background-dark border-white/30 shadow-lg scale-[1.02]`
                    : 'bg-surface-dark/90 text-slate-300 border-primary/15 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                {isCurrentCalendar && (
                  <span
                    className={`absolute -top-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-background-dark ${
                      isSelected ? 'bg-white' : 'bg-emerald-400 animate-pulse'
                    }`}
                    title={t('seasonal_menu.now_in_season')}
                  />
                )}
                <span className="text-lg leading-none mb-1">{cfg.emoji}</span>
                <span className="text-[11px] font-extrabold tracking-tight truncate max-w-full">
                  {t(`seasonal_menu.seasons.${sId}.name`)}
                </span>
                <span
                  className={`text-[9px] font-black mt-0.5 px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-background-dark/25 text-background-dark'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Seasonal Hero Section */}
      <section className="px-4 py-2">
        <div className="relative min-h-[19rem] w-full overflow-hidden rounded-3xl border border-primary/30 shadow-[0_10px_30px_rgba(212,175,53,0.18)] flex flex-col justify-end">
          <img
            src={heroImageUrl}
            alt={seasonNameLocalized}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/recipe-placeholder.png';
            }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/75 to-background-dark/20" />

          <div className="relative z-10 p-5 w-full">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${seasonMeta.badgeGradient} text-background-dark text-[10px] font-black uppercase tracking-widest rounded-full shadow-md`}>
                <span>{seasonMeta.emoji}</span>
                <span>{t('seasonal_menu.page_badge')}</span>
              </span>
              {activeSeason === currentCalendarSeason && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{t('seasonal_menu.now_in_season')}</span>
                </span>
              )}
              <span className="ml-auto px-2.5 py-1 rounded-full bg-background-dark/80 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                {t('seasonal_menu.recipes_count', { count: currentSeasonEntries.length })}
              </span>
            </div>

            <h2 className="text-white text-2xl font-extrabold leading-tight tracking-tight drop-shadow-md">
              {seasonNameLocalized}
            </h2>
            <p className={`text-xs font-extrabold italic mt-0.5 ${seasonMeta.accentText}`}>
              {t(`seasonal_menu.seasons.${activeSeason}.subtitle`)}
            </p>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed line-clamp-2">
              {t(`seasonal_menu.seasons.${activeSeason}.description`)}
            </p>

            {/* Featured Recipe Quick Pill */}
            {heroHighlight && (
              <div
                onClick={() => navigate(`/recipe/${heroHighlight.recipe.id}`)}
                className="mt-3.5 p-2.5 rounded-2xl bg-surface-dark/85 backdrop-blur-md border border-primary/25 hover:border-primary/60 flex items-center justify-between gap-2 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-lg bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider shrink-0">
                    {t('seasonal_menu.featured_pick')}
                  </span>
                  <span className="text-xs font-bold text-slate-100 truncate group-hover:text-primary transition-colors">
                    {getLocalizedRecipeTitle(heroHighlight.recipe, currentLang)}
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary text-base group-hover:translate-x-0.5 transition-transform shrink-0">
                  arrow_forward
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Peak Seasonal Produce Spotlight */}
      <section className="px-4 pt-4">
        <div className="bg-surface-dark/80 border border-primary/15 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">temp_preferences_eco</span>
              <span>{t('seasonal_menu.spotlight_title', { season: seasonNameLocalized })}</span>
            </h3>
            {selectedProduceId && (
              <button
                type="button"
                onClick={() => setSelectedProduceId(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-primary underline cursor-pointer"
              >
                {t('seasonal_menu.all_produce')}
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mb-3">
            {t('seasonal_menu.spotlight_subtitle')}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {seasonProduceCatalog.map((prod) => {
              const isSelected = selectedProduceId === prod.id;
              const count = produceCounts[prod.id] || 0;
              const label = prod.name[currentLang] || prod.name.bg || prod.name.en;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProduceId(isSelected ? null : prod.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-background-dark border-primary shadow-md shadow-primary/20 scale-[1.02]'
                      : 'bg-background-dark/70 text-slate-200 border-primary/15 hover:border-primary/40'
                  }`}
                >
                  <span>{prod.icon}</span>
                  <span>{label}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-background-dark/20 text-background-dark' : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chef AI Seasonal Inspiration Banner */}
      <section className="px-4 pt-3">
        <div
          onClick={handleAskChefAI}
          className="p-3 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-surface-dark border border-primary/30 hover:border-primary/60 cursor-pointer transition-all shadow-md flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-[#b8860b] text-background-dark flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl font-black">auto_awesome</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-100 group-hover:text-primary transition-colors truncate">
                {t('seasonal_menu.ask_chef_btn')}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                {t('seasonal_menu.ask_chef_sub')}
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary text-lg group-hover:translate-x-1 transition-transform shrink-0">
            arrow_forward
          </span>
        </div>
      </section>

      {/* Search & Course Category Filters */}
      <section className="px-4 pt-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('seasonal_menu.search_placeholder')}
            className="w-full bg-surface-dark border border-primary/20 rounded-2xl py-3 pl-10 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none shadow-inner"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-lg">
            search
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Course Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', icon: 'restaurant_menu' },
            { id: 'salads_soups', icon: 'soup_kitchen' },
            { id: 'mains', icon: 'dinner_dining' },
            { id: 'desserts_pastry', icon: 'bakery_dining' },
            { id: 'drinks', icon: 'local_bar' }
          ].map((tab) => {
            const isActive = activeCourseTab === tab.id;
            const count = courseCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCourseTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-primary text-background-dark border-primary shadow-md shadow-primary/20'
                    : 'bg-surface-dark text-slate-300 border-primary/10 hover:border-primary/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{t(`seasonal_menu.course_tabs.${tab.id}`)}</span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-background-dark/20 text-background-dark' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Heading & Sort Buttons */}
        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-slate-100 text-lg font-extrabold tracking-tight">
            {t('seasonal_menu.favorites_heading', { season: seasonNameLocalized })}
          </h3>

          <div className="flex items-center gap-1 bg-surface-dark p-1 rounded-xl border border-primary/15">
            {[
              { id: 'seasonal', label: t('seasonal_menu.sort_seasonal') },
              { id: 'rating', label: t('seasonal_menu.sort_rating') },
              { id: 'fast', label: t('seasonal_menu.sort_fast') }
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                  sortBy === s.id
                    ? 'bg-primary text-background-dark shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recipes List */}
      <section className="px-4 pt-3 pb-8">
        {loading ? (
          <div className="flex justify-center py-14">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
          </div>
        ) : displayedEntries.length === 0 ? (
          <div className="text-center py-10 px-4 border border-primary/15 rounded-2xl bg-surface-dark/40">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">eco</span>
            <p className="text-xs font-bold text-slate-300 mb-3">
              {t('seasonal_menu.empty_filtered')}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedProduceId(null);
                setActiveCourseTab('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-primary text-background-dark text-xs font-extrabold uppercase tracking-wider shadow-md cursor-pointer"
            >
              {t('seasonal_menu.clear_filters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayedEntries.map(({ recipe, matchedProduce }) => {
              const title = getLocalizedRecipeTitle(recipe, currentLang);
              const desc = getLocalizedField(recipe, 'description', currentLang);
              const totalTime = getRecipeTotalTime(recipe);
              const difficultyLabel = t(`home.difficulty.${recipe.difficulty || 'medium'}`);
              const imageUrl = getRecipeImageUrl(recipe);
              const cuisineName =
                getLocalizedCuisine(recipe.cuisine_id || recipe.cuisine_bg, currentLang) ||
                t('home.global_selection');
              const calculatedTags = getRecipeTags(recipe, ingredientsList);
              const tags = (calculatedTags.length > 0 ? calculatedTags : (recipe.tags || [])).slice(0, 2);
              const estPrice = calculateEstimatedPrice(recipe, ingredientsList);
              const isSaved = savedIds.includes(recipe.id);

              return (
                <div
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="bg-surface-dark/95 border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:border-primary/50 transition-all group cursor-pointer flex flex-col"
                >
                  <div className="flex min-h-[9.5rem]">
                    {/* Recipe Thumbnail */}
                    <div className="w-[36%] relative overflow-hidden shrink-0 bg-background-dark">
                      <img
                        src={imageUrl}
                        alt={title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/recipe-placeholder.png';
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, recipe.id)}
                        className={`absolute top-2.5 left-2.5 size-8 rounded-full backdrop-blur-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer border ${
                          isSaved
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                            : 'bg-background-dark/75 text-slate-200 border-white/15 hover:text-rose-400'
                        }`}
                        title={t('nav.saved')}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isSaved ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                    </div>

                    {/* Recipe Details */}
                    <div className="w-[64%] p-3.5 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="text-slate-100 font-extrabold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {title}
                        </h4>

                        {desc && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                            {desc}
                          </p>
                        )}

                        {/* Seasonal Produce Highlight Chips */}
                        {matchedProduce.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                              {t('seasonal_menu.in_season_badge')}
                            </span>
                            {matchedProduce.slice(0, 2).map((mp) => (
                              <span
                                key={mp.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold"
                              >
                                <span>{mp.icon}</span>
                                <span className="truncate max-w-[110px]">{mp.label}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Cuisine & Dietary Tags */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[9px] font-bold uppercase tracking-tighter">
                            {cuisineName}
                          </span>
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[9px] font-bold uppercase tracking-tighter"
                            >
                              {translateTag(tag, currentLang)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Meta Row */}
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-primary/10 text-[10px] text-slate-400 font-semibold flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {totalTime > 0 && (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-primary">schedule</span>
                              <span>{totalTime}m</span>
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px] text-primary">local_fire_department</span>
                            <span>{difficultyLabel}</span>
                          </span>
                          <span className="flex items-center gap-0.5 text-primary font-bold">
                            <span className="material-symbols-outlined text-[13px]">star</span>
                            <span>{(Number(recipe.rating) || 0).toFixed(1)} ({getVotesCount(recipe)})</span>
                          </span>
                          {estPrice && (
                            <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>{t('home.per_serving', { price: estPrice })}</span>
                            </span>
                          )}
                        </div>

                        <span className="size-7 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default SeasonalMenu;

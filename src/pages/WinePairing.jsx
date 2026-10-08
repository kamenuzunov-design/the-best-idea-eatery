import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { getLocalizedField } from '../lib/localeUtils';
import { getLocalizedCuisine } from '../data/cuisines';
import { matchWinesForRecipe, isWinePairingApplicable } from '../lib/wineMatcher.js';
import { getYouTubeThumbnail } from '../lib/videoUtils';

const WinePairing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const isBg = currentLang === 'bg';

  const { shoppingList, setShoppingList } = useAppContext();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('gold'); // 'gold' | 'alternative' | 'wildcard'
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorite_wines') || '[]');
    } catch {
      return [];
    }
  });
  const [addedToast, setAddedToast] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [nativeAds, setNativeAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const hasTrackedImpression = useRef(new Set());

  // 1. Зареждане на рецептата от Firestore
  useEffect(() => {
    let isMounted = true;

    const fetchRecipe = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && isMounted) {
          setRecipe({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Търсене по slug
          const q = query(collection(db, 'recipes'), where('slug', '==', id));
          const qSnap = await getDocs(q);
          if (!qSnap.empty && isMounted) {
            const found = qSnap.docs[0];
            setRecipe({ id: found.id, ...found.data() });
          } else if (isMounted) {
            setRecipe(null);
          }
        }
      } catch (err) {
        console.warn('Error loading recipe for wine pairing:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecipe();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. Изчисляване на сомелиерските съчетания
  const pairingResults = useMemo(() => {
    return matchWinesForRecipe(recipe, currentLang);
  }, [recipe, currentLang]);

  const activePairing = pairingResults ? pairingResults[selectedRole] : null;
  const activeWine = activePairing ? activePairing.wine : null;

  // 2B. Real-time Listeners за Native Ads & Campaigns
  useEffect(() => {
    const qAds = query(collection(db, 'ads'), where('type', '==', 'native'), where('isActive', '==', true));
    const qCampaigns = query(collection(db, 'campaigns'));

    const unsubAds = onSnapshot(qAds, (snap) => {
      setNativeAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Native ads listener error:", err.message));

    const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Campaigns listener error:", err.message));

    return () => {
      unsubAds();
      unsubCampaigns();
    };
  }, []);

  // 2C. Интелигентно филтриране и таргетиране на Native Ads за вино
  const matchingWineAds = useMemo(() => {
    if (!recipe || !pairingResults || nativeAds.length === 0) return [];

    const now = new Date().toISOString().split('T')[0];

    // Филтриране на валидни и активни реклами по дати, лимити и статус на кампанията
    const validAds = nativeAds.filter(ad => {
      if (!ad.isActive) return false;
      const adStart = ad.startDate || '0000-00-00';
      const adEnd = ad.endDate || '9999-99-99';
      if (now < adStart || now > adEnd) return false;
      if (ad.maxViews > 0 && (ad.viewsCount || 0) >= ad.maxViews) return false;
      if (ad.maxClicks > 0 && (ad.clicksCount || 0) >= ad.maxClicks) return false;

      if (ad.campaignId) {
        const campaign = campaigns.find(c => c.id === ad.campaignId);
        if (campaign) {
          if (!campaign.isActive) return false;
          const campStart = campaign.startDate || '0000-00-00';
          const campEnd = campaign.endDate || '9999-99-99';
          if (now < campStart || now > campEnd) return false;
          if (campaign.maxViews > 0 && (campaign.viewsCount || 0) >= campaign.maxViews) return false;
          if (campaign.maxClicks > 0 && (campaign.clicksCount || 0) >= campaign.maxClicks) return false;
        }
      }
      return true;
    });

    if (validAds.length === 0) return [];

    // Препоръчани вина от сомелиерската селекция
    const recWines = [
      pairingResults.gold?.wine,
      pairingResults.alternative?.wine,
      pairingResults.wildcard?.wine,
      activeWine
    ].filter(Boolean);

    // Събираме маркери, сортове и типове вино
    const wineTokens = new Set([
      'вино', 'wine', 'vino', 'vin', 'wein',
      'винарна', 'винарска изба', 'изба', 'winery', 'vineyard', 'bodega', 'cantina', 'weingut'
    ]);

    recWines.forEach(w => {
      if (w.id) wineTokens.add(w.id.toLowerCase());
      if (w.type) {
        wineTokens.add(w.type.toLowerCase());
        if (w.type === 'red') {
          ['червено вино', 'red wine', 'vino rosso', 'vin rouge', 'rotwein'].forEach(s => wineTokens.add(s));
        } else if (w.type === 'white') {
          ['бяло вино', 'white wine', 'vino bianco', 'vin blanc', 'weißwein', 'weisswein'].forEach(s => wineTokens.add(s));
        } else if (w.type === 'rose') {
          ['розе', 'rose wine', 'vino rosato', 'vin rosé'].forEach(s => wineTokens.add(s));
        } else if (w.type === 'sparkling') {
          ['пенливо вино', 'пенливо', 'sparkling wine', 'просеко', 'шампанско', 'prosecco', 'champagne', 'spumante'].forEach(s => wineTokens.add(s));
        } else if (w.type === 'dessert') {
          ['десертно вино', 'dessert wine', 'порто', 'port wine', 'sauternes'].forEach(s => wineTokens.add(s));
        }
      }
      if (w.name) {
        Object.values(w.name).forEach(val => {
          if (typeof val === 'string') wineTokens.add(val.toLowerCase());
        });
      }
    });

    // Съставки на рецептата, свързани с вино
    const recipeWineIngredients = (recipe.ingredients || []).filter(ing => {
      const candidates = [
        ing.slug,
        ing.ingredient_id,
        ing.id,
        ing.ingredient_bg,
        ing.name_bg,
        ing.ingredient_en,
        ing.name_en
      ].filter(Boolean).map(s => String(s).toLowerCase());

      return candidates.some(c => 
        c.includes('вино') || c.includes('wine') || c.includes('vino') || c.includes('vin') || c.includes('wein')
      );
    });

    const matches = [];

    validAds.forEach(ad => {
      // 1. Извличане на target slugs и ключови думи от рекламата
      const adTargetSlugs = [
        ...(Array.isArray(ad.targetIngredientIds) ? ad.targetIngredientIds : []),
        ...(Array.isArray(ad.targetKeywords) ? ad.targetKeywords : (typeof ad.targetKeywords === 'string' ? ad.targetKeywords.split(',') : []))
      ].map(s => {
        const match = String(s).match(/\(([^)]+)\)/);
        return (match ? match[1] : String(s)).trim().toLowerCase();
      }).filter(Boolean);

      const adRawTexts = [
        ...(Array.isArray(ad.targetKeywords) ? ad.targetKeywords : []),
        ...(Array.isArray(ad.targetIngredientIds) ? ad.targetIngredientIds : [])
      ].map(k => String(k).replace(/\([^)]*\)/g, '').trim().toLowerCase()).filter(Boolean);

      // Условие 1: Рекламата таргетира сомелиерската винена селекция или типове вино
      const matchesRecommendedWine = adTargetSlugs.some(target => {
        return wineTokens.has(target) || Array.from(wineTokens).some(wt => wt.includes(target) || target.includes(wt));
      }) || adRawTexts.some(kw => {
        return Array.from(wineTokens).some(wt => wt.includes(kw) || kw.includes(wt));
      });

      // Условие 2: Рекламата таргетира съставка-вино, използвана в рецептата
      const matchesRecipeWine = recipeWineIngredients.some(ing => {
        const ingCandidates = [
          ing.slug,
          ing.ingredient_id,
          ing.id,
          ing.ingredient_bg,
          ing.name_bg,
          ing.ingredient_en,
          ing.name_en
        ].filter(Boolean).map(s => String(s).toLowerCase());

        const isSlugMatch = adTargetSlugs.some(targetSlug => {
          return ingCandidates.some(c => c === targetSlug || c.includes(targetSlug) || targetSlug.includes(c));
        });

        const isTextMatch = adRawTexts.some(kw => {
          return ingCandidates.some(c => c.includes(kw) || kw.includes(c));
        });

        return isSlugMatch || isTextMatch;
      });

      if (matchesRecommendedWine || matchesRecipeWine) {
        matches.push({
          ad,
          priority: Number(ad.priority) || 1
        });
      }
    });

    // Сортиране по приоритет низходящо (10 -> 1), а при равенство – най-новите първо
    matches.sort((a, b) => {
      const pA = Number(a.ad.priority) || 1;
      const pB = Number(b.ad.priority) || 1;
      if (pB !== pA) return pB - pA;
      const tA = a.ad.createdAt?.seconds || 0;
      const tB = b.ad.createdAt?.seconds || 0;
      return tB - tA;
    });

    return matches;
  }, [recipe, pairingResults, activeWine, nativeAds, campaigns]);

  const activeAd = useMemo(() => {
    return matchingWineAds.length > 0 ? matchingWineAds[0].ad : null;
  }, [matchingWineAds]);

  // 2D. Отчитане на импресии (viewsCount) веднъж на показване
  useEffect(() => {
    if (!activeAd) return;
    const adId = activeAd.id;
    if (hasTrackedImpression.current.has(adId)) return;
    hasTrackedImpression.current.add(adId);

    try {
      updateDoc(doc(db, 'ads', adId), { viewsCount: increment(1) });
      if (activeAd.campaignId) {
        updateDoc(doc(db, 'campaigns', activeAd.campaignId), { viewsCount: increment(1) });
      }
    } catch (err) {
      console.warn("Failed to increment wine ad impression:", err);
    }
  }, [activeAd]);

  // Обработка на клик върху рекламата (clicksCount + отваряне в нов таб)
  const handleAdClick = (ad) => {
    if (!ad) return;
    try {
      updateDoc(doc(db, 'ads', ad.id), { clicksCount: increment(1) });
      if (ad.campaignId) {
        updateDoc(doc(db, 'campaigns', ad.campaignId), { clicksCount: increment(1) });
      }
    } catch (err) {
      console.warn("Failed to increment wine ad click:", err);
    }
    if (ad.targetUrl) {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 3. Добавяне на виното в списъка за пазаруване
  const handleAddToShoppingList = (wine) => {
    if (!wine) return;
    const wineName = wine.name[currentLang] || wine.name.bg;
    const wineId = `wine-${wine.id}`;

    const existingIdx = (shoppingList || []).findIndex(
      (item) => item.id === wineId || item.ingredient_id === wineId
    );

    if (existingIdx !== -1) {
      const updated = [...shoppingList];
      const curQty = Number(updated[existingIdx].quantityToBuy || updated[existingIdx].amount || 1);
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantityToBuy: curQty + 1
      };
      setShoppingList(updated);
    } else {
      const newItem = {
        id: wineId,
        ingredient_id: wineId,
        name: wineName,
        nameBg: wine.name.bg,
        nameEn: wine.name.en,
        name_bg: wine.name.bg,
        name_en: wine.name.en,
        quantityToBuy: 1,
        unit: 'pcs',
        unit_id: 'pcs',
        isWine: true,
        checked: false
      };
      setShoppingList([...(shoppingList || []), newItem]);
    }

    setAddedToast(wine.id);
    setTimeout(() => {
      setAddedToast(null);
    }, 2800);
  };

  // 4. Добавяне в любими
  const handleToggleFavorite = (wineId) => {
    const updated = favorites.includes(wineId)
      ? favorites.filter((fid) => fid !== wineId)
      : [...favorites, wineId];
    setFavorites(updated);
    try {
      localStorage.setItem('favorite_wines', JSON.stringify(updated));
    } catch {
      // Игнорираме грешки в localStorage
    }
  };

  // 5. Споделяне на съчетанието
  const handleShare = async () => {
    const title = recipe
      ? `${getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en} — ${t('wine_pairing.title')}`
      : t('wine_pairing.title');
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: activeWine ? `${wineTitle(activeWine)} + ${title}` : title,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      console.warn('Could not copy link');
    }
  };

  const wineTitle = (w) => (w?.name ? w.name[currentLang] || w.name.bg : '');
  const wineDesc = (w) => (w?.description ? w.description[currentLang] || w.description.bg : '');
  const wineGlass = (w) => (w?.glass_type ? w.glass_type[currentLang] || w.glass_type.bg : '');
  const wineDecant = (w) => (w?.decanting_time ? w.decanting_time[currentLang] || w.decanting_time.bg : '');
  const wineNotes = (w) => (w?.tasting_notes ? w.tasting_notes[currentLang] || w.tasting_notes.bg || [] : []);

  // Цветове и икони за типовете вина
  const getWineTypeBadge = (type) => {
    switch (type) {
      case 'red':
        return {
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800/50',
          dot: 'bg-rose-500',
          label: t('wine_pairing.types.red')
        };
      case 'white':
        return {
          bg: 'bg-amber-950/70 text-amber-300 border-amber-700/50',
          dot: 'bg-amber-400',
          label: t('wine_pairing.types.white')
        };
      case 'rose':
        return {
          bg: 'bg-pink-950/80 text-pink-300 border-pink-700/50',
          dot: 'bg-pink-400',
          label: t('wine_pairing.types.rose')
        };
      case 'sparkling':
        return {
          bg: 'bg-yellow-950/80 text-yellow-300 border-yellow-600/50',
          dot: 'bg-yellow-400',
          label: t('wine_pairing.types.sparkling')
        };
      case 'dessert':
        return {
          bg: 'bg-orange-950/80 text-orange-300 border-orange-700/50',
          dot: 'bg-orange-400',
          label: t('wine_pairing.types.dessert')
        };
      default:
        return {
          bg: 'bg-primary/20 text-primary border-primary/40',
          dot: 'bg-primary',
          label: t('wine_pairing.types.red')
        };
    }
  };

  // Визуален индикатор за органолептични нива
  const renderMeter = (currentLevel, levels, activeColor = 'bg-primary') => {
    const activeIdx = levels.indexOf(currentLevel);
    return (
      <div className="flex gap-1 items-center">
        {levels.map((lvl, idx) => (
          <div
            key={lvl}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              idx <= activeIdx ? activeColor : 'bg-slate-700/60'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-bold tracking-widest uppercase text-xs animate-pulse">
          {t('common.status.loading')}
        </p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="size-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-rose-400 text-4xl">wine_bar</span>
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">
          {t('wine_pairing.no_recipe_found')}
        </h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          {t('wine_pairing.no_recipe_desc')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-[#b8860b] text-background-dark font-extrabold px-6 py-3 rounded-xl transition-transform active:scale-95 text-xs uppercase tracking-widest shadow-lg"
        >
          {t('wine_pairing.browse_recipes')}
        </button>
      </div>
    );
  }

  if (!isWinePairingApplicable(recipe)) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="size-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-amber-400 text-4xl">no_drinks</span>
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">
          {t('wine_pairing.not_applicable_title')}
        </h2>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          {t('wine_pairing.not_applicable_desc')}
        </p>
        <button
          onClick={() => navigate(`/recipe/${recipe.id}`)}
          className="bg-primary hover:bg-[#b8860b] text-background-dark font-extrabold px-6 py-3 rounded-xl transition-transform active:scale-95 text-xs uppercase tracking-widest shadow-lg"
        >
          {t('wine_pairing.back_to_recipe')}
        </button>
      </div>
    );
  }

  const recipeTitle = getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || '';
  const recipeImg = recipe.images?.[0] || recipe.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
  const cuisineName = recipe.cuisine ? getLocalizedCuisine(recipe.cuisine, currentLang) : null;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-28 text-slate-100">
      {/* Тост нотификация за копиран линк */}
      {copiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 border border-emerald-400/40 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{t('wine_pairing.share_copied')}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 bg-surface-dark/95 backdrop-blur-xl border-b border-primary/20 shadow-xl">
        <div className="flex items-center justify-between p-4 max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label={t('common.buttons.back')}
            className="flex items-center justify-center size-10 rounded-full bg-surface-dark hover:bg-primary/20 border border-primary/20 hover:border-primary text-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black tracking-widest uppercase text-primary/80">
              {t('wine_pairing.header_title')}
            </span>
            <h1 className="text-slate-100 text-lg font-extrabold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-xl">wine_bar</span>
              {t('wine_pairing.title')}
            </h1>
          </div>

          <button
            onClick={handleShare}
            aria-label={t('wine_pairing.share')}
            className="flex items-center justify-center size-10 rounded-full bg-surface-dark hover:bg-primary/20 border border-primary/20 hover:border-primary text-primary transition-all active:scale-95"
            title={t('wine_pairing.share')}
          >
            <span className="material-symbols-outlined text-xl">share</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 w-full">
        {/* 2. Featured Recipe Hero Banner */}
        <section
          onClick={() => navigate(`/recipe/${recipe.id}`)}
          className="relative overflow-hidden bg-gradient-to-r from-surface-dark via-surface-dark to-background-dark rounded-3xl p-4 sm:p-5 border border-primary/25 shadow-xl hover:border-primary/50 transition-all cursor-pointer group flex items-center gap-4"
        >
          <div className="size-20 sm:size-24 rounded-2xl overflow-hidden shrink-0 border-2 border-primary/40 shadow-md relative">
            <img
              src={recipeImg}
              alt={recipeTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary text-[10px] uppercase font-black tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {t('wine_pairing.selected_recipe')}
              </span>
              {cuisineName && (
                <span className="text-slate-400 text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/10 hidden sm:inline-block">
                  {cuisineName}
                </span>
              )}
            </div>

            <h2 className="text-white text-lg sm:text-xl font-extrabold leading-tight truncate group-hover:text-primary transition-colors">
              {recipeTitle}
            </h2>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
              {recipe.cooking_time_minutes && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                  {recipe.cooking_time_minutes} min
                </span>
              )}
              {recipe.difficulty && (
                <span className="flex items-center gap-1 capitalize">
                  <span className="material-symbols-outlined text-primary text-sm">restaurant</span>
                  {recipe.difficulty}
                </span>
              )}
              <span className="text-primary/70 group-hover:text-primary transition-colors text-[11px] font-bold ml-auto flex items-center gap-0.5">
                {t('wine_pairing.back_to_recipe')}
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </span>
            </div>
          </div>
        </section>

        {/* 3. Section Title */}
        <div className="flex items-center justify-between border-l-4 border-primary pl-3 py-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              <h3 className="text-slate-100 text-lg font-black tracking-tight">
                {t('wine_pairing.ai_recommendations')}
              </h3>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {t('wine_pairing.ai_recommendations_sub')}
            </p>
          </div>
        </div>

        {/* 4. Segmented Selector Tabs */}
        {pairingResults && (
          <div className="grid grid-cols-3 gap-2 bg-surface-dark/70 p-1.5 rounded-2xl border border-primary/20">
            {/* Tab: Gold */}
            <button
              onClick={() => setSelectedRole('gold')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all relative ${
                selectedRole === 'gold'
                  ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black shadow-lg scale-[1.02]'
                  : 'hover:bg-primary/10 text-slate-300 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🏆</span>
                <span className="text-[11px] uppercase tracking-wider">
                  {t('wine_pairing.tabs.gold')}
                </span>
              </div>
              <span className={`text-[10px] truncate max-w-full mt-0.5 flex items-center justify-center gap-1 ${selectedRole === 'gold' ? 'text-background-dark/90 font-extrabold' : 'text-slate-400'}`}>
                {pairingResults.gold?.wine?.flag && <span>{pairingResults.gold.wine.flag}</span>}
                <span className="truncate">{wineTitle(pairingResults.gold?.wine)}</span>
              </span>
            </button>

            {/* Tab: Alternative */}
            <button
              onClick={() => setSelectedRole('alternative')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all relative ${
                selectedRole === 'alternative'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black shadow-lg scale-[1.02]'
                  : 'hover:bg-primary/10 text-slate-300 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🍷</span>
                <span className="text-[11px] uppercase tracking-wider">
                  {t('wine_pairing.tabs.alternative')}
                </span>
              </div>
              <span className={`text-[10px] truncate max-w-full mt-0.5 flex items-center justify-center gap-1 ${selectedRole === 'alternative' ? 'text-white/90 font-extrabold' : 'text-slate-400'}`}>
                {pairingResults.alternative?.wine?.flag && <span>{pairingResults.alternative.wine.flag}</span>}
                <span className="truncate">{wineTitle(pairingResults.alternative?.wine)}</span>
              </span>
            </button>

            {/* Tab: Wildcard */}
            <button
              onClick={() => setSelectedRole('wildcard')}
              className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all relative ${
                selectedRole === 'wildcard'
                  ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 text-white font-black shadow-lg scale-[1.02]'
                  : 'hover:bg-primary/10 text-slate-300 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">✨</span>
                <span className="text-[11px] uppercase tracking-wider">
                  {t('wine_pairing.tabs.wildcard')}
                </span>
              </div>
              <span className={`text-[10px] truncate max-w-full mt-0.5 flex items-center justify-center gap-1 ${selectedRole === 'wildcard' ? 'text-white/90 font-extrabold' : 'text-slate-400'}`}>
                {pairingResults.wildcard?.wine?.flag && <span>{pairingResults.wildcard.wine.flag}</span>}
                <span className="truncate">{wineTitle(pairingResults.wildcard?.wine)}</span>
              </span>
            </button>
          </div>
        )}

        {/* 5. Active Wine Hero Card */}
        {activeWine && (
          <div className="bg-surface-dark/90 backdrop-blur-md rounded-3xl overflow-hidden border border-primary/30 shadow-2xl transition-all">
            {/* Visual Cover Banner */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <img
                src={activeWine.image}
                alt={wineTitle(activeWine)}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/40 to-transparent" />

              {/* Role Badge (Top Left) */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
                <div
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg border flex items-center gap-1.5 ${
                    selectedRole === 'gold'
                      ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark border-amber-300/40'
                      : selectedRole === 'alternative'
                      ? 'bg-rose-900/90 text-rose-100 border-rose-500/40'
                      : 'bg-purple-900/90 text-purple-100 border-purple-500/40'
                  }`}
                >
                  <span>{selectedRole === 'gold' ? '🏆' : selectedRole === 'alternative' ? '🍷' : '✨'}</span>
                  {t(`wine_pairing.roles.${selectedRole}`)}
                </div>

                {/* Wine Type Badge */}
                {(() => {
                  const tb = getWineTypeBadge(activeWine.type);
                  return (
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md flex items-center gap-1.5 ${tb.bg}`}>
                      <span className={`size-1.5 rounded-full ${tb.dot}`} />
                      {tb.label}
                    </div>
                  );
                })()}

                {/* Wine Origin / Terroir Badge */}
                {activeWine.flag && (
                  <div className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/20 bg-black/60 backdrop-blur-md text-slate-200 flex items-center gap-1.5 shadow-sm">
                    <span className="text-xs">{activeWine.flag}</span>
                    <span>
                      {activeWine.region?.[currentLang] || activeWine.region?.bg
                        ? `${activeWine.region[currentLang] || activeWine.region.bg}, `
                        : ''}
                      {activeWine.country?.[currentLang] || activeWine.country?.bg}
                    </span>
                  </div>
                )}
              </div>

              {/* Favorite Button (Top Right) */}
              <button
                onClick={() => handleToggleFavorite(activeWine.id)}
                className={`absolute top-4 right-4 size-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg active:scale-90 border ${
                  favorites.includes(activeWine.id)
                    ? 'bg-rose-600/90 border-rose-400 text-white'
                    : 'bg-black/50 border-white/20 text-white hover:bg-black/70'
                }`}
                aria-label="Favorite"
              >
                <span className={`material-symbols-outlined text-lg ${favorites.includes(activeWine.id) ? 'font-fill' : ''}`}>
                  favorite
                </span>
              </button>

              {/* Title & Harmony Pill inside Bottom Cover */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-md leading-tight break-words">
                    {wineTitle(activeWine)}
                  </h3>
                </div>

                <div className="self-start sm:self-auto bg-black/60 sm:bg-primary/20 border border-primary/50 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg max-w-full">
                  <span className="material-symbols-outlined text-primary text-base">verified</span>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] block text-primary/80 font-bold uppercase tracking-wider leading-none">
                      {t('wine_pairing.match_score')}
                    </span>
                    <span className="text-sm font-black text-primary leading-tight">
                      {activePairing?.harmonyScore || activePairing?.score || 94}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Description Paragraph */}
              <p className="text-slate-300 text-sm leading-relaxed">
                {wineDesc(activeWine)}
              </p>

              {/* 5A. Why it pairs — Sommelier Explanation Box */}
              <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 rounded-2xl border-l-4 border-primary border-t border-r border-b border-primary/20 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-lg">psychology</span>
                  <h4 className="text-primary text-xs font-black uppercase tracking-widest">
                    {t('wine_pairing.why_pairs')}
                  </h4>
                </div>
                <p className="text-slate-200 text-sm italic font-medium leading-relaxed pl-1">
                  &ldquo;{activePairing?.matchReason?.[currentLang] || activePairing?.matchReason?.bg}&rdquo;
                </p>
              </div>

              {/* 5B. Tasting Notes Chips */}
              <div>
                <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-sm">nature</span>
                  {t('wine_pairing.tasting_notes')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {wineNotes(activeWine).map((note, idx) => (
                    <span
                      key={idx}
                      className="bg-surface-dark border border-primary/25 hover:border-primary/60 text-slate-200 hover:text-white px-3 py-1 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                      <span className="size-1 rounded-full bg-primary" />
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              {/* 5C. Sensory Profile Meters (Body, Sweetness, Acidity, Tannins, Alcohol) */}
              <div className="bg-background-dark/70 rounded-2xl p-4 sm:p-5 border border-primary/15 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-slate-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">tune</span>
                    {t('wine_pairing.sensory_profile')}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {t('wine_pairing.alcohol')}: <strong className="text-primary">{activeWine.alcohol}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Body */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{t('wine_pairing.body')}</span>
                      <span className="text-slate-200 font-bold capitalize">
                        {t(`wine_pairing.body_levels.${activeWine.body}`)}
                      </span>
                    </div>
                    {renderMeter(activeWine.body, ['light', 'medium', 'full'], 'bg-primary')}
                  </div>

                  {/* Sweetness */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{t('wine_pairing.sweetness')}</span>
                      <span className="text-slate-200 font-bold capitalize">
                        {t(`wine_pairing.sweetness_levels.${activeWine.sweetness}`)}
                      </span>
                    </div>
                    {renderMeter(activeWine.sweetness, ['bone-dry', 'dry', 'off-dry', 'sweet'], 'bg-amber-400')}
                  </div>

                  {/* Acidity */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{t('wine_pairing.acidity')}</span>
                      <span className="text-slate-200 font-bold capitalize">
                        {t(`wine_pairing.acidity_levels.${activeWine.acidity}`)}
                      </span>
                    </div>
                    {renderMeter(activeWine.acidity, ['low', 'medium', 'high'], 'bg-emerald-400')}
                  </div>

                  {/* Tannins */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{t('wine_pairing.tannins')}</span>
                      <span className="text-slate-200 font-bold capitalize">
                        {t(`wine_pairing.tannin_levels.${activeWine.tannins}`)}
                      </span>
                    </div>
                    {renderMeter(activeWine.tannins, ['none', 'low', 'medium', 'medium-high', 'high'], 'bg-rose-500')}
                  </div>
                </div>
              </div>

              {/* 5D. Sommelier Serving Guide (Temperature, Decanting, Glassware) */}
              <div className="grid grid-cols-3 gap-3">
                {/* Temp */}
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">thermostat</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {t('wine_pairing.serving_temp')}
                  </span>
                  <span className="text-xs font-black text-slate-100 mt-0.5">
                    {activeWine.serving_temp}
                  </span>
                </div>

                {/* Decanting */}
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">timer</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {t('wine_pairing.decanting')}
                  </span>
                  <span className="text-xs font-black text-slate-100 mt-0.5">
                    {wineDecant(activeWine)}
                  </span>
                </div>

                {/* Glass */}
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">
                    {activeWine.glass_icon || 'wine_bar'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {t('wine_pairing.glassware')}
                  </span>
                  <span className="text-xs font-black text-slate-100 mt-0.5 truncate w-full" title={wineGlass(activeWine)}>
                    {wineGlass(activeWine)}
                  </span>
                </div>
              </div>

              {/* 5E. Action Bar (Add to Shopping List Button + Favorite) */}
              <div className="pt-2 flex gap-3 items-center">
                <button
                  onClick={() => handleAddToShoppingList(activeWine)}
                  className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
                    addedToast === activeWine.id
                      ? 'bg-emerald-600 text-white shadow-emerald-500/25 scale-[1.01]'
                      : 'bg-gradient-to-r from-primary via-[#b8860b] to-primary hover:brightness-110 text-background-dark shadow-[0_5px_25px_rgba(212,175,53,0.3)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {addedToast === activeWine.id ? 'check_circle' : 'add_shopping_cart'}
                  </span>
                  <span>
                    {addedToast === activeWine.id
                      ? t('wine_pairing.added_to_list')
                      : t('wine_pairing.add_to_list')}
                  </span>
                </button>

                <button
                  onClick={() => handleToggleFavorite(activeWine.id)}
                  className={`p-3.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
                    favorites.includes(activeWine.id)
                      ? 'bg-rose-500/20 border-rose-500/60 text-rose-400'
                      : 'bg-surface-dark border-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                  aria-label="Toggle favorite"
                >
                  <span className={`material-symbols-outlined text-xl ${favorites.includes(activeWine.id) ? 'font-fill text-rose-500' : ''}`}>
                    favorite
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Quick Comparison Grid (The Other 2 Candidates) */}
        {pairingResults && (
          <div className="space-y-3 pt-2">
            <h4 className="text-slate-400 text-xs font-black uppercase tracking-widest pl-1">
              {isBg ? 'Други препоръчани съчетания' : 'Other Recommended Pairings'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['gold', 'alternative', 'wildcard']
                .filter((r) => r !== selectedRole)
                .map((role) => {
                  const candidate = pairingResults[role];
                  if (!candidate) return null;
                  const cWine = candidate.wine;
                  const cBadge = getWineTypeBadge(cWine.type);

                  return (
                    <div
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className="bg-surface-dark/70 hover:bg-surface-dark border border-primary/20 hover:border-primary/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all cursor-pointer group shadow-md"
                    >
                      <div className="size-16 rounded-xl overflow-hidden shrink-0 border border-primary/30 relative">
                        <img
                          src={cWine.image}
                          alt={wineTitle(cWine)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 text-xs drop-shadow">
                          {role === 'gold' ? '🏆' : role === 'alternative' ? '🍷' : '✨'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">
                          {t(`wine_pairing.roles.${role}`)}
                        </span>
                        <h5 className="text-white text-sm font-extrabold truncate group-hover:text-primary transition-colors">
                          {wineTitle(cWine)}
                        </h5>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5 flex items-center gap-1">
                          <span>{cBadge.label}</span>
                          <span>•</span>
                          {cWine.flag && <span>{cWine.flag}</span>}
                          <span>{cWine.country?.[currentLang] || cWine.country?.bg}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-primary block">
                          {candidate.harmonyScore || candidate.score}%
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-tighter block">
                          {t('wine_pairing.match_score')}
                        </span>
                      </div>

                      <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors text-lg shrink-0">
                        chevron_right
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 6.5. Sponsored Native Wine Selection Card */}
        {activeAd && (
          <section
            onClick={() => handleAdClick(activeAd)}
            className="relative overflow-hidden bg-gradient-to-r from-surface-dark via-surface-dark/95 to-primary/10 border border-primary/30 hover:border-primary/60 rounded-3xl p-5 shadow-xl transition-all cursor-pointer group"
          >
            {/* Ambient background glow */}
            <div className="absolute -top-12 -right-12 size-36 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all"></div>

            {/* Top Pill / Sponsor Header */}
            <div className="flex items-center justify-between mb-3.5 relative z-10">
              <div className="flex items-center gap-1.5 bg-primary/15 border border-primary/30 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-primary text-xs">wine_bar</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                  {t('wine_pairing.sponsored_title')}
                </span>
              </div>
              <span className="material-symbols-outlined text-primary/50 group-hover:text-primary transition-colors text-base">
                open_in_new
              </span>
            </div>

            {/* Body */}
            <div className="flex items-start sm:items-center gap-4 relative z-10">
              {/* Media Thumbnail */}
              {(() => {
                const adImg = activeAd.type === 'video'
                  ? (getYouTubeThumbnail(activeAd.contentUrl) || activeAd.contentUrl)
                  : activeAd.contentUrl;
                if (!adImg) return null;
                return (
                  <div className="size-20 sm:size-24 rounded-2xl overflow-hidden shrink-0 border border-primary/30 shadow-md relative bg-black group-hover:border-primary transition-colors">
                    <img
                      src={adImg}
                      alt={getLocalizedField(activeAd, 'title', currentLang) || activeAd.title_bg || 'Ad'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {activeAd.type === 'video' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="size-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-sm font-fill">play_arrow</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                  {t('wine_pairing.sponsored_tag')}
                </span>
                <h4 className="text-white text-base sm:text-lg font-black leading-snug group-hover:text-primary transition-colors break-words">
                  {getLocalizedField(activeAd, 'title', currentLang) || (isBg ? activeAd.title_bg : activeAd.title_en)}
                </h4>
                {(() => {
                  const adDesc = getLocalizedField(activeAd, 'description', currentLang) || (isBg ? activeAd.description_bg : activeAd.description_en);
                  return adDesc ? (
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed">
                      {adDesc}
                    </p>
                  ) : null;
                })()}

                {/* Call to Action */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline">
                    {activeAd.type === 'video' ? t('wine_pairing.watch_video') : t('wine_pairing.view_deal')}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. Sommelier Philosophy Card */}
        <section className="bg-gradient-to-r from-primary/10 via-surface-dark to-transparent border-l-4 border-primary rounded-r-3xl p-5 flex items-start gap-4 shadow-lg border border-primary/20">
          <div className="size-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-primary text-2xl">tips_and_updates</span>
          </div>

          <div className="flex-1">
            <h4 className="text-primary text-xs font-black uppercase tracking-widest mb-1">
              {t('wine_pairing.expert_tip_title')}
            </h4>
            <p className="text-slate-200 text-xs sm:text-sm font-medium italic leading-relaxed">
              &ldquo;{t('wine_pairing.expert_tip_desc')}&rdquo;
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WinePairing;

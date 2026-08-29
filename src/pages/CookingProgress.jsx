import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { evaluateAchievements } from '../data/achievements';

const CookingProgress = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const queryUid = searchParams.get('uid');
  const targetUid = queryUid || user?.uid;
  const isOwnProfile = !queryUid || queryUid === user?.uid;

  const [chefData, setChefData] = useState(null);
  const [chefRecipes, setChefRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  // Fetch Chef Data and Recipes from Firestore
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!targetUid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch User profile document
        const userDocRef = doc(db, 'users', targetUid);
        const userSnap = await getDoc(userDocRef);
        
        let uData = null;
        if (userSnap.exists()) {
          uData = userSnap.data();
        } else if (isOwnProfile && user) {
          uData = user;
        }

        if (isMounted) setChefData(uData);

        // 2. Fetch User Published Recipes
        const qRecipes = query(collection(db, 'recipes'), where('publisher_id', '==', targetUid));
        const recipesSnap = await getDocs(qRecipes);
        let list = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Sort by createdAt descending
        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        if (isMounted) setChefRecipes(list);
      } catch (err) {
        console.warn("Error fetching chef progress data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [targetUid, isOwnProfile, user]);

  // Derived Values & Calculations
  const chefName = chefData?.profile?.nickname || chefData?.name || (isBg ? 'Кулинарен майстор' : 'Culinary Master');
  const chefAvatar = chefData?.profile?.avatar || user?.photoURL || '';
  const reputationScore = Number(chefData?.reputation?.score) || 0;
  const reputationLabel = isBg 
    ? (chefData?.reputation?.label || 'Новак') 
    : (chefData?.reputation?.label_en || 'Novice');

  // Location string
  const loc = chefData?.profile?.location;
  const isLocationPublic = loc && loc.show_location !== false;
  const city = isBg ? (loc?.city_bg || loc?.city_en || loc?.city) : (loc?.city_en || loc?.city_bg || loc?.city);
  const country = isBg ? (loc?.country_bg || loc?.country_en || loc?.country) : (loc?.country_en || loc?.country_bg || loc?.country);
  const locationStr = isLocationPublic ? [city, country].filter(Boolean).join(', ') : '';

  // Bio
  const bio = isBg 
    ? (chefData?.profile?.bio_bg || chefData?.profile?.bio_en || chefData?.profile?.bio) 
    : (chefData?.profile?.bio_en || chefData?.profile?.bio_bg || chefData?.profile?.bio);

  // Statistics
  const recipesCount = chefRecipes.length;

  const totalCookingMinutes = useMemo(() => {
    return chefRecipes.reduce((sum, r) => {
      const prep = Number(r.prep_time_minutes || r.prepTime || 0);
      const cook = Number(r.cook_time_minutes || r.cooking_time_minutes || r.cookTime || 0);
      return sum + prep + cook;
    }, 0);
  }, [chefRecipes]);

  const totalHours = Math.max(1, Math.round(totalCookingMinutes / 60));

  const totalIngredientsCount = useMemo(() => {
    const ingSet = new Set();
    chefRecipes.forEach(r => {
      if (Array.isArray(r.ingredients)) {
        r.ingredients.forEach(i => {
          if (i.ingredient_id || i.name_bg || i.name) {
            ingSet.add(i.ingredient_id || i.name_bg || i.name);
          }
        });
      }
    });
    return Math.max(ingSet.size, recipesCount * 4);
  }, [chefRecipes, recipesCount]);

  // Level & XP Progress
  const currentXP = reputationScore % 1000;
  const xpPercentage = Math.min(100, Math.max(5, Math.round((currentXP / 1000) * 100)));

  // Evaluated Achievements based on real user data and recipes
  const evaluatedAchievements = useMemo(() => {
    return evaluateAchievements(chefData, chefRecipes);
  }, [chefData, chefRecipes]);

  const unlockedCount = useMemo(() => {
    return evaluatedAchievements.filter(a => a.isUnlocked).length;
  }, [evaluatedAchievements]);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 p-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors group cursor-pointer"
            title={isBg ? "Назад" : "Back"}
          >
            <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-center flex-1 text-slate-100 truncate px-2">
            {isOwnProfile 
              ? (isBg ? 'Моят кулинарен прогрес' : 'My Cooking Progress')
              : (isBg ? `Прогрес на ${chefName}` : `${chefName}'s Progress`)}
          </h1>
          {isOwnProfile ? (
            <Link 
              to="/profile/edit" 
              className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors text-primary"
              title={isBg ? "Редактирай профила" : "Edit Profile"}
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </Link>
          ) : (
            <div className="size-10"></div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isBg ? 'Зареждане на прогреса...' : 'Loading progress...'}</p>
          </div>
        ) : (
          <>
            {/* Profile Summary */}
            <section className="p-6 bg-gradient-to-b from-surface-dark to-transparent border-b border-primary/10">
              <div className="flex items-center gap-5 mb-5">
                <div className="relative shrink-0">
                  <div className="size-20 rounded-full border-2 border-primary p-1 shadow-[0_0_20px_rgba(212,175,53,0.3)] bg-background-dark overflow-hidden flex items-center justify-center">
                    {chefAvatar ? (
                      <img src={chefAvatar} alt={chefName} className="size-full rounded-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-primary/40">person</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-primary to-[#b8860b] text-background-dark rounded-full size-6 flex items-center justify-center shadow-lg" title={isBg ? "Потвърден готвач" : "Verified Chef"}>
                    <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
                  </div>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-slate-100 truncate">{chefName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">military_tech</span>
                      {reputationLabel}
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-surface-dark px-2 py-0.5 rounded border border-primary/10">
                      {reputationScore} PTS
                    </span>
                  </div>

                  {locationStr && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-300 font-medium truncate">
                      <span className="material-symbols-outlined text-[14px] text-primary shrink-0">location_on</span>
                      <span className="truncate">{locationStr}</span>
                    </div>
                  )}
                </div>
              </div>

              {bio && (
                <div className="bg-surface-dark/80 border border-primary/10 rounded-2xl p-3.5 mb-5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{isBg ? 'За готвача' : 'About Chef'}</p>
                  <p className="text-xs text-slate-300 italic leading-relaxed">"{bio}"</p>
                </div>
              )}

              {/* Level Progress Bar */}
              <div className="space-y-2 bg-surface-dark/95 p-4 rounded-2xl border border-primary/20 shadow-inner">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{isBg ? 'Кулинарно ниво' : 'Culinary Level'}</span>
                  <span className="text-xs font-extrabold text-primary">{currentXP} / 1000 XP</span>
                </div>
                <div className="h-2.5 w-full bg-background-dark rounded-full overflow-hidden border border-primary/10 p-0.5">
                  <div className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full shadow-[0_0_10px_rgba(212,175,53,0.8)] transition-all duration-500" style={{ width: `${xpPercentage}%` }}></div>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="px-6 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-4 px-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">monitoring</span>
                {isBg ? 'Статистика' : 'Stats'}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:border-primary/40 transition-all">
                  <span className="material-symbols-outlined text-primary mb-1.5 text-3xl">restaurant_menu</span>
                  <span className="text-2xl font-extrabold text-slate-100">{recipesCount}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Рецепти' : 'Recipes'}</span>
                </div>
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:border-primary/40 transition-all">
                  <span className="material-symbols-outlined text-primary mb-1.5 text-3xl">schedule</span>
                  <span className="text-2xl font-extrabold text-slate-100">{totalHours}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Часа опит' : 'Hours Exp'}</span>
                </div>
                <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:border-primary/40 transition-all">
                  <span className="material-symbols-outlined text-primary mb-1.5 text-3xl">set_meal</span>
                  <span className="text-2xl font-extrabold text-slate-100">{totalIngredientsCount}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Съставки' : 'Ingredients'}</span>
                </div>
              </div>
            </section>

            {/* Achievements 3-Column Grid / Medals Showcase */}
            <section className="px-6 py-4">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  {isBg ? 'Постижения & Медали' : 'Achievements & Medals'}
                  <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 ml-1">
                    {unlockedCount} / {evaluatedAchievements.length}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-y-5 gap-x-3">
                {evaluatedAchievements.map(ach => {
                  const achName = isBg ? ach.name.bg : ach.name.en;
                  const achSub = isBg ? ach.subtitle.bg : ach.subtitle.en;

                  return (
                    <div 
                      key={ach.id}
                      onClick={() => setSelectedAchievement(ach)}
                      className={`flex flex-col items-center text-center group cursor-pointer transition-all ${
                        ach.isUnlocked 
                          ? 'opacity-100' 
                          : 'opacity-50 grayscale hover:grayscale-0 hover:opacity-90'
                      }`}
                    >
                      <div className="relative mb-2">
                        <div className={`size-16 sm:size-20 rounded-full p-[2px] group-hover:scale-105 transition-transform ${
                          ach.isUnlocked
                            ? 'bg-gradient-to-tr from-amber-400 via-primary to-yellow-600 shadow-[0_5px_15px_rgba(212,175,53,0.4)] border border-amber-300'
                            : 'bg-surface-dark border border-slate-600/80 shadow-sm'
                        }`}>
                          <div className={`size-full rounded-full flex items-center justify-center ${
                            ach.isUnlocked ? 'bg-background-dark' : 'bg-background-dark/90'
                          }`}>
                            <span className={`material-symbols-outlined text-3xl sm:text-4xl ${
                              ach.isUnlocked ? 'text-amber-400' : 'text-slate-500'
                            }`}>
                              {ach.icon}
                            </span>
                          </div>
                        </div>

                        {/* Status Icon Badge */}
                        <div className={`absolute -bottom-0.5 -right-0.5 rounded-full size-5 sm:size-6 flex items-center justify-center text-[10px] font-bold shadow-md border ${
                          ach.isUnlocked 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-slate-800 text-slate-400 border-slate-600'
                        }`}>
                          <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                            {ach.isUnlocked ? 'check' : 'lock'}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs font-extrabold leading-tight px-1 ${ach.isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                        {achName}
                      </p>
                      <p className={`text-[9px] font-medium mt-0.5 line-clamp-1 px-1 ${ach.isUnlocked ? 'text-amber-400/90' : 'text-slate-500'}`}>
                        {achSub}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Author's Masterpieces / Published Recipes */}
            <section className="px-6 py-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  {isBg ? 'Скорошни шедьоври & рецепти' : 'Masterpieces & Recipes'}
                </h3>
                {recipesCount > 0 && (
                  <button 
                    onClick={() => navigate(`/?author=${targetUid}&authorName=${encodeURIComponent(chefName)}`)}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {isBg ? `Виж всички (${recipesCount})` : `View all (${recipesCount})`}
                  </button>
                )}
              </div>

              {chefRecipes.length > 0 ? (
                <div className="space-y-3.5">
                  {chefRecipes.slice(0, 5).map(r => {
                    const rTitle = isBg ? (r.title_bg || r.title_en) : (r.title_en || r.title_bg);
                    const rDesc = isBg ? (r.description_bg || r.description_en) : (r.description_en || r.description_bg);
                    
                    const imgUrl = getRecipeImageUrl(r);
                    const ratingScore = (r.rating !== undefined && r.rating !== null) 
                      ? Number(r.rating).toFixed(1) 
                      : (r.rating_avg !== undefined ? Number(r.rating_avg).toFixed(1) : '5.0');
                    const votesCount = r.votes_count || r.votes || (Array.isArray(r.ratings) ? r.ratings.length : 0);
                    
                    const prepMins = Number(r.prep_time_minutes || r.prepTime || 0);
                    const cookMins = Number(r.cook_time_minutes || r.cooking_time_minutes || r.cookTime || 0);
                    const totalMins = (prepMins + cookMins) > 0 ? (prepMins + cookMins) : Number(r.total_time_minutes || r.cooking_time_minutes || 30);

                    return (
                      <div 
                        key={r.id} 
                        onClick={() => navigate(`/recipe/${r.id}`)}
                        className="bg-surface-dark/90 border border-primary/20 rounded-2xl overflow-hidden flex gap-4 shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                      >
                        <div className="w-24 sm:w-28 h-24 sm:h-28 shrink-0 overflow-hidden bg-background-dark border-r border-primary/20">
                          <img 
                            src={imgUrl} 
                            alt={rTitle} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/recipe-placeholder.png'; }}
                          />
                        </div>
                        <div className="flex flex-col justify-center py-2 pr-4 min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                              <span>★ {ratingScore}</span>
                              {votesCount > 0 && <span className="text-slate-400 font-normal">({votesCount})</span>}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs text-primary">schedule</span>
                              {totalMins} {isBg ? 'мин' : 'min'}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base leading-snug text-slate-100 group-hover:text-primary transition-colors truncate">
                            {rTitle}
                          </h4>
                          {rDesc && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic font-normal">
                              {rDesc}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-surface-dark/50 border border-dashed border-primary/20 rounded-2xl">
                  <span className="material-symbols-outlined text-3xl text-slate-500 mb-1">restaurant</span>
                  <p className="text-xs text-slate-400 font-medium">
                    {isBg ? 'Все още няма публикувани рецепти от този готвач' : 'No recipes published by this chef yet'}
                  </p>
                </div>
              )}
            </section>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 text-center relative">
            <button 
              onClick={() => setSelectedAchievement(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 cursor-pointer p-1"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex justify-center my-3">
              <div className={`size-24 rounded-full p-[3px] flex items-center justify-center ${
                selectedAchievement.isUnlocked 
                  ? 'bg-gradient-to-tr from-amber-400 via-primary to-yellow-600 shadow-[0_0_30px_rgba(212,175,53,0.5)] border-2 border-amber-300'
                  : 'bg-surface-dark border border-slate-600 grayscale opacity-60'
              }`}>
                <div className="size-full rounded-full bg-background-dark flex items-center justify-center">
                  <span className={`material-symbols-outlined text-5xl ${
                    selectedAchievement.isUnlocked ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {selectedAchievement.icon}
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 mx-auto mb-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                selectedAchievement.isUnlocked 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <span className="material-symbols-outlined text-xs">
                  {selectedAchievement.isUnlocked ? 'verified' : 'lock'}
                </span>
                {selectedAchievement.isUnlocked ? (isBg ? 'Придобито постижение' : 'Achievement Unlocked') : (isBg ? 'Заключено постижение' : 'Locked Achievement')}
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-100">
              {isBg ? selectedAchievement.name.bg : selectedAchievement.name.en}
            </h3>
            <p className="text-xs text-primary font-bold mt-0.5">
              {isBg ? selectedAchievement.subtitle.bg : selectedAchievement.subtitle.en}
            </p>

            <div className="my-4 p-3.5 bg-background-dark/60 rounded-2xl border border-primary/10 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {isBg ? 'Условие за спечелване' : 'Requirement'}
              </p>
              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                {isBg ? selectedAchievement.description.bg : selectedAchievement.description.en}
              </p>

              {/* Progress bar inside modal */}
              {selectedAchievement.progress && (
                <div className="mt-3 pt-3 border-t border-primary/10 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">{isBg ? 'Прогрес:' : 'Progress:'}</span>
                    <span className={selectedAchievement.isUnlocked ? 'text-emerald-400' : 'text-amber-400'}>
                      {selectedAchievement.progress.current} / {selectedAchievement.progress.target}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden border border-primary/10">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        selectedAchievement.isUnlocked 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                          : 'bg-gradient-to-r from-amber-500 to-primary'
                      }`} 
                      style={{ width: `${Math.min(100, Math.round((selectedAchievement.progress.current / selectedAchievement.progress.target) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAchievement(null)}
              className="w-full py-3 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isBg ? 'Разбрах' : 'Got it'}
            </button>
          </div>
        </div>
      )}
          </>
        )}
      </main>
    </div>
  );
};

export default CookingProgress;

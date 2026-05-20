import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { REPUTATION_POINTS, getPointsForRating } from '../lib/reputationUtils';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, isGuest, isAdmin, isOwner, awardPoints } = useAuth();
  const { pantry, generateShoppingList } = useAppContext();
  const isPantryActive = !isGuest && (user?.preferences?.pantry_active !== false);
  const isPowerUser = isAdmin || isOwner;
  const isBg = i18n.language === 'bg';

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [variations, setVariations] = useState([]);
  const [parentRecipe, setParentRecipe] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [units, setUnits] = useState({});
  const [ingredientsList, setIngredientsList] = useState([]);
  const [currentServings, setCurrentServings] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRecipe({ id: docSnap.id, ...data });
          setActiveImageIndex(0);
          
          // Fetch units to display names instead of IDs
          try {
            const unitsSnap = await getDocs(collection(db, 'measurements'));
            const unitsMap = {};
            unitsSnap.forEach(uDoc => {
              unitsMap[uDoc.id] = uDoc.data();
            });
            setUnits(unitsMap);
          } catch (uErr) {
            console.warn("Units fetch restricted or failed:", uErr.message);
          }

          // Fetch master ingredients
          try {
            const ingSnap = await getDocs(collection(db, 'ingredients'));
            setIngredientsList(ingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (iErr) {
            console.warn("Ingredients fetch restricted or failed:", iErr.message);
          }
          
          // Check if current user has already voted
          if (user && data.ratings) {
            const existingVote = data.ratings.find(r => r.userId === user.uid);
            if (existingVote) setUserVote(existingVote.score);
          }

          // Fetch Author reputation info
          if (data.publisher_id) {
            try {
              const authorSnap = await getDoc(doc(db, 'users', data.publisher_id));
              if (authorSnap.exists()) {
                setAuthorData(authorSnap.data());
              }
            } catch (aErr) {
              console.warn("Author data restricted:", aErr.message);
            }
          }

          // Initial servings logic
          const defaultSrv = user?.preferences?.servings_default || data.servings || 2;
          setCurrentServings(defaultSrv);

          // Increment views (Only if not Guest or ignore error)
          const newViews = (data.views_count || 0) + 1;
          try {
            await updateDoc(docRef, {
              views_count: increment(1)
            });

            if (newViews % 100 === 0 && data.publisher_id && awardPoints) {
              await awardPoints(data.publisher_id, REPUTATION_POINTS.POPULARITY_BONUS);
            }
          } catch {
            console.warn("View tracking restricted for guests");
          }

          // Fetch variations
          const varQuery = query(
            collection(db, 'recipes'),
            where('parent_recipe_id', '==', id),
            where('is_public_variation', '==', true)
          );
          const varSnap = await getDocs(varQuery);
          setVariations(varSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // If this is a variation, fetch parent title
          if (data.parent_recipe_id) {
            const parentSnap = await getDoc(doc(db, 'recipes', data.parent_recipe_id));
            if (parentSnap.exists()) {
              setParentRecipe({ id: parentSnap.id, ...parentSnap.data() });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRecipe();
  }, [id, user, awardPoints]);

  const analyzeRecipe = () => {
    let missingIngredients = [];
    if (!recipe || !recipe.ingredients) return [];
    
    recipe.ingredients.forEach(reqIng => {
      // Find in pantry by ingredientId if available, else by name match
      const pantryItem = pantry.find(p => 
        (p.ingredientId && p.ingredientId === reqIng.ingredient_id) || 
        (p.name === reqIng.name_en || p.nameBg === reqIng.name_bg)
      );
      
      const requiredAmount = parseFloat(reqIng.amount) || 0;
      const scaledAmount = requiredAmount * currentServings;
      const pantryAmount = pantryItem ? (parseFloat(pantryItem.quantity) || 0) : 0;
      
      if (pantryAmount < scaledAmount) {
        missingIngredients.push({
          ...reqIng,
          name: isBg ? reqIng.name_bg : reqIng.name_en,
          quantityToBuy: Math.max(0, scaledAmount - pantryAmount)
        });
      }
    });

    return missingIngredients;
  };

  const handleVote = async (score) => {
    if (!user) {
      alert(isBg ? 'Трябва да сте влезли в профила си, за да гласувате.' : 'You must be logged in to vote.');
      return;
    }
    if (userVote) return; // Already voted
    if (isVoting) return;

    setIsVoting(true);
    try {
      const docRef = doc(db, 'recipes', id);
      const currentRatings = recipe.ratings || [];
      const currentCount = currentRatings.length;
      const currentAvg = recipe.rating || 0;
      
      const newTotal = (currentAvg * currentCount) + score;
      const newCount = currentCount + 1;
      const newAvg = parseFloat((newTotal / newCount).toFixed(1));

      await updateDoc(docRef, {
        ratings: arrayUnion({ userId: user.uid, score: score, timestamp: new Date().toISOString() }),
        rating: newAvg,
        votes_count: newCount
      });

      // Award Reputation Points
      // 1. To the rater
      await awardPoints(user.uid, REPUTATION_POINTS.RATE_OTHERS);
      
      // 2. To the author (if not the same person)
      if (recipe.publisher_id && recipe.publisher_id !== user.uid) {
        const pointsForAuthor = getPointsForRating(score);
        if (pointsForAuthor > 0) {
          await awardPoints(recipe.publisher_id, pointsForAuthor);
        }
      }

      setUserVote(score);
      setRecipe(prev => ({
        ...prev,
        rating: newAvg,
        votes_count: newCount,
        ratings: [...(prev.ratings || []), { userId: user.uid, score }]
      }));
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете тази рецепта?' : 'Are you sure you want to delete this recipe?')) return;
    
    try {
      await updateDoc(doc(db, 'recipes', id), {
        is_deleted: true,
        is_public_variation: false,
        deleted_at: new Date().toISOString()
      });
      alert(isBg ? 'Рецептата е изтрита успешно.' : 'Recipe deleted successfully.');
      navigate('/');
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert(isBg ? 'Грешка при изтриване.' : 'Error deleting.');
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background-dark text-primary">
      <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
    </div>
  );

  if (!recipe) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark text-slate-400 gap-4">
      <span className="material-symbols-outlined text-6xl opacity-20">sentiment_very_dissatisfied</span>
      <p>{isBg ? 'Рецептата не беше намерена.' : 'Recipe not found.'}</p>
      <button onClick={() => navigate('/')} className="text-primary font-bold uppercase tracking-widest text-xs border-b border-primary pb-1">{isBg ? 'Към начало' : 'Back Home'}</button>
    </div>
  );

  const title = isBg ? recipe.title_bg : recipe.title_en;
  const difficulty = isBg ? (recipe.difficulty === 'easy' ? 'Лесно' : recipe.difficulty === 'hard' ? 'Трудно' : 'Средно') : recipe.difficulty;
  const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const placeholderImg = "/images/recipe-placeholder.png";
  const missing = analyzeRecipe();
  const isReady = isPantryActive ? missing.length === 0 : true;

  const allImages = [];
  if (recipe.images?.main) allImages.push(recipe.images.main);
  if (recipe.images?.extra1) allImages.push(recipe.images.extra1);
  if (recipe.images?.extra2) allImages.push(recipe.images.extra2);
  if (allImages.length === 0) allImages.push(placeholderImg);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-24">
      {/* Header Navigation */}
      <div className="sticky top-0 z-50 flex items-center bg-surface-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-primary text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {title}
        </h2>
        <div className="flex gap-2">
          {user && recipe.publisher_id === user.uid && (
            <button 
              onClick={handleDeleteRecipe}
              className="flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
              title={isBg ? 'Изтрий' : 'Delete'}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
          <button className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/5] overflow-hidden">
        <div 
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-all duration-500 ease-in-out" 
          style={{backgroundImage: `url("${allImages[activeImageIndex]}")`}}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>

        {/* Floating Gallery Thumbnails */}
        {allImages.length > 1 && (
          <div className="absolute right-4 top-1/3 -translate-y-1/2 z-20 flex flex-col gap-2 bg-background-dark/60 p-2 rounded-2xl border border-primary/20 backdrop-blur-md shadow-2xl">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-12 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImageIndex === idx 
                    ? 'border-primary scale-[1.05] shadow-lg shadow-primary/20' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Left/Right Navigation Chevrons */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
              className="absolute left-4 top-1/3 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background-dark/50 border border-primary/20 text-primary hover:bg-background-dark/80 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined select-none">chevron_left</span>
            </button>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-20 top-1/3 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background-dark/50 border border-primary/20 text-primary hover:bg-background-dark/80 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined select-none">chevron_right</span>
            </button>
          </>
        )}
        
        {parentRecipe && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <button 
              onClick={() => navigate(`/recipe/${parentRecipe.id}`)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/30 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              {isBg ? 'Базирана на: ' : 'Based on: '} {isBg ? parentRecipe.title_bg : parentRecipe.title_en}
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 p-6 w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-bold uppercase tracking-tighter shadow-md">
                {recipe.cuisine_id || 'Global Selection'}
              </span>
            </div>
            
            {/* Interactive Rating UI */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    disabled={!!userVote || !user || isVoting}
                    onClick={() => handleVote(star)}
                    className={`material-symbols-outlined text-[20px] transition-all ${
                      (userVote >= star || (!userVote && recipe.rating >= star)) 
                        ? 'text-amber-500 fill-1' 
                        : 'text-slate-400'
                    } ${(user && !userVote && !isVoting) ? 'hover:scale-125 cursor-pointer hover:text-amber-400' : 'cursor-default'}`}
                    style={{ fontVariationSettings: (userVote >= star || (!userVote && recipe.rating >= star)) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {recipe.rating || 0} / 5 ({recipe.votes_count || 0} {isBg ? 'гласа' : 'votes'})
              </p>
            </div>
          </div>
          <h1 className="text-slate-100 text-4xl font-extrabold leading-tight drop-shadow-lg">
            {isBg ? recipe.title_bg : recipe.title_en} <br/>
            <span className="text-primary/90 font-light italic text-2xl tracking-wide">{isBg ? recipe.title_en : recipe.title_bg}</span>
          </h1>
        </div>
      </div>

      {/* Action Bar (My Version / Wine Pairing) */}
      <div className="flex px-4 pt-4 gap-3">
        {isPowerUser && (
          <button 
            onClick={() => navigate('/admin/recipes')} 
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 py-3 rounded-xl hover:bg-amber-500/20 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Редактирай' : 'Edit'}</span>
          </button>
        )}
        <button 
          onClick={() => navigate(`/recipe/${id}/customize`)} 
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 text-primary py-3 rounded-xl hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-md group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">alt_route</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Моя версия' : 'My Version'}</span>
        </button>
        {!isPowerUser && (
          <button onClick={() => navigate(`/recipe/${id}/wine`)} className="flex-1 flex items-center justify-center gap-2 bg-surface-dark border border-rose-500/30 text-rose-400 py-3 rounded-xl hover:bg-rose-500/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">wine_bar</span>
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Винено' : 'Wine'}</span>
          </button>
        )}
      </div>

      {/* Community Variations */}
      {variations.length > 0 && (
        <div className="px-4 py-6 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">alt_route</span>
            <h3 className="text-slate-100 font-bold uppercase tracking-widest text-xs">
              {isBg ? 'Потребителски версии' : 'Community Variations'}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {variations.map(v => (
              <button 
                key={v.id}
                onClick={() => navigate(`/recipe/${v.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-primary/20 hover:border-primary/50 transition-all group"
              >
                <div className="flex flex-col text-left">
                  <span className="text-slate-200 text-sm font-bold group-hover:text-primary transition-colors">
                    {isBg ? v.title_bg : v.title_en}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">
                    {isBg ? 'От: ' : 'By: '} {v.publisher_name || 'Chef'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors">chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="flex flex-wrap gap-3 p-4">
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Време' : 'Prep Time'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{prepTime}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Трудност' : 'Difficulty'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{difficulty}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Порции' : 'Servings'}</p>
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => setCurrentServings(prev => Math.max(1, prev - 1))}
              className="size-6 rounded-full border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <p className="text-slate-100 text-lg font-extrabold min-w-[20px]">{currentServings}</p>
            <button 
              onClick={() => setCurrentServings(prev => prev + 1)}
              className="size-6 rounded-full border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nutrition Summary */}
      <div className="px-4 py-2">
        <div className="flex justify-between items-center bg-surface-dark/80 backdrop-blur-md rounded-2xl p-4 border border-primary/10 shadow-inner">
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.calories_per_serving || recipe.calories || 0) * currentServings)}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Калории' : 'Calories'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.protein || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Протеин' : 'Protein'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.fat || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Мазнини' : 'Fat'}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-100 text-2xl font-extrabold flex flex-col tracking-tight">
            {isBg ? 'Съставки' : 'Ingredients'}
          </h3>
          <span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
        </div>

        {!isReady && isPantryActive && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500 text-2xl">warning</span>
            <div>
              <p className="text-slate-200 text-sm font-bold">
                {isBg ? `Липсват ${missing.length} продукта` : `Missing ${missing.length} ingredients`}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isBg ? 'Някои продукти липсват или не са в достатъчно количество в килера ви.' : 'Some items are missing or not in sufficient quantity in your pantry.'}
              </p>
            </div>
          </div>
        )}

        <ul className="space-y-4">
          {recipe.ingredients?.map((ing, idx) => {
            const unit = units[ing.unit_id];
            const unitName = isBg ? (unit?.name_bg || ing.unit_id) : (unit?.name_en || ing.unit_id);
            const dbIng = ingredientsList.find(i => i.id === ing.ingredient_id);
            const ingName = isBg 
              ? (ing.ingredient_bg || ing.name_bg || dbIng?.name_bg || ing.ingredient_id) 
              : (ing.ingredient_en || ing.name_en || dbIng?.name_en || ing.ingredient_id);

            const isIngMissing = isPantryActive && missing.some(m => 
              m.ingredient_id === ing.ingredient_id || 
              (m.name_en === ingName || m.name_bg === ingName)
            );

            return (
              <li key={idx} className="flex justify-between items-center border-b border-primary/10 pb-3">
                <span className="text-slate-200 font-medium">
                  {ingName}
                  {((isBg && ing.notes_bg) || (!isBg && ing.notes_en)) && (
                    <span className="text-primary/70 text-xs italic ml-2">({isBg ? ing.notes_bg : ing.notes_en})</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{(ing.amount * currentServings).toFixed(1).replace('.0', '')} {unitName}</span>
                  {isPantryActive ? (
                    isIngMissing ? (
                      <span className="material-symbols-outlined text-rose-500/70 size-6 text-xl drop-shadow-md" title={isBg ? 'Липсва в килера' : 'Missing in pantry'}>remove_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-emerald-500 size-6 text-xl drop-shadow-md" title={isBg ? 'Налично в килера' : 'Available in pantry'}>check_circle</span>
                    )
                  ) : (
                    <span className="material-symbols-outlined text-primary/30 size-6 text-xl drop-shadow-md">check_circle</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {!isReady && isPantryActive && (
          <button 
            onClick={() => {
              generateShoppingList(missing);
              alert(isBg ? 'Липсващите съставки бяха добавени в списъка за пазаруване!' : 'Missing ingredients were added to your shopping list!');
            }}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 text-primary py-3 rounded-xl font-bold uppercase tracking-widest hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined">add_shopping_cart</span>
            {isBg ? 'Добави липсващите в списъка' : 'Add missing to list'}
          </button>
        )}
      </div>

      <div className="p-6 bg-surface-dark/50 border-t border-primary/10 mt-2">
        <h3 className="text-slate-100 text-2xl font-extrabold mb-8 flex flex-col tracking-tight">
          {isBg ? 'Начин на приготвяне' : 'Preparation'}
        </h3>
        
        <div className="space-y-10 relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
          {recipe.steps?.map((step, idx) => (
            <div key={idx} className="relative pl-12">
              <div className="absolute left-[9px] top-0 size-5 rounded-full bg-primary border-4 border-background-dark shadow-[0_0_10px_rgba(212,175,53,0.5)]"></div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary font-extrabold text-xs uppercase tracking-widest">
                  Step {idx + 1} / Стъпка {idx + 1}
                </p>
                {step.timer_minutes && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span className="text-[10px] font-bold">{step.timer_minutes}m</span>
                  </div>
                )}
              </div>
              <p className="text-slate-200 text-base leading-relaxed font-medium mb-1">
                {isBg ? step.instruction_bg : step.instruction_en}
              </p>
              <p className="text-slate-400 text-sm italic">
                {isBg ? step.instruction_en : step.instruction_bg}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Author Section */}
      {authorData && (
        <div className="mx-6 my-4 p-4 rounded-2xl bg-surface-dark/80 border border-primary/20 flex items-center gap-4">
          <div className="size-12 rounded-full border-2 border-primary/30 overflow-hidden bg-background-dark">
            {authorData.profile?.avatar ? (
              <img src={authorData.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/30">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">
              {isBg ? 'Готвач' : 'Chef'}
            </p>
            <h4 className="text-slate-100 font-bold text-sm leading-tight">
              {authorData.profile?.nickname || authorData.name || (isBg ? 'Анонимен' : 'Anonymous')}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-[14px] text-amber-500">military_tech</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                {isBg ? (authorData.reputation?.label || 'Новак') : (authorData.reputation?.label_en || 'Novice')}
              </span>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">
              {isBg ? 'Репутация' : 'Reputation'}
            </p>
            <p className="text-primary font-black text-sm">{authorData.reputation?.score || 0}</p>
          </div>
        </div>
      )}

      {/* Inspiration & Video Section */}
      {(recipe.video_url || recipe.original_author || recipe.source_link) && (
        <div className="mx-6 my-4 p-4 rounded-2xl bg-surface-dark/80 border border-primary/20 flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">emoji_objects</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isBg ? 'Източник на вдъхновение' : 'Source of Inspiration'}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            {recipe.video_url && (
              <a 
                href={recipe.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-background-dark/50 border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500 text-xl group-hover:scale-110 transition-transform">play_circle</span>
                  <div className="flex flex-col">
                    <span className="text-slate-200 text-xs font-bold group-hover:text-primary transition-colors">
                      {isBg ? 'Гледай видео рецептата' : 'Watch Video Recipe'}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary/40 group-hover:text-primary text-[16px] transition-colors">open_in_new</span>
              </a>
            )}

            {(recipe.original_author || recipe.source_link) && (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-background-dark/30 border border-primary/5">
                {recipe.original_author && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">person</span>
                    <p className="text-slate-200 text-xs">
                      <span className="text-slate-400 mr-1">{isBg ? 'Оригинален автор:' : 'Original Author:'}</span>
                      <span className="font-bold">{recipe.original_author}</span>
                    </p>
                  </div>
                )}
                {recipe.source_link && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">link</span>
                    <a 
                      href={recipe.source_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-light text-xs font-bold flex items-center gap-1 transition-colors group"
                    >
                      <span>{isBg ? 'Към оригиналния сайт' : 'To Original Website'}</span>
                      <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Action Button */}
      <div className="p-6 pb-8">
        <button className="w-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-4 rounded-2xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-xl">bookmark</span>
          {isBg ? 'ЗАПАЗИ РЕЦЕПТАТА' : 'SAVE TO MY RECIPES'}
        </button>
        
        <button onClick={() => navigate(`/recipe/${id || '1'}/cooking`)} className="w-full mt-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-extrabold py-4 rounded-2xl shadow-sm hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-xl">play_circle</span>
          {isBg ? 'ЗАПОЧНИ ГОТВЕНЕ' : 'START COOKING'}
        </button>
      </div>
    </div>
  );
};

export default RecipeDetail;

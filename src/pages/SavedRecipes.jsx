import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot, getDoc, updateDoc, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { getCuisineById } from '../data/cuisines';
import { translateTag } from '../lib/recipeMetaUtils';
import { calculateEstimatedPrice } from '../lib/priceUtils';

const SavedRecipes = () => {
  const { shoppingList } = useAppContext();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';

  const [savedRecipes, setSavedRecipes] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch ingredients for price calculation
    getDocs(collection(db, 'ingredients'))
      .then(snap => setIngredientsList(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => console.warn("Could not fetch ingredients for price calc"));

    if (!user || user.role === 'guest') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
      if (userDoc.exists()) {
        const uData = userDoc.data();
        const recipeIds = uData.saved_recipes || [];
        
        if (recipeIds.length === 0) {
          setSavedRecipes([]);
          setLoading(false);
          return;
        }

        try {
          // Fetch recipes by ID
          const recipePromises = recipeIds.map(id => getDoc(doc(db, 'recipes', id)));
          const recipeDocs = await Promise.all(recipePromises);
          
          const fetchedRecipes = recipeDocs
            .filter(d => d.exists() && !d.data().is_deleted)
            .map(d => ({ id: d.id, ...d.data() }));
            
          setSavedRecipes(fetchedRecipes);
        } catch (error) {
          console.error("Error fetching saved recipes:", error);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleUnsave = async (e, recipeId) => {
    e.stopPropagation();
    if (window.confirm(isBg ? 'Сигурни ли сте, че искате да премахнете тази рецепта от запазените?' : 'Are you sure you want to remove this recipe from saved?')) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          saved_recipes: arrayRemove(recipeId)
        });
      } catch(err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex-1 pb-32 px-4 py-8">
      <h2 className="text-3xl font-extrabold text-slate-100 mb-8 tracking-tight">{t('saved.title')}</h2>
      
      {/* Shopping List Section */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-primary mb-5 flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          {t('saved.shopping_list')}
        </h3>
        
        {shoppingList.length === 0 ? (
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">remove_shopping_cart</span>
            <p className="text-slate-400 text-sm font-medium">{t('saved.empty_list')}</p>
          </div>
        ) : (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-2 shadow-lg">
            {shoppingList.map((item, index) => {
              const name = isBg ? item.nameBg : item.name;
              return (
                <div key={index} className="flex items-center justify-between border-b border-primary/10 p-3 last:border-0 hover:bg-white/5 rounded-xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="size-6 rounded-md border-2 border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors cursor-pointer">
                    </div>
                    <div>
                      <p className="text-slate-100 text-base font-bold">{name}</p>
                    </div>
                  </div>
                  <div className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 text-primary font-extrabold text-sm shadow-inner">
                    {item.quantityToBuy} <span className="text-[10px] text-primary/70">{item.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Recipes Section */}
      <div>
        <h3 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-primary text-2xl">bookmark</span>
          {t('saved.recipes')}
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
          </div>
        ) : savedRecipes.length === 0 ? (
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">bookmark_border</span>
            <p className="text-slate-400 text-sm font-medium">{isBg ? 'Нямате запазени рецепти.' : 'No saved recipes yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {savedRecipes.map(recipe => {
              const title = isBg ? recipe.title_bg : recipe.title_en;
              const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
              const difficulty = isBg ? (recipe.difficulty === 'easy' ? 'Лесно' : recipe.difficulty === 'hard' ? 'Трудно' : 'Средно') : (recipe.difficulty || 'medium');
              const imageUrl = recipe.images?.main || "/placeholder.jpg";
              const cuisineObj = recipe.cuisine_id ? getCuisineById(recipe.cuisine_id) : null;
              const cuisineName = cuisineObj ? (isBg ? cuisineObj.name.bg : cuisineObj.name.en) : (isBg ? 'Световна Селекция' : 'Global Selection');
              const tags = recipe.tags || [];

              return (
                <div 
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:border-primary/50 transition-colors flex flex-col group cursor-pointer"
                >
                  <div className="flex h-auto min-h-[10rem]">
                    <div className="w-[35%] overflow-hidden relative bg-slate-900">
                      <img 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
                        alt={title} 
                        src={imageUrl}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder.jpg';
                        }}
                      />
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
                          {calculateEstimatedPrice(recipe, ingredientsList) && (
                            <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded">
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>~{calculateEstimatedPrice(recipe, ingredientsList)} {isBg ? 'Евро' : 'EUR'}</span>
                            </span>
                          )}
                          {recipe.video_url && (
                            <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                              <span className="material-symbols-outlined text-[13px]">play_circle</span>
                              <span>{isBg ? 'Видео' : 'Video'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end mt-auto pt-1">
                        <button 
                          onClick={(e) => handleUnsave(e, recipe.id)}
                          className="size-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                          title={isBg ? 'Премахни от запазени' : 'Remove from saved'}
                        >
                          <span className="material-symbols-outlined text-sm font-bold">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedRecipes;

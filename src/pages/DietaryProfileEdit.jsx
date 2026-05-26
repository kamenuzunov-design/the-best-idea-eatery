import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DietaryProfileEdit = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  // Master ingredients references
  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);

  // Initialize state
  const [diet, setDiet] = useState(user?.preferences?.diet?.join(', ') || '');
  const [allergies, setAllergies] = useState(user?.preferences?.allergies?.join(', ') || '');
  const [exclusions, setExclusions] = useState(user?.preferences?.exclusions || []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch reference data on mount
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const iSnap = await getDocs(collection(db, 'ingredients'));
        setIngredientsDB(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Could not load ingredients database:", err.message);
      }
    };
    fetchIngredients();
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q) {
      setFilteredIngredients([]);
      return;
    }
    const lowerQ = q.toLowerCase();
    const matches = ingredientsDB.filter(ing => 
      (ing.name_bg && ing.name_bg.toLowerCase().includes(lowerQ)) ||
      (ing.name_en && ing.name_en.toLowerCase().includes(lowerQ))
    ).filter(ing => ing.is_active !== false && ing.is_deleted !== true);
    
    setFilteredIngredients(matches.slice(0, 8));
  };

  const handleAddExclusion = (id) => {
    if (!exclusions.includes(id)) {
      setExclusions([...exclusions, id]);
    }
    setSearchQuery('');
    setFilteredIngredients([]);
  };

  const handleRemoveExclusion = (id) => {
    setExclusions(exclusions.filter(exId => exId !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const toArray = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

      await updateUserProfile({
        'preferences.diet': toArray(diet),
        'preferences.allergies': toArray(allergies),
        'preferences.exclusions': exclusions,
      });

      alert(isBg ? 'Диетичният профил е записан успешно!' : 'Dietary profile saved successfully!');
      navigate('/pantry');
    } catch (err) {
      console.error(err);
      setError(isBg ? 'Възникна грешка при запазване.' : 'Error saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button type="button" onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            {isBg ? 'Редактиране на Диетичен Профил' : 'Edit Dietary Profile'}
          </h1>
          <p className="text-xs text-primary/70">
            {isBg ? 'Персонализирайте вашите предпочитания и алергии' : 'Customize your preferences & allergies'}
          </p>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Diets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">eco</span>
              {isBg ? 'Хранителен Режим / Диети (Само на английски)' : 'Diets / Nutritional Regimes (English Only)'}
            </label>
            <input
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm"
              placeholder={isBg ? 'напр. vegan, vegetarian, keto, paleo, gluten-free' : 'e.g. vegan, vegetarian, keto, paleo, gluten-free'}
              type="text"
            />
            <p className="text-[10px] text-slate-500 px-1 italic">
              {isBg 
                ? 'Въведете режими, разделени със запетая. ВАЖНО: Използвайте САМО английски думи, тъй като филтрите на продуктите в базата данни работят с английски тагове.' 
                : 'Enter regimes separated by commas. IMPORTANT: Use English words only, as the product database filters rely on English tags.'}
            </p>
          </div>

          {/* Allergies */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-rose-400">warning</span>
              {isBg ? 'Алергии и Непоносимости (Само на английски)' : 'Allergies & Intolerances (English Only)'}
            </label>
            <input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-rose-500/30 rounded-xl px-4 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-slate-100 shadow-inner text-sm"
              placeholder={isBg ? 'напр. nuts, peanuts, gluten, lactose, eggs, fish' : 'e.g. nuts, peanuts, gluten, lactose, eggs, fish'}
              type="text"
            />
            <p className="text-[10px] text-slate-500 px-1 italic">
              {isBg 
                ? 'Въведете алергени, разделени със запетая. ВАЖНО: Използвайте САМО английски думи, за да съвпадат точно с алергените на продуктите в базата.' 
                : 'Enter allergens separated by commas. IMPORTANT: Use English words only to match the allergens defined in the database.'}
            </p>
          </div>

          {/* Exclusions */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-amber-500">block</span>
              {isBg ? 'Изключени храни / Нежелани съставки' : 'Exclusions / Disliked Ingredients'}
            </label>
            
            {/* Exclusions Autocomplete Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm"
                placeholder={isBg ? 'Потърсете и изберете продукт за изключване...' : 'Search and select product to exclude...'}
              />
              
              {filteredIngredients.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-surface-dark border border-primary/20 rounded-xl shadow-xl divide-y divide-primary/10">
                  {filteredIngredients.map(ing => {
                    const name = isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg);
                    return (
                      <div
                        key={ing.id}
                        onClick={() => handleAddExclusion(ing.id)}
                        className="px-4 py-3 text-slate-200 hover:bg-primary/10 hover:text-primary cursor-pointer text-sm transition-colors flex justify-between items-center"
                      >
                        <span>{name}</span>
                        <span className="material-symbols-outlined text-xs">add</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Selected Exclusions List (Vertical List) */}
            <div className="space-y-2 mt-3">
              {exclusions.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">
                  {isBg ? 'Няма изключени продукти' : 'No excluded products'}
                </p>
              ) : (
                exclusions.map(exId => {
                  const ing = ingredientsDB.find(i => i.id === exId);
                  const name = ing ? (isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg)) : exId;
                  return (
                    <div key={exId} className="flex justify-between items-center bg-surface-dark/30 border border-primary/10 rounded-xl p-3 hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-sm">block</span>
                        <span className="text-slate-200 text-sm font-medium">{name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(exId)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title={isBg ? 'Премахни' : 'Remove'}
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-col gap-3">
            <button
              disabled={loading}
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <span>{isBg ? 'Запиши' : 'Save'}</span>
                  <span className="material-symbols-outlined font-bold">check_circle</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="w-full h-14 bg-transparent border border-primary/20 text-slate-400 font-bold hover:text-slate-200 transition-colors rounded-xl flex items-center justify-center gap-2"
            >
              <span>{isBg ? 'Отказ' : 'Cancel'}</span>
              <span className="material-symbols-outlined">cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DietaryProfileEdit;

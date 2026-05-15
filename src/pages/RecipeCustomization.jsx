import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../lib/activityLogger';
import { REPUTATION_POINTS } from '../lib/reputationUtils';

const RecipeCustomization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, awardPoints } = useAuth();
  const isBg = i18n.language === 'bg';
  
  const [loading, setLoading] = useState(true);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  
  // Customization State
  const [titleBg, setTitleBg] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'recipes', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOriginalRecipe(data);
          setTitleBg(`${data.title_bg} (версия на ${user.profile?.nickname || 'потребител'})`);
          setTitleEn(`${data.title_en} (version by ${user.profile?.nickname || 'user'})`);
          setIngredients(data.ingredients || []);
          setSteps(data.steps || []);
        }
      } catch (err) {
        console.error("Error fetching recipe for customization:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id && user) fetchOriginal();
    else if (!user) navigate('/login');
  }, [id, user, navigate]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const userNickname = user.profile?.nickname || user.uid.slice(0, 5);
      const newSlug = `${originalRecipe.slug}-by-${userNickname.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
      
      const newRecipeData = {
        ...originalRecipe,
        title_bg: titleBg,
        title_en: titleEn,
        slug: newSlug,
        parent_recipe_id: id,
        is_public_variation: isPublic,
        publisher_id: user.uid,
        publisher_name: userNickname,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        is_active: true,
        is_deleted: false,
        ingredients,
        steps,
        rating: 0,
        votes_count: 0,
        views_count: 0,
        ratings: []
      };

      await setDoc(doc(db, 'recipes', newSlug), newRecipeData);
      await logActivity(user.uid, user.email, 'create_recipe_variation', `Created variation of ${originalRecipe.title_en}`);
      
      // Award Reputation Points for Forking
      await awardPoints(user.uid, REPUTATION_POINTS.FORK_RECIPE);
      
      navigate(`/recipe/${newSlug}`);
    } catch (err) {
      console.error("Error saving variation:", err);
      alert(isBg ? 'Грешка при записване.' : 'Error saving variation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin">refresh</span></div>;
  if (!originalRecipe) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-slate-400">Recipe not found</div>;

  const updateIngredient = (index, field, value) => {
    const newIng = [...ingredients];
    newIng[index][field] = value;
    setIngredients(newIng);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateStep = (index, value) => {
    const newSteps = [...steps];
    newSteps[index][isBg ? 'instruction_bg' : 'instruction_en'] = value;
    setSteps(newSteps);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-32">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-20 bg-surface-dark/90 backdrop-blur-md border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-tight">{isBg ? 'Персонализиране' : 'Customize Recipe'}</h2>
          <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">{originalRecipe?.[isBg ? 'title_bg' : 'title_en']}</span>
        </div>
        <div className="size-10"></div>
      </div>

      {/* Basic Info */}
      <div className="px-4 py-6 space-y-4">
        <div>
          <label className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1 block">
            {isBg ? 'Име на вашата версия (BG)' : 'Your Version Title (BG)'}
          </label>
          <input 
            value={titleBg} 
            onChange={e => setTitleBg(e.target.value)}
            className="w-full bg-surface-dark border border-primary/20 rounded-xl p-3 text-slate-200 text-sm focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1 block">
            {isBg ? 'Име на вашата версия (EN)' : 'Your Version Title (EN)'}
          </label>
          <input 
            value={titleEn} 
            onChange={e => setTitleEn(e.target.value)}
            className="w-full bg-surface-dark border border-primary/20 rounded-xl p-3 text-slate-200 text-sm focus:border-primary outline-none"
          />
        </div>

        <label className="flex items-center justify-between p-4 bg-surface-dark border border-primary/20 rounded-2xl cursor-pointer hover:border-primary/40 transition-all">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100">{isBg ? 'Направи публична' : 'Make Public'}</span>
            <span className="text-[10px] text-slate-500 uppercase">{isBg ? 'Ще се вижда от другите потребители' : 'Visible to other users'}</span>
          </div>
          <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </div>
        </label>
      </div>

      {/* Ingredients List with Inline Edit */}
      <div className="px-4 py-6">
        <div className="flex flex-col mb-6">
          <h3 className="text-slate-100 text-lg font-bold leading-tight">{isBg ? 'Промени съставки' : 'Modify Ingredients'}</h3>
          <p className="text-primary/70 text-xs uppercase tracking-widest">{isBg ? 'Количества и коментари' : 'Amounts and notes'}</p>
        </div>
        <div className="space-y-3">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-surface-dark border border-primary/10 space-y-3 shadow-sm relative group">
              <button 
                onClick={() => removeIngredient(idx)}
                className="absolute -top-2 -right-2 size-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              
              <div className="flex justify-between items-center border-b border-primary/5 pb-2">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                  {isBg ? ing.ingredient_bg : ing.ingredient_en}
                </span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={ing.amount} 
                    onChange={e => updateIngredient(idx, 'amount', e.target.value)}
                    className="w-16 bg-background-dark border border-primary/20 rounded p-1 text-xs text-center text-primary font-bold outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{ing.unit_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <input 
                  value={isBg ? ing.notes_bg : ing.notes_en} 
                  onChange={e => updateIngredient(idx, isBg ? 'notes_bg' : 'notes_en', e.target.value)}
                  placeholder={isBg ? 'Бележка (напр. по-малко сол)' : 'Note (e.g. less salt)'}
                  className="w-full bg-background-dark/50 border border-primary/10 rounded-lg p-2 text-xs text-slate-300 outline-none italic"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps List */}
      <div className="px-4 py-6">
        <div className="flex flex-col mb-6">
          <h3 className="text-slate-100 text-lg font-bold leading-tight">{isBg ? 'Инструкции' : 'Instructions'}</h3>
          <p className="text-primary/70 text-xs uppercase tracking-widest">{isBg ? 'Променете стъпките' : 'Modify the process'}</p>
        </div>
        <div className="space-y-6 relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-primary/10"></div>
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-8 group">
              <div className="absolute left-0 top-1 size-6 rounded-full bg-background-dark border-2 border-primary text-primary text-[10px] flex items-center justify-center font-bold z-10">
                {idx + 1}
              </div>
              <textarea 
                value={isBg ? step.instruction_bg : step.instruction_en}
                onChange={e => updateStep(idx, e.target.value)}
                rows="2"
                className="w-full bg-surface-dark border border-primary/10 rounded-xl p-3 text-sm text-slate-200 focus:border-primary/40 outline-none resize-none"
              />
              <button 
                onClick={() => removeStep(idx)}
                className="text-[10px] text-rose-500 font-bold uppercase mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isBg ? 'Премахни стъпка' : 'Remove step'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-md mx-auto bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 z-50">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-4 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? (
             <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            <span className="text-base uppercase tracking-widest">{isBg ? 'Запази промените' : 'Save Changes'}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default RecipeCustomization;

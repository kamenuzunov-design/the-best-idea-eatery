import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../lib/activityLogger';
import { REPUTATION_POINTS } from '../lib/reputationUtils';
import { ROLES } from '../constants/roles';
import { normalizeMainGroup, getMainGroupLabel } from '../lib/recipeMetaUtils';
import { extractLocalizedNote, getLocalizedField, LANGUAGE_LABELS } from '../lib/localeUtils';

const RecipeCustomization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, awardPoints } = useAuth();
  const currentLang = i18n.language || 'bg';
  const isEnOnly = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || { fullName: currentLang.toUpperCase() };
  const localLangName = localLangMeta.fullName || currentLang.toUpperCase();
  
  const [loading, setLoading] = useState(true);
  const [originalRecipe, setOriginalRecipe] = useState(null);
  
  // Customization State
  const [titleLocal, setTitleLocal] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // basic, ingredients, steps
  const [isSaving, setIsSaving] = useState(false);

  // Aux database lists for adding/editing ingredients
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [measurements, setMeasurements] = useState([]);

  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'recipes', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOriginalRecipe(data);
          
          const srv = data.servings || 2;
          setServings(srv);

          const authorName = user.profile?.nickname || t('recipe_customization.user_default');
          const versionSuffix = t('recipe_customization.version_by', { author: authorName });
          const originalTitle = getLocalizedField(data, 'title', currentLang) || data.title_bg || data.title || '';
          const originalTitleEn = data.title_en || data.title?.en || data.title || '';
          
          setTitleLocal(`${originalTitle} (${versionSuffix})`);
          setTitleEn(`${originalTitleEn} (version by ${authorName})`);
          
          // Normalize and scale ingredients
          const normalizedIngredients = (data.ingredients || []).map((ing, idx) => {
            const rawAmount = Number(ing.amount) || Number(ing.quantity) || 0;
            const noteLocalVal = extractLocalizedNote(ing.notes?.[currentLang] || (currentLang === 'bg' ? ing.notes_bg : ''), ing.notes, currentLang);
            const noteEnVal = extractLocalizedNote(ing.notes_en, ing.notes, 'en');
            return {
              id: `ing_cust_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ingredient_id: ing.ingredient_id || ing.ingredientId || ing.id || '',
              ingredient_bg: ing.ingredient_bg || ing.name_bg || '',
              ingredient_en: ing.ingredient_en || ing.name_en || '',
              amount: Number((rawAmount * srv).toFixed(2)),
              unit_id: ing.unit_id || ing.unit || '',
              notes_local: noteLocalVal,
              notes_en: noteEnVal,
              notes_bg: ing.notes_bg || ''
            };
          });
          setIngredients(normalizedIngredients);
          
          // Normalize steps
          const normalizedSteps = (data.steps || []).map((step, idx) => {
            const stepId = `step_cust_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (typeof step === 'string') {
              return { id: stepId, instruction_local: step, instruction_en: step, instruction_bg: step, timer_minutes: 0 };
            }
            const instLocalVal = (typeof step.instruction?.[currentLang] === 'string' && step.instruction[currentLang] !== '[object Object]')
              ? step.instruction[currentLang]
              : (currentLang === 'bg' && typeof step.instruction_bg === 'string' && step.instruction_bg !== '[object Object]' ? step.instruction_bg : (step.instruction || ''));
            const instEnVal = (typeof step.instruction?.en === 'string' && step.instruction.en !== '[object Object]')
              ? step.instruction.en
              : (typeof step.instruction_en === 'string' && step.instruction_en !== '[object Object]' ? step.instruction_en : (step.instruction || ''));
            return {
              id: stepId,
              instruction_local: instLocalVal,
              instruction_en: instEnVal,
              instruction_bg: step.instruction_bg || '',
              timer_minutes: step.timer_minutes || 0
            };
          });
          setSteps(normalizedSteps);
        }
      } catch (err) {
        console.error("Error fetching recipe for customization:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id && user && user.role !== ROLES.GUEST) fetchOriginal();
    else if (!user || user.role === ROLES.GUEST) navigate('/login');
  }, [id, user, navigate, currentLang, t]);

  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const ingSnap = await getDocs(collection(db, 'ingredients'));
        setMasterIngredients(ingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const measSnap = await getDocs(collection(db, 'measurements'));
        setMeasurements(measSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching master ingredients or measurements:", err);
      }
    };
    fetchAuxData();
  }, []);

  const groupedIngredients = useMemo(() => {
    const groups = {};
    masterIngredients.forEach(ing => {
      const rawGroup = ing.classification?.main_group || '';
      const groupKey = normalizeMainGroup(rawGroup);
      const groupLabel = getMainGroupLabel(groupKey, currentLang);
      if (!groups[groupLabel]) groups[groupLabel] = [];
      groups[groupLabel].push(ing);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => {
        const nameA = getLocalizedField(a, 'name', currentLang) || a.name_en || a.name_bg || '';
        const nameB = getLocalizedField(b, 'name', currentLang) || b.name_en || b.name_bg || '';
        return nameA.localeCompare(nameB);
      });
      return acc;
    }, {});
  }, [masterIngredients, currentLang]);

  const handleServingsChange = (newServingsVal) => {
    const nextServings = parseInt(newServingsVal) || 1;
    const prevServings = parseInt(servings) || 1;
    
    if (nextServings === prevServings) {
      setServings(newServingsVal);
      return;
    }

    setIngredients(prev => prev.map(ing => {
      if (!ing.amount) return ing;
      const numAmount = parseFloat(ing.amount);
      if (isNaN(numAmount)) return ing;
      
      const scaledAmount = numAmount * (nextServings / prevServings);
      const cleanAmount = Math.round(scaledAmount * 100) / 100;
      
      return {
        ...ing,
        amount: cleanAmount
      };
    }));

    setServings(newServingsVal);
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    // Validation
    const incompleteIng = ingredients.find(i => i.ingredient_id && (!i.amount || !i.unit_id));
    if (incompleteIng) {
      const dbIng = masterIngredients.find(dbI => dbI.id === incompleteIng.ingredient_id);
      const name = getLocalizedField(dbIng, 'name', currentLang) || dbIng?.name_en || dbIng?.name_bg || t('recipe_customization.select_ingredient_placeholder');
      alert(t('recipe_customization.validation_incomplete_ingredient', { name }));
      return;
    }

    setIsSaving(true);
    
    try {
      const userNickname = user.profile?.nickname || user.uid.slice(0, 5);
      const newSlug = `${originalRecipe.slug || id}-by-${userNickname.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
      
      const normalizedIngredientsToSave = ingredients.map(i => {
        const noteLocal = (typeof i.notes_local === 'string') ? i.notes_local.trim() : (typeof i.notes_bg === 'string' ? i.notes_bg.trim() : '');
        const noteEn = (typeof i.notes_en === 'string') ? i.notes_en.trim() : '';
        const finalNoteEn = isEnOnly ? noteEn : (noteEn || noteLocal);
        const finalNoteLocal = isEnOnly ? noteEn : (noteLocal || noteEn);

        return {
          ingredient_id: i.ingredient_id,
          ingredient_bg: i.ingredient_bg || '',
          ingredient_en: i.ingredient_en || '',
          amount: Number(((parseFloat(i.amount) || 0) / (parseInt(servings) || 1)).toFixed(4)),
          unit_id: i.unit_id,
          notes: {
            en: finalNoteEn,
            [currentLang]: finalNoteLocal
          },
          notes_bg: currentLang === 'bg' ? finalNoteLocal : (i.notes_bg || finalNoteEn),
          notes_en: finalNoteEn
        };
      }).filter(i => i.ingredient_id && i.amount > 0 && i.unit_id);

      const normalizedStepsToSave = steps.map(s => {
        const instLocal = (typeof s.instruction_local === 'string') ? s.instruction_local.trim() : (typeof s.instruction_bg === 'string' ? s.instruction_bg.trim() : '');
        const instEn = (typeof s.instruction_en === 'string') ? s.instruction_en.trim() : '';
        const finalInstEn = isEnOnly ? instEn : (instEn || instLocal);
        const finalInstLocal = isEnOnly ? instEn : (instLocal || instEn);

        return {
          instruction: {
            en: finalInstEn,
            [currentLang]: finalInstLocal
          },
          instruction_bg: currentLang === 'bg' ? finalInstLocal : (s.instruction_bg || finalInstEn),
          instruction_en: finalInstEn,
          timer_minutes: s.timer_minutes ? parseInt(s.timer_minutes) : null
        };
      }).filter(s => (s.instruction?.en || s.instruction?.[currentLang] || s.instruction_bg || s.instruction_en));

      const isPowerUserOrMod = user.role === ROLES.OWNER || user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR;
      const shouldNeedModeration = isPublic && !isPowerUserOrMod;

      const finalTitleEn = isEnOnly ? titleEn.trim() : (titleEn.trim() || titleLocal.trim());
      const finalTitleLocal = isEnOnly ? titleEn.trim() : (titleLocal.trim() || titleEn.trim());

      const titleMap = {
        ...(originalRecipe.title && typeof originalRecipe.title === 'object' ? originalRecipe.title : {}),
        en: finalTitleEn,
        [currentLang]: finalTitleLocal
      };
      if (isEnOnly) {
        ['bg', 'it', 'fr', 'de'].forEach(l => {
          if (!titleMap[l]) titleMap[l] = finalTitleEn;
        });
      }

      const newRecipeData = {
        ...originalRecipe,
        title: titleMap,
        title_bg: titleMap.bg || (currentLang === 'bg' ? finalTitleLocal : finalTitleEn),
        title_en: finalTitleEn,
        slug: newSlug,
        parent_recipe_id: id,
        is_public_variation: isPublic,
        publisher_id: user.uid,
        publisher_name: userNickname,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        is_active: !shouldNeedModeration,
        status: shouldNeedModeration ? 'pending' : 'approved',
        is_deleted: false,
        ingredients: normalizedIngredientsToSave,
        steps: normalizedStepsToSave,
        servings: parseInt(servings) || 1,
        rating: 0,
        votes_count: 0,
        views_count: 0,
        ratings: []
      };

      await setDoc(doc(db, 'recipes', newSlug), newRecipeData);
      await logActivity(user.uid, user.email, 'create_recipe_variation', `Created variation of ${originalRecipe.title_en || originalRecipe.title_bg || id}`);
      
      // Award Reputation Points for Forking
      await awardPoints(user.uid, REPUTATION_POINTS.FORK_RECIPE);
      
      navigate(`/recipe/${newSlug}`);
    } catch (err) {
      console.error("Error saving variation:", err);
      alert(t('recipe_customization.error_saving'));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Dynamic Ingredients Row Actions ---
  const addIngredientRow = () => {
    const newId = `ing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setIngredients([...ingredients, { id: newId, ingredient_id: '', amount: '', unit_id: '', notes_local: '', notes_en: '', notes_bg: '' }]);
  };
  
  const removeIngredientRow = (rowId) => {
    setIngredients(ingredients.filter(ing => ing.id !== rowId));
  };
  
  const updateIngredientRow = (rowId, field, value) => {
    setIngredients(prev => prev.map(ing => ing.id === rowId ? { ...ing, [field]: value } : ing));
  };
  
  const moveIngredientRow = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === ingredients.length - 1) return;
    
    const newIngredients = [...ingredients];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedItem] = newIngredients.splice(index, 1);
    newIngredients.splice(targetIndex, 0, movedItem);
    setIngredients(newIngredients);
  };

  // --- Dynamic Steps Row Actions ---
  const addStepRow = () => {
    const newId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSteps([...steps, { id: newId, instruction_local: '', instruction_en: '', instruction_bg: '', timer_minutes: '' }]);
  };
  
  const removeStepRow = (rowId) => {
    setSteps(steps.filter(s => s.id !== rowId));
  };
  
  const updateStepRow = (rowId, field, value) => {
    setSteps(prev => prev.map(s => s.id === rowId ? { ...s, [field]: value } : s));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center text-primary">
        <span className="material-symbols-outlined animate-spin">refresh</span>
      </div>
    );
  }
  
  if (!originalRecipe) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center text-slate-400">
        {t('recipe_customization.recipe_not_found')}
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-32">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-20 bg-surface-dark/90 backdrop-blur-md border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <div className="flex flex-col items-center flex-1 mx-2">
          <h2 className="text-slate-100 text-base font-bold leading-tight tracking-tight text-center">{t('recipe_customization.title')}</h2>
          <span className="text-[9px] uppercase tracking-widest text-[#b8860b] font-semibold text-center line-clamp-1">
            {getLocalizedField(originalRecipe, 'title', currentLang) || originalRecipe?.title_bg || originalRecipe?.title_en || ''}
          </span>
        </div>
        <div className="size-10 shrink-0"></div> {/* Spacer to keep balance */}
      </div>

      <div className="mx-4 mt-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-[#b8860b]/10 border border-[#b8860b]/40 rounded-2xl p-4 shadow-lg mb-6 transition-colors">
          
          {/* Form Header */}
          <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest text-[#b8860b]">
              {t('recipe_customization.form_title')}
            </h3>
            <button type="button" onClick={() => navigate(-1)} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded">
              {t('recipe_customization.cancel_btn')}
            </button>
          </div>

          {/* Form Tabs */}
          <div className="flex gap-2 border-b border-primary/20 mb-4 overflow-x-auto hide-scrollbar">
            <button type="button" onClick={() => setActiveTab('basic')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'basic' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipe_customization.tab_basic')}</button>
            <button type="button" onClick={() => setActiveTab('ingredients')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipe_customization.tab_ingredients')}</button>
            <button type="button" onClick={() => setActiveTab('steps')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'steps' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipe_customization.tab_steps')}</button>
          </div>

          {/* TAB 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                {!isEnOnly && (
                  <div>
                    <label className="text-xs text-slate-400">{t('recipe_customization.title_local', { lang: localLangName })}</label>
                    <input 
                      value={titleLocal} 
                      onChange={e => setTitleLocal(e.target.value)} 
                      required 
                      className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" 
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400">{t('recipe_customization.title_en')}</label>
                  <input 
                    value={titleEn} 
                    onChange={e => setTitleEn(e.target.value)} 
                    required 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" 
                  />
                </div>

                <label className="flex items-center justify-between p-4 bg-surface-dark border border-primary/20 rounded-2xl cursor-pointer hover:border-primary/40 transition-all w-full">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-100">{t('recipe_customization.make_public')}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{t('recipe_customization.make_public_desc')}</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPublic} 
                      onChange={e => setIsPublic(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b8860b]"></div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Ingredients */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-slate-400">
                      {t('recipe_customization.original_servings_info', { count: originalRecipe.servings || 2 })}
                    </p>
                    <p className="text-[9px] text-primary/70 uppercase tracking-wider font-semibold">
                      {t('recipe_customization.servings_scale_tip')}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] text-primary uppercase font-bold mb-1">{t('recipe_customization.servings_label')}</label>
                    <select 
                      value={servings} 
                      onChange={(e) => handleServingsChange(e.target.value)} 
                      className="bg-surface-dark border border-primary/20 rounded px-2 py-1 text-slate-100 text-xs outline-none w-16 text-center"
                    >
                      {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={addIngredientRow} 
                  className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> {t('recipe_customization.add_ingredient_btn')}
                </button>
              </div>

              {ingredients.length === 0 && (
                <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">
                  {t('recipe_customization.no_ingredients')}
                </div>
              )}

              <div className="space-y-3">
                {ingredients.map((ing, idx) => {
                  const dbIng = masterIngredients.find(i => i.id === ing.ingredient_id);
                  const hasSpecificUnits = dbIng?.units_mapping?.length > 0;
                  const mappedUnitIds = hasSpecificUnits ? dbIng.units_mapping.map(um => um.unit_id) : null;
                  const availableUnits = hasSpecificUnits
                    ? measurements.filter(m => mappedUnitIds.includes(m.id) || mappedUnitIds.includes(m.unit_id))
                    : measurements;
                  const unitDisabled = !ing.ingredient_id || ing.ingredient_id === '';

                  return (
                    <div key={ing.id} className="bg-background-dark border border-primary/10 rounded p-2 flex flex-col gap-2 relative group">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-slate-500 w-4 font-bold shrink-0">{idx + 1}.</span>
                        
                        <select
                          value={ing.ingredient_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedDbIng = masterIngredients.find(mi => mi.id === val);
                            updateIngredientRow(ing.id, 'ingredient_id', val);
                            updateIngredientRow(ing.id, 'ingredient_bg', selectedDbIng?.name_bg || '');
                            updateIngredientRow(ing.id, 'ingredient_en', selectedDbIng?.name_en || '');
                            updateIngredientRow(ing.id, 'unit_id', '');
                          }}
                          className="w-32 sm:w-36 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-[11px] shrink-0 outline-none"
                        >
                          <option value="">-- {t('recipe_customization.select_ingredient_placeholder')} --</option>
                          {Object.entries(groupedIngredients).map(([groupName, ings]) => (
                            <optgroup key={groupName} label={`- ${groupName.toUpperCase()}`}>
                              {ings.map(i => (
                                <option key={i.id} value={i.id}>
                                  {getLocalizedField(i, 'name', currentLang) || i.name_en || i.name_bg || i.id}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.1"
                          value={ing.amount}
                          onChange={(e) => updateIngredientRow(ing.id, 'amount', e.target.value)}
                          placeholder={t('recipe_customization.qty_placeholder')}
                          className="w-12 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-[11px] text-center shrink-0 outline-none"
                        />

                        <select
                          value={ing.unit_id}
                          onChange={(e) => updateIngredientRow(ing.id, 'unit_id', e.target.value)}
                          disabled={unitDisabled}
                          title={unitDisabled ? t('recipe_customization.select_ingredient_first') : ''}
                          className={`w-20 sm:w-24 bg-surface-dark border rounded p-1.5 text-[11px] transition-colors shrink-0 outline-none ${
                            unitDisabled
                              ? 'border-primary/10 text-slate-600 cursor-not-allowed opacity-50'
                              : mappedUnitIds
                                ? 'border-[#b8860b]/40 text-slate-100'
                                : 'border-primary/20 text-slate-100'
                          }`}
                        >
                          <option value="">-- {t('recipe_customization.select_unit_placeholder')} --</option>
                          {availableUnits.map(m => (
                            <option key={m.id} value={m.id}>
                              {getLocalizedField(m, 'name', currentLang) || m.name_en || m.name_bg || m.id}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeIngredientRow(ing.id)}
                          title={t('recipe_customization.delete_btn')}
                          className="p-1 text-slate-500 hover:text-rose-500 transition-colors shrink-0 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>

                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col items-center shrink-0 w-4 -space-y-1.5">
                          <button
                            type="button"
                            onClick={() => moveIngredientRow(idx, 'up')}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                            title={t('recipe_customization.move_up')}
                          >
                            <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveIngredientRow(idx, 'down')}
                            disabled={idx === ingredients.length - 1}
                            className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                            title={t('recipe_customization.move_down')}
                          >
                            <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_down</span>
                          </button>
                        </div>

                        <div className={`grid ${isEnOnly ? 'grid-cols-1' : 'grid-cols-2'} gap-2 flex-grow`}>
                          {!isEnOnly && (
                            <input
                              type="text"
                              value={typeof ing.notes_local === 'string' && ing.notes_local !== '[object Object]' ? ing.notes_local : (typeof ing.notes_bg === 'string' && currentLang === 'bg' ? ing.notes_bg : '')}
                              onChange={(e) => {
                                updateIngredientRow(ing.id, 'notes_local', e.target.value);
                                if (currentLang === 'bg') {
                                  updateIngredientRow(ing.id, 'notes_bg', e.target.value);
                                }
                              }}
                              placeholder={t('recipe_customization.notes_local_placeholder', { lang: localLangName })}
                              className="bg-surface-dark/50 border border-primary/10 rounded p-1.5 text-slate-300 text-[10px] outline-none"
                            />
                          )}
                          <input
                            type="text"
                            value={typeof ing.notes_en === 'string' && ing.notes_en !== '[object Object]' ? ing.notes_en : ''}
                            onChange={(e) => updateIngredientRow(ing.id, 'notes_en', e.target.value)}
                            placeholder={t('recipe_customization.notes_en_placeholder')}
                            className="bg-surface-dark/50 border border-primary/10 rounded p-1.5 text-slate-300 text-[10px] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Steps */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400">{t('recipe_customization.steps_info')}</p>
                <button 
                  type="button" 
                  onClick={addStepRow} 
                  className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> {t('recipe_customization.add_step_btn')}
                </button>
              </div>

              {steps.length === 0 && (
                <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">
                  {t('recipe_customization.no_steps')}
                </div>
              )}

              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="bg-background-dark border border-primary/10 rounded p-3 relative flex flex-col gap-2 group">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-[#b8860b] uppercase tracking-widest">{t('recipe_customization.step_label', { step: idx + 1 })}</span>
                        
                        <div className="flex items-center gap-1 bg-surface-dark border border-primary/10 rounded px-2 py-0.5">
                          <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                          <input 
                            type="number" 
                            value={step.timer_minutes || ''} 
                            onChange={(e) => updateStepRow(step.id, 'timer_minutes', e.target.value)}
                            placeholder={t('recipe_customization.min_placeholder')}
                            className="w-10 bg-transparent text-[11px] text-slate-100 outline-none text-center"
                          />
                          <span className="text-[9px] text-slate-500 uppercase font-bold">{t('recipe_customization.min_suffix')}</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeStepRow(step.id)} 
                        title={t('recipe_customization.delete_btn')}
                        className="text-rose-500/50 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-500/10"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {!isEnOnly && (
                        <textarea 
                          value={step.instruction_local || (currentLang === 'bg' ? step.instruction_bg : '') || ''} 
                          onChange={(e) => {
                            updateStepRow(step.id, 'instruction_local', e.target.value);
                            if (currentLang === 'bg') {
                              updateStepRow(step.id, 'instruction_bg', e.target.value);
                            }
                          }} 
                          placeholder={t('recipe_customization.instruction_local_placeholder', { lang: localLangName })} 
                          rows="2" 
                          className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                        ></textarea>
                      )}
                      <textarea 
                        value={step.instruction_en || ''} 
                        onChange={(e) => updateStepRow(step.id, 'instruction_en', e.target.value)} 
                        placeholder={t('recipe_customization.instruction_en_placeholder')} 
                        rows="2" 
                        className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSaving} 
            className="w-full font-bold py-3 rounded-lg transition-colors border mt-4 flex justify-center items-center gap-2 bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                {t('recipe_customization.saving')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                {t('recipe_customization.save_changes')}
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default RecipeCustomization;

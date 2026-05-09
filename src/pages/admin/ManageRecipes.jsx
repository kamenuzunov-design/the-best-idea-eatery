import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { CUISINES } from '../../data/cuisines';

const ManageRecipes = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [recipes, setRecipes] = useState([]);
  const [ingredientsList, setIngredientsList] = useState([]);
  const [measurementsList, setMeasurementsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic'); // basic, media, ingredients, steps

  // Basic Info
  const [titleBg, setTitleBg] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [descBg, setDescBg] = useState('');
  const [descEn, setDescEn] = useState('');
  const [cuisineId, setCuisineId] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('medium');

  // Media & Sources
  const [videoUrl, setVideoUrl] = useState('');
  const [originalAuthor, setOriginalAuthor] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  
  // Image files (for upload) and URLs (for preview/existing)
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [extra1File, setExtra1File] = useState(null);
  const [extra1Url, setExtra1Url] = useState('');
  const [extra2File, setExtra2File] = useState(null);
  const [extra2Url, setExtra2Url] = useState('');

  // Dynamic Lists
  const [recipeIngredients, setRecipeIngredients] = useState([]); // {id, ingredient_id, amount, unit_id, notes}
  const [recipeSteps, setRecipeSteps] = useState([]); // {id, instruction_bg, instruction_en}

  useEffect(() => {
    const unsubRecipes = onSnapshot(query(collection(db, 'recipes')), (snapshot) => {
      setRecipes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubIng = onSnapshot(query(collection(db, 'ingredients')), (snapshot) => {
      setIngredientsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMeas = onSnapshot(query(collection(db, 'measurements')), (snapshot) => {
      setMeasurementsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubRecipes(); unsubIng(); unsubMeas(); };
  }, []);

  const calculatedCalories = React.useMemo(() => {
    let totalCalories = 0;
    recipeIngredients.forEach(ing => {
      const dbIng = ingredientsList.find(i => i.id === ing.ingredient_id);
      if (dbIng && dbIng.nutrition_per_100 && ing.amount && ing.unit_id) {
        let weightGrams = 0;
        const mapping = dbIng.units_mapping?.find(m => m.unit_id === ing.unit_id);
        if (mapping && mapping.weight_grams) {
          weightGrams = parseFloat(mapping.weight_grams) * parseFloat(ing.amount);
        } else {
          const unitObj = measurementsList.find(m => m.id === ing.unit_id);
          if (unitObj && (unitObj.unit_id === 'g' || unitObj.unit_id === 'ml' || unitObj.base_unit === 'g' || unitObj.base_unit === 'ml')) {
            weightGrams = parseFloat(ing.amount);
          } else if (ing.unit_id === 'g' || ing.unit_id === 'ml') {
            weightGrams = parseFloat(ing.amount);
          }
        }
        if (weightGrams > 0) {
          totalCalories += (parseFloat(dbIng.nutrition_per_100.calories) / 100) * weightGrams;
        }
      }
    });
    const srv = parseInt(servings) || 1;
    return Math.round(totalCalories / srv);
  }, [recipeIngredients, ingredientsList, measurementsList, servings]);

  const handleTitleEnChange = (e) => {
    const val = e.target.value;
    setTitleEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  // --- Dynamic Ingredients ---
  const addIngredientRow = () => {
    setRecipeIngredients([...recipeIngredients, { id: Date.now(), ingredient_id: '', amount: '', unit_id: '', notes: '' }]);
  };
  const removeIngredientRow = (id) => {
    setRecipeIngredients(recipeIngredients.filter(ing => ing.id !== id));
  };
  const updateIngredientRow = (id, field, value) => {
    setRecipeIngredients(recipeIngredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  // --- Dynamic Steps ---
  const addStepRow = () => {
    setRecipeSteps([...recipeSteps, { id: Date.now(), instruction_bg: '', instruction_en: '' }]);
  };
  const removeStepRow = (id) => {
    setRecipeSteps(recipeSteps.filter(s => s.id !== id));
  };
  const updateStepRow = (id, field, value) => {
    setRecipeSteps(recipeSteps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // --- Image Upload ---
  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (type === 'main') {
      setMainImageFile(file);
      setMainImageUrl(URL.createObjectURL(file));
    } else if (type === 'extra1') {
      setExtra1File(file);
      setExtra1Url(URL.createObjectURL(file));
    } else if (type === 'extra2') {
      setExtra2File(file);
      setExtra2Url(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file, path) => {
    if (!file) return null;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!titleBg || !titleEn || !slug) return;

    try {
      // 1. Upload Images if new files exist
      let mUrl = mainImageUrl;
      let e1Url = extra1Url;
      let e2Url = extra2Url;

      if (mainImageFile) mUrl = await uploadImage(mainImageFile, `recipes/${slug}/main_${Date.now()}`);
      if (extra1File) e1Url = await uploadImage(extra1File, `recipes/${slug}/extra1_${Date.now()}`);
      if (extra2File) e2Url = await uploadImage(extra2File, `recipes/${slug}/extra2_${Date.now()}`);

      // 2. Prepare Data
      const recipeData = {
        title_bg: titleBg,
        title_en: titleEn,
        slug: slug,
        description_bg: descBg,
        description_en: descEn,
        description_en: descEn,
        cuisine_id: cuisineId,
        prep_time: parseInt(prepTime) || 0,
        cook_time: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 0,
        difficulty: difficulty,
        calories_per_serving: calculatedCalories,
        video_url: videoUrl,
        original_author: originalAuthor,
        source_link: sourceLink,
        images: {
          main: mUrl,
          extra1: e1Url,
          extra2: e2Url
        },
        ingredients: recipeIngredients.map(i => ({
          ingredient_id: i.ingredient_id,
          amount: parseFloat(i.amount) || 0,
          unit_id: i.unit_id,
          notes: i.notes || ''
        })).filter(i => i.ingredient_id && i.amount && i.unit_id),
        steps: recipeSteps.map(s => ({
          instruction_bg: s.instruction_bg,
          instruction_en: s.instruction_en
        })).filter(s => s.instruction_bg || s.instruction_en),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'recipes', editingId), recipeData);
        await logActivity(user.uid, user.email, 'edit_recipe', `Edited recipe: ${titleEn}`);
      } else {
        recipeData.createdAt = new Date().toISOString();
        recipeData.publish_date = new Date().toISOString();
        recipeData.publisher_id = user.uid;
        recipeData.publisher_name = user.displayName || user.email;
        recipeData.views_count = 0;
        recipeData.reviews_count = 0;
        recipeData.rating = 0;
        recipeData.is_active = true;
        recipeData.is_deleted = false;

        await setDoc(doc(db, 'recipes', slug), recipeData);
        await logActivity(user.uid, user.email, 'add_recipe', `Added recipe: ${titleEn}`);
      }

      handleCancelEdit();
    } catch (error) {
      console.error("Error saving recipe:", error);
      alert(isBg ? 'Грешка при запазване: ' + error.message : 'Error saving: ' + error.message);
    }
  };

  const handleEditClick = (recipe) => {
    setEditingId(recipe.id);
    setTitleBg(recipe.title_bg || '');
    setTitleEn(recipe.title_en || '');
    setSlug(recipe.slug || recipe.id);
    setDescBg(recipe.description_bg || '');
    setDescEn(recipe.description_en || '');
    setDescEn(recipe.description_en || '');
    setCuisineId(recipe.cuisine_id || '');
    setPrepTime(recipe.prep_time || '');
    setCookTime(recipe.cook_time || '');
    setServings(recipe.servings || '');
    setDifficulty(recipe.difficulty || 'medium');
    setVideoUrl(recipe.video_url || '');
    setOriginalAuthor(recipe.original_author || '');
    setSourceLink(recipe.source_link || '');
    
    setMainImageUrl(recipe.images?.main || '');
    setExtra1Url(recipe.images?.extra1 || '');
    setExtra2Url(recipe.images?.extra2 || '');
    setMainImageFile(null);
    setExtra1File(null);
    setExtra2File(null);

    setRecipeIngredients(recipe.ingredients ? recipe.ingredients.map((i, idx) => ({ ...i, id: Date.now() + idx })) : []);
    setRecipeSteps(recipe.steps ? recipe.steps.map((s, idx) => ({ ...s, id: Date.now() + idx })) : []);

    setActiveTab('basic');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitleBg(''); setTitleEn(''); setSlug('');
    setDescBg(''); setDescEn('');
    setCuisineId('');
    setPrepTime(''); setCookTime(''); setServings('');
    setDifficulty('medium');
    setVideoUrl(''); setOriginalAuthor(''); setSourceLink('');
    setMainImageUrl(''); setExtra1Url(''); setExtra2Url('');
    setMainImageFile(null); setExtra1File(null); setExtra2File(null);
    setRecipeIngredients([]); setRecipeSteps([]);
    setActiveTab('basic');
    setShowForm(false);
  };

  const handleToggleActive = async (targetId, targetName, currentActiveStatus) => {
    const actionName = currentActiveStatus ? (isBg ? 'деактивирате' : 'deactivate') : (isBg ? 'активирате' : 'activate');
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да ${actionName} ${targetName}?` : `Are you sure you want to ${actionName} ${targetName}?`)) return;

    try {
      await updateDoc(doc(db, 'recipes', targetId), { 'is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'recipe_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} recipe ${targetName}`);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (targetId, targetName) => {
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да изтриете ${targetName}?` : `Are you sure you want to delete ${targetName}?`)) return;
    try {
      await updateDoc(doc(db, 'recipes', targetId), { 'is_deleted': true, 'is_active': false });
      await logActivity(user.uid, user.email, 'delete_recipe', `Deleted recipe: ${targetName}`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handleRestore = async (targetId, targetName) => {
    try {
      await updateDoc(doc(db, 'recipes', targetId), { 'is_deleted': false, 'is_active': true });
      await logActivity(user.uid, user.email, 'restore_recipe', `Restored recipe: ${targetName}`);
    } catch (error) {
      console.error("Error restoring recipe:", error);
    }
  };

  const filteredRecipes = recipes.filter(r => {
    const isDeleted = r.is_deleted === true;
    const isActive = r.is_active !== false && !isDeleted;
    const isDeactivated = r.is_active === false && !isDeleted;
    
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'deactivated' && !isDeactivated) return false;
    if (statusFilter === 'deleted' && !isDeleted) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!(r.title_bg?.toLowerCase() || '').includes(term) && !(r.title_en?.toLowerCase() || '').includes(term)) {
        return false;
      }
    }
    return true;
  });

  const renderManageButtons = (r, isActive, rName) => {
    if (statusFilter === 'deleted') {
      return (
        <button onClick={() => handleRestore(r.id, rName)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
          {isBg ? 'Възстанови' : 'Restore'}
        </button>
      );
    }
    return (
      <div className="flex gap-1">
        <button onClick={() => handleEditClick(r)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg">
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
        <button onClick={() => handleToggleActive(r.id, rName, isActive)} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-background-dark/50 text-amber-500 hover:bg-amber-500/20' : 'bg-background-dark/50 text-emerald-500 hover:bg-emerald-500/20'}`}>
          <span className="material-symbols-outlined text-[16px]">{isActive ? 'power_settings_new' : 'play_arrow'}</span>
        </button>
        <button onClick={() => handleDelete(r.id, rName)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg">
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Рецепти' : 'Recipes'}</h1>
              <p className="text-xs font-medium text-primary/70">{recipes.length} {isBg ? 'общо' : 'total'}</p>
            </div>
          </div>
          <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">view_list</span></button>
          </div>
        </div>

        <div className="flex gap-2 text-xs font-bold overflow-x-auto hide-scrollbar pb-1">
          <button onClick={() => setStatusFilter('active')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'active' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-primary/30 hover:bg-primary/10'}`}>{isBg ? 'Активни' : 'Active'}</button>
          <button onClick={() => setStatusFilter('deactivated')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}>{isBg ? 'Деактивирани' : 'Deactivated'}</button>
          <button onClick={() => setStatusFilter('deleted')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}>{isBg ? 'Изтрити' : 'Deleted'}</button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {!showForm && !editingId ? (
          <button onClick={() => setShowForm(true)} className="w-full border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 p-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors mb-6">
            <span className="material-symbols-outlined">add</span>
            {isBg ? 'Добави Рецепта' : 'Add Recipe'}
          </button>
        ) : (
        <form onSubmit={handleSaveRecipe} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 transition-colors ${editingId ? 'bg-[#b8860b]/10 border-[#b8860b]/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest text-[#b8860b]">
              {editingId ? (isBg ? 'Редакция на рецепта' : 'Edit Recipe') : (isBg ? 'Нова рецепта' : 'New Recipe')}
            </h3>
            <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded">
              {isBg ? 'Отказ' : 'Cancel'}
            </button>
          </div>

          <div className="flex gap-2 border-b border-primary/20 mb-4 overflow-x-auto hide-scrollbar">
            <button type="button" onClick={() => setActiveTab('basic')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'basic' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{isBg ? 'Основна' : 'Basic'}</button>
            <button type="button" onClick={() => setActiveTab('media')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'media' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{isBg ? 'Медия' : 'Media'}</button>
            <button type="button" onClick={() => setActiveTab('ingredients')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{isBg ? 'Съставки' : 'Ingredients'}</button>
            <button type="button" onClick={() => setActiveTab('steps')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'steps' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{isBg ? 'Стъпки' : 'Steps'}</button>
          </div>

          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">{isBg ? 'Заглавие (EN) *' : 'Title (EN) *'}</label>
                  <input value={titleEn} onChange={handleTitleEnChange} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">{isBg ? 'Заглавие (BG) *' : 'Title (BG) *'}</label>
                  <input value={titleBg} onChange={(e) => setTitleBg(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400">{isBg ? 'Slug (ID) *' : 'Slug (ID) *'}</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!editingId} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-slate-400">{isBg ? 'Описание (EN)' : 'Description (EN)'}</label>
                  <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows="2" className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none resize-none"></textarea>
                </div>
                <div>
                  <label className="text-xs text-slate-400">{isBg ? 'Описание (BG)' : 'Description (BG)'}</label>
                  <textarea value={descBg} onChange={(e) => setDescBg(e.target.value)} rows="2" className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none resize-none"></textarea>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Кухня' : 'Cuisine'}</label>
                  <select value={cuisineId} onChange={(e) => setCuisineId(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none">
                    <option value="">-- {isBg ? 'Избери Кухня' : 'Select Cuisine'} --</option>
                    {CUISINES.map(c => (
                      <option key={c.id} value={c.id}>{isBg ? c.name.bg : c.name.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Подготовка (мин)' : 'Prep (min)'}</label>
                  <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Готвене (мин)' : 'Cook (min)'}</label>
                  <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Порции' : 'Servings'}</label>
                  <select value={servings} onChange={(e) => setServings(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none text-center">
                    <option value="">--</option>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Трудност' : 'Difficulty'}</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none">
                  <option value="easy">{isBg ? 'Лесно' : 'Easy'}</option>
                  <option value="medium">{isBg ? 'Средно' : 'Medium'}</option>
                  <option value="hard">{isBg ? 'Сложно' : 'Hard'}</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {/* Main Image */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase text-center font-bold text-[#b8860b]">{isBg ? 'Основна Снимка' : 'Main Image'}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative group">
                    {mainImageUrl ? <img src={mainImageUrl} alt="Main" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-3xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'main')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                {/* Extra 1 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase text-center">{isBg ? 'Доп. Снимка 1' : 'Extra Image 1'}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {extra1Url ? <img src={extra1Url} alt="Extra 1" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'extra1')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                {/* Extra 2 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase text-center">{isBg ? 'Доп. Снимка 2' : 'Extra Image 2'}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {extra2Url ? <img src={extra2Url} alt="Extra 2" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'extra2')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Видео Линк (YouTube/Vimeo)' : 'Video URL'}</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} type="url" className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-primary/10 pt-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Автор на Рецептата' : 'Original Author'}</label>
                  <input value={originalAuthor} onChange={(e) => setOriginalAuthor(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Gordon Ramsay" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Източник (Линк)' : 'Source Link'}</label>
                  <input value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} type="url" className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-xs text-slate-400">{isBg ? 'Добавете съставките за рецептата.' : 'Add recipe ingredients.'}</p>
                  <div className="text-[10px] text-amber-500 font-bold mt-1">
                    {isBg ? 'Изчислени калории (1 порция): ' : 'Calculated calories (per serving): '}
                    {calculatedCalories} kcal
                  </div>
                </div>
                <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> {isBg ? 'Добави' : 'Add'}
                </button>
              </div>
              {recipeIngredients.length === 0 && <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">{isBg ? 'Няма добавени съставки' : 'No ingredients added'}</div>}
              {recipeIngredients.map((ing, idx) => (
                <div key={ing.id} className="bg-background-dark border border-primary/10 rounded p-2 flex flex-col gap-2 relative group">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500 w-4 font-bold">{idx + 1}.</span>
                    <select value={ing.ingredient_id} onChange={(e) => updateIngredientRow(ing.id, 'ingredient_id', e.target.value)} className="flex-1 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-xs">
                      <option value="">-- {isBg ? 'Продукт' : 'Ingredient'} --</option>
                      {ingredientsList.map(i => <option key={i.id} value={i.id}>{isBg ? i.name_bg : i.name_en}</option>)}
                    </select>
                    <input type="number" step="0.1" value={ing.amount} onChange={(e) => updateIngredientRow(ing.id, 'amount', e.target.value)} placeholder="Qty" className="w-16 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-xs text-center" />
                    <select value={ing.unit_id} onChange={(e) => updateIngredientRow(ing.id, 'unit_id', e.target.value)} className="w-24 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-xs">
                      <option value="">-- {isBg ? 'Мярка' : 'Unit'} --</option>
                      {measurementsList.map(m => <option key={m.id} value={m.id}>{isBg ? m.name_bg : m.name_en}</option>)}
                    </select>
                    <button type="button" onClick={() => removeIngredientRow(ing.id)} className="p-1 text-slate-500 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                  </div>
                  <input type="text" value={ing.notes} onChange={(e) => updateIngredientRow(ing.id, 'notes', e.target.value)} placeholder={isBg ? "Бележки (напр. 'нарязан на ситно')" : "Notes (e.g. 'finely chopped')"} className="ml-6 w-[calc(100%-1.5rem)] bg-surface-dark/50 border border-primary/10 rounded p-1.5 text-slate-300 text-[10px]" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400">{isBg ? 'Въведете стъпките за приготвяне.' : 'Enter cooking steps.'}</p>
                <button type="button" onClick={addStepRow} className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> {isBg ? 'Добави' : 'Add'}
                </button>
              </div>
              {recipeSteps.length === 0 && <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">{isBg ? 'Няма въведени стъпки' : 'No steps added'}</div>}
              {recipeSteps.map((step, idx) => (
                <div key={step.id} className="bg-background-dark border border-primary/10 rounded p-2 relative flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-[#b8860b] uppercase">{isBg ? 'Стъпка' : 'Step'} {idx + 1}</span>
                    <button type="button" onClick={() => removeStepRow(step.id)} className="text-rose-500 hover:text-rose-400 transition-colors"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                  </div>
                  <textarea value={step.instruction_bg} onChange={(e) => updateStepRow(step.id, 'instruction_bg', e.target.value)} placeholder={isBg ? 'Описание на български...' : 'Description in BG...'} rows="2" className="w-full bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b]"></textarea>
                  <textarea value={step.instruction_en} onChange={(e) => updateStepRow(step.id, 'instruction_en', e.target.value)} placeholder={isBg ? 'Описание на английски...' : 'Description in EN...'} rows="2" className="w-full bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b]"></textarea>
                </div>
              ))}
            </div>
          )}
          
          <button type="submit" className={`w-full font-bold py-3 rounded-lg transition-colors border mt-4 flex justify-center items-center gap-2 ${editingId ? 'bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? (isBg ? 'Запази промените' : 'Save Changes') : (isBg ? 'Запиши рецепта' : 'Save Recipe')}
          </button>
        </form>
        )}

        <div className="mb-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={isBg ? 'Търси рецепта...' : 'Search recipe...'} className="w-full bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-[#b8860b]" />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary"><span className="material-symbols-outlined animate-spin text-4xl">refresh</span></div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
               <span className="material-symbols-outlined text-4xl opacity-50 mb-2">search_off</span>
               <p>{isBg ? 'Няма намерени рецепти' : 'No recipes found'}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredRecipes.map(r => {
                const isActive = r.is_active !== false;
                const isDeleted = r.is_deleted === true;
                const rName = isBg ? r.title_bg : r.title_en;
                const placeholderImg = "https://images.unsplash.com/photo-1495195134817-a169d0d346dc?auto=format&fit=crop&q=80&w=200";

                return (
                  <div key={r.id} className={`bg-surface-dark/50 border rounded-xl overflow-hidden flex flex-col group transition-colors ${isDeleted ? 'border-rose-500/30 opacity-60' : !isActive ? 'border-amber-500/30 opacity-75' : 'border-primary/10 hover:border-[#b8860b]/30'}`}>
                    <div className="h-24 w-full relative">
                      <img src={r.images?.main || placeholderImg} alt={rName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background-dark to-transparent"></div>
                      {!isActive && !isDeleted && <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-background-dark text-[10px] font-bold rounded-full">INACTIVE</div>}
                    </div>
                    <div className="p-3 flex justify-between items-center -mt-6 relative z-10">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 onClick={() => handleEditClick(r)} className="font-bold text-slate-100 truncate hover:text-[#b8860b] cursor-pointer drop-shadow-md text-sm">{rName}</h4>
                        <div className="flex gap-2 text-[10px] text-slate-400 mt-1 items-center">
                          <span className="flex items-center"><span className="material-symbols-outlined text-[12px] mr-0.5">schedule</span>{r.prep_time + r.cook_time}m</span>
                          <span className="flex items-center text-[#b8860b]"><span className="material-symbols-outlined text-[12px] mr-0.5 text-amber-500">star</span>{r.rating || 0}</span>
                          <span className="flex items-center"><span className="material-symbols-outlined text-[12px] mr-0.5">visibility</span>{r.views_count || 0}</span>
                        </div>
                      </div>
                      <div className="shrink-0 bg-background-dark/80 backdrop-blur-md rounded-lg p-1 border border-primary/20">
                        {renderManageButtons(r, isActive, rName)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-surface-dark/50 border border-primary/10 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-[10px] text-slate-400 uppercase bg-background-dark border-b border-primary/20">
                    <tr>
                      <th className="px-3 py-2">{isBg ? 'Снимка' : 'Image'}</th>
                      <th className="px-3 py-2">{isBg ? 'Заглавие' : 'Title'}</th>
                      <th className="px-3 py-2 text-center">{isBg ? 'Статс' : 'Stats'}</th>
                      <th className="px-3 py-2 text-right">{isBg ? 'Управление' : 'Manage'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipes.map(r => {
                      const isActive = r.is_active !== false;
                      const isDeleted = r.is_deleted === true;
                      const rName = isBg ? r.title_bg : r.title_en;
                      const placeholderImg = "https://images.unsplash.com/photo-1495195134817-a169d0d346dc?auto=format&fit=crop&q=80&w=100";

                      return (
                        <tr key={r.id} className={`border-b border-primary/5 hover:bg-[#b8860b]/5 transition-colors ${isDeleted ? 'opacity-60' : !isActive ? 'opacity-75' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="size-8 rounded overflow-hidden">
                              <img src={r.images?.main || placeholderImg} className="w-full h-full object-cover" alt="r" />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => handleEditClick(r)} className="font-bold text-slate-200 hover:text-[#b8860b] transition-colors text-left text-[12px] flex items-center gap-1 line-clamp-2">
                              {!isActive && !isDeleted && <span className="size-1.5 shrink-0 bg-amber-500 rounded-full inline-block"></span>}
                              {rName}
                            </button>
                            <div className="text-[10px] text-slate-500">{r.cuisine_bg || r.cuisine_en || '-'}</div>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1 text-[#b8860b]"><span className="material-symbols-outlined text-[12px]">star</span>{r.rating || 0}</div>
                            <div className="text-slate-500">{r.views_count || 0} v</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              {renderManageButtons(r, isActive, rName)}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageRecipes;

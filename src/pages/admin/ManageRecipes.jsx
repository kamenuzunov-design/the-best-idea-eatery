import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { resizeImage } from '../../lib/imageUtils';
import { logActivity } from '../../lib/activityLogger';
import { archiveVersion } from '../../lib/archiveUtils';
import { checkImageSafety } from '../../lib/moderationUtils';
import { CUISINES } from '../../data/cuisines';
import { ROLES } from '../../constants/roles';
import { getRootCategories, getSubCategories } from '../../data/recipe_categories';
import { REPUTATION_POINTS } from '../../lib/reputationUtils';

const ManageRecipes = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, isOwner, awardPoints } = useAuth();
  const isBg = i18n.language === 'bg';
  const isPowerUser = isAdmin || isOwner;

  const csvImportRef = useRef(null);
  const [csvStatus, setCsvStatus] = useState(''); // '' | 'parsing' | 'saving' | 'done' | 'error'
  const [csvPreview, setCsvPreview] = useState(null); // { newRows, duplicateRows } | null

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
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('1');
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

  const groupedIngredients = React.useMemo(() => {
    const groups = {};
    ingredientsList.forEach(ing => {
      const groupName = ing.classification?.main_group || (isBg ? 'Други' : 'Other');
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(ing);
    });
    // Sort group names
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => 
        (isBg ? a.name_bg : a.name_en).localeCompare(isBg ? b.name_bg : b.name_en)
      );
      return acc;
    }, {});
  }, [ingredientsList, isBg]);

  const handleTitleEnChange = (e) => {
    const val = e.target.value;
    setTitleEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  // --- Dynamic Ingredients ---
  const addIngredientRow = () => {
    const newId = `ing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRecipeIngredients([...recipeIngredients, { id: newId, ingredient_id: '', amount: '', unit_id: '', notes_bg: '', notes_en: '' }]);
  };
  const removeIngredientRow = (id) => {
    setRecipeIngredients(recipeIngredients.filter(ing => ing.id !== id));
  };
  const updateIngredientRow = (id, field, value) => {
    setRecipeIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };
  const moveIngredientRow = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === recipeIngredients.length - 1) return;
    
    const newIngredients = [...recipeIngredients];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const [movedItem] = newIngredients.splice(index, 1);
    newIngredients.splice(targetIndex, 0, movedItem);
    setRecipeIngredients(newIngredients);
  };

  // --- Dynamic Steps ---
  const addStepRow = () => {
    const newId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRecipeSteps([...recipeSteps, { id: newId, instruction_bg: '', instruction_en: '', timer_minutes: '' }]);
  };
  const removeStepRow = (id) => {
    setRecipeSteps(recipeSteps.filter(s => s.id !== id));
  };
  const updateStepRow = (id, field, value) => {
    setRecipeSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
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
    const resizedImage = await resizeImage(file, 800);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, resizedImage);
    return await getDownloadURL(storageRef);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!titleBg || !titleEn || !slug) return;

    try {
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      // 1. AI Safety Check for new images (Skip for Admins to save resources)
      const isPowerUser = user?.status?.level === ROLES.ADMIN || user?.status?.level === ROLES.OWNER;
      
      if (!isPowerUser) {
        const newFiles = [
          { file: mainImageFile, label: isBg ? 'Основна снимка' : 'Main Image' },
          { file: extra1File, label: isBg ? 'Допълнителна 1' : 'Extra 1' },
          { file: extra2File, label: isBg ? 'Допълнителна 2' : 'Extra 2' }
        ].filter(item => item.file);

        for (const item of newFiles) {
          const b64 = await fileToBase64(item.file);
          const safety = await checkImageSafety(b64);
          if (!safety.safe) {
            alert(isBg 
              ? `Снимката "${item.label}" бе отхвърлена от AI филтъра (Причина: ${safety.reason}). Моля качете друго изображение.` 
              : `Image "${item.label}" was rejected by AI filter (Reason: ${safety.reason}). Please upload another image.`);
            return; // Stop saving
          }
        }
      }

      // 2. Upload Images if new files exist
      let mUrl = mainImageUrl;
      let e1Url = extra1Url;
      let e2Url = extra2Url;

      if (mainImageFile) mUrl = await uploadImage(mainImageFile, `recipes/${slug}/main_${timestamp}`);
      if (extra1File) e1Url = await uploadImage(extra1File, `recipes/${slug}/extra1_${timestamp}`);
      if (extra2File) e2Url = await uploadImage(extra2File, `recipes/${slug}/extra2_${timestamp}`);

      // 1.5 Validation for incomplete ingredients
      const incompleteIng = recipeIngredients.find(i => i.ingredient_id && (!i.amount || !i.unit_id));
      if (incompleteIng) {
        const dbIng = ingredientsList.find(dbI => dbI.id === incompleteIng.ingredient_id);
        const name = isBg ? (dbIng?.name_bg || 'Продукт') : (dbIng?.name_en || 'Ingredient');
        alert(isBg 
          ? `Моля попълнете количество и мерна единица за "${name}".` 
          : `Please provide quantity and unit for "${name}".`);
        return;
      }

      // 2. Prepare Data
      const recipeData = {
        title_bg: titleBg,
        title_en: titleEn,
        slug: slug,
        description_bg: descBg,
        description_en: descEn,
        cuisine_id: cuisineId,
        prep_time: parseInt(prepTime) || 0,
        cook_time: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 1,
        difficulty: difficulty,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        calories_per_serving: calculatedCalories,
        video_url: videoUrl,
        original_author: originalAuthor,
        source_link: sourceLink,
        images: {
          main: mUrl,
          extra1: e1Url,
          extra2: e2Url
        },
        ingredients: recipeIngredients.map(i => {
          const dbIng = ingredientsList.find(dbI => dbI.id === i.ingredient_id);
          return {
            ingredient_id: i.ingredient_id,
            ingredient_bg: dbIng?.name_bg || '',
            ingredient_en: dbIng?.name_en || '',
            amount: (parseFloat(i.amount) || 0) / (parseInt(servings) || 1),
            unit_id: i.unit_id,
            notes_bg: i.notes_bg || i.notes || '',
            notes_en: i.notes_en || i.notes || ''
          };
        }).filter(i => i.ingredient_id && i.amount && i.unit_id),
        steps: recipeSteps.map(s => ({
          instruction_bg: s.instruction_bg,
          instruction_en: s.instruction_en,
          timer_minutes: parseInt(s.timer_minutes) || null
        })).filter(s => s.instruction_bg || s.instruction_en),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        // Archive before update
        await archiveVersion('recipes', editingId, user.uid, user.email, 'UPDATE');
        
        if (user.role === ROLES.USER) {
          recipeData.is_active = false;
          recipeData.status = 'pending';
        }
        
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
        
        const isPowerUserOrMod = user.role === ROLES.OWNER || user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR;
        recipeData.is_active = isPowerUserOrMod;
        recipeData.status = isPowerUserOrMod ? 'approved' : 'pending';
        recipeData.is_deleted = false;

        await setDoc(doc(db, 'recipes', slug), recipeData);
        await logActivity(user.uid, user.email, 'add_recipe', `Added recipe: ${titleEn}`);
        
        // Award Reputation Points for Publishing
        await awardPoints(user.uid, REPUTATION_POINTS.PUBLISH_RECIPE);
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
    setCuisineId(recipe.cuisine_id || '');
    setCategoryId(recipe.category_id || '');
    setSubCategoryId(recipe.sub_category_id || '');
    setPrepTime(recipe.prep_time || '');
    setCookTime(recipe.cook_time || '');
    
    const srv = recipe.servings || 1;
    setServings(srv.toString());
    
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

    setRecipeIngredients(recipe.ingredients ? recipe.ingredients.map((i, idx) => ({ 
      ...i, 
      id: `ing_edit_${idx}_${Date.now()}`, 
      amount: (parseFloat(i.amount) * srv).toString(),
      notes_bg: i.notes_bg || i.notes || '', 
      notes_en: i.notes_en || i.notes || '' 
    })) : []);
    setRecipeSteps(recipe.steps ? recipe.steps.map((s, idx) => ({ ...s, id: `step_edit_${idx}_${Date.now()}` })) : []);

    setActiveTab('basic');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
    const exportable = recipes.filter(r => !r.is_deleted);
    const headers = [
      'slug','title_bg','title_en','description_bg','description_en',
      'cuisine_id','category_id','sub_category_id','prep_time','cook_time',
      'servings','difficulty','video_url','original_author','source_link',
      'ingredients','steps'
    ];
    
    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const rows = exportable.map(r => [
      escape(r.slug || r.id),
      escape(r.title_bg),
      escape(r.title_en),
      escape(r.description_bg),
      escape(r.description_en),
      escape(r.cuisine_id),
      escape(r.category_id),
      escape(r.sub_category_id),
      escape(r.prep_time),
      escape(r.cook_time),
      escape(r.servings),
      escape(r.difficulty),
      escape(r.video_url),
      escape(r.original_author),
      escape(r.source_link),
      escape(JSON.stringify(r.ingredients || [])),
      escape(JSON.stringify(r.steps || [])),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity(user.uid, user.email, 'export_recipes_csv', `Exported ${exportable.length} recipes`);
  };

  // --- CSV Import ---
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setCsvStatus('parsing');
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0].replace(/^\uFEFF/, '').split(',');
      const idx = (name) => header.indexOf(name);

      const parseRow = (line) => {
        const result = [];
        let cur = '', inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"' && inQuote && line[i+1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuote = !inQuote; }
          else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
          else { cur += ch; }
        }
        result.push(cur);
        return result;
      };

      const existingSlugs = new Set(recipes.map(r => r.slug || r.id));
      const existingTitlesBg = new Set(recipes.map(r => (r.title_bg || '').toLowerCase()));
      const existingTitlesEn = new Set(recipes.map(r => (r.title_en || '').toLowerCase()));

      const newRows = [];
      const duplicateRows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 3) continue;
        const slug = cols[idx('slug')]?.trim();
        const title_bg = cols[idx('title_bg')]?.trim();
        const title_en = cols[idx('title_en')]?.trim();
        if (!slug || !title_bg || !title_en) continue;

        let ingredients = [];
        let steps = [];
        try { ingredients = JSON.parse(cols[idx('ingredients')] || '[]'); } catch (err) { console.warn('JSON parsing error:', err); }
        try { steps = JSON.parse(cols[idx('steps')] || '[]'); } catch (err) { console.warn('JSON parsing error:', err); }

        const row = {
          slug, title_bg, title_en,
          description_bg: cols[idx('description_bg')] || '',
          description_en: cols[idx('description_en')] || '',
          cuisine_id: cols[idx('cuisine_id')] || '',
          category_id: cols[idx('category_id')] || '',
          sub_category_id: cols[idx('sub_category_id')] || '',
          prep_time: parseInt(cols[idx('prep_time')]) || 0,
          cook_time: parseInt(cols[idx('cook_time')]) || 0,
          servings: parseInt(cols[idx('servings')]) || 1,
          difficulty: cols[idx('difficulty')] || 'medium',
          video_url: cols[idx('video_url')] || '',
          original_author: cols[idx('original_author')] || '',
          source_link: cols[idx('source_link')] || '',
          ingredients,
          steps,
          is_active: true,
          is_deleted: false,
        };

        const isDuplicate = existingSlugs.has(slug) || 
                          existingTitlesBg.has(title_bg.toLowerCase()) || 
                          existingTitlesEn.has(title_en.toLowerCase());
        
        if (isDuplicate) duplicateRows.push(row);
        else newRows.push(row);
      }

      setCsvPreview({ newRows, duplicateRows });
      setCsvStatus('');
    } catch (err) {
      console.error('CSV parse error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  const executeImport = async (mode) => {
    if (mode === 'cancel') { setCsvPreview(null); return; }
    const rows = mode === 'new' ? csvPreview.newRows : [...csvPreview.newRows, ...csvPreview.duplicateRows];
    setCsvPreview(null);
    setCsvStatus('saving');
    try {
      const now = new Date().toISOString();
      const BATCH_SIZE = 400;
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const batch = writeBatch(db);
        rows.slice(offset, offset + BATCH_SIZE).forEach(row => {
          batch.set(doc(db, 'recipes', row.slug), { ...row, updatedAt: now, createdAt: now }, { merge: true });
        });
        await batch.commit();
      }
      await logActivity(user.uid, user.email, 'import_recipes_csv', `Imported ${rows.length} recipes`);
      setCsvStatus('done');
      setTimeout(() => setCsvStatus(''), 4000);
    } catch (err) {
      console.error('CSV Import error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  const handleServingsChange = (newServingsVal) => {
    const nextServings = parseInt(newServingsVal) || 1;
    const prevServings = parseInt(servings) || 1;
    
    if (nextServings === prevServings) {
      setServings(newServingsVal);
      return;
    }

    setRecipeIngredients(prev => prev.map(ing => {
      if (!ing.amount) return ing;
      const numAmount = parseFloat(ing.amount);
      if (isNaN(numAmount)) return ing;
      
      const scaledAmount = numAmount * (nextServings / prevServings);
      const cleanAmount = Math.round(scaledAmount * 100) / 100;
      
      return {
        ...ing,
        amount: cleanAmount.toString()
      };
    }));

    setServings(newServingsVal);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitleBg(''); setTitleEn(''); setSlug('');
    setDescBg(''); setDescEn('');
    setCuisineId('');
    setCategoryId('');
    setSubCategoryId('');
    setPrepTime(''); setCookTime(''); setServings('1');
    setDifficulty('medium');
    setVideoUrl(''); setOriginalAuthor(''); setSourceLink('');
    setMainImageUrl(''); setExtra1Url(''); setExtra2Url('');
    setMainImageFile(null); setExtra1File(null); setExtra2File(null);
    setRecipeIngredients([]); setRecipeSteps([]);
    setActiveTab('basic');
    setShowForm(false);
  };

  const handleToggleActive = async (targetId, targetName, currentActiveStatus) => {
    const isPowerUser = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    if (!isPowerUser) {
      alert(isBg ? 'Нямате права за промяна на статуса.' : 'You do not have permission to change status.');
      return;
    }
    const actionName = currentActiveStatus ? (isBg ? 'деактивирате' : 'deactivate') : (isBg ? 'активирате' : 'activate');
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да ${actionName} ${targetName}?` : `Are you sure you want to ${actionName} ${targetName}?`)) return;

    try {
      // Archive before status change
      await archiveVersion('recipes', targetId, user.uid, user.email, 'UPDATE');
      await updateDoc(doc(db, 'recipes', targetId), { 'is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'recipe_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} recipe ${targetName}`);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (targetId, targetName) => {
    const isMod = user.role === ROLES.MODERATOR;
    if (isMod) {
      alert(isBg ? 'Модераторите не могат да трият рецепти.' : 'Moderators cannot delete recipes.');
      return;
    }
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да изтриете ${targetName}?` : `Are you sure you want to delete ${targetName}?`)) return;
    try {
      // Archive before delete
      await archiveVersion('recipes', targetId, user.uid, user.email, 'DELETE');
      await updateDoc(doc(db, 'recipes', targetId), { 'is_deleted': true, 'is_active': false });
      await logActivity(user.uid, user.email, 'delete_recipe', `Deleted recipe: ${targetName}`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const handlePhysicalDelete = async (targetId, targetName) => {
    const isOwner = user.role === ROLES.OWNER;
    if (!isOwner) {
      alert(isBg ? 'Само собственикът може да изтрива рецепти физически.' : 'Only the owner can delete recipes permanently.');
      return;
    }
    const message = isBg
      ? `ВНИМАНИЕ! Сигурни ли сте, че искате ФИЗИЧЕСКИ и ЗАВИНАГИ да изтриете рецептата "${targetName}" от базата с данни? Това действие е необратимо!`
      : `WARNING! Are you sure you want to PERMANENTLY and PHYSICALLY delete the recipe "${targetName}" from the database? This action is irreversible!`;

    if (!window.confirm(message)) return;

    try {
      // Archive version before permanent physical delete
      await archiveVersion('recipes', targetId, user.uid, user.email, 'PHYSICAL_DELETE');
      await deleteDoc(doc(db, 'recipes', targetId));
      await logActivity(user.uid, user.email, 'physical_delete_recipe', `Permanently deleted recipe: ${targetName}`);
      alert(isBg ? 'Рецептата е изтрита физически от базата с данни.' : 'Recipe permanently deleted from the database.');
    } catch (error) {
      console.error("Error physically deleting recipe:", error);
      alert(isBg ? 'Грешка при физическо изтриване.' : 'Error permanently deleting recipe.');
    }
  };

  const handleRestore = async (targetId, targetName) => {
    const isPowerUser = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    if (!isPowerUser) {
      alert(isBg ? 'Нямате права за възстановяване.' : 'You do not have permission to restore.');
      return;
    }
    const newAuthor = window.prompt(
      isBg ? `Възстановяване на "${targetName}". Въведете име на нов автор:` : `Restoring "${targetName}". Enter new author name:`, 
      isBg ? 'Неизвестен' : 'Unknown'
    );
    
    if (!newAuthor) return;

    try {
      await updateDoc(doc(db, 'recipes', targetId), {
        is_deleted: false,
        is_active: true,
        publisher_name: newAuthor,
        publisher_id: 'anonymous_restored',
        restored_at: new Date().toISOString()
      });
      await logActivity(user.uid, user.email, 'restore_recipe', `Restored recipe: ${targetName} with new author: ${newAuthor}`);
      alert(isBg ? 'Рецептата е възстановена.' : 'Recipe restored.');
    } catch (err) {
      console.error("Error restoring recipe:", err);
      alert(isBg ? 'Грешка при възстановяване.' : 'Error restoring.');
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (user?.role === ROLES.USER && r.publisher_id !== user.uid) return false;

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
    const isPowerUser = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;
    const isMod = user.role === ROLES.MODERATOR;

    if (statusFilter === 'deleted') {
      if (isPowerUser) {
        const isOwner = user.role === ROLES.OWNER;
        return (
          <div className="flex gap-1">
            <button onClick={() => handleRestore(r.id, rName)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
              {isBg ? 'Възстанови' : 'Restore'}
            </button>
            {isOwner && (
              <button onClick={() => handlePhysicalDelete(r.id, rName)} className="text-[10px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                {isBg ? 'Изтрий завинаги' : 'Delete Permanently'}
              </button>
            )}
          </div>
        );
      }
      return null;
    }
    return (
      <div className="flex gap-1">
        <button 
          onClick={() => navigate(`/recipe/${r.id}`)} 
          className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-background-dark/50 rounded-lg"
          title={isBg ? 'Виж публично' : 'View Public'}
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
        </button>
        <button onClick={() => handleEditClick(r)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg">
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
        {isPowerUser && (
          <button onClick={() => handleToggleActive(r.id, rName, isActive)} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-background-dark/50 text-amber-500 hover:bg-amber-500/20' : 'bg-background-dark/50 text-emerald-500 hover:bg-emerald-500/20'}`}>
            <span className="material-symbols-outlined text-[16px]">{isActive ? 'power_settings_new' : 'play_arrow'}</span>
          </button>
        )}
        {!isMod && (
          <button onClick={() => handleDelete(r.id, rName)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        )}
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
              <p className="text-xs font-medium text-primary/70">{recipes.length} {isBg ? 'въведени общо' : 'items total'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPowerUser && (
              <>
                <button
                  onClick={handleExportCSV}
                  title={isBg ? 'Експорт CSV' : 'Export CSV'}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-[11px] font-bold border border-emerald-500/20"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  CSV
                </button>
                <button
                  onClick={() => csvImportRef.current?.click()}
                  title={isBg ? 'Импорт CSV' : 'Import CSV'}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-[11px] font-bold border ${
                    csvStatus === 'parsing' || csvStatus === 'saving' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    csvStatus === 'done'   ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    csvStatus === 'error'  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {csvStatus === 'parsing' || csvStatus === 'saving' ? 'refresh' :
                     csvStatus === 'done'    ? 'check_circle' :
                     csvStatus === 'error'   ? 'error' : 'upload'}
                  </span>
                  {csvStatus === 'parsing' ? (isBg ? 'Анализира...' : 'Parsing...') :
                   csvStatus === 'saving'   ? (isBg ? 'Записва...'  : 'Saving...') :
                   csvStatus === 'done'     ? (isBg ? 'Готово!'     : 'Done!') :
                   csvStatus === 'error'    ? (isBg ? 'Грешка'      : 'Error') : 'CSV'}
                </button>
                <input ref={csvImportRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCSV} />
              </>
            )}
            <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">view_list</span></button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 text-xs font-bold overflow-x-auto hide-scrollbar pb-1">
          <button onClick={() => setStatusFilter('active')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'active' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-primary/30 hover:bg-primary/10'}`}>{isBg ? 'Активни' : 'Active'}</button>
          <button onClick={() => setStatusFilter('deactivated')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}>{isBg ? 'Деактивирани' : 'Deactivated'}</button>
          {user?.role !== ROLES.USER && (
            <button onClick={() => setStatusFilter('deleted')} className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}>{isBg ? 'Изтрити' : 'Deleted'}</button>
          )}
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

              {/* Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isBg ? 'Категория' : 'Category'}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(''); }}
                    className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none focus:border-[#b8860b]"
                  >
                    <option value="">-- {isBg ? 'Избери категория' : 'Select category'} --</option>
                    {getRootCategories().map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {isBg ? c.name.bg : c.name.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isBg ? 'Подкатегория' : 'Sub-category'}
                  </label>
                  <select
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    disabled={!categoryId}
                    className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none focus:border-[#b8860b] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">-- {isBg ? 'Избери подкатегория' : 'Select sub-category'} --</option>
                    {getSubCategories(categoryId).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {isBg ? c.name.bg : c.name.en}
                      </option>
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
                  <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Трудност' : 'Difficulty'}</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none">
                    <option value="easy">{isBg ? 'Лесно' : 'Easy'}</option>
                    <option value="medium">{isBg ? 'Средно' : 'Medium'}</option>
                    <option value="hard">{isBg ? 'Трудно' : 'Hard'}</option>
                  </select>
                </div>
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
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <p className="text-xs text-slate-400">{isBg ? 'Добавете съставките за рецептата.' : 'Add recipe ingredients.'}</p>
                    <div className="text-[10px] text-amber-500 font-bold mt-1">
                      {isBg ? 'Изчислени калории (1 порция): ' : 'Calculated calories (per serving): '}
                      {calculatedCalories} kcal
                    </div>
                  </div>
                  {/* Servings moved here */}
                  <div className="flex flex-col">
                    <label className="text-[9px] text-primary uppercase font-bold mb-1">{isBg ? 'Данни за брой порции' : 'Data for servings'}</label>
                    <select 
                      value={servings} 
                      onChange={(e) => handleServingsChange(e.target.value)} 
                      className="bg-surface-dark border border-primary/20 rounded px-2 py-1 text-slate-100 text-xs outline-none w-20 text-center"
                    >
                      {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> {isBg ? 'Добави' : 'Add'}
                </button>
              </div>
              {recipeIngredients.length === 0 && <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">{isBg ? 'Няма добавени съставки' : 'No ingredients added'}</div>}
              {recipeIngredients.map((ing, idx) => {
                // Find the selected ingredient's definition
                const dbIng = ingredientsList.find(i => i.id === ing.ingredient_id);
                const hasSpecificUnits = dbIng?.units_mapping?.length > 0;
                const mappedUnitIds = hasSpecificUnits ? dbIng.units_mapping.map(um => um.unit_id) : null;

                const availableUnits = hasSpecificUnits
                  ? measurementsList.filter(m => mappedUnitIds.includes(m.id) || mappedUnitIds.includes(m.unit_id))
                  : measurementsList;

                const unitDisabled = !ing.ingredient_id || ing.ingredient_id === '';

                return (
                  <div key={ing.id} className="bg-background-dark border border-primary/10 rounded p-2 flex flex-col gap-2 relative group">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-slate-500 w-4 font-bold shrink-0">{idx + 1}.</span>
                      {/* Ingredient selector - reduced width */}
                      <select
                        value={ing.ingredient_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateIngredientRow(ing.id, 'ingredient_id', val);
                          updateIngredientRow(ing.id, 'unit_id', '');
                        }}
                        className="w-36 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-[11px] shrink-0"
                      >
                        <option value="">-- {isBg ? 'Продукт' : 'Ingredient'} --</option>
                        {Object.entries(groupedIngredients).map(([groupName, ings]) => (
                          <optgroup key={groupName} label={`- ${groupName.toUpperCase()}`}>
                            {ings.map(i => (
                              <option key={i.id} value={i.id}>
                                {isBg ? i.name_bg : i.name_en}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      {/* Quantity */}
                      <input
                        type="number"
                        step="0.1"
                        value={ing.amount}
                        onChange={(e) => updateIngredientRow(ing.id, 'amount', e.target.value)}
                        placeholder="Qty"
                        className="w-12 bg-surface-dark border border-primary/20 rounded p-1.5 text-slate-100 text-[11px] text-center shrink-0"
                      />

                      {/* Smart unit selector */}
                      <select
                        value={ing.unit_id}
                        onChange={(e) => updateIngredientRow(ing.id, 'unit_id', e.target.value)}
                        disabled={unitDisabled}
                        title={unitDisabled ? (isBg ? 'Изберете продукт първо' : 'Select ingredient first') : ''}
                        className={`w-24 bg-surface-dark border rounded p-1.5 text-[11px] transition-colors shrink-0 ${
                          unitDisabled
                            ? 'border-primary/10 text-slate-600 cursor-not-allowed opacity-50'
                            : mappedUnitIds
                              ? 'border-[#b8860b]/40 text-slate-100'
                              : 'border-primary/20 text-slate-100'
                        }`}
                      >
                        <option value="">-- {isBg ? 'Мярка' : 'Unit'} --</option>
                        {availableUnits.map(m => (
                          <option key={m.id} value={m.id}>
                            {isBg ? m.name_bg : m.name_en}
                          </option>
                        ))}
                      </select>



                      <button
                        type="button"
                        onClick={() => removeIngredientRow(ing.id)}
                        className="p-1 text-slate-500 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Bilingual Notes Row with stacked Move controls */}
                    <div className="flex gap-2 items-center">
                      {/* Move Up/Down Stacked */}
                      <div className="flex flex-col items-center shrink-0 w-4 -space-y-1.5">
                        <button
                          type="button"
                          onClick={() => moveIngredientRow(idx, 'up')}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                          title={isBg ? 'Премести нагоре' : 'Move Up'}
                        >
                          <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredientRow(idx, 'down')}
                          disabled={idx === recipeIngredients.length - 1}
                          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                          title={isBg ? 'Премести надолу' : 'Move Down'}
                        >
                          <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_down</span>
                        </button>
                      </div>

                      {/* Notes Inputs */}
                      <div className="grid grid-cols-2 gap-2 flex-grow">
                        <input
                          type="text"
                          value={ing.notes_bg}
                          onChange={(e) => updateIngredientRow(ing.id, 'notes_bg', e.target.value)}
                          placeholder={isBg ? "Бележка (BG) (напр. 'нарязан')" : "Note (BG) (e.g. 'chopped')"}
                          className="bg-surface-dark/50 border border-primary/10 rounded p-1.5 text-slate-300 text-[10px]"
                        />
                        <input
                          type="text"
                          value={ing.notes_en}
                          onChange={(e) => updateIngredientRow(ing.id, 'notes_en', e.target.value)}
                          placeholder={isBg ? "Note (EN) (e.g. 'chopped')" : "Note (EN) (e.g. 'chopped')"}
                          className="bg-surface-dark/50 border border-primary/10 rounded p-1.5 text-slate-300 text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <div key={step.id} className="bg-background-dark border border-primary/10 rounded p-3 relative flex flex-col gap-2 group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#b8860b] uppercase tracking-widest">{isBg ? 'Стъпка' : 'Step'} {idx + 1}</span>
                      
                      <div className="flex items-center gap-1 bg-surface-dark border border-primary/10 rounded px-2 py-0.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                        <input 
                          type="number" 
                          value={step.timer_minutes || ''} 
                          onChange={(e) => updateStepRow(step.id, 'timer_minutes', e.target.value)}
                          placeholder={isBg ? 'Мин.' : 'Min.'}
                          className="w-10 bg-transparent text-[11px] text-slate-100 outline-none text-center"
                        />
                        <span className="text-[9px] text-slate-500 uppercase font-bold">{isBg ? 'мин' : 'min'}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeStepRow(step.id)} className="text-rose-500/50 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-500/10">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <textarea 
                      value={step.instruction_bg} 
                      onChange={(e) => updateStepRow(step.id, 'instruction_bg', e.target.value)} 
                      placeholder={isBg ? 'Описание на български...' : 'Description in Bulgarian...'} 
                      rows="2" 
                      className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                    ></textarea>
                    <textarea 
                      value={step.instruction_en} 
                      onChange={(e) => updateStepRow(step.id, 'instruction_en', e.target.value)} 
                      placeholder={isBg ? 'Description in English...' : 'Description in English...'} 
                      rows="2" 
                      className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                    ></textarea>
                  </div>
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
                const placeholderImg = "/images/recipe-placeholder.png";

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
                      const placeholderImg = "/images/recipe-placeholder.png";

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

      {/* CSV Import Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-primary/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-primary mb-2">
              <span className="material-symbols-outlined text-3xl">fact_check</span>
              <h3 className="text-lg font-bold uppercase tracking-widest">{isBg ? 'Проверка на импорта' : 'Import Check'}</h3>
            </div>
            
            <p className="text-slate-300 text-sm">
              {isBg 
                ? `Открихме ${csvPreview.newRows.length} нови рецепти и ${csvPreview.duplicateRows.length} потенциални дубликата.` 
                : `Found ${csvPreview.newRows.length} new recipes and ${csvPreview.duplicateRows.length} potential duplicates.`}
            </p>

            <div className="space-y-3 pt-4">
              <button 
                onClick={() => executeImport('new')}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {isBg ? 'Импортирай само НОВИТЕ' : 'Import ONLY NEW'}
              </button>
              
              <button 
                onClick={() => executeImport('all')}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">library_add</span>
                {isBg ? 'Импортирай ВСИЧКИ (презапиши)' : 'Import ALL (overwrite)'}
              </button>
              
              <button 
                onClick={() => executeImport('cancel')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold transition-all"
              >
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRecipes;

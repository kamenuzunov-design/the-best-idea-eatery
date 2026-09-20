import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { getRecipeTags } from '../../lib/recipeMetaUtils';
import { getLocalizedText, getLocalizedField, extractLocalizedNote } from '../../lib/localeUtils';

const ManageRecipes = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editIdFromUrl = searchParams.get('edit');
  const { user, isAdmin, isOwner, awardPoints } = useAuth();
  const currentLang = ['bg', 'en', 'it', 'fr', 'de'].includes(i18n.language) ? i18n.language : 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = {
    bg: { code: 'bg', label: 'Български', flag: '🇧🇬' },
    it: { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    fr: { code: 'fr', label: 'Français', flag: '🇫🇷' },
    de: { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
  }[currentLang] || { code: 'bg', label: 'Български', flag: '🇧🇬' };
  const isPowerUser = isAdmin || isOwner;
  const isModerator = user?.role === ROLES.MODERATOR;

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
  const [titleLocal, setTitleLocal] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [descLocal, setDescLocal] = useState('');
  const [descEn, setDescEn] = useState('');
  const [cuisineId, setCuisineId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
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
  const [recipeIngredients, setRecipeIngredients] = useState([]); // {id, ingredient_id, amount, unit_id, notes_local, notes_en, notes}
  const [recipeSteps, setRecipeSteps] = useState([]); // {id, instruction_local, instruction_en, timer_minutes}

  // Ingredient & Sub-Recipe Search Modal State
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [ingSearchTerm, setIngSearchTerm] = useState('');
  const [activeTargetRowId, setActiveTargetRowId] = useState(null);
  const [isSubRecipeModalOpen, setIsSubRecipeModalOpen] = useState(false);
  const [subRecipeSearchTerm, setSubRecipeSearchTerm] = useState('');

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
      if (ing.type === 'recipe') {
        const subRec = recipes.find(r => r.id === (ing.recipe_id || ing.ingredient_id) || r.slug === (ing.recipe_id || ing.ingredient_id));
        if (subRec && (subRec.calories_per_serving || subRec.calories)) {
          const subCals = parseFloat(subRec.calories_per_serving || subRec.calories) || 0;
          const amt = parseFloat(ing.amount) || 1;
          totalCalories += subCals * amt;
        }
        return;
      }
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
  }, [recipeIngredients, ingredientsList, measurementsList, servings, recipes]);

  const handleTitleEnChange = (e) => {
    const val = e.target.value;
    setTitleEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  // --- Dynamic Ingredients ---
  const removeIngredientRow = (id) => {
    setRecipeIngredients(recipeIngredients.filter(ing => ing.id !== id));
  };
  const updateIngredientRow = (id, field, value) => {
    setRecipeIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const handleOpenIngModal = (rowId = null) => {
    setActiveTargetRowId(rowId);
    setIngSearchTerm('');
    setIsIngModalOpen(true);
  };

  const handleSelectIngredient = React.useCallback((ingredientId) => {
    if (activeTargetRowId) {
      updateIngredientRow(activeTargetRowId, 'type', 'ingredient');
      updateIngredientRow(activeTargetRowId, 'ingredient_id', ingredientId);
      updateIngredientRow(activeTargetRowId, 'unit_id', '');
    } else {
      setRecipeIngredients(prev => [
        ...prev, 
        { 
          id: `ing_${prev.length}_${ingredientId}_${String(Date.now()).slice(-6)}`, 
          type: 'ingredient',
          ingredient_id: ingredientId, 
          amount: '', 
          unit_id: '', 
          notes_local: '', 
          notes_en: '' 
        }
      ]);
    }
    setIsIngModalOpen(false);
    setIngSearchTerm('');
    setActiveTargetRowId(null);
  }, [activeTargetRowId]);

  const handleOpenSubRecipeModal = (rowId = null) => {
    setActiveTargetRowId(rowId);
    setSubRecipeSearchTerm('');
    setIsSubRecipeModalOpen(true);
  };

  const handleSelectSubRecipe = React.useCallback((subRecipe) => {
    const portionUnit = measurementsList.find(m => m.id === 'portion' || m.unit_id === 'portion' || m.id === 'dose');
    const defaultUnitId = portionUnit ? (portionUnit.unit_id || portionUnit.id) : (measurementsList[0]?.id || 'portion');

    const subTitleBg = subRecipe.title_bg || subRecipe.title?.bg || '';
    const subTitleEn = subRecipe.title_en || subRecipe.title?.en || '';

    if (activeTargetRowId) {
      updateIngredientRow(activeTargetRowId, 'type', 'recipe');
      updateIngredientRow(activeTargetRowId, 'ingredient_id', subRecipe.id);
      updateIngredientRow(activeTargetRowId, 'recipe_id', subRecipe.id);
      updateIngredientRow(activeTargetRowId, 'recipe_slug', subRecipe.slug || subRecipe.id);
      updateIngredientRow(activeTargetRowId, 'ingredient_bg', subTitleBg);
      updateIngredientRow(activeTargetRowId, 'ingredient_en', subTitleEn);
      updateIngredientRow(activeTargetRowId, 'name', {
        bg: subTitleBg,
        en: subTitleEn,
        it: subRecipe.title?.it || '',
        fr: subRecipe.title?.fr || '',
        de: subRecipe.title?.de || ''
      });
      updateIngredientRow(activeTargetRowId, 'unit_id', defaultUnitId);
    } else {
      setRecipeIngredients(prev => [
        ...prev, 
        { 
          id: `subrec_${prev.length}_${subRecipe.id}_${String(Date.now()).slice(-6)}`, 
          type: 'recipe',
          ingredient_id: subRecipe.id,
          recipe_id: subRecipe.id,
          recipe_slug: subRecipe.slug || subRecipe.id,
          amount: '1',
          unit_id: defaultUnitId,
          name: {
            bg: subTitleBg,
            en: subTitleEn,
            it: subRecipe.title?.it || '',
            fr: subRecipe.title?.fr || '',
            de: subRecipe.title?.de || ''
          },
          ingredient_bg: subTitleBg,
          ingredient_en: subTitleEn,
          notes: {},
          notes_local: '', 
          notes_en: '' 
        }
      ]);
    }
    setIsSubRecipeModalOpen(false);
    setSubRecipeSearchTerm('');
    setActiveTargetRowId(null);
  }, [activeTargetRowId, measurementsList]);

  const filteredMasterIngs = React.useMemo(() => {
    if (!ingSearchTerm) return ingredientsList;
    const term = ingSearchTerm.toLowerCase();
    return ingredientsList.filter(ing => {
      const bg = (ing.name_bg || '').toLowerCase();
      const en = (ing.name_en || '').toLowerCase();
      const loc = (getLocalizedField(ing, 'name', currentLang) || '').toLowerCase();
      const idStr = (ing.id || '').toLowerCase();
      return bg.includes(term) || en.includes(term) || loc.includes(term) || idStr.includes(term);
    });
  }, [ingredientsList, ingSearchTerm, currentLang]);

  const filteredSubRecipes = React.useMemo(() => {
    return recipes.filter(r => {
      if (editingId && (r.id === editingId || r.slug === slug)) return false;
      if (slug && r.slug === slug) return false;
      if (r.is_deleted) return false;

      if (!subRecipeSearchTerm) return true;
      const term = subRecipeSearchTerm.toLowerCase();
      const titleBg = (getLocalizedField(r, 'title', 'bg') || '').toLowerCase();
      const titleEn = (getLocalizedField(r, 'title', 'en') || '').toLowerCase();
      const titleLoc = (getLocalizedField(r, 'title', currentLang) || '').toLowerCase();
      return titleBg.includes(term) || titleEn.includes(term) || titleLoc.includes(term);
    });
  }, [recipes, editingId, slug, subRecipeSearchTerm, currentLang]);
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
    setRecipeSteps([...recipeSteps, { id: newId, instruction_local: '', instruction_en: '', timer_minutes: '' }]);
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
    if (isEn) {
      if (!titleEn || !slug) return;
    } else {
      if ((!titleLocal && !titleEn) || !slug) return;
    }

    try {
      const timestamp = new Date().getTime();
      // 1. AI Safety Check for new images (Skip for Admins to save resources)
      if (!isPowerUser) {
        const newFiles = [
          { file: mainImageFile, label: t('recipes.main_image') },
          { file: extra1File, label: t('recipes.extra_image_1') },
          { file: extra2File, label: t('recipes.extra_image_2') }
        ].filter(item => item.file);

        for (const item of newFiles) {
          const b64 = await fileToBase64(item.file);
          const safety = await checkImageSafety(b64);
          if (!safety.safe) {
            alert(t('recipes.ai_safety_rejected', { label: item.label, reason: safety.reason }));
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
        const name = dbIng ? getLocalizedField(dbIng, 'name', currentLang) : t('recipes.ingredient_placeholder');
        alert(t('recipes.incomplete_ingredient_alert', { name }));
        return;
      }

      // 2. Prepare Data & Translation Handling
      const originalRecipe = editingId ? recipes.find(r => r.id === editingId) : null;
      let needsTranslation = false;
      let translationReason = null;

      const effectiveEnTitle = (titleEn || (isEn ? '' : titleLocal) || '').trim();
      const effectiveLocalTitle = (titleLocal || titleEn || '').trim();

      const existingTitle = (typeof originalRecipe?.title === 'object' && originalRecipe?.title !== null) ? originalRecipe.title : {};
      const existingDesc = (typeof originalRecipe?.description === 'object' && originalRecipe?.description !== null) ? originalRecipe.description : {};

      let finalTitleObj = {};
      let finalDescObj = {};

      if (isEn) {
        finalTitleObj = {
          en: effectiveEnTitle,
          bg: existingTitle.bg || originalRecipe?.title_bg || effectiveEnTitle,
          it: existingTitle.it || effectiveEnTitle,
          fr: existingTitle.fr || effectiveEnTitle,
          de: existingTitle.de || effectiveEnTitle
        };
        finalDescObj = {
          en: (descEn || '').trim(),
          bg: existingDesc.bg || originalRecipe?.description_bg || (descEn || '').trim(),
          it: existingDesc.it || (descEn || '').trim(),
          fr: existingDesc.fr || (descEn || '').trim(),
          de: existingDesc.de || (descEn || '').trim()
        };
        if (!editingId) {
          needsTranslation = true;
          translationReason = 'new';
        } else {
          const origEnTitle = originalRecipe?.title_en || originalRecipe?.title?.en || '';
          const origEnDesc = originalRecipe?.description_en || originalRecipe?.description?.en || '';
          const enTitleChanged = origEnTitle !== effectiveEnTitle;
          const enDescChanged = origEnDesc !== (descEn || '');
          const enStepsChanged = originalRecipe && JSON.stringify(originalRecipe.steps?.map(s => s.instruction_en || s.instruction?.en)) !== JSON.stringify(recipeSteps.map(s => s.instruction_en));

          if (enTitleChanged || enDescChanged || enStepsChanged || originalRecipe?.needs_translation) {
            needsTranslation = true;
            translationReason = (enTitleChanged || enDescChanged || enStepsChanged) ? 'en_edited' : (originalRecipe?.translation_reason || 'pending');
          }
        }
      } else {
        // Non-English user (BG, IT, FR, DE)
        finalTitleObj = {
          en: effectiveEnTitle,
          bg: currentLang === 'bg' ? effectiveLocalTitle : (existingTitle.bg || originalRecipe?.title_bg || effectiveEnTitle),
          it: currentLang === 'it' ? effectiveLocalTitle : (existingTitle.it || effectiveEnTitle),
          fr: currentLang === 'fr' ? effectiveLocalTitle : (existingTitle.fr || effectiveEnTitle),
          de: currentLang === 'de' ? effectiveLocalTitle : (existingTitle.de || effectiveEnTitle)
        };
        finalDescObj = {
          en: (descEn || (isEn ? '' : descLocal) || '').trim(),
          bg: currentLang === 'bg' ? (descLocal || descEn || '').trim() : (existingDesc.bg || originalRecipe?.description_bg || (descEn || '').trim()),
          it: currentLang === 'it' ? (descLocal || descEn || '').trim() : (existingDesc.it || (descEn || '').trim()),
          fr: currentLang === 'fr' ? (descLocal || descEn || '').trim() : (existingDesc.fr || (descEn || '').trim()),
          de: currentLang === 'de' ? (descLocal || descEn || '').trim() : (existingDesc.de || (descEn || '').trim())
        };

        const hasUnfinished = 
          !finalTitleObj.en || 
          !finalTitleObj[currentLang] ||
          finalTitleObj[currentLang].includes('[за превод]') ||
          (finalDescObj[currentLang] && finalDescObj[currentLang].includes('[за превод]'));

        if (hasUnfinished) {
          needsTranslation = true;
          translationReason = originalRecipe?.translation_reason || 'pending';
        } else {
          needsTranslation = false;
          translationReason = null;
        }
      }

      const recipeData = {
        title_bg: finalTitleObj.bg,
        title_en: finalTitleObj.en,
        title: finalTitleObj,
        slug: slug,
        description_bg: finalDescObj.bg,
        description_en: finalDescObj.en,
        description: finalDescObj,
        cuisine_id: cuisineId,
        prep_time: parseInt(prepTime) || 0,
        cook_time: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 1,
        difficulty: difficulty,
        category_id: categoryIds[0] || categoryId || '',
        category_ids: categoryIds.length > 0 ? categoryIds : (categoryId ? [categoryId] : []),
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
          const existingNotes = (typeof i.notes === 'object' && i.notes !== null) ? i.notes : {};
          const noteEn = (i.notes_en || (isEn ? '' : i.notes_local) || '').trim();
          const noteLocal = (i.notes_local || i.notes_en || '').trim();

          const notesObj = {
            en: noteEn,
            bg: currentLang === 'bg' ? (noteLocal || noteEn) : (existingNotes.bg || (typeof i.notes_bg === 'string' ? i.notes_bg : '') || noteEn),
            it: currentLang === 'it' ? (noteLocal || noteEn) : (existingNotes.it || noteEn),
            fr: currentLang === 'fr' ? (noteLocal || noteEn) : (existingNotes.fr || noteEn),
            de: currentLang === 'de' ? (noteLocal || noteEn) : (existingNotes.de || noteEn)
          };

          if (i.type === 'recipe') {
            const subRec = recipes.find(r => r.id === (i.recipe_id || i.ingredient_id) || r.slug === (i.recipe_id || i.ingredient_id));
            const subNameBg = i.ingredient_bg || subRec?.title_bg || subRec?.title?.bg || '';
            const subNameEn = i.ingredient_en || subRec?.title_en || subRec?.title?.en || '';
            return {
              type: 'recipe',
              ingredient_id: i.recipe_id || i.ingredient_id,
              recipe_id: i.recipe_id || i.ingredient_id,
              recipe_slug: subRec?.slug || i.recipe_slug || i.recipe_id || i.ingredient_id,
              name: {
                bg: subNameBg,
                en: subNameEn,
                it: subRec?.title?.it || i.name?.it || '',
                fr: subRec?.title?.fr || i.name?.fr || '',
                de: subRec?.title?.de || i.name?.de || ''
              },
              ingredient_bg: subNameBg,
              ingredient_en: subNameEn,
              amount: (parseFloat(i.amount) || 0) / (parseInt(servings) || 1),
              unit_id: i.unit_id,
              notes: notesObj,
              notes_bg: notesObj.bg,
              notes_en: notesObj.en
            };
          }

          const dbIng = ingredientsList.find(dbI => dbI.id === i.ingredient_id);
          return {
            type: 'ingredient',
            ingredient_id: i.ingredient_id,
            name: {
              bg: dbIng?.name_bg || dbIng?.name?.bg || '',
              en: dbIng?.name_en || dbIng?.name?.en || '',
              it: dbIng?.name?.it || '',
              fr: dbIng?.name?.fr || '',
              de: dbIng?.name?.de || ''
            },
            ingredient_bg: dbIng?.name_bg || dbIng?.name?.bg || '',
            ingredient_en: dbIng?.name_en || dbIng?.name?.en || '',
            amount: (parseFloat(i.amount) || 0) / (parseInt(servings) || 1),
            unit_id: i.unit_id,
            notes: notesObj,
            notes_bg: notesObj.bg,
            notes_en: notesObj.en
          };
        }).filter(i => i.ingredient_id && i.amount && i.unit_id),
        steps: recipeSteps.map((s, idx) => {
          const origStep = originalRecipe?.steps?.[idx];
          const existingInstruction = (typeof origStep?.instruction === 'object' && origStep?.instruction !== null) ? origStep.instruction : {};
          const stepInstEn = (s.instruction_en || (isEn ? '' : s.instruction_local) || '').trim();
          const stepInstLocal = (s.instruction_local || s.instruction_en || '').trim();

          const instructionObj = {
            en: stepInstEn,
            bg: currentLang === 'bg' ? (stepInstLocal || stepInstEn) : (existingInstruction.bg || origStep?.instruction_bg || stepInstEn),
            it: currentLang === 'it' ? (stepInstLocal || stepInstEn) : (existingInstruction.it || stepInstEn),
            fr: currentLang === 'fr' ? (stepInstLocal || stepInstEn) : (existingInstruction.fr || stepInstEn),
            de: currentLang === 'de' ? (stepInstLocal || stepInstEn) : (existingInstruction.de || stepInstEn)
          };

          return {
            instruction: instructionObj,
            instruction_bg: instructionObj.bg,
            instruction_en: instructionObj.en,
            timer_minutes: parseInt(s.timer_minutes) || null
          };
        }).filter(s => s.instruction_bg || s.instruction_en || s.instruction?.en || s.instruction?.bg),
        needs_translation: needsTranslation,
        translation_reason: translationReason,
        updatedAt: new Date().toISOString()
      };

      recipeData.tags = getRecipeTags(recipeData, ingredientsList);

      if (editingId) {
        // Archive before update
        await archiveVersion('recipes', editingId, user.uid, user.email, 'UPDATE');
        
        if (user.role === ROLES.USER) {
          recipeData.is_active = false;
          recipeData.status = 'pending';
        }
        
        await updateDoc(doc(db, 'recipes', editingId), recipeData);
        await logActivity(user.uid, user.email, 'edit_recipe', `Edited recipe: ${finalTitleObj.en}`);
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
        await logActivity(user.uid, user.email, 'add_recipe', `Added recipe: ${finalTitleObj.en}`);
        
        // Award Reputation Points for Publishing
        await awardPoints(user.uid, REPUTATION_POINTS.PUBLISH_RECIPE);
      }

      handleCancelEdit();
    } catch (error) {
      console.error("Error saving recipe:", error);
      let errorMsg = error.message;
      if (errorMsg.toLowerCase().includes('missing or insufficient permissions')) {
        errorMsg = t('recipes.insufficient_permissions');
      }
      alert(t('recipes.error_saving', { message: errorMsg }));
    }
  };

  const handleEditClick = (recipe) => {
    setEditingId(recipe.id);
    setTitleLocal(getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || '');
    setTitleEn(recipe.title_en || recipe.title?.en || '');
    setSlug(recipe.slug || recipe.id);
    setDescLocal(getLocalizedField(recipe, 'description', currentLang) || recipe.description_bg || '');
    setDescEn(recipe.description_en || recipe.description?.en || '');
    setCuisineId(recipe.cuisine_id || '');
    const loadedCats = Array.isArray(recipe.category_ids) && recipe.category_ids.length > 0
      ? recipe.category_ids
      : (recipe.category_id ? [recipe.category_id] : []);
    setCategoryIds(loadedCats);
    setCategoryId(loadedCats[0] || recipe.category_id || '');
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

    setRecipeIngredients(recipe.ingredients ? recipe.ingredients.map((i, idx) => {
      const noteLocalVal = extractLocalizedNote(i.notes?.[currentLang] || (currentLang === 'bg' ? i.notes_bg : ''), i.notes, currentLang);
      const noteEnVal = extractLocalizedNote(i.notes_en, i.notes, 'en');
      return {
        ...i,
        id: `ing_edit_${idx}_${Date.now()}`,
        type: i.type || 'ingredient',
        amount: (parseFloat(i.amount) * srv).toString(),
        notes_local: noteLocalVal,
        notes_en: noteEnVal,
        name: i.name || { bg: i.ingredient_bg || '', en: i.ingredient_en || '' }
      };
    }) : []);

    setRecipeSteps(recipe.steps ? recipe.steps.map((s, idx) => {
      const instLocalVal = (typeof s.instruction?.[currentLang] === 'string' && s.instruction[currentLang] !== '[object Object]')
        ? s.instruction[currentLang]
        : (currentLang === 'bg' && typeof s.instruction_bg === 'string' && s.instruction_bg !== '[object Object]' ? s.instruction_bg : '');
      const instEnVal = (typeof s.instruction?.en === 'string' && s.instruction.en !== '[object Object]')
        ? s.instruction.en
        : (typeof s.instruction_en === 'string' && s.instruction_en !== '[object Object]' ? s.instruction_en : '');
      return {
        ...s,
        id: `step_edit_${idx}_${Date.now()}`,
        instruction_local: instLocalVal,
        instruction_en: instEnVal,
        timer_minutes: s.timer_minutes || ''
      };
    }) : []);

    setActiveTab('basic');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (editIdFromUrl && recipes.length > 0) {
      const targetRecipe = recipes.find(r => r.id === editIdFromUrl || r.slug === editIdFromUrl);
      if (targetRecipe) {
        const timer = setTimeout(() => {
          handleEditClick(targetRecipe);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, recipes]);

  // --- CSV Export ---
  const handleExportCSV = () => {
    const exportable = recipes.filter(r => !r.is_deleted);
    const headers = [
      'slug','title_bg','title_en','description_bg','description_en',
      'cuisine_id','category_id','category_ids','sub_category_id','prep_time','cook_time',
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
      escape(Array.isArray(r.category_ids) ? r.category_ids.join(';') : (r.category_id || '')),
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

        const catIdsRaw = cols[idx('category_ids')]?.trim();
        const primaryCat = cols[idx('category_id')]?.trim() || '';
        const parsedCatIds = catIdsRaw 
          ? catIdsRaw.split(';').map(s => s.trim()).filter(Boolean)
          : (primaryCat ? [primaryCat] : []);

        const row = {
          slug, title_bg, title_en,
          description_bg: cols[idx('description_bg')] || '',
          description_en: cols[idx('description_en')] || '',
          cuisine_id: cols[idx('cuisine_id')] || '',
          category_id: parsedCatIds[0] || primaryCat || '',
          category_ids: parsedCatIds,
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
          batch.set(doc(db, 'recipes', row.slug), { ...row, tags: getRecipeTags(row, ingredientsList), updatedAt: now, createdAt: now }, { merge: true });
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

  const handleRecalculateTags = async () => {
    if (!ingredientsList || ingredientsList.length === 0) {
      alert(t('recipes.tags_not_loaded'));
      return;
    }
    if (!window.confirm(t('recipes.confirm_recalculate_tags'))) return;
    setLoading(true);
    try {
      const BATCH_SIZE = 400;
      let count = 0;
      for (let offset = 0; offset < recipes.length; offset += BATCH_SIZE) {
        const batch = writeBatch(db);
        recipes.slice(offset, offset + BATCH_SIZE).forEach(r => {
          const newTags = getRecipeTags(r, ingredientsList);
          batch.update(doc(db, 'recipes', r.id), { tags: newTags });
          count++;
        });
        await batch.commit();
      }
      alert(t('recipes.recalculate_tags_done', { count }));
    } catch (err) {
      console.error(err);
      alert('Error updating tags: ' + err.message);
    }
    setLoading(false);
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

  const toggleCategory = (catId) => {
    let nextCats;
    if (categoryIds.includes(catId)) {
      nextCats = categoryIds.filter(id => id !== catId);
    } else {
      nextCats = [...categoryIds, catId];
    }
    setCategoryIds(nextCats);
    const newPrimary = nextCats[0] || '';
    setCategoryId(newPrimary);
    
    if (newPrimary) {
      const validSubCats = getSubCategories(newPrimary).map(s => s.id);
      if (!validSubCats.includes(subCategoryId)) {
        setSubCategoryId('');
      }
    } else {
      setSubCategoryId('');
    }
  };

  const makePrimaryCategory = (catId, e) => {
    if (e) e.stopPropagation();
    const filtered = categoryIds.filter(id => id !== catId);
    const nextCats = [catId, ...filtered];
    setCategoryIds(nextCats);
    setCategoryId(catId);
    const validSubCats = getSubCategories(catId).map(s => s.id);
    if (!validSubCats.includes(subCategoryId)) {
      setSubCategoryId('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitleLocal(''); setTitleEn(''); setSlug('');
    setDescLocal(''); setDescEn('');
    setCuisineId('');
    setCategoryId('');
    setCategoryIds([]);
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
    if (!isPowerUser) {
      alert(t('recipes.no_permission_status'));
      return;
    }
    const actionName = currentActiveStatus ? t('recipes.action_deactivate') : t('recipes.action_activate');
    if (!window.confirm(t('recipes.confirm_status', { action: actionName, name: targetName }))) return;

    try {
      // Archive before status change
      await archiveVersion('recipes', targetId, user.uid, user.email, 'UPDATE');
      await updateDoc(doc(db, 'recipes', targetId), { 'is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'recipe_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} recipe ${targetName}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert(t('recipes.error_status', { message: error.message }));
    }
  };

  const handleDelete = async (targetId, targetName) => {
    if (isModerator) {
      alert(t('recipes.moderator_no_delete'));
      return;
    }
    if (!window.confirm(t('recipes.confirm_delete', { name: targetName }))) return;
    try {
      // Archive before delete
      await archiveVersion('recipes', targetId, user.uid, user.email, 'DELETE');
      await updateDoc(doc(db, 'recipes', targetId), { 'is_deleted': true, 'is_active': false });
      await logActivity(user.uid, user.email, 'delete_recipe', `Deleted recipe: ${targetName}`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert(t('recipes.error_deleting', { message: error.message }));
    }
  };

  const handlePhysicalDelete = async (targetId, targetName) => {
    if (!isOwner) {
      alert(t('recipes.owner_only_physical_delete'));
      return;
    }
    if (!window.confirm(t('recipes.confirm_physical_delete', { name: targetName }))) return;

    try {
      // Archive version before permanent physical delete
      await archiveVersion('recipes', targetId, user.uid, user.email, 'PHYSICAL_DELETE');
      await deleteDoc(doc(db, 'recipes', targetId));
      await logActivity(user.uid, user.email, 'physical_delete_recipe', `Permanently deleted recipe: ${targetName}`);
      alert(t('recipes.physical_delete_done'));
    } catch (error) {
      console.error("Error physically deleting recipe:", error);
      alert(t('recipes.error_physical_delete'));
    }
  };

  const handleRestore = async (targetId, targetName) => {
    if (!isPowerUser) {
      alert(t('recipes.no_permission_restore'));
      return;
    }
    const newAuthor = window.prompt(
      t('recipes.restore_prompt', { name: targetName }), 
      t('recipes.restore_default_author')
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
      alert(t('recipes.recipe_restored'));
    } catch (err) {
      console.error("Error restoring recipe:", err);
      alert(t('recipes.error_restore', { message: err.message }));
    }
  };

  const filteredRecipes = recipes.filter(r => {
    if (user?.role === ROLES.USER && r.publisher_id !== user.uid) return false;

    const isDeleted = r.is_deleted === true;
    
    // Regular users see all their non-deleted recipes (both active and pending)
    if (user?.role === ROLES.USER) {
      if (isDeleted) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const tBg = (r.title_bg || '').toLowerCase();
        const tEn = (r.title_en || '').toLowerCase();
        const tLoc = (getLocalizedField(r, 'title', currentLang) || '').toLowerCase();
        if (!tBg.includes(term) && !tEn.includes(term) && !tLoc.includes(term)) {
          return false;
        }
      }
      return true;
    }

    const isActive = r.is_active !== false && !isDeleted;
    const isDeactivated = r.is_active === false && !isDeleted;
    
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'deactivated' && !isDeactivated) return false;
    if (statusFilter === 'deleted' && !isDeleted) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const tBg = (r.title_bg || '').toLowerCase();
      const tEn = (r.title_en || '').toLowerCase();
      const tLoc = (getLocalizedField(r, 'title', currentLang) || '').toLowerCase();
      if (!tBg.includes(term) && !tEn.includes(term) && !tLoc.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const renderManageButtons = (r, isActive, rName) => {
    if (statusFilter === 'deleted') {
      if (isPowerUser) {
        return (
          <div className="flex gap-1">
            <button onClick={() => handleRestore(r.id, rName)} className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
              {t('recipes.restore')}
            </button>
            {isOwner && (
              <button onClick={() => handlePhysicalDelete(r.id, rName)} className="text-[10px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                {t('recipes.delete_permanent')}
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
          title={t('recipes.view_public')}
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
        </button>
        <button onClick={() => handleEditClick(r)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg" title={t('recipes.edit')}>
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
        {isPowerUser && (
          <button onClick={() => handleToggleActive(r.id, rName, isActive)} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-background-dark/50 text-amber-500 hover:bg-amber-500/20' : 'bg-background-dark/50 text-emerald-500 hover:bg-emerald-500/20'}`}>
            <span className="material-symbols-outlined text-[16px]">{isActive ? 'power_settings_new' : 'play_arrow'}</span>
          </button>
        )}
        {!isModerator && (
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
        {/* Header Block: Row 1 (Back, Title, Buttons) & Row 2 (Spacer, Count) */}
        <div className="flex flex-col space-y-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-xl font-bold text-slate-100">{t('recipes.title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              {(isAdmin || isOwner) && (
                <>
                  <button
                    onClick={handleExportCSV}
                    title={t('recipes.export_csv')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-xs font-bold border border-emerald-500/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    CSV
                  </button>
                  <button
                    onClick={() => csvImportRef.current?.click()}
                    title={t('recipes.import_csv')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border ${
                      csvStatus === 'parsing' || csvStatus === 'saving' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      csvStatus === 'done'   ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      csvStatus === 'error'  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {csvStatus === 'parsing' || csvStatus === 'saving' ? 'refresh' :
                       csvStatus === 'done'    ? 'check_circle' :
                       csvStatus === 'error'   ? 'error' : 'upload'}
                    </span>
                    {csvStatus === 'parsing' ? t('recipes.csv_parsing') :
                     csvStatus === 'saving'   ? t('recipes.csv_saving') :
                     csvStatus === 'done'     ? t('recipes.csv_done') :
                     csvStatus === 'error'    ? t('recipes.csv_error') : 'CSV'}
                  </button>
                  <input
                    ref={csvImportRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                </>
              )}
              <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('recipes.view_grid')}>
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('recipes.view_list')}>
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Empty position for back button + Count text under title + Tags button */}
          <div className="flex items-center">
            <div className="w-10 mr-2 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary/70">
                {t('recipes.total_count', { count: recipes.length })}
              </span>
              {isPowerUser && (
                <button
                  onClick={handleRecalculateTags}
                  title={t('recipes.recalculate_tags')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors text-xs font-bold border border-amber-500/20"
                >
                  <span className="material-symbols-outlined text-[16px]">label</span>
                  {t('recipes.tags_btn')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Filters & Status Badges */}
        {(() => {
          const pendingCount = recipes.filter(r => (r.status === 'pending' || r.is_active === false) && !r.is_deleted).length;
          return (isAdmin || isOwner || isModerator) && (
            <div className="flex gap-2 text-xs font-bold overflow-x-auto hide-scrollbar pb-1">
              <button onClick={() => { setStatusFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-1 text-center py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'all' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-primary/30 hover:bg-primary/10'}`}>{t('recipes.filter_all')}</button>
              <button onClick={() => { setStatusFilter('pending'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-1 text-center py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'pending' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}>
                {t('recipes.filter_pending')} {pendingCount > 0 && `(${pendingCount})`}
              </button>
              <button onClick={() => { setStatusFilter('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-1 text-center py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'active' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-surface-dark text-slate-400 border-emerald-500/30 hover:bg-emerald-500/10'}`}>{t('recipes.filter_active')}</button>
              <button onClick={() => { setStatusFilter('deactivated'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-1 text-center py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}>{t('recipes.filter_deactivated')}</button>
              <button onClick={() => { setStatusFilter('deleted'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-1 text-center py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}>{t('recipes.filter_deleted')}</button>
            </div>
          );
        })()}
      </div>

      <div className="p-4 overflow-y-auto">
        {!showForm && !editingId ? (
          <button onClick={() => setShowForm(true)} className="w-full border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 p-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors mb-6">
            <span className="material-symbols-outlined">add</span>
            {t('recipes.add_recipe')}
          </button>
        ) : (
        <form onSubmit={handleSaveRecipe} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 transition-colors ${editingId ? 'bg-[#b8860b]/10 border-[#b8860b]/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest text-[#b8860b]">
              {editingId ? t('recipes.edit_recipe') : t('recipes.new_recipe')}
            </h3>
            <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded">
              {t('common.buttons.cancel')}
            </button>
          </div>

          <div className="flex gap-2 border-b border-primary/20 mb-4 overflow-x-auto hide-scrollbar">
            <button type="button" onClick={() => setActiveTab('basic')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'basic' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipes.tab_basic')}</button>
            <button type="button" onClick={() => setActiveTab('media')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'media' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipes.tab_media')}</button>
            <button type="button" onClick={() => setActiveTab('ingredients')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'ingredients' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipes.tab_ingredients')}</button>
            <button type="button" onClick={() => setActiveTab('steps')} className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'steps' ? 'border-[#b8860b] text-[#b8860b]' : 'border-transparent text-slate-400'}`}>{t('recipes.tab_steps')}</button>
          </div>

          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isEn ? "col-span-2" : ""}>
                  <label className="text-xs text-slate-400">{t('recipes.title_en')}</label>
                  <input value={titleEn} onChange={handleTitleEnChange} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" />
                </div>
                {!isEn && (
                  <div>
                    <label className="text-xs text-slate-400">{localLangMeta.flag} {t('recipes.title_local', { lang: localLangMeta.code.toUpperCase() })}</label>
                    <input value={titleLocal} onChange={(e) => setTitleLocal(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs text-slate-400">{t('recipes.slug_id')}</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!editingId} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-slate-400">{t('recipes.desc_en')}</label>
                  <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows="4" className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none resize-none"></textarea>
                </div>
                {!isEn && (
                  <div>
                    <label className="text-xs text-slate-400">{localLangMeta.flag} {t('recipes.desc_local', { lang: localLangMeta.code.toUpperCase() })}</label>
                    <textarea value={descLocal} onChange={(e) => setDescLocal(e.target.value)} rows="4" className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-[#b8860b] outline-none resize-none"></textarea>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-4">
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.cuisine')}</label>
                  <select value={cuisineId} onChange={(e) => setCuisineId(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none">
                    <option value="">{t('recipes.select_cuisine')}</option>
                    {CUISINES.map(c => (
                      <option key={c.id} value={c.id}>{getLocalizedText(c.name, currentLang)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Category Selection */}
              <div className="space-y-3 bg-surface-dark/40 p-3 rounded-xl border border-primary/10">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-primary">category</span>
                      {t('recipes.categories_label')}
                    </label>
                    {categoryIds.length > 0 && (
                      <span className="text-[10px] font-bold text-[#b8860b] bg-[#b8860b]/10 px-2 py-0.5 rounded-full border border-[#b8860b]/20">
                        {t('recipes.categories_selected', { count: categoryIds.length })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {getRootCategories().map(c => {
                      const isSelected = categoryIds.includes(c.id);
                      const isPrimary = isSelected && (categoryIds[0] === c.id || (categoryIds.length === 0 && categoryId === c.id));
                      return (
                        <div
                          key={c.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none border ${
                            isPrimary
                              ? 'bg-primary/20 border-primary text-primary-light shadow-sm'
                              : isSelected
                                ? 'bg-[#b8860b]/15 border-[#b8860b]/60 text-slate-100 hover:border-[#b8860b]'
                                : 'bg-background-dark/80 border-primary/20 text-slate-400 hover:text-slate-200 hover:border-primary/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className="inline-flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
                          >
                            <span className="text-sm">{c.icon}</span>
                            <span>{getLocalizedText(c.name, currentLang)}</span>
                          </button>

                          {isPrimary && (
                            <span 
                              className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-primary/30 text-primary-light font-bold flex items-center gap-0.5 ml-0.5"
                              title={t('recipes.primary_category_tooltip')}
                            >
                              ★ {t('recipes.primary_category')}
                            </span>
                          )}

                          {isSelected && !isPrimary && (
                            <button
                              type="button"
                              onClick={(e) => makePrimaryCategory(c.id, e)}
                              className="text-[9px] px-1 py-0.5 rounded bg-surface-dark/80 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors ml-0.5"
                              title={t('recipes.set_primary_tooltip')}
                            >
                              ☆
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-category for primary category */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    {t('recipes.sub_category')}
                    {(categoryIds[0] || categoryId) && (
                      <span className="text-slate-500 font-normal lowercase ml-1">
                        ({t('recipes.for_primary')}: {getLocalizedText(getRootCategories().find(c => c.id === (categoryIds[0] || categoryId))?.name, currentLang)})
                      </span>
                    )}
                  </label>
                  <select
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    disabled={!categoryIds.length && !categoryId}
                    className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none focus:border-[#b8860b] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('recipes.select_sub_category')}</option>
                    {getSubCategories(categoryIds[0] || categoryId).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {getLocalizedText(c.name, currentLang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.prep_time')}</label>
                  <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.cook_time')}</label>
                  <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm text-center" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.difficulty')}</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm outline-none">
                    <option value="easy">{t('recipes.diff_easy')}</option>
                    <option value="medium">{t('recipes.diff_medium')}</option>
                    <option value="hard">{t('recipes.diff_hard')}</option>
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
                  <label className="text-[10px] text-slate-400 uppercase text-center font-bold text-[#b8860b]">{t('recipes.main_image')}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative group">
                    {mainImageUrl ? <img src={mainImageUrl} alt="Main" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-3xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'main')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                {/* Extra 1 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase text-center">{t('recipes.extra_image_1')}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {extra1Url ? <img src={extra1Url} alt="Extra 1" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'extra1')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                {/* Extra 2 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400 uppercase text-center">{t('recipes.extra_image_2')}</label>
                  <div className="aspect-square bg-background-dark border border-primary/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {extra2Url ? <img src={extra2Url} alt="Extra 2" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-500 text-xl">add_photo_alternate</span>}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'extra2')} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">{t('recipes.video_url')}</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} type="url" className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-primary/10 pt-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.original_author')}</label>
                  <input value={originalAuthor} onChange={(e) => setOriginalAuthor(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Gordon Ramsay" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">{t('recipes.source_link')}</label>
                  <input value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} type="url" className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="https://..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 mb-3">
                {/* Row 1: Info & Servings */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-xs text-slate-400">{t('recipes.ingredients_subtitle')}</p>
                    <div className="text-[10px] text-amber-500 font-bold mt-0.5">
                      {t('recipes.calculated_calories')}
                      {calculatedCalories} kcal
                    </div>
                  </div>
                  {/* Servings */}
                  <div className="flex flex-col items-end">
                    <label className="text-[9px] text-primary uppercase font-bold mb-0.5">{t('recipes.servings_label')}</label>
                    <select 
                      value={servings} 
                      onChange={(e) => handleServingsChange(e.target.value)} 
                      className="bg-surface-dark border border-primary/20 rounded px-2 py-1 text-slate-100 text-xs outline-none w-20 text-center"
                    >
                      {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Action Buttons */}
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => handleOpenIngModal(null)} 
                    className="flex-1 text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 border border-[#b8860b]/30 px-2.5 py-2 rounded-lg hover:bg-[#b8860b]/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span> 
                    {t('recipes.add_ingredient')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleOpenSubRecipeModal(null)} 
                    className="flex-1 text-xs font-bold text-primary-light bg-primary/20 border border-primary/40 px-2.5 py-2 rounded-lg hover:bg-primary/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">restaurant_menu</span> 
                    {t('recipes.sub_recipe')}
                  </button>
                </div>
              </div>
              {recipeIngredients.length === 0 && <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">{t('recipes.no_ingredients')}</div>}
              {recipeIngredients.map((ing, idx) => {
                const isSubRecipe = ing.type === 'recipe';
                const subRec = isSubRecipe ? recipes.find(r => r.id === (ing.recipe_id || ing.ingredient_id) || r.slug === (ing.recipe_id || ing.ingredient_id)) : null;
                const dbIng = !isSubRecipe ? ingredientsList.find(i => i.id === ing.ingredient_id) : null;
                const hasSpecificUnits = dbIng?.units_mapping?.length > 0;
                const mappedUnitIds = hasSpecificUnits ? dbIng.units_mapping.map(um => um.unit_id) : null;

                const availableUnits = isSubRecipe
                  ? measurementsList
                  : (hasSpecificUnits
                      ? measurementsList.filter(m => mappedUnitIds.includes(m.id) || mappedUnitIds.includes(m.unit_id))
                      : measurementsList);

                const unitDisabled = isSubRecipe ? false : (!ing.ingredient_id || ing.ingredient_id === '');

                const subTitle = subRec
                  ? (getLocalizedField(subRec, 'title', currentLang) || subRec.title_bg || subRec.title_en)
                  : (getLocalizedText(ing.name, currentLang) || (currentLang === 'bg' ? ing.ingredient_bg : ing.ingredient_en) || (isSubRecipe ? t('recipes.sub_recipe_placeholder') : t('recipes.ingredient_placeholder')));

                return (
                  <div key={ing.id} className={`bg-background-dark border rounded p-1.5 flex flex-col gap-1.5 relative group ${isSubRecipe ? 'border-primary/40 bg-primary/5' : 'border-primary/10'}`}>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-xs text-slate-500 w-4 font-bold shrink-0">{idx + 1}.</span>
                      {/* Ingredient selector - Search Modal trigger */}
                      {isSubRecipe ? (
                        <button
                          type="button"
                          onClick={() => handleOpenSubRecipeModal(ing.id)}
                          className="w-32 sm:w-[152px] bg-primary/15 border border-primary/40 rounded px-1.5 py-1 text-[11px] text-left flex items-center justify-between shrink-0 transition-colors cursor-pointer text-primary-light font-bold"
                          title={t('recipes.change_sub_recipe_tooltip')}
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="material-symbols-outlined text-primary text-[14px] shrink-0">restaurant_menu</span>
                            <span className="truncate">{subTitle}</span>
                          </div>
                          <span className="text-[8px] uppercase px-1 py-0.5 rounded bg-primary/30 text-primary-light font-black shrink-0 ml-1">
                            {t('recipes.recipe_badge')}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenIngModal(ing.id)}
                          className={`w-32 sm:w-[152px] bg-surface-dark border rounded px-1.5 py-1 text-[11px] text-left flex items-center justify-between shrink-0 transition-colors cursor-pointer ${
                            ing.ingredient_id
                              ? 'border-[#b8860b]/50 text-slate-100 font-bold bg-[#b8860b]/5'
                              : 'border-primary/20 text-slate-400 hover:border-primary/50'
                          }`}
                          title={t('recipes.select_ingredient_tooltip')}
                        >
                          <span className="truncate">
                            {dbIng ? (getLocalizedField(dbIng, 'name', currentLang) || dbIng.name_bg || dbIng.name_en) : t('recipes.ingredient_placeholder')}
                          </span>
                          <span className="material-symbols-outlined text-primary text-sm shrink-0 ml-1">search</span>
                        </button>
                      )}

                      {/* Quantity */}
                      <input
                        type="number"
                        step="0.1"
                        value={ing.amount}
                        onChange={(e) => updateIngredientRow(ing.id, 'amount', e.target.value)}
                        placeholder={t('recipes.qty_placeholder')}
                        className="w-11 bg-surface-dark border border-primary/20 rounded px-1 py-1 text-slate-100 text-[11px] text-center shrink-0"
                      />

                      {/* Smart unit selector */}
                      <select
                        value={ing.unit_id}
                        onChange={(e) => updateIngredientRow(ing.id, 'unit_id', e.target.value)}
                        disabled={unitDisabled}
                        title={unitDisabled ? t('recipes.select_ingredient_first') : ''}
                        className={`w-20 sm:w-22 bg-surface-dark border rounded px-1.5 py-1 text-[11px] transition-colors shrink-0 ${
                          unitDisabled
                            ? 'border-primary/10 text-slate-600 cursor-not-allowed opacity-50'
                            : isSubRecipe
                              ? 'border-primary/40 text-primary-light font-medium'
                              : mappedUnitIds
                                ? 'border-[#b8860b]/40 text-slate-100'
                                : 'border-primary/20 text-slate-100'
                        }`}
                      >
                        <option value="">-- {t('recipes.unit_placeholder')} --</option>
                        {availableUnits.map(m => (
                          <option key={m.id} value={m.id}>
                            {getLocalizedField(m, 'name', currentLang) || m.name_bg || m.name_en}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeIngredientRow(ing.id)}
                        className="p-0.5 text-slate-500 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Notes Row with stacked Move controls */}
                    <div className="flex gap-1.5 items-center">
                      {/* Move Up/Down Stacked */}
                      <div className="flex flex-col items-center shrink-0 w-4 -space-y-1.5">
                        <button
                          type="button"
                          onClick={() => moveIngredientRow(idx, 'up')}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                          title={t('recipes.move_up')}
                        >
                          <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredientRow(idx, 'down')}
                          disabled={idx === recipeIngredients.length - 1}
                          className="text-slate-400 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed h-3.5 flex items-center justify-center"
                          title={t('recipes.move_down')}
                        >
                          <span className="material-symbols-outlined text-[20px] select-none">arrow_drop_down</span>
                        </button>
                      </div>

                      {/* Notes Inputs */}
                      {isEn ? (
                        <div className="flex-grow">
                          <input
                            type="text"
                            value={typeof ing.notes_en === 'string' && ing.notes_en !== '[object Object]' ? ing.notes_en : ''}
                            onChange={(e) => updateIngredientRow(ing.id, 'notes_en', e.target.value)}
                            placeholder={t('recipes.note_en_placeholder')}
                            className="bg-surface-dark/50 border border-primary/10 rounded px-2 py-1 text-slate-300 text-[10px] w-full"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 flex-grow">
                          <input
                            type="text"
                            value={typeof ing.notes_local === 'string' && ing.notes_local !== '[object Object]' ? ing.notes_local : ''}
                            onChange={(e) => updateIngredientRow(ing.id, 'notes_local', e.target.value)}
                            placeholder={t('recipes.note_local_placeholder', { lang: localLangMeta.code.toUpperCase() })}
                            className="bg-surface-dark/50 border border-primary/10 rounded px-2 py-1 text-slate-300 text-[10px]"
                          />
                          <input
                            type="text"
                            value={typeof ing.notes_en === 'string' && ing.notes_en !== '[object Object]' ? ing.notes_en : ''}
                            onChange={(e) => updateIngredientRow(ing.id, 'notes_en', e.target.value)}
                            placeholder={t('recipes.note_en_placeholder')}
                            className="bg-surface-dark/50 border border-primary/10 rounded px-2 py-1 text-slate-300 text-[10px] w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400">{t('recipes.steps_subtitle')}</p>
                <button type="button" onClick={addStepRow} className="text-xs font-bold text-[#b8860b] bg-[#b8860b]/10 px-3 py-1.5 rounded hover:bg-[#b8860b]/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> {t('common.buttons.add')}
                </button>
              </div>
              {recipeSteps.length === 0 && <div className="text-center py-4 border border-dashed border-primary/20 rounded text-slate-500 text-xs">{t('recipes.no_steps')}</div>}
              {recipeSteps.map((step, idx) => (
                <div key={step.id} className="bg-background-dark border border-primary/10 rounded p-3 relative flex flex-col gap-2 group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#b8860b] uppercase tracking-widest">{t('recipes.step_label')} {idx + 1}</span>
                      
                      <div className="flex items-center gap-1 bg-surface-dark border border-primary/10 rounded px-2 py-0.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                        <input 
                          type="number" 
                          value={step.timer_minutes || ''} 
                          onChange={(e) => updateStepRow(step.id, 'timer_minutes', e.target.value)} 
                          placeholder={t('recipes.min_placeholder')}
                          className="w-10 bg-transparent text-[11px] text-slate-100 outline-none text-center"
                        />
                        <span className="text-[9px] text-slate-500 uppercase font-bold">{t('recipes.min_unit')}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeStepRow(step.id)} className="text-rose-500/50 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-500/10">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  {isEn ? (
                    <div className="grid grid-cols-1 gap-2">
                      <textarea 
                        value={step.instruction_en || ''} 
                        onChange={(e) => updateStepRow(step.id, 'instruction_en', e.target.value)} 
                        placeholder={t('recipes.instruction_en_placeholder')} 
                        rows="4" 
                        className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                      ></textarea>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      <textarea 
                        value={step.instruction_local || ''} 
                        onChange={(e) => updateStepRow(step.id, 'instruction_local', e.target.value)} 
                        placeholder={t('recipes.instruction_local_placeholder', { lang: localLangMeta.label })} 
                        rows="4" 
                        className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                      ></textarea>
                      <textarea 
                        value={step.instruction_en || ''} 
                        onChange={(e) => updateStepRow(step.id, 'instruction_en', e.target.value)} 
                        placeholder={t('recipes.instruction_en_placeholder')} 
                        rows="4" 
                        className="w-full bg-surface-dark border border-primary/20 rounded p-2 text-slate-100 text-xs resize-none outline-none focus:border-[#b8860b] transition-colors"
                      ></textarea>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <button type="submit" className={`w-full font-bold py-3 rounded-lg transition-colors border mt-4 flex justify-center items-center gap-2 ${editingId ? 'bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? t('recipes.save_changes') : t('recipes.save_recipe')}
          </button>
        </form>
        )}

        <div className="mb-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('recipes.search_placeholder')} className="w-full bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-[#b8860b]" />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary"><span className="material-symbols-outlined animate-spin text-4xl">refresh</span></div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
               <span className="material-symbols-outlined text-4xl opacity-50 mb-2">search_off</span>
               <p>{t('recipes.no_recipes_found')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredRecipes.map(r => {
                const isActive = r.is_active !== false;
                const isDeleted = r.is_deleted === true;
                const rName = getLocalizedField(r, 'title', currentLang);
                const placeholderImg = "/images/recipe-placeholder.png";

                return (
                  <div key={r.id} className={`bg-surface-dark/50 border rounded-xl overflow-hidden flex flex-col group transition-colors ${isDeleted ? 'border-rose-500/30 opacity-60' : !isActive ? 'border-amber-500/30 opacity-75' : 'border-primary/10 hover:border-[#b8860b]/30'}`}>
                    <div className="h-24 w-full relative">
                      <img src={r.images?.main || placeholderImg} alt={rName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background-dark to-transparent"></div>
                      {!isActive && !isDeleted && <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-background-dark text-[10px] font-bold rounded-full">{user?.role === ROLES.USER ? t('recipes.badge_pending') : t('recipes.badge_inactive')}</div>}
                      {r.needs_translation && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500/90 text-white text-[10px] font-bold rounded-full shadow">
                          {t('recipes.badge_translation')}
                        </div>
                      )}
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
                      <th className="px-3 py-2">{t('recipes.th_image')}</th>
                      <th className="px-3 py-2">{t('recipes.th_title')}</th>
                      <th className="px-3 py-2 text-center">{t('recipes.th_stats')}</th>
                      <th className="px-3 py-2 text-right">{t('recipes.th_manage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipes.map(r => {
                      const isActive = r.is_active !== false;
                      const isDeleted = r.is_deleted === true;
                      const rName = getLocalizedField(r, 'title', currentLang);
                      const placeholderImg = "/images/recipe-placeholder.png";

                      return (
                        <tr key={r.id} className={`border-b border-primary/5 hover:bg-[#b8860b]/5 transition-colors ${isDeleted ? 'opacity-60' : !isActive ? 'opacity-75' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="size-8 rounded overflow-hidden">
                              <img src={r.images?.main || placeholderImg} className="w-full h-full object-cover" alt="r" />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => handleEditClick(r)} className="font-bold text-slate-200 hover:text-[#b8860b] transition-colors text-left text-[12px] flex items-center gap-1.5 line-clamp-2">
                              {!isActive && !isDeleted && <span className="size-1.5 shrink-0 bg-amber-500 rounded-full inline-block"></span>}
                              {r.needs_translation && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold shrink-0">
                                  {t('recipes.badge_trans_short')}
                                </span>
                              )}
                              {rName}
                            </button>
                            <div className="text-[10px] text-slate-500">
                              {(() => {
                                const cObj = CUISINES.find(c => c.id === r.cuisine_id);
                                return cObj ? getLocalizedText(cObj.name, currentLang) : (r.cuisine_bg || r.cuisine_en || '-');
                              })()}
                            </div>
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
              <h3 className="text-lg font-bold uppercase tracking-widest">{t('recipes.csv_modal_title')}</h3>
            </div>
            
            <p className="text-slate-300 text-sm">
              {t('recipes.csv_modal_desc', { newCount: csvPreview.newRows.length, dupCount: csvPreview.duplicateRows.length })}
            </p>

            <div className="space-y-3 pt-4">
              <button 
                onClick={() => executeImport('new')}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {t('recipes.csv_import_new')}
              </button>
              
              <button 
                onClick={() => executeImport('all')}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">library_add</span>
                {t('recipes.csv_import_all')}
              </button>
              
              <button 
                onClick={() => executeImport('cancel')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold transition-all"
              >
                {t('common.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Search Modal Dialog */}
      {isIngModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">search</span>
                {t('recipes.ing_modal_title')}
              </h3>
              <button type="button" onClick={() => setIsIngModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3.5 border-b border-primary/10 bg-background-dark/50">
              <input
                type="text"
                placeholder={t('recipes.ing_modal_search')}
                value={ingSearchTerm}
                onChange={(e) => setIngSearchTerm(e.target.value)}
                className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="p-3.5 overflow-y-auto space-y-1.5 flex-1 custom-scrollbar">
              {filteredMasterIngs.length > 0 ? (
                filteredMasterIngs.slice(0, 30).map(ing => {
                  const displayName = getLocalizedField(ing, 'name', currentLang);

                  return (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => handleSelectIngredient(ing.id)}
                      className="w-full text-left px-3 py-2 rounded-xl border bg-background-dark/50 hover:bg-primary/10 border-primary/10 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{displayName}</span>
                      <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">
                    {t('recipes.no_ingredients_found')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Recipe Search Modal Dialog */}
      {isSubRecipeModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">restaurant_menu</span>
                {t('recipes.subrec_modal_title')}
              </h3>
              <button type="button" onClick={() => setIsSubRecipeModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3.5 border-b border-primary/10 bg-background-dark/50">
              <input
                type="text"
                placeholder={t('recipes.subrec_modal_search')}
                value={subRecipeSearchTerm}
                onChange={(e) => setSubRecipeSearchTerm(e.target.value)}
                className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
              {filteredSubRecipes.length > 0 ? (
                filteredSubRecipes.slice(0, 30).map(rec => {
                  const title = getLocalizedField(rec, 'title', currentLang);
                  const imgUrl = rec.images?.main || "/images/recipe-placeholder.png";

                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => handleSelectSubRecipe(rec)}
                      className="w-full text-left p-2.5 rounded-xl border bg-background-dark/50 hover:bg-primary/10 border-primary/10 hover:border-primary/40 text-xs text-slate-200 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="size-10 rounded-lg overflow-hidden shrink-0 border border-primary/20">
                        <img src={imgUrl} alt={title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-100 group-hover:text-primary transition-colors truncate">
                          {title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {rec.calories_per_serving ? `${rec.calories_per_serving} kcal` : ''} 
                          {rec.prep_time ? ` • ${rec.prep_time}m prep` : ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary text-sm shrink-0">add_circle</span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400">
                    {t('recipes.no_subrecipes_found')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRecipes;

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { archiveVersion } from '../../lib/archiveUtils';
import { CUISINES } from '../../data/cuisines';
import { normalizeMainGroup, getMainGroupLabel } from '../../lib/recipeMetaUtils';
import { getLocalizedText, getLocalizedField, LANGUAGE_LABELS } from '../../lib/localeUtils';

const ManageIngredients = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || LANGUAGE_LABELS.bg;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editIdFromUrl = searchParams.get('edit');
  const { user, isAdmin, isOwner } = useAuth();
  const csvImportRef = useRef(null);
  const [csvStatus, setCsvStatus] = useState(''); // '' | 'parsing' | 'saving' | 'done' | 'error'
  const [csvPreview, setCsvPreview] = useState(null); // { newRows, duplicateRows } | null
  const [syncStatus, setSyncStatus] = useState(''); // '' | 'syncing' | 'done' | 'error'

  const [ingredients, setIngredients] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [ingredientGroups, setIngredientGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and Views
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'deactivated' | 'deleted'
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  
  // Identity (Multilingual Data Entry Paradigm)
  const [nameLocal, setNameLocal] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  
  // Classification
  const [mainGroup, setMainGroup] = useState('');
  const [subGroup, setSubGroup] = useState('');
  const [cuisineOrigin, setCuisineOrigin] = useState('');
  
  // Nutrition
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  
  // Meta
  const [allergensStr, setAllergensStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [isLiquid, setIsLiquid] = useState(false);
  
  // Pricing
  const [pricePer100, setPricePer100] = useState('');
  
  // Units Mapping
  const [unitsMapping, setUnitsMapping] = useState([]); // [{unit_id, weight_grams}]

  useEffect(() => {
    const qIngredients = query(collection(db, 'ingredients'));
    const unsubIngredients = onSnapshot(qIngredients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIngredients(data);
      setLoading(false);
    });

    const qMeasurements = query(collection(db, 'measurements'));
    const unsubMeasurements = onSnapshot(qMeasurements, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeasurements(data);
    });

    const qGroups = query(collection(db, 'ingredient_groups'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIngredientGroups(data);
    });

    return () => {
      unsubIngredients();
      unsubMeasurements();
      unsubGroups();
    };
  }, []);

  const handleNameEnChange = (e) => {
    const val = e.target.value;
    setNameEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleAddUnitMapping = () => {
    setUnitsMapping([...unitsMapping, { unit_id: '', weight_grams: '' }]);
  };

  const handleRemoveUnitMapping = (index) => {
    setUnitsMapping(unitsMapping.filter((_, i) => i !== index));
  };

  const handleUnitMappingChange = (index, field, value) => {
    const newMapping = [...unitsMapping];
    newMapping[index][field] = field === 'weight_grams' ? parseFloat(value) || '' : value;
    setUnitsMapping(newMapping);
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (isEn) {
      if (!nameEn.trim() || !slug.trim()) return;
    } else {
      if (!nameEn.trim() && !nameLocal.trim()) return;
      if (!slug.trim()) return;
    }

    try {
      const originalIng = editingId ? ingredients.find(i => i.id === editingId) : null;
      const originalNameMap = (originalIng && typeof originalIng.name === 'object') ? originalIng.name : {};

      const finalNameEn = nameEn.trim() || nameLocal.trim();
      const finalNameLocal = nameLocal.trim() || finalNameEn;

      let needsTranslation = false;
      let translationReason = null;

      // Multilingual Data Entry Paradigm: build robust map for 5 languages
      const updatedNameMap = {
        en: finalNameEn,
        bg: isEn
          ? (originalNameMap.bg || (editingId ? originalIng?.name_bg : '') || finalNameEn)
          : (currentLang === 'bg' ? finalNameLocal : (originalNameMap.bg || originalIng?.name_bg || finalNameEn)),
        it: isEn
          ? (originalNameMap.it || (editingId ? originalIng?.name_it : '') || finalNameEn)
          : (currentLang === 'it' ? finalNameLocal : (originalNameMap.it || originalIng?.name_it || finalNameEn)),
        fr: isEn
          ? (originalNameMap.fr || (editingId ? originalIng?.name_fr : '') || finalNameEn)
          : (currentLang === 'fr' ? finalNameLocal : (originalNameMap.fr || originalIng?.name_fr || finalNameEn)),
        de: isEn
          ? (originalNameMap.de || (editingId ? originalIng?.name_de : '') || finalNameEn)
          : (currentLang === 'de' ? finalNameLocal : (originalNameMap.de || originalIng?.name_de || finalNameEn))
      };

      if (isEn) {
        if (!editingId) {
          needsTranslation = true;
          translationReason = 'new';
        } else {
          const enNameChanged = originalIng && (originalIng.name_en !== finalNameEn || originalIng.name?.en !== finalNameEn);
          if (enNameChanged || originalIng?.needs_translation) {
            needsTranslation = true;
            translationReason = enNameChanged ? 'en_edited' : (originalIng?.translation_reason || 'pending');
          }
        }
      } else {
        if (!nameLocal.trim() || nameLocal.includes('[за превод]')) {
          needsTranslation = true;
          translationReason = originalIng?.translation_reason || 'pending';
        } else {
          needsTranslation = false;
          translationReason = null;
        }
      }

      const ingredientData = {
        name: updatedNameMap,
        name_en: updatedNameMap.en,
        name_bg: updatedNameMap.bg,
        name_it: updatedNameMap.it,
        name_fr: updatedNameMap.fr,
        name_de: updatedNameMap.de,
        slug: slug.trim(),
        classification: {
          main_group: mainGroup,
          sub_group: subGroup,
          cuisine_origin: cuisineOrigin
        },
        nutrition_per_100: {
          calories: parseFloat(calories) || 0,
          proteins: parseFloat(proteins) || 0,
          carbs: parseFloat(carbs) || 0,
          fats: parseFloat(fats) || 0
        },
        units_mapping: unitsMapping.filter(u => u.unit_id && u.weight_grams),
        meta: {
          allergens: allergensStr ? allergensStr.split(',').map(s => s.trim()).filter(Boolean) : [],
          tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
          average_shelf_life_days: parseInt(shelfLife) || 0,
          is_liquid: isLiquid
        },
        price_per_100: parseFloat(pricePer100) || 0,
        currency: 'EUR',
        needs_translation: needsTranslation,
        translation_reason: translationReason,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        // Archive before update
        await archiveVersion('ingredients', editingId, user.uid, user.email, 'UPDATE');
        await updateDoc(doc(db, 'ingredients', editingId), ingredientData);
        await logActivity(user.uid, user.email, 'edit_ingredient', `Edited ingredient: ${finalNameEn}`);
      } else {
        ingredientData.createdAt = new Date().toISOString();
        ingredientData.is_active = true;
        ingredientData.is_deleted = false;
        await setDoc(doc(db, 'ingredients', slug.trim()), ingredientData);
        await logActivity(user.uid, user.email, 'add_ingredient', `Added ingredient: ${finalNameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving ingredient:", error);
      alert(t('ingredients.error_saving'));
    }
  };

  const handleEditClick = (ing) => {
    setEditingId(ing.id);
    setNameEn(ing.name_en || (typeof ing.name === 'object' ? ing.name.en : '') || '');
    setNameLocal(ing[`name_${currentLang}`] || (typeof ing.name === 'object' ? ing.name[currentLang] : '') || (currentLang === 'bg' ? ing.name_bg : '') || '');
    setSlug(ing.slug || ing.id);

    const mg = ing.classification?.main_group || '';
    const normMg = normalizeMainGroup(mg);
    const mainGroupObj = ingredientGroups.find(g => {
      const gId = String(g.id || '').toLowerCase();
      const gBg = String(g.name?.bg || '').toLowerCase();
      const gEn = String(g.name?.en || '').toLowerCase();
      return gId === mg.toLowerCase() || gBg === mg.toLowerCase() || gEn === mg.toLowerCase() ||
             normalizeMainGroup(gId) === normMg || normalizeMainGroup(gBg) === normMg || normalizeMainGroup(gEn) === normMg;
    });
    setMainGroup(mainGroupObj ? mainGroupObj.id : mg);

    const sg = ing.classification?.sub_group || '';
    const normSg = normalizeMainGroup(sg);
    const subGroupObj = ingredientGroups.find(g => {
      const gId = String(g.id || '').toLowerCase();
      const gBg = String(g.name?.bg || '').toLowerCase();
      const gEn = String(g.name?.en || '').toLowerCase();
      return gId === sg.toLowerCase() || gBg === sg.toLowerCase() || gEn === sg.toLowerCase() ||
             normalizeMainGroup(gId) === normSg || normalizeMainGroup(gBg) === normSg || normalizeMainGroup(gEn) === normSg;
    });
    setSubGroup(subGroupObj ? subGroupObj.id : sg);

    setCuisineOrigin(ing.classification?.cuisine_origin || '');
    setCalories(ing.nutrition_per_100?.calories ?? '');
    setProteins(ing.nutrition_per_100?.proteins ?? '');
    setCarbs(ing.nutrition_per_100?.carbs ?? '');
    setFats(ing.nutrition_per_100?.fats ?? '');
    setAllergensStr(ing.meta?.allergens?.join(', ') || '');
    setTagsStr(ing.meta?.tags?.join(', ') || '');
    setShelfLife(ing.meta?.average_shelf_life_days ?? '');
    setIsLiquid(ing.meta?.is_liquid || false);
    setPricePer100(ing.price_per_100 ?? '');
    setUnitsMapping(ing.units_mapping || []);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (editIdFromUrl && ingredients.length > 0) {
      const targetIngredient = ingredients.find(i => i.id === editIdFromUrl || i.slug === editIdFromUrl);
      if (targetIngredient) {
        const timer = setTimeout(() => {
          handleEditClick(targetIngredient);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, ingredients]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setNameLocal('');
    setNameEn('');
    setSlug('');
    setMainGroup('');
    setSubGroup('');
    setCuisineOrigin('');
    setCalories('');
    setProteins('');
    setCarbs('');
    setFats('');
    setAllergensStr('');
    setTagsStr('');
    setShelfLife('');
    setIsLiquid(false);
    setPricePer100('');
    setUnitsMapping([]);
  };

  const handleToggleActive = async (targetId, targetName, currentActiveStatus) => {
    const actionName = currentActiveStatus ? t('ingredients.action_deactivate') : t('ingredients.action_activate');
    if (!window.confirm(t('ingredients.confirm_status', { action: actionName, name: targetName }))) return;

    try {
      await archiveVersion('ingredients', targetId, user.uid, user.email, 'UPDATE');
      const ingRef = doc(db, 'ingredients', targetId);
      await updateDoc(ingRef, { 'is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'ingredient_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} ingredient ${targetName}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert(t('ingredients.error_status'));
    }
  };

  const handleDelete = async (targetId, targetName) => {
    if (!window.confirm(t('ingredients.confirm_delete', { name: targetName }))) return;
    
    try {
      await archiveVersion('ingredients', targetId, user.uid, user.email, 'DELETE');
      const ingRef = doc(db, 'ingredients', targetId);
      await updateDoc(ingRef, { 'is_deleted': true, 'is_active': false });
      await logActivity(user.uid, user.email, 'delete_ingredient', `Deleted ingredient: ${targetName}`);
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      alert(t('ingredients.error_deleting'));
    }
  };

  const handleRestore = async (targetId, targetName) => {
    try {
      const ingRef = doc(db, 'ingredients', targetId);
      await updateDoc(ingRef, { 'is_deleted': false, 'is_active': true });
      await logActivity(user.uid, user.email, 'restore_ingredient', `Restored ingredient: ${targetName}`);
    } catch (error) {
      console.error("Error restoring ingredient:", error);
    }
  };

  const getGroupName = (val) => {
    if (!val) return '-';
    const normVal = normalizeMainGroup(val);
    const group = ingredientGroups.find(g => {
      if (!g) return false;
      const gId = String(g.id || '').toLowerCase();
      const gBg = String(g.name?.bg || '').toLowerCase();
      const gEn = String(g.name?.en || '').toLowerCase();
      return gId === String(val).toLowerCase() || gBg === String(val).toLowerCase() || gEn === String(val).toLowerCase() ||
             normalizeMainGroup(gId) === normVal || normalizeMainGroup(gBg) === normVal || normalizeMainGroup(gEn) === normVal;
    });
    if (group) return getLocalizedText(group.name, currentLang);
    return getMainGroupLabel(val, currentLang);
  };

  const getSubGroupName = (val) => {
    if (!val) return '-';
    const normVal = normalizeMainGroup(val);
    const group = ingredientGroups.find(g => {
      if (!g) return false;
      const gId = String(g.id || '').toLowerCase();
      const gBg = String(g.name?.bg || '').toLowerCase();
      const gEn = String(g.name?.en || '').toLowerCase();
      return gId === String(val).toLowerCase() || gBg === String(val).toLowerCase() || gEn === String(val).toLowerCase() ||
             normalizeMainGroup(gId) === normVal || normalizeMainGroup(gBg) === normVal || normalizeMainGroup(gEn) === normVal;
    });
    if (group) return getLocalizedText(group.name, currentLang);
    return getMainGroupLabel(val, currentLang);
  };

  const getGroupIcon = (val) => {
    const v = String(val || '').toLowerCase();
    if (v.includes('veg') || v.includes('зеленчуци')) return 'eco';
    if (v.includes('fruit') || v.includes('плодове')) return 'nutrition';
    if (v.includes('meat') || v.includes('месо')) return 'kebab_dining';
    if (v.includes('fish') || v.includes('риба') || v.includes('sea') || v.includes('морски')) return 'set_meal';
    if (v.includes('dairy') || v.includes('млечни')) return 'water_drop';
    if (v.includes('spice') || v.includes('подправки')) return 'spa';
    if (v.includes('grain') || v.includes('зърнени')) return 'grass';
    if (v.includes('bakery') || v.includes('тестени')) return 'bakery_dining';
    if (v.includes('sweet') || v.includes('десерт') || v.includes('подсладители')) return 'icecream';
    if (v.includes('drink') || v.includes('напитки')) return 'local_drink';
    if (v.includes('oil') || v.includes('мазнини') || v.includes('fat')) return 'oil_barrel';
    if (v.includes('egg') || v.includes('яйца')) return 'egg';
    if (v.includes('nut') || v.includes('ядки')) return 'nut';
    return 'category';
  };

  const getIngredientDisplayName = (ing) => {
    return getLocalizedField(ing, 'name', currentLang) ||
      (currentLang === 'bg' ? ing.name_bg : ing.name_en) ||
      ing.name_en ||
      ing.name_bg ||
      ing.id;
  };

  const filteredIngredients = ingredients.filter(ing => {
    const isDeleted = ing.is_deleted === true;
    const isActive = ing.is_active !== false && !isDeleted;
    const isDeactivated = ing.is_active === false && !isDeleted;
    
    // Status Filter
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'deactivated' && !isDeactivated) return false;
    if (statusFilter === 'deleted' && !isDeleted) return false;

    // Search term across all language names and slug
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const allNames = [
        ing.name_en,
        ing.name_bg,
        ing.name_it,
        ing.name_fr,
        ing.name_de,
        typeof ing.name === 'object' ? Object.values(ing.name).join(' ') : '',
        ing.slug
      ].filter(Boolean).join(' ').toLowerCase();

      if (!allNames.includes(term)) {
        return false;
      }
    }
    return true;
  });

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const exportable = ingredients.filter(i => !i.is_deleted);
    const headers = [
      'slug','name_en','name_bg','main_group','sub_group','cuisine_origin',
      'calories','proteins','carbs','fats',
      'allergens','tags','shelf_life_days','is_liquid','price_per_100',
      'units_mapping'
    ];
    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = exportable.map(ing => [
      escape(ing.slug || ing.id),
      escape(ing.name_en || ing.name?.en || ''),
      escape(ing.name_bg || ing.name?.bg || ''),
      escape(ing.classification?.main_group),
      escape(ing.classification?.sub_group),
      escape(ing.classification?.cuisine_origin),
      escape(ing.nutrition_per_100?.calories ?? 0),
      escape(ing.nutrition_per_100?.proteins ?? 0),
      escape(ing.nutrition_per_100?.carbs ?? 0),
      escape(ing.nutrition_per_100?.fats ?? 0),
      escape((ing.meta?.allergens || []).join(';')),
      escape((ing.meta?.tags || []).join(';')),
      escape(ing.meta?.average_shelf_life_days ?? 0),
      escape(ing.meta?.is_liquid ? '1' : '0'),
      escape(ing.price_per_100 ?? 0),
      escape(JSON.stringify(ing.units_mapping || [])),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingredients_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity(user.uid, user.email, 'export_ingredients_csv', `Exported ${exportable.length} ingredients`);
  };

  // ── CSV Import: Step 1 — parse & detect duplicates ─────────────────────────
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

      const existingSlugs = new Set(ingredients.map(i => i.slug || i.id));
      const existingNamesBg = new Set(ingredients.map(i => (i.name_bg || i.name?.bg || '').toLowerCase()));
      const existingNamesEn = new Set(ingredients.map(i => (i.name_en || i.name?.en || '').toLowerCase()));

      const newRows = [];
      const duplicateRows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 3) continue;
        const slug    = cols[idx('slug')]?.trim();
        const name_en = cols[idx('name_en')]?.trim();
        const name_bg = cols[idx('name_bg')]?.trim();
        if (!slug || !name_en || !name_bg) continue;

        let units_mapping = [];
        try { units_mapping = JSON.parse(cols[idx('units_mapping')] || '[]'); } catch { /* ignore parse error */ }

        const row = {
          slug,
          name_en,
          name_bg,
          name: {
            en: name_en,
            bg: name_bg,
            it: name_en,
            fr: name_en,
            de: name_en
          },
          classification: {
            main_group: cols[idx('main_group')] || '',
            sub_group: cols[idx('sub_group')] || '',
            cuisine_origin: cols[idx('cuisine_origin')] || ''
          },
          nutrition_per_100: {
            calories: parseFloat(cols[idx('calories')]) || 0,
            proteins: parseFloat(cols[idx('proteins')]) || 0,
            carbs:    parseFloat(cols[idx('carbs')]) || 0,
            fats:     parseFloat(cols[idx('fats')]) || 0,
          },
          meta: {
            allergens: cols[idx('allergens')]?.split(';').map(s=>s.trim()).filter(Boolean) || [],
            tags:      cols[idx('tags')]?.split(';').map(s=>s.trim()).filter(Boolean) || [],
            average_shelf_life_days: parseInt(cols[idx('shelf_life_days')]) || 0,
            is_liquid: cols[idx('is_liquid')] === '1',
          },
          price_per_100: parseFloat(cols[idx('price_per_100')]) || 0,
          currency: 'EUR',
          units_mapping,
          is_active: true,
          is_deleted: false
        };

        const isDuplicate =
          existingSlugs.has(slug) ||
          existingNamesBg.has(name_bg.toLowerCase()) ||
          existingNamesEn.has(name_en.toLowerCase());

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

  // ── CSV Import: Step 2 — execute write ───────────────────────────────────────
  const executeImport = async (mode) => {
    if (mode === 'cancel') { setCsvPreview(null); return; }
    const rows = mode === 'new'
      ? csvPreview.newRows
      : [...csvPreview.newRows, ...csvPreview.duplicateRows];

    setCsvPreview(null);
    setCsvStatus('saving');
    try {
      const now = new Date().toISOString();
      const BATCH_SIZE = 400;
      for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
        const batch = writeBatch(db);
        rows.slice(offset, offset + BATCH_SIZE).forEach(row => {
          batch.set(
            doc(db, 'ingredients', row.slug),
            { ...row, createdAt: now, updatedAt: now },
            { merge: true }
          );
        });
        await batch.commit();
      }
      await logActivity(user.uid, user.email, 'import_ingredients_csv',
        `Imported ${rows.length} ingredients (mode: ${mode})`);
      setCsvStatus('done');
      setTimeout(() => setCsvStatus(''), 4000);
    } catch (err) {
      console.error('CSV write error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  const handleSyncRecipeIngredients = async () => {
    if (!ingredients || ingredients.length === 0) {
      alert(t('ingredients.link_not_loaded'));
      return;
    }

    if (!window.confirm(t('ingredients.link_confirm'))) return;

    setSyncStatus('syncing');
    try {
      const recipesSnap = await getDocs(collection(db, 'recipes'));
      if (recipesSnap.empty) {
        alert(t('ingredients.link_no_recipes'));
        setSyncStatus('');
        return;
      }

      const allRecipes = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let updatedRecipesCount = 0;
      let totalLinkedIngredients = 0;
      let createdIngredientsCount = 0;

      const ingredientMap = new Map();
      const existingDbIngs = [...ingredients];

      existingDbIngs.forEach(ing => {
        if (ing.name_bg) ingredientMap.set(ing.name_bg.trim().toLowerCase(), ing);
        if (ing.name_en) ingredientMap.set(ing.name_en.trim().toLowerCase(), ing);
        if (ing.name && typeof ing.name === 'object') {
          Object.values(ing.name).forEach(val => {
            if (typeof val === 'string' && val.trim()) {
              ingredientMap.set(val.trim().toLowerCase(), ing);
            }
          });
        }
      });

      const BATCH_SIZE = 400;
      let currentBatch = writeBatch(db);
      let batchOpCount = 0;

      for (const r of allRecipes) {
        if (!r.ingredients || !Array.isArray(r.ingredients) || r.ingredients.length === 0) {
          continue;
        }

        let recipeModified = false;
        const newIngredientsList = [];

        for (const ing of r.ingredients) {
          let targetIngId = ing.ingredient_id || ing.id;
          let matchedDbIng = null;

          if (targetIngId) {
            matchedDbIng = existingDbIngs.find(dbI => dbI.id === targetIngId);
          }

          if (!matchedDbIng) {
            const textBg = (ing.ingredient_bg || ing.name_bg || '').trim().toLowerCase();
            const textEn = (ing.ingredient_en || ing.name_en || '').trim().toLowerCase();

            if (textBg && ingredientMap.has(textBg)) {
              matchedDbIng = ingredientMap.get(textBg);
            } else if (textEn && ingredientMap.has(textEn)) {
              matchedDbIng = ingredientMap.get(textEn);
            } else {
              for (const [key, dbIng] of ingredientMap.entries()) {
                if (textBg && (key.includes(textBg) || textBg.includes(key))) {
                  matchedDbIng = dbIng;
                  break;
                }
                if (textEn && (key.includes(textEn) || textEn.includes(key))) {
                  matchedDbIng = dbIng;
                  break;
                }
              }
            }

            if (!matchedDbIng && (textBg || textEn)) {
              const newIngId = doc(collection(db, 'ingredients')).id;
              const autoNameEn = ing.ingredient_en || ing.name_en || textEn || ing.ingredient_bg || 'Ingredient';
              const autoNameBg = ing.ingredient_bg || ing.name_bg || textBg || autoNameEn;
              const newIngDoc = {
                id: newIngId,
                name_bg: autoNameBg,
                name_en: autoNameEn,
                name: {
                  en: autoNameEn,
                  bg: autoNameBg,
                  it: autoNameEn,
                  fr: autoNameEn,
                  de: autoNameEn
                },
                slug: autoNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                status: 'active',
                is_active: true,
                is_deleted: false,
                createdAt: new Date().toISOString()
              };

              currentBatch.set(doc(db, 'ingredients', newIngId), newIngDoc);
              batchOpCount++;

              matchedDbIng = newIngDoc;
              existingDbIngs.push(newIngDoc);
              if (newIngDoc.name_bg) ingredientMap.set(newIngDoc.name_bg.trim().toLowerCase(), newIngDoc);
              if (newIngDoc.name_en) ingredientMap.set(newIngDoc.name_en.trim().toLowerCase(), newIngDoc);
              createdIngredientsCount++;
            }
          }

          if (matchedDbIng) {
            const updatedIng = {
              ...ing,
              ingredient_id: matchedDbIng.id,
              ingredient_bg: matchedDbIng.name_bg || ing.ingredient_bg || ing.name_bg || '',
              ingredient_en: matchedDbIng.name_en || ing.ingredient_en || ing.name_en || ''
            };

            if (ing.ingredient_id !== matchedDbIng.id || ing.ingredient_bg !== updatedIng.ingredient_bg) {
              recipeModified = true;
            }
            newIngredientsList.push(updatedIng);
            totalLinkedIngredients++;
          } else {
            newIngredientsList.push(ing);
          }
        }

        if (recipeModified) {
          currentBatch.update(doc(db, 'recipes', r.id), { ingredients: newIngredientsList });
          batchOpCount++;
          updatedRecipesCount++;
        }

        if (batchOpCount >= BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchOpCount = 0;
        }
      }

      if (batchOpCount > 0) {
        await currentBatch.commit();
      }

      await logActivity(
        user.uid,
        user.email,
        'sync_recipe_ingredients',
        `Linked ${totalLinkedIngredients} ingredients across ${updatedRecipesCount} recipes. Created ${createdIngredientsCount} missing ingredients.`
      );

      setSyncStatus('done');
      alert(t('ingredients.link_success', {
        linkedCount: totalLinkedIngredients,
        recipesCount: updatedRecipesCount,
        createdCount: createdIngredientsCount
      }));
      setTimeout(() => setSyncStatus(''), 4000);
    } catch (err) {
      console.error('Error syncing ingredients:', err);
      setSyncStatus('error');
      alert(t('ingredients.link_error', { message: err.message }));
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  const renderManageButtons = (ing, isActive, ingName) => {
    if (statusFilter === 'deleted') {
      return (
        <button 
          onClick={() => handleRestore(ing.id, ingName)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
        >
          {t('ingredients.restore')}
        </button>
      );
    }
    
    return (
      <div className="flex gap-1">
        <button 
          onClick={() => handleEditClick(ing)} 
          className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg" 
          title={t('ingredients.edit')}
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
        </button>
        <button 
          onClick={() => handleToggleActive(ing.id, ingName, isActive)}
          className={`p-1.5 rounded-lg transition-colors ${
            isActive 
              ? 'bg-background-dark/50 text-amber-500 hover:bg-amber-500/20' 
              : 'bg-background-dark/50 text-emerald-500 hover:bg-emerald-500/20'
          }`}
          title={isActive ? t('ingredients.deactivate') : t('ingredients.activate')}
        >
          <span className="material-symbols-outlined text-[16px]">{isActive ? 'power_settings_new' : 'play_arrow'}</span>
        </button>
        <button 
          onClick={() => handleDelete(ing.id, ingName)} 
          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg" 
          title={t('ingredients.delete')}
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 space-y-3">
        {/* Header Block: Row 1 & Row 2 */}
        <div className="flex flex-col space-y-1">
          {/* Row 1: Back Button, Title, Export CSV, Import CSV, View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-xl font-bold text-slate-100">{t('ingredients.title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              {(isAdmin || isOwner) && (
                <>
                  <button
                    onClick={handleExportCSV}
                    title={t('ingredients.export_csv_title')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-xs font-bold border border-emerald-500/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {t('ingredients.export_csv')}
                  </button>
                  <button
                    onClick={() => csvImportRef.current?.click()}
                    title={t('ingredients.import_csv_title')}
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
                    {csvStatus === 'parsing' ? t('ingredients.parsing') :
                     csvStatus === 'saving'   ? t('ingredients.saving') :
                     csvStatus === 'done'     ? t('ingredients.done') :
                     csvStatus === 'error'    ? t('ingredients.error') : t('ingredients.import_csv')}
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
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('ingredients.view_grid')}>
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('ingredients.view_list')}>
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Subtitle (Count under Title) & "Свържи съставки" Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium text-primary/70">
                ({ingredients.length} {t('ingredients.total_count')})
              </span>
            </div>
            {(isAdmin || isOwner) && (
              <button
                onClick={handleSyncRecipeIngredients}
                disabled={syncStatus === 'syncing'}
                title={t('ingredients.link_ingredients_title')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold border ${
                  syncStatus === 'syncing' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  syncStatus === 'done'    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  syncStatus === 'error'   ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                  'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {syncStatus === 'syncing' ? 'refresh' : syncStatus === 'done' ? 'check_circle' : syncStatus === 'error' ? 'error' : 'link'}
                </span>
                {syncStatus === 'syncing' ? t('ingredients.link_syncing') :
                 syncStatus === 'done'    ? t('ingredients.done') :
                 syncStatus === 'error'   ? t('ingredients.error') : t('ingredients.link_ingredients')}
              </button>
            )}
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex gap-2 text-xs font-bold overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'active' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-primary/30 hover:bg-primary/10'}`}
          >
            {t('ingredients.filter_active')}
          </button>
          <button 
            onClick={() => setStatusFilter('deactivated')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}
          >
            {t('ingredients.filter_deactivated')}
          </button>
          <button 
            onClick={() => setStatusFilter('deleted')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}
          >
            {t('ingredients.filter_deleted')}
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSaveIngredient} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-blue-500/10 border-blue-500/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? t('ingredients.edit_ingredient') 
                : t('ingredients.new_ingredient')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded">
                {t('common.cancel')}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEn ? (
              <div className="col-span-1 md:col-span-2">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                  <img src="/flags/gb.svg" alt="" className="h-[10px] w-[14px] object-cover rounded-[1px]" />
                  <span>{t('ingredients.name_en')}</span>
                </label>
                <input 
                  value={nameEn} 
                  onChange={handleNameEnChange} 
                  required 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:outline-none focus:border-primary/50" 
                  placeholder="e.g. Tomato" 
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                    <img src={localLangMeta.flagUrl} alt="" className="h-[10px] w-[14px] object-cover rounded-[1px]" />
                    <span>{t('ingredients.name_local', { lang: localLangMeta.name })}</span>
                  </label>
                  <input 
                    value={nameLocal} 
                    onChange={(e) => setNameLocal(e.target.value)} 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:outline-none focus:border-primary/50" 
                    placeholder={currentLang === 'bg' ? 'напр. Домат' : '...'} 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                    <img src="/flags/gb.svg" alt="" className="h-[10px] w-[14px] object-cover rounded-[1px]" />
                    <span>{t('ingredients.name_en')}</span>
                  </label>
                  <input 
                    value={nameEn} 
                    onChange={handleNameEnChange} 
                    required 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:outline-none focus:border-primary/50" 
                    placeholder="e.g. Tomato" 
                  />
                </div>
              </>
            )}
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs text-slate-400 font-medium mb-1 block">{t('ingredients.slug_id')}</label>
              <div className="flex gap-4 items-center">
                <input 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  required 
                  disabled={!!editingId} 
                  className="flex-1 bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70 focus:outline-none focus:border-primary/50 disabled:cursor-not-allowed" 
                  placeholder="tomato" 
                />
                <label className="flex items-center gap-2 cursor-pointer pr-2 shrink-0">
                  <input type="checkbox" checked={isLiquid} onChange={(e) => setIsLiquid(e.target.checked)} className="accent-primary w-4 h-4 cursor-pointer" />
                  <span className="text-sm text-slate-200 font-bold">{t('ingredients.is_liquid')}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.main_group')}</label>
              <select value={mainGroup} onChange={(e) => {
                setMainGroup(e.target.value);
                setSubGroup('');
              }} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50">
                <option value="">{t('ingredients.select_placeholder')}</option>
                {ingredientGroups.filter(g => g.level === 0).map(g => (
                  <option key={g.id} value={g.id}>{getLocalizedText(g.name, currentLang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.sub_group')}</label>
              <select value={subGroup} onChange={(e) => setSubGroup(e.target.value)} disabled={!mainGroup} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50">
                <option value="">{t('ingredients.select_placeholder')}</option>
                {ingredientGroups.filter(g => g.level === 1 && (g.parentId === mainGroup || ingredientGroups.find(p => p.name?.bg === mainGroup || p.name?.en === mainGroup || p.id === mainGroup)?.id === g.parentId)).map(g => (
                  <option key={g.id} value={g.id}>{getLocalizedText(g.name, currentLang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.cuisine')}</label>
              <select value={cuisineOrigin} onChange={(e) => setCuisineOrigin(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50">
                <option value="">{t('ingredients.select_placeholder')}</option>
                {CUISINES.map(c => (
                  <option key={c.id} value={c.name?.en || c.name?.bg || c.id}>{getLocalizedText(c.name, currentLang)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2">
            <h4 className="text-xs font-bold text-slate-300 mb-2">{t('ingredients.nutrition_header')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">{t('ingredients.calories')}</label>
                <input type="number" step="0.1" value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-amber-500 text-sm font-medium focus:outline-none focus:border-primary/50" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">{t('ingredients.proteins')}</label>
                <input type="number" step="0.1" value={proteins} onChange={(e) => setProteins(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-emerald-500 text-sm font-medium focus:outline-none focus:border-primary/50" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">{t('ingredients.carbs')}</label>
                <input type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-blue-400 text-sm font-medium focus:outline-none focus:border-primary/50" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">{t('ingredients.fats')}</label>
                <input type="number" step="0.1" value={fats} onChange={(e) => setFats(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-rose-500 text-sm font-medium focus:outline-none focus:border-primary/50" placeholder="0" />
              </div>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-300">{t('ingredients.units_mapping_header')}</h4>
              <button type="button" onClick={handleAddUnitMapping} className="text-[10px] bg-primary/20 text-primary px-2.5 py-1 rounded hover:bg-primary/30 transition-colors font-bold">
                {t('ingredients.add_unit')}
              </button>
            </div>
            {unitsMapping.length === 0 && <p className="text-[10px] text-slate-500 italic">{t('ingredients.no_units_mapped')}</p>}
            <div className="space-y-2">
              {unitsMapping.map((mapping, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <select 
                    value={mapping.unit_id} 
                    onChange={(e) => handleUnitMappingChange(idx, 'unit_id', e.target.value)}
                    className="flex-1 bg-background-dark border border-primary/20 rounded p-1 text-slate-100 text-[11px] focus:outline-none focus:border-primary/50"
                  >
                    <option value="">{t('ingredients.select_unit')}</option>
                    {measurements.map(m => (
                      <option key={m.unit_id || m.id} value={m.unit_id || m.id}>
                        {getLocalizedField(m, 'name', currentLang)} ({getLocalizedField(m, 'short', currentLang)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400">=</span>
                    <input 
                      type="number" step="0.1" 
                      value={mapping.weight_grams} 
                      onChange={(e) => handleUnitMappingChange(idx, 'weight_grams', e.target.value)}
                      className="w-14 bg-background-dark border border-primary/20 rounded p-1 text-slate-100 text-[11px] text-center focus:outline-none focus:border-primary/50" 
                      placeholder="g" 
                    />
                    <span className="text-[10px] text-slate-400">g/ml</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveUnitMapping(idx)} className="p-0.5 shrink-0 text-slate-500 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.tags')}</label>
              <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50" placeholder={t('ingredients.tags_placeholder')} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.allergens')}</label>
              <input value={allergensStr} onChange={(e) => setAllergensStr(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50" placeholder={t('ingredients.allergens_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.shelf_life')}</label>
                <input type="number" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50" placeholder={t('ingredients.shelf_life_days')} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-medium">{t('ingredients.price_per_100')}</label>
                <input type="number" step="0.01" value={pricePer100} onChange={(e) => setPricePer100(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm focus:outline-none focus:border-primary/50" placeholder="0.00" />
              </div>
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 ${editingId ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? t('ingredients.save_changes') : t('ingredients.add_ingredient')}
          </button>
        </form>

        {/* Search */}
        <div className="mb-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder={t('ingredients.search_placeholder')}
            className="w-full bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
               <span className="material-symbols-outlined text-4xl opacity-50 mb-2">search_off</span>
               <p>{t('ingredients.empty')}</p>
            </div>
          ) : (() => {
            // Grouping logic
            const grouped = {};
            filteredIngredients.forEach(ing => {
              const groupVal = normalizeMainGroup(ing.classification?.main_group || 'other');
              if (!grouped[groupVal]) grouped[groupVal] = [];
              grouped[groupVal].push(ing);
            });

            // Sort group values (localized)
            const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
              if (a === 'other') return 1;
              if (b === 'other') return -1;
              return getGroupName(a).localeCompare(getGroupName(b));
            });

            return sortedGroupKeys.map(groupKey => (
              <div key={groupKey} className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <span className="h-[1px] flex-1 bg-primary/20"></span>
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[24px]">
                      {groupKey === 'other' ? 'inventory_2' : getGroupIcon(groupKey)}
                    </span>
                    <h3 className="text-[18px] font-black uppercase tracking-[0.2em]">
                      {groupKey === 'other' ? t('ingredients.others_group') : getGroupName(groupKey).toUpperCase()}
                    </h3>
                  </div>
                  <span className="h-[1px] flex-1 bg-primary/20"></span>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 gap-3">
                    {grouped[groupKey].map(ing => {
                      const isActive = ing.is_active !== false;
                      const isDeleted = ing.is_deleted === true;
                      const displayName = getIngredientDisplayName(ing);
                      const enName = ing.name_en || (typeof ing.name === 'object' ? ing.name.en : '');
                      const showSecondaryEn = !isEn && enName && enName.toLowerCase() !== displayName.toLowerCase();

                      return (
                        <div key={ing.id} className={`bg-surface-dark/50 border rounded-xl p-3 flex justify-between items-center group transition-colors ${isDeleted ? 'border-rose-500/30 opacity-60' : !isActive ? 'border-amber-500/30 opacity-75' : 'border-primary/10 hover:border-primary/30'}`}>
                          <div className="flex gap-3 items-center w-full overflow-hidden pr-2">
                            <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                              <span className="material-symbols-outlined text-[20px]">{ing.meta?.is_liquid ? 'water_drop' : 'kitchen'}</span>
                              {!isActive && !isDeleted && <div className="absolute -top-1 -right-1 size-3 bg-amber-500 rounded-full border-2 border-background-dark"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 onClick={() => handleEditClick(ing)} className="font-bold text-slate-100 truncate hover:text-primary cursor-pointer transition-colors flex items-center gap-1.5">
                                {ing.needs_translation && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold shrink-0">
                                    {t('ingredients.needs_translation_badge')}
                                  </span>
                                )}
                                <span>{displayName}</span>
                                {showSecondaryEn && (
                                  <span className="text-xs text-slate-400 font-normal">({enName})</span>
                                )}
                              </h4>
                              <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 mt-1 items-center">
                                <span className="bg-background-dark px-1.5 py-0.5 rounded border border-primary/10 truncate max-w-[120px]">
                                  {getSubGroupName(ing.classification?.sub_group)}
                                </span>
                                <span className="text-amber-500 ml-1">{ing.nutrition_per_100?.calories || 0} kcal</span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center">
                            {renderManageButtons(ing, isActive, displayName)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-surface-dark/50 border border-primary/10 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm text-slate-300">
                      <tbody>
                        {grouped[groupKey].map(ing => {
                          const isActive = ing.is_active !== false;
                          const isDeleted = ing.is_deleted === true;
                          const displayName = getIngredientDisplayName(ing);
                          const enName = ing.name_en || (typeof ing.name === 'object' ? ing.name.en : '');
                          const showSecondaryEn = !isEn && enName && enName.toLowerCase() !== displayName.toLowerCase();

                          return (
                            <tr key={ing.id} className={`border-b border-primary/5 hover:bg-primary/5 transition-colors ${isDeleted ? 'opacity-60' : !isActive ? 'opacity-75' : ''}`}>
                              <td className="px-3 py-2 w-full">
                                <button onClick={() => handleEditClick(ing)} className="font-bold text-slate-200 hover:text-primary transition-colors text-left text-[12px] flex items-center gap-1.5">
                                  {!isActive && !isDeleted && <span className="size-1.5 bg-amber-500 rounded-full inline-block"></span>}
                                  {ing.needs_translation && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold shrink-0">
                                      {t('ingredients.needs_translation_badge')}
                                    </span>
                                  )}
                                  <span>{displayName}</span>
                                  {showSecondaryEn && (
                                    <span className="text-[10px] text-slate-400 font-normal">({enName})</span>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-normal">({getSubGroupName(ing.classification?.sub_group)})</span>
                                </button>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end">
                                  {renderManageButtons(ing, isActive, displayName)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── CSV Import Confirmation Modal ─────────────────────────────── */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">
                  {t('ingredients.csv_modal_title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('ingredients.csv_modal_desc')}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{csvPreview.newRows.length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                  {t('ingredients.csv_new_count')}
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{csvPreview.duplicateRows.length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                  {t('ingredients.csv_duplicate_count')}
                </p>
              </div>
            </div>

            {/* Duplicates list */}
            {csvPreview.duplicateRows.length > 0 && (
              <div className="mb-5 max-h-32 overflow-y-auto space-y-1 bg-background-dark/60 rounded-xl p-3 border border-amber-500/20">
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-2">
                  {t('ingredients.csv_duplicates_list')}
                </p>
                {csvPreview.duplicateRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="material-symbols-outlined text-[12px] text-amber-500">content_copy</span>
                    <span className="font-medium text-slate-300">{r.name_bg || r.name_en}</span>
                    <span className="text-slate-600 text-[9px]">({r.slug})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {csvPreview.newRows.length > 0 && (
                <button
                  onClick={() => executeImport('new')}
                  className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {t('ingredients.csv_import_new', { count: csvPreview.newRows.length })}
                </button>
              )}

              {csvPreview.duplicateRows.length > 0 && (
                <button
                  onClick={() => executeImport('all')}
                  className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  {t('ingredients.csv_import_all', { count: csvPreview.newRows.length + csvPreview.duplicateRows.length })}
                </button>
              )}

              <button
                onClick={() => executeImport('cancel')}
                className="w-full py-3 rounded-xl border border-rose-500/30 text-rose-400 font-bold text-sm hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                {t('ingredients.csv_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageIngredients;

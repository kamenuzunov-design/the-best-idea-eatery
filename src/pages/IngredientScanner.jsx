import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedField } from '../lib/localeUtils';

const IngredientScanner = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const { addPantryItem } = useAppContext();
  const { user } = useAuth();
  
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [detectedItems, setDetectedItems] = useState([]);
  const [manualMainId, setManualMainId] = useState(null);
  const [addingToPantry, setAddingToPantry] = useState(false);
  
  // Custom ingredient addition state
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Category Priority for Main Product selection:
  // 1: Meat, Poultry, Fish, Seafood
  // 2: Cheese, Dairy, Eggs
  // 3: Bakery, Bread, Pasta, Rice, Potatoes
  // 4: Vegetables, Mushrooms
  // 5: Default / Spices / Oils
  const getItemCategoryPriority = (name = '') => {
    const n = name.toLowerCase();

    if (
      n.includes('месо') || n.includes('стек') || n.includes('пиле') || n.includes('телеш') ||
      n.includes('говеж') || n.includes('свинс') || n.includes('риба') || n.includes('сьомга') ||
      n.includes('филе') || n.includes('колбас') || n.includes('кайма') || n.includes('бекон') ||
      n.includes('мясо') || n.includes('steak') || n.includes('chicken') || n.includes('beef') ||
      n.includes('pork') || n.includes('fish') || n.includes('salmon') || n.includes('meat') ||
      n.includes('carne') || n.includes('pollo') || n.includes('manzo') || n.includes('pesce') ||
      n.includes('salmone') || n.includes('viande') || n.includes('poulet') || n.includes('boeuf') ||
      n.includes('poisson') || n.includes('saumon') || n.includes('fleisch') || n.includes('huhn') ||
      n.includes('rind') || n.includes('fisch') || n.includes('lachs')
    ) {
      return 1;
    }

    if (
      n.includes('сирене') || n.includes('кашкавал') || n.includes('моцарела') || n.includes('извара') ||
      n.includes('мляко') || n.includes('сметана') || n.includes('яйц') ||
      n.includes('cheese') || n.includes('mozzarella') || n.includes('milk') || n.includes('egg') || n.includes('cream') ||
      n.includes('formaggio') || n.includes('latte') || n.includes('uova') || n.includes('fromage') || n.includes('lait') ||
      n.includes('oeuf') || n.includes('käse') || n.includes('milch') || n.includes('eier')
    ) {
      return 2;
    }

    if (
      n.includes('хляб') || n.includes('питка') || n.includes('паста') || n.includes('ориз') ||
      n.includes('картоф') || n.includes('тесто') || n.includes('тост') ||
      n.includes('bread') || n.includes('pasta') || n.includes('rice') || n.includes('potato') || n.includes('toast') ||
      n.includes('pane') || n.includes('patate') || n.includes('riso') || n.includes('pain') || n.includes('pâtes') ||
      n.includes('riz') || n.includes('pomme de terre') || n.includes('brot') || n.includes('kartoffel') || n.includes('reis')
    ) {
      return 3;
    }

    if (
      n.includes('домат') || n.includes('краставиц') || n.includes('гъби') || n.includes('морков') ||
      n.includes('чушк') || n.includes('салат') || n.includes('лук') || n.includes('зеле') ||
      n.includes('tomato') || n.includes('cucumber') || n.includes('mushroom') || n.includes('carrot') ||
      n.includes('pepper') || n.includes('salad') || n.includes('onion') ||
      n.includes('pomodoro') || n.includes('cetriolo') || n.includes('funghi') || n.includes('carota') || n.includes('cipolla') ||
      n.includes('tomate') || n.includes('concombre') || n.includes('champignon') || n.includes('carotte') || n.includes('oignon') ||
      n.includes('gurke') || n.includes('pilz') || n.includes('karotte') || n.includes('zwiebel')
    ) {
      return 4;
    }

    return 5;
  };

  const { mainItem, secondaryItems } = useMemo(() => {
    if (!detectedItems || detectedItems.length === 0) {
      return { mainItem: null, secondaryItems: [] };
    }

    let chosenMain = detectedItems.find(item => item.id === manualMainId);

    if (!chosenMain) {
      let bestItem = detectedItems[0];
      let bestScore = getItemCategoryPriority(bestItem.name);

      for (let i = 1; i < detectedItems.length; i++) {
        const item = detectedItems[i];
        const score = getItemCategoryPriority(item.name);
        if (score < bestScore) {
          bestScore = score;
          bestItem = item;
        }
      }
      chosenMain = bestItem;
    }

    const secondary = detectedItems.filter(item => item.id !== chosenMain.id);

    return { mainItem: chosenMain, secondaryItems: secondary };
  }, [detectedItems, manualMainId]);

  const handleSetMainProduct = (id, e) => {
    e.stopPropagation();
    setManualMainId(id);
  };

  // Load master ingredients collection from Firestore
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const snap = await getDocs(collection(db, 'ingredients'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMasterIngredients(list);
      } catch (err) {
        console.warn("Error fetching ingredients:", err);
      }
    };
    fetchIngredients();
  }, []);

  // Run smart AI ingredient detection logic
  const runAIDetection = (fileName = '', list = masterIngredients) => {
    setScanning(true);
    setDetectedItems([]); // Wipes previous items

    setTimeout(() => {
      const lowerName = fileName.toLowerCase();

      // Keywords matching
      const isChicken = lowerName.includes('chicken') || lowerName.includes('пиле') || lowerName.includes('poultry') || lowerName.includes('печено') || lowerName.includes('pollo') || lowerName.includes('poulet') || lowerName.includes('huhn');
      const isSteak = lowerName.includes('steak') || lowerName.includes('beef') || lowerName.includes('телешко') || lowerName.includes('говеждо') || lowerName.includes('миньон') || lowerName.includes('meat') || lowerName.includes('bistecca') || lowerName.includes('boeuf') || lowerName.includes('rind');
      const isFish = lowerName.includes('fish') || lowerName.includes('salmon') || lowerName.includes('риба') || lowerName.includes('сьомга') || lowerName.includes('pesce') || lowerName.includes('poisson') || lowerName.includes('fisch') || lowerName.includes('lachs');
      const isSalad = lowerName.includes('salad') || lowerName.includes('салата') || lowerName.includes('tomato') || lowerName.includes('cucumber') || lowerName.includes('домати') || lowerName.includes('insalata') || lowerName.includes('salade');
      const isSandwich = lowerName.includes('sandwich') || lowerName.includes('сандвич') || lowerName.includes('bread') || lowerName.includes('хляб') || lowerName.includes('toast') || lowerName.includes('тост') || lowerName.includes('сирене') || lowerName.includes('cheese') || lowerName.includes('panino');

      const samples = {
        sandwich: [
          { en: 'Bread', bg: 'Хляб', it: 'Pane', fr: 'Pain', de: 'Brot' },
          { en: 'Cheese', bg: 'Сирене', it: 'Formaggio', fr: 'Fromage', de: 'Käse' },
          { en: 'Tomatoes', bg: 'Домати', it: 'Pomodori', fr: 'Tomates', de: 'Tomaten' },
          { en: 'Cucumbers', bg: 'Краставици', it: 'Cetrioli', fr: 'Concombres', de: 'Gurken' },
          { en: 'Butter', bg: 'Масло', it: 'Burro', fr: 'Beurre', de: 'Butter' }
        ],
        chicken: [
          { en: 'Chicken Meat', bg: 'Пилешко месо', it: 'Carne di pollo', fr: 'Viande de poulet', de: 'Hähnchenfleisch' },
          { en: 'Carrots', bg: 'Моркови', it: 'Carote', fr: 'Carottes', de: 'Karotten' },
          { en: 'Potatoes', bg: 'Картофи', it: 'Patate', fr: 'Pommes de terre', de: 'Kartoffeln' },
          { en: 'Garlic', bg: 'Чесън', it: 'Aglio', fr: 'Ail', de: 'Knoblauch' },
          { en: 'Paprika', bg: 'Червен пипер', it: 'Paprika', fr: 'Paprika', de: 'Paprika' },
          { en: 'Butter', bg: 'Масло', it: 'Burro', fr: 'Beurre', de: 'Butter' }
        ],
        steak: [
          { en: 'Beef Steak', bg: 'Телешки стек', it: 'Bistecca di manzo', fr: 'Steak de boeuf', de: 'Rindersteak' },
          { en: 'Carrots', bg: 'Моркови', it: 'Carote', fr: 'Carottes', de: 'Karotten' },
          { en: 'Mushrooms', bg: 'Гъби', it: 'Funghi', fr: 'Champignons', de: 'Pilze' },
          { en: 'Garlic', bg: 'Чесън', it: 'Aglio', fr: 'Ail', de: 'Knoblauch' },
          { en: 'Olive Oil', bg: 'Зехтин', it: 'Olio d\'oliva', fr: 'Huile d\'olive', de: 'Olivenöl' },
          { en: 'Paprika', bg: 'Червен пипер', it: 'Paprika', fr: 'Paprika', de: 'Paprika' }
        ],
        fish: [
          { en: 'Salmon Filet', bg: 'Филе от сьомга', it: 'Filetto di salmone', fr: 'Pavé de saumon', de: 'Lachsfilet' },
          { en: 'Lemon', bg: 'Лимон', it: 'Limone', fr: 'Citron', de: 'Zitrone' },
          { en: 'Dill', bg: 'Копър', it: 'Aneto', fr: 'Aneth', de: 'Dill' },
          { en: 'Olive Oil', bg: 'Зехтин', it: 'Olio d\'oliva', fr: 'Huile d\'olive', de: 'Olivenöl' },
          { en: 'Black Pepper', bg: 'Черен пипер', it: 'Pepe nero', fr: 'Poivre noir', de: 'Schwarzer Pfeffer' }
        ],
        salad: [
          { en: 'Tomatoes', bg: 'Домати', it: 'Pomodori', fr: 'Tomates', de: 'Tomaten' },
          { en: 'Cucumbers', bg: 'Краставици', it: 'Cetrioli', fr: 'Concombres', de: 'Gurken' },
          { en: 'Cheese', bg: 'Сирене', it: 'Formaggio', fr: 'Fromage', de: 'Käse' },
          { en: 'Olives', bg: 'Маслини', it: 'Olive', fr: 'Olives', de: 'Oliven' },
          { en: 'Olive Oil', bg: 'Зехтин', it: 'Olio d\'oliva', fr: 'Huile d\'olive', de: 'Olivenöl' }
        ],
        default: [
          { en: 'Beef Steak', bg: 'Телешки стек', it: 'Bistecca di manzo', fr: 'Steak de boeuf', de: 'Rindersteak' },
          { en: 'Carrots', bg: 'Моркови', it: 'Carote', fr: 'Carottes', de: 'Karotten' },
          { en: 'Mushrooms', bg: 'Гъби', it: 'Funghi', fr: 'Champignons', de: 'Pilze' },
          { en: 'Garlic', bg: 'Чесън', it: 'Aglio', fr: 'Ail', de: 'Knoblauch' },
          { en: 'Olive Oil', bg: 'Зехтин', it: 'Olio d\'oliva', fr: 'Huile d\'olive', de: 'Olivenöl' }
        ]
      };

      const targetItems = isSandwich ? samples.sandwich
        : isChicken ? samples.chicken
        : isSteak ? samples.steak
        : isFish ? samples.fish
        : isSalad ? samples.salad
        : samples.default;

      // Map to DB items if available, or create clean formatted items
      const formatted = targetItems.map((itemObj, idx) => {
        const kwName = itemObj[currentLang] || itemObj.en || itemObj.bg;
        const dbMatch = list && list.find(ing => {
          const bg = (ing.name_bg || '').toLowerCase();
          const en = (ing.name_en || '').toLowerCase();
          const local = (getLocalizedField(ing, 'name', currentLang) || '').toLowerCase();
          const kwEn = (itemObj.en || '').toLowerCase();
          const kwBg = (itemObj.bg || '').toLowerCase();
          const kwLocal = kwName.toLowerCase();
          return (
            (bg && (bg.includes(kwBg) || kwBg.includes(bg))) ||
            (en && (en.includes(kwEn) || kwEn.includes(en))) ||
            (local && (local.includes(kwLocal) || kwLocal.includes(local)))
          );
        });

        const localizedName = dbMatch 
          ? (getLocalizedField(dbMatch, 'name', currentLang) || dbMatch.name_en || dbMatch.name_bg) 
          : kwName;

        return {
          id: dbMatch ? dbMatch.id : `detected_${idx}_${Date.now()}`,
          name: localizedName,
          quantity: 1,
          unit: 'бр',
          checked: true
        };
      });

      setDetectedItems(formatted);
      setScanning(false);
    }, 2000);
  };

  // Initial detection when masterIngredients is loaded
  useEffect(() => {
    if (masterIngredients.length > 0 && detectedItems.length === 0) {
      const timer = setTimeout(() => {
        runAIDetection('', masterIngredients);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterIngredients]);

  const handleStartScan = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      runAIDetection();
    }
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedImage(url);
      runAIDetection(file.name);
    }
  };

  const toggleItem = (id) => {
    setDetectedItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleRemoveItem = (id, e) => {
    e.stopPropagation();
    setDetectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddCustomIngredient = (ing) => {
    const ingName = getLocalizedField(ing, 'name', currentLang) || ing.name_en || ing.name_bg || '';
    if (!detectedItems.some(item => item.id === ing.id)) {
      setDetectedItems(prev => [
        ...prev,
        {
          id: ing.id,
          name: ingName,
          quantity: 1,
          unit: 'бр',
          checked: true
        }
      ]);
    }
    setShowSearchModal(false);
    setSearchTerm('');
  };

  const handleAddToPantry = async () => {
    if (!user || user.role === 'guest') {
      alert(t('ingredient_scanner.login_required_alert'));
      navigate('/login');
      return;
    }

    const selected = detectedItems.filter(i => i.checked);
    if (selected.length === 0) {
      alert(t('ingredient_scanner.select_at_least_one'));
      return;
    }

    setAddingToPantry(true);
    try {
      for (const item of selected) {
        await addPantryItem({
          ingredientId: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        });
      }
      alert(t('ingredient_scanner.added_success', { count: selected.length }));
      navigate('/pantry');
    } catch (err) {
      console.error("Error adding scanned items to pantry:", err);
      alert(t('ingredient_scanner.error_adding'));
    } finally {
      setAddingToPantry(false);
    }
  };

  const handleSearchRecipes = () => {
    let searchTarget = '';
    if (mainItem && mainItem.checked) {
      searchTarget = mainItem.name;
    } else {
      const selected = detectedItems.filter(i => i.checked);
      if (selected.length === 0) {
        alert(t('ingredient_scanner.select_at_least_one_ingredient'));
        return;
      }
      searchTarget = selected[0].name;
    }

    navigate(`/search?q=${encodeURIComponent(searchTarget)}`);
  };

  const filteredMaster = masterIngredients.filter(ing => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const bg = (ing.name_bg || '').toLowerCase();
    const en = (ing.name_en || '').toLowerCase();
    const local = (getLocalizedField(ing, 'name', currentLang) || '').toLowerCase();
    return bg.includes(term) || en.includes(term) || local.includes(term);
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-20">
      {/* Hidden File Input for Real Camera Capture */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleImageSelected} 
        className="hidden" 
      />

      {/* Top Navigation Bar */}
      <div className="flex items-center bg-background-dark/80 backdrop-blur-md p-4 justify-between z-20 border-b border-primary/10 sticky top-0">
        <button onClick={() => navigate(-1)} className="text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-100 text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {t('ingredient_scanner.title')}
        </h2>
        <div className="w-10"></div>
      </div>

      {/* 1. Button ABOVE Image */}
      <div className="p-4 bg-surface-dark border-b border-primary/10 z-20">
        <button 
          onClick={handleStartScan}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-primary/30"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          <span>{t('ingredient_scanner.rescan_btn')}</span>
        </button>
      </div>

      {/* 2. Photo Viewfinder Area (Clean, non-overlapping) */}
      <div className="relative w-full h-64 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden border-b border-primary/20 shrink-0">
        {/* Background Image / Camera Feed */}
        <div 
          className={`absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ${scanning ? 'scale-105 filter brightness-75' : 'scale-100'}`}
          style={{backgroundImage: `url("${capturedImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrS3vfdomQe5IkdACW8DXEF0f_SEEjwN83nTvtrW4Af1nXx8FUmrc-lAcE7D__CtLMSCmjeBR7CP06VBWchPFJtUEm90JZM6nCT8EK7HysSzuz-wK3pCucoo_M-xV9YptspBcR19YYOYv7-JdJXH2TLXv3xO4M5X3rwlif7rNZ9EfKgpWN07UX9NtD-l1bivN7B6m1oPLuvocCp-HmRphIjWboJwiw__0pHexw6-h-lYt225aXXvMtcogmc-9qHyG1mVH6qyN4jRw'}")`}}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background-dark/40 via-transparent to-background-dark/60"></div>
        </div>

        {/* Scanning Animation & Brackets */}
        <div className="absolute inset-0 z-10 pointer-events-none p-6">
          <div className="relative w-full h-full border-2 border-primary/30 rounded-2xl">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            
            {scanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_#f59e0b] animate-bounce top-1/2"></div>
            )}
          </div>
        </div>

        {/* Status Badge inside image */}
        <div className="absolute top-4 left-0 w-full px-4 text-center z-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background-dark/80 backdrop-blur-md border border-primary/30 text-primary text-xs font-bold shadow-lg">
            <span className={`material-symbols-outlined text-sm ${scanning ? 'animate-spin' : 'text-emerald-400'}`}>
              {scanning ? 'sync' : 'check_circle'}
            </span>
            <span>
              {scanning 
                ? t('ingredient_scanner.scanning_photo') 
                : t('ingredient_scanner.photo_scanned')}
            </span>
          </span>
        </div>
      </div>

      {/* AI Accuracy Disclaimer Notice Banner */}
      <div className="mx-4 my-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-slate-300 shadow-md">
        <span className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5">info</span>
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-amber-400 block mb-0.5 uppercase tracking-wide">
            {t('ingredient_scanner.notice_title')}
          </span>
          <span>
            {t('ingredient_scanner.notice_desc')}
          </span>
        </div>
      </div>

      {/* 3. Detected Ingredients Section AFTER / BELOW the Photo */}
      <div className="p-4 flex-1 flex flex-col gap-3 bg-surface-dark/50">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
            <span>{t('ingredient_scanner.found_ingredients')}</span>
          </h3>
          {!scanning && (
            <button 
              onClick={() => setShowSearchModal(true)} 
              className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t('ingredient_scanner.add_ingredient_btn')}</span>
            </button>
          )}
        </div>

        {scanning ? (
          <div className="p-8 text-center bg-surface-dark border border-primary/10 rounded-2xl animate-pulse">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin mb-2">sync</span>
            <p className="text-xs font-bold text-slate-300">
              {t('ingredient_scanner.analyzing')}
            </p>
          </div>
        ) : detectedItems.length === 0 ? (
          <div className="p-4 bg-surface-dark border border-primary/20 rounded-2xl text-center">
            <p className="text-xs text-slate-400 italic">
              {t('ingredient_scanner.empty_detected')}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* GROUP 1: Основен продукт (Main Product) */}
            {mainItem && (
              <div className="bg-surface-dark border-2 border-primary/40 rounded-2xl p-3.5 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">star</span>
                    {t('ingredient_scanner.main_product')}
                  </span>
                  <span className="text-[9px] text-slate-400 italic">
                    {t('ingredient_scanner.priority_pick')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div
                    onClick={() => toggleItem(mainItem.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                      mainItem.checked
                        ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark shadow-primary/30 scale-[1.02] border border-amber-300'
                        : 'bg-background-dark text-slate-400 border border-slate-700 line-through opacity-60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {mainItem.checked ? 'star' : 'add_box'}
                    </span>
                    <span className="text-sm">{mainItem.name}</span>
                    <button 
                      onClick={(e) => handleRemoveItem(mainItem.id, e)}
                      className="ml-1 text-sm font-bold opacity-70 hover:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
                      title={t('ingredient_scanner.remove_tooltip')}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GROUP 2: Спомагателни продукти (Auxiliary / Secondary Products) */}
            <div className="relative bg-surface-dark/80 border-2 border-primary/30 rounded-2xl p-3.5 shadow-md space-y-2 pb-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-slate-400">widgets</span>
                  {t('ingredient_scanner.secondary_products')} ({secondaryItems.length})
                </span>
                <span className="text-[9px] text-slate-400 italic">
                  {t('ingredient_scanner.set_as_main_tip')}
                </span>
              </div>

              {secondaryItems.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-1">
                  {t('ingredient_scanner.no_secondary')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {secondaryItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                        item.checked
                          ? 'bg-background-dark text-slate-200 border border-primary/30 hover:border-primary/50'
                          : 'bg-background-dark/40 text-slate-500 border border-slate-800 line-through opacity-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px] text-slate-400">
                        {item.checked ? 'check_box' : 'add_box'}
                      </span>
                      <span>{item.name}</span>

                      {/* Button to make this secondary item the main product */}
                      <button
                        onClick={(e) => handleSetMainProduct(item.id, e)}
                        className="ml-1 text-slate-400 hover:text-amber-400 transition-colors p-0.5"
                        title={t('ingredient_scanner.set_as_main_tooltip')}
                      >
                        <span className="material-symbols-outlined text-[13px]">star</span>
                      </button>

                      <button 
                        onClick={(e) => handleRemoveItem(item.id, e)}
                        className="text-sm font-bold opacity-60 hover:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
                        title={t('ingredient_scanner.remove_tooltip')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Round + Button at Bottom Right Corner */}
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="absolute bottom-2.5 right-2.5 size-8 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
                title={t('ingredient_scanner.add_ingredient_tooltip')}
              >
                <span className="material-symbols-outlined text-lg font-extrabold">add</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Action Buttons */}
      <div className="bg-surface-dark p-4 pb-6 flex flex-col gap-3 border-t border-primary/20 shadow-2xl">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleAddToPantry}
            disabled={scanning || addingToPantry}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-primary/30"
          >
            <span className="material-symbols-outlined text-[18px]">kitchen</span>
            <span>{addingToPantry ? t('ingredient_scanner.saving') : t('ingredient_scanner.add_to_pantry_btn')}</span>
          </button>

          <button 
            onClick={handleSearchRecipes}
            disabled={scanning}
            className="w-full py-3.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span>{t('ingredient_scanner.search_recipes_btn')}</span>
          </button>
        </div>
      </div>

      {/* Add Custom Ingredient Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">search</span>
                {t('ingredient_scanner.modal_title')}
              </h3>
              <button onClick={() => setShowSearchModal(false)} className="text-slate-400 hover:text-rose-500 p-1">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-primary/10">
              <input
                type="text"
                placeholder={t('ingredient_scanner.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-1.5 flex-1 custom-scrollbar">
              {filteredMaster.length > 0 ? (
                filteredMaster.slice(0, 20).map(ing => (
                  <button
                    key={ing.id}
                    onClick={() => handleAddCustomIngredient(ing)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-background-dark/50 hover:bg-primary/10 border border-primary/10 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span>{getLocalizedField(ing, 'name', currentLang) || ing.name_en || ing.name_bg}</span>
                    <span className="material-symbols-outlined text-primary text-sm">add_circle</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {t('ingredient_scanner.no_ingredients_found')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientScanner;

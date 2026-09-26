import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizeMainGroup, getMainGroupLabel } from '../lib/recipeMetaUtils';
import { getLocalizedField } from '../lib/localeUtils';

const getGroupIcon = (val) => {
  const v = String(val || '').toLowerCase();
  if (v.includes('veg') || v.includes('зеленчуци')) return 'eco';
  if (v.includes('fruit') || v.includes('плодове')) return 'nutrition';
  if (v.includes('meat') || v.includes('месо')) return 'kebab_dining';
  if (v.includes('fish') || v.includes('риба') || v.includes('sea')) return 'set_meal';
  if (v.includes('dairy') || v.includes('млечни')) return 'water_drop';
  if (v.includes('spice') || v.includes('подправки')) return 'spa';
  if (v.includes('grain') || v.includes('зърнени')) return 'grass';
  if (v.includes('bakery') || v.includes('тестени')) return 'bakery_dining';
  if (v.includes('sweet') || v.includes('десерт')) return 'icecream';
  if (v.includes('drink') || v.includes('напитки')) return 'local_drink';
  if (v.includes('oil') || v.includes('мазнини')) return 'oil_barrel';
  if (v.includes('egg') || v.includes('яйца')) return 'egg';
  if (v.includes('nut') || v.includes('ядки')) return 'nut';
  return 'category';
};

const Pantry = () => {
  const { pantry, addPantryItem, updatePantryItem, removePantryItem } = useAppContext();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'bg';

  const getItemName = (item) => {
    if (!item) return '';
    return getLocalizedField(item, 'name', currentLang) || 
      (currentLang === 'bg' ? item.nameBg : item.nameEn) || 
      item.nameEn || item.nameBg || item.name || '';
  };

  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [measurementsDB, setMeasurementsDB] = useState([]);
  const [ingredientGroupsDB, setIngredientGroupsDB] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [newItem, setNewItem] = useState({ quantity: '', unit: 'g', expirationDate: '' });

  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');

  // Fetch reference data
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const iSnap = await getDocs(collection(db, 'ingredients'));
        setIngredientsDB(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const mSnap = await getDocs(collection(db, 'measurements'));
        setMeasurementsDB(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const gSnap = await getDocs(collection(db, 'ingredient_groups'));
        setIngredientGroupsDB(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchRefs();
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q) {
      setFilteredIngredients([]);
      return;
    }
    const lowerQ = q.toLowerCase();
    const matches = ingredientsDB.filter(ing => {
      const nameBg = (ing.name_bg || ing.name?.bg || '').toLowerCase();
      const nameEn = (ing.name_en || ing.name?.en || '').toLowerCase();
      const nameIt = (ing.name_it || ing.name?.it || '').toLowerCase();
      const nameFr = (ing.name_fr || ing.name?.fr || '').toLowerCase();
      const nameDe = (ing.name_de || ing.name?.de || '').toLowerCase();
      const nameGeneric = (ing.name && typeof ing.name === 'string' ? ing.name : '').toLowerCase();
      return nameBg.includes(lowerQ) || nameEn.includes(lowerQ) || nameIt.includes(lowerQ) || 
             nameFr.includes(lowerQ) || nameDe.includes(lowerQ) || nameGeneric.includes(lowerQ);
    }).filter(ing => ing.is_active !== false && ing.is_deleted !== true);
    
    setFilteredIngredients(matches.slice(0, 8));
  };

  const selectIngredient = (ing) => {
    setSelectedIngredient(ing);
    const localizedName = getLocalizedField(ing, 'name', currentLang) || ing.name || ing.name_bg || ing.name_en || '';
    setSearchQuery(localizedName);
    setFilteredIngredients([]);
    
    // Calculate default expiration date (currentDate + average_shelf_life_days)
    const days = ing.meta?.average_shelf_life_days || 7;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + days);
    const dateString = defaultDate.toISOString().split('T')[0];
    
    // Determine default unit from units_mapping if available
    let defaultUnit = 'g';
    if (ing.units_mapping && ing.units_mapping.length > 0) {
      defaultUnit = ing.units_mapping[0].unit_id;
    } else if (measurementsDB.length > 0) {
      defaultUnit = measurementsDB[0].unit_id || measurementsDB[0].id;
    }
    
    setNewItem(prev => ({
      ...prev,
      unit: defaultUnit,
      expirationDate: dateString
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedIngredient || !newItem.quantity || !newItem.expirationDate) return;
    
    addPantryItem({
      ingredientId: selectedIngredient.id,
      nameBg: selectedIngredient.name_bg || selectedIngredient.name?.bg || selectedIngredient.name_en || selectedIngredient.name,
      nameEn: selectedIngredient.name_en || selectedIngredient.name?.en || selectedIngredient.name_bg || selectedIngredient.name,
      nameIt: selectedIngredient.name_it || selectedIngredient.name?.it,
      nameFr: selectedIngredient.name_fr || selectedIngredient.name?.fr,
      nameDe: selectedIngredient.name_de || selectedIngredient.name?.de,
      name: selectedIngredient.name || {
        bg: selectedIngredient.name_bg,
        en: selectedIngredient.name_en
      },
      category: selectedIngredient.classification?.main_group || 'other',
      quantity: Number(newItem.quantity),
      unit: newItem.unit,
      expirationDate: newItem.expirationDate
    });
    
    setSearchQuery('');
    setSelectedIngredient(null);
    setNewItem({ quantity: '', unit: 'g', expirationDate: '' });
    setShowAddModal(false);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
    setEditExpirationDate(item.expirationDate || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    updatePantryItem(editingItem.id, {
      quantity: Number(editQuantity),
      unit: editUnit,
      expirationDate: editExpirationDate
    });
    setEditingItem(null);
    setShowEditModal(false);
  };

  const getDaysUntilExpiration = (dateString) => {
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getGroupName = (val) => {
    if (!val) return '-';
    const normVal = normalizeMainGroup(val);
    let group = ingredientGroupsDB.find(g => {
      if (!g) return false;
      const gId = String(g.id || '').toLowerCase();
      const gBg = String(g.name?.bg || g.name_bg || '').toLowerCase();
      const gEn = String(g.name?.en || g.name_en || '').toLowerCase();
      return gId === String(val).toLowerCase() || gBg === String(val).toLowerCase() || gEn === String(val).toLowerCase() ||
             normalizeMainGroup(gId) === normVal || normalizeMainGroup(gBg) === normVal || normalizeMainGroup(gEn) === normVal;
    });
    if (group) {
      return getLocalizedField(group, 'name', currentLang) || group.name?.[currentLang] || group.name?.bg || group.name?.en || getMainGroupLabel(val, currentLang);
    }
    return getMainGroupLabel(val, currentLang);
  };

  const getUnitName = (unitId) => {
    if (!unitId) return '';
    const norm = String(unitId).toLowerCase().trim();
    const unitTranslationKey = `pantry.units.${norm}`;
    if (i18n.exists(unitTranslationKey)) {
      return t(unitTranslationKey);
    }

    const found = measurementsDB.find(m => (m.unit_id === unitId || m.id === unitId));
    if (found) {
      return getLocalizedField(found, 'name', currentLang) || found.name_bg || found.name_en || found.name || unitId;
    }
    return unitId;
  };

  const getAddUnitsOptions = () => {
    if (!selectedIngredient) {
      return measurementsDB.length > 0
        ? measurementsDB.map(m => m.unit_id || m.id)
        : ['g', 'kg', 'ml', 'pcs'];
    }
    let units = [];
    if (selectedIngredient.units_mapping && selectedIngredient.units_mapping.length > 0) {
      units = selectedIngredient.units_mapping.map(u => u.unit_id);
    } else {
      units = measurementsDB.length > 0
        ? measurementsDB.map(m => m.unit_id || m.id)
        : ['g', 'kg', 'ml', 'pcs'];
    }
    if (newItem.unit && !units.includes(newItem.unit)) {
      units = [newItem.unit, ...units];
    }
    return units;
  };

  const getEditUnitsOptions = () => {
    if (!editingItem) return ['g', 'kg', 'ml', 'pcs'];
    const ing = ingredientsDB.find(i => i.id === editingItem.ingredientId);
    let units = [];
    if (ing?.units_mapping?.length > 0) {
      units = ing.units_mapping.map(u => u.unit_id);
    } else {
      units = measurementsDB.length > 0
        ? measurementsDB.map(m => m.unit_id || m.id)
        : ['g', 'kg', 'ml', 'pcs'];
    }
    if (editingItem.unit && !units.includes(editingItem.unit)) {
      units = [editingItem.unit, ...units];
    }
    return units;
  };

  return (
    <div className="flex-1 pb-32 relative flex flex-col min-h-screen bg-background-dark">
      {/* Dietary Profile Button */}
      <div className="px-4 py-4 bg-surface-dark border-b border-primary/20 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">health_and_safety</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
              {t('pantry.dietary_profile')}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase">
              {t('pantry.dietary_subtitle')}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/pantry/diet')}
          className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all active:scale-95 px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          {t('pantry.edit_btn')}
        </button>
      </div>

      <div className="px-4 py-4 flex justify-between items-end border-b border-primary/10">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <h3 className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-1">{t('pantry.subtitle')}</h3>
            <h2 className="text-2xl font-extrabold text-slate-100 leading-none">{t('pantry.title')}</h2>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-extrabold uppercase tracking-wider bg-primary text-background-dark hover:bg-primary/90 hover:scale-105 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_4px_12px_rgba(212,175,53,0.15)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] font-black">add</span>
              {t('pantry.add_btn')}
            </button>
            <button 
              type="button"
              onClick={() => navigate('/ai-assistant')}
              className="text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-[#b8860b] text-background-dark hover:scale-105 transition-all active:scale-95 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[0_4px_12px_rgba(212,175,53,0.15)] cursor-pointer"
              title={t('pantry.chef_ai_btn')}
            >
              <span className="material-symbols-outlined text-[16px] font-black">auto_awesome</span>
              {t('pantry.chef_ai_btn')}
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-bold bg-surface-dark border border-primary/20 px-3 py-1 rounded-full shadow-inner">
          {pantry.length === 1 ? t('pantry.items_count_one', { count: pantry.length }) : t('pantry.items_count_other', { count: pantry.length })}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {pantry.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <span className="material-symbols-outlined text-6xl text-primary mb-2">kitchen</span>
            <p className="text-slate-200">{t('pantry.empty')}</p>
          </div>
        ) : (() => {
          // Grouping logic
          const grouped = {};
          pantry.forEach(item => {
            const groupVal = normalizeMainGroup(item.category || 'other');
            if (!grouped[groupVal]) grouped[groupVal] = [];
            grouped[groupVal].push(item);
          });

          // Sort groups (localized)
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
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">
                    {groupKey === 'other' ? t('pantry.others').toUpperCase() : getGroupName(groupKey).toUpperCase()}
                  </h3>
                </div>
                <span className="h-[1px] flex-1 bg-primary/20"></span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {grouped[groupKey].map(item => {
                  const daysLeft = getDaysUntilExpiration(item.expirationDate);
                  const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
                  const isExpired = daysLeft < 0;
                  const name = getItemName(item);

                  return (
                    <div key={item.id} className="bg-surface-dark/50 border border-primary/10 hover:border-primary/30 rounded-xl p-3 flex justify-between items-center group/card transition-all duration-300">
                      <div className="flex gap-3 items-center w-full overflow-hidden pr-2">
                        <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                          {item.imageUrl && !item.imageUrl.includes('placeholder') ? (
                            <img alt={name} className="w-full h-full object-cover rounded-full" src={item.imageUrl} />
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">{getGroupIcon(item.category)}</span>
                          )}
                          {isExpired && <div className="absolute -top-1 -right-1 size-3 bg-rose-500 rounded-full border-2 border-background-dark"></div>}
                          {!isExpired && isExpiringSoon && <div className="absolute -top-1 -right-1 size-3 bg-amber-500 rounded-full border-2 border-background-dark"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 
                            onClick={() => handleEditClick(item)} 
                            className="font-bold text-slate-100 truncate hover:text-primary cursor-pointer transition-colors text-sm"
                          >
                            {name}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1 items-center">
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-extrabold uppercase">
                              {item.quantity} <span className="text-[9px] font-medium text-primary/70">{getUnitName(item.unit)}</span>
                            </span>
                            <span className={`font-bold flex items-center gap-1 uppercase tracking-widest text-[9px] ${isExpired ? 'text-rose-500' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-400'}`}>
                              <span className="material-symbols-outlined text-[12px]">event</span>
                              {isExpired ? t('pantry.expired_badge') : t('pantry.in_days', { count: daysLeft })}
                            </span>
                          </div>
                          {/* Mini Expiration Progress Line */}
                          <div className="mt-2 h-1 w-full bg-background-dark/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isExpired ? 'bg-rose-500 w-full' : isExpiringSoon ? 'bg-amber-500 w-1/4' : 'bg-gradient-to-r from-emerald-600 to-emerald-400 w-3/4'}`}></div>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={() => handleEditClick(item)} 
                          className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg" 
                          title={t('pantry.edit_btn')}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button 
                          onClick={() => { if(window.confirm(t('pantry.delete_confirm', { name }))) removePantryItem(item.id); }} 
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg" 
                          title={t('pantry.delete_btn')}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto z-40 flex justify-end px-6 pointer-events-none">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-br from-primary to-[#b8860b] size-14 rounded-full flex items-center justify-center text-background-dark shadow-[0_5px_20px_rgba(212,175,53,0.5)] border border-white/20 hover:scale-110 active:scale-95 transition-all duration-300 pointer-events-auto"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-background-dark/50 rounded-full p-1 border border-primary/20">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <h3 className="text-base font-extrabold text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              {t('pantry.add_modal_title')}
            </h3>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Ingredient Search */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.search_label')}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-background-dark border border-primary/30 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:ring-primary focus:border-primary shadow-inner" 
                    placeholder={t('pantry.search_placeholder')}
                    required={!selectedIngredient}
                  />
                </div>
                
                {/* Autocomplete Dropdown */}
                {filteredIngredients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-dark border border-primary/30 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {filteredIngredients.map(ing => (
                      <div 
                        key={ing.id} 
                        onClick={() => selectIngredient(ing)}
                        className="px-4 py-2 hover:bg-primary/20 cursor-pointer flex items-center gap-2 border-b border-white/5 last:border-0"
                      >
                        <span className="material-symbols-outlined text-primary/50 text-[18px]">{getGroupIcon(ing.classification?.main_group)}</span>
                        <span className="text-sm font-bold text-slate-200">{getLocalizedField(ing, 'name', currentLang) || ing.name_bg || ing.name_en || ing.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedIngredient && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-inner mb-4">
                  <span>{t('pantry.selected_product')}</span>
                  <span className="text-slate-100 flex items-center gap-1 truncate max-w-[150px]">
                     <span className="material-symbols-outlined text-[14px]">check_circle</span>
                     {getLocalizedField(selectedIngredient, 'name', currentLang) || selectedIngredient.name_bg || selectedIngredient.name_en || selectedIngredient.name}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.quantity')} *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner text-center font-bold" 
                    required 
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.unit')}</label>
                  <select 
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner font-bold"
                  >
                    {getAddUnitsOptions().map(u => (
                      <option key={u} value={u}>
                        {getUnitName(u)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.expiration')} *</label>
                <input 
                  type="date" 
                  value={newItem.expirationDate}
                  onChange={e => setNewItem({...newItem, expirationDate: e.target.value})}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner font-bold" 
                  style={{ colorScheme: 'dark' }}
                  required 
                />
              </div>
              
              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={!selectedIngredient}
                  className={`w-full py-4 rounded-xl font-black shadow-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedIngredient ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark hover:scale-[1.02] active:scale-95' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  {t('pantry.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-blue-500/30 rounded-3xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative bg-blue-500/5">
            <button 
              onClick={() => { setShowEditModal(false); setEditingItem(null); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-background-dark/50 rounded-full p-1 border border-blue-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <h3 className="text-base font-extrabold text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-blue-400">edit_note</span>
              {t('pantry.edit_modal_title')}
            </h3>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.product_label')}</label>
                <input 
                  type="text" 
                  value={getItemName(editingItem)}
                  disabled
                  className="w-full bg-background-dark/50 border border-white/10 rounded-xl p-3 text-slate-400 shadow-inner font-bold cursor-not-allowed opacity-60" 
                />
              </div>

              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.quantity')} *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editQuantity}
                    onChange={e => setEditQuantity(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner text-center font-bold" 
                    required 
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.unit')}</label>
                  <select 
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner font-bold"
                  >
                    {getEditUnitsOptions().map(u => (
                      <option key={u} value={u}>
                        {getUnitName(u)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.expiration')} *</label>
                <input 
                  type="date" 
                  value={editExpirationDate}
                  onChange={e => setEditExpirationDate(e.target.value)}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner font-bold" 
                  style={{ colorScheme: 'dark' }}
                  required 
                />
              </div>
              
              <div className="pt-6">
                <button 
                  type="submit"
                  className="w-full py-4 rounded-xl font-black shadow-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:scale-[1.02] active:scale-95 border border-cyan-500/30"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {t('pantry.save_changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pantry;

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const [diet, setDiet] = useState(user?.preferences?.diet || []);
  const [allergies, setAllergies] = useState(user?.preferences?.allergies || []);
  const [exclusions, setExclusions] = useState(user?.preferences?.exclusions || []);
  const [isSavingPref, setIsSavingPref] = useState(false);

  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [measurementsDB, setMeasurementsDB] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [newItem, setNewItem] = useState({ quantity: '', unit: 'g', expirationDate: '' });

  const [editingItemId, setEditingItemId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Fetch reference data
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const iSnap = await getDocs(collection(db, 'ingredients'));
        setIngredientsDB(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const mSnap = await getDocs(collection(db, 'measurements'));
        setMeasurementsDB(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchRefs();
  }, []);

  // Update User Preferences
  const handleSavePreferences = async () => {
    if (!user || user.role === 'guest') return;
    setIsSavingPref(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'preferences.diet': diet,
        'preferences.allergies': allergies,
        'preferences.exclusions': exclusions
      });
      alert(isBg ? 'Диетичният профил е запазен!' : 'Dietary profile saved!');
    } catch (err) {
      console.error(err);
      alert('Error saving preferences');
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleAddTag = (list, setter) => {
    const val = prompt(isBg ? 'Въведете на АНГЛИЙСКИ (напр. vegan, gluten-free, peanuts):' : 'Enter tag in ENGLISH (e.g. vegan, peanuts):');
    if (val && val.trim()) {
      const lower = val.trim().toLowerCase();
      if (!list.includes(lower)) setter([...list, lower]);
    }
  };

  const handleRemoveTag = (list, setter, tagToRemove) => {
    setter(list.filter(t => t !== tagToRemove));
  };

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

  const selectIngredient = (ing) => {
    setSelectedIngredient(ing);
    setSearchQuery(isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg));
    setFilteredIngredients([]);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedIngredient || !newItem.quantity || !newItem.expirationDate) return;
    
    addPantryItem({
      ingredientId: selectedIngredient.id,
      nameBg: selectedIngredient.name_bg || selectedIngredient.name_en,
      nameEn: selectedIngredient.name_en || selectedIngredient.name_bg,
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

  const handleUpdateQuantity = (item) => {
    if (editQuantity) {
      updatePantryItem(item.id, { quantity: Number(editQuantity) });
    }
    setEditingItemId(null);
    setEditQuantity('');
  };

  const getDaysUntilExpiration = (dateString) => {
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex-1 pb-32 relative flex flex-col min-h-screen bg-background-dark">
      {/* Dietary Profile Section */}
      <div className="px-4 py-4 bg-surface-dark border-b border-primary/20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2 uppercase tracking-tighter">
            <span className="material-symbols-outlined text-primary">health_and_safety</span>
            {isBg ? 'Моят Диетичен Профил' : 'My Dietary Profile'}
          </h2>
          <button 
            onClick={handleSavePreferences} 
            disabled={isSavingPref}
            className="text-xs bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-primary/30 transition-all active:scale-95"
          >
            {isSavingPref ? '...' : (isBg ? 'Запази' : 'Save')}
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Diets */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isBg ? 'Диети' : 'Diets'}</span>
              <button onClick={() => handleAddTag(diet, setDiet)} className="text-primary hover:text-white transition-colors"><span className="material-symbols-outlined text-[14px]">add_circle</span></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {diet.length === 0 && <span className="text-xs text-slate-500 italic">{isBg ? 'Няма' : 'None'}</span>}
              {diet.map(d => (
                <span key={d} className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1">
                  {d} <span onClick={() => handleRemoveTag(diet, setDiet, d)} className="material-symbols-outlined text-[12px] cursor-pointer hover:text-rose-400">close</span>
                </span>
              ))}
            </div>
          </div>
          
          {/* Allergies */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isBg ? 'Алергии' : 'Allergies'}</span>
              <button onClick={() => handleAddTag(allergies, setAllergies)} className="text-primary hover:text-white transition-colors"><span className="material-symbols-outlined text-[14px]">add_circle</span></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergies.length === 0 && <span className="text-xs text-slate-500 italic">{isBg ? 'Няма' : 'None'}</span>}
              {allergies.map(a => (
                <span key={a} className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1">
                  {a} <span onClick={() => handleRemoveTag(allergies, setAllergies, a)} className="material-symbols-outlined text-[12px] cursor-pointer hover:text-white">close</span>
                </span>
              ))}
            </div>
          </div>
          
          {/* Exclusions */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isBg ? 'Изключени храни' : 'Exclusions'}</span>
              <button onClick={() => handleAddTag(exclusions, setExclusions)} className="text-primary hover:text-white transition-colors"><span className="material-symbols-outlined text-[14px]">add_circle</span></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exclusions.length === 0 && <span className="text-xs text-slate-500 italic">{isBg ? 'Няма' : 'None'}</span>}
              {exclusions.map(ex => (
                <span key={ex} className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1">
                  {ex} <span onClick={() => handleRemoveTag(exclusions, setExclusions, ex)} className="material-symbols-outlined text-[12px] cursor-pointer hover:text-rose-400">close</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex justify-between items-end border-b border-primary/10">
        <div>
          <h3 className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-1">{t('pantry.subtitle')}</h3>
          <h2 className="text-2xl font-extrabold text-slate-100">{t('pantry.title')}</h2>
        </div>
        <div className="text-xs text-slate-400 font-bold bg-surface-dark border border-primary/20 px-3 py-1 rounded-full shadow-inner">
          {pantry.length} {isBg ? 'продукта' : 'items'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-6">
        {pantry.length === 0 && (
          <div className="text-center py-10 opacity-50">
            <span className="material-symbols-outlined text-6xl text-primary mb-2">kitchen</span>
            <p className="text-slate-200">{isBg ? 'Килерът е празен.' : 'Pantry is empty.'}</p>
          </div>
        )}
        
        {pantry.map(item => {
          const daysLeft = getDaysUntilExpiration(item.expirationDate);
          const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
          const isExpired = daysLeft < 0;
          const name = isBg ? item.nameBg : item.nameEn;
          const isEditing = editingItemId === item.id;
          
          return (
            <div key={item.id} className="bg-surface-dark/80 backdrop-blur-xl border border-primary/15 rounded-2xl p-4 flex gap-4 items-center shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition-all group">
              <div className="relative size-16 rounded-xl shrink-0 flex items-center justify-center bg-background-dark/50 border border-primary/10 text-primary">
                {item.imageUrl && !item.imageUrl.includes('placeholder') ? (
                   <img alt={name} className="w-full h-full object-cover rounded-xl" src={item.imageUrl} />
                ) : (
                   <span className="material-symbols-outlined text-3xl">{getGroupIcon(item.category)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="truncate">
                    <h4 className="text-slate-100 font-bold text-base truncate">{name}</h4>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input 
                        type="number" step="0.01" 
                        value={editQuantity} 
                        onChange={e => setEditQuantity(e.target.value)} 
                        className="w-16 bg-background-dark border border-primary text-slate-100 text-xs px-1 py-1 rounded text-center" 
                        autoFocus
                      />
                      <span className="text-xs text-primary/70">{item.unit}</span>
                      <button onClick={() => handleUpdateQuantity(item)} className="ml-1 text-emerald-400 hover:text-emerald-300">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </button>
                      <button onClick={() => setEditingItemId(null)} className="text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-primary text-base font-extrabold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                        {item.quantity} <span className="text-[10px] font-medium text-primary/70 uppercase">{item.unit}</span>
                      </span>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingItemId(item.id); setEditQuantity(item.quantity); }} className="text-slate-400 hover:text-blue-400" title="Edit Quantity">
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button onClick={() => { if(window.confirm(isBg ? 'Изтриване?' : 'Delete?')) removePantryItem(item.id); }} className="text-slate-400 hover:text-rose-500" title="Delete Item">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-slate-500">event</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {isExpired ? (isBg ? 'С ИЗТЕКЪЛ СРОК' : 'EXPIRED') : t('pantry.in_days', { count: daysLeft })}
                    </span>
                  </div>
                  <div className="h-1.5 w-24 bg-background-dark rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isExpired ? 'bg-rose-600 w-full' : isExpiringSoon ? 'bg-amber-500 w-[20%]' : 'bg-gradient-to-r from-emerald-600 to-emerald-400 w-[80%]'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-background-dark rounded-full p-1 border border-primary/20">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <h3 className="text-xl font-extrabold text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              {isBg ? 'Добави в Килера' : 'Add to Pantry'}
            </h3>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Ingredient Search */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{isBg ? 'Търси продукт *' : 'Search Product *'}</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-background-dark border border-primary/30 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:ring-primary focus:border-primary shadow-inner" 
                    placeholder={isBg ? 'Напр. домати, зехтин...' : 'e.g. tomato, olive oil...'}
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
                        <span className="text-sm font-bold text-slate-200">{isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedIngredient && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-inner mb-4">
                  <span>{isBg ? 'Избран продукт:' : 'Selected:'}</span>
                  <span className="text-slate-100 flex items-center gap-1 truncate max-w-[150px]">
                     <span className="material-symbols-outlined text-[14px]">check_circle</span>
                     {isBg ? (selectedIngredient.name_bg || selectedIngredient.name_en) : (selectedIngredient.name_en || selectedIngredient.name_bg)}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
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
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.unit')}</label>
                  <select 
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner font-bold"
                  >
                    {measurementsDB.length > 0 ? measurementsDB.map(m => (
                      <option key={m.unit_id || m.id} value={m.unit_id || m.id}>{m.unit_id || m.id}</option>
                    )) : (
                      <>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.expiration')} *</label>
                <input 
                  type="date" 
                  value={newItem.expirationDate}
                  onChange={e => setNewItem({...newItem, expirationDate: e.target.value})}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner color-scheme-dark font-bold" 
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
    </div>
  );
};

export default Pantry;

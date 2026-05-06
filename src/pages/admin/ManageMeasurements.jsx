import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ManageMeasurements = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [unitId, setUnitId] = useState('');
  const [nameBg, setNameBg] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [shortBg, setShortBg] = useState('');
  const [shortEn, setShortEn] = useState('');
  const [category, setCategory] = useState('mass'); // mass, volume, count, custom
  const [isStandard, setIsStandard] = useState(false);
  
  // Conversions metric
  const [toMl, setToMl] = useState('');
  const [toGaverage, setToGaverage] = useState('');
  
  // Conversions imperial
  const [imperialEquivalent, setImperialEquivalent] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'measurements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeasurements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveMeasurement = async (e) => {
    e.preventDefault();
    if (!nameBg || !nameEn) return;

    const actualUnitId = editingId || unitId || nameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    try {
      const unitData = {
        unit_id: actualUnitId,
        name_bg: nameBg,
        name_en: nameEn,
        short_bg: shortBg,
        short_en: shortEn,
        category: category,
        is_standard: isStandard,
        conversions: {
          metric: {
            to_ml: toMl ? parseFloat(toMl) : null,
            to_g_average: toGaverage ? parseFloat(toGaverage) : null
          },
          imperial: {
            imperial_equivalent: imperialEquivalent,
            conversion_factor: conversionFactor ? parseFloat(conversionFactor) : null
          }
        }
      };

      if (editingId) {
        await updateDoc(doc(db, 'measurements', editingId), unitData);
        await logActivity(user.uid, user.email, 'edit_measurement', `Edited measurement unit: ${nameEn}`);
      } else {
        await setDoc(doc(db, 'measurements', actualUnitId), unitData);
        await logActivity(user.uid, user.email, 'add_measurement', `Added measurement unit: ${nameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert(isBg ? 'Грешка при запазване.' : 'Error saving.');
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setUnitId(m.unit_id || m.id);
    setNameBg(m.name_bg || m.name || '');
    setNameEn(m.name_en || '');
    setShortBg(m.short_bg || '');
    setShortEn(m.short_en || '');
    
    let cat = m.category || 'mass';
    if (!m.category && m.type) {
        cat = m.type === 'weight' ? 'mass' : m.type;
    }
    setCategory(cat);
    
    setIsStandard(m.is_standard || m.is_system_unit || false);
    
    setToMl(m.conversions?.metric?.to_ml || '');
    setToGaverage(m.conversions?.metric?.to_g_average || m.base_weight_grams || '');
    
    setImperialEquivalent(m.conversions?.imperial?.imperial_equivalent || '');
    setConversionFactor(m.conversions?.imperial?.conversion_factor || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setUnitId('');
    setNameBg('');
    setNameEn('');
    setShortBg('');
    setShortEn('');
    setCategory('mass');
    setIsStandard(false);
    setToMl('');
    setToGaverage('');
    setImperialEquivalent('');
    setConversionFactor('');
  };

  const handleDelete = async (id, mName) => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете тази мярка?' : 'Are you sure you want to delete this unit?')) return;
    
    try {
      await deleteDoc(doc(db, 'measurements', id));
      await logActivity(user.uid, user.email, 'delete_measurement', `Deleted measurement unit: ${mName}`);
    } catch (error) {
      console.error("Error deleting measurement:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Мерни Единици' : 'Measurements'}</h1>
          <p className="text-xs font-medium text-primary/70">{measurements.length} {isBg ? 'въведени' : 'units'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <form onSubmit={handleSaveMeasurement} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-[#b8860b]/10 border-[#b8860b]/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? (isBg ? 'Редактиране на мярка' : 'Edit Unit') 
                : (isBg ? 'Нова мерна единица' : 'New Unit')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold">
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (BG)' : 'Name (BG)'}</label>
              <input value={nameBg} onChange={(e) => setNameBg(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Супена лъжица" />
            </div>
            
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (EN)' : 'Name (EN)'}</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Tablespoon" />
            </div>

            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Съкращение (BG)' : 'Short (BG)'}</label>
              <input value={shortBg} onChange={(e) => setShortBg(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="с.л." />
            </div>

            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Съкращение (EN)' : 'Short (EN)'}</label>
              <input value={shortEn} onChange={(e) => setShortEn(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="tbsp" />
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Категория' : 'Category'}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm">
                <option value="mass">{isBg ? 'Маса (Mass) - g, kg' : 'Mass (g, kg)'}</option>
                <option value="volume">{isBg ? 'Обем (Volume) - ml, l' : 'Volume (ml, l)'}</option>
                <option value="count">{isBg ? 'Брой (Count)' : 'Count'}</option>
                <option value="custom">{isBg ? 'Специфично (Custom) - чаша, лъжица' : 'Custom (cup, spoon)'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isStandard" checked={isStandard} onChange={(e) => setIsStandard(e.target.checked)} className="accent-primary" />
              <label htmlFor="isStandard" className="text-sm text-slate-300">
                {isBg ? 'Стандартна единица' : 'Standard Unit'}
              </label>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Метрична базова стойност (ml)' : 'Metric Base (ml)'}</label>
              <input type="number" step="0.01" value={toMl} onChange={(e) => setToMl(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="15" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Метрична базова стойност (g - средно)' : 'Metric Base (g - avg)'}</label>
              <input type="number" step="0.01" value={toGaverage} onChange={(e) => setToGaverage(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="12" />
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Имперски Еквивалент' : 'Imperial Equivalent'}</label>
              <input value={imperialEquivalent} onChange={(e) => setImperialEquivalent(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="fl_oz" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Коефициент за конвертиране' : 'Conversion Factor'}</label>
              <input type="number" step="0.000001" value={conversionFactor} onChange={(e) => setConversionFactor(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="0.5" />
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 ${editingId ? 'bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? (isBg ? 'Запази промените' : 'Save Changes') : (isBg ? 'Добави мярка' : 'Add Unit')}
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : (
            measurements.map(m => {
              const catIcon = {
                'mass': 'scale',
                'volume': 'water_drop',
                'count': 'tag',
                'custom': 'restaurant_menu'
              }[m.category || (m.type === 'weight' ? 'mass' : m.type)] || 'category';
              
              return (
              <div key={m.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-3 flex justify-between items-center group hover:border-primary/30 transition-colors">
                <div className="flex gap-3 items-center">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">{catIcon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 flex items-baseline gap-2">
                      <span>
                        {isBg ? (m.name_bg || m.name) : (m.name_en || 'Missing EN')}
                        {(isBg ? m.short_bg : m.short_en) && <span className="text-primary/70 font-normal text-xs ml-1">({isBg ? m.short_bg : m.short_en})</span>}
                      </span>
                      <span className="text-slate-600 font-normal text-xs">/</span>
                      <span className="text-slate-400 font-medium text-sm">
                        {!isBg ? (m.name_bg || m.name) : (m.name_en || 'Missing EN')}
                        {(!isBg ? m.short_bg : m.short_en) && <span className="text-slate-500 font-normal text-[10px] ml-1">({!isBg ? m.short_bg : m.short_en})</span>}
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1 items-center">
                      <span className="bg-background-dark px-1.5 py-0.5 rounded border border-primary/10 uppercase">
                        {m.category || m.type}
                      </span>
                      {m.conversions?.metric?.to_ml && <span className="text-blue-400">{m.conversions.metric.to_ml} ml</span>}
                      {(m.conversions?.metric?.to_g_average || m.base_weight_grams) && <span className="text-amber-500">{m.conversions?.metric?.to_g_average || m.base_weight_grams} g</span>}
                      {(m.is_standard || m.is_system_unit) && <span className="text-emerald-500 material-symbols-outlined text-[14px]" title="Standard Unit">verified</span>}
                      <span className="text-slate-500 ml-1">ID: {m.unit_id || m.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(m)} className="p-2 text-slate-400 hover:text-primary transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(m.id, m.name_bg || m.name)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageMeasurements;

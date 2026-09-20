import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { archiveVersion } from '../../lib/archiveUtils';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocalizedField } from '../../lib/localeUtils';

const ManageMeasurements = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || { name: currentLang.toUpperCase(), flag: '' };

  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [unitId, setUnitId] = useState('');
  
  // Multilingual input state
  const [nameLocal, setNameLocal] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [shortLocal, setShortLocal] = useState('');
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

    const finalNameEn = nameEn.trim() || nameLocal.trim();
    if (!finalNameEn) return;

    const finalShortEn = shortEn.trim() || shortLocal.trim();
    const finalNameLocal = nameLocal.trim() || finalNameEn;
    const finalShortLocal = shortLocal.trim() || finalShortEn;

    const actualUnitId = editingId || unitId || finalNameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    try {
      const unitData = {
        unit_id: actualUnitId,
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

      // Multilingual Data Entry Paradigm
      if (isEn) {
        unitData.name_en = finalNameEn;
        unitData.short_en = finalShortEn;

        // Auto-fallback for all supported languages
        for (const lang of SUPPORTED_LANGUAGES) {
          unitData[`name_${lang}`] = finalNameEn;
          unitData[`short_${lang}`] = finalShortEn;
        }
        unitData.name_bg = finalNameEn;
        unitData.short_bg = finalShortEn;
      } else {
        unitData.name_en = finalNameEn;
        unitData.short_en = finalShortEn;
        unitData[`name_${currentLang}`] = finalNameLocal;
        unitData[`short_${currentLang}`] = finalShortLocal;

        if (currentLang === 'bg') {
          unitData.name_bg = finalNameLocal;
          unitData.short_bg = finalShortLocal;
        }

        // Auto-fallback to EN for other languages
        for (const lang of SUPPORTED_LANGUAGES) {
          if (!unitData[`name_${lang}`]) {
            unitData[`name_${lang}`] = finalNameEn;
          }
          if (!unitData[`short_${lang}`]) {
            unitData[`short_${lang}`] = finalShortEn;
          }
        }
        if (!unitData.name_bg) unitData.name_bg = finalNameEn;
        if (!unitData.short_bg) unitData.short_bg = finalShortEn;
      }

      if (editingId) {
        // When editing, preserve existing translations for other languages from existing unit
        const existingUnit = measurements.find(m => m.id === editingId);
        if (existingUnit) {
          for (const lang of SUPPORTED_LANGUAGES) {
            if (lang !== currentLang && lang !== 'en' && existingUnit[`name_${lang}`]) {
              unitData[`name_${lang}`] = existingUnit[`name_${lang}`];
            }
            if (lang !== currentLang && lang !== 'en' && existingUnit[`short_${lang}`]) {
              unitData[`short_${lang}`] = existingUnit[`short_${lang}`];
            }
          }
          if (currentLang !== 'bg' && existingUnit.name_bg) {
            unitData.name_bg = existingUnit.name_bg;
          }
          if (currentLang !== 'bg' && existingUnit.short_bg) {
            unitData.short_bg = existingUnit.short_bg;
          }
        }

        // Archive before update
        await archiveVersion('measurements', editingId, user.uid, user.email, 'UPDATE');
        await updateDoc(doc(db, 'measurements', editingId), unitData);
        await logActivity(user.uid, user.email, 'edit_measurement', `Edited measurement unit: ${finalNameEn}`);
      } else {
        await setDoc(doc(db, 'measurements', actualUnitId), unitData);
        await logActivity(user.uid, user.email, 'add_measurement', `Added measurement unit: ${finalNameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert(t('measurements.error_saving'));
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setUnitId(m.unit_id || m.id);

    // Multilingual names
    const currentLocalName = m[`name_${currentLang}`] || (currentLang === 'bg' ? (m.name_bg || m.name) : '');
    const currentEnName = m.name_en || (isEn ? (m.name_bg || m.name) : '');
    setNameLocal(currentLocalName || '');
    setNameEn(currentEnName || '');

    // Multilingual short symbols
    const currentLocalShort = m[`short_${currentLang}`] || (currentLang === 'bg' ? (m.short_bg || '') : '');
    const currentEnShort = m.short_en || (isEn ? (m.short_bg || '') : '');
    setShortLocal(currentLocalShort || '');
    setShortEn(currentEnShort || '');
    
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
    setNameLocal('');
    setNameEn('');
    setShortLocal('');
    setShortEn('');
    setCategory('mass');
    setIsStandard(false);
    setToMl('');
    setToGaverage('');
    setImperialEquivalent('');
    setConversionFactor('');
  };

  const handleDelete = async (id, mName) => {
    if (!window.confirm(t('measurements.delete_confirm'))) return;
    
    try {
      // Archive before delete
      await archiveVersion('measurements', id, user.uid, user.email, 'DELETE');
      await deleteDoc(doc(db, 'measurements', id));
      await logActivity(user.uid, user.email, 'delete_measurement', `Deleted measurement unit: ${mName}`);
    } catch (error) {
      console.error("Error deleting measurement:", error);
      alert(t('measurements.error_deleting'));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t('measurements.title')}</h1>
          <p className="text-xs font-medium text-primary/70">{t('measurements.count', { count: measurements.length })}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <form onSubmit={handleSaveMeasurement} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-[#b8860b]/10 border-[#b8860b]/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? t('measurements.edit_unit') 
                : t('measurements.new_unit')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold cursor-pointer">
                {t('measurements.cancel')}
              </button>
            )}
          </div>
          
          {/* Multilingual input fields */}
          {isEn ? (
            /* Single English inputs for EN users */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400">{t('measurements.name_en')}</label>
                <input 
                  value={nameEn} 
                  onChange={(e) => setNameEn(e.target.value)} 
                  required 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder={t('measurements.name_placeholder')} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">{t('measurements.short_en')}</label>
                <input 
                  value={shortEn} 
                  onChange={(e) => setShortEn(e.target.value)} 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder={t('measurements.short_placeholder')} 
                />
              </div>
            </div>
          ) : (
            /* Dual Local + English inputs for other languages */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400">{t('measurements.name_local', { lang: localLangMeta.name })}</label>
                <input 
                  value={nameLocal} 
                  onChange={(e) => setNameLocal(e.target.value)} 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder={t('measurements.name_placeholder')} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">{t('measurements.name_en')}</label>
                <input 
                  value={nameEn} 
                  onChange={(e) => setNameEn(e.target.value)} 
                  required 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder="e.g. Tablespoon" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">{t('measurements.short_local', { lang: localLangMeta.name })}</label>
                <input 
                  value={shortLocal} 
                  onChange={(e) => setShortLocal(e.target.value)} 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder={t('measurements.short_placeholder')} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">{t('measurements.short_en')}</label>
                <input 
                  value={shortEn} 
                  onChange={(e) => setShortEn(e.target.value)} 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder="e.g. tbsp" 
                />
              </div>
            </div>
          )}

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{t('measurements.category')}</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none">
                <option value="mass">{t('measurements.categories.mass')}</option>
                <option value="volume">{t('measurements.categories.volume')}</option>
                <option value="count">{t('measurements.categories.count')}</option>
                <option value="custom">{t('measurements.categories.custom')}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isStandard" checked={isStandard} onChange={(e) => setIsStandard(e.target.checked)} className="accent-primary cursor-pointer" />
              <label htmlFor="isStandard" className="text-sm text-slate-300 cursor-pointer">
                {t('measurements.is_standard')}
              </label>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{t('measurements.metric_ml')}</label>
              <input type="number" step="0.01" value={toMl} onChange={(e) => setToMl(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" placeholder="15" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{t('measurements.metric_g')}</label>
              <input type="number" step="0.01" value={toGaverage} onChange={(e) => setToGaverage(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" placeholder="12" />
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{t('measurements.imperial_equiv')}</label>
              <input value={imperialEquivalent} onChange={(e) => setImperialEquivalent(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" placeholder="fl_oz" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{t('measurements.conversion_factor')}</label>
              <input type="number" step="0.000001" value={conversionFactor} onChange={(e) => setConversionFactor(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" placeholder="0.5" />
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 cursor-pointer ${editingId ? 'bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? t('measurements.save_changes') : t('measurements.add_unit')}
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : measurements.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm italic">
              {t('measurements.empty')}
            </div>
          ) : (
            measurements.map(m => {
              const catKey = m.category || (m.type === 'weight' ? 'mass' : m.type);
              const catIcon = {
                'mass': 'scale',
                'volume': 'water_drop',
                'count': 'tag',
                'custom': 'restaurant_menu'
              }[catKey] || 'category';
              
              const primaryName = getLocalizedField(m, 'name', currentLang) || m.name || m.name_en || m.name_bg || m.id;
              const primaryShort = getLocalizedField(m, 'short', currentLang);
              const secondaryName = m.name_en || m.name_bg;
              const secondaryShort = m.short_en || m.short_bg;
              const showSecondary = !isEn && secondaryName && secondaryName !== primaryName;

              return (
              <div key={m.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-3 flex justify-between items-center group hover:border-primary/30 transition-colors">
                <div className="flex gap-3 items-center">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{catIcon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 flex items-baseline gap-2 flex-wrap">
                      <span>
                        {primaryName}
                        {primaryShort && <span className="text-primary/70 font-normal text-xs ml-1">({primaryShort})</span>}
                      </span>
                      {showSecondary && (
                        <>
                          <span className="text-slate-600 font-normal text-xs">/</span>
                          <span className="text-slate-400 font-medium text-sm">
                            {secondaryName}
                            {secondaryShort && <span className="text-slate-500 font-normal text-[10px] ml-1">({secondaryShort})</span>}
                          </span>
                        </>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1 items-center">
                      <span className="bg-background-dark px-1.5 py-0.5 rounded border border-primary/10 uppercase">
                        {t(`measurements.categories.${catKey}`) || catKey}
                      </span>
                      {m.conversions?.metric?.to_ml && <span className="text-blue-400">{m.conversions.metric.to_ml} ml</span>}
                      {(m.conversions?.metric?.to_g_average || m.base_weight_grams) && <span className="text-amber-500">{m.conversions?.metric?.to_g_average || m.base_weight_grams} g</span>}
                      {(m.is_standard || m.is_system_unit) && <span className="text-emerald-500 material-symbols-outlined text-[14px]" title={t('measurements.is_standard')}>verified</span>}
                      <span className="text-slate-500 ml-1">ID: {m.unit_id || m.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(m)} className="p-2 text-slate-400 hover:text-primary transition-colors bg-background-dark/50 rounded-lg cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(m.id, primaryName)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg cursor-pointer">
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

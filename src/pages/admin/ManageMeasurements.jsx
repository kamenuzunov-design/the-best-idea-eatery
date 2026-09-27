import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
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

  // CSV Import / Export State
  const csvImportRef = useRef(null);
  const [csvStatus, setCsvStatus] = useState(''); // '' | 'parsing' | 'saving' | 'done' | 'error'
  const [csvPreview, setCsvPreview] = useState(null); // { newRows, duplicateRows } | null

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

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const exportable = measurements.filter(m => !m.is_deleted);
    const headers = [
      'unit_id', 'name_en', 'name_bg', 'name_it', 'name_fr', 'name_de',
      'short_en', 'short_bg', 'short_it', 'short_fr', 'short_de',
      'category', 'is_standard',
      'to_ml', 'to_g_average', 'imperial_equivalent', 'conversion_factor'
    ];
    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = exportable.map(m => [
      escape(m.unit_id || m.id),
      escape(m.name_en || m[`name_${currentLang}`] || ''),
      escape(m.name_bg || ''),
      escape(m.name_it || ''),
      escape(m.name_fr || ''),
      escape(m.name_de || ''),
      escape(m.short_en || ''),
      escape(m.short_bg || ''),
      escape(m.short_it || ''),
      escape(m.short_fr || ''),
      escape(m.short_de || ''),
      escape(m.category || 'mass'),
      escape(m.is_standard ? '1' : '0'),
      escape(m.conversions?.metric?.to_ml ?? ''),
      escape(m.conversions?.metric?.to_g_average ?? ''),
      escape(m.conversions?.imperial?.imperial_equivalent ?? ''),
      escape(m.conversions?.imperial?.conversion_factor ?? '')
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity(user.uid, user.email, 'export_measurements_csv', `Exported ${exportable.length} measurement units`);
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
          if (ch === '"' && inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuote = !inQuote; }
          else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
          else { cur += ch; }
        }
        result.push(cur);
        return result;
      };

      const existingIds = new Set(measurements.map(m => m.unit_id || m.id));
      const existingNamesBg = new Set(measurements.map(m => (m.name_bg || '').toLowerCase()));
      const existingNamesEn = new Set(measurements.map(m => (m.name_en || '').toLowerCase()));

      const newRows = [];
      const duplicateRows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 2) continue;
        const rawId    = cols[idx('unit_id')]?.trim();
        const name_en  = cols[idx('name_en')]?.trim();
        const name_bg  = cols[idx('name_bg')]?.trim() || name_en;
        const name_it  = cols[idx('name_it')]?.trim() || name_en;
        const name_fr  = cols[idx('name_fr')]?.trim() || name_en;
        const name_de  = cols[idx('name_de')]?.trim() || name_en;

        const short_en = cols[idx('short_en')]?.trim() || name_en;
        const short_bg = cols[idx('short_bg')]?.trim() || short_en;
        const short_it = cols[idx('short_it')]?.trim() || short_en;
        const short_fr = cols[idx('short_fr')]?.trim() || short_en;
        const short_de = cols[idx('short_de')]?.trim() || short_en;

        const cleanId = (rawId || name_en || name_bg).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
        if (!cleanId || (!name_en && !name_bg)) continue;

        const finalNameEn = name_en || name_bg;
        const category = cols[idx('category')]?.trim() || 'mass';
        const is_standard = cols[idx('is_standard')] === '1';

        const to_ml = cols[idx('to_ml')] ? parseFloat(cols[idx('to_ml')]) : null;
        const to_g_average = cols[idx('to_g_average')] ? parseFloat(cols[idx('to_g_average')]) : null;
        const imperial_equivalent = cols[idx('imperial_equivalent')]?.trim() || '';
        const conversion_factor = cols[idx('conversion_factor')] ? parseFloat(cols[idx('conversion_factor')]) : null;

        const row = {
          unit_id: cleanId,
          id: cleanId,
          name_en: finalNameEn,
          name_bg,
          name_it,
          name_fr,
          name_de,
          short_en,
          short_bg,
          short_it,
          short_fr,
          short_de,
          category,
          is_standard,
          conversions: {
            metric: {
              to_ml: isNaN(to_ml) ? null : to_ml,
              to_g_average: isNaN(to_g_average) ? null : to_g_average
            },
            imperial: {
              imperial_equivalent,
              conversion_factor: isNaN(conversion_factor) ? null : conversion_factor
            }
          },
          is_deleted: false
        };

        const isDuplicate =
          existingIds.has(cleanId) ||
          (finalNameEn && existingNamesEn.has(finalNameEn.toLowerCase())) ||
          (name_bg && existingNamesBg.has(name_bg.toLowerCase()));

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
            doc(db, 'measurements', row.unit_id),
            { ...row, updatedAt: now },
            { merge: true }
          );
        });
        await batch.commit();
      }
      await logActivity(user.uid, user.email, 'import_measurements_csv',
        `Imported ${rows.length} measurement units (mode: ${mode})`);
      setCsvStatus('done');
      setTimeout(() => setCsvStatus(''), 4000);
    } catch (err) {
      console.error('CSV write error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{t('measurements.title')}</h1>
            <p className="text-xs font-medium text-primary/70">{t('measurements.count', { count: measurements.length })}</p>
          </div>
        </div>

        {/* CSV Export & Import Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            title={t('measurements.export_csv_title')}
            className="px-3 py-1.5 rounded-xl border border-primary/20 bg-background-dark/70 hover:bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span className="hidden sm:inline">{t('measurements.export_csv')}</span>
          </button>

          <button
            type="button"
            onClick={() => csvImportRef.current?.click()}
            disabled={csvStatus === 'parsing' || csvStatus === 'saving'}
            title={t('measurements.import_csv_title')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              csvStatus === 'parsing' || csvStatus === 'saving' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              csvStatus === 'done'   ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              csvStatus === 'error'  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
              'border-primary/20 bg-background-dark/70 hover:bg-primary/10 text-primary'
            }`}
          >
            <span className={`material-symbols-outlined text-sm ${csvStatus === 'parsing' || csvStatus === 'saving' ? 'animate-spin' : ''}`}>
              {csvStatus === 'parsing' || csvStatus === 'saving' ? 'refresh' :
               csvStatus === 'done'    ? 'check_circle' :
               csvStatus === 'error'   ? 'error' : 'upload'}
            </span>
            <span className="hidden sm:inline">
              {csvStatus === 'parsing' ? t('measurements.parsing') :
               csvStatus === 'saving'   ? t('measurements.saving') :
               csvStatus === 'done'     ? t('measurements.done') :
               csvStatus === 'error'    ? t('measurements.error') : t('measurements.import_csv')}
            </span>
          </button>

          <input
            type="file"
            ref={csvImportRef}
            className="hidden"
            accept=".csv,text/csv"
            onChange={handleImportCSV}
          />
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

      {/* ── CSV Import Confirmation Modal ─────────────────────────────── */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
              <span className="material-symbols-outlined text-primary text-2xl">straighten</span>
              <div>
                <h3 className="font-bold text-slate-100 text-base">
                  {t('measurements.csv_modal_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('measurements.csv_modal_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background-dark/80 border border-emerald-500/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{csvPreview.newRows.length}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('measurements.csv_new_count')}
                </p>
              </div>
              <div className="bg-background-dark/80 border border-amber-500/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{csvPreview.duplicateRows.length}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('measurements.csv_duplicate_count')}
                </p>
              </div>
            </div>

            {csvPreview.duplicateRows.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-slate-400">
                  {t('measurements.csv_duplicates_list')}
                </p>
                {csvPreview.duplicateRows.map((r, i) => (
                  <div key={i} className="text-xs font-mono text-slate-300 bg-background-dark/60 rounded-lg px-2.5 py-1.5 flex justify-between">
                    <span>{r.name_bg || r.name_en} ({r.short_bg || r.short_en})</span>
                    <span className="text-slate-500 text-[10px]">{r.unit_id}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-primary/10">
              {csvPreview.newRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => executeImport('new')}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-all cursor-pointer"
                >
                  {t('measurements.csv_import_new', { count: csvPreview.newRows.length })}
                </button>
              )}
              {csvPreview.duplicateRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => executeImport('all')}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer"
                >
                  {t('measurements.csv_import_all', { count: csvPreview.newRows.length + csvPreview.duplicateRows.length })}
                </button>
              )}
              <button
                type="button"
                onClick={() => executeImport('cancel')}
                className="w-full py-2 rounded-xl bg-background-dark/60 hover:bg-background-dark text-slate-400 font-bold text-xs transition-all cursor-pointer mt-1"
              >
                {t('measurements.csv_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMeasurements;

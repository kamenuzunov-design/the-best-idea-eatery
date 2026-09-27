import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocalizedText } from '../../lib/localeUtils';
import { CUISINES } from '../../data/cuisines';

const ManageCuisines = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || { name: currentLang.toUpperCase(), flag: '' };

  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // CSV Import / Export State
  const csvImportRef = useRef(null);
  const [csvStatus, setCsvStatus] = useState(''); // '' | 'parsing' | 'saving' | 'done' | 'error'
  const [csvPreview, setCsvPreview] = useState(null); // { newRows, duplicateRows } | null

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [slugId, setSlugId] = useState('');
  const [namesByLang, setNamesByLang] = useState({
    bg: '',
    en: '',
    it: '',
    fr: '',
    de: ''
  });
  const [parentId, setParentId] = useState('');

  const currentLocalName = isEn ? (namesByLang.en || '') : (namesByLang[currentLang] || '');
  const currentEnName = namesByLang.en || '';

  // Auto slug generation from English name (only in create mode)
  const handleNameEnChange = (e) => {
    const val = e.target.value;
    setNamesByLang(prev => ({ ...prev, en: val }));
    if (!editingId) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)+/g, '');
      setSlugId(generated);
    }
  };

  const handleNameLocalChange = (e) => {
    const val = e.target.value;
    if (isEn) {
      handleNameEnChange(e);
    } else {
      setNamesByLang(prev => ({ ...prev, [currentLang]: val }));
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'cuisines'));
    const unsub = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fallback: If Firestore is empty, we present predefined CUISINES from data/cuisines.js
      if (data.length === 0) {
        data = CUISINES.map(c => ({
          ...c,
          name_bg: c.name?.bg || '',
          name_en: c.name?.en || '',
          name_it: c.name?.it || '',
          name_fr: c.name?.fr || '',
          name_de: c.name?.de || '',
          _isLocalFallback: true
        }));
      }

      data.sort((a, b) => {
        if ((a.level ?? 0) !== (b.level ?? 0)) return (a.level ?? 0) - (b.level ?? 0);
        const nameA = getLocalizedText(a.name, currentLang) || a.id;
        const nameB = getLocalizedText(b.name, currentLang) || b.id;
        return nameA.localeCompare(nameB);
      });

      setCuisines(data);
      setLoading(false);
    });

    return () => unsub();
  }, [currentLang]);

  const handleSaveCuisine = async (e) => {
    e.preventDefault();
    const finalNameEn = currentEnName.trim() || currentLocalName.trim();
    if (!finalNameEn) return;

    const finalNameLocal = currentLocalName.trim() || finalNameEn;
    const cleanId = (editingId ? slugId : (slugId || finalNameEn))
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)+/g, '');
    if (!cleanId) return;

    try {
      const parentObj = parentId ? cuisines.find(c => c.id === parentId) : null;
      const level = parentObj ? (parentObj.level ?? 0) + 1 : 0;
      const existing = editingId ? cuisines.find(c => c.id === editingId) : null;

      const cuisineData = {
        id: cleanId,
        parentId: parentId || null,
        level,
        name: {
          en: finalNameEn,
          bg: isEn ? (namesByLang.bg?.trim() || existing?.name?.bg || existing?.name_bg || finalNameEn)
                   : (currentLang === 'bg' ? finalNameLocal : (namesByLang.bg?.trim() || existing?.name?.bg || existing?.name_bg || finalNameEn)),
          it: isEn ? (namesByLang.it?.trim() || existing?.name?.it || existing?.name_it || finalNameEn)
                   : (currentLang === 'it' ? finalNameLocal : (namesByLang.it?.trim() || existing?.name?.it || existing?.name_it || finalNameEn)),
          fr: isEn ? (namesByLang.fr?.trim() || existing?.name?.fr || existing?.name_fr || finalNameEn)
                   : (currentLang === 'fr' ? finalNameLocal : (namesByLang.fr?.trim() || existing?.name?.fr || existing?.name_fr || finalNameEn)),
          de: isEn ? (namesByLang.de?.trim() || existing?.name?.de || existing?.name_de || finalNameEn)
                   : (currentLang === 'de' ? finalNameLocal : (namesByLang.de?.trim() || existing?.name?.de || existing?.name_de || finalNameEn)),
        },
        name_en: finalNameEn,
        name_bg: isEn ? (namesByLang.bg?.trim() || existing?.name?.bg || existing?.name_bg || finalNameEn)
                      : (currentLang === 'bg' ? finalNameLocal : (namesByLang.bg?.trim() || existing?.name?.bg || existing?.name_bg || finalNameEn)),
        name_it: isEn ? (namesByLang.it?.trim() || existing?.name?.it || existing?.name_it || finalNameEn)
                      : (currentLang === 'it' ? finalNameLocal : (namesByLang.it?.trim() || existing?.name?.it || existing?.name_it || finalNameEn)),
        name_fr: isEn ? (namesByLang.fr?.trim() || existing?.name?.fr || existing?.name_fr || finalNameEn)
                      : (currentLang === 'fr' ? finalNameLocal : (namesByLang.fr?.trim() || existing?.name?.fr || existing?.name_fr || finalNameEn)),
        name_de: isEn ? (namesByLang.de?.trim() || existing?.name?.de || existing?.name_de || finalNameEn)
                      : (currentLang === 'de' ? finalNameLocal : (namesByLang.de?.trim() || existing?.name?.de || existing?.name_de || finalNameEn)),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'cuisines', editingId), cuisineData);
        await logActivity(user?.uid || 'admin', user?.email || 'admin@example.com', 'edit_cuisine', `Edited cuisine: ${finalNameEn} (${cleanId})`);
      } else {
        cuisineData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'cuisines', cleanId), cuisineData);
        await logActivity(user?.uid || 'admin', user?.email || 'admin@example.com', 'add_cuisine', `Added cuisine: ${finalNameEn} (${cleanId})`);
      }

      handleCancelEdit();
    } catch (err) {
      console.error('Error saving cuisine:', err);
      alert('Грешка при запазване: ' + err.message);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setSlugId(item.id);
    setNamesByLang({
      en: item.name?.en || item.name_en || '',
      bg: item.name?.bg || item.name_bg || '',
      it: item.name?.it || item.name_it || '',
      fr: item.name?.fr || item.name_fr || '',
      de: item.name?.de || item.name_de || ''
    });
    setParentId(item.parentId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSlugId('');
    setNamesByLang({ bg: '', en: '', it: '', fr: '', de: '' });
    setParentId('');
  };

  const handleDeleteCuisine = async (id, name) => {
    if (!window.confirm(t('cuisines_admin.confirm_delete') + `\n\n"${name}" (${id})`)) return;
    try {
      await deleteDoc(doc(db, 'cuisines', id));
      await logActivity(user?.uid || 'admin', user?.email || 'admin@example.com', 'delete_cuisine', `Deleted cuisine: ${name} (${id})`);
    } catch (err) {
      console.error('Error deleting cuisine:', err);
      alert('Грешка при изтриване: ' + err.message);
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['id', 'name_en', 'name_bg', 'name_it', 'name_fr', 'name_de', 'parentId', 'level'];
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = cuisines.map(c => [
      escape(c.id),
      escape(c.name_en || c.name?.en || ''),
      escape(c.name_bg || c.name?.bg || ''),
      escape(c.name_it || c.name?.it || ''),
      escape(c.name_fr || c.name?.fr || ''),
      escape(c.name_de || c.name?.de || ''),
      escape(c.parentId || ''),
      escape(c.level ?? 0)
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuisines_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity(user?.uid || 'admin', user?.email || 'admin@example.com', 'export_cuisines_csv', `Exported ${cuisines.length} cuisines`);
  };

  // ── CSV Import ────────────────────────────────────────────────────────────
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

      const existingIds = new Set(cuisines.map(c => c.id));
      const newRows = [];
      const duplicateRows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 2) continue;
        const rawId = cols[idx('id')]?.trim();
        const name_en = cols[idx('name_en')]?.trim();
        const name_bg = cols[idx('name_bg')]?.trim() || name_en;
        const name_it = cols[idx('name_it')]?.trim() || name_en;
        const name_fr = cols[idx('name_fr')]?.trim() || name_en;
        const name_de = cols[idx('name_de')]?.trim() || name_en;
        const parentId = cols[idx('parentId')]?.trim() || null;

        const cleanId = (rawId || name_en || name_bg).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
        if (!cleanId || (!name_en && !name_bg)) continue;

        const finalNameEn = name_en || name_bg;
        const level = parseInt(cols[idx('level')]) || (parentId ? 1 : 0);

        const row = {
          id: cleanId,
          name_en: finalNameEn,
          name_bg,
          name_it,
          name_fr,
          name_de,
          name: { en: finalNameEn, bg: name_bg, it: name_it, fr: name_fr, de: name_de },
          parentId,
          level
        };

        if (existingIds.has(cleanId)) duplicateRows.push(row);
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
            doc(db, 'cuisines', row.id),
            { ...row, createdAt: now, updatedAt: now },
            { merge: true }
          );
        });
        await batch.commit();
      }
      await logActivity(user?.uid || 'admin', user?.email || 'admin@example.com', 'import_cuisines_csv',
        `Imported ${rows.length} cuisines (mode: ${mode})`);
      setCsvStatus('done');
      setTimeout(() => setCsvStatus(''), 4000);
    } catch (err) {
      console.error('CSV write error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  // Filtered and parent lists
  const parentCandidates = cuisines.filter(c => (c.level ?? 0) <= 1 && (!editingId || c.id !== editingId));
  
  const filteredCuisines = cuisines.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameCurrent = (getLocalizedText(c.name, currentLang) || '').toLowerCase();
    const nameEnVal = (c.name_en || c.name?.en || '').toLowerCase();
    return c.id.toLowerCase().includes(q) || nameCurrent.includes(q) || nameEnVal.includes(q);
  });

  const rootCuisines = filteredCuisines.filter(c => !c.parentId);

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center">
            <button onClick={() => navigate('/admin/data')} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">{t('cuisines_admin.title')}</h1>
              <p className="text-xs font-medium text-primary/70">{t('cuisines_admin.total_count')}: {cuisines.length}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              title={t('cuisines_admin.export_csv')}
              className="px-3 py-1.5 rounded-xl border border-primary/20 bg-background-dark/70 hover:bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="hidden sm:inline">{t('cuisines_admin.export_csv')}</span>
            </button>

            <button
              type="button"
              onClick={() => csvImportRef.current?.click()}
              disabled={csvStatus === 'parsing' || csvStatus === 'saving'}
              title={t('cuisines_admin.import_csv')}
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
                {csvStatus === 'parsing' ? 'Парсване...' :
                 csvStatus === 'saving'   ? 'Записване...' :
                 csvStatus === 'done'     ? 'Готово!' :
                 csvStatus === 'error'    ? 'Грешка!' : t('cuisines_admin.import_csv')}
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
      </div>

      <div className="p-4 overflow-y-auto space-y-6">

        {/* Form */}
        <form onSubmit={handleSaveCuisine} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg space-y-4 transition-colors ${editingId ? 'bg-blue-500/10 border-blue-500/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">{editingId ? 'edit' : 'add_circle'}</span>
              {editingId ? t('cuisines_admin.edit_title') : t('cuisines_admin.add_title')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded cursor-pointer">
                {t('common.buttons.cancel')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">{t('cuisines_admin.slug_id')}</label>
              <input 
                value={slugId} 
                onChange={(e) => setSlugId(e.target.value)} 
                required 
                disabled={!!editingId} 
                className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none disabled:opacity-60" 
                placeholder={t('cuisines_admin.slug_placeholder')} 
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">{t('cuisines_admin.parent_cuisine')}</label>
              <select 
                value={parentId} 
                onChange={(e) => setParentId(e.target.value)} 
                className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none"
              >
                <option value="">-- {t('cuisines_admin.none_parent')} --</option>
                {parentCandidates.map(p => {
                  const pLoc = getLocalizedText(p.name, currentLang) || p.name?.en || p.id;
                  const pSec = !isEn && p.name?.en && p.name.en !== pLoc ? ` (${p.name.en})` : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {`${p.level > 0 ? '↳ ' : ''}${pLoc}${pSec}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {isEn ? (
              <div className="col-span-1 md:col-span-2">
                <label className="text-xs text-slate-400 font-medium">{t('cuisines_admin.name_en')}</label>
                <input 
                  value={currentEnName} 
                  onChange={handleNameEnChange} 
                  required 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder="e.g. Italian" 
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-400 font-medium">{t('cuisines_admin.name_local', { lang: localLangMeta.name })}</label>
                  <input 
                    value={currentLocalName} 
                    onChange={handleNameLocalChange} 
                    required 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                    placeholder="напр. Италианска" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">{t('cuisines_admin.name_en')}</label>
                  <input 
                    value={currentEnName} 
                    onChange={handleNameEnChange} 
                    required 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                    placeholder="e.g. Italian" 
                  />
                </div>
              </>
            )}
          </div>

          <button 
            type="submit" 
            className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 cursor-pointer ${
              editingId 
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' 
                : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? t('common.buttons.save') : t('common.buttons.add')}
          </button>
        </form>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('cuisines_admin.search_placeholder')}
              className="w-full bg-surface-dark border border-primary/20 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 focus:border-primary outline-none placeholder:text-slate-500"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-surface-dark border border-primary/20 rounded-xl cursor-pointer"
            >
              Изчисти
            </button>
          )}
        </div>

        {/* Tree / Grouped List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : rootCuisines.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm italic bg-surface-dark/50 border border-primary/10 rounded-2xl">
              {t('cuisines_admin.empty_hint')}
            </div>
          ) : (
            rootCuisines.map(parent => {
              const children = filteredCuisines.filter(c => c.parentId === parent.id);
              const parentName = getLocalizedText(parent.name, currentLang) || parent.id;
              const parentSecondary = !isEn && parent.name?.en && parent.name.en !== parentName ? parent.name.en : null;

              return (
                <div key={parent.id} className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden shadow-md">
                  {/* Root Row */}
                  <div className="flex items-center justify-between p-3.5 bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-xl">public</span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleEditClick(parent)}
                          className="font-bold text-slate-100 text-sm hover:text-primary hover:underline text-left cursor-pointer transition-colors"
                          title={t('common.buttons.edit')}
                        >
                          {parentName}
                        </button>
                        {parentSecondary && (
                          <span className="text-xs text-slate-400 font-medium mt-0.5">
                            {parentSecondary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleEditClick(parent)} 
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title={t('common.buttons.edit')}
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteCuisine(parent.id, parentName)} 
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title={t('common.buttons.delete')}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Children Rows */}
                  {children.length > 0 && (
                    <div className="divide-y divide-primary/5">
                      {children.map(child => {
                        const childName = getLocalizedText(child.name, currentLang) || child.id;
                        const childSecondary = !isEn && child.name?.en && child.name.en !== childName ? child.name.en : null;
                        const grandChildren = filteredCuisines.filter(c => c.parentId === child.id);

                        return (
                          <div key={child.id} className="p-2.5 pl-6 bg-surface-dark/40 hover:bg-primary/5 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-2">
                                <span className="text-primary/60 text-sm font-mono mt-0.5">↳</span>
                                <div className="flex flex-col">
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(child)}
                                    className="text-sm font-medium text-slate-200 hover:text-primary hover:underline text-left cursor-pointer transition-colors"
                                    title={t('common.buttons.edit')}
                                  >
                                    {childName}
                                  </button>
                                  {childSecondary && (
                                    <span className="text-xs text-slate-400">
                                      {childSecondary}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleEditClick(child)} 
                                  className="p-1 text-slate-400 hover:text-primary rounded transition-colors cursor-pointer"
                                  title={t('common.buttons.edit')}
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteCuisine(child.id, childName)} 
                                  className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                                  title={t('common.buttons.delete')}
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </div>

                            {/* Level 3 items */}
                            {grandChildren.length > 0 && (
                              <div className="mt-1.5 pl-6 space-y-1">
                                {grandChildren.map(gc => {
                                  const gcName = getLocalizedText(gc.name, currentLang) || gc.id;
                                  const gcSecondary = !isEn && gc.name?.en && gc.name.en !== gcName ? gc.name.en : null;
                                  return (
                                    <div key={gc.id} className="flex items-center justify-between text-xs py-0.5 text-slate-300">
                                      <div className="flex items-center gap-2">
                                        <span className="text-primary/40 font-mono">↳↳</span>
                                        <button
                                          type="button"
                                          onClick={() => handleEditClick(gc)}
                                          className="hover:text-primary hover:underline cursor-pointer text-left transition-colors text-slate-200 text-xs"
                                          title={t('common.buttons.edit')}
                                        >
                                          {gcName}
                                        </button>
                                        {gcSecondary && (
                                          <span className="text-[11px] text-slate-400">({gcSecondary})</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => handleEditClick(gc)} className="p-0.5 text-slate-400 hover:text-primary cursor-pointer" title={t('common.buttons.edit')}>
                                          <span className="material-symbols-outlined text-xs">edit</span>
                                        </button>
                                        <button onClick={() => handleDeleteCuisine(gc.id, gcName)} className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer" title={t('common.buttons.delete')}>
                                          <span className="material-symbols-outlined text-xs">delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-primary/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              Потвърждение за импорт на кухни
            </h3>
            <div className="text-sm text-slate-300 space-y-2">
              <p>Намерени са общо <strong className="text-primary">{csvPreview.newRows.length + csvPreview.duplicateRows.length}</strong> реда в CSV файла:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong className="text-emerald-400">{csvPreview.newRows.length}</strong> нови кухни (ще бъдат добавени)</li>
                <li><strong className="text-amber-400">{csvPreview.duplicateRows.length}</strong> съществуващи кухни (дубликати по ID или име)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => executeImport('new')}
                disabled={csvPreview.newRows.length === 0}
                className="w-full py-2.5 px-4 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                Импортирай само новите ({csvPreview.newRows.length})
              </button>
              <button
                onClick={() => executeImport('all')}
                className="w-full py-2.5 px-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Импортирай всички / Презапиши ({csvPreview.newRows.length + csvPreview.duplicateRows.length})
              </button>
              <button
                onClick={() => executeImport('cancel')}
                className="w-full py-2 px-4 bg-background-dark/50 hover:bg-background-dark text-slate-400 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Отказ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageCuisines;

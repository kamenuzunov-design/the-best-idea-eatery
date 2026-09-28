import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocalizedText } from '../../lib/localeUtils';
import { parseCSV, formatCSV, downloadCSV } from '../../lib/csvUtils';

const ManageIngredientGroups = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || { name: currentLang.toUpperCase(), flag: '' };

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // CSV Import / Export State
  const csvImportRef = useRef(null);
  const [csvStatus, setCsvStatus] = useState(''); // '' | 'parsing' | 'saving' | 'done' | 'error'
  const [csvPreview, setCsvPreview] = useState(null); // { newRows, duplicateRows } | null

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [groupId, setGroupId] = useState('');
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

  useEffect(() => {
    const q = query(collection(db, 'ingredient_groups'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: parents first, then children, alphabetically by localized name
      data.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        const nameA = getLocalizedText(a.name, currentLang) || a.id;
        const nameB = getLocalizedText(b.name, currentLang) || b.id;
        return nameA.localeCompare(nameB);
      });
      setGroups(data);
      setLoading(false);
    });

    return () => unsub();
  }, [currentLang]);

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const finalNameEn = currentEnName.trim() || currentLocalName.trim();
    if (!finalNameEn) return;

    const finalNameLocal = currentLocalName.trim() || finalNameEn;
    const cleanId = (editingId ? groupId : (groupId || finalNameEn)).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
    if (!cleanId) return;

    try {
      const existingGroup = editingId ? groups.find(g => g.id === editingId) : null;
      const groupData = {
        name: {
          en: finalNameEn,
          bg: isEn ? (namesByLang.bg?.trim() || existingGroup?.name?.bg || existingGroup?.name_bg || finalNameEn)
                   : (currentLang === 'bg' ? finalNameLocal : (namesByLang.bg?.trim() || existingGroup?.name?.bg || existingGroup?.name_bg || finalNameEn)),
          it: isEn ? (namesByLang.it?.trim() || existingGroup?.name?.it || existingGroup?.name_it || finalNameEn)
                   : (currentLang === 'it' ? finalNameLocal : (namesByLang.it?.trim() || existingGroup?.name?.it || existingGroup?.name_it || finalNameEn)),
          fr: isEn ? (namesByLang.fr?.trim() || existingGroup?.name?.fr || existingGroup?.name_fr || finalNameEn)
                   : (currentLang === 'fr' ? finalNameLocal : (namesByLang.fr?.trim() || existingGroup?.name?.fr || existingGroup?.name_fr || finalNameEn)),
          de: isEn ? (namesByLang.de?.trim() || existingGroup?.name?.de || existingGroup?.name_de || finalNameEn)
                   : (currentLang === 'de' ? finalNameLocal : (namesByLang.de?.trim() || existingGroup?.name?.de || existingGroup?.name_de || finalNameEn)),
        },
        name_en: finalNameEn,
        name_bg: isEn ? (namesByLang.bg?.trim() || existingGroup?.name?.bg || existingGroup?.name_bg || finalNameEn)
                      : (currentLang === 'bg' ? finalNameLocal : (namesByLang.bg?.trim() || existingGroup?.name?.bg || existingGroup?.name_bg || finalNameEn)),
        name_it: isEn ? (namesByLang.it?.trim() || existingGroup?.name?.it || existingGroup?.name_it || finalNameEn)
                      : (currentLang === 'it' ? finalNameLocal : (namesByLang.it?.trim() || existingGroup?.name?.it || existingGroup?.name_it || finalNameEn)),
        name_fr: isEn ? (namesByLang.fr?.trim() || existingGroup?.name?.fr || existingGroup?.name_fr || finalNameEn)
                      : (currentLang === 'fr' ? finalNameLocal : (namesByLang.fr?.trim() || existingGroup?.name?.fr || existingGroup?.name_fr || finalNameEn)),
        name_de: isEn ? (namesByLang.de?.trim() || existingGroup?.name?.de || existingGroup?.name_de || finalNameEn)
                      : (currentLang === 'de' ? finalNameLocal : (namesByLang.de?.trim() || existingGroup?.name?.de || existingGroup?.name_de || finalNameEn)),
        parentId: parentId || null,
        level: parentId ? 1 : 0,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'ingredient_groups', editingId), groupData);
        await logActivity(user.uid, user.email, 'edit_ingredient_group', `Edited group: ${finalNameEn}`);
      } else {
        groupData.id = cleanId;
        groupData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'ingredient_groups', cleanId), groupData);
        await logActivity(user.uid, user.email, 'add_ingredient_group', `Added group: ${finalNameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving group:", error);
      alert(t('ingredient_groups.error_saving'));
    }
  };

  const handleNameEnChange = (e) => {
    const val = e.target.value;
    setNamesByLang(prev => ({ ...prev, en: val }));
    if (!editingId && (isEn || !groupId)) {
      setGroupId(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, ''));
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

  const handleEditClick = (g) => {
    setEditingId(g.id);
    setGroupId(g.id);
    
    // Multilingual names
    setNamesByLang({
      en: g.name?.en || g.name_en || '',
      bg: g.name?.bg || g.name_bg || '',
      it: g.name?.it || g.name_it || '',
      fr: g.name?.fr || g.name_fr || '',
      de: g.name?.de || g.name_de || ''
    });

    setParentId(g.parentId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGroupId('');
    setNamesByLang({ bg: '', en: '', it: '', fr: '', de: '' });
    setParentId('');
  };

  const handleDelete = async (targetId, targetName) => {
    if (!window.confirm(t('ingredient_groups.delete_confirm', { name: targetName }))) return;
    
    try {
      // Check if it has children
      const hasChildren = groups.some(g => g.parentId === targetId);
      if (hasChildren) {
        alert(t('ingredient_groups.has_children_error'));
        return;
      }
      
      await deleteDoc(doc(db, 'ingredient_groups', targetId));
      await logActivity(user.uid, user.email, 'delete_ingredient_group', `Deleted group: ${targetName}`);
    } catch (error) {
      console.error("Error deleting group:", error);
      alert(t('ingredient_groups.error_deleting'));
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const exportable = groups.filter(g => !g.is_deleted);
    const headers = [
      'id', 'name_en', 'name_bg', 'name_it', 'name_fr', 'name_de', 'parentId', 'level'
    ];
    const rows = exportable.map(g => [
      g.id,
      g.name_en || g.name?.en || '',
      g.name_bg || g.name?.bg || '',
      g.name_it || g.name?.it || '',
      g.name_fr || g.name?.fr || '',
      g.name_de || g.name?.de || '',
      g.parentId || '',
      g.level ?? (g.parentId ? 1 : 0)
    ]);
    const csvContent = formatCSV(headers, rows);
    downloadCSV(`ingredient_groups_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
    logActivity(user.uid, user.email, 'export_ingredient_groups_csv', `Exported ${exportable.length} ingredient groups`);
  };

  // ── CSV Import: Step 1 — parse & detect duplicates ─────────────────────────
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setCsvStatus('parsing');
    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);
      if (parsedRows.length < 2) {
        setCsvStatus('');
        return;
      }
      const header = parsedRows[0];
      const idx = (name) => header.indexOf(name);

      const existingIds = new Set(groups.map(g => g.id));
      const existingNamesBg = new Set(groups.map(g => (g.name_bg || g.name?.bg || '').toLowerCase()));
      const existingNamesEn = new Set(groups.map(g => (g.name_en || g.name?.en || '').toLowerCase()));

      const newRows = [];
      const duplicateRows = [];

      for (let i = 1; i < parsedRows.length; i++) {
        const cols = parsedRows[i];
        if (cols.length < 2) continue;
        const rawId    = cols[idx('id')]?.trim();
        const name_en  = cols[idx('name_en')]?.trim();
        const name_bg  = cols[idx('name_bg')]?.trim() || name_en;
        const name_it  = cols[idx('name_it')]?.trim() || name_en;
        const name_fr  = cols[idx('name_fr')]?.trim() || name_en;
        const name_de  = cols[idx('name_de')]?.trim() || name_en;
        const parentId = cols[idx('parentId')]?.trim() || null;

        const cleanId = (rawId || name_en || name_bg).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
        if (!cleanId || (!name_en && !name_bg)) continue;

        const finalNameEn = name_en || name_bg;
        const level = parentId ? 1 : (parseInt(cols[idx('level')]) || 0);

        const row = {
          id: cleanId,
          name_en: finalNameEn,
          name_bg,
          name_it,
          name_fr,
          name_de,
          name: {
            en: finalNameEn,
            bg: name_bg,
            it: name_it,
            fr: name_fr,
            de: name_de
          },
          parentId,
          level,
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
            doc(db, 'ingredient_groups', row.id),
            { ...row, createdAt: now, updatedAt: now },
            { merge: true }
          );
        });
        await batch.commit();
      }
      await logActivity(user.uid, user.email, 'import_ingredient_groups_csv',
        `Imported ${rows.length} ingredient groups (mode: ${mode})`);
      setCsvStatus('done');
      setTimeout(() => setCsvStatus(''), 4000);
    } catch (err) {
      console.error('CSV write error:', err);
      setCsvStatus('error');
      setTimeout(() => setCsvStatus(''), 4000);
    }
  };

  const parentGroups = groups.filter(g => g.level === 0);

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">{t('ingredient_groups.title')}</h1>
              <p className="text-xs font-medium text-primary/70">{t('ingredient_groups.count', { count: groups.length })}</p>
            </div>
          </div>

          {/* CSV Export & Import Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              title={t('ingredient_groups.export_csv_title')}
              className="px-3 py-1.5 rounded-xl border border-primary/20 bg-background-dark/70 hover:bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="hidden sm:inline">{t('ingredient_groups.export_csv')}</span>
            </button>

            <button
              type="button"
              onClick={() => csvImportRef.current?.click()}
              disabled={csvStatus === 'parsing' || csvStatus === 'saving'}
              title={t('ingredient_groups.import_csv_title')}
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
                {csvStatus === 'parsing' ? t('ingredient_groups.parsing') :
                 csvStatus === 'saving'   ? t('ingredient_groups.saving') :
                 csvStatus === 'done'     ? t('ingredient_groups.done') :
                 csvStatus === 'error'    ? t('ingredient_groups.error') : t('ingredient_groups.import_csv')}
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

      <div className="p-4 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSaveGroup} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-blue-500/10 border-blue-500/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? t('ingredient_groups.edit_group') 
                : t('ingredient_groups.new_group')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded cursor-pointer">
                {t('ingredient_groups.cancel')}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-400">{t('ingredient_groups.id_slug')}</label>
              <input 
                value={groupId} 
                onChange={(e) => setGroupId(e.target.value)} 
                required 
                disabled={!!editingId} 
                className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70 focus:border-primary outline-none" 
                placeholder="e.g. vegetables_root" 
              />
            </div>

            {isEn ? (
              /* Single English name field for English users */
              <div className="col-span-2">
                <label className="text-xs text-slate-400">{t('ingredient_groups.name_en')}</label>
                <input 
                  value={currentEnName} 
                  onChange={handleNameEnChange} 
                  required 
                  className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                  placeholder={t('ingredient_groups.name_placeholder')} 
                />
              </div>
            ) : (
              /* Dual Local + English name fields for other languages */
              <>
                <div>
                  <label className="text-xs text-slate-400">{t('ingredient_groups.name_local', { lang: localLangMeta.name })}</label>
                  <input 
                    value={currentLocalName} 
                    onChange={handleNameLocalChange} 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                    placeholder={t('ingredient_groups.name_placeholder')} 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">{t('ingredient_groups.name_en')}</label>
                  <input 
                    value={currentEnName} 
                    onChange={handleNameEnChange} 
                    required 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                    placeholder="e.g. Root vegetables" 
                  />
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-xs text-slate-400">{t('ingredient_groups.parent_group')}</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none">
                <option value="">-- {t('ingredient_groups.main_group')} --</option>
                {parentGroups.filter(p => !editingId || p.id !== editingId).map(p => (
                  <option key={p.id} value={p.id}>{getLocalizedText(p.name, currentLang) || p.name?.en || p.id}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 cursor-pointer ${editingId ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? t('ingredient_groups.save_changes') : t('ingredient_groups.add_group')}
          </button>
        </form>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : parentGroups.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm italic">
              {t('ingredient_groups.empty')}
            </div>
          ) : parentGroups.map(parent => {
            const children = groups.filter(g => g.parentId === parent.id);
            const parentName = getLocalizedText(parent.name, currentLang) || parent.id;
            const parentSecondary = !isEn && parent.name?.en && parent.name.en !== parentName ? parent.name.en : null;

            return (
              <div key={parent.id} className="bg-surface-dark/50 border border-primary/20 rounded-xl overflow-hidden">
                <div className="bg-background-dark p-3 flex justify-between items-center border-b border-primary/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-primary text-xl">folder</span>
                    <h3 className="font-bold text-slate-100 text-lg">
                      {parentName}
                      {parentSecondary && (
                        <span className="text-slate-400 font-medium text-sm ml-2">/ {parentSecondary}</span>
                      )}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(parent)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(parent.id, parentName)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                
                {children.length > 0 && (
                  <div className="p-2 pl-8 grid grid-cols-1 gap-1">
                    {children.map(child => {
                      const childName = getLocalizedText(child.name, currentLang) || child.id;
                      const childSecondary = !isEn && child.name?.en && child.name.en !== childName ? child.name.en : null;
                      return (
                        <div key={child.id} className="flex justify-between items-center p-2 rounded hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                          <div className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
                            <span className="material-symbols-outlined text-slate-500 text-sm">subdirectory_arrow_right</span>
                            <span>{childName}</span>
                            {childSecondary && (
                              <span className="text-slate-500 text-xs font-normal">/ {childSecondary}</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditClick(child)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => handleDelete(child.id, childName)} className="p-1 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
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
      </div>

      {/* ── CSV Import Confirmation Modal ─────────────────────────────── */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
              <span className="material-symbols-outlined text-primary text-2xl">file_upload</span>
              <div>
                <h3 className="font-bold text-slate-100 text-base">
                  {t('ingredient_groups.csv_modal_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('ingredient_groups.csv_modal_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background-dark/80 border border-emerald-500/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{csvPreview.newRows.length}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('ingredient_groups.csv_new_count')}
                </p>
              </div>
              <div className="bg-background-dark/80 border border-amber-500/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{csvPreview.duplicateRows.length}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {t('ingredient_groups.csv_duplicate_count')}
                </p>
              </div>
            </div>

            {csvPreview.duplicateRows.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-slate-400">
                  {t('ingredient_groups.csv_duplicates_list')}
                </p>
                {csvPreview.duplicateRows.map((r, i) => (
                  <div key={i} className="text-xs font-mono text-slate-300 bg-background-dark/60 rounded-lg px-2.5 py-1.5 flex justify-between">
                    <span>{r.name_bg || r.name_en}</span>
                    <span className="text-slate-500 text-[10px]">{r.id}</span>
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
                  {t('ingredient_groups.csv_import_new', { count: csvPreview.newRows.length })}
                </button>
              )}
              {csvPreview.duplicateRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => executeImport('all')}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer"
                >
                  {t('ingredient_groups.csv_import_all', { count: csvPreview.newRows.length + csvPreview.duplicateRows.length })}
                </button>
              )}
              <button
                type="button"
                onClick={() => executeImport('cancel')}
                className="w-full py-2 rounded-xl bg-background-dark/60 hover:bg-background-dark text-slate-400 font-bold text-xs transition-all cursor-pointer mt-1"
              >
                {t('ingredient_groups.csv_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageIngredientGroups;

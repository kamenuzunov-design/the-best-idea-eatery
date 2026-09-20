import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocalizedText } from '../../lib/localeUtils';

const ManageIngredientGroups = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';
  const localLangMeta = LANGUAGE_LABELS[currentLang] || { name: currentLang.toUpperCase(), flag: '' };

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [nameLocal, setNameLocal] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');

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
    const finalNameEn = nameEn.trim() || nameLocal.trim();
    if (!finalNameEn) return;

    const finalNameLocal = nameLocal.trim() || finalNameEn;
    const cleanId = (editingId ? groupId : (groupId || finalNameEn)).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '');
    if (!cleanId) return;

    try {
      const groupData = {
        name: {},
        parentId: parentId || null,
        level: parentId ? 1 : 0,
        updatedAt: new Date().toISOString()
      };

      // Multilingual Data Entry Paradigm
      if (isEn) {
        groupData.name.en = finalNameEn;
        groupData.name_en = finalNameEn;

        // Auto-fallback for all supported languages
        for (const lang of SUPPORTED_LANGUAGES) {
          groupData.name[lang] = finalNameEn;
          groupData[`name_${lang}`] = finalNameEn;
        }
        groupData.name.bg = finalNameEn;
        groupData.name_bg = finalNameEn;
      } else {
        groupData.name.en = finalNameEn;
        groupData.name_en = finalNameEn;
        groupData.name[currentLang] = finalNameLocal;
        groupData[`name_${currentLang}`] = finalNameLocal;

        if (currentLang === 'bg') {
          groupData.name.bg = finalNameLocal;
          groupData.name_bg = finalNameLocal;
        }

        // Auto-fallback to EN for other languages
        for (const lang of SUPPORTED_LANGUAGES) {
          if (!groupData.name[lang]) {
            groupData.name[lang] = finalNameEn;
          }
          if (!groupData[`name_${lang}`]) {
            groupData[`name_${lang}`] = finalNameEn;
          }
        }
        if (!groupData.name.bg) groupData.name.bg = finalNameEn;
        if (!groupData.name_bg) groupData.name_bg = finalNameEn;
      }

      if (editingId) {
        // When editing, preserve existing translations for other languages from existing group
        const existingGroup = groups.find(g => g.id === editingId);
        if (existingGroup) {
          for (const lang of SUPPORTED_LANGUAGES) {
            if (lang !== currentLang && lang !== 'en') {
              if (existingGroup.name?.[lang]) groupData.name[lang] = existingGroup.name[lang];
              if (existingGroup[`name_${lang}`]) groupData[`name_${lang}`] = existingGroup[`name_${lang}`];
            }
          }
          if (currentLang !== 'bg') {
            if (existingGroup.name?.bg) groupData.name.bg = existingGroup.name.bg;
            if (existingGroup.name_bg) groupData.name_bg = existingGroup.name_bg;
          }
        }

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
    setNameEn(val);
    if (!editingId && (isEn || !groupId)) {
      setGroupId(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, ''));
    }
  };

  const handleEditClick = (g) => {
    setEditingId(g.id);
    setGroupId(g.id);
    
    // Multilingual names
    const currentLocalName = g.name?.[currentLang] || g[`name_${currentLang}`] || (currentLang === 'bg' ? (g.name?.bg || g.name_bg) : '');
    const currentEnName = g.name?.en || g.name_en || (isEn ? (g.name?.bg || g.name_bg) : '');
    setNameLocal(currentLocalName || '');
    setNameEn(currentEnName || '');

    setParentId(g.parentId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGroupId('');
    setNameLocal('');
    setNameEn('');
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

  const parentGroups = groups.filter(g => g.level === 0);

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{t('ingredient_groups.title')}</h1>
            <p className="text-xs font-medium text-primary/70">{t('ingredient_groups.count', { count: groups.length })}</p>
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
                  value={nameEn} 
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
                    value={nameLocal} 
                    onChange={(e) => setNameLocal(e.target.value)} 
                    className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm focus:border-primary outline-none" 
                    placeholder={t('ingredient_groups.name_placeholder')} 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">{t('ingredient_groups.name_en')}</label>
                  <input 
                    value={nameEn} 
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
    </div>
  );
};

export default ManageIngredientGroups;

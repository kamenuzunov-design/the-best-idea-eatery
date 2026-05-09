import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ManageIngredientGroups = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [nameBg, setNameBg] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'ingredient_groups'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort: parents first, then children
      data.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return (a.name?.en || '').localeCompare(b.name?.en || '');
      });
      setGroups(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!groupId || !nameBg || !nameEn) return;

    try {
      const groupData = {
        name: {
          bg: nameBg,
          en: nameEn
        },
        parentId: parentId || null,
        level: parentId ? 1 : 0,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'ingredient_groups', editingId), groupData);
        await logActivity(user.uid, user.email, 'edit_ingredient_group', `Edited group: ${nameEn}`);
      } else {
        groupData.id = groupId;
        groupData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'ingredient_groups', groupId), groupData);
        await logActivity(user.uid, user.email, 'add_ingredient_group', `Added group: ${nameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving group:", error);
      alert(isBg ? 'Грешка при запазване.' : 'Error saving.');
    }
  };

  const handleEditClick = (g) => {
    setEditingId(g.id);
    setGroupId(g.id);
    setNameBg(g.name?.bg || '');
    setNameEn(g.name?.en || '');
    setParentId(g.parentId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGroupId('');
    setNameBg('');
    setNameEn('');
    setParentId('');
  };

  const handleDelete = async (targetId, targetName) => {
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да изтриете ${targetName}?` : `Are you sure you want to delete ${targetName}?`)) return;
    
    try {
      // Check if it has children
      const hasChildren = groups.some(g => g.parentId === targetId);
      if (hasChildren) {
        alert(isBg ? 'Не можете да изтриете група, която има подгрупи.' : 'Cannot delete a group that has subgroups.');
        return;
      }
      
      await deleteDoc(doc(db, 'ingredient_groups', targetId));
      await logActivity(user.uid, user.email, 'delete_ingredient_group', `Deleted group: ${targetName}`);
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const parentGroups = groups.filter(g => g.level === 0);

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Групи Продукти' : 'Ingredient Groups'}</h1>
            <p className="text-xs font-medium text-primary/70">{groups.length} {isBg ? 'групи общо' : 'groups total'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSaveGroup} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-blue-500/10 border-blue-500/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? (isBg ? 'Редактиране на група' : 'Edit Group') 
                : (isBg ? 'Нова група' : 'New Group')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold bg-background-dark px-3 py-1 rounded">
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-400">{isBg ? 'ID (Slug) *' : 'ID (Slug) *'}</label>
              <input value={groupId} onChange={(e) => setGroupId(e.target.value)} required disabled={!!editingId} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70" placeholder="e.g. vegetables_root" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (EN) *' : 'Name (EN) *'}</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Root vegetables" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (BG) *' : 'Name (BG) *'}</label>
              <input value={nameBg} onChange={(e) => setNameBg(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Кореноплодни" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400">{isBg ? 'Основна група (Остави празно ако това е основна група)' : 'Parent Group (Leave empty if this is a main group)'}</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm">
                <option value="">-- {isBg ? 'Основна Група' : 'Main Group'} --</option>
                {parentGroups.map(p => (
                  <option key={p.id} value={p.id}>{isBg ? p.name.bg : p.name.en}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 ${editingId ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? (isBg ? 'Запази промените' : 'Save Changes') : (isBg ? 'Добави група' : 'Add Group')}
          </button>
        </form>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : parentGroups.map(parent => {
            const children = groups.filter(g => g.parentId === parent.id);
            const parentName = isBg ? parent.name.bg : parent.name.en;

            return (
              <div key={parent.id} className="bg-surface-dark/50 border border-primary/20 rounded-xl overflow-hidden">
                <div className="bg-background-dark p-3 flex justify-between items-center border-b border-primary/10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">folder</span>
                    <h3 className="font-bold text-slate-100 text-lg">{parentName}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(parent)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(parent.id, parentName)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                
                {children.length > 0 && (
                  <div className="p-2 pl-8 grid grid-cols-1 gap-1">
                    {children.map(child => {
                      const childName = isBg ? child.name.bg : child.name.en;
                      return (
                        <div key={child.id} className="flex justify-between items-center p-2 rounded hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="material-symbols-outlined text-slate-500 text-sm">subdirectory_arrow_right</span>
                            {childName}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditClick(child)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => handleDelete(child.id, childName)} className="p-1 text-slate-500 hover:text-rose-500 transition-colors">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      )
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

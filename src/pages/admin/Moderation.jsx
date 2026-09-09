import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const Moderation = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [pendingApprovalItems, setPendingApprovalItems] = useState([]);
  const [translationRecipes, setTranslationRecipes] = useState([]);
  const [translationIngs, setTranslationIngs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'translation' | 'approval'

  useEffect(() => {
    // 1. Recipes pending approval
    const qPending = query(collection(db, 'recipes'), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'recipe' }));
      setPendingApprovalItems(data);
      setLoading(false);
    });

    // 2. Recipes needing translation
    const qTransRecipes = query(collection(db, 'recipes'), where('needs_translation', '==', true));
    const unsubTransRecipes = onSnapshot(qTransRecipes, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'recipe' }));
      setTranslationRecipes(data);
    });

    // 3. Ingredients needing translation
    const qTransIngs = query(collection(db, 'ingredients'), where('needs_translation', '==', true));
    const unsubTransIngs = onSnapshot(qTransIngs, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'ingredient' }));
      setTranslationIngs(data);
    });

    return () => {
      unsubPending();
      unsubTransRecipes();
      unsubTransIngs();
    };
  }, []);

  const allItems = React.useMemo(() => {
    const map = new Map();
    pendingApprovalItems.forEach(item => {
      map.set(`${item.type}_${item.id}`, { ...item, isPendingApproval: true });
    });
    [...translationRecipes, ...translationIngs].forEach(item => {
      const key = `${item.type}_${item.id}`;
      if (map.has(key)) {
        map.set(key, { ...map.get(key), isNeedsTranslation: true });
      } else {
        map.set(key, { ...item, isNeedsTranslation: true });
      }
    });
    return Array.from(map.values());
  }, [pendingApprovalItems, translationRecipes, translationIngs]);

  const translationCount = translationRecipes.length + translationIngs.length;

  const filteredItems = React.useMemo(() => {
    if (activeTab === 'translation') {
      return allItems.filter(item => item.isNeedsTranslation);
    }
    if (activeTab === 'approval') {
      return allItems.filter(item => item.isPendingApproval);
    }
    return allItems;
  }, [allItems, activeTab]);

  const handleAction = async (itemId, type, newStatus, itemTitle) => {
    try {
      const itemRef = doc(db, type === 'recipe' ? 'recipes' : 'ingredients', itemId);
      await updateDoc(itemRef, { 
        status: newStatus,
        is_active: newStatus === 'approved'
      });
      
      await logActivity(
        user.uid, 
        user.email, 
        `moderate_${type}`, 
        `${newStatus === 'approved' ? 'Approved' : 'Rejected'} ${type}: ${itemTitle}`
      );
    } catch (error) {
      console.error("Error moderating item:", error);
      alert(isBg ? 'Грешка при модерация.' : 'Moderation error.');
    }
  };

  const handleMarkTranslated = async (itemId, type, itemTitle) => {
    try {
      const itemRef = doc(db, type === 'recipe' ? 'recipes' : 'ingredients', itemId);
      await updateDoc(itemRef, {
        needs_translation: false,
        translation_reason: null
      });
      await logActivity(
        user.uid,
        user.email,
        `mark_translated_${type}`,
        `Marked ${type} as translated: ${itemTitle}`
      );
    } catch (error) {
      console.error("Error updating translation status:", error);
      alert(isBg ? 'Грешка при обновяване на статуса.' : 'Error updating status.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Модерация' : 'Moderation'}</h1>
          <p className="text-xs font-medium text-primary/70">
            {allItems.length} {isBg ? 'активни записа в опашката' : 'active items in queue'}
          </p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {/* Banner: Recipes pending translation from English */}
        {translationCount > 0 && (
          <div 
            onClick={() => setActiveTab('translation')}
            className={`flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-500/20 via-[#b8860b]/25 to-amber-600/20 border-2 rounded-2xl cursor-pointer transition-all shadow-lg group ${
              activeTab === 'translation' ? 'border-amber-400 shadow-amber-500/20' : 'border-amber-500/50 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[22px]">translate</span>
              </div>
              <div>
                <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  {isBg ? 'Има рецепти за превод от английски' : 'Recipes pending translation from English'}
                </p>
                <p className="text-[11px] text-slate-300">
                  {isBg 
                    ? `${translationCount} ${translationCount === 1 ? 'елемент чака' : 'елемента чакат'} адаптация на български` 
                    : `${translationCount} ${translationCount === 1 ? 'item requires' : 'items require'} Bulgarian translation`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-background-dark rounded-full font-black text-xs">
              <span>{translationCount}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary text-background-dark border-primary'
                : 'bg-surface-dark/80 text-slate-300 border-primary/20 hover:border-primary/40'
            }`}
          >
            {isBg ? 'Всички' : 'All'} ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab('translation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'translation'
                ? 'bg-amber-500 text-background-dark border-amber-500 font-black'
                : 'bg-surface-dark/80 text-amber-400 border-amber-500/30 hover:border-amber-500/60'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">translate</span>
            {isBg ? 'За превод от английски' : 'Needs Translation'}
            {translationCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === 'translation' ? 'bg-background-dark text-amber-400' : 'bg-amber-500/20 text-amber-300'}`}>
                {translationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'approval'
                ? 'bg-blue-500 text-white border-blue-500 font-black'
                : 'bg-surface-dark/80 text-blue-400 border-blue-500/30 hover:border-blue-500/60'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            {isBg ? 'Чакащи одобрение' : 'Pending Approval'}
            {pendingApprovalItems.length > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === 'approval' ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-300'}`}>
                {pendingApprovalItems.length}
              </span>
            )}
          </button>
        </div>

        {/* List of items */}
        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">done_all</span>
            <p>
              {activeTab === 'translation'
                ? (isBg ? 'Няма рецепти за превод от английски.' : 'No recipes pending translation.')
                : activeTab === 'approval'
                  ? (isBg ? 'Няма съдържание за одобрение.' : 'No pending content.')
                  : (isBg ? 'Опашката е напълно чиста.' : 'Queue is completely clear.')}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const titleEn = item.title_en || item.name_en || item.title || item.id;
            const titleBg = item.title_bg || item.name_bg || '';
            const description = isBg
              ? (item.description_bg || item.description || (isBg ? 'Няма описание' : 'No description'))
              : (item.description_en || item.description || (isBg ? 'Няма описание' : 'No description'));
            const author = item.publisher_name || item.authorName || (isBg ? 'Неизвестен' : 'Unknown');

            return (
              <div key={`${item.type}_${item.id}`} className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {item.type === 'recipe' ? (isBg ? 'Рецепта' : 'Recipe') : (isBg ? 'Продукт' : 'Product')}
                    </span>
                    {item.isNeedsTranslation && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">translate</span>
                        {item.translation_reason === 'en_edited' 
                          ? (isBg ? 'Редактиран английски текст' : 'Edited English text')
                          : (isBg ? 'Нов запис (EN)' : 'New entry (EN)')}
                      </span>
                    )}
                    {item.isPendingApproval && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {isBg ? 'Чака одобрение' : 'Pending Approval'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{isBg ? 'от' : 'by'} {author}</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">EN:</span>
                    <h3 className="text-lg font-bold text-slate-100">{titleEn}</h3>
                  </div>
                  {titleBg && (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">BG:</span>
                      <p className={`text-sm ${titleBg.includes('[за превод]') ? 'text-amber-300/90 italic' : 'text-slate-300'}`}>
                        {titleBg}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-primary/10 pt-3">
                  <button 
                    onClick={() => {
                      if (item.type === 'recipe') {
                        navigate(`/admin/recipes?edit=${item.id}`);
                      } else {
                        navigate(`/admin/ingredients?edit=${item.id}`);
                      }
                    }}
                    className="bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-amber-300 font-bold py-2 px-3 rounded-lg transition-colors border border-amber-500/40 flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                    title={isBg ? 'Преведи и редактирай' : 'Translate and edit'}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    {isBg ? 'Преведи / Редактирай' : 'Translate / Edit'}
                  </button>

                  {item.isNeedsTranslation && !item.isPendingApproval && (
                    <button 
                      onClick={() => handleMarkTranslated(item.id, item.type, titleEn)}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-2 px-3 rounded-lg transition-colors border border-emerald-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer sm:col-span-2"
                      title={isBg ? 'Маркирай като завършен превод' : 'Mark as translated'}
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {isBg ? 'Маркирай преведена' : 'Mark Translated'}
                    </button>
                  )}

                  {item.isPendingApproval && (
                    <>
                      <button 
                        onClick={() => handleAction(item.id, item.type, 'approved', titleEn)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold py-2 px-3 rounded-lg transition-colors border border-emerald-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        {isBg ? 'Одобри' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, item.type, 'rejected', titleEn)}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold py-2 px-3 rounded-lg transition-colors border border-rose-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        {isBg ? 'Отхвърли' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Moderation;

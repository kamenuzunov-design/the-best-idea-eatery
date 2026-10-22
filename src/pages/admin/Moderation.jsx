import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { getLocalizedField, LANGUAGE_LABELS } from '../../lib/localeUtils';
import {
  publishNewRecipeAnnouncement,
  translateRecipeTo5Languages,
  translatePostTo5Languages
} from '../../lib/communityUtils';

const Moderation = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentLang = i18n.language || 'bg';

  const [pendingApprovalItems, setPendingApprovalItems] = useState([]);
  const [translationRecipes, setTranslationRecipes] = useState([]);
  const [translationIngs, setTranslationIngs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'translation' | 'approval'
  const [translatingKey, setTranslatingKey] = useState(null);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);

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

  const handleAutoTranslateItem = async (item, silent = false) => {
    const key = `${item.type}_${item.id}`;
    setTranslatingKey(key);
    try {
      if (item.type === 'recipe') {
        const cleanStr = (val) => (typeof val === 'string' && !val.includes('[за превод]') && !val.includes('[needs translation]') ? val.trim() : '');
        const bgTitle = cleanStr(item.title?.bg || item.title_bg);
        const enTitle = cleanStr(item.title?.en || item.title_en);
        const sourceLang = bgTitle ? 'bg' : (enTitle ? 'en' : currentLang);
        const sourceTitle = bgTitle || enTitle || cleanStr(item.title?.[currentLang]) || item.id;

        const bgDesc = cleanStr(item.description?.bg || item.description_bg);
        const enDesc = cleanStr(item.description?.en || item.description_en);
        const sourceDesc = sourceLang === 'bg' ? (bgDesc || enDesc) : (enDesc || bgDesc);

        const rawIngs = Array.isArray(item.ingredients) ? item.ingredients : [];
        const notesList = rawIngs.map(ing => {
          const nBg = cleanStr(ing.notes?.bg || ing.notes_bg);
          const nEn = cleanStr(ing.notes?.en || ing.notes_en);
          return sourceLang === 'bg' ? (nBg || nEn) : (nEn || nBg);
        });

        const rawSteps = Array.isArray(item.steps) ? item.steps : [];
        const stepsList = rawSteps.map(st => {
          const sBg = cleanStr(st.instruction?.bg || st.instruction_bg);
          const sEn = cleanStr(st.instruction?.en || st.instruction_en);
          return sourceLang === 'bg' ? (sBg || sEn) : (sEn || sBg);
        });

        const aiRes = await translateRecipeTo5Languages({
          title: sourceTitle,
          description: sourceDesc,
          notesList,
          stepsList,
          sourceLang
        });

        if (!aiRes.translatedAll) {
          if (!silent) {
            alert(t('moderation.ai_translate_failed', 'Преводът с Chef AI не успя (проверете интернет връзката или Gemini API ключа).'));
          }
          return null;
        }

        const updatedIngredients = rawIngs.map((ing, idx) => {
          const noteMap = aiRes.notes[idx] || { bg: '', en: '', it: '', fr: '', de: '' };
          return {
            ...ing,
            notes: noteMap,
            notes_bg: noteMap.bg || '',
            notes_en: noteMap.en || ''
          };
        });

        const updatedSteps = rawSteps.map((st, idx) => {
          const stepMap = aiRes.steps[idx] || { bg: '', en: '', it: '', fr: '', de: '' };
          return {
            ...st,
            instruction: stepMap,
            instruction_bg: stepMap.bg || '',
            instruction_en: stepMap.en || ''
          };
        });

        const updatedPayload = {
          title: aiRes.title,
          title_bg: aiRes.title.bg,
          title_en: aiRes.title.en,
          description: aiRes.description,
          description_bg: aiRes.description.bg,
          description_en: aiRes.description.en,
          ingredients: updatedIngredients,
          steps: updatedSteps,
          needs_translation: false,
          translation_reason: null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'recipes', item.id), updatedPayload);
        await logActivity(
          user.uid,
          user.email,
          'ai_translate_recipe',
          `Auto-translated recipe into 5 languages: ${aiRes.title.en || sourceTitle}`
        );
        return { ...item, ...updatedPayload };
      } else {
        // Ingredient translation into 5 languages
        const cleanStr = (val) => (typeof val === 'string' && !val.includes('[за превод]') && !val.includes('[needs translation]') ? val.trim() : '');
        const bgName = cleanStr(item.name?.bg || item.name_bg);
        const enName = cleanStr(item.name?.en || item.name_en);
        const sourceLang = bgName ? 'bg' : (enName ? 'en' : currentLang);
        const sourceName = bgName || enName || cleanStr(item.name?.[currentLang]) || item.id;

        const postTrans = await translatePostTo5Languages({
          title: sourceName,
          caption: '',
          sourceLang
        });

        const langsPresent = ['bg', 'en', 'it', 'fr', 'de'].every(l => postTrans[l]?.title);
        if (!langsPresent) {
          if (!silent) {
            alert(t('moderation.ai_translate_failed', 'Преводът с Chef AI не успя (проверете интернет връзката или Gemini API ключа).'));
          }
          return null;
        }

        const nameObj = {
          bg: postTrans.bg.title,
          en: postTrans.en.title,
          it: postTrans.it.title,
          fr: postTrans.fr.title,
          de: postTrans.de.title
        };

        const updatedPayload = {
          name: nameObj,
          name_bg: nameObj.bg,
          name_en: nameObj.en,
          needs_translation: false,
          translation_reason: null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'ingredients', item.id), updatedPayload);
        await logActivity(
          user.uid,
          user.email,
          'ai_translate_ingredient',
          `Auto-translated ingredient into 5 languages: ${nameObj.en || sourceName}`
        );
        return { ...item, ...updatedPayload };
      }
    } catch (err) {
      console.error('Error auto-translating item:', err);
      if (!silent) {
        alert(t('moderation.ai_translate_failed', 'Преводът с Chef AI не успя (проверете интернет връзката или Gemini API ключа).'));
      }
      return null;
    } finally {
      setTranslatingKey(null);
    }
  };

  const handleAutoTranslateAll = async () => {
    const queue = allItems.filter(it => it.isNeedsTranslation);
    if (queue.length === 0 || isBulkTranslating) return;

    setIsBulkTranslating(true);
    try {
      for (const it of queue) {
        await handleAutoTranslateItem(it, true);
      }
    } finally {
      setIsBulkTranslating(false);
    }
  };

  const handleAction = async (itemId, type, newStatus, itemTitle) => {
    try {
      const targetItem = allItems.find(it => it.type === type && it.id === itemId);
      let latestItemData = targetItem;

      // If approving an item that still needs translation, auto-translate it first
      if (newStatus === 'approved' && targetItem?.isNeedsTranslation) {
        const translated = await handleAutoTranslateItem(targetItem, true);
        if (translated) {
          latestItemData = translated;
        }
      }

      const itemRef = doc(db, type === 'recipe' ? 'recipes' : 'ingredients', itemId);
      await updateDoc(itemRef, { 
        status: newStatus,
        is_active: newStatus === 'approved'
      });

      if (type === 'recipe' && newStatus === 'approved' && latestItemData) {
        await publishNewRecipeAnnouncement(latestItemData, itemId);
      }
      
      await logActivity(
        user.uid, 
        user.email, 
        `moderate_${type}`, 
        `${newStatus === 'approved' ? 'Approved' : 'Rejected'} ${type}: ${itemTitle}`
      );
    } catch (error) {
      console.error("Error moderating item:", error);
      alert(t('moderation.error_action'));
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
      alert(t('moderation.error_mark_translated'));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button 
          onClick={() => navigate('/admin')} 
          aria-label={t('common.buttons.back')}
          title={t('common.buttons.back')}
          className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t('moderation.title')}</h1>
          <p className="text-xs font-medium text-primary/70">
            {allItems.length === 1
              ? t('moderation.active_items_queue_one')
              : t('moderation.active_items_queue_other', { count: allItems.length })}
          </p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {/* Banner: Recipes/Ingredients pending translation */}
        {translationCount > 0 && (
          <div 
            onClick={() => setActiveTab('translation')}
            className={`flex flex-col gap-3 p-3.5 bg-gradient-to-r from-amber-500/20 via-[#b8860b]/25 to-amber-600/20 border-2 rounded-2xl cursor-pointer transition-all shadow-lg group ${
              activeTab === 'translation' ? 'border-amber-400 shadow-amber-500/20' : 'border-amber-500/50 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-[22px]">translate</span>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                    {t('moderation.banner_title')}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {translationCount === 1 
                      ? t('moderation.banner_desc_one')
                      : t('moderation.banner_desc_other', { count: translationCount })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-background-dark rounded-full font-black text-xs shrink-0">
                <span>{translationCount}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isBulkTranslating || !!translatingKey}
              onClick={(e) => {
                e.stopPropagation();
                handleAutoTranslateAll();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${isBulkTranslating ? 'animate-spin' : ''}`}>
                {isBulkTranslating ? 'sync' : 'auto_awesome'}
              </span>
              <span>
                {isBulkTranslating
                  ? t('moderation.ai_translating_all', 'Превеждане на всички с Chef AI...')
                  : t('moderation.ai_translate_all_btn', 'Преведи всички с Chef AI (5 езика)')}
              </span>
            </button>
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
            {t('moderation.tabs.all')} ({allItems.length})
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
            {t('moderation.tabs.translation')}
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
            {t('moderation.tabs.approval')}
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
                ? t('moderation.empty_translation')
                : activeTab === 'approval'
                  ? t('moderation.empty_approval')
                  : t('moderation.empty_all')}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const titleEn = item.title?.en || item.name?.en || item.title_en || item.name_en || item.title || item.id;
            const titleLocal = getLocalizedField(item, item.type === 'recipe' ? 'title' : 'name', currentLang);
            const showLocalTitle = currentLang !== 'en' && titleLocal && titleLocal !== titleEn;
            const description = getLocalizedField(item, 'description', currentLang) || item.description || t('moderation.no_description');
            const author = item.publisher_name || item.authorName || t('moderation.unknown_author');
            const currentLangUpper = currentLang.toUpperCase();
            const currentFlag = LANGUAGE_LABELS[currentLang]?.flag || '';

            return (
              <div key={`${item.type}_${item.id}`} className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {item.type === 'recipe' ? t('moderation.type_recipe') : t('moderation.type_ingredient')}
                    </span>
                    {item.isNeedsTranslation && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">translate</span>
                        {item.translation_reason === 'en_edited' 
                          ? t('moderation.reasons.en_edited')
                          : t('moderation.reasons.new_en')}
                      </span>
                    )}
                    {item.isPendingApproval && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {t('moderation.pending_approval_badge')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{t('moderation.by_author', { author })}</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">EN:</span>
                    <h3 className="text-lg font-bold text-slate-100">{titleEn}</h3>
                  </div>
                  {showLocalTitle && (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">
                        {currentFlag} {currentLangUpper}:
                      </span>
                      <p className={`text-sm ${titleLocal.includes('[за превод]') || titleLocal.includes('[needs translation]') ? 'text-amber-300/90 italic' : 'text-slate-300'}`}>
                        {titleLocal}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-primary/10 pt-3">
                  {item.isNeedsTranslation && (
                    <button
                      type="button"
                      disabled={translatingKey === `${item.type}_${item.id}` || isBulkTranslating}
                      onClick={() => handleAutoTranslateItem(item)}
                      className="bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-2 px-3 rounded-lg transition-all hover:brightness-110 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 sm:col-span-3 shadow-sm"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${translatingKey === `${item.type}_${item.id}` ? 'animate-spin' : ''}`}>
                        {translatingKey === `${item.type}_${item.id}` ? 'sync' : 'auto_awesome'}
                      </span>
                      <span>
                        {translatingKey === `${item.type}_${item.id}`
                          ? t('recipes.ai_translating_btn', 'Превеждане...')
                          : t('moderation.buttons.ai_translate_5langs', 'Автоматичен превод с Chef AI (5 езика)')}
                      </span>
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      if (item.type === 'recipe') {
                        navigate(`/admin/recipes?edit=${item.id}`);
                      } else {
                        navigate(`/admin/ingredients?edit=${item.id}`);
                      }
                    }}
                    className="bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-amber-300 font-bold py-2 px-3 rounded-lg transition-colors border border-amber-500/40 flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                    title={t('moderation.buttons.translate_edit_tooltip')}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    {t('moderation.buttons.translate_edit')}
                  </button>

                  {item.isNeedsTranslation && !item.isPendingApproval && (
                    <button 
                      onClick={() => handleMarkTranslated(item.id, item.type, titleEn)}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-2 px-3 rounded-lg transition-colors border border-emerald-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer sm:col-span-2"
                      title={t('moderation.buttons.mark_translated_tooltip')}
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      {t('moderation.buttons.mark_translated')}
                    </button>
                  )}

                  {item.isPendingApproval && (
                    <>
                      <button 
                        onClick={() => handleAction(item.id, item.type, 'approved', titleEn)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold py-2 px-3 rounded-lg transition-colors border border-emerald-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        {t('moderation.buttons.approve')}
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, item.type, 'rejected', titleEn)}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold py-2 px-3 rounded-lg transition-colors border border-rose-500/30 flex items-center justify-center gap-1 text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        {t('moderation.buttons.reject')}
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

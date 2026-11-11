import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { getLocalizedField, LANGUAGE_LABELS } from '../../lib/localeUtils';
import { ROLES, hasHigherRole, canDeleteContentByRank } from '../../constants/roles';
import {
  publishNewRecipeAnnouncement,
  syncRecipeCommunityPost,
  translateRecipeTo5Languages,
  translatePostTo5Languages,
  moderateCommunityItem,
  saveCommunityPosts
} from '../../lib/communityUtils';

const Moderation = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentLang = i18n.language || 'bg';

  const [pendingApprovalItems, setPendingApprovalItems] = useState([]);
  const [translationRecipes, setTranslationRecipes] = useState([]);
  const [translationIngs, setTranslationIngs] = useState([]);
  const [communityReports, setCommunityReports] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [usersRoleMap, setUsersRoleMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'translation' | 'approval' | 'community'
  const [communitySubView, setCommunitySubView] = useState('reports'); // 'reports' | 'feed'
  const [translatingKey, setTranslatingKey] = useState(null);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [processingReportId, setProcessingReportId] = useState(null);

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

    // 4. Community Reports
    const reportsRef = doc(db, 'campaigns', 'community_reports');
    const unsubReports = onSnapshot(reportsRef, (snap) => {
      if (snap.exists() && Array.isArray(snap.data().reports)) {
        setCommunityReports(snap.data().reports);
      } else {
        setCommunityReports([]);
      }
    });

    // 5. Community Feed (for direct inspection & moderation)
    const feedRef = doc(db, 'campaigns', 'community_feed');
    const unsubFeed = onSnapshot(feedRef, (snap) => {
      if (snap.exists() && Array.isArray(snap.data().posts)) {
        setCommunityPosts(snap.data().posts);
      } else {
        setCommunityPosts([]);
      }
    });

    // 6. Users collection for live role resolution
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map = new Map();
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        const r = d.role || ROLES.USER;
        map.set(docSnap.id, r);
        if (d.email) {
          map.set(String(d.email).toLowerCase(), r);
        }
      });
      setUsersRoleMap(map);
    });

    return () => {
      unsubPending();
      unsubTransRecipes();
      unsubTransIngs();
      unsubReports();
      unsubFeed();
      unsubUsers();
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
  const pendingReports = React.useMemo(
    () => communityReports.filter(r => r.status === 'pending'),
    [communityReports]
  );
  const pendingReportsCount = pendingReports.length;

  const filteredItems = React.useMemo(() => {
    if (activeTab === 'translation') {
      return allItems.filter(item => item.isNeedsTranslation);
    }
    if (activeTab === 'approval') {
      return allItems.filter(item => item.isPendingApproval);
    }
    return allItems;
  }, [allItems, activeTab]);

  const resolveEffectiveRole = (authorId, authorEmail, fallbackRole) => {
    if (authorId && usersRoleMap.has(authorId)) {
      return usersRoleMap.get(authorId);
    }
    if (authorEmail && usersRoleMap.has(String(authorEmail).toLowerCase())) {
      return usersRoleMap.get(String(authorEmail).toLowerCase());
    }
    return fallbackRole || ROLES.USER;
  };

  const getRoleBadgeLabel = (role) => {
    switch (role) {
      case ROLES.OWNER:
        return t('roles.owner', 'Собственик');
      case ROLES.ADMIN:
        return t('roles.admin', 'Администратор');
      case ROLES.MODERATOR:
        return t('roles.moderator', 'Модератор');
      default:
        return t('roles.user', 'Потребител');
    }
  };

  const getReasonBadgeLabel = (reason) => {
    switch (reason) {
      case 'hate_speech':
        return t('gourmet_community.moderation.reason_hate_speech', 'Груб език / Обиди');
      case 'profanity':
        return t('gourmet_community.moderation.reason_profanity', 'Нецензурни изрази');
      case 'inappropriate':
        return t('gourmet_community.moderation.reason_inappropriate', 'Некоректно съдържание / Спам');
      default:
        return t('gourmet_community.moderation.reason_other', 'Друга причина');
    }
  };

  const handleModerateCommunity = async ({ action, postId, commentId, targetType, targetAuthorId, targetAuthorEmail, targetAuthorRole }) => {
    const effectiveTargetRole = resolveEffectiveRole(targetAuthorId, targetAuthorEmail, targetAuthorRole);

    if (action !== 'dismiss') {
      const allowed = canDeleteContentByRank({
        actorId: user?.uid,
        actorRole: user?.role,
        targetAuthorId,
        targetAuthorRole: effectiveTargetRole
      });
      if (!allowed) {
        alert(
          t(
            'moderation.community.insufficient_rank',
            'Нямате право да модерирате съдържание на потребител с равен или по-висок ранг.'
          )
        );
        return;
      }
    }

    if (action === 'delete' || action === 'delete_cascade') {
      const confirmMsg =
        action === 'delete_cascade'
          ? t(
              'gourmet_community.moderation.confirm_delete_cascade',
              'Сигурни ли сте, че искате да изтриете този коментар и всички последващи отговори/спорове след него?'
            )
          : t('moderation.community.confirm_delete', 'Сигурни ли сте, че искате да изтриете това съдържание завинаги?');
      if (!window.confirm(confirmMsg)) return;
    }

    const busyKey = `${postId}_${commentId || 'post'}_${action}`;
    setProcessingReportId(busyKey);
    try {
      await moderateCommunityItem({
        action,
        postId,
        commentId,
        targetType,
        moderatorId: user?.uid || '',
        moderatorEmail: user?.email || ''
      });

      await logActivity(
        user?.uid,
        user?.email,
        `moderate_community_${action}`,
        `Community moderation (${action}) on ${targetType} in post ${postId}`
      );
    } catch (err) {
      console.error('Error moderating community item:', err);
      alert(t('moderation.error_action', 'Възникна грешка при обработката.'));
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleToggleLockPostFromAdmin = async (post) => {
    let updatedPost = null;
    const nextLocked = !post.commentsLocked;
    const nextPosts = communityPosts.map(p => {
      if (p.id !== post.id) return p;
      updatedPost = { ...p, commentsLocked: nextLocked };
      return updatedPost;
    });
    setCommunityPosts(nextPosts);
    await saveCommunityPosts(nextPosts, updatedPost);
  };

  const handleAutoTranslateItem = async (item, silent = false) => {
    const key = `${item.type}_${item.id}`;
    setTranslatingKey(key);
    try {
      const cleanStr = (val) => (typeof val === 'string' && !val.includes('[за превод]') && !val.includes('[needs translation]') ? val.trim() : '');
      const preferEn = item.translation_reason === 'en_edited' || item.translation_reason === 'new_en';

      if (item.type === 'recipe') {
        const bgTitle = cleanStr(item.title?.bg || item.title_bg);
        const enTitle = cleanStr(item.title?.en || item.title_en);
        const sourceLang = preferEn
          ? (enTitle ? 'en' : (bgTitle ? 'bg' : currentLang))
          : (bgTitle ? 'bg' : (enTitle ? 'en' : currentLang));
        const sourceTitle =
          (sourceLang === 'en' ? (enTitle || bgTitle) : (bgTitle || enTitle)) ||
          cleanStr(item.title?.[currentLang]) ||
          cleanStr(item.title?.es || item.title_es || item.title?.it || item.title_it || item.title?.fr || item.title_fr || item.title?.de || item.title_de) ||
          item.id;

        const bgDesc = cleanStr(item.description?.bg || item.description_bg);
        const enDesc = cleanStr(item.description?.en || item.description_en);
        const sourceDesc =
          (sourceLang === 'en' ? (enDesc || bgDesc) : (bgDesc || enDesc)) ||
          cleanStr(item.description?.[currentLang]) ||
          '';

        const rawIngs = Array.isArray(item.ingredients) ? item.ingredients : [];
        const notesList = rawIngs.map(ing => {
          const nBg = cleanStr(ing.notes?.bg || ing.notes_bg || (typeof ing.notes === 'string' ? ing.notes : ''));
          const nEn = cleanStr(ing.notes?.en || ing.notes_en);
          return (sourceLang === 'en' ? (nEn || nBg) : (nBg || nEn)) || cleanStr(ing.notes?.[currentLang]) || '';
        });

        const rawSteps = Array.isArray(item.steps) ? item.steps : [];
        const stepsList = rawSteps.map(st => {
          const sBg = cleanStr(st.instruction?.bg || st.instruction_bg || (typeof st.instruction === 'string' ? st.instruction : ''));
          const sEn = cleanStr(st.instruction?.en || st.instruction_en);
          return (sourceLang === 'en' ? (sEn || sBg) : (sBg || sEn)) || cleanStr(st.instruction?.[currentLang]) || '';
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
          const noteMap = aiRes.notes[idx] || { bg: '', en: '', es: '', it: '', fr: '', de: '' };
          return {
            ...ing,
            notes: noteMap,
            notes_bg: noteMap.bg || '',
            notes_en: noteMap.en || '',
            notes_es: noteMap.es || '',
            notes_it: noteMap.it || '',
            notes_fr: noteMap.fr || '',
            notes_de: noteMap.de || ''
          };
        });

        const updatedSteps = rawSteps.map((st, idx) => {
          const stepMap = aiRes.steps[idx] || { bg: '', en: '', es: '', it: '', fr: '', de: '' };
          return {
            ...st,
            instruction: stepMap,
            instruction_bg: stepMap.bg || '',
            instruction_en: stepMap.en || '',
            instruction_es: stepMap.es || '',
            instruction_it: stepMap.it || '',
            instruction_fr: stepMap.fr || '',
            instruction_de: stepMap.de || ''
          };
        });

        const updatedPayload = {
          title: aiRes.title,
          title_bg: aiRes.title.bg || '',
          title_en: aiRes.title.en || '',
          title_es: aiRes.title.es || '',
          title_it: aiRes.title.it || '',
          title_fr: aiRes.title.fr || '',
          title_de: aiRes.title.de || '',
          description: aiRes.description,
          description_bg: aiRes.description.bg || '',
          description_en: aiRes.description.en || '',
          description_es: aiRes.description.es || '',
          description_it: aiRes.description.it || '',
          description_fr: aiRes.description.fr || '',
          description_de: aiRes.description.de || '',
          ingredients: updatedIngredients,
          steps: updatedSteps,
          needs_translation: false,
          translation_reason: null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'recipes', item.id), updatedPayload);
        await syncRecipeCommunityPost({ ...item, ...updatedPayload }, item.id);
        await logActivity(
          user.uid,
          user.email,
          'ai_translate_recipe',
          `Auto-translated recipe into 6 languages: ${aiRes.title.en || sourceTitle}`
        );
        return { ...item, ...updatedPayload };
      } else {
        // Ingredient translation into 6 languages
        const bgName = cleanStr(item.name?.bg || item.name_bg);
        const enName = cleanStr(item.name?.en || item.name_en);
        const sourceLang = preferEn
          ? (enName ? 'en' : (bgName ? 'bg' : currentLang))
          : (bgName ? 'bg' : (enName ? 'en' : currentLang));
        const sourceName =
          (sourceLang === 'en' ? (enName || bgName) : (bgName || enName)) ||
          cleanStr(item.name?.[currentLang]) ||
          item.id;

        const postTrans = await translatePostTo5Languages({
          title: sourceName,
          caption: '',
          sourceLang
        });

        const langsPresent = ['bg', 'en', 'es', 'it', 'fr', 'de'].every(l => postTrans[l]?.title);
        if (!langsPresent) {
          if (!silent) {
            alert(t('moderation.ai_translate_failed', 'Преводът с Chef AI не успя (проверете интернет връзката или Gemini API ключа).'));
          }
          return null;
        }

        const nameObj = {
          bg: postTrans.bg.title,
          en: postTrans.en.title,
          es: postTrans.es.title,
          it: postTrans.it.title,
          fr: postTrans.fr.title,
          de: postTrans.de.title
        };

        const updatedPayload = {
          name: nameObj,
          name_bg: nameObj.bg,
          name_en: nameObj.en,
          name_es: nameObj.es,
          name_it: nameObj.it,
          name_fr: nameObj.fr,
          name_de: nameObj.de,
          needs_translation: false,
          translation_reason: null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'ingredients', item.id), updatedPayload);
        await logActivity(
          user.uid,
          user.email,
          'ai_translate_ingredient',
          `Auto-translated ingredient into 6 languages: ${nameObj.en || sourceName}`
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
    let failedCount = 0;
    try {
      for (const it of queue) {
        const res = await handleAutoTranslateItem(it, true);
        if (!res) failedCount++;
      }
      if (failedCount > 0) {
        alert(t('moderation.ai_translate_failed', 'Преводът с Chef AI не успя за някои записи (проверете интернет връзката или Gemini API ключа).'));
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
            {allItems.length + pendingReportsCount === 1
              ? t('moderation.active_items_queue_one')
              : t('moderation.active_items_queue_other', { count: allItems.length + pendingReportsCount })}
          </p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {/* Alert Banner: Reported items in Gourmet Community */}
        {pendingReportsCount > 0 && activeTab !== 'community' && (
          <div
            onClick={() => {
              setActiveTab('community');
              setCommunitySubView('reports');
            }}
            className="flex items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-600/20 border-2 border-rose-500/50 hover:border-rose-400 rounded-2xl cursor-pointer transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <span className="material-symbols-outlined text-[22px]">flag</span>
              </div>
              <div>
                <p className="text-xs font-black text-rose-300 uppercase tracking-wide">
                  {t('moderation.community.alert_banner_title', 'Сигнали от Гурме Общност')}
                </p>
                <p className="text-[11px] text-slate-300">
                  {t('moderation.community.alert_banner_desc', {
                    count: pendingReportsCount,
                    defaultValue: 'Има {{count}} чакащи сигнала за нецензурно или некоректно съдържание.'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white rounded-full font-black text-xs shrink-0">
              <span>{pendingReportsCount}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
        )}

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
                  : t('moderation.ai_translate_all_btn', 'Преведи всички с Chef AI (6 езика)')}
              </span>
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-primary text-background-dark border-primary'
                : 'bg-surface-dark/80 text-slate-300 border-primary/20 hover:border-primary/40'
            }`}
          >
            {t('moderation.tabs.all')} ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab('translation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer shrink-0 ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer shrink-0 ${
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
          <button
            onClick={() => setActiveTab('community')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer shrink-0 ${
              activeTab === 'community'
                ? 'bg-rose-500 text-white border-rose-500 font-black'
                : 'bg-surface-dark/80 text-rose-400 border-rose-500/30 hover:border-rose-500/60'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shield</span>
            {t('moderation.tabs.community', 'Гурме Общност')}
            {pendingReportsCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${activeTab === 'community' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-300'}`}>
                {pendingReportsCount}
              </span>
            )}
          </button>
        </div>

        {/* Community Moderation View */}
        {activeTab === 'community' ? (
          <div className="space-y-4">
            {/* Sub-navigation between Reported Items and Full Feed Control */}
            <div className="flex items-center justify-between gap-2 bg-surface-dark/70 p-2 rounded-2xl border border-primary/15">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommunitySubView('reports')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    communitySubView === 'reports'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  <span>
                    {t('moderation.community.subtab_reports', 'Докладвани сигнали')} ({pendingReportsCount})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommunitySubView('feed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    communitySubView === 'feed'
                      ? 'bg-primary text-background-dark shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">forum</span>
                  <span>
                    {t('moderation.community.subtab_feed', 'Всички публикации и коментари')} ({communityPosts.length})
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/community')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 px-2 cursor-pointer"
              >
                <span>{t('moderation.community.open_community', 'Към Гурме Общност')}</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            </div>

            {communitySubView === 'reports' ? (
              pendingReports.length === 0 ? (
                <div className="text-center p-10 bg-surface-dark/50 rounded-2xl border border-primary/15 text-slate-400">
                  <span className="material-symbols-outlined text-5xl mb-2 text-emerald-400/70">verified_user</span>
                  <p className="text-sm font-bold text-slate-200">
                    {t('moderation.community.empty_reports', 'Няма чакащи сигнали за нередности в Гурме Общност.')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t(
                      'moderation.community.empty_reports_hint',
                      'Можете да прегледате всички активни дискусии от таба „Всички публикации и коментари“.'
                    )}
                  </p>
                </div>
              ) : (
                pendingReports.map((rep) => {
                  const effectiveAuthorRole = resolveEffectiveRole(
                    rep.targetAuthorId,
                    rep.targetAuthorEmail,
                    rep.targetAuthorRole
                  );
                  const canModerateTarget = canDeleteContentByRank({
                    actorId: user?.uid,
                    actorRole: user?.role,
                    targetAuthorId: rep.targetAuthorId,
                    targetAuthorRole: effectiveAuthorRole
                  });

                  return (
                    <div
                      key={rep.id}
                      className="bg-surface-dark/90 border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              {rep.targetType === 'comment' ? 'chat' : 'article'}
                            </span>
                            {rep.targetType === 'comment'
                              ? t('moderation.community.type_comment', 'Коментар')
                              : t('moderation.community.type_post', 'Публикация')}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {getReasonBadgeLabel(rep.reason)}
                          </span>

                          {rep.postTitle && (
                            <span className="text-xs text-slate-400 font-semibold">
                              • {rep.postTitle}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-500">
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleString(currentLang === 'bg' ? 'bg-BG' : currentLang) : ''}
                        </span>
                      </div>

                      {/* Reported Content Box */}
                      <div className="p-3 rounded-xl bg-background-dark border border-primary/15 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span>
                              {t('moderation.community.author_label', 'Автор')}:{' '}
                              <strong className="text-primary">{rep.targetAuthorName || 'Chef'}</strong>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-surface-dark text-slate-300 border border-primary/20">
                              {getRoleBadgeLabel(effectiveAuthorRole)}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400">
                            {t('moderation.community.reported_by', 'Докладвано от')}:{' '}
                            <span className="text-slate-200 font-semibold">{rep.reporterName || rep.reporterEmail}</span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-100 font-medium bg-surface-dark/60 p-2.5 rounded-lg border border-white/5 break-words">
                          &ldquo;{rep.contentText}&rdquo;
                        </p>

                        {rep.details && (
                          <p className="text-xs text-amber-300/90 italic">
                            <strong className="not-italic">{t('moderation.community.reporter_note', 'Бележка към сигнала')}:</strong>{' '}
                            {rep.details}
                          </p>
                        )}
                      </div>

                      {!canModerateTarget && (
                        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>
                            {t(
                              'moderation.community.rank_restriction_notice',
                              'Авторът е с равен или по-висок ранг от вашия. Само потребител с по-висок ранг може да изтрие това съдържание.'
                            )}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-primary/10">
                        <button
                          type="button"
                          disabled={!canModerateTarget || !!processingReportId}
                          onClick={() =>
                            handleModerateCommunity({
                              action: 'delete',
                              postId: rep.postId,
                              commentId: rep.commentId,
                              targetType: rep.targetType,
                              targetAuthorId: rep.targetAuthorId,
                              targetAuthorEmail: rep.targetAuthorEmail,
                              targetAuthorRole: effectiveAuthorRole
                            })
                          }
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-extrabold py-2 px-3 rounded-xl border border-rose-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                          <span>{t('moderation.community.btn_delete', 'Изтрий')}</span>
                        </button>

                        {rep.targetType === 'comment' && (
                          <button
                            type="button"
                            disabled={!canModerateTarget || !!processingReportId}
                            onClick={() =>
                              handleModerateCommunity({
                                action: 'delete_cascade',
                                postId: rep.postId,
                                commentId: rep.commentId,
                                targetType: 'comment',
                                targetAuthorId: rep.targetAuthorId,
                                targetAuthorEmail: rep.targetAuthorEmail,
                                targetAuthorRole: effectiveAuthorRole
                              })
                            }
                            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-extrabold py-2 px-3 rounded-xl border border-orange-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-40"
                            title={t(
                              'moderation.community.btn_delete_cascade_hint',
                              'Изтрива този коментар и всички последващи коментари след него (спира веригата от хейт)'
                            )}
                          >
                            <span className="material-symbols-outlined text-base">delete_sweep</span>
                            <span>{t('moderation.community.btn_delete_cascade', 'Изтрий + веригата')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={!canModerateTarget || !!processingReportId}
                          onClick={() =>
                            handleModerateCommunity({
                              action: 'hide',
                              postId: rep.postId,
                              commentId: rep.commentId,
                              targetType: rep.targetType,
                              targetAuthorId: rep.targetAuthorId,
                              targetAuthorEmail: rep.targetAuthorEmail,
                              targetAuthorRole: effectiveAuthorRole
                            })
                          }
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold py-2 px-3 rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">visibility_off</span>
                          <span>{t('moderation.community.btn_hide', 'Скрий от общността')}</span>
                        </button>

                        <button
                          type="button"
                          disabled={!!processingReportId}
                          onClick={() =>
                            handleModerateCommunity({
                              action: 'dismiss',
                              postId: rep.postId,
                              commentId: rep.commentId,
                              targetType: rep.targetType,
                              targetAuthorId: rep.targetAuthorId,
                              targetAuthorEmail: rep.targetAuthorEmail,
                              targetAuthorRole: effectiveAuthorRole
                            })
                          }
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-2 px-3 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          <span>{t('moderation.community.btn_dismiss', 'Отхвърли сигнала (Чисто)')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Direct Feed Inspection & Control View */
              <div className="space-y-4">
                {communityPosts.map((post) => {
                  const postAuthorRole = resolveEffectiveRole(
                    post.authorId,
                    post.authorEmail,
                    post.authorRole
                  );
                  const canDeleteThisPost = canDeleteContentByRank({
                    actorId: user?.uid,
                    actorRole: user?.role,
                    targetAuthorId: post.authorId,
                    targetAuthorRole: postAuthorRole
                  });
                  const commentsList = Array.isArray(post.comments) ? post.comments : [];

                  return (
                    <div
                      key={post.id}
                      className="bg-surface-dark/80 border border-primary/20 rounded-2xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-extrabold text-slate-100">
                              {post.title || t('moderation.no_description')}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-background-dark text-primary border border-primary/20 font-bold">
                              {post.authorName} ({getRoleBadgeLabel(postAuthorRole)})
                            </span>
                            {(post.isQuarantined || post.isHiddenByModerator) && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                {t('gourmet_community.moderation.quarantined_badge', 'Докладван / Скрит')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{post.caption}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLockPostFromAdmin(post)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                              post.commentsLocked
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-background-dark text-slate-300 border-primary/20 hover:border-primary/40'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {post.commentsLocked ? 'lock' : 'lock_open'}
                            </span>
                            <span>
                              {post.commentsLocked
                                ? t('gourmet_community.moderation.unlock_comments', 'Отключи')
                                : t('gourmet_community.moderation.lock_comments', 'Заключи')}
                            </span>
                          </button>

                          {canDeleteThisPost && (
                            <button
                              type="button"
                              onClick={() =>
                                handleModerateCommunity({
                                  action: 'delete',
                                  postId: post.id,
                                  commentId: null,
                                  targetType: 'post',
                                  targetAuthorId: post.authorId,
                                  targetAuthorEmail: post.authorEmail,
                                  targetAuthorRole: postAuthorRole
                                })
                              }
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span>{t('common.buttons.delete', 'Изтрий')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comments inside this post */}
                      {commentsList.length > 0 && (
                        <div className="pt-2 border-t border-primary/10 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {t('moderation.community.comments_header', 'Коментари към публикацията')} ({commentsList.length})
                          </p>
                          {commentsList.map((cmt, idx) => {
                            const cmtRole = resolveEffectiveRole(cmt.userId, cmt.userEmail, cmt.userRole);
                            const canDeleteCmt = canDeleteContentByRank({
                              actorId: user?.uid,
                              actorRole: user?.role,
                              targetAuthorId: cmt.userId,
                              targetAuthorRole: cmtRole
                            });
                            const canCascade =
                              hasHigherRole(user?.role, cmtRole) && idx < commentsList.length - 1;

                            return (
                              <div
                                key={cmt.id}
                                className="flex items-start justify-between gap-2 bg-background-dark/80 p-2.5 rounded-xl border border-primary/10 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-slate-200">{cmt.userName}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-dark text-slate-400 border border-primary/15">
                                      {getRoleBadgeLabel(cmtRole)}
                                    </span>
                                    {(cmt.isQuarantined || cmt.isHiddenByModerator) && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                        {t('gourmet_community.moderation.quarantined_badge', 'Докладван / Скрит')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-300 mt-1 break-words">{cmt.text}</p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {canCascade && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleModerateCommunity({
                                          action: 'delete_cascade',
                                          postId: post.id,
                                          commentId: cmt.id,
                                          targetType: 'comment',
                                          targetAuthorId: cmt.userId,
                                          targetAuthorEmail: cmt.userEmail,
                                          targetAuthorRole: cmtRole
                                        })
                                      }
                                      title={t(
                                        'gourmet_community.moderation.delete_cascade_tooltip',
                                        'Изтрий коментара + всички спорове след него'
                                      )}
                                      className="p-1.5 rounded-lg bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                    </button>
                                  )}
                                  {canDeleteCmt && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleModerateCommunity({
                                          action: 'delete',
                                          postId: post.id,
                                          commentId: cmt.id,
                                          targetType: 'comment',
                                          targetAuthorId: cmt.userId,
                                          targetAuthorEmail: cmt.userEmail,
                                          targetAuthorRole: cmtRole
                                        })
                                      }
                                      title={t('common.buttons.delete', 'Изтрий')}
                                      className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  )}
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
        ) : (
          /* Standard Recipes & Ingredients List */
          loading ? (
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
                            : t('moderation.buttons.ai_translate_5langs', 'Автоматичен превод с Chef AI (6 езика)')}
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
          )
        )}
      </div>
    </div>
  );
};

export default Moderation;

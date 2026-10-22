import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField, matchesSearchTerm } from '../lib/localeUtils';
import { mockRecipes } from '../data/mockRecipes';

const OrderHistory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLang = i18n.language || 'bg';

  const justCookedId = searchParams.get('justCooked');

  const [history, setHistory] = useState(() => {
    try {
      const localRaw = localStorage.getItem('cooking_history');
      const parsed = localRaw ? JSON.parse(localRaw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [catalogRecipes, setCatalogRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'this_month' | 'favorites' | 'repeated'

  // Toast notification
  const [toastMsg, setToastMsg] = useState('');

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [formServings, setFormServings] = useState(2);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formRating, setFormRating] = useState(5);
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  // Load recipes catalog
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const snap = await getDocs(collection(db, 'recipes'));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => !r.is_deleted && r.is_active !== false);
        if (isMounted) {
          setCatalogRecipes(list.length > 0 ? list : mockRecipes);
        }
      } catch (err) {
        console.warn('Fallback to mockRecipes in Cooking Journal:', err);
        if (isMounted) setCatalogRecipes(mockRecipes);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync user's cooking_history from Firestore + localStorage fallback
  useEffect(() => {
    if (!user?.uid || user.role === 'guest') {
      const timer = setTimeout(() => {
        try {
          const localRaw = localStorage.getItem('cooking_history');
          const parsed = localRaw ? JSON.parse(localRaw) : [];
          setHistory(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHistory([]);
        }
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        let remoteList = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.cooking_history)) {
            remoteList = data.cooking_history;
          }
        }

        // Merge with any local entries that might not be in remote yet
        let merged = [...remoteList];
        try {
          const localRaw = localStorage.getItem('cooking_history');
          const localList = localRaw ? JSON.parse(localRaw) : [];
          if (Array.isArray(localList) && localList.length > 0) {
            const remoteIds = new Set(remoteList.map((item) => item.id));
            localList.forEach((lItem) => {
              if (lItem && lItem.id && !remoteIds.has(lItem.id)) {
                merged.push(lItem);
              }
            });
          }
        } catch {
          // ignore localStorage read errors
        }

        merged.sort((a, b) => new Date(b.cookedAt || 0).getTime() - new Date(a.cookedAt || 0).getTime());
        setHistory(merged);
        setLoading(false);
      },
      (err) => {
        console.warn('Error listening to cooking_history:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Persist updated history array to both localStorage and Firestore
  const persistHistory = async (updatedList, addXp = 0) => {
    setHistory(updatedList);
    try {
      localStorage.setItem('cooking_history', JSON.stringify(updatedList));
    } catch {
      // ignore localStorage write errors
    }

    if (user?.uid && user.role !== 'guest') {
      try {
        const userRef = doc(db, 'users', user.uid);
        const payload = {
          cooking_history: updatedList,
          cooked_count: updatedList.length
        };
        if (addXp > 0) {
          const snap = await getDoc(userRef);
          const currentScore = snap.exists() ? Number(snap.data()?.reputation?.score) || 0 : 0;
          payload['reputation.score'] = currentScore + addXp;
        }
        await updateDoc(userRef, payload);
      } catch (err) {
        console.warn('Error updating cooking_history in Firestore:', err);
      }
    }
  };

  // Map catalog recipes by id/slug for instant lookup
  const recipeMap = useMemo(() => {
    const map = new Map();
    catalogRecipes.forEach((r) => {
      if (r.id) map.set(String(r.id), r);
      if (r.slug) map.set(String(r.slug), r);
    });
    return map;
  }, [catalogRecipes]);

  // Count how many times each recipeId has been cooked
  const cookedCountsByRecipe = useMemo(() => {
    const counts = {};
    history.forEach((entry) => {
      const rId = entry.recipeId || entry.id;
      if (rId) {
        counts[rId] = (counts[rId] || 0) + 1;
      }
    });
    return counts;
  }, [history]);

  // Resolve localized title & image for a journal entry
  const getEntryTitle = (entry) => {
    if (!entry) return '';
    const catalogMatch = recipeMap.get(String(entry.recipeId));
    if (catalogMatch) {
      const catTitle = getLocalizedField(catalogMatch, 'title', currentLang);
      if (catTitle) return catTitle;
    }
    if (entry.title && typeof entry.title === 'object') {
      return (
        entry.title[currentLang] ||
        entry.title.bg ||
        entry.title.en ||
        Object.values(entry.title).find(Boolean) ||
        ''
      );
    }
    return getLocalizedField(entry, 'title', currentLang) || entry.title || '';
  };

  const getEntryImage = (entry) => {
    const catalogMatch = recipeMap.get(String(entry?.recipeId));
    if (catalogMatch) {
      return getRecipeImageUrl(catalogMatch);
    }
    return entry?.image || '/images/recipe-placeholder.png';
  };

  // Summary Statistics
  const stats = useMemo(() => {
    const totalSessions = history.length;
    const uniqueRecipes = new Set(history.map((e) => e.recipeId).filter(Boolean)).size;
    const totalServings = history.reduce((sum, e) => sum + (Number(e.servings) || 1), 0);
    return { totalSessions, uniqueRecipes, totalServings };
  }, [history]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return history.filter((entry) => {
      // Tab filter
      if (activeFilter === 'this_month') {
        const d = new Date(entry.cookedAt || 0);
        if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
      } else if (activeFilter === 'favorites') {
        if ((Number(entry.personalRating) || 5) < 5) return false;
      } else if (activeFilter === 'repeated') {
        const count = cookedCountsByRecipe[entry.recipeId] || 1;
        if (count < 2) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const titleText = getEntryTitle(entry);
        const notesText = entry.notes || '';
        const allTitles =
          entry.title && typeof entry.title === 'object' ? Object.values(entry.title).join(' ') : titleText;
        const combined = `${titleText} ${allTitles} ${notesText}`;
        if (!matchesSearchTerm(combined, searchQuery.trim())) {
          return false;
        }
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, activeFilter, searchQuery, cookedCountsByRecipe, currentLang, recipeMap]);

  // Open modal for manual logging
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingEntryId(null);
    setRecipeSearch('');
    setSelectedRecipe(catalogRecipes[0] || null);
    setFormServings(Number(catalogRecipes[0]?.servings) || 2);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRating(5);
    setFormNotes('');
    setShowModal(true);
  };

  // Open modal to edit an existing journal entry
  const handleOpenEditModal = (entry) => {
    if (!entry) return;
    setModalMode('edit');
    setEditingEntryId(entry.id);
    const catalogMatch = recipeMap.get(String(entry.recipeId)) || {
      id: entry.recipeId,
      title: entry.title
    };
    setSelectedRecipe(catalogMatch);
    setFormServings(Number(entry.servings) || 2);
    const dStr = entry.cookedAt ? new Date(entry.cookedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setFormDate(dStr);
    setFormRating(Number(entry.personalRating) || 5);
    setFormNotes(entry.notes || '');
    setShowModal(true);
  };

  // Filtered recipes inside the Add Modal picker
  const modalFilteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return catalogRecipes.slice(0, 12);
    return catalogRecipes
      .filter((r) => {
        const titles = [
          getLocalizedField(r, 'title', currentLang),
          r.title_bg,
          r.title_en,
          r.title_it,
          r.title_fr,
          r.title_de
        ]
          .filter(Boolean)
          .join(' ');
        return matchesSearchTerm(titles, recipeSearch.trim());
      })
      .slice(0, 15);
  }, [catalogRecipes, recipeSearch, currentLang]);

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      if (modalMode === 'add') {
        if (!selectedRecipe) {
          setSaving(false);
          return;
        }
        const prepMins = Number(selectedRecipe.prep_time_minutes || selectedRecipe.prep_time || selectedRecipe.prepTime || 0);
        const cookMins = Number(
          selectedRecipe.cook_time_minutes || selectedRecipe.cooking_time_minutes || selectedRecipe.cook_time || selectedRecipe.cookTime || 0
        );
        const totalMins = (prepMins + cookMins) > 0 ? prepMins + cookMins : Number(selectedRecipe.total_time_minutes || 30);

        const cookedDateObj = formDate ? new Date(`${formDate}T12:00:00`) : new Date();
        const newEntry = {
          id: `cook_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          recipeId: selectedRecipe.id || selectedRecipe.slug,
          title: {
            bg: getLocalizedField(selectedRecipe, 'title', 'bg') || selectedRecipe.title_bg || selectedRecipe.title_en || '',
            en: getLocalizedField(selectedRecipe, 'title', 'en') || selectedRecipe.title_en || selectedRecipe.title_bg || '',
            it: getLocalizedField(selectedRecipe, 'title', 'it') || selectedRecipe.title_it || selectedRecipe.title_en || '',
            fr: getLocalizedField(selectedRecipe, 'title', 'fr') || selectedRecipe.title_fr || selectedRecipe.title_en || '',
            de: getLocalizedField(selectedRecipe, 'title', 'de') || selectedRecipe.title_de || selectedRecipe.title_en || ''
          },
          image: getRecipeImageUrl(selectedRecipe),
          category_id: selectedRecipe.category_id || (Array.isArray(selectedRecipe.category_ids) && selectedRecipe.category_ids[0]) || 'main',
          cuisine_id: selectedRecipe.cuisine_id || '',
          servings: Math.max(1, Number(formServings) || 2),
          prepTimeMinutes: totalMins,
          caloriesPerServing: Number(selectedRecipe.calories_per_serving || selectedRecipe.calories || 0),
          personalRating: Math.min(5, Math.max(1, Number(formRating) || 5)),
          notes: formNotes.trim(),
          cookedAt: cookedDateObj.toISOString()
        };

        const updated = [newEntry, ...history].sort(
          (a, b) => new Date(b.cookedAt || 0).getTime() - new Date(a.cookedAt || 0).getTime()
        );
        await persistHistory(updated, 15);
        showToast(t('cooking_journal.toast_saved'));
      } else {
        // Edit existing entry
        const updated = history.map((item) => {
          if (item.id !== editingEntryId) return item;
          const existingDate = item.cookedAt ? item.cookedAt.split('T')[0] : '';
          const newIsoDate =
            formDate && formDate !== existingDate
              ? new Date(`${formDate}T12:00:00`).toISOString()
              : item.cookedAt;
          return {
            ...item,
            servings: Math.max(1, Number(formServings) || 2),
            personalRating: Math.min(5, Math.max(1, Number(formRating) || 5)),
            notes: formNotes.trim(),
            cookedAt: newIsoDate
          };
        });
        await persistHistory(updated, 0);
        showToast(t('cooking_journal.toast_updated'));
      }

      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm(t('cooking_journal.delete_confirm'))) return;
    const updated = history.filter((item) => item.id !== entryId);
    await persistHistory(updated, 0);
    if (justCookedId === entryId) {
      setSearchParams({});
    }
    showToast(t('cooking_journal.toast_deleted'));
  };

  const handleAskChefAI = () => {
    const recentTitles = Array.from(new Set(history.slice(0, 5).map((e) => getEntryTitle(e)).filter(Boolean)));
    if (recentTitles.length > 0) {
      const prompt = t('cooking_journal.chef_ai_prompt', { recipes: recentTitles.join(', ') });
      navigate('/ai-assistant', { state: { autoPrompt: prompt } });
    } else {
      navigate('/ai-assistant');
    }
  };

  const formatEntryDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(currentLang === 'bg' ? 'bg-BG' : currentLang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const justCookedEntry = useMemo(() => {
    if (!justCookedId) return null;
    return history.find((e) => e.id === justCookedId) || null;
  }, [history, justCookedId]);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-emerald-500 text-background-dark px-5 py-2.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-base font-black">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-sm">
        <div className="flex items-center p-4 justify-between">
          <button
            onClick={() => navigate('/profile')}
            className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
            title={t('common.buttons.back')}
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex-1 text-center px-2 min-w-0">
            <h1 className="text-slate-100 text-lg font-extrabold leading-tight tracking-tight truncate">
              {t('cooking_journal.title')}
            </h1>
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate">
              {t('cooking_journal.subtitle')}
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="text-background-dark bg-gradient-to-r from-primary to-[#b8860b] flex size-10 shrink-0 items-center justify-center rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={t('cooking_journal.log_dish_btn')}
          >
            <span className="material-symbols-outlined text-xl font-black">add</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Celebratory Banner if redirected from CookingMode */}
        {justCookedEntry && (
          <div className="bg-gradient-to-r from-emerald-500/15 via-surface-dark to-primary/15 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <span className="material-symbols-outlined text-2xl">celebration</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-400 leading-snug">
                    {t('cooking_journal.just_cooked_title')}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {t('cooking_journal.just_cooked_desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSearchParams({})}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => handleOpenEditModal(justCookedEntry)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-black">edit_note</span>
                <span>{t('cooking_journal.add_note_now')}</span>
              </button>
            </div>
          </div>
        )}

        {/* 3-Column Summary Statistics */}
        <section className="grid grid-cols-3 gap-2.5">
          <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-md">
            <span className="material-symbols-outlined text-primary text-2xl mb-1">skillet</span>
            <span className="text-xl font-extrabold text-slate-100">{stats.totalSessions}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {t('cooking_journal.stats.total_sessions')}
            </span>
          </div>
          <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-md">
            <span className="material-symbols-outlined text-primary text-2xl mb-1">menu_book</span>
            <span className="text-xl font-extrabold text-slate-100">{stats.uniqueRecipes}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {t('cooking_journal.stats.unique_recipes')}
            </span>
          </div>
          <div className="bg-surface-dark border border-primary/20 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-md">
            <span className="material-symbols-outlined text-primary text-2xl mb-1">restaurant</span>
            <span className="text-xl font-extrabold text-slate-100">{stats.totalServings}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {t('cooking_journal.stats.total_servings')}
            </span>
          </div>
        </section>

        {/* Primary Action Button: Log Cooked Dish */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="w-full py-3 px-4 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base font-black">add_circle</span>
          <span>{t('cooking_journal.log_dish_btn')}</span>
        </button>

        {/* Search & Filter Tabs */}
        <section className="space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('cooking_journal.search_placeholder')}
              className="w-full bg-surface-dark border border-primary/20 focus:border-primary rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-100 placeholder:text-slate-500 outline-none transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['all', 'this_month', 'favorites', 'repeated'].map((tabKey) => {
              const isActive = activeFilter === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveFilter(tabKey)}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer truncate ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark border-amber-300/50 shadow-md'
                      : 'bg-surface-dark text-slate-300 border-primary/20 hover:border-primary/50'
                  }`}
                >
                  {t(`cooking_journal.filters.${tabKey}`)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Journal Entries List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-surface-dark/60 border border-dashed border-primary/30 rounded-3xl p-8 text-center space-y-4 shadow-lg">
            <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-4xl">menu_book</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-100">{t('cooking_journal.empty_title')}</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {t('cooking_journal.empty_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base font-black">add</span>
              <span>{t('cooking_journal.log_dish_btn')}</span>
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-surface-dark/50 border border-dashed border-primary/20 rounded-2xl p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-slate-500">search_off</span>
            <p className="text-xs text-slate-400 font-semibold">{t('cooking_journal.empty_filtered')}</p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-extrabold text-primary hover:underline cursor-pointer"
            >
              {t('cooking_journal.clear_filters')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const title = getEntryTitle(entry);
              const imgUrl = getEntryImage(entry);
              const repeatCount = cookedCountsByRecipe[entry.recipeId] || 1;
              const rating = Math.min(5, Math.max(1, Number(entry.personalRating) || 5));

              return (
                <div
                  key={entry.id}
                  className="bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:border-primary/40 transition-all flex flex-col"
                >
                  {/* Top Row: Thumbnail + Metadata */}
                  <div className="flex gap-3.5 p-3.5">
                    <div
                      onClick={() => entry.recipeId && navigate(`/recipe/${entry.recipeId}`)}
                      className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-primary/30 bg-background-dark relative cursor-pointer group"
                    >
                      <img
                        src={imgUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/recipe-placeholder.png';
                        }}
                      />
                      {repeatCount > 1 && (
                        <span className="absolute top-1.5 left-1.5 bg-background-dark/90 backdrop-blur-md text-primary border border-primary/40 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {t('cooking_journal.cooked_times_badge', { count: repeatCount })}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => entry.recipeId && navigate(`/recipe/${entry.recipeId}`)}
                            className="text-slate-100 text-sm sm:text-base font-extrabold leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-2"
                          >
                            {title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition-colors cursor-pointer"
                            title={t('saved.delete_btn')}
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>

                        {/* Date & Star Rating */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-primary">calendar_today</span>
                            {formatEntryDate(entry.cookedAt)}
                          </span>
                          <span className="text-amber-400 text-xs font-black tracking-tight">
                            {'★'.repeat(rating)}
                            <span className="text-slate-600">{'★'.repeat(5 - rating)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Badges: Servings, Time, Calories */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold">
                          {t('cooking_journal.servings_badge', { count: entry.servings || 2 })}
                        </span>
                        {entry.prepTimeMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-background-dark border border-white/10 text-slate-300 text-[10px] font-semibold">
                            {t('cooking_journal.min_badge', { count: entry.prepTimeMinutes })}
                          </span>
                        )}
                        {entry.caloriesPerServing > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                            {t('cooking_journal.kcal_badge', { count: entry.caloriesPerServing })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Note Box */}
                  <div className="px-3.5 pb-3">
                    <div
                      onClick={() => handleOpenEditModal(entry)}
                      className={`rounded-xl p-2.5 border text-xs transition-colors cursor-pointer ${
                        entry.notes
                          ? 'bg-background-dark/80 border-primary/25 text-slate-200 hover:border-primary/50'
                          : 'bg-background-dark/40 border-dashed border-slate-700 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      {entry.notes ? (
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-0.5">
                            {t('cooking_journal.personal_note_label')}
                          </span>
                          <p className="italic leading-relaxed">{entry.notes}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary/70">edit_note</span>
                          <span>{t('cooking_journal.no_note_placeholder')}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="grid grid-cols-2 border-t border-primary/15 bg-background-dark/40">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(entry)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-300 hover:text-primary hover:bg-primary/5 border-r border-b border-primary/15 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">edit</span>
                      <span className="truncate">{t('cooking_journal.edit_entry_btn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => entry.recipeId && navigate(`/recipe/${entry.recipeId}/cooking`)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-emerald-400 hover:bg-emerald-500/10 border-b border-primary/15 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">skillet</span>
                      <span className="truncate">{t('cooking_journal.cook_again_btn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => entry.recipeId && navigate(`/recipe/${entry.recipeId}`)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-primary hover:bg-primary/10 border-r border-primary/15 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                      <span className="truncate">{t('cooking_journal.view_recipe_btn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (entry.recipeId) params.set('shareRecipe', entry.recipeId);
                        if (entry.notes) params.set('note', entry.notes);
                        if (entry.personalRating) params.set('rating', String(entry.personalRating));
                        navigate(`/community?${params.toString()}`);
                      }}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">share_reviews</span>
                      <span className="truncate">{t('cooking_journal.share_in_community_btn', 'Сподели в Общността')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unified Chef AI Button at Bottom */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAskChefAI}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            title={t('pantry.chef_ai_btn')}
          >
            <span className="material-symbols-outlined text-base font-black">auto_awesome</span>
            <span>{t('pantry.chef_ai_btn')}</span>
          </button>
        </div>
      </main>

      {/* Add / Edit Journal Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-background-dark/50">
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {modalMode === 'add' ? 'add_task' : 'edit_note'}
                </span>
                <span>
                  {modalMode === 'add' ? t('cooking_journal.modal.add_title') : t('cooking_journal.modal.edit_title')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 overflow-y-auto space-y-4">
              {/* Recipe Selector (in Add Mode) or Selected Recipe Banner (in Edit Mode) */}
              {modalMode === 'add' ? (
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-primary block">
                    {t('cooking_journal.modal.select_recipe_label')}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      search
                    </span>
                    <input
                      type="text"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      placeholder={t('cooking_journal.modal.search_recipe_placeholder')}
                      className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-100 outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-primary/20 bg-background-dark divide-y divide-primary/10">
                    {modalFilteredRecipes.map((r) => {
                      const rTitle = getLocalizedField(r, 'title', currentLang) || r.title_bg || r.title_en || '';
                      const isSelected = selectedRecipe?.id === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedRecipe(r);
                            setFormServings(Number(r.servings) || 2);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/20 text-primary font-extrabold' : 'text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <img
                            src={getRecipeImageUrl(r)}
                            alt={rTitle}
                            className="size-8 rounded-lg object-cover shrink-0 border border-primary/20"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/recipe-placeholder.png';
                            }}
                          />
                          <span className="text-xs truncate flex-1">{rTitle}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-base text-primary shrink-0">check_circle</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background-dark border border-primary/20">
                  <img
                    src={getRecipeImageUrl(selectedRecipe)}
                    alt=""
                    className="size-12 rounded-xl object-cover shrink-0 border border-primary/30"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/recipe-placeholder.png';
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-100 truncate">
                      {getLocalizedField(selectedRecipe, 'title', currentLang) ||
                        selectedRecipe?.title?.[currentLang] ||
                        selectedRecipe?.title?.bg ||
                        selectedRecipe?.title?.en ||
                        ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Servings & Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                    {t('cooking_journal.modal.servings_label')}
                  </label>
                  <div className="flex items-center justify-between bg-background-dark border border-primary/20 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => setFormServings((s) => Math.max(1, Number(s) - 1))}
                      className="size-8 rounded-lg bg-surface-dark text-primary hover:bg-primary/20 flex items-center justify-center font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-extrabold text-slate-100">{formServings}</span>
                    <button
                      type="button"
                      onClick={() => setFormServings((s) => Math.min(30, Number(s) + 1))}
                      className="size-8 rounded-lg bg-surface-dark text-primary hover:bg-primary/20 flex items-center justify-center font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                    {t('cooking_journal.modal.date_label')}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-[46px] bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Personal Star Rating */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                  {t('cooking_journal.modal.rating_label')}
                </label>
                <div className="flex items-center gap-2 bg-background-dark border border-primary/20 rounded-xl p-2.5 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                        star <= formRating ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Chef Notes */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                  {t('cooking_journal.modal.notes_label')}
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={t('cooking_journal.modal.notes_placeholder')}
                  className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl p-3 text-xs font-medium text-slate-100 placeholder:text-slate-500 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-white/5 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {t('cooking_journal.modal.cancel_btn')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[1.5] py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                >
                  {t('cooking_journal.modal.save_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, setDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_GOURMET_EVENTS } from '../../data/defaultEvents';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, getLocalizedField } from '../../lib/localeUtils';

const EMPTY_LANG_MAP = { bg: '', en: '', it: '', fr: '', de: '' };

const ManageEvents = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';

  const [events, setEvents] = useState(DEFAULT_GOURMET_EVENTS);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeLangTab, setActiveLangTab] = useState('bg');

  const [formTitle, setFormTitle] = useState({ ...EMPTY_LANG_MAP });
  const [formDesc, setFormDesc] = useState({ ...EMPTY_LANG_MAP });
  const [formLocation, setFormLocation] = useState({ ...EMPTY_LANG_MAP });
  const [formCategory, setFormCategory] = useState('masterclass');
  const [formHost, setFormHost] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('18:30');
  const [formDuration, setFormDuration] = useState(120);
  const [formPrice, setFormPrice] = useState(45);
  const [formCapacity, setFormCapacity] = useState(16);
  const [formImage, setFormImage] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Participants Modal State
  const [participantsEvent, setParticipantsEvent] = useState(null);

  // Sync events catalog from settings/gourmet_events
  useEffect(() => {
    const ref = doc(db, 'settings', 'gourmet_events');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists() && Array.isArray(snap.data()?.items) && snap.data().items.length > 0) {
          setEvents(snap.data().items);
          try {
            localStorage.setItem('gourmet_events_catalog', JSON.stringify(snap.data().items));
          } catch {
            // ignore
          }
        } else {
          setEvents(DEFAULT_GOURMET_EVENTS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading gourmet_events setting:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Listen to users collection to aggregate all event_registrations
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        setUsersList(list);
      },
      (err) => {
        console.warn('Could not fetch users for event registrations:', err);
      }
    );
    return () => unsub();
  }, []);

  // Map eventId -> array of registration objects
  const registrationsByEvent = useMemo(() => {
    const map = {};
    usersList.forEach((u) => {
      const regs = Array.isArray(u.event_registrations) ? u.event_registrations : [];
      regs.forEach((reg) => {
        if (!reg || !reg.eventId) return;
        if (!map[reg.eventId]) map[reg.eventId] = [];
        map[reg.eventId].push({
          ...reg,
          userId: u.uid,
          userName: reg.userName || u.profile?.nickname || u.name || u.auth?.email || u.email || 'User',
          userEmail: reg.userEmail || u.auth?.email || u.email || ''
        });
      });
    });
    return map;
  }, [usersList]);

  const persistEvents = async (newItems) => {
    setEvents(newItems);
    try {
      localStorage.setItem('gourmet_events_catalog', JSON.stringify(newItems));
    } catch {
      // ignore
    }
    await setDoc(
      doc(db, 'settings', 'gourmet_events'),
      {
        items: newItems,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setActiveLangTab(currentLang);
    setFormTitle({ ...EMPTY_LANG_MAP });
    setFormDesc({ ...EMPTY_LANG_MAP });
    setFormLocation({ ...EMPTY_LANG_MAP });
    setFormCategory('masterclass');
    setFormHost('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('18:30');
    setFormDuration(120);
    setFormPrice(45);
    setFormCapacity(16);
    setFormImage('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000');
    setFormExternalUrl('');
    setFormIsFeatured(false);
    setFormIsActive(true);
    setShowFormModal(true);
  };

  const handleOpenEdit = (ev) => {
    setEditingId(ev.id);
    setActiveLangTab(currentLang);
    setFormTitle({
      bg: ev.title?.bg || ev.title_bg || '',
      en: ev.title?.en || ev.title_en || '',
      it: ev.title?.it || ev.title_it || '',
      fr: ev.title?.fr || ev.title_fr || '',
      de: ev.title?.de || ev.title_de || ''
    });
    setFormDesc({
      bg: ev.description?.bg || ev.description_bg || '',
      en: ev.description?.en || ev.description_en || '',
      it: ev.description?.it || ev.description_it || '',
      fr: ev.description?.fr || ev.description_fr || '',
      de: ev.description?.de || ev.description_de || ''
    });
    setFormLocation({
      bg: ev.location?.bg || ev.location_bg || '',
      en: ev.location?.en || ev.location_en || '',
      it: ev.location?.it || ev.location_it || '',
      fr: ev.location?.fr || ev.location_fr || '',
      de: ev.location?.de || ev.location_de || ''
    });
    setFormCategory(ev.category || 'masterclass');
    setFormHost(ev.host_chef || '');
    setFormDate(ev.date || new Date().toISOString().split('T')[0]);
    setFormTime(ev.time || '18:30');
    setFormDuration(Number(ev.duration_minutes) || 120);
    setFormPrice(Number(ev.price_eur) >= 0 ? Number(ev.price_eur) : 0);
    setFormCapacity(Number(ev.capacity) || 16);
    setFormImage(ev.image || '');
    setFormExternalUrl(ev.external_url || '');
    setFormIsFeatured(Boolean(ev.is_featured));
    setFormIsActive(ev.is_active !== false);
    setShowFormModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const fallbackTitle = formTitle.bg || formTitle.en || Object.values(formTitle).find(Boolean) || 'Gourmet Event';
      const fallbackDesc = formDesc.bg || formDesc.en || Object.values(formDesc).find(Boolean) || '';
      const fallbackLoc = formLocation.bg || formLocation.en || Object.values(formLocation).find(Boolean) || '';

      const normalizedEvent = {
        id: editingId || `evt_${Date.now()}`,
        category: formCategory,
        is_featured: Boolean(formIsFeatured),
        is_active: Boolean(formIsActive),
        title: {
          bg: formTitle.bg || fallbackTitle,
          en: formTitle.en || fallbackTitle,
          it: formTitle.it || formTitle.en || fallbackTitle,
          fr: formTitle.fr || formTitle.en || fallbackTitle,
          de: formTitle.de || formTitle.en || fallbackTitle
        },
        description: {
          bg: formDesc.bg || fallbackDesc,
          en: formDesc.en || fallbackDesc,
          it: formDesc.it || formDesc.en || fallbackDesc,
          fr: formDesc.fr || formDesc.en || fallbackDesc,
          de: formDesc.de || formDesc.en || fallbackDesc
        },
        location: {
          bg: formLocation.bg || fallbackLoc,
          en: formLocation.en || fallbackLoc,
          it: formLocation.it || formLocation.en || fallbackLoc,
          fr: formLocation.fr || formLocation.en || fallbackLoc,
          de: formLocation.de || formLocation.en || fallbackLoc
        },
        host_chef: formHost.trim(),
        date: formDate,
        time: formTime,
        duration_minutes: Math.max(15, Number(formDuration) || 120),
        price_eur: Math.max(0, Number(formPrice) || 0),
        capacity: Math.max(1, Number(formCapacity) || 16),
        image:
          formImage.trim() ||
          'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000',
        external_url: formExternalUrl.trim()
      };

      let updatedList = [...events];
      if (normalizedEvent.is_featured) {
        updatedList = updatedList.map((item) => ({ ...item, is_featured: false }));
      }

      if (editingId) {
        updatedList = updatedList.map((item) => (item.id === editingId ? normalizedEvent : item));
      } else {
        updatedList = [normalizedEvent, ...updatedList];
      }

      await persistEvents(updatedList);
      setShowFormModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm(t('gourmet_events.admin.delete_confirm'))) return;
    const updated = events.filter((item) => item.id !== id);
    await persistEvents(updated);
  };

  const handleRemoveParticipant = async (reg) => {
    if (!reg?.userId || !window.confirm(t('gourmet_events.admin.participants_modal.remove_participant_confirm'))) return;
    try {
      const targetUser = usersList.find((u) => u.uid === reg.userId);
      if (!targetUser) return;
      const updatedRegs = (targetUser.event_registrations || []).filter(
        (r) => r.eventId !== reg.eventId && r.id !== reg.id
      );
      await updateDoc(doc(db, 'users', reg.userId), {
        event_registrations: updatedRegs
      });
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  const getEventTitle = (ev) => {
    return getLocalizedField(ev, 'title', currentLang) || ev?.title?.bg || ev?.title?.en || '';
  };

  const getEventLocation = (ev) => {
    return getLocalizedField(ev, 'location', currentLang) || ev?.location?.bg || ev?.location?.en || '';
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-28 min-h-screen font-display">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-100 truncate">
              {t('gourmet_events.admin.title')}
            </h1>
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-wider truncate">
              {t('gourmet_events.admin.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/events')}
          className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold hover:bg-primary/20 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span>/events</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base font-black">add_circle</span>
            <span>{t('gourmet_events.admin.add_event_btn')}</span>
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const title = getEventTitle(ev);
              const loc = getEventLocation(ev);
              const regs = registrationsByEvent[ev.id] || [];
              const bookedSeats = regs.reduce((sum, r) => sum + (Number(r.seats) || 1), 0);
              const capacity = Number(ev.capacity) || 16;

              return (
                <div
                  key={ev.id}
                  className="bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg flex flex-col"
                >
                  <div className="flex gap-3.5 p-3.5">
                    <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-primary/20 bg-background-dark relative">
                      <img
                        src={ev.image}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/recipe-placeholder.png';
                        }}
                      />
                      {ev.is_featured && (
                        <span className="absolute top-1 left-1 bg-primary text-background-dark text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                          ★ {t('gourmet_events.featured_badge')}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              ev.is_active !== false
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {ev.is_active !== false
                              ? t('gourmet_events.admin.active_badge')
                              : t('gourmet_events.admin.hidden_badge')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
                            {t(`gourmet_events.categories.${ev.category || 'masterclass'}`)}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-100 leading-snug line-clamp-2">{title}</h3>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary">calendar_today</span>
                          {ev.date} • {ev.time}
                        </span>
                        <span className="text-primary font-extrabold">
                          {Number(ev.price_eur) > 0
                            ? t('gourmet_events.price_eur', { price: ev.price_eur })
                            : t('gourmet_events.free_price')}
                        </span>
                      </div>
                      {loc && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary/70">location_on</span>
                          {loc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin Card Actions */}
                  <div className="grid grid-cols-3 border-t border-primary/15 divide-x divide-primary/15 bg-background-dark/40">
                    <button
                      type="button"
                      onClick={() => setParticipantsEvent(ev)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span className="truncate">
                        {t('gourmet_events.admin.participants_btn', { seats: bookedSeats, capacity })}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ev)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span className="truncate">{t('gourmet_events.admin.edit_btn')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="py-2.5 px-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span className="truncate">{t('gourmet_events.admin.delete_btn')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Event Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-md">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-background-dark/50">
              <h3 className="text-base font-extrabold text-slate-100">
                {editingId ? t('gourmet_events.admin.form.edit_title') : t('gourmet_events.admin.form.create_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-5 overflow-y-auto space-y-4">
              {/* 5-Language Tabs */}
              <div className="grid grid-cols-5 gap-1.5 bg-background-dark p-1.5 rounded-xl border border-primary/20">
                {SUPPORTED_LANGUAGES.map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => setActiveLangTab(lng)}
                    className={`py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all cursor-pointer ${
                      activeLangTab === lng
                        ? 'bg-primary text-background-dark shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {LANGUAGE_LABELS[lng]?.name || lng.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Localized Title */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-primary block mb-1">
                  {t('gourmet_events.admin.form.title_label', { lang: activeLangTab.toUpperCase() })}
                </label>
                <input
                  type="text"
                  value={formTitle[activeLangTab] || ''}
                  onChange={(e) => setFormTitle((prev) => ({ ...prev, [activeLangTab]: e.target.value }))}
                  className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                />
              </div>

              {/* Localized Description */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-primary block mb-1">
                  {t('gourmet_events.admin.form.desc_label', { lang: activeLangTab.toUpperCase() })}
                </label>
                <textarea
                  rows={3}
                  value={formDesc[activeLangTab] || ''}
                  onChange={(e) => setFormDesc((prev) => ({ ...prev, [activeLangTab]: e.target.value }))}
                  className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl p-3 text-xs font-medium text-slate-100 outline-none resize-none"
                />
              </div>

              {/* Localized Location */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-primary block mb-1">
                  {t('gourmet_events.admin.form.location_label', { lang: activeLangTab.toUpperCase() })}
                </label>
                <input
                  type="text"
                  value={formLocation[activeLangTab] || ''}
                  onChange={(e) => setFormLocation((prev) => ({ ...prev, [activeLangTab]: e.target.value }))}
                  className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                />
              </div>

              {/* Category & Host Chef */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.category_label')}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                  >
                    <option value="masterclass">{t('gourmet_events.categories.masterclass')}</option>
                    <option value="tasting">{t('gourmet_events.categories.tasting')}</option>
                    <option value="chefs_table">{t('gourmet_events.categories.chefs_table')}</option>
                    <option value="online">{t('gourmet_events.categories.online')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.host_label')}
                  </label>
                  <input
                    type="text"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    placeholder="Chef..."
                    className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.date_label')}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl px-2 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.time_label')}
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl px-2 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.duration_label')}
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl px-2 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Price (EUR) & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.price_label')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                    {t('gourmet_events.admin.form.capacity_label')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Image URL & External URL */}
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                  {t('gourmet_events.admin.form.image_label')}
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1">
                  {t('gourmet_events.admin.form.external_url_label')}
                </label>
                <input
                  type="url"
                  value={formExternalUrl}
                  onChange={(e) => setFormExternalUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="size-4 accent-primary rounded"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    {t('gourmet_events.admin.form.is_featured_label')}
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="size-4 accent-primary rounded"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    {t('gourmet_events.admin.form.is_active_label')}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {t('gourmet_events.admin.form.cancel_btn')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[1.5] py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  {t('gourmet_events.admin.form.save_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {participantsEvent && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-md">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-background-dark/50">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-100 truncate">
                  {t('gourmet_events.admin.participants_modal.title')}
                </h3>
                <p className="text-xs text-primary font-bold truncate">{getEventTitle(participantsEvent)}</p>
              </div>
              <button
                type="button"
                onClick={() => setParticipantsEvent(null)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {(() => {
                const regs = registrationsByEvent[participantsEvent.id] || [];
                const totalBooked = regs.reduce((sum, r) => sum + (Number(r.seats) || 1), 0);
                return (
                  <>
                    <div className="p-3 rounded-xl bg-background-dark border border-primary/20 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-200">
                        {t('gourmet_events.admin.participants_modal.total_booked', {
                          booked: totalBooked,
                          capacity: participantsEvent.capacity || 16
                        })}
                      </span>
                    </div>

                    {regs.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">
                        {t('gourmet_events.admin.participants_modal.empty')}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {regs.map((r, idx) => (
                          <div
                            key={r.id || idx}
                            className="p-3.5 rounded-2xl bg-background-dark border border-primary/15 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-100">{r.userName}</span>
                                <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-black">
                                  {t('gourmet_events.admin.participants_modal.seats_count', { count: r.seats || 1 })}
                                </span>
                              </div>
                              {r.userEmail && <p className="text-[11px] text-slate-400">{r.userEmail}</p>}
                              {r.phone && (
                                <p className="text-[11px] text-emerald-400 font-semibold">📞 {r.phone}</p>
                              )}
                              {r.notes && (
                                <p className="text-[11px] text-slate-300 italic bg-surface-dark p-2 rounded-lg border border-primary/10">
                                  "{r.notes}"
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(r)}
                              className="text-slate-400 hover:text-rose-400 p-1 shrink-0 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;

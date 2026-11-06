import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_GOURMET_EVENTS } from '../data/defaultEvents';
import { getLocalizedField } from '../lib/localeUtils';

const GourmetEvents = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, isAdmin, isOwner, isModerator } = useAuth();
  const currentLang = i18n.language || 'bg';

  const [events, setEvents] = useState(() => {
    try {
      const cached = localStorage.getItem('gourmet_events_catalog');
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GOURMET_EVENTS;
    } catch {
      return DEFAULT_GOURMET_EVENTS;
    }
  });

  const [myRegistrations, setMyRegistrations] = useState([]);
  const [allUsersRegs, setAllUsersRegs] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  // Booking / Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [seatsCount, setSeatsCount] = useState(1);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  // Load events catalog from Firestore settings/gourmet_events
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
      },
      () => {
        // Fallback to defaults silently
      }
    );
    return () => unsub();
  }, []);

  // Load current user's event_registrations
  useEffect(() => {
    if (!user?.uid || user.role === 'guest') {
      const timer = setTimeout(() => {
        setMyRegistrations([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const regs = snap.data()?.event_registrations;
          setMyRegistrations(Array.isArray(regs) ? regs : []);
        } else {
          setMyRegistrations([]);
        }
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Aggregate total booked seats per event across users (when logged in)
  useEffect(() => {
    if (!user?.uid || user.role === 'guest') return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const seatCounts = {};
        snap.docs.forEach((d) => {
          const regs = d.data()?.event_registrations;
          if (Array.isArray(regs)) {
            regs.forEach((r) => {
              if (r?.eventId) {
                seatCounts[r.eventId] = (seatCounts[r.eventId] || 0) + (Number(r.seats) || 1);
              }
            });
          }
        });
        setAllUsersRegs(seatCounts);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  const activeEvents = useMemo(() => {
    return events.filter((e) => e.is_active !== false);
  }, [events]);

  const myBookingByEventId = useMemo(() => {
    const map = {};
    myRegistrations.forEach((r) => {
      if (r?.eventId) map[r.eventId] = r;
    });
    return map;
  }, [myRegistrations]);

  const getBookedSeatsForEvent = (eventId) => {
    if (allUsersRegs[eventId] !== undefined) {
      return allUsersRegs[eventId];
    }
    const own = myBookingByEventId[eventId];
    return own ? Number(own.seats) || 1 : 0;
  };

  const featuredEvent = useMemo(() => {
    return activeEvents.find((e) => e.is_featured) || activeEvents[0] || null;
  }, [activeEvents]);

  const filteredEvents = useMemo(() => {
    if (activeTab === 'my_bookings') {
      return activeEvents.filter((e) => Boolean(myBookingByEventId[e.id]));
    }
    if (activeTab === 'all') {
      return activeEvents;
    }
    return activeEvents.filter((e) => e.category === activeTab);
  }, [activeEvents, activeTab, myBookingByEventId]);

  const getEventTitle = (ev) =>
    getLocalizedField(ev, 'title', currentLang) || ev?.title?.bg || ev?.title?.en || '';

  const getEventDesc = (ev) =>
    getLocalizedField(ev, 'description', currentLang) || ev?.description?.bg || ev?.description?.en || '';

  const getEventLocation = (ev) =>
    getLocalizedField(ev, 'location', currentLang) || ev?.location?.bg || ev?.location?.en || '';

  const handleOpenEventModal = (ev) => {
    if (!ev) return;
    setSelectedEvent(ev);
    const existing = myBookingByEventId[ev.id];
    if (existing) {
      setSeatsCount(Number(existing.seats) || 1);
      setPhone(existing.phone || '');
      setNotes(existing.notes || '');
    } else {
      setSeatsCount(1);
      setPhone('');
      setNotes('');
    }
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    if (!selectedEvent || submitting) return;

    if (!user?.uid || user.role === 'guest') {
      alert(t('gourmet_events.login_required'));
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const existing = myBookingByEventId[selectedEvent.id];
      const newReg = {
        id: existing?.id || `reg_${Date.now()}`,
        eventId: selectedEvent.id,
        userId: user.uid,
        userName: user.profile?.nickname || user.name || user.email || '',
        userEmail: user.email || '',
        seats: Math.max(1, Number(seatsCount) || 1),
        phone: phone.trim(),
        notes: notes.trim(),
        registeredAt: existing?.registeredAt || new Date().toISOString()
      };

      const otherRegs = myRegistrations.filter((r) => r.eventId !== selectedEvent.id);
      const updatedRegs = [newReg, ...otherRegs];

      await updateDoc(doc(db, 'users', user.uid), {
        event_registrations: updatedRegs
      });

      showToast(existing ? t('gourmet_events.toast_updated') : t('gourmet_events.toast_booked'));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Error saving event booking:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedEvent || !user?.uid || submitting) return;
    if (!window.confirm(t('gourmet_events.booking_modal.cancel_confirm'))) return;

    setSubmitting(true);
    try {
      const updatedRegs = myRegistrations.filter((r) => r.eventId !== selectedEvent.id);
      await updateDoc(doc(db, 'users', user.uid), {
        event_registrations: updatedRegs
      });
      showToast(t('gourmet_events.toast_canceled'));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Error canceling event booking:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toLocaleDateString(currentLang === 'bg' ? 'bg-BG' : currentLang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getPlatformLabel = (platformKey) => {
    if (!platformKey) return 'Google Meet';
    switch (platformKey) {
      case 'google_meet':
        return 'Google Meet';
      case 'zoom':
        return 'Zoom';
      case 'youtube':
        return 'YouTube Live';
      case 'teams':
        return 'Microsoft Teams';
      default:
        return t('gourmet_events.platforms.other', 'Друга платформа');
    }
  };

  const handleCopyMeetingLink = (linkUrl) => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    showToast(t('gourmet_events.link_copied_toast', 'Линкът за срещата е копиран в клипборда!'));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-emerald-500 text-background-dark px-5 py-2.5 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-base font-black">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 px-4 pt-5 space-y-5">
        {/* Page Heading + Admin Shortcut */}
        <section className="flex flex-col gap-2.5">
          <div>
            <h1 className="text-slate-100 text-lg font-extrabold leading-tight tracking-tight">
              {t('gourmet_events.title')}
            </h1>
            <p className="text-primary text-[10px] font-bold mt-1">
              {t('gourmet_events.subtitle')}
            </p>
          </div>

          {(isAdmin || isOwner || isModerator) && (
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">edit_calendar</span>
              <span>{t('gourmet_events.manage_btn')}</span>
            </button>
          )}
        </section>

        {/* Category & Bookings Filter Grid (2 Columns) */}
        <nav className="grid grid-cols-2 gap-2">
          {['all', 'masterclass', 'tasting', 'chefs_table', 'online', 'my_bookings'].map((tabKey) => {
            const isActive = activeTab === tabKey;
            const label = t(`gourmet_events.categories.${tabKey}`);
            const bookingsCount = myRegistrations.length;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`py-2.5 px-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark border-amber-300/50 shadow-md'
                    : 'bg-surface-dark border-primary/20 text-slate-300 hover:border-primary/50 hover:text-primary'
                }`}
              >
                <span className="truncate">{label}</span>
                {tabKey === 'my_bookings' && bookingsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-background-dark text-primary' : 'bg-primary text-background-dark'
                    }`}
                  >
                    {bookingsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Featured Event Hero Banner (shown on 'all' tab) */}
        {activeTab === 'all' && featuredEvent && (
          <section>
            {(() => {
              const title = getEventTitle(featuredEvent);
              const loc = getEventLocation(featuredEvent);
              const existingBooking = myBookingByEventId[featuredEvent.id];
              const bookedSeats = getBookedSeatsForEvent(featuredEvent.id);
              const capacity = Number(featuredEvent.capacity) || 16;
              const seatsLeft = Math.max(0, capacity - bookedSeats);

              return (
                <div
                  onClick={() => handleOpenEventModal(featuredEvent)}
                  className="relative group overflow-hidden rounded-3xl bg-surface-dark border border-primary/30 shadow-[0_10px_30px_rgba(212,175,53,0.15)] cursor-pointer"
                >
                  <div className="aspect-[16/10] w-full relative overflow-hidden">
                    <img
                      src={featuredEvent.image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/recipe-placeholder.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/65 to-transparent"></div>
                  </div>

                  <div className="p-5 -mt-16 relative z-10 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-primary text-background-dark text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                        ★ {t('gourmet_events.featured_badge')}
                      </span>
                      <span className="bg-surface-dark/90 backdrop-blur-md text-primary border border-primary/30 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {t(`gourmet_events.categories.${featuredEvent.category || 'masterclass'}`)}
                      </span>
                      {existingBooking && (
                        <span className="bg-emerald-500 text-background-dark text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {t('gourmet_events.booked_badge', { seats: existingBooking.seats })}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight drop-shadow-md">
                      {title}
                    </h3>

                    <div className="flex flex-col gap-1 text-xs text-slate-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                        {formatEventDate(featuredEvent.date)} • {featuredEvent.time}
                      </span>
                      {loc && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                          {loc}
                        </span>
                      )}
                      <span className="text-[11px] text-amber-400 font-bold">
                        {seatsLeft > 0
                          ? t('gourmet_events.seats_left', { left: seatsLeft, total: capacity })
                          : t('gourmet_events.sold_out')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-primary/15 gap-2 flex-wrap">
                      <span className="text-primary font-extrabold text-xl">
                        {Number(featuredEvent.price_eur) > 0
                          ? t('gourmet_events.price_eur', { price: featuredEvent.price_eur })
                          : t('gourmet_events.free_price')}
                      </span>
                      <div className="flex items-center gap-2">
                        {featuredEvent.category === 'online' &&
                          existingBooking &&
                          (featuredEvent.meeting_url || featuredEvent.external_url) && (
                            <a
                              href={featuredEvent.meeting_url || featuredEvent.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3.5 py-2.5 rounded-xl bg-emerald-500 text-background-dark font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">videocam</span>
                              <span>{t('gourmet_events.join_online_event_btn', 'Влез в срещата')}</span>
                            </a>
                          )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEventModal(featuredEvent);
                          }}
                          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                            existingBooking
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark hover:scale-105'
                          }`}
                        >
                          {existingBooking ? t('gourmet_events.manage_booking_btn') : t('gourmet_events.book_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* Events List Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest border-l-4 border-primary pl-3">
            {activeTab === 'my_bookings'
              ? t('gourmet_events.categories.my_bookings')
              : t('gourmet_events.upcoming_heading')}
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="bg-surface-dark/60 border border-dashed border-primary/25 rounded-2xl p-8 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-primary/50">event_busy</span>
              <p className="text-xs text-slate-400 font-semibold">
                {activeTab === 'my_bookings'
                  ? t('gourmet_events.empty_my_bookings')
                  : t('gourmet_events.empty_events')}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredEvents.map((ev) => {
                const title = getEventTitle(ev);
                const loc = getEventLocation(ev);
                const existingBooking = myBookingByEventId[ev.id];
                const bookedSeats = getBookedSeatsForEvent(ev.id);
                const capacity = Number(ev.capacity) || 16;
                const seatsLeft = Math.max(0, capacity - bookedSeats);

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEventModal(ev)}
                    className="flex flex-col bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden p-3.5 gap-3 shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-3.5">
                      <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-primary/20 bg-background-dark relative">
                        <img
                          src={ev.image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/recipe-placeholder.png';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-extrabold uppercase">
                              {t(`gourmet_events.categories.${ev.category || 'masterclass'}`)}
                            </span>
                            {existingBooking && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                                {t('gourmet_events.booked_badge', { seats: existingBooking.seats })}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug line-clamp-2">
                            {title}
                          </h4>
                        </div>

                        <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-primary">calendar_month</span>
                            {formatEventDate(ev.date)} • {ev.time}
                          </span>
                          {loc && (
                            <span className="flex items-center gap-1 truncate">
                              <span className="material-symbols-outlined text-xs text-primary">location_on</span>
                              <span className="truncate">{loc}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-primary/10 gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <span className="text-primary font-extrabold text-sm">
                          {Number(ev.price_eur) > 0
                            ? t('gourmet_events.price_eur', { price: ev.price_eur })
                            : t('gourmet_events.free_price')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          •{' '}
                          {seatsLeft > 0
                            ? t('gourmet_events.seats_left', { left: seatsLeft, total: capacity })
                            : t('gourmet_events.sold_out')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ev.category === 'online' && existingBooking && (ev.meeting_url || ev.external_url) && (
                          <a
                            href={ev.meeting_url || ev.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
                          >
                            <span className="material-symbols-outlined text-xs">videocam</span>
                            <span>{t('gourmet_events.join_online_event_btn', 'Влез')}</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEventModal(ev);
                          }}
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            existingBooking
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'border border-primary/50 text-primary hover:bg-primary hover:text-background-dark'
                          }`}
                        >
                          {existingBooking ? t('gourmet_events.manage_booking_btn') : t('gourmet_events.book_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Unified Chef AI Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() =>
              navigate('/ai-assistant', { state: { autoPrompt: t('gourmet_events.chef_ai_prompt') } })
            }
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            title={t('pantry.chef_ai_btn')}
          >
            <span className="material-symbols-outlined text-base font-black">auto_awesome</span>
            <span>{t('pantry.chef_ai_btn')}</span>
          </button>
        </div>
      </main>

      {/* Event Detail & Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Image Header */}
            <div className="relative h-44 w-full bg-background-dark shrink-0">
              <img
                src={selectedEvent.image}
                alt={getEventTitle(selectedEvent)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/recipe-placeholder.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/40 to-transparent"></div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 size-9 rounded-full bg-background-dark/80 text-slate-200 hover:text-rose-400 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-background-dark text-[10px] font-black uppercase tracking-wider">
                  {t(`gourmet_events.categories.${selectedEvent.category || 'masterclass'}`)}
                </span>
                <h3 className="text-lg font-extrabold text-white mt-1 leading-snug drop-shadow-md">
                  {getEventTitle(selectedEvent)}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveBooking} className="p-5 overflow-y-auto space-y-4">
              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">{getEventDesc(selectedEvent)}</p>

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-background-dark/70 border border-primary/15 text-xs">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <span className="material-symbols-outlined text-base text-primary">calendar_today</span>
                  <span>
                    {formatEventDate(selectedEvent.date)} • {selectedEvent.time}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <span className="material-symbols-outlined text-base text-primary">schedule</span>
                  <span>{t('gourmet_events.duration_min', { min: selectedEvent.duration_minutes || 120 })}</span>
                </div>
                {selectedEvent.host_chef && (
                  <div className="col-span-2 flex items-center gap-2 text-slate-200 font-bold">
                    <span className="material-symbols-outlined text-base text-primary">person</span>
                    <span>
                      {t('gourmet_events.host_label')} {selectedEvent.host_chef}
                    </span>
                  </div>
                )}
                {getEventLocation(selectedEvent) && (
                  <div className="col-span-2 flex items-center gap-2 text-slate-300 font-semibold">
                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                    <span>{getEventLocation(selectedEvent)}</span>
                  </div>
                )}
              </div>

              {/* Online Access & Meeting Link Zone */}
              {selectedEvent.category === 'online' ? (
                <div className="p-3.5 rounded-2xl bg-background-dark/90 border border-primary/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                      <span className="material-symbols-outlined text-base">videocam</span>
                      <span>{t('gourmet_events.online_access_heading', 'Онлайн достъп до събитието')}</span>
                    </div>
                    {selectedEvent.online_platform && (
                      <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-black uppercase tracking-wider border border-primary/20">
                        {getPlatformLabel(selectedEvent.online_platform)}
                      </span>
                    )}
                  </div>

                  {/* If user is booked OR meeting link is public */}
                  {Boolean(myBookingByEventId[selectedEvent.id]) || selectedEvent.meeting_access === 'public' ? (
                    (selectedEvent.meeting_url || selectedEvent.external_url) ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={selectedEvent.meeting_url || selectedEvent.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-background-dark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">login</span>
                            <span>{t('gourmet_events.join_online_event_btn', 'Влез в срещата')}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyMeetingLink(selectedEvent.meeting_url || selectedEvent.external_url)}
                            className="p-2.5 rounded-xl bg-surface-dark border border-primary/30 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                            title={t('gourmet_events.copy_link_btn', 'Копирай линка')}
                          >
                            <span className="material-symbols-outlined text-base">content_copy</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>
                            {t(
                              'gourmet_events.access_unlocked_hint',
                              'Вашето място е потвърдено. Можете да се присъедините в началния час.'
                            )}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0">hourglass_top</span>
                        <p className="text-[11px] leading-snug">
                          {t(
                            'gourmet_events.link_pending_hint',
                            'Линкът за срещата ще бъде активиран тук преди началото на събитието.'
                          )}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base shrink-0">lock</span>
                      <p className="text-[11px] leading-snug">
                        {t(
                          'gourmet_events.link_locked_hint',
                          'Линкът за срещата (Google Meet / Zoom) се отключва автоматично след резервация.'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                selectedEvent.external_url && (
                  <a
                    href={selectedEvent.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                    <span>{t('gourmet_events.external_link_btn')}</span>
                  </a>
                )
              )}

              {/* Seats & Contact Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                    {t('gourmet_events.booking_modal.seats_label')}
                  </label>
                  <div className="flex items-center justify-between bg-background-dark border border-primary/20 rounded-xl p-1.5">
                    <button
                      type="button"
                      onClick={() => setSeatsCount((s) => Math.max(1, Number(s) - 1))}
                      className="size-8 rounded-lg bg-surface-dark text-primary hover:bg-primary/20 flex items-center justify-center font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-extrabold text-slate-100">{seatsCount}</span>
                    <button
                      type="button"
                      onClick={() => setSeatsCount((s) => Math.min(6, Number(s) + 1))}
                      className="size-8 rounded-lg bg-surface-dark text-primary hover:bg-primary/20 flex items-center justify-center font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                    {t('gourmet_events.booking_modal.phone_label')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('gourmet_events.booking_modal.phone_placeholder')}
                    className="w-full h-[46px] bg-background-dark border border-primary/20 focus:border-primary rounded-xl px-3 text-xs font-bold text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 block mb-1.5">
                  {t('gourmet_events.booking_modal.notes_label')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('gourmet_events.booking_modal.notes_placeholder')}
                  className="w-full bg-background-dark border border-primary/20 focus:border-primary rounded-xl p-2.5 text-xs font-medium text-slate-100 outline-none resize-none"
                />
              </div>

              {/* Total Price Summary */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  {t('gourmet_events.booking_modal.total_price')}
                </span>
                <span className="text-base font-black text-primary">
                  {Number(selectedEvent.price_eur) > 0
                    ? t('gourmet_events.price_eur', {
                        price: (Number(selectedEvent.price_eur) * (Number(seatsCount) || 1)).toFixed(0)
                      })
                    : t('gourmet_events.free_price')}
                </span>
              </div>

              {/* Submit / Cancel Booking Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
                >
                  {myBookingByEventId[selectedEvent.id]
                    ? t('gourmet_events.booking_modal.update_btn')
                    : t('gourmet_events.booking_modal.confirm_btn')}
                </button>

                {myBookingByEventId[selectedEvent.id] && (
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {t('gourmet_events.booking_modal.cancel_booking_btn')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GourmetEvents;

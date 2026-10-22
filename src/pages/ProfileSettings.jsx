import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { LANGUAGE_LABELS } from '../lib/localeUtils';
import { getReputationLabel } from '../lib/reputationUtils';
import { ROLES } from '../constants/roles';
import { useTheme } from '../context/ThemeContext';

const ProfileSettings = () => {
  const { user, logout, isGuest, isAdmin, isOwner, isModerator, isUser, resendVerificationEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();

  const targetUid = searchParams.get('uid');
  const isViewingOther = Boolean(targetUid && targetUid !== user?.uid);

  const [targetUserData, setTargetUserData] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState(isViewingOther);
  const [inviteLoading, setInviteLoading] = useState(false);
  
  const [resendStatus, setResendStatus] = useState(''); // '' | 'loading' | 'sent' | 'error'
  const [importStatus, setImportStatus] = useState(''); // '' | 'loading' | 'done' | 'error'
  const [importProgress, setImportProgress] = useState(0);
  const [showImportSection, setShowImportSection] = useState(false); // Hidden by default as requested

  useEffect(() => {
    if (!isViewingOther || !targetUid) {
      return;
    }

    // Permission check: only admin, owner, moderator can view other users' profiles via uid
    if (!isAdmin && !isOwner && !isModerator) {
      navigate('/profile');
      return;
    }

    const userRef = doc(db, 'users', targetUid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTargetUserData({
          uid: docSnap.id,
          email: data.auth?.email || data.email || '',
          name: data.profile?.nickname || data.name || '',
          isVerified: true,
          role: (data.status?.level || data.role || ROLES.USER).toLowerCase(),
          profile: data.profile || {},
          reputation: data.reputation || { score: 0, badges: [] },
          preferences: data.preferences || {},
          status: data.status || {},
          invited_role: data.invited_role || null
        });
      } else {
        setTargetUserData(null);
      }
      setLoadingTarget(false);
    }, (err) => {
      console.error("Error loading target user:", err);
      setLoadingTarget(false);
    });

    return () => unsubscribe();
  }, [isViewingOther, targetUid, isAdmin, isOwner, isModerator, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResendEmail = async () => {
    if (resendStatus === 'loading' || resendStatus === 'sent') return;
    setResendStatus('loading');
    try {
      await resendVerificationEmail();
      setResendStatus('sent');
      setTimeout(() => setResendStatus(''), 5000); // clear after 5s
    } catch (error) {
      console.error(error);
      setResendStatus('error');
      setTimeout(() => setResendStatus(''), 5000);
    }
  };



  const handleImportDatabase = async () => {
    if (!isOwner || user.email !== 'kamen.uzunov@gmail.com') return;
    if (importStatus === 'loading') return;

    setImportStatus('loading');
    setImportProgress(0);

    try {
      const response = await fetch('/upload/initial_recipes_50.csv');
      if (!response.ok) throw new Error("Failed to fetch CSV");
      const csvText = await response.text();
      
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      const headerLine = lines[0];
      const rows = lines.slice(1);
      
      // Robust CSV row splitter that respects quotes and escaped quotes
      const splitCsvRow = (text) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const next = text[i+1];
          if (char === '"' && inQuotes && next === '"') {
            cur += '"'; i++; // escaped quote
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur); cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur);
        return result;
      };

      const header = splitCsvRow(headerLine).map(h => h.trim());
      
      let count = 0;
      for (const row of rows) {
        const values = splitCsvRow(row);
        if (values.length < 5) continue;

        const r = {};
        header.forEach((h, i) => {
          r[h] = values[i] || '';
        });

        // Use real UID from current user
        const publisherId = user.uid || r.publisher_id;
        const publisherName = user.profile?.nickname || user.name || 'Kamen';

        // Safe JSON parsing to prevent crash on bad data
        let ingredients = [];
        try {
          ingredients = JSON.parse(r.ingredients_json || '[]');
        } catch {
          console.warn("Invalid ingredients JSON for row:", r.title_en);
        }

        let steps = [];
        try {
          steps = JSON.parse(r.steps_json || '[]');
        } catch {
          console.warn("Invalid steps JSON for row:", r.title_en);
        }

        const recipeData = {
          title_bg: r.title_bg || '',
          title_en: r.title_en || '',
          slug: r.slug || `recipe-${Date.now()}-${count}`,
          description_bg: r.description_bg || '',
          description_en: r.description_en || '',
          servings: parseInt(r.servings) || 1,
          calories_per_serving: parseInt(r.calories_per_serving) || 0,
          protein: parseFloat(r.protein) || 0,
          fat: parseFloat(r.fat) || 0,
          ingredients: ingredients,
          steps: steps,
          cuisine_id: r.cuisine_id || '',
          category_id: r.category_id || '',
          category_ids: r.category_ids ? r.category_ids.split(';').map(t => t.trim()).filter(Boolean) : (r.category_id ? [r.category_id] : []),
          tags: r.tags ? r.tags.split(',').map(t => t.trim()) : [],
          original_author: r.original_author || '',
          source_link: r.source_link || '',
          publisher_id: publisherId,
          publisher_name: publisherName,
          is_public_variation: r.is_public_variation === 'true',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          is_active: true,
          is_deleted: false,
          views_count: 0,
          rating: 0,
          votes_count: 0
        };

        await setDoc(doc(db, 'recipes', recipeData.slug), recipeData);
        count++;
        setImportProgress(Math.round((count / rows.length) * 100));
      }
      
      setImportStatus('done');
    } catch (err) {
      console.error("Import error:", err);
      setImportStatus('error');
    }
  };

  const displayUser = isViewingOther ? targetUserData : user;

  const currentLang = i18n.language || 'bg';
  const displayUserLang = displayUser?.preferences?.language || currentLang;
  const currentLangMeta = LANGUAGE_LABELS[displayUserLang] || LANGUAGE_LABELS[currentLang] || { name: currentLang.toUpperCase(), fullName: currentLang };
  const currentLangLabel = currentLangMeta.fullName ? `${currentLangMeta.fullName} (${currentLangMeta.name})` : currentLangMeta.name;

  const displayRole = (displayUser?.status?.level || displayUser?.role || ROLES.USER).toLowerCase();
  const displayIsAdmin = displayRole === ROLES.ADMIN;
  const displayIsOwner = displayRole === ROLES.OWNER;
  const displayIsModerator = displayRole === ROLES.MODERATOR;
  const displayIsGuest = isViewingOther ? false : isGuest;

  const canEdit = isViewingOther 
    ? (isOwner || (isAdmin && displayRole !== ROLES.OWNER))
    : !isGuest;

  const canInvite = isViewingOther && (isOwner || isAdmin) && (displayRole === ROLES.USER || displayRole === ROLES.MODERATOR);
  const nextInviteRole = displayRole === ROLES.USER ? ROLES.MODERATOR : ROLES.ADMIN;
  const isAlreadyInvited = displayUser?.invited_role === nextInviteRole;

  const handleInviteRole = async () => {
    if (inviteLoading || !displayUser) return;
    setInviteLoading(true);
    try {
      await updateDoc(doc(db, 'users', displayUser.uid), {
        invited_role: nextInviteRole
      });
      await logActivity(
        user.uid,
        user.email,
        'invite_role',
        `Invited ${displayUser.email || displayUser.uid} to ${nextInviteRole}`
      );
      alert(t('manage_users.alerts.invite_success'));
    } catch (e) {
      console.error(e);
      alert(t('manage_users.alerts.invite_error'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async () => {
    if (inviteLoading || !displayUser) return;
    if (!window.confirm('Сигурни ли сте, че искате да оттеглите поканата?')) return;
    setInviteLoading(true);
    try {
      await updateDoc(doc(db, 'users', displayUser.uid), {
        invited_role: null
      });
      await logActivity(
        user.uid,
        user.email,
        'cancel_role_invite',
        `Canceled role invitation for ${displayUser.email || displayUser.uid}`
      );
    } catch (e) {
      console.error(e);
      alert('Грешка при оттегляне на поканата.');
    } finally {
      setInviteLoading(false);
    }
  };

  if (isViewingOther && loadingTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-primary min-h-[50vh]">
        <span className="material-symbols-outlined text-4xl animate-spin">refresh</span>
        <p className="mt-2 text-xs text-slate-400 font-bold uppercase tracking-wider">{t('common.loading') || 'Зареждане...'}</p>
      </div>
    );
  }

  if (isViewingOther && !loadingTarget && !targetUserData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">person_off</span>
        <h2 className="text-lg font-bold text-slate-100">Потребителят не е намерен</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">Възможно е профилът да е изтрит или адресът да е невалиден.</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/20 transition-all"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Обратно към Потребители
        </button>
      </div>
    );
  }

  if (!displayUser) return null;

  const editProfileUrl = isViewingOther ? `/profile/edit?uid=${displayUser.uid}` : '/profile/edit';
  const editPreferencesUrl = isViewingOther ? `/profile/edit?uid=${displayUser.uid}&tab=preferences` : '/profile/edit?tab=preferences';

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      {isViewingOther && (
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20">
          <button 
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>{t('manage_users.title') || 'Потребители'}</span>
          </button>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('manage_users.viewing_profile', 'Преглед на профил')}
          </div>
        </div>
      )}

      <section className="flex flex-col items-center py-10 px-4 bg-gradient-to-b from-surface-dark to-background-dark border-b border-primary/10">
        <div className="relative group">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-primary shadow-[0_0_30px_rgba(212,175,53,0.3)] flex items-center justify-center bg-primary/10 overflow-hidden">
            {displayUser.profile?.avatar && !displayIsGuest ? (
              <img src={displayUser.profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-6xl text-primary">person</span>
            )}
          </div>
          {canEdit && (
            <Link to={editProfileUrl} className="absolute bottom-1 right-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark rounded-full p-2 shadow-lg hover:scale-110 transition-transform cursor-pointer">
              <span className="material-symbols-outlined text-sm font-extrabold">photo_camera</span>
            </Link>
          )}
        </div>
        
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
            {displayUser.profile?.nickname || (displayIsGuest ? t('profile.roles.guest') : (displayUser.name || t('profile.roles.default_user')))}
          </h1>
          <p className="text-primary/80 font-bold text-xs uppercase tracking-widest mt-1">
            {displayUser.reputation && !displayIsGuest ? `${getReputationLabel(displayUser.reputation.score, currentLang)} • ` : ''}
            {displayIsAdmin ? t('profile.roles.admin') : displayIsOwner ? t('profile.roles.owner') : displayIsModerator ? t('profile.roles.moderator') : displayIsGuest ? t('profile.roles.guest') : t('profile.roles.user')}
          </p>
          {displayUser.email && <p className="text-slate-400 text-sm mt-1">{displayUser.email}</p>}
          {!isViewingOther && !user.isVerified && !isGuest && (
            <div className="mt-3 flex flex-col items-center">
              <button 
                onClick={handleResendEmail}
                disabled={resendStatus === 'loading' || resendStatus === 'sent'}
                className="flex items-center justify-center gap-1 bg-rose-500/10 border border-rose-500/20 py-1 px-3 rounded-full hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {resendStatus === 'loading' ? (
                  <span className="material-symbols-outlined text-[14px] text-rose-500 animate-spin">refresh</span>
                ) : resendStatus === 'sent' ? (
                  <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px] text-rose-500">warning</span>
                )}
                <span className={`text-xs font-medium ${resendStatus === 'sent' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {resendStatus === 'loading' 
                    ? t('profile.verification.sending')
                    : resendStatus === 'sent'
                      ? t('profile.verification.sent_success')
                      : t('profile.verification.unverified_badge')}
                </span>
              </button>
              {resendStatus === 'error' && (
                <p className="text-[10px] text-rose-500 mt-1">
                  {t('profile.verification.error')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Role Invitation Button (Under photo for Owner or Admin viewing another user) */}
        {canInvite && (
          <div className="mt-4 w-full max-w-xs flex flex-col items-center gap-1.5 px-4">
            <button
              type="button"
              disabled={isAlreadyInvited || inviteLoading}
              onClick={handleInviteRole}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all active:scale-95 shadow-md ${
                isAlreadyInvited
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 cursor-not-allowed opacity-90'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-background-dark shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {inviteLoading ? 'refresh' : isAlreadyInvited ? 'mark_email_read' : 'mail'}
              </span>
              {isAlreadyInvited 
                ? t('manage_users.modal.invitation_sent')
                : (displayRole === ROLES.USER ? t('manage_users.modal.invite_moderator') : t('manage_users.modal.invite_admin'))}
            </button>
            {displayUser.invited_role && (
              <button
                type="button"
                onClick={handleCancelInvite}
                disabled={inviteLoading}
                className="text-[11px] text-rose-400/80 hover:text-rose-300 hover:underline flex items-center gap-1 mt-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">cancel</span>
                Оттегли поканата
              </button>
            )}
          </div>
        )}

        {!displayIsGuest && (() => {
          const bioText = displayUser.profile?.[`bio_${currentLang}`] || displayUser.profile?.bio_en || displayUser.profile?.bio_bg || displayUser.profile?.bio || '';
          return bioText ? (
            <div className="mt-4 px-6 max-w-sm w-full">
              <p className="text-slate-300 text-sm italic border-l-2 border-primary/30 pl-3 text-left">
                {bioText}
              </p>
            </div>
          ) : null;
        })()}

        {!displayIsGuest && displayUser.profile?.location?.show_location && (() => {
          const loc = displayUser.profile.location;
          const city = loc?.[`city_${currentLang}`] || loc?.city_en || loc?.city_bg || '';
          const country = loc?.[`country_${currentLang}`] || loc?.country_en || loc?.country_bg || '';
          const locString = [city, country].filter(Boolean).join(', ');
          return locString ? (
            <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <span className="material-symbols-outlined text-primary text-base">location_on</span>
              <span>{locString}</span>
            </div>
          ) : null;
        })()}
        
        {canEdit && (
          <div className="mt-6">
            <Link to={editProfileUrl} className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-primary border border-primary/30 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-lg">edit</span>
              {t('profile.buttons.edit_profile')}
            </Link>
          </div>
        )}
      </section>

      {!isViewingOther && user.invited_role && (
        <section className="mt-4 px-4">
          <button 
            onClick={async () => {
              try {
                await updateDoc(doc(db, 'users', user.uid), {
                  'status.level': user.invited_role,
                  invited_role: null
                });
                await logActivity(user.uid, user.email, 'accept_role_invite', `Accepted invite for role: ${user.invited_role}`);
                alert(t('profile.invites.accepted_success'));
                window.location.reload();
              } catch(e) {
                console.error(e);
                alert(t('profile.invites.error'));
              }
            }}
            className="w-full flex items-center justify-center gap-2 border border-[#b8860b]/40 text-[#b8860b] bg-[#b8860b]/10 py-3 rounded-2xl hover:bg-[#b8860b]/20 active:scale-95 transition-all font-extrabold shadow-[0_0_15px_rgba(184,134,11,0.2)]"
          >
            <span className="material-symbols-outlined">workspace_premium</span>
            {user.invited_role === 'moderator' ? t('profile.invites.apply_moderator') : t('profile.invites.apply_admin')}
          </button>
        </section>
      )}

      {!isViewingOther && !isGuest && (
        <section className="mt-6 px-4">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 border border-rose-500/30 text-rose-500 bg-rose-500/5 py-4 rounded-2xl hover:bg-rose-500/10 active:scale-95 transition-all font-extrabold shadow-sm"
          >
            <span className="material-symbols-outlined">logout</span>
            {t('profile.buttons.logout')}
          </button>
        </section>
      )}

      {!isViewingOther && (isAdmin || isOwner || isModerator || isUser) && (
        <section className="mt-8 px-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">shield_person</span>
            {t('profile.titles.administration')}
          </h3>
          <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-rose-500/20 border-2 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
            {(isAdmin || isOwner || isModerator) && (
              <Link to="/admin" className="flex items-center justify-between p-4 cursor-pointer hover:bg-rose-500/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-rose-500 uppercase tracking-wide">{t('profile.titles.administration')}</p>
                    <p className="text-[10px] text-rose-500/60 font-bold uppercase">{t('profile.menu_items.control_panel')}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-rose-500/50">chevron_right</span>
              </Link>
            )}
            <Link to="/admin/data" className="flex items-center justify-between p-4 cursor-pointer hover:bg-rose-500/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">edit_square</span>
                </div>
                <div>
                  <p className="text-sm font-black text-rose-500 uppercase tracking-wide">{t('profile.menu_items.edit_data')}</p>
                  <p className="text-[10px] text-rose-500/60 font-bold uppercase">{t('profile.menu_items.data_management')}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-rose-500/50">chevron_right</span>
            </Link>
          </div>
        </section>
      )}

      {/* Secret Owner Import Section */}
      {!isViewingOther && isOwner && showImportSection && (
        <section className="mt-8 px-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 px-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">database</span>
            {t('profile.titles.database_owner')}
          </h3>
          <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                <span className="material-symbols-outlined text-2xl">download_for_offline</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-100 uppercase tracking-tight">
                  {t('profile.owner_db.import_50')}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  {t('profile.owner_db.import_desc')}
                </p>
              </div>
            </div>

            {importStatus === 'loading' ? (
              <div className="space-y-2">
                <div className="h-2 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300" 
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-emerald-500 font-bold text-center uppercase tracking-widest">
                  {t('profile.owner_db.processing')}: {importProgress}%
                </p>
              </div>
            ) : importStatus === 'done' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-500 bg-emerald-500/10 py-3 rounded-xl">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="text-xs font-black uppercase tracking-widest">
                  {t('profile.owner_db.success')}
                </span>
              </div>
            ) : (
              <button 
                onClick={handleImportDatabase}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-background-dark font-black py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs"
              >
                {t('profile.owner_db.start_import')}
              </button>
            )}

            {importStatus === 'error' && (
              <p className="text-[10px] text-rose-500 font-bold text-center uppercase">
                {t('profile.owner_db.error')}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {t('profile.titles.preferences')}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link 
            to={editPreferencesUrl}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">language</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.language')}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-primary font-semibold">{currentLangLabel}</span>
                  {currentLangMeta.flagUrl && (
                    <img 
                      src={currentLangMeta.flagUrl} 
                      alt="" 
                      className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                    />
                  )}
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
          </Link>
          <div
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
              }
            }}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors select-none"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform hover:scale-110">
                <span className="material-symbols-outlined">
                  {isDark ? 'dark_mode' : 'light_mode'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.theme')}</p>
                <p className="text-xs text-primary font-semibold">
                  {isDark
                    ? t('profile.menu_items.dark_theme')
                    : t('profile.menu_items.light_theme', 'Светла тема')}
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full relative shadow-inner transition-all duration-300 ${
                isDark
                  ? 'bg-gradient-to-r from-primary to-[#b8860b]'
                  : 'bg-primary/25 border border-primary/40'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${
                  isDark
                    ? 'right-1 bg-[#1a1812]'
                    : 'left-1 bg-primary'
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {t('profile.titles.activity')}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link to="/profile/progress" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>analytics</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.cooking_progress')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {t('profile.titles.internal_menu')}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link to="/community" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.community')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
          <Link to="/events" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">event</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.events')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
          <Link to="/orders" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">menu_book</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('profile.menu_items.orders')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {t('profile.titles.legal')}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link to="/terms" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('gdpr.tos')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
          <Link to="/privacy" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">policy</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{t('gdpr.privacy')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </div>
      </section>



      <section className="mt-4 px-4 pb-8">
        <p 
          onClick={() => {
            const now = Date.now();
            if (now - (window.lastVersionClick || 0) < 1000) {
              window.versionClicks = (window.versionClicks || 0) + 1;
            } else {
              window.versionClicks = 1;
            }
            window.lastVersionClick = now;
            if (window.versionClicks >= 5) {
              setShowImportSection(true);
              alert("Admin Tools Activated");
            }
          }}
          className="text-center text-[10px] text-slate-500 mt-8 font-bold uppercase tracking-widest cursor-default select-none"
        >
          {t('app.title')} v3.0
        </p>
      </section>
    </div>
  );
};

export default ProfileSettings;

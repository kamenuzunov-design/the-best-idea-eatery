import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ProfileSettings = () => {
  const { user, logout, deleteAccount, isGuest, isAdmin, isOwner, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [resendStatus, setResendStatus] = useState(''); // '' | 'loading' | 'sent' | 'error'
  const [importStatus, setImportStatus] = useState(''); // '' | 'loading' | 'done' | 'error'
  const [importProgress, setImportProgress] = useState(0);
  const [showImportSection, setShowImportSection] = useState(false); // Hidden by default as requested

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
        } catch (jErr) {
          console.warn("Invalid ingredients JSON for row:", r.title_en);
        }

        let steps = [];
        try {
          steps = JSON.parse(r.steps_json || '[]');
        } catch (jErr) {
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

  const isBg = i18n.language === 'bg';

  if (!user) return null; // Or a loading spinner, but routing handles this

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <section className="flex flex-col items-center py-10 px-4 bg-gradient-to-b from-surface-dark to-background-dark border-b border-primary/10">
        <div className="relative group">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-primary shadow-[0_0_30px_rgba(212,175,53,0.3)] flex items-center justify-center bg-primary/10 overflow-hidden">
            {user.profile?.avatar && !isGuest ? (
              <img src={user.profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-6xl text-primary">person</span>
            )}
          </div>
          {!isGuest && (
            <Link to="/profile/edit" className="absolute bottom-1 right-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark rounded-full p-2 shadow-lg hover:scale-110 transition-transform cursor-pointer">
              <span className="material-symbols-outlined text-sm font-extrabold">photo_camera</span>
            </Link>
          )}
        </div>
        
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">{user.profile?.nickname || user.name || 'Потребител'}</h1>
          <p className="text-primary/80 font-bold text-xs uppercase tracking-widest mt-1">
            {user.reputation?.label && !isGuest ? `${user.reputation.label} • ` : ''}
            {isAdmin ? (isBg ? 'Администратор' : 'Administrator') : isOwner ? (isBg ? 'Собственик' : 'Owner') : isGuest ? (isBg ? 'Гост' : 'Guest') : (isBg ? 'Потребител' : 'Registered User')}
          </p>
          {user.email && <p className="text-slate-400 text-sm mt-1">{user.email}</p>}
          {!user.isVerified && !isGuest && (
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
                    ? (isBg ? 'Изпращане...' : 'Sending...')
                    : resendStatus === 'sent'
                      ? (isBg ? 'Имейлът е изпратен!' : 'Email sent!')
                      : (isBg ? 'Неверифициран имейл. Натиснете за нов линк.' : 'Unverified Email. Click to resend.')}
                </span>
              </button>
              {resendStatus === 'error' && (
                <p className="text-[10px] text-rose-500 mt-1">
                  {isBg ? 'Възникна грешка. Опитайте по-късно.' : 'An error occurred. Try again later.'}
                </p>
              )}
            </div>
          )}
        </div>

        {!isGuest && (() => {
          const bioText = isBg
            ? (user.profile?.bio_bg || user.profile?.bio || '')
            : (user.profile?.bio_en || user.profile?.bio || '');
          return bioText ? (
            <div className="mt-4 px-6 max-w-sm w-full">
              <p className="text-slate-300 text-sm italic border-l-2 border-primary/30 pl-3 text-left">
                {bioText}
              </p>
            </div>
          ) : null;
        })()}

        {user.profile?.location?.show_location && !isGuest && (user.profile.location.city_bg || user.profile.location.country_bg) && (
          <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <span className="material-symbols-outlined text-primary text-base">location_on</span>
            <span>
              {isBg
                ? [user.profile.location.city_bg, user.profile.location.country_bg].filter(Boolean).join(', ')
                : [user.profile.location.city_en, user.profile.location.country_en].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        
        {!isGuest && (
          <div className="mt-6">
            <Link to="/profile/edit" className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-primary border border-primary/30 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-lg">edit</span>
              {isBg ? 'Редактирай профила' : 'Edit Profile'}
            </Link>
          </div>
        )}
      </section>

      {!isGuest && (
        <section className="mt-6 px-4">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 border border-rose-500/30 text-rose-500 bg-rose-500/5 py-4 rounded-2xl hover:bg-rose-500/10 active:scale-95 transition-all font-extrabold shadow-sm"
          >
            <span className="material-symbols-outlined">logout</span>
            {isBg ? 'Изход' : 'Log Out'}
          </button>
        </section>
      )}

      {(isAdmin || isOwner) && (
        <section className="mt-8 px-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">shield_person</span>
            {isBg ? 'АДМИНИСТРАЦИЯ' : 'ADMINISTRATION'}
          </h3>
          <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-rose-500/20 border-2 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
            <Link to="/admin" className="flex items-center justify-between p-4 cursor-pointer hover:bg-rose-500/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <div>
                  <p className="text-sm font-black text-rose-500 uppercase tracking-wide">{isBg ? 'Администрация' : 'Administration'}</p>
                  <p className="text-[10px] text-rose-500/60 font-bold uppercase">{isBg ? 'Контролен панел' : 'Control Panel'}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-rose-500/50">chevron_right</span>
            </Link>
            <Link to="/admin/data" className="flex items-center justify-between p-4 cursor-pointer hover:bg-rose-500/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">edit_square</span>
                </div>
                <div>
                  <p className="text-sm font-black text-rose-500 uppercase tracking-wide">Редактиране Рецепти/Продукти</p>
                  <p className="text-[10px] text-rose-500/60 font-bold uppercase">{isBg ? 'Управление на данни' : 'Data Management'}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-rose-500/50">chevron_right</span>
            </Link>
          </div>
        </section>
      )}

      {/* Secret Owner Import Section */}
      {isOwner && showImportSection && (
        <section className="mt-8 px-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 px-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">database</span>
            {isBg ? 'БАЗА ДАННИ (САМО ЗА СОБСТВЕНИК)' : 'DATABASE (OWNER ONLY)'}
          </h3>
          <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                <span className="material-symbols-outlined text-2xl">download_for_offline</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-100 uppercase tracking-tight">
                  {isBg ? 'Импорт на 50 рецепти' : 'Import 50 Recipes'}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  {isBg ? 'Захранване на Firestore с базови данни' : 'Populate Firestore with seed data'}
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
                  {isBg ? `Обработка: ${importProgress}%` : `Processing: ${importProgress}%`}
                </p>
              </div>
            ) : importStatus === 'done' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-500 bg-emerald-500/10 py-3 rounded-xl">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="text-xs font-black uppercase tracking-widest">
                  {isBg ? 'УСПЕШЕН ИМПОРТ!' : 'IMPORT SUCCESSFUL!'}
                </span>
              </div>
            ) : (
              <button 
                onClick={handleImportDatabase}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-background-dark font-black py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs"
              >
                {isBg ? 'СТАРТИРАЙ ИМПОРТ' : 'START IMPORT'}
              </button>
            )}

            {importStatus === 'error' && (
              <p className="text-[10px] text-rose-500 font-bold text-center uppercase">
                {isBg ? 'ГРЕШКА ПРИ ИМПОРТ. ПРОВЕРЕТЕ КОНЗОЛАТА.' : 'IMPORT ERROR. CHECK CONSOLE.'}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {isBg ? 'Предпочитания' : 'Preferences'}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">language</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{isBg ? 'Език' : 'Language'}</p>
                <p className="text-xs text-primary/70 font-medium">Bulgarian & English</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </div>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">dark_mode</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{isBg ? 'Тема' : 'Theme Mode'}</p>
                <p className="text-xs text-primary/70 font-medium">{isBg ? 'Тъмна' : 'Dark'}</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-gradient-to-r from-primary to-[#b8860b] rounded-full relative shadow-inner">
              <div className="absolute right-1 top-1 w-4 h-4 bg-background-dark rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {isBg ? 'Активност' : 'Activity'}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link to="/profile/progress" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>analytics</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{isBg ? 'Моят напредък' : 'Cooking Progress'}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {isBg ? 'Вътрешно Меню' : 'Internal Menu'}
        </h3>
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
          <Link to="/community" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{isBg ? 'Общност' : 'Community'}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
          <Link to="/events" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">event</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{isBg ? 'Събития' : 'Events'}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
          <Link to="/orders" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <p className="text-sm font-bold text-slate-100">{isBg ? 'Поръчки' : 'Order History'}</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </Link>
        </div>
      </section>


      <section className="mt-6 px-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
          {t('profile.legal')}
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
          The Best Idea Eatery v3.0
        </p>
      </section>
    </div>
  );
};

export default ProfileSettings;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ProfileSettings = () => {
  const { user, logout, isGuest, isAdmin, isSuperuser, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [resendStatus, setResendStatus] = useState(''); // '' | 'loading' | 'sent' | 'error'

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
            {isAdmin ? 'Administrator' : isSuperuser ? 'Super User' : isGuest ? 'Guest' : 'Registered User'}
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

        {user.profile?.bio && !isGuest && (
          <div className="mt-4 px-6 max-w-sm w-full">
            <p className="text-slate-300 text-sm italic border-l-2 border-primary/30 pl-3 text-left">
              {user.profile.bio}
            </p>
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

      {isAdmin && (
        <section className="mt-6 px-4">
          <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
            <Link to="/admin" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <p className="text-sm font-bold text-slate-100">{isBg ? 'Администрация' : 'Administration'}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </Link>
            <Link to="/admin/data" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">add_box</span>
                </div>
                <p className="text-sm font-bold text-slate-100">{isBg ? 'Добави Рецепта/Продукт' : 'Add Data'}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </Link>
          </div>
        </section>
      )}

      <section className="mt-10 px-4 pb-8">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 border border-rose-500/30 text-rose-500 bg-rose-500/5 p-4 rounded-2xl hover:bg-rose-500/10 active:scale-95 transition-all font-extrabold shadow-sm">
          <span className="material-symbols-outlined">logout</span>
          {isBg ? 'Изход' : 'Log Out'}
        </button>
        <p className="text-center text-[10px] text-slate-500 mt-8 font-bold uppercase tracking-widest">The Best Idea Eatery v3.0</p>
      </section>
    </div>
  );
};

export default ProfileSettings;

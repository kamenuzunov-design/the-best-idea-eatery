import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ProfileSettings = () => {
  const { user, logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isBg = i18n.language === 'bg';

  if (!user) return null; // Or a loading spinner, but routing handles this

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      <section className="flex flex-col items-center py-10 px-4 bg-gradient-to-b from-surface-dark to-background-dark border-b border-primary/10">
        <div className="relative group">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-primary shadow-[0_0_30px_rgba(212,175,53,0.3)] transition-transform duration-300 group-hover:scale-105" 
               style={{backgroundImage: isGuest ? 'none' : 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB0kYtgPApD2lQ3iGPzDa2cCvwEKxeayiSBrQqSR100TjiHV7zdm9g2tkpKq-xGmFedln9YUMZSMJFLc1L0GXfw--g9eGH4goVs5Ga4ZUYc8YxdZLr9nr7wfgQtgE6gocQuFz1tqXkkgMGn6Shi6HJ5Qsg9fPdaBxhKrLmcsE50MSlJmhZljvri8al9_nxwJptZtE40O2WWnig60n9IceQbZBfvAugCRIocAgFB7RAs2fKAAx9tGifcb_Mhe5m7YJEm62fORDGuJZo")'}}>
            {isGuest && <div className="w-full h-full flex items-center justify-center bg-primary/10 rounded-full"><span className="material-symbols-outlined text-6xl text-primary">person</span></div>}
          </div>
          {!isGuest && (
            <div className="absolute bottom-1 right-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark rounded-full p-2 shadow-lg hover:scale-110 transition-transform cursor-pointer">
              <span className="material-symbols-outlined text-sm font-extrabold">photo_camera</span>
            </div>
          )}
        </div>
        
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">{user.name}</h1>
          <p className="text-primary/80 font-bold text-xs uppercase tracking-widest mt-1">
            {user.role === 0 ? 'Administrator' : user.role === 1 ? 'Registered User' : 'Guest'}
          </p>
          {user.email && <p className="text-slate-400 text-sm mt-1">{user.email}</p>}
        </div>
        
        {!isGuest && (
          <div className="mt-6">
            <button className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-primary border border-primary/30 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95">
              <span className="material-symbols-outlined text-lg">edit</span>
              {isBg ? 'Редактирай профила' : 'Edit Profile'}
            </button>
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

      {user.role === 0 && (
        <section className="mt-6 px-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2 mb-2">
            {isBg ? 'Администрация' : 'Administration'}
          </h3>
          <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl overflow-hidden divide-y divide-primary/10 border border-primary/20 shadow-lg">
            <Link to="/admin" className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors group">
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

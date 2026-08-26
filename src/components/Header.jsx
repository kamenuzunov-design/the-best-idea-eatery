import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const isBg = i18n.language === 'bg';

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bg' ? 'en' : 'bg';
    i18n.changeLanguage(newLang);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl p-4 justify-between border-b border-primary/20 shadow-sm">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full cursor-pointer transition-colors"
          title={isBg ? 'Отвори меню' : 'Open menu'}
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-2xl font-bold">menu</span>
        </button>

        <div 
          id="app-top-anchor"
          className="flex flex-col items-center flex-1 cursor-pointer" 
          onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <h1 className="text-primary text-xl font-bold leading-tight tracking-tight italic drop-shadow-md">
            {t('app.title')}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary/70 font-semibold">
            {t('app.subtitle')}
          </p>
        </div>

        <div className="flex w-10 items-center justify-end">
          <button 
            onClick={toggleLanguage}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/30 hover:scale-105 active:scale-95 transition-all shadow-inner cursor-pointer"
            title={isBg ? 'Смени езика' : 'Switch language'}
          >
            <span className="text-xs font-bold uppercase">{i18n.language === 'bg' ? 'en' : 'bg'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 max-w-md mx-auto flex overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={closeMenu}
          ></div>

          {/* Drawer Sliding Panel */}
          <div className="relative z-10 w-4/5 max-w-xs bg-surface-dark border-r border-primary/20 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary/10 bg-background-dark/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">restaurant_menu</span>
                <span className="text-sm font-extrabold text-slate-100 tracking-wider">
                  The Best Idea Eatery
                </span>
              </div>
              <button 
                onClick={closeMenu}
                className="text-slate-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* User Profile Info Badge */}
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                {user?.profile?.avatar_url ? (
                  <img src={user.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-lg">{isGuest ? 'person_outline' : 'person'}</span>
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-extrabold text-slate-100 truncate">
                  {isGuest ? (isBg ? 'Гост потребител' : 'Guest User') : (user?.profile?.nickname || user?.displayName || user?.email)}
                </span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {isGuest ? (isBg ? 'Нерегистриран' : 'Not logged in') : (user?.role || 'User')}
                </span>
              </div>
            </div>

            {/* Navigation Menu Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <NavLink 
                to="/" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">home</span>
                <span>{isBg ? 'Рецепти' : 'Recipes'}</span>
              </NavLink>

              <NavLink 
                to="/pantry" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">kitchen</span>
                <span>{isBg ? 'Килер' : 'Pantry'}</span>
              </NavLink>

              <NavLink 
                to="/scanner" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                <span>{isBg ? 'Скенер за продукти' : 'Food Scanner'}</span>
              </NavLink>

              <NavLink 
                to="/saved" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">bookmark</span>
                <span>{isBg ? 'Запазени рецепти' : 'Saved Recipes'}</span>
              </NavLink>

              <NavLink 
                to={isGuest ? "/login" : "/profile"} 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{isGuest ? 'login' : 'person'}</span>
                <span>{isGuest ? (isBg ? 'Вход / Регистрация' : 'Login / Register') : (isBg ? 'Моят Профил' : 'My Profile')}</span>
              </NavLink>

              {/* Add Recipe Button - Available ONLY for Registered Users! */}
              {!isGuest && (
                <div className="pt-3 mt-3 border-t border-primary/10">
                  <NavLink 
                    to="/admin/recipes" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-background-dark text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl font-bold">add_circle</span>
                    <span>{isBg ? 'Добави рецепта' : 'Add Recipe'}</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-primary/10 bg-background-dark/50 flex justify-between items-center text-[10px] text-slate-400">
              <span>© 2026 Eatery</span>
              <button 
                onClick={toggleLanguage}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                {isBg ? 'English' : 'Български'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;

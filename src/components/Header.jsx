import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../lib/localeUtils';

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  const currentLang = i18n.language || 'bg';
  const currentLangMeta = LANGUAGE_LABELS[currentLang] || LANGUAGE_LABELS.bg;

  const selectLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsLangMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl p-4 justify-between border-b border-primary/20 shadow-sm">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full cursor-pointer transition-colors"
          title={t('nav.open_menu')}
          aria-label={t('nav.open_menu')}
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

        {/* Multi-language Selector */}
        <div className="relative flex items-center justify-end" ref={langMenuRef}>
          <button 
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/30 hover:scale-105 active:scale-95 transition-all shadow-inner cursor-pointer"
            title={t('nav.switch_language')}
            aria-label={t('nav.switch_language')}
            aria-expanded={isLangMenuOpen}
          >
            <span className="text-xs font-black uppercase tracking-wider">{currentLangMeta.name}</span>
            {currentLangMeta.flagUrl && (
              <img 
                src={currentLangMeta.flagUrl} 
                alt="" 
                className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
              />
            )}
            <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: isLangMenuOpen ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </button>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <div className="absolute right-0 top-12 z-[60] w-32 bg-surface-dark border border-primary/30 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
              {SUPPORTED_LANGUAGES.map((langKey) => {
                const meta = LANGUAGE_LABELS[langKey] || { name: langKey.toUpperCase() };
                const isSelected = currentLang === langKey;
                return (
                  <button
                    key={langKey}
                    type="button"
                    onClick={() => selectLanguage(langKey)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      isSelected 
                        ? 'bg-primary/20 text-primary border border-primary/40' 
                        : 'text-slate-200 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-extrabold tracking-wider">{meta.name}</span>
                      {meta.flagUrl && (
                        <img 
                          src={meta.flagUrl} 
                          alt="" 
                          className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                        />
                      )}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-sm font-bold text-primary">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[70] max-w-md mx-auto flex overflow-hidden">
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
                aria-label={t('common.buttons.close')}
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
                  {isGuest ? t('nav.guest_user') : (user?.profile?.nickname || user?.displayName || user?.email)}
                </span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {isGuest ? t('nav.not_logged_in') : (user?.role || 'User')}
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
                <span>{t('nav.recipes')}</span>
              </NavLink>

              <NavLink 
                to="/pantry" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">kitchen</span>
                <span>{t('nav.pantry')}</span>
              </NavLink>

              <NavLink 
                to="/scanner" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
                <span>{t('nav.scanner')}</span>
              </NavLink>

              <NavLink 
                to="/saved" 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">bookmark</span>
                <span>{t('nav.saved')}</span>
              </NavLink>

              <NavLink 
                to={isGuest ? "/login" : "/profile"} 
                onClick={closeMenu}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-200 hover:bg-primary/10'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{isGuest ? 'login' : 'person'}</span>
                <span>{isGuest ? t('nav.login_register') : t('nav.my_profile')}</span>
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
                    <span>{t('nav.add_recipe')}</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Drawer Footer with Language Buttons */}
            <div className="p-4 border-t border-primary/10 bg-background-dark/50 flex flex-col gap-2 text-[10px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>© 2026 Eatery</span>
                <span className="text-primary font-bold flex items-center gap-1.5">
                  <span>{currentLangMeta.name}</span>
                  {currentLangMeta.flagUrl && (
                    <img 
                      src={currentLangMeta.flagUrl} 
                      alt="" 
                      className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                    />
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                {SUPPORTED_LANGUAGES.map((code) => {
                  const meta = LANGUAGE_LABELS[code] || { name: code.toUpperCase() };
                  const isSelected = currentLang === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => selectLanguage(code)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[10px] font-extrabold transition-colors ${
                        isSelected 
                          ? 'bg-primary text-background-dark shadow-sm' 
                          : 'bg-surface-dark/80 text-slate-300 hover:text-primary hover:bg-primary/10'
                      }`}
                      title={meta.fullName || meta.name}
                    >
                      <span>{meta.name}</span>
                      {meta.flagUrl && (
                        <img 
                          src={meta.flagUrl} 
                          alt="" 
                          className="h-[9px] w-[12px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../lib/localeUtils';
import NotificationCenter from './NotificationCenter';

const CYRILLIC_TO_LATIN_INITIAL = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ж: 'Z', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P',
  Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'C',
  Ш: 'S', Щ: 'S', Ъ: 'A', Ь: 'Y', Ю: 'Y', Я: 'Y'
};

function getLatinInitial(name = '', email = '') {
  const candidates = `${name || ''} ${email || ''}`.trim();
  for (const ch of candidates) {
    const upper = ch.toUpperCase();
    if (/^[A-Z]$/.test(upper)) return upper;
    if (CYRILLIC_TO_LATIN_INITIAL[upper]) return CYRILLIC_TO_LATIN_INITIAL[upper];
  }
  return 'G';
}

const DesktopHeader = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  const currentLang = i18n.language || 'bg';
  const currentLangMeta = LANGUAGE_LABELS[currentLang] || LANGUAGE_LABELS.bg;

  const userAvatar = !isGuest ? (user?.profile?.avatar || user?.photoURL || user?.avatar || '') : '';
  const userName = !isGuest ? (user?.profile?.nickname || user?.name || user?.displayName || user?.email?.split('@')[0] || 'User') : '';
  const userInitial = isGuest
    ? 'G'
    : getLatinInitial(userName, user?.email);
  const userRole = user?.role || 'USER';

  const selectLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsLangMenuOpen(false);
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangMenuOpen]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Tier 2 Navigation Rows (2 rows to prevent horizontal scrollbar):
  // Row 1: Core Essentials
  const navRow1 = [
    { path: '/', label: t('nav.recipes', 'Рецепти'), icon: 'restaurant_menu', exact: true },
    { path: '/pantry', label: t('nav.pantry', 'Килер'), icon: 'kitchen' },
    { path: '/scanner', label: t('nav.scanner', 'Скенер за продукти'), icon: 'qr_code_scanner' },
    { path: '/saved', label: t('nav.saved', 'Запазени'), icon: 'bookmark' },
    { path: '/events', label: t('nav.events', 'Събития'), icon: 'event' },
    { path: '/community', label: t('nav.community', 'Общност'), icon: 'groups' }
  ];

  // Row 2: Menus & Intelligence
  const navRow2 = [
    { path: '/planner', label: t('desktop_nav.weekly_planner', 'Седмично меню'), icon: 'calendar_month' },
    { path: '/seasonal', label: t('desktop_nav.seasonal_menu', 'Сезонно меню'), icon: 'eco' },
    { path: '/cuisines', label: t('desktop_nav.cuisines', 'Световни кухни'), icon: 'public' },
    { path: '/ai-assistant', label: t('nav.ai', 'Chef AI'), icon: 'smart_toy' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-brand-charcoal/95 backdrop-blur-md shadow-md text-brand-cream">
      {/* ========================================================= */}
      {/* Tier 1: Main Bar (72px height)                            */}
      {/* ========================================================= */}
      <div className="h-[72px] border-b border-brand-border/60 px-4 lg:px-6 xl:px-10 flex items-center justify-between gap-4 max-w-[1440px] mx-auto">
        {/* Brand Logo & Identity */}
        <div 
          onClick={() => {
            navigate('/');
            scrollToTop();
          }}
          className="flex items-center gap-3.5 group cursor-pointer shrink-0 select-none"
        >
          <div className="w-[42px] h-[42px] rounded-xl overflow-hidden border border-brand-border group-hover:border-brand-amber transition-colors flex items-center justify-center bg-brand-surface shadow-md">
            <img 
              src="/favicon.png" 
              alt={t('app.full_name')} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold italic tracking-tight text-slate-100 group-hover:text-brand-amber transition-colors leading-none flex items-center gap-1.5">
              {t('app.full_name')}
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-brand-amber mt-1 leading-none">
              {t('app.header_subtitle')}
            </span>
          </div>
        </div>

        {/* Right Header Actions & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Discreet Google Play Button */}
          <a
            href="https://play.google.com/store/apps/details?id=app.bestideaeatery.twa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceMuted border border-brand-border hover:border-brand-amber text-xs font-semibold text-brand-cream hover:text-brand-amber transition-all shadow-sm group whitespace-nowrap shrink-0"
            title={t('desktop_nav.get_android_app', 'Вземи за Android в Google Play')}
          >
            <span>Google Play</span>
            <span className="material-symbols-outlined text-[13px] opacity-70 group-hover:opacity-100">open_in_new</span>
          </a>

          {/* Notifications Button */}
          <NotificationCenter />

          {/* Theme Toggle Pill */}
          <button 
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-amber hover:border-brand-amber/50 transition-colors cursor-pointer"
            title={isDark ? t('common.light_mode', 'Светла тема') : t('common.dark_mode', 'Тъмна тема')}
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined text-lg leading-none">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button 
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-xs font-semibold text-brand-cream hover:border-brand-amber/50 transition-colors cursor-pointer"
              title={t('nav.switch_language', 'Смени езика')}
              aria-expanded={isLangMenuOpen}
            >
              {currentLangMeta.flagUrl ? (
                <img 
                  src={currentLangMeta.flagUrl} 
                  alt="" 
                  className="h-[12px] w-[16px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                />
              ) : (
                <span className="text-sm">{currentLangMeta.flag || '🌐'}</span>
              )}
              <span className="font-bold tracking-wide">{currentLangMeta.name}</span>
              <span className="material-symbols-outlined text-sm text-brand-muted transition-transform duration-200" style={{ transform: isLangMenuOpen ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 top-12 z-[60] w-36 bg-brand-surface border border-brand-border rounded-xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                {SUPPORTED_LANGUAGES.map((langKey) => {
                  const meta = LANGUAGE_LABELS[langKey] || { name: langKey.toUpperCase() };
                  const isSelected = currentLang === langKey;
                  return (
                    <button
                      key={langKey}
                      type="button"
                      onClick={() => selectLanguage(langKey)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-brand-amber text-brand-charcoal' 
                          : 'text-brand-cream hover:bg-brand-amber/10 hover:text-brand-amber'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {meta.flagUrl ? (
                          <img 
                            src={meta.flagUrl} 
                            alt="" 
                            className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0" 
                          />
                        ) : (
                          <span>{meta.flag || ''}</span>
                        )}
                        <span className="font-bold tracking-wider">{meta.name}</span>
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-6 w-[1px] bg-brand-border/70 mx-0.5"></div>

          {/* User Profile Badge or Login Button */}
          {!isGuest ? (
            <div 
              onClick={() => {
                navigate('/profile');
                scrollToTop();
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-amber/60 transition-colors cursor-pointer group"
              title={t('nav.my_profile', 'Моят Профил')}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-brand-amber/80 shrink-0 bg-brand-charcoal flex items-center justify-center text-xs font-black text-brand-amber">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <span
                  style={{ display: userAvatar ? 'none' : 'flex' }}
                  className="w-full h-full items-center justify-center uppercase"
                >
                  {userInitial}
                </span>
              </div>
              <div className="flex flex-col text-left max-w-[130px]">
                <span className="text-xs font-bold text-slate-100 group-hover:text-brand-amber transition-colors leading-tight truncate">
                  {userName}
                </span>
                <span className="text-[9px] font-black uppercase text-brand-amber tracking-wider leading-none mt-0.5">
                  {userRole}
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl bg-brand-amber hover:bg-brand-amberHover text-brand-charcoal text-xs font-extrabold transition-all shadow-sm cursor-pointer"
            >
              {t('nav.login', 'Вход')}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* Tier 2: Two-Row Navigation Bar (Clean & No Scrollbar)    */}
      {/* ========================================================= */}
      <nav className="px-4 lg:px-6 xl:px-10 py-2 flex flex-col gap-1.5 max-w-[1440px] mx-auto text-xs">
        {/* Row 1: Core Essentials */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {navRow1.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path 
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={scrollToTop}
                className={`inline-flex items-center justify-center gap-1.5 w-[154px] xl:w-[172px] h-[34px] px-2 rounded-xl border font-bold transition-colors whitespace-nowrap shrink-0 text-[11px] xl:text-xs ${
                  isActive
                    ? 'bg-brand-amber border-brand-amber text-brand-charcoal shadow-sm'
                    : 'border-transparent text-brand-cream hover:text-brand-amber hover:bg-brand-surface hover:border-brand-border'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] xl:text-[17px] leading-none shrink-0">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Row 2: Menus & Intelligence */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-brand-border/40">
          {navRow2.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={scrollToTop}
                className={`inline-flex items-center justify-center gap-1.5 w-[154px] xl:w-[172px] h-[34px] px-2 rounded-xl border font-bold transition-colors whitespace-nowrap shrink-0 text-[11px] xl:text-xs ${
                  isActive
                    ? 'bg-brand-amber border-brand-amber text-brand-charcoal shadow-sm'
                    : 'border-transparent text-brand-cream hover:text-brand-amber hover:bg-brand-surface hover:border-brand-border'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] xl:text-[17px] leading-none shrink-0">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default DesktopHeader;

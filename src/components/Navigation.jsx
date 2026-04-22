import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { t } = useTranslation();
  const { isGuest } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-dark border-t border-primary/20 px-6 py-4 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 group transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-primary fill-[1]' : 'text-slate-500 group-hover:text-primary/70'}`}>home</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary/70'}`}>{t('nav.recipes')}</span>
            </>
          )}
        </NavLink>
        
        <NavLink to="/pantry" className={({ isActive }) => `flex flex-col items-center gap-1 group transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-primary fill-[1]' : 'text-slate-500 group-hover:text-primary/70'}`}>kitchen</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary/70'}`}>{t('nav.pantry')}</span>
            </>
          )}
        </NavLink>

        <div className="relative -top-8 px-2">
          <NavLink to="/scanner" className="flex items-center justify-center bg-gradient-to-br from-primary to-[#b8860b] size-14 rounded-2xl rotate-45 shadow-lg shadow-primary/30 border-2 border-surface-dark hover:scale-105 hover:shadow-primary/50 transition-all duration-300">
            <span className="material-symbols-outlined text-background-dark -rotate-45 text-3xl font-bold">qr_code_scanner</span>
          </NavLink>
        </div>

        <NavLink to="/saved" className={({ isActive }) => `flex flex-col items-center gap-1 group transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-primary fill-[1]' : 'text-slate-500 group-hover:text-primary/70'}`}>bookmark</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary/70'}`}>{t('nav.saved')}</span>
            </>
          )}
        </NavLink>

        <NavLink to={isGuest ? "/login" : "/profile"} className={({ isActive }) => `flex flex-col items-center gap-1 group transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-primary fill-[1]' : 'text-slate-500 group-hover:text-primary/70'}`}>
                {isGuest ? 'login' : 'person'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary/70'}`}>
                {isGuest ? t('nav.login') : t('nav.profile')}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};

export default Navigation;

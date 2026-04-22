import React from 'react';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bg' ? 'en' : 'bg';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl p-4 justify-between border-b border-primary/20 shadow-sm">
      <div className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full cursor-pointer transition-colors">
        <span className="material-symbols-outlined text-2xl">menu</span>
      </div>
      <div className="flex flex-col items-center flex-1">
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
          className="flex items-center justify-center rounded-full h-10 w-10 bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/30 hover:scale-105 active:scale-95 transition-all shadow-inner"
        >
          <span className="text-xs font-bold uppercase">{i18n.language === 'bg' ? 'en' : 'bg'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

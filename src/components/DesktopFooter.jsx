import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DesktopFooter = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-brand-border/70 bg-brand-surface/60 py-6 text-sm text-brand-muted mt-auto">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand Identity & Copyright */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-100 tracking-tight">{t('app.full_name')}</span>
          <span>© {currentYear} {t('desktop_footer.rights', 'Всички права запазени.')}</span>
        </div>

        {/* Center / Right: Essential Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-brand-muted">
          <Link 
            to="/privacy" 
            onClick={scrollToTop}
            className="hover:text-brand-amber transition-colors"
          >
            {t('desktop_footer.privacy', 'Политика за поверителност')}
          </Link>
          <span>•</span>
          <Link 
            to="/terms" 
            onClick={scrollToTop}
            className="hover:text-brand-amber transition-colors"
          >
            {t('desktop_footer.terms', 'Условия за ползване')}
          </Link>
          <span>•</span>
          <Link 
            to="/advertise" 
            onClick={scrollToTop}
            className="hover:text-brand-amber transition-colors"
          >
            {t('desktop_footer.advertise', 'Реклама & Контакти')}
          </Link>
          <span>•</span>
          <a
            href="https://play.google.com/store/apps/details?id=app.bestideaeatery.twa"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-amber transition-colors flex items-center gap-1 text-brand-amber/90 font-semibold"
          >
            <span>Google Play</span>
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default DesktopFooter;

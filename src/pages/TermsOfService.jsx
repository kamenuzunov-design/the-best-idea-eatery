import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TermsOfService = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-y-auto no-scrollbar pb-12">
      <header className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100">{t('terms.title')}</h1>
      </header>

      <div className="p-6 space-y-8 text-slate-300 leading-relaxed max-w-2xl mx-auto">
        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section1_title')}</h2>
          <p>{t('terms.section1_text')}</p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section2_title')}</h2>
          <p>{t('terms.section2_text')}</p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section3_title')}</h2>
          <p>{t('terms.section3_text')}</p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section4_title')}</h2>
          <p>{t('terms.section4_text')}</p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section5_title')}</h2>
          <p>{t('terms.section5_text')}</p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{t('terms.section6_title')}</h2>
          <p>{t('terms.section6_text')}</p>
        </section>

        <div className="pt-8 border-t border-primary/10 text-xs text-slate-500 italic">
          {t('terms.last_updated')}
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

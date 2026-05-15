import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

const GDPR_CONSENT_KEY = 'gdpr_consent_v1';

const GDPRConsent = () => {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const location = useLocation();
  const isBg = i18n.language === 'bg';
  
  const isLegalPage = location.pathname === '/terms' || location.pathname === '/privacy';

  useEffect(() => {
    const consent = localStorage.getItem(GDPR_CONSENT_KEY);
    // If no consent or it's 'declined' but from a previous session, show it
    // Wait, the requirement says "can remember this choice within the current session"
    const sessionDecline = sessionStorage.getItem(GDPR_CONSENT_KEY);
    
    if (!consent && !sessionDecline) {
      // Delay slightly for better UX
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem(GDPR_CONSENT_KEY, 'agreed');
    setShow(false);
  };

  const handleDisagree = () => {
    sessionStorage.setItem(GDPR_CONSENT_KEY, 'declined');
    setShow(false);
  };

  if (!show || isLegalPage) return null;

  // Function to parse the translation string with links
  const renderTextWithLinks = (text) => {
    const parts = text.split(/\[|\]/);
    return (
      <>
        {parts[0]}
        <Link to="/terms" className="text-primary hover:underline font-bold">
          {parts[1]}
        </Link>
        {parts[2]}
        <Link to="/privacy" className="text-primary hover:underline font-bold">
          {parts[3]}
        </Link>
        {parts[4]}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-surface-dark border border-primary/20 rounded-2xl shadow-2xl p-6 space-y-6 animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">verified_user</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {isBg ? 'Вашата поверителност' : 'Your Privacy'}
          </h2>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          {renderTextWithLinks(t('gdpr.consent_text'))}
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleAgree}
            className="w-full py-3 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            {t('gdpr.agree')}
          </button>
          <button 
            onClick={handleDisagree}
            className="w-full py-3 bg-surface-dark border border-primary/20 text-slate-400 font-bold rounded-xl hover:bg-primary/5 transition-all"
          >
            {t('gdpr.disagree')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GDPRConsent;
export { GDPR_CONSENT_KEY };

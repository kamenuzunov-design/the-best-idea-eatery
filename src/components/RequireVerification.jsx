import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * Wrapper component to protect specific actions/sections requiring verified email.
 * If the user is not verified, it shows a message instead of the children.
 */
const RequireVerification = ({ children, fallback }) => {
  const { user, isAdmin } = useAuth();
  const { i18n } = useTranslation();
  
  const isBg = i18n.language === 'bg';

  // Admins are assumed verified, or if the user is actually verified
  if (user.isVerified || isAdmin) {
    return <>{children}</>;
  }

  // Fallback UI
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-surface-dark/50 border border-rose-500/20 rounded-2xl text-center">
      <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-rose-500 text-3xl">mark_email_unread</span>
      </div>
      <h3 className="text-slate-100 font-bold mb-2">
        {isBg ? 'Изисква се верификация' : 'Verification Required'}
      </h3>
      <p className="text-slate-400 text-sm">
        {isBg 
          ? 'Моля, верифицирайте своя имейл адрес, за да отключите тази функционалност. Проверете пощата си за връзка за потвърждение.'
          : 'Please verify your email address to unlock this feature. Check your inbox for a confirmation link.'}
      </p>
    </div>
  );
};

export default RequireVerification;

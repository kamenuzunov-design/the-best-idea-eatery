import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * Wrapper component to protect specific actions/sections requiring verified email.
 * If the user is not verified, it shows a message instead of the children.
 */
const RequireVerification = ({ children, fallback }) => {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();

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
        {t('auth.protection.verification_required_title')}
      </h3>
      <p className="text-slate-400 text-sm">
        {t('auth.protection.verification_required_desc')}
      </p>
    </div>
  );
};

export default RequireVerification;

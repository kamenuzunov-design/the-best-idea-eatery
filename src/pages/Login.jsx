import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GDPR_CONSENT_KEY } from '../components/GDPRConsent';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../lib/localeUtils';

const Login = () => {
  const { login, register, loginAsGuest, loginWithGoogle, loginWithApple, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language || 'bg');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);

  // Forgot password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  // Check initial consent status
  useState(() => {
    const consent = localStorage.getItem(GDPR_CONSENT_KEY);
    if (consent === 'agreed') setGdprAccepted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!gdprAccepted) {
          setError(t('auth.errors.terms_required'));
          setLoading(false);
          return;
        }
        await register(email, password, name, preferredLanguage);
        // Persist consent if they registered
        localStorage.setItem(GDPR_CONSENT_KEY, 'agreed');
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      // Simplify Firebase error messages
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(t('auth.errors.invalid_credential'));
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('auth.errors.email_in_use'));
      } else {
        setError(err.message || t('auth.errors.general_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/');
  };

  const handleUnlockGDPR = () => {
    localStorage.setItem(GDPR_CONSENT_KEY, 'agreed');
    setGdprAccepted(true);
  };

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

  const handleSocialLogin = async (providerName) => {
    setError('');
    setLoading(true);
    try {
      if (providerName === 'google') {
        await loginWithGoogle();
      } else if (providerName === 'apple') {
        await loginWithApple();
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        // Ignored error
      } else {
        setError(t('auth.errors.social_login_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail || !resetEmail.trim()) {
      setResetError(t('auth.errors.invalid_email'));
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSuccess(t('auth.reset_modal.success_msg'));
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError(t('auth.errors.user_not_found'));
      } else if (err.code === 'auth/invalid-email') {
        setResetError(t('auth.errors.invalid_email'));
      } else if (err.code === 'auth/too-many-requests') {
        setResetError(t('auth.errors.too_many_requests'));
      } else {
        setResetError(err.message || t('auth.errors.general_error'));
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background-dark">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(212,175,53,0.2)]">
              <span className="material-symbols-outlined text-primary text-5xl">restaurant</span>
            </div>
          </div>
          <h1 className="text-primary text-2xl font-extrabold tracking-tight uppercase drop-shadow-md">
            {t('app.title')} <br/>
            <span className="text-sm font-medium normal-case opacity-80 italic tracking-normal">{t('app.subtitle')}</span>
          </h1>
          <h2 className="text-3xl font-bold mt-8 text-slate-100">
            {isLogin ? t('auth.headings.welcome_back') : t('auth.headings.create_account')}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label htmlFor="user-name" className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest cursor-pointer">
                  {t('auth.labels.name')}
                </label>
                <input 
                  id="user-name"
                  name="username"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner" 
                  placeholder={t('auth.placeholders.enter_name')} 
                  type="text"
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                  {t('auth.labels.preferred_language')}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {SUPPORTED_LANGUAGES.map((code) => {
                    const meta = LANGUAGE_LABELS[code] || { name: code.toUpperCase() };
                    const isSelected = preferredLanguage === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setPreferredLanguage(code);
                          i18n.changeLanguage(code);
                        }}
                        className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                            : 'bg-surface-dark/60 text-slate-300 border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <span>{meta.name}</span>
                        {meta.flagUrl && (
                          <img
                            src={meta.flagUrl}
                            alt=""
                            className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="user-email" className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest cursor-pointer">
                {t('auth.labels.email')}
              </label>
              <input 
                id="user-email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner" 
                placeholder={t('auth.placeholders.enter_email')} 
                type="email"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end px-1">
                <label htmlFor="user-password" className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer">
                  {t('auth.labels.password')}
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email || '');
                      setResetError('');
                      setResetSuccess('');
                      setShowResetModal(true);
                    }}
                    className="text-xs text-primary font-medium hover:underline focus:outline-none transition-colors"
                  >
                    {t('auth.buttons.forgot_password')}
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  id="user-password"
                  name="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 pr-12 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner" 
                  placeholder={t('auth.placeholders.password')} 
                  type={showPassword ? 'text' : 'password'}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors focus:outline-none"
                  title={showPassword ? t('auth.buttons.hide_password') : t('auth.buttons.show_password')}
                  aria-label={showPassword ? t('auth.buttons.hide_password') : t('auth.buttons.show_password')}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          {!isLogin && (
            <div className="space-y-4">
              {sessionStorage.getItem(GDPR_CONSENT_KEY) === 'declined' && !gdprAccepted && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 leading-relaxed font-medium">
                  {t('auth.gdpr_notice.declined_warning')}
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input 
                    type="checkbox" 
                    checked={gdprAccepted}
                    onChange={(e) => setGdprAccepted(e.target.checked)}
                    className="peer appearance-none size-5 border-2 border-primary/30 rounded-md checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                  />
                  <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background-dark text-base font-bold opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  {renderTextWithLinks(t('auth.labels.agree_terms'))}
                </span>
              </label>

              {!gdprAccepted && !isLogin && (
                <div className="text-[10px] text-primary font-bold uppercase tracking-widest text-center">
                   <button type="button" onClick={handleUnlockGDPR} className="hover:underline">
                    {t('auth.gdpr_notice.unlock_link')}
                   </button>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4">
            <button disabled={loading} type="submit" className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <span>{isLogin ? t('auth.buttons.login') : t('auth.buttons.register')}</span>
                  <span className="material-symbols-outlined font-bold">{isLogin ? 'login' : 'person_add'}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-400 hover:text-primary transition-colors">
              {isLogin ? t('auth.buttons.dont_have_account') : t('auth.buttons.already_have_account')}
            </button>
          </div>

          {isLogin && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-primary/10"></div>
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                  <span className="bg-background-dark px-4 text-primary/60">{t('auth.labels.or_login_with')}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleSocialLogin('google')} disabled={loading} className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm disabled:opacity-50 cursor-pointer" type="button">
                  <img alt="Google" className="w-5 h-5 mr-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaosnMYulSPMVgQeppOGOl12S3NxjqorMyhg-qIHaeD5XRJ3Vw8w0ppThIZYMft7rbEpQ7hvTCHarNe42fNBpxn8zdSXKLlnaGLKI4Wq5kYYGYoazq2KeTMNKZd3fzDJ4whJHSqf8-2KWHqmND1O-nw1EIoYQkAmNO0UEV-qXvImLs_VrqmOrN69GjtuI5UbY_-RIiwppm9I5rCrQg18v8Ug6JfItxZT1AGNhxWmRvj1roaYmTdRUZBpewaUyEPQvnOFwQe3427pU"/>
                  <span className="text-sm font-bold text-slate-200">Google</span>
                </button>
                <button onClick={() => handleSocialLogin('apple')} disabled={loading} className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm disabled:opacity-50 cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-xl mr-2 text-slate-200">apple</span>
                  <span className="text-sm font-bold text-slate-200">Apple</span>
                </button>
              </div>
            </>
          )}
          
          <div className="flex flex-col items-center gap-6 pt-6">
            <button onClick={handleGuestLogin} className="flex flex-col items-center gap-2 text-primary/60 hover:text-primary hover:scale-105 transition-all cursor-pointer" type="button">
              <span className="material-symbols-outlined text-4xl drop-shadow-md">account_circle</span>
              <span className="text-xs font-bold uppercase tracking-widest">{t('auth.buttons.continue_as_guest')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-dark border border-primary/30 rounded-2xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative space-y-5 animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-primary transition-colors p-1 rounded-lg focus:outline-none cursor-pointer"
              aria-label={t('common.buttons.close')}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {t('auth.reset_modal.title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('auth.reset_modal.subtitle')}
                </p>
              </div>
            </div>

            {resetSuccess ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium leading-relaxed flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0 mt-0.5">check_circle</span>
                  <span>{resetSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full h-12 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-xl shadow-md hover:scale-[1.01] transition-all cursor-pointer"
                >
                  {t('common.buttons.done')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
                {resetError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-sm text-center font-medium">
                    {resetError}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label htmlFor="reset-email" className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest cursor-pointer">
                    {t('auth.reset_modal.email_label')}
                  </label>
                  <input
                    id="reset-email"
                    name="reset-email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner"
                    placeholder={t('auth.placeholders.enter_email')}
                    type="email"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 h-12 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('common.buttons.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {resetLoading ? (
                      <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                    ) : (
                      <>
                        <span>{t('auth.buttons.send_reset_link')}</span>
                        <span className="material-symbols-outlined text-sm font-bold">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

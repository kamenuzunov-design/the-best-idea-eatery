import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { login, register, loginAsGuest, loginWithGoogle, loginWithApple } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err) {
      console.error(err);
      // Simplify Firebase error messages
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(isBg ? 'Грешен имейл или парола.' : 'Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(isBg ? 'Този имейл вече се използва.' : 'This email is already in use.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/');
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
        setError(isBg ? 'Възникна грешка при вписване.' : 'Error signing in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isBg = i18n.language === 'bg';

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
            The Best Idea Eatery <br/>
            <span className="text-sm font-medium normal-case opacity-80 italic tracking-normal">Най-добрата идея за хранене</span>
          </h1>
          <h2 className="text-3xl font-bold mt-8 text-slate-100">
            {isBg ? (isLogin ? 'Добре дошли отново' : 'Създайте профил') : (isLogin ? 'Welcome Back' : 'Create Account')}
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
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Име' : 'Name'}
                </label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner" 
                  placeholder={isBg ? 'Въведете вашето име' : 'Enter your name'} 
                  type="text"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                {isBg ? 'Имейл' : 'Email'}
              </label>
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner" 
                placeholder={isBg ? 'Въведете вашия имейл' : 'Enter your email'} 
                type="email"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Парола' : 'Password'}
                </label>
                {isLogin && (
                  <a className="text-xs text-primary font-medium hover:underline" href="#">
                    {isBg ? 'Забравена парола?' : 'Forgot Password?'}
                  </a>
                )}
              </div>
              <div className="relative">
                <input 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 pr-12 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner" 
                  placeholder="••••••••" 
                  type="password"
                  required
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors" type="button">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button disabled={loading} type="submit" className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <span>{isBg ? (isLogin ? 'Вход' : 'Регистрация') : (isLogin ? 'Login' : 'Register')}</span>
                  <span className="material-symbols-outlined font-bold">{isLogin ? 'login' : 'person_add'}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-400 hover:text-primary transition-colors">
              {isLogin 
                ? (isBg ? 'Нямате профил? Регистрирайте се' : "Don't have an account? Register") 
                : (isBg ? 'Вече имате профил? Влезте' : "Already have an account? Login")}
            </button>
          </div>

          {isLogin && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-primary/10"></div>
                </div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                  <span className="bg-background-dark px-4 text-primary/60">{isBg ? 'Или влезте чрез' : 'Or login with'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleSocialLogin('google')} disabled={loading} className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm disabled:opacity-50" type="button">
                  <img alt="Google" className="w-5 h-5 mr-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaosnMYulSPMVgQeppOGOl12S3NxjqorMyhg-qIHaeD5XRJ3Vw8w0ppThIZYMft7rbEpQ7hvTCHarNe42fNBpxn8zdSXKLlnaGLKI4Wq5kYYGYoazq2KeTMNKZd3fzDJ4whJHSqf8-2KWHqmND1O-nw1EIoYQkAmNO0UEV-qXvImLs_VrqmOrN69GjtuI5UbY_-RIiwppm9I5rCrQg18v8Ug6JfItxZT1AGNhxWmRvj1roaYmTdRUZBpewaUyEPQvnOFwQe3427pU"/>
                  <span className="text-sm font-bold text-slate-200">Google</span>
                </button>
                <button onClick={() => handleSocialLogin('apple')} disabled={loading} className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm disabled:opacity-50" type="button">
                  <span className="material-symbols-outlined text-xl mr-2 text-slate-200">apple</span>
                  <span className="text-sm font-bold text-slate-200">Apple</span>
                </button>
              </div>
            </>
          )}
          
          <div className="flex flex-col items-center gap-6 pt-6">
            <button onClick={handleGuestLogin} className="flex flex-col items-center gap-2 text-primary/60 hover:text-primary hover:scale-105 transition-all" type="button">
              <span className="material-symbols-outlined text-4xl drop-shadow-md">account_circle</span>
              <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Продължи като гост' : 'Continue as Guest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

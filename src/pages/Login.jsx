import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    login(email, password);
    navigate('/');
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate('/');
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
            {isBg ? 'Добре дошли отново' : 'Welcome Back'}
          </h2>
        </div>
        
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                {isBg ? 'Имейл' : 'Email'}
              </label>
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600 text-slate-100 shadow-inner" 
                placeholder={isBg ? 'Въведете вашия имейл' : 'Enter your email'} 
                type="text"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Парола' : 'Password'}
                </label>
                <a className="text-xs text-primary font-medium hover:underline" href="#">
                  {isBg ? 'Забравена парола?' : 'Forgot Password?'}
                </a>
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
            <button type="submit" className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>{isBg ? 'Вход' : 'Login'}</span>
              <span className="material-symbols-outlined font-bold">login</span>
            </button>
          </div>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/10"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
              <span className="bg-background-dark px-4 text-primary/60">{isBg ? 'Или влезте чрез' : 'Or login with'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm" type="button">
              <img alt="Google" className="w-5 h-5 mr-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaosnMYulSPMVgQeppOGOl12S3NxjqorMyhg-qIHaeD5XRJ3Vw8w0ppThIZYMft7rbEpQ7hvTCHarNe42fNBpxn8zdSXKLlnaGLKI4Wq5kYYGYoazq2KeTMNKZd3fzDJ4whJHSqf8-2KWHqmND1O-nw1EIoYQkAmNO0UEV-qXvImLs_VrqmOrN69GjtuI5UbY_-RIiwppm9I5rCrQg18v8Ug6JfItxZT1AGNhxWmRvj1roaYmTdRUZBpewaUyEPQvnOFwQe3427pU"/>
              <span className="text-sm font-bold text-slate-200">Google</span>
            </button>
            <button className="flex items-center justify-center h-12 border border-primary/20 rounded-xl bg-surface-dark hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm" type="button">
              <span className="material-symbols-outlined text-xl mr-2 text-slate-200">apple</span>
              <span className="text-sm font-bold text-slate-200">Apple</span>
            </button>
          </div>
          
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

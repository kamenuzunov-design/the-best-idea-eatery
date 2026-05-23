import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  
  console.log("ProtectedRoute check:", { 
    path: window.location.pathname, 
    userRole: user?.role, 
    loading,
    allowedRoles 
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-dark h-screen">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
      </div>
    );
  }

  if (!user || !user.role) {
    console.error("No user or role found in ProtectedRoute!");
    return <Navigate to="/login" replace />;
  }

  // If route has specific allowed roles and user's role is not in them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`Access denied for role: ${user.role}. Allowed:`, allowedRoles);
    
    // Humanized access denied for GUESTS
    if (user.role === ROLES.GUEST) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-background-dark h-full min-h-[70vh] text-center p-6">
          <div className="bg-primary/10 p-6 rounded-full mb-6 border border-primary/20 shadow-lg shadow-primary/5">
            <span className="material-symbols-outlined text-primary text-6xl">lock</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 mb-4 tracking-tight">
            {isBg ? 'Функцията изисква регистрация' : 'Registration Required'}
          </h2>
          <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
            {isBg 
              ? 'Тази част от приложението е достъпна само за регистрирани потребители. Влезте в профила си или се регистрирайте напълно безплатно, за да отключите пълния потенциал!' 
              : 'This area is available only to registered users. Log in or create a free account to unlock the full potential of the app!'}
          </p>
          <button 
            onClick={() => navigate('/login')} 
            className="bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(212,175,53,0.3)] hover:shadow-[0_0_25px_rgba(212,175,53,0.5)] hover:-translate-y-1 transition-all"
          >
            {isBg ? 'Вход / Регистрация' : 'Login / Sign Up'}
          </button>
        </div>
      );
    }

    // Standard technical access denied for internal roles
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background-dark h-full min-h-[70vh] text-center p-6">
        <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">gpp_maybe</span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm mb-6">You don't have permission to view this page. Role: {user.role}</p>
        <button onClick={() => navigate('/admin')} className="bg-primary text-background-dark font-bold py-2 px-6 rounded-full">
          Back to Admin
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

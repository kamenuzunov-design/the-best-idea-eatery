import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background-dark h-screen text-center p-6">
        <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">gpp_maybe</span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm mb-6">You don't have permission to view this page. Role: {user.role}</p>
        <button onClick={() => window.location.href = '/admin'} className="bg-primary text-background-dark font-bold py-2 px-6 rounded-full">
          Back to Admin
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

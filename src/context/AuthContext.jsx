import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

// Roles:
// 0: Admin (Can do everything: add recipes, products, units)
// 1: Registered User (Can use pantry, rate, upload own recipes)
// 2: Guest (Can view recipes, make shopping list based on recipes)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    // Mock login logic
    if (email === 'admin@eatery.com') {
      setUser({ email, role: 0, name: 'Admin Kamen' });
    } else if (email === 'guest') {
      setUser({ role: 2, name: 'Guest' });
    } else {
      setUser({ email, role: 1, name: 'User' });
    }
  };

  const loginAsGuest = () => {
    setUser({ role: 2, name: 'Guest' });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginAsGuest,
      logout,
      isAdmin: user?.role === 0,
      isUser: user?.role === 1,
      isGuest: user?.role === 2,
      isAuthenticated: user !== null
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

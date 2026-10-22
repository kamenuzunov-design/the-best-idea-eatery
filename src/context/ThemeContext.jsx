/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { ROLES } from '../constants/roles';

const ThemeContext = createContext();

const STORAGE_KEY = 'app_theme';

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();

  const [localTheme, setLocalTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const userProfileTheme =
    user?.preferences?.theme === 'light' || user?.preferences?.theme === 'dark'
      ? user.preferences.theme
      : null;

  // Effective theme: explicit local selection -> user profile preference -> default 'dark'
  const theme = localTheme || userProfileTheme || 'dark';

  // Apply theme class to <html> element and persist in localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = async (nextTheme) => {
    const normalized = nextTheme === 'light' ? 'light' : 'dark';
    setLocalTheme(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore
    }

    if (user?.uid && user?.role !== ROLES.GUEST) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.theme': normalized
        });
      } catch (err) {
        console.warn('Could not persist theme preference to Firestore:', err.message);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        setTheme,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      isDark: true,
      isLight: false,
      setTheme: () => {},
      toggleTheme: () => {}
    };
  }
  return ctx;
};

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
  const currentUid = user?.uid && user?.role !== ROLES.GUEST ? user.uid : null;
  const userProfileTheme =
    user?.preferences?.theme === 'light' || user?.preferences?.theme === 'dark'
      ? user.preferences.theme
      : null;

  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'dark';
  });

  // Track previous user UID and Firestore profile theme to adjust state during render
  // (Official React pattern: adjusting state when props change without effect setState cascades)
  const [prevUid, setPrevUid] = useState(currentUid);
  const [prevProfileTheme, setPrevProfileTheme] = useState(userProfileTheme);

  if (prevUid !== currentUid) {
    setPrevUid(currentUid);
    setPrevProfileTheme(userProfileTheme);
    const targetTheme = userProfileTheme || 'dark';
    setThemeState(targetTheme);
    try {
      localStorage.setItem(STORAGE_KEY, targetTheme);
    } catch {
      // ignore
    }
  } else if (prevProfileTheme !== userProfileTheme) {
    setPrevProfileTheme(userProfileTheme);
    if (userProfileTheme) {
      setThemeState(userProfileTheme);
      try {
        localStorage.setItem(STORAGE_KEY, userProfileTheme);
      } catch {
        // ignore
      }
    }
  }

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const setTheme = async (nextTheme) => {
    const normalized = nextTheme === 'light' ? 'light' : 'dark';
    setThemeState(normalized);
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

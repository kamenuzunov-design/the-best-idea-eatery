import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bg from './locales/bg.json';
import en from './locales/en.json';
import it from './locales/it.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

export const SUPPORTED_LANGS = ['en', 'it', 'fr', 'de', 'bg'];

export const getBrowserLanguage = () => {
  if (typeof window === 'undefined' || !navigator) return 'en';
  const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const code = candidate.toLowerCase().split('-')[0].split('_')[0];
    if (SUPPORTED_LANGS.includes(code)) {
      return code;
    }
  }
  return 'en';
};

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('user_language') : null;
const initialLang = savedLang && SUPPORTED_LANGS.includes(savedLang) ? savedLang : getBrowserLanguage();

const resources = {
  bg: { translation: bg },
  en: { translation: en },
  it: { translation: it },
  fr: { translation: fr },
  de: { translation: de }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    interpolation: {
      escapeValue: false
    }
  });

// Persist language preference automatically
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined' && lng) {
    localStorage.setItem('user_language', lng);
  }
});

export default i18n;

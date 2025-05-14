
'use client';

import type { ReactNode} from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import enTranslations from '@/locales/en.json';
import viTranslations from '@/locales/vi.json';

type Locale = 'en' | 'vi';

interface Translations {
  [key: string]: string | Translations;
}

interface LanguageContextType {
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: (key: string, replacements?: {[key: string]: string | number}) => string;
  translations: Translations;
}

const translationsData: Record<Locale, Translations> = {
  en: enTranslations,
  vi: viTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Locale>('en'); // Default to English

  useEffect(() => {
    const storedLanguage = localStorage.getItem('appLanguage') as Locale | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'vi')) {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (lang: Locale) => {
    if (translationsData[lang]) {
      setLanguageState(lang);
      localStorage.setItem('appLanguage', lang);
    } else {
      console.warn(`Language ${lang} not supported or translations missing.`);
    }
  };

  const t = useCallback((key: string, replacements?: {[key: string]: string | number}): string => {
    const keys = key.split('.');
    let result: string | Translations | undefined = translationsData[language];
    for (const k of keys) {
      if (typeof result === 'object' && result !== null && k in result) {
        result = (result as Translations)[k];
      } else {
        result = undefined; // Key not found
        break;
      }
    }

    if (typeof result === 'string') {
      if (replacements) {
        return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
          return acc.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
        }, result);
      }
      return result;
    }
    // Fallback for missing keys
    console.warn(`Translation key "${key}" not found for language "${language}".`);
    return key; 
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations: translationsData[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

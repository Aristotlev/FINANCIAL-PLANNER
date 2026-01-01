"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Supported languages matching our currency regions
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  currencyCode: string; // Maps to the associated currency
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', currencyCode: 'USD' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', currencyCode: 'EUR' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', currencyCode: 'EUR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', currencyCode: 'EUR' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', currencyCode: 'EUR' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', currencyCode: 'BRL' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', currencyCode: 'JPY' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', currencyCode: 'CNY' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', currencyCode: 'KRW' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', currencyCode: 'SAR' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', currencyCode: 'INR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', currencyCode: 'RUB' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', currencyCode: 'TRY' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', currencyCode: 'EUR' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', currencyCode: 'PLN' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', currencyCode: 'SEK' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', currencyCode: 'THB' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', currencyCode: 'IDR' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', currencyCode: 'USD' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', currencyCode: 'ILS' },
];

// Dynamic translation keys - any string key is valid
// This allows adding new translations without updating TypeScript types
export type TranslationKeys = Record<string, string>;

// Import translations
import { enTranslations } from '@/locales/en';
import { esTranslations } from '@/locales/es';
import { frTranslations } from '@/locales/fr';
import { deTranslations } from '@/locales/de';
import { jaTranslations } from '@/locales/ja';
import { zhTranslations } from '@/locales/zh';
import { koTranslations } from '@/locales/ko';
import { ptTranslations } from '@/locales/pt';
import { arTranslations } from '@/locales/ar';
import { hiTranslations } from '@/locales/hi';
import { ruTranslations } from '@/locales/ru';
import { trTranslations } from '@/locales/tr';
import { itTranslations } from '@/locales/it';
import { nlTranslations } from '@/locales/nl';
import { plTranslations } from '@/locales/pl';
import { svTranslations } from '@/locales/sv';
import { thTranslations } from '@/locales/th';
import { idTranslations } from '@/locales/id';
import { viTranslations } from '@/locales/vi';
import { heTranslations } from '@/locales/he';

const translations: Record<string, TranslationKeys> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
  ko: koTranslations,
  pt: ptTranslations,
  ar: arTranslations,
  hi: hiTranslations,
  ru: ruTranslations,
  tr: trTranslations,
  it: itTranslations,
  nl: nlTranslations,
  pl: plTranslations,
  sv: svTranslations,
  th: thTranslations,
  id: idTranslations,
  vi: viTranslations,
  he: heTranslations,
};

interface TranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const STORAGE_KEY = 'moneyHub_language';

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(SUPPORTED_LANGUAGES[0]); // Default to English

  // Load saved language preference
  useEffect(() => {
    const savedLanguageCode = localStorage.getItem(STORAGE_KEY);
    if (savedLanguageCode) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === savedLanguageCode);
      if (lang) {
        setLanguageState(lang);
      }
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0];
      const detectedLang = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
      if (detectedLang) {
        setLanguageState(detectedLang);
      }
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang.code);
    
    // Update document direction for RTL languages
    document.documentElement.dir = ['ar', 'he'].includes(lang.code) ? 'rtl' : 'ltr';
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language.code] || translations.en;
    // Dynamic fallback: current language -> English -> key itself (formatted nicely)
    let text = langTranslations[key] || translations.en[key];
    
    // If no translation found, format the key as a readable string
    // e.g., 'nav.signIn' -> 'Sign In', 'dashboard.netWorth' -> 'Net Worth'
    if (!text) {
      const lastPart = key.split('.').pop() || key;
      text = lastPart
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
    }
    
    // Replace parameters like {name} or {count}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [language.code]);

  const isRTL = ['ar', 'he'].includes(language.code);

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

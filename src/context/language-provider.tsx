"use client";

import React, { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import en from "@/locales/en.json";
import ur from "@/locales/ur.json";

type Language = "en" | "ur";
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: keyof Translations, params?: Record<string, string>) => string;
  dir: 'ltr' | 'rtl';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = { en, ur };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedLang = localStorage.getItem("dukaanxp-lang") as Language;
    if (storedLang && ["en", "ur"].includes(storedLang)) {
      setLanguage(storedLang);
    }
  }, []);

  const dir = language === "ur" ? "rtl" : "ltr";

  useEffect(() => {
    if (isMounted) {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
    }
  }, [language, dir, isMounted]);

  const t = useCallback((key: keyof Translations, params: Record<string, string> = {}): string => {
    let translation = translations[language][key] || translations.en[key] || key;
    Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, params[paramKey]);
    });
    return translation;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prevLang) => {
      const newLang = prevLang === "en" ? "ur" : "en";
      if (isMounted) {
        localStorage.setItem("dukaanxp-lang", newLang);
      }
      return newLang;
    });
  }, [isMounted]);

  const value = { language, toggleLanguage, t, dir };

  if (!isMounted) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

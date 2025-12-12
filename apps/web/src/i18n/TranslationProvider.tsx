"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { LANGUAGES, translations, defaultLanguage, type LanguageCode } from "@/i18n/translations";

interface TranslationContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(
  undefined
);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(defaultLanguage);

  const value = useMemo<TranslationContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, params?: Record<string, string | number>) => {
        const dict = translations[lang] ?? translations[defaultLanguage];
        let translation = dict[key] ?? translations[defaultLanguage][key] ?? key;
        
        // Replace placeholders with actual values if params are provided
        if (params) {
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
          });
        }
        
        return translation;
      },
    }),
    [lang]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return ctx;
}

export { LANGUAGES };

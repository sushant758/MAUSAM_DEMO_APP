// ─── A7: Language context ─────────────────────────────────────────────────────
// Provides { lang, setLang, t, tp } to the entire component tree.
//
//   lang      'en' | 'hi'
//   setLang   (lang) => void  — persists to localStorage
//   t         (key, fallback?) => string — translates a key
//   tp        (key, vars, fallback?) => string — translates then fills {placeholders}
//
// Wraps the app at the root level (<LanguageProvider> in App.jsx).
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback } from 'react';
import { STRINGS } from './strings';

const LS_LANG = 'mausam.lang';

function readLang() {
  try { return localStorage.getItem(LS_LANG) || 'en'; } catch { return 'en'; }
}

const LanguageContext = createContext({
  lang:    'en',
  setLang: () => {},
  t:       (key, fb) => fb ?? key,
  tp:      (key, _vars, fb) => fb ?? key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(LS_LANG, l); } catch {}
  }, []);

  // t(key, fallback?) → translated string, falls back to EN, then key itself
  const t = useCallback(
    (key, fallback) => STRINGS[lang]?.[key] ?? STRINGS.en?.[key] ?? fallback ?? key,
    [lang],
  );

  // tp(key, vars, fallback?) → translate then substitute {placeholder} vars
  const tp = useCallback(
    (key, vars = {}, fallback) => {
      const raw = STRINGS[lang]?.[key] ?? STRINGS.en?.[key] ?? fallback ?? key;
      return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tp }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Use this hook in any component that needs translated strings. */
export function useLanguage() {
  return useContext(LanguageContext);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { messages, interpolate, type Locale, type Messages } from "./messages";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  messages: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "tax-optimizer-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read saved locale once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "zh") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const segments = path.split(".");
      let cur: unknown = messages[locale];
      for (const seg of segments) {
        if (cur && typeof cur === "object" && seg in (cur as object)) {
          cur = (cur as Record<string, unknown>)[seg];
        } else {
          return path;
        }
      }
      if (typeof cur !== "string") return path;
      return interpolate(cur, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      messages: messages[locale],
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import { getCanonicalPath, buildLocalizedHref } from "./navigation";
import type { Dictionary } from "./language";

/* -------------------------------------------------------------------------- */
/*  Language context — reactive lang + dict                                      */
/* -------------------------------------------------------------------------- */

interface LanguageContextValue {
  /** Current active locale code */
  lang: string;
  /** Full dictionary object for backward-compatible `dict.section.key` access */
  dict: Dictionary;
  /**
   * Switch language instantly — no full page reload.
   * Updates dict, URL, cookie and localStorage in one call.
   */
  changeLanguage: (newLang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Helper: lazy dictionary loading                                              */
/* -------------------------------------------------------------------------- */

// Explicit map (instead of a template-string import) so the bundler emits one
// async chunk per locale. Neither dictionary lands in the initial client
// bundle — the active language's dict arrives from the server as a prop, and
// the other locale is only downloaded if the user actually switches language.
const enLoader = () =>
  import("./dictionaries/en.json").then(
    (m) => m.default as unknown as Dictionary
  );
const dictionaryLoaders: Record<string, () => Promise<Dictionary>> = {
  en: enLoader,
  tr: () =>
    import("./dictionaries/tr.json").then(
      (m) => m.default as unknown as Dictionary
    ),
};

const dictionaryCache = new Map<string, Dictionary>();

/**
 * tr-belirtilen dil koduna ait sözlüğü (JSON) yükler ve bellekte (cache) tutar
 * en-loads the dictionary (JSON) for the specified language code and caches it in memory
 * input (lang: string)
 * output (Promise<Dictionary>)
 */
async function loadDictionary(lang: string): Promise<Dictionary> {
  const cached = dictionaryCache.get(lang);
  if (cached) return cached;
  const loader = dictionaryLoaders[lang] ?? enLoader;
  const dict = await loader();
  dictionaryCache.set(lang, dict);
  return dict;
}

/* -------------------------------------------------------------------------- */
/*  Helper: persist language preference                                         */
/* -------------------------------------------------------------------------- */

/**
 * tr-kullanıcının dil tercihini çerez (cookie) ve yerel depolama (localStorage) üzerine kaydeder
 * en-persists the user's language preference to a cookie and localStorage
 * input (lang: string)
 * output (void)
 */
function persistLanguage(lang: string) {
  // Cookie — needed by middleware (proxy.ts) for locale detection
  document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;

  // localStorage — instant client-side reads + persistence
  try {
    localStorage.setItem("logitrack-language", lang);
  } catch {
    // localStorage unavailable (SSR, private browsing edge-case)
  }
}

/* -------------------------------------------------------------------------- */
/*  Helper: update URL without triggering full Next.js navigation                */
/* -------------------------------------------------------------------------- */

/**
 * tr-sayfayı tamamen yeniden yüklemeden (history.replaceState) URL'i yeni dile uygun şekilde günceller
 * en-updates the URL for the new language using history.replaceState without triggering a full page reload
 * input (currentPathname: string, oldLang: string, newLang: string)
 * output (void)
 */
function updateUrlForLanguage(
  currentPathname: string,
  oldLang: string,
  newLang: string
) {
  const segments = currentPathname.split("/");
  const pathWithoutLang = "/" + segments.slice(2).join("/");

  // Convert current localized path → canonical → new localized path
  const canonical = getCanonicalPath(pathWithoutLang, oldLang);
  const newPathname = buildLocalizedHref(canonical, newLang);

  // Use replaceState to update URL cosmetically — NO server round-trip
  window.history.replaceState(
    { ...window.history.state, as: newPathname, url: newPathname },
    "",
    newPathname
  );
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * tr-dil (lang), sözlük (dict) ve dil değiştirme (changeLanguage) işlevlerini sağlayan React Provider bileşeni
 * en-React Provider component that supplies reactive lang, dict, and changeLanguage capabilities
 * input ({ dict: Dictionary, lang: string, children: React.ReactNode })
 * output (JSX.Element)
 */
export function DictionaryProvider({
  dict: serverDict,
  lang: serverLang,
  children,
}: {
  dict: Dictionary;
  lang: string;
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState(serverLang);
  const [dict, setDict] = useState(serverDict);

  // Seed the cache with the server-provided dictionary so switching back to
  // the original language never refetches.
  dictionaryCache.set(serverLang, serverDict);

  const changeLanguage = useCallback(
    (newLang: string) => {
      if (newLang === lang) return;

      void loadDictionary(newLang).then((newDict) => {
        // 1. Update dictionary context for useDictionary() consumers
        setDict(newDict);

        // 2. Update lang state
        setLang(newLang);

        // 3. Update URL without triggering full navigation
        const currentPathname = window.location.pathname;
        updateUrlForLanguage(currentPathname, lang, newLang);

        // 4. Persist preference (cookie + localStorage)
        persistLanguage(newLang);
      });
    },
    [lang]
  );

  const contextValue = useMemo<LanguageContextValue>(
    () => ({ lang, dict, changeLanguage }),
    [lang, dict, changeLanguage]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * tr-tam dil bağlamını ({ lang, dict, changeLanguage }) döndürür
 * en-returns the full LanguageContextValue ({ lang, dict, changeLanguage })
 * input ()
 * output (LanguageContextValue)
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within a DictionaryProvider");
  return ctx;
}

/**
 * tr-eski uyumluluk için sadece Dictionary nesnesini döndürür, doğrudan 'dict.section.key' erişimi sağlar
 * en-legacy hook that returns only the Dictionary object, providing direct 'dict.section.key' access
 * input ()
 * output (Dictionary)
 */
export function useDictionary(): Dictionary {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useDictionary must be used within a DictionaryProvider");
  return ctx.dict;
}

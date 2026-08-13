import { cache } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The `Dictionary` type represents the full translation object for a single
 * locale. It is derived from the English JSON via a type-only import so that
 * all consumer components retain full IntelliSense for `dict.section.key`
 * access WITHOUT pulling the JSON into any bundle that imports this module.
 * (This file is imported by client-side code for `formatMessage`, so a value
 * import of the dictionaries here would ship ~260 kB of JSON to the browser.)
 */
export type Dictionary = typeof import("./dictionaries/en.json");

export const SUPPORTED_LOCALES = ["en", "tr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/* -------------------------------------------------------------------------- */
/*  getDictionary — server-side, React-cached                                   */
/* -------------------------------------------------------------------------- */

// Async loaders keep the JSON out of the initial bundle of any importer;
// the module is only materialized when getDictionary() actually runs
// (server components / metadata), never in the browser.
const dictionaryLoaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default as unknown as Dictionary),
  tr: () => import("./dictionaries/tr.json").then((m) => m.default as unknown as Dictionary),
};

/**
 * tr-belirtilen dil kodu için dil sözlüğünü (JSON) yükler ve sonucu istek bazında önbelleğe (cache) alır
 * en-loads the language dictionary (JSON) for the specified language code and caches the result per request
 * input (lang: string)
 * output (Promise<Dictionary>)
 */
export const getDictionary = cache(async (lang: string): Promise<Dictionary> => {
  const resolved: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(lang)
    ? (lang as Locale)
    : "en";
  return dictionaryLoaders[resolved]();
});

/* -------------------------------------------------------------------------- */
/*  formatMessage — backward-compatible interpolation helper                    */
/* -------------------------------------------------------------------------- */

/**
 * tr-metin şablonundaki {anahtar} yer tutucularını, sağlanan değerlerle değiştirerek (interpolate) formatlanmış bir mesaj döndürür
 * en-interpolates a text template by replacing {key} placeholders with the provided values, returning the formatted message
 * input (template: string, values: Record<string, string | number | boolean>)
 * output (string)
 */
export function formatMessage(
  template: string,
  values: Record<string, string | number | boolean>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

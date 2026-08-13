
export const routeTranslations: Record<string, Record<string, string>> = {
  tr: {
    "overview": "genel-bakis",
    // 'vehicles' and 'vehicle' both map to 'araclar' — sidebar uses /vehicle (Next.js folder)
    "vehicle": "araclar",
    "vehicles": "araclar",
    "drivers": "suruculer",
    "routes": "rotalar",
    "shipments": "sevkiyatlar",
    "warehouses": "depolar",
    "inventory": "envanter",
    "customers": "musteriler",
    "reports": "raporlar",
    "analytics": "analiz",
    "company": "sirket",
    "auth": "giris",
    "sign-in": "oturum-ac",
    "sign-up": "kayit-ol",
    "features": "ozellikler",
    "pricing": "fiyatlandirma",
    "about": "hakkimizda",
    "how-it-works": "nasil-calisir",
    "contact": "iletisim"
  },
  en: {
    "overview": "overview",
    // 'vehicles' and 'vehicle' both resolve to 'vehicle' — Next.js folder is 'vehicle'
    "vehicle": "vehicle",
    "vehicles": "vehicle",
    "drivers": "drivers",
    "routes": "routes",
    "shipments": "shipments",
    "warehouses": "warehouses",
    "inventory": "inventory",
    "customers": "customers",
    "reports": "reports",
    "analytics": "analytics",
    "company": "company",
    "auth": "auth",
    "sign-in": "sign-in",
    "sign-up": "sign-up",
    "features": "features",
    "pricing": "pricing",
    "about": "about",
    "how-it-works": "how-it-works",
    "contact": "contact"
  }
};

const reverseMapCache: Record<string, Record<string, string>> = {};

/**
 * tr-yerelleştirilmiş URL (slug) değerinden standart İngilizce (canonical) değerine dönüşüm haritası oluşturur
 * en-builds a reverse map from localized slug to canonical English key
 * input (lang: string)
 * output (Record<string, string>)
 */
function getReverseMap(lang: string): Record<string, string> {
  if (reverseMapCache[lang]) return reverseMapCache[lang];
  const map = Object.entries(routeTranslations[lang] || {}).reduce(
    (acc, [key, val]) => {
      // Only store first canonical key for a given slug (avoid overwriting)
      if (!acc[val]) acc[val] = key;
      return acc;
    },
    {} as Record<string, string>
  );
  reverseMapCache[lang] = map;
  return map;
}

/**
 * tr-standart İngilizce yolu (canonical path), belirtilen dildeki yerelleştirilmiş URL slug'ına çevirir
 * en-translates a canonical (English) path to the localized URL slug for the given language
 * input (path: string, lang: string)
 * output (string)
 */
export function getLocalizedPath(path: string, lang: string): string {
  if (!path) return '/';
  if (!lang || lang === 'en') return path;

  const segments = path.split('/').filter(Boolean);
  const localizedSegments = segments.map((segment) => {
    return routeTranslations[lang]?.[segment] ?? segment;
  });

  return '/' + localizedSegments.join('/');
}

/**
 * tr-yerelleştirilmiş bir URL slug'ını tekrar standart İngilizce (canonical) yola dönüştürür
 * en-translates a localized URL slug back to its canonical English path
 * input (path: string, lang: string)
 * output (string)
 */
export function getCanonicalPath(path: string, lang: string): string {
  if (!path) return '/';
  if (!lang || lang === 'en') return path;

  const reverseMap = getReverseMap(lang);
  const segments = path.split('/').filter(Boolean);

  const canonicalSegments = segments.map((segment) => {
    return reverseMap[segment] ?? segment;
  });

  return '/' + canonicalSegments.join('/');
}

/**
 * tr-verilen standart yol (canonical) için dil kodunu ve yerelleştirilmiş slug'ı içeren tam bir URL döndürür
 * en-returns the full localized URL containing the language code and localized slug for a given canonical path
 * input (canonicalPath: string, lang: string)
 * output (string)
 */
export function buildLocalizedHref(canonicalPath: string, lang: string): string {
  const localized = getLocalizedPath(canonicalPath, lang);
  return `/${lang}${localized}`;
}

/**
 * tr-Next.js SEO metadata 'alternates' bloğunu oluşturarak hreflang ve canonical etiketlerini sağlar
 * en-builds a Next.js SEO metadata 'alternates' block providing hreflang and canonical tags
 * input (canonicalPath: string, lang: string)
 * output ({ canonical: string, languages: Record<string, string> })
 */
export function buildSeoAlternates(
  canonicalPath: string,
  lang: string
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of Object.keys(routeTranslations)) {
    languages[locale] = buildLocalizedHref(canonicalPath, locale);
  }
  // x-default: send unmatched languages to the English variant.
  languages["x-default"] = buildLocalizedHref(canonicalPath, "en");

  return {
    canonical: buildLocalizedHref(canonicalPath, lang),
    languages,
  };
}

/**
 * tr-açılış sayfaları için arama motorlarına uygun BreadcrumbList JSON-LD şemasını oluşturur
 * en-builds a BreadcrumbList JSON-LD schema for public landing pages to aid search engines
 * input (canonicalPath: string, pageName: string, lang: string, baseUrl: string)
 * output (Record<string, unknown>)
 */
export function buildBreadcrumbSchema(
  canonicalPath: string,
  pageName: string,
  lang: string,
  baseUrl: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}${buildLocalizedHref("/", lang)}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: `${baseUrl}${buildLocalizedHref(canonicalPath, lang)}`,
      },
    ],
  };
}

/**
 * tr-verilen URL'in (/demo) kökü altındaki anonim "Live Demo" sayfalarından biri olup olmadığını kontrol eder
 * en-checks whether the given URL falls under the anonymous "Live Demo" subtree (/demo)
 * input (pathname: string | null | undefined)
 * output (boolean)
 */
export function isDemoPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.split('/').filter(Boolean)[1] === 'demo';
}

/**
 * tr-geçerli yola bağlı olarak (demo veya gerçek hesap) doğru "ana sayfa" (dashboard/overview) URL'sini döndürür
 * en-returns the correct dashboard "home" (overview) URL based on whether the path is demo or real
 * input (pathname: string | null | undefined, lang: string)
 * output (string)
 */
export function buildDashboardHomeHref(pathname: string | null | undefined, lang: string): string {
  return isDemoPathname(pathname)
    ? `/${lang}/demo/overview`
    : buildLocalizedHref('/overview', lang);
}

/**
 * tr-belirli bir yerel sayfanın (pathname) aktif olup olmadığını (tam eşleşme veya alt dizin) kontrol eder
 * en-checks if a localized pathname is active (exact match or subdirectory prefix) for a given canonical path
 * input (pathname: string, canonicalPath: string, lang: string, exact?: boolean)
 * output (boolean)
 */
export function isPathActive(
  pathname: string,
  canonicalPath: string,
  lang: string,
  exact = true
): boolean {
  const fullLocalized = buildLocalizedHref(canonicalPath, lang);
  if (exact) return pathname === fullLocalized;
  return pathname === fullLocalized || pathname.startsWith(fullLocalized + '/');
}

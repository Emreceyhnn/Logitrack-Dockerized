import { MetadataRoute } from "next";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import { getBaseUrl } from "@/app/lib/utils/baseUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  const locales = ["en", "tr"] as const;
  const publicRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "features", priority: 0.8, changeFrequency: "weekly" },
    { path: "pricing", priority: 0.8, changeFrequency: "weekly" },
    { path: "about", priority: 0.6, changeFrequency: "monthly" },
    { path: "how-it-works", priority: 0.8, changeFrequency: "weekly" },
    { path: "global-tracking", priority: 0.7, changeFrequency: "monthly" },
    { path: "route-intelligence", priority: 0.7, changeFrequency: "monthly" },
    { path: "telemetry-hub", priority: 0.7, changeFrequency: "monthly" },
    { path: "security-center", priority: 0.7, changeFrequency: "monthly" },
    { path: "enterprise", priority: 0.7, changeFrequency: "monthly" },
    { path: "smb-logistics", priority: 0.7, changeFrequency: "monthly" },
    { path: "supply-chain", priority: 0.7, changeFrequency: "monthly" },
    { path: "custom-api", priority: 0.6, changeFrequency: "monthly" },
    { path: "our-mission", priority: 0.5, changeFrequency: "monthly" },
    { path: "engineering", priority: 0.5, changeFrequency: "monthly" },
    { path: "press-kit", priority: 0.4, changeFrequency: "monthly" },
    { path: "careers", priority: 0.5, changeFrequency: "weekly" },
    { path: "developer-docs", priority: 0.6, changeFrequency: "weekly" },
    { path: "help-center", priority: 0.6, changeFrequency: "weekly" },
    { path: "contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "track", priority: 0.6, changeFrequency: "monthly" },
    { path: "privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "sla", priority: 0.3, changeFrequency: "yearly" },
  ] as const;

  const buildUrl = (path: string, lang: string) => {
    const localizedPath = getLocalizedPath(path, lang);
    const cleanPath = localizedPath.startsWith("/")
      ? localizedPath
      : `/${localizedPath}`;
    return `${baseUrl}/${lang}${cleanPath === "/" ? "" : cleanPath}`;
  };

  const sitemapEntries: MetadataRoute.Sitemap = [];

  const lastModified = new Date();

  locales.forEach((lang) => {
    publicRoutes.forEach(({ path, priority, changeFrequency }) => {
      sitemapEntries.push({
        url: buildUrl(path, lang),
        lastModified,
        changeFrequency,
        priority,
        alternates: {
          languages: {
            en: buildUrl(path, "en"),
            tr: buildUrl(path, "tr"),
            "x-default": buildUrl(path, "en"),
          },
        },
      });
    });
  });

  return sitemapEntries;
}

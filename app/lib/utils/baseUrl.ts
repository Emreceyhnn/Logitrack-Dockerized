/**
 * TR: Uygulamanın çalıştığı ana (kök) URL'yi döndürür.
 * EN: Returns the base (root) URL where the application is running.
 * Input: Yok (None)
 * Output: string (Örn/Ex: "https://logitrack.emreceyhan.xyz")
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://logitrack.emreceyhan.xyz";

  // Guard against the env var accidentally being set to a specific route
  // (e.g. ".../sitemap.xml" or ".../robots.txt") instead of the bare origin.
  return envUrl
    .replace(/\/(sitemap\.xml|robots\.txt)$/, "")
    .replace(/\/$/, "");
}

import crypto from "crypto";

/**
 * tr-Sırlar için sabit zamanlı dize karşılaştırması (cron belirteçleri, API anahtarları vb.).
 * en-Constant-time string comparison for secrets (cron tokens, API keys, etc).
 * input (
  a: string,
  b: string
)
 * output (boolean)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

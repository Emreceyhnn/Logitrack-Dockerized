import {
  redis,
  EXCHANGE_RATE_CACHE_TTL,
  exchangeRateCacheKeys,
} from "@/app/lib/redis";
import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";

export type SupportedCurrency = "USD" | "EUR" | "TRY" | "GBP";

export interface ExchangeRates {
  base: "USD";
  rates: Record<string, number>;
  lastUpdated: string;
}

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  "error-type"?: string;
}

/**
 * tr-EXCHANGE_RATE_BASE_URL'i çağrı zamanında oluşturur, böylece modül yüklemesinden sonra ayarlanan ortam değişkenleri dikkate alınır.
 * en-Builds the base URL at call-time so env vars set after module load are respected.
 * input ()
 * output (string)
 *
 */
function getBaseUrl(): string {
  const baseUrl = process.env.EXCHANGE_RATE_BASE_URL;
  if (baseUrl) return baseUrl;

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (apiKey) return `https://v6.exchangerate-api.com/v6/${apiKey}`;

  return "";
}

/**
 * tr-exchangeRate veritabanında ve Redis önbelleğinde saklanan güncel döviz kurları nesnesini döndürür. API anahtarı yoksa veya hatalıysa hata verir, ancak hata durumunda veritabanına veya Redis'e yazmaz.
 * en-Returns the current exchange rates object stored in exchangeRate database and Redis cache. Throws an error if the API key is missing or invalid, but does not write to the database or Redis in case of error.
 * input ()
 * output (Promise<ExchangeRates>)
 *
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Try DB cache first (most reliable, persists across restarts)
  try {
    const cachedDb = await db.exchangeRate.findFirst({
      where: { date: { gte: today } },
      orderBy: { date: "desc" },
    });

    if (cachedDb) {
      return {
        base: "USD",
        rates: cachedDb.rates as Record<string, number>,
        lastUpdated: cachedDb.date.toISOString(),
      };
    }
  } catch (err) {
    logger.warn("[exchangeRate] DB get failed", err);
  }

  // 2. Fall through to Redis cache (fast, in-memory)
  try {
    const cached = await redis.get<ExchangeRates>(
      exchangeRateCacheKeys.exchangeRate()
    );
    if (cached) return cached;
  } catch (err) {
    logger.warn("[exchangeRate] Redis get failed", err);
  }

  // 3. Fetch from external API
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "[exchangeRate] EXCHANGE_RATE_API_KEY is not set in environment variables."
    );
  }

  const response = await fetch(`${baseUrl}/latest/USD`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `ExchangeRate-API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ExchangeRateApiResponse;

  if (data.result !== "success") {
    throw new Error(`ExchangeRate-API returned: ${data["error-type"]}`);
  }

  const rates: ExchangeRates = {
    base: "USD",
    rates: data.conversion_rates,
    lastUpdated: new Date().toISOString(),
  };

  // 4. Persist to DB (fire-and-forget, non-blocking).
  // `date` is a DATE column with a unique (base, date) constraint, so a
  // same-day refresh updates the existing row instead of duplicating it.
  try {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    await db.exchangeRate.upsert({
      where: { base_date: { base: "USD", date: day } },
      update: { rates: data.conversion_rates },
      create: {
        base: "USD",
        rates: data.conversion_rates,
        date: day,
      },
    });
  } catch (err) {
    logger.warn("[exchangeRate] DB save failed", err);
  }

  // 5. Persist to Redis (fire-and-forget, non-blocking)
  try {
    await redis.set(exchangeRateCacheKeys.exchangeRate(), rates, {
      ex: EXCHANGE_RATE_CACHE_TTL,
    });
  } catch (err) {
    logger.warn("[exchangeRate] Redis set failed", err);
  }

  return rates;
}

/**
 * tr-Belirli bir para birimi için USD'den dönüşüm oranını alır. Hata durumunda 1 döndürür.
 * en-Retrieves the USD conversion rate for a specific currency. Returns 1 in case of error.
 * input (currency: SupportedCurrency)
 * output (Promise<number>)
 *
 */
export async function getExchangeRate(
  currency: SupportedCurrency
): Promise<number> {
  // USD is always 1:1 — no network call needed
  if (currency === "USD") return 1;

  try {
    const rates = await getExchangeRates();
    return rates.rates[currency] ?? 1;
  } catch (err) {
    logger.error("[exchangeRate] Failed to get exchange rate:", err);
    return 1; // Fail-open: default to 1 to avoid breaking the UI
  }
}

/**
 * tr-Bir USD miktarını hedef para birimine dönüştürür.
 * en-Converts a USD amount to the target currency.
 * input (usdAmount: number, targetCurrency: SupportedCurrency)
 * output (Promise<number>)
 *
 */
export async function convertFromUSD(
  usdAmount: number,
  targetCurrency: SupportedCurrency
): Promise<number> {
  if (targetCurrency === "USD") return usdAmount;
  const rate = await getExchangeRate(targetCurrency);
  return usdAmount * rate;
}

/**
 * tr-USD'den herhangi bir desteklenen para birimine veya herhangi bir desteklenen para biriminden USD'ye tutarı dönüştürür. USD'yi aracı pivot para birimi olarak kullanır.
 * en-Converts an amount from any supported currency to any other supported currency. Uses USD as the intermediate pivot currency.
 * input (amount: number, fromCurrency: string, toCurrency: string)
 * output (Promise<number>)
 *
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const { rates } = await getExchangeRates();
  const rateFrom = rates[fromCurrency] ?? 1;
  const rateTo = rates[toCurrency] ?? 1;

  // Step 1: Convert source currency → USD
  // Step 2: Convert USD → target currency
  return (amount / rateFrom) * rateTo;
}

/**
 * tr-Döviz kuru önbelleğini yeniler. Bir cron işi veya yönetici tetikleyicisi için kullanışlıdır.
 * en-Forces a refresh of the exchange rate cache. Useful for a cron job or admin trigger.
 * input ()
 * output (Promise<ExchangeRates>)
 *
 */
export async function refreshExchangeRates(): Promise<ExchangeRates> {
  try {
    await redis.del(exchangeRateCacheKeys.exchangeRate());
  } catch {
    // Ignore Redis errors — we still want to attempt a fresh fetch
  }
  return getExchangeRates();
}

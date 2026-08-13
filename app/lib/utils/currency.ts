import type { SupportedCurrency } from "@/app/lib/services/exchangeRate";

export type { SupportedCurrency };

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: "$",
  EUR: "€",
  TRY: "₺",
  GBP: "£",
};

const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  TRY: "tr-TR",
  GBP: "en-GB",
};

/**
 * TR: Verilen miktarı (amount) istenen para birimi ve kura göre formatlar.
 * EN: Formats the given amount according to the target currency and exchange rate.
 * Input: amount (number), currency (string), rate (number), decimals (number), isDirectAmount (boolean)
 * Output: string (Örn/Ex: "$1,234.00")
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = "USD",
  rate: number = 1,
  decimals: number = 0,
  isDirectAmount = false
): string {
  const converted = isDirectAmount ? amount : amount * rate;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(converted);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
    return `${symbol}${converted.toFixed(decimals)}`;
  }
}

/**
 * TR: Büyük sayıları (M, K) kısaltarak para birimi formatına çevirir.
 * EN: Formats large numbers into a compact currency string (e.g., M for millions, K for thousands).
 * Input: usdAmount (number), currency (string), rate (number)
 * Output: string (Örn/Ex: "$1.2M")
 */
export function formatCurrencyCompact(
  usdAmount: number,
  currency: SupportedCurrency = "USD",
  rate: number = 1
): string {
  const converted = usdAmount * rate;
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";

  if (Math.abs(converted) >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(converted) >= 1_000) {
    return `${symbol}${(converted / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(usdAmount, currency, rate, 0);
}

export function createCurrencyFormatter(
  currency: SupportedCurrency = "USD",
  rate: number = 1
) {
  return {
    format: (usdAmount: number, decimals = 0) =>
      formatCurrency(usdAmount, currency, rate, decimals),
    formatDirect: (amount: number, decimals = 0) =>
      formatCurrency(amount, currency, 1, decimals, true),
    compact: (usdAmount: number) =>
      formatCurrencyCompact(usdAmount, currency, rate),
    symbol: CURRENCY_SYMBOLS[currency] ?? "$",
    currency,
    rate,
  };
}

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/app/lib/context/UserContext";
import { getExchangeRatesAction } from "@/app/lib/controllers/exchangeRate";
import {
  createCurrencyFormatter,
  formatCurrency,
  formatCurrencyCompact,
  CURRENCY_SYMBOLS,
} from "@/app/lib/utils/currency";
import type { SupportedCurrency } from "@/app/lib/utils/currency";

export function useCurrency() {
  const { user } = useUserContext();
  const currency = (user?.currency as SupportedCurrency) || "USD";

  // The public Live Demo runs anonymously (fabricated demo user). Its exchange-
  // rate server action is authenticatedAction-wrapped and would redirect an
  // unauthenticated visitor to sign-in, so skip the fetch entirely in demo mode
  // and fall back to rate = 1 (the demo currency is USD anyway).
  const isDemo = user?.id === "demo-user";

  const { data: ratesData, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const result = await getExchangeRatesAction();
      if ("error" in result) throw new Error(result.error as string);
      return result;
    },
    enabled: !isDemo,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
  });

  const rate = currency === "USD" ? 1 : (ratesData?.rates?.[currency] ?? 1);

  return useMemo(() => {
    const formatter = createCurrencyFormatter(currency, rate);

    return {
      format: (usdAmount: number, decimals = 0) =>
        formatCurrency(usdAmount, currency, rate, decimals),

      compact: (usdAmount: number) =>
        formatCurrencyCompact(usdAmount, currency, rate),

      symbol: CURRENCY_SYMBOLS[currency] ?? "$",

      convertFrom: (amount: number, fromCurrency: string) => {
        if (fromCurrency === currency) return amount;
        const rateFrom = ratesData?.rates?.[fromCurrency] ?? 1;
        const rateTo = ratesData?.rates?.[currency] ?? 1;
        return (amount / rateFrom) * rateTo;
      },

      formatFrom: (amount: number, fromCurrency: string, decimals = 0) => {
        if (fromCurrency === currency)
          return formatter.formatDirect(amount, decimals);
        const rateFrom = ratesData?.rates?.[fromCurrency] ?? 1;
        const rateTo = ratesData?.rates?.[currency] ?? 1;
        const targetAmount = (amount / rateFrom) * rateTo;
        return formatter.formatDirect(targetAmount, decimals);
      },

      currency,

      rate,

      formatter,

      isLoading,
    };
  }, [currency, rate, ratesData, isLoading]);
}

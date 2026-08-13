"use server";

import { getExchangeRates } from "@/app/lib/services/exchangeRate";
import { authenticatedAction } from "@/app/lib/auth-middleware";
import { controllerGuard } from "@/app/lib/controllers/utils/controllerGuard";

/**
 * tr-mevcut döviz kurlarını getirir (Redis'te önbelleğe alınır)
 * en-fetches current exchange rates (cached in Redis)
 * input ()
 * output (Promise<ExchangeRates>)
 */
export const getExchangeRatesAction = authenticatedAction(async () => {
  return controllerGuard("getExchangeRatesAction", async () => {
    const rates = await getExchangeRates();
    return rates;
  });
});

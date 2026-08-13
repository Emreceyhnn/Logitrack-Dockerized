import { NextRequest, NextResponse } from "next/server";
import { refreshExchangeRates, getExchangeRates } from "@/app/lib/services/exchangeRate";
import { logger } from "@/app/lib/logger";
import { timingSafeEqual } from "@/app/lib/utils/timingSafeEqual";


/**
 * GET /api/exchange-rates
 * Returns current exchange rates (from Redis cache or fresh fetch).
 */
export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json(rates);
  } catch (error) {
    logger.error("[exchange-rates] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-rates
 * Forces a refresh of exchange rates (for cron jobs).
 * Requires X-Cron-Secret header for security.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!secret || !expectedSecret || !timingSafeEqual(secret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rates = await refreshExchangeRates();
    return NextResponse.json({
      success: true,
      message: "Exchange rates refreshed",
      lastUpdated: rates.lastUpdated,
      currencies: Object.keys(rates.rates).length,
    });
  } catch (error) {
    logger.error("[exchange-rates] POST error:", error);
    return NextResponse.json(
      { error: "Failed to refresh exchange rates" },
      { status: 500 }
    );
  }
}

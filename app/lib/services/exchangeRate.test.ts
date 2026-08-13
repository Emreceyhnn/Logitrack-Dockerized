import { describe, it, mock, before, beforeEach } from "node:test";
import { expect } from "expect";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// All mocks must be declared BEFORE any imports that use them.

const dbMock = {
  exchangeRate: {
    findFirst: mock.fn<(...args: unknown[]) => unknown>(),
    create: mock.fn<(...args: unknown[]) => unknown>(),
    upsert: mock.fn<(...args: unknown[]) => unknown>(),
  },
};

const redisMock = {
  get: mock.fn<(...args: unknown[]) => unknown>(),
  set: mock.fn<(...args: unknown[]) => unknown>(),
  del: mock.fn<(...args: unknown[]) => unknown>(),
};

const fetchMock = mock.fn<(...args: unknown[]) => unknown>();

mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../redis.ts", {
  namedExports: {
    redis: redisMock,
    EXCHANGE_RATE_CACHE_TTL: 3600,
    exchangeRateCacheKeys: {
      exchangeRate: () => "exchange_rate:USD",
    },
  },
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const MOCK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  TRY: 32.5,
  GBP: 0.79,
};

const MOCK_EXCHANGE_RATES = {
  base: "USD" as const,
  rates: MOCK_RATES,
  lastUpdated: "2024-06-15T00:00:00.000Z",
};

const MOCK_DB_ROW = {
  rates: MOCK_RATES,
  date: new Date("2024-06-15T00:00:00.000Z"),
};

const MOCK_API_RESPONSE = {
  result: "success",
  conversion_rates: MOCK_RATES,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeFetchResponse(body: object, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: async () => body,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("exchangeRate service", () => {
  let getExchangeRates: unknown;
  let getExchangeRate: unknown;
  let convertFromUSD: unknown;
  let convertCurrency: unknown;
  let refreshExchangeRates: unknown;

  before(async () => {
    // Set env vars before importing the module
    process.env.EXCHANGE_RATE_API_KEY = "test-api-key";
    process.env.EXCHANGE_RATE_BASE_URL =
      "https://v6.exchangerate-api.com/v6/test-api-key";

    // Inject fetch mock into globalThis
    (globalThis as unknown).fetch = fetchMock;

    const mod = await import("./exchangeRate");
    getExchangeRates = mod.getExchangeRates;
    getExchangeRate = mod.getExchangeRate;
    convertFromUSD = mod.convertFromUSD;
    convertCurrency = mod.convertCurrency;
    refreshExchangeRates = mod.refreshExchangeRates;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    dbMock.exchangeRate.findFirst.mock.resetCalls();
    dbMock.exchangeRate.create.mock.resetCalls();
    dbMock.exchangeRate.upsert.mock.resetCalls();
    redisMock.get.mock.resetCalls();
    redisMock.set.mock.resetCalls();
    redisMock.del.mock.resetCalls();
    fetchMock.mock.resetCalls();
  });

  // ─── getExchangeRates ──────────────────────────────────────────────────────
  describe("getExchangeRates", () => {
    it("should return rates from DB cache when a fresh record exists", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await getExchangeRates();

      expect(result.base).toBe("USD");
      expect(result.rates).toEqual(MOCK_RATES);
      expect(dbMock.exchangeRate.findFirst.mock.calls.length).toBe(1);
      // Should NOT hit Redis or fetch when DB has data
      expect(redisMock.get.mock.calls.length).toBe(0);
      expect(fetchMock.mock.calls.length).toBe(0);
    });

    it("should fall through to Redis when DB has no record", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => MOCK_EXCHANGE_RATES);

      const result = await getExchangeRates();

      expect(result.base).toBe("USD");
      expect(result.rates).toEqual(MOCK_RATES);
      expect(redisMock.get.mock.calls.length).toBe(1);
      expect(fetchMock.mock.calls.length).toBe(0);
    });

    it("should fall through to API when both DB and Redis miss", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => null);
      redisMock.set.mock.mockImplementation(async () => {});
      dbMock.exchangeRate.upsert.mock.mockImplementation(async () => ({}));
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse(MOCK_API_RESPONSE)
      );

      const result = await getExchangeRates();

      expect(result.base).toBe("USD");
      expect(result.rates).toEqual(MOCK_RATES);
      expect(fetchMock.mock.calls.length).toBe(1);
    });

    it("should save fetched rates to DB and Redis after API call", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => null);
      redisMock.set.mock.mockImplementation(async () => {});
      dbMock.exchangeRate.upsert.mock.mockImplementation(async () => ({}));
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse(MOCK_API_RESPONSE)
      );

      await getExchangeRates();

      expect(dbMock.exchangeRate.upsert.mock.calls.length).toBe(1);
      expect(redisMock.set.mock.calls.length).toBe(1);
    });

    it("should throw when API response is not ok", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => null);
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse({}, false, 500)
      );

      await expect(getExchangeRates()).rejects.toThrow(
        "ExchangeRate-API error"
      );
    });

    it("should throw when API returns result !== 'success'", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => null);
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse({ result: "error", "error-type": "invalid-key" })
      );

      await expect(getExchangeRates()).rejects.toThrow(
        "ExchangeRate-API returned: invalid-key"
      );
    });

    it("should continue to Redis if DB throws an error", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => {
        throw new Error("DB connection failed");
      });
      redisMock.get.mock.mockImplementation(async () => MOCK_EXCHANGE_RATES);

      const consoleMock = mock.method(console, "warn", () => {});
      const result = await getExchangeRates();

      expect(result.rates).toEqual(MOCK_RATES);
      expect(consoleMock.mock.calls.length).toBeGreaterThan(0);
      consoleMock.mock.restore();
    });

    it("should continue to fetch if Redis throws an error", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => {
        throw new Error("Redis timeout");
      });
      redisMock.set.mock.mockImplementation(async () => {});
      dbMock.exchangeRate.upsert.mock.mockImplementation(async () => ({}));
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse(MOCK_API_RESPONSE)
      );

      const consoleMock = mock.method(console, "warn", () => {});
      const result = await getExchangeRates();

      expect(result.rates).toEqual(MOCK_RATES);
      consoleMock.mock.restore();
    });

    it("should silently continue if DB save after fetch fails", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => null);
      redisMock.get.mock.mockImplementation(async () => null);
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse(MOCK_API_RESPONSE)
      );
      dbMock.exchangeRate.upsert.mock.mockImplementation(async () => {
        throw new Error("DB write failed");
      });
      redisMock.set.mock.mockImplementation(async () => {});

      const consoleMock = mock.method(console, "warn", () => {});
      const result = await getExchangeRates();

      // Still returns rates despite DB save failure
      expect(result.base).toBe("USD");
      consoleMock.mock.restore();
    });
  });

  // ─── getExchangeRate ───────────────────────────────────────────────────────
  describe("getExchangeRate", () => {
    it("should return 1 immediately for USD without hitting DB or Redis", async () => {
      const result = await getExchangeRate("USD");

      expect(result).toBe(1);
      expect(dbMock.exchangeRate.findFirst.mock.calls.length).toBe(0);
    });

    it("should return the correct rate for EUR", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await getExchangeRate("EUR");
      expect(result).toBe(0.92);
    });

    it("should return the correct rate for TRY", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await getExchangeRate("TRY");
      expect(result).toBe(32.5);
    });

    it("should return the correct rate for GBP", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await getExchangeRate("GBP");
      expect(result).toBe(0.79);
    });

    it("should return 1 as fallback if getExchangeRates throws", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(async () => {
        throw new Error("DB down");
      });
      redisMock.get.mock.mockImplementation(async () => null);
      fetchMock.mock.mockImplementation(async () =>
        makeFetchResponse({}, false, 500)
      );

      const consoleMock = mock.method(console, "error", () => {});
      const result = await getExchangeRate("EUR");

      expect(result).toBe(1);
      consoleMock.mock.restore();
    });
  });

  // ─── convertFromUSD ────────────────────────────────────────────────────────
  describe("convertFromUSD", () => {
    it("should return the same amount for USD without any lookup", async () => {
      const result = await convertFromUSD(500, "USD");

      expect(result).toBe(500);
      expect(dbMock.exchangeRate.findFirst.mock.calls.length).toBe(0);
    });

    it("should convert USD to EUR using the correct rate", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // 1000 USD * 0.92 = 920 EUR
      const result = await convertFromUSD(1000, "EUR");
      expect(result).toBeCloseTo(920, 5);
    });

    it("should convert USD to TRY using the correct rate", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // 100 USD * 32.5 = 3250 TRY
      const result = await convertFromUSD(100, "TRY");
      expect(result).toBeCloseTo(3250, 5);
    });

    it("should convert 0 USD to any currency as 0", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await convertFromUSD(0, "EUR");
      expect(result).toBe(0);
    });
  });

  // ─── convertCurrency ───────────────────────────────────────────────────────
  describe("convertCurrency", () => {
    it("should return same amount when from and to currency are equal", async () => {
      const result = await convertCurrency(100, "EUR", "EUR");

      expect(result).toBe(100);
      // Should NOT call getExchangeRates at all
      expect(dbMock.exchangeRate.findFirst.mock.calls.length).toBe(0);
    });

    it("should convert EUR to TRY correctly", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // 100 EUR → USD: 100 / 0.92 = 108.695... USD → TRY: 108.695 * 32.5 = 3532.6...
      const result = await convertCurrency(100, "EUR", "TRY");
      const expected = (100 / MOCK_RATES.EUR) * MOCK_RATES.TRY;
      expect(result).toBeCloseTo(expected, 2);
    });

    it("should convert GBP to EUR correctly", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await convertCurrency(50, "GBP", "EUR");
      const expected = (50 / MOCK_RATES.GBP) * MOCK_RATES.EUR;
      expect(result).toBeCloseTo(expected, 2);
    });

    it("should default to rate 1 for any currencies", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // Unknown → Unknown: (100 / 1) * 1 = 100
      const result = await convertCurrency(100, "XYZ", "ABC");
      expect(result).toBeCloseTo(100, 5);
    });

    it("should convert USD to EUR (USD rate is 1)", async () => {
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // 200 USD / 1 * 0.92 = 184 EUR
      const result = await convertCurrency(200, "USD", "EUR");
      expect(result).toBeCloseTo(184, 2);
    });
  });

  // ─── refreshExchangeRates ──────────────────────────────────────────────────
  describe("refreshExchangeRates", () => {
    it("should delete the Redis cache key before fetching fresh data", async () => {
      redisMock.del.mock.mockImplementation(async () => {});
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      await refreshExchangeRates();

      expect(redisMock.del.mock.calls.length).toBe(1);
      expect(redisMock.del.mock.calls[0].arguments[0]).toBe(
        "exchange_rate:USD"
      );
    });

    it("should return fresh exchange rates after clearing cache", async () => {
      redisMock.del.mock.mockImplementation(async () => {});
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      const result = await refreshExchangeRates();

      expect(result.base).toBe("USD");
      expect(result.rates).toEqual(MOCK_RATES);
    });

    it("should still fetch rates even if Redis del throws", async () => {
      redisMock.del.mock.mockImplementation(async () => {
        throw new Error("Redis unavailable");
      });
      dbMock.exchangeRate.findFirst.mock.mockImplementation(
        async () => MOCK_DB_ROW
      );

      // Should not throw — error is swallowed
      const result = await refreshExchangeRates();
      expect(result.base).toBe("USD");
    });
  });
});

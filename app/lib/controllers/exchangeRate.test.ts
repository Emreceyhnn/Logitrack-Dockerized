 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const exchangeRateMock = {
  getExchangeRates: mock.fn(async () => ({ rates: { USD: 1, EUR: 0.92 } })),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

mock.module("../services/exchangeRate.ts", {
  namedExports: exchangeRateMock,
});

// 2. TEST GRUPLARI
describe("Exchange Rate Controller", () => {
  let exchangeRateController: unknown;

  before(async () => {
    exchangeRateController = await import("./exchangeRate");
  });

  beforeEach(() => {
    exchangeRateMock.getExchangeRates.mock.resetCalls();
  });

  describe("getExchangeRatesAction() metodu", () => {
    it("should_ReturnExchangeRates", async () => {
      // Act
      const result = await exchangeRateController.getExchangeRatesAction();

      // Assert
      expect(result.rates.EUR).toBe(0.92);
      expect(exchangeRateMock.getExchangeRates.mock.calls.length).toBe(1);
    });
  });
});

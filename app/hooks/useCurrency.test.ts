 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useMemo: mock.fn((cb) => cb()),
};

const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: { rates: { TRY: 30, EUR: 0.9 } }, isLoading: false })),
};

const userContextMock = {
  useUserContext: mock.fn(() => ({ user: { currency: "TRY" } })),
};

const exchangeRateControllerMock = {
  getExchangeRatesAction: mock.fn(),
};

const currencyUtilsMock = {
  createCurrencyFormatter: mock.fn(() => ({
    formatDirect: mock.fn((val) => `Formatted: ${val}`),
  })),
  formatCurrency: mock.fn((val) => `₺${val}`),
  formatCurrencyCompact: mock.fn((val) => `₺${val}k`),
  CURRENCY_SYMBOLS: { TRY: "₺", USD: "$", EUR: "€" },
};

mock.module("react", { namedExports: reactMock });
mock.module("@tanstack/react-query", { namedExports: reactQueryMock });
mock.module("../lib/context/UserContext.tsx", { namedExports: userContextMock });
mock.module("../lib/controllers/exchangeRate.ts", { namedExports: exchangeRateControllerMock });
mock.module("../lib/utils/currency.ts", { namedExports: currencyUtilsMock });

// 2. TEST GRUPLARI
describe("useCurrency Hook", () => {
  let useCurrencyMod: unknown;

  before(async () => {
    useCurrencyMod = await import("./useCurrency");
  });

  beforeEach(() => {
    reactMock.useMemo.mock.resetCalls();
    reactQueryMock.useQuery.mock.resetCalls();
    userContextMock.useUserContext.mock.resetCalls();
    currencyUtilsMock.formatCurrency.mock.resetCalls();
  });

  it("should_ReturnCurrencyFormatterWithCorrectRate", () => {
    // Act
    const currencyInfo = useCurrencyMod.useCurrency();

    // Assert
    expect(currencyInfo.currency).toBe("TRY");
    expect(currencyInfo.rate).toBe(30);
    expect(currencyInfo.symbol).toBe("₺");
    expect(currencyInfo.isLoading).toBe(false);

    // Call internal formatter
    const formatted = currencyInfo.format(100);
    expect(formatted).toBe("₺100");
    expect(currencyUtilsMock.formatCurrency.mock.calls.length).toBe(1);
  });
});

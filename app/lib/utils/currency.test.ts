 
import { describe, it } from "node:test";
import { expect } from "expect";
import {
  formatCurrency,
  formatCurrencyCompact,
  createCurrencyFormatter,
  CURRENCY_SYMBOLS,
} from "./currency";

describe("currency utils", () => {
  // ─── CURRENCY_SYMBOLS ────────────────────────────────────────────────────────
  describe("CURRENCY_SYMBOLS", () => {
    it("should export correct symbols for all supported currencies", () => {
      expect(CURRENCY_SYMBOLS.USD).toBe("$");
      expect(CURRENCY_SYMBOLS.EUR).toBe("€");
      expect(CURRENCY_SYMBOLS.TRY).toBe("₺");
      expect(CURRENCY_SYMBOLS.GBP).toBe("£");
    });
  });

  // ─── formatCurrency ──────────────────────────────────────────────────────────
  describe("formatCurrency", () => {
    it("should format USD with default settings (no rate conversion)", () => {
      const result = formatCurrency(1000);
      expect(result).toContain("1");
      expect(result).toContain("000");
    });

    it("should multiply amount by rate when isDirectAmount is false", () => {
      // 100 USD * rate 2 = 200
      const result = formatCurrency(100, "USD", 2, 0, false);
      expect(result).toContain("200");
    });

    it("should NOT multiply when isDirectAmount is true", () => {
      // 500 EUR direct (no rate multiply)
      const result = formatCurrency(500, "EUR", 99, 0, true);
      expect(result).toContain("500");
    });

    it("should apply decimal places", () => {
      // 1234.5678 * rate 1 = 1234.5678, formatted to 2 decimals = "$1,234.57"
      const result = formatCurrency(1234.5678, "USD", 1, 2, true);
      expect(result).toMatch(/1[,.]234[.,]5[67]/);
    });

    it("should format EUR with European locale (dot as thousand sep)", () => {
      const result = formatCurrency(1000, "EUR", 1, 0, true);
      // de-DE format: 1.000 €
      expect(result).toContain("1");
      expect(result).toContain("€");
    });

    it("should format TRY with Turkish lira symbol", () => {
      const result = formatCurrency(5000, "TRY", 1, 0, true);
      expect(result).toContain("₺");
      expect(result).toContain("5");
    });

    it("should format GBP with pound symbol", () => {
      const result = formatCurrency(250, "GBP", 1, 0, true);
      expect(result).toContain("£");
      expect(result).toContain("250");
    });

    it("should handle zero amount", () => {
      const result = formatCurrency(0, "USD", 1, 0, true);
      expect(result).toContain("0");
    });

    it("should handle negative amounts", () => {
      const result = formatCurrency(-500, "USD", 1, 0, true);
      expect(result).toContain("500");
      expect(result).toContain("-");
    });
  });

  // ─── formatCurrencyCompact ───────────────────────────────────────────────────
  describe("formatCurrencyCompact", () => {
    it("should format millions with M suffix", () => {
      const result = formatCurrencyCompact(2_500_000, "USD", 1);
      expect(result).toBe("$2.5M");
    });

    it("should format thousands with k suffix", () => {
      const result = formatCurrencyCompact(15_000, "USD", 1);
      expect(result).toBe("$15.0k");
    });

    it("should format small amounts with full currency format", () => {
      const result = formatCurrencyCompact(500, "USD", 1);
      expect(result).toContain("500");
    });

    it("should apply exchange rate for millions", () => {
      // 1_000_000 USD * rate 35 = 35_000_000 TRY
      const result = formatCurrencyCompact(1_000_000, "TRY", 35);
      expect(result).toBe("₺35.0M");
    });

    it("should apply exchange rate for thousands", () => {
      // 1000 * 2 = 2000 EUR
      const result = formatCurrencyCompact(1000, "EUR", 2);
      expect(result).toBe("€2.0k");
    });

    it("should handle negative millions", () => {
      const result = formatCurrencyCompact(-2_000_000, "USD", 1);
      expect(result).toBe("$-2.0M");
    });

    it("should handle negative thousands", () => {
      const result = formatCurrencyCompact(-5_000, "GBP", 1);
      expect(result).toBe("£-5.0k");
    });

    it("should handle exactly 1_000_000", () => {
      const result = formatCurrencyCompact(1_000_000, "USD", 1);
      expect(result).toBe("$1.0M");
    });

    it("should handle exactly 1_000", () => {
      const result = formatCurrencyCompact(1_000, "USD", 1);
      expect(result).toBe("$1.0k");
    });
  });

  // ─── createCurrencyFormatter ─────────────────────────────────────────────────
  describe("createCurrencyFormatter", () => {
    it("should return a formatter object with all expected properties", () => {
      const formatter = createCurrencyFormatter("EUR", 2);
      expect(typeof formatter.format).toBe("function");
      expect(typeof formatter.formatDirect).toBe("function");
      expect(typeof formatter.compact).toBe("function");
      expect(formatter.symbol).toBe("€");
      expect(formatter.currency).toBe("EUR");
      expect(formatter.rate).toBe(2);
    });

    it("format() should apply rate multiplication", () => {
      const formatter = createCurrencyFormatter("USD", 3);
      // 100 * rate 3 = 300
      const result = formatter.format(100);
      expect(result).toContain("300");
    });

    it("formatDirect() should NOT apply rate multiplication", () => {
      const formatter = createCurrencyFormatter("USD", 99);
      // 100 USD direct, rate is ignored
      const result = formatter.formatDirect(100);
      expect(result).toContain("100");
      expect(result).not.toContain("9900");
    });

    it("compact() should format large amounts compactly", () => {
      const formatter = createCurrencyFormatter("USD", 1);
      expect(formatter.compact(5_000_000)).toBe("$5.0M");
      expect(formatter.compact(3_500)).toBe("$3.5k");
    });

    it("should default to USD with rate 1", () => {
      const formatter = createCurrencyFormatter();
      expect(formatter.currency).toBe("USD");
      expect(formatter.rate).toBe(1);
      expect(formatter.symbol).toBe("$");
    });

    it("should correctly expose TRY symbol", () => {
      const formatter = createCurrencyFormatter("TRY", 32);
      expect(formatter.symbol).toBe("₺");
    });
  });
});

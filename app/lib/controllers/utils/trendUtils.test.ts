 
import { describe, it } from "node:test";
import { expect } from "expect";
import { calcTrend, daysAgo } from "./trendUtils";

describe("Trend Utils", () => {
  describe("calcTrend() metodu", () => {
    it("should_ReturnUndefined_WhenBothValuesAreZero", () => {
      const result = calcTrend(0, 0);
      expect(result).toBeUndefined();
    });

    it("should_Return100PercentUp_WhenPreviousIsZeroAndCurrentIsPositive", () => {
      const result = calcTrend(50, 0);
      expect(result?.value).toBe(100);
      expect(result?.isUp).toBe(true);
    });

    it("should_CalculatePositiveTrendCorrectly", () => {
      // Previous: 100, Current: 150 -> +50%
      const result = calcTrend(150, 100);
      expect(result?.value).toBe(50);
      expect(result?.isUp).toBe(true);
    });

    it("should_CalculateNegativeTrendCorrectly", () => {
      // Previous: 100, Current: 80 -> -20%
      const result = calcTrend(80, 100);
      expect(result?.value).toBe(20);
      expect(result?.isUp).toBe(false);
    });
  });

  describe("daysAgo() metodu", () => {
    it("should_ReturnStartOfDayForSpecifiedDaysAgo", () => {
      const result = daysAgo(5);
      
      const expected = new Date();
      expected.setDate(expected.getDate() - 5);
      expected.setHours(0, 0, 0, 0);
      
      expect(result.getTime()).toBe(expected.getTime());
    });
  });
});

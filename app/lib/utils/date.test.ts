 
import { describe, it } from "node:test";
import { expect } from "expect";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  formatDisplayDate,
  formatDisplayTime,
  formatDisplayDateTime,
  getUserNow,
  toUTC,
  utcToUserTz,
  formatSmartTimestamp,
} from "./date";
import type { DateSettings } from "./date";

// Extend dayjs for assertions
dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const UTC_DATE = "2024-06-15T10:30:00.000Z"; // 2024-06-15 10:30 UTC

const UTC_SETTINGS: DateSettings = {
  timezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
};

const TR_SETTINGS: DateSettings = {
  timezone: "Europe/Istanbul", // UTC+3
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
};

const US_SETTINGS_12H: DateSettings = {
  timezone: "America/New_York", // UTC-4 in summer
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
};

// ─── formatDisplayDate ───────────────────────────────────────────────────────
describe("date utils", () => {
  describe("formatDisplayDate", () => {
    it("should return '-' for null input", () => {
      expect(formatDisplayDate(null)).toBe("-");
    });

    it("should return '-' for undefined input", () => {
      expect(formatDisplayDate(undefined)).toBe("-");
    });

    it("should format date in UTC with DD/MM/YYYY format", () => {
      const result = formatDisplayDate(UTC_DATE, UTC_SETTINGS);
      expect(result).toBe("15/06/2024");
    });

    it("should format date in Istanbul timezone (UTC+3)", () => {
      // 10:30 UTC = 13:30 Istanbul, still June 15
      const result = formatDisplayDate(UTC_DATE, TR_SETTINGS);
      expect(result).toBe("15.06.2024");
    });

    it("should format date in New York timezone (UTC-4)", () => {
      // 10:30 UTC = 06:30 New York, still June 15
      const result = formatDisplayDate(UTC_DATE, US_SETTINGS_12H);
      expect(result).toBe("06/15/2024");
    });

    it("should handle timezone date shift (near midnight)", () => {
      // 2024-06-15T01:00:00Z = June 14 at 21:00 in New York (UTC-4)
      const earlyUTC = "2024-06-15T01:00:00.000Z";
      const result = formatDisplayDate(earlyUTC, US_SETTINGS_12H);
      expect(result).toBe("06/14/2024"); // previous day in NYC
    });

    it("should accept a Date object", () => {
      const dateObj = new Date("2024-01-20T12:00:00.000Z");
      const result = formatDisplayDate(dateObj, UTC_SETTINGS);
      expect(result).toBe("20/01/2024");
    });

    it("should accept a Unix timestamp (number)", () => {
      const ts = new Date("2024-03-10T08:00:00.000Z").getTime();
      const result = formatDisplayDate(ts, UTC_SETTINGS);
      expect(result).toBe("10/03/2024");
    });

    it("should use defaultSettings (UTC, DD/MM/YYYY, 24h) when none provided", () => {
      const result = formatDisplayDate(UTC_DATE);
      expect(result).toBe("15/06/2024");
    });
  });

  // ─── formatDisplayTime ───────────────────────────────────────────────────────
  describe("formatDisplayTime", () => {
    it("should return '-' for null", () => {
      expect(formatDisplayTime(null)).toBe("-");
    });

    it("should return '-' for undefined", () => {
      expect(formatDisplayTime(undefined)).toBe("-");
    });

    it("should format time in 24h format", () => {
      const result = formatDisplayTime(UTC_DATE, UTC_SETTINGS);
      expect(result).toBe("10:30");
    });

    it("should format time in 12h format", () => {
      // 10:30 UTC = 06:30 AM New York
      const result = formatDisplayTime(UTC_DATE, US_SETTINGS_12H);
      expect(result).toMatch(/^06:30 AM$/i);
    });

    it("should correctly convert timezone offset in time", () => {
      // 10:30 UTC = 13:30 Istanbul
      const result = formatDisplayTime(UTC_DATE, TR_SETTINGS);
      expect(result).toBe("13:30");
    });

    it("should handle midnight correctly in 24h", () => {
      const midnight = "2024-06-15T00:00:00.000Z";
      const result = formatDisplayTime(midnight, UTC_SETTINGS);
      expect(result).toBe("00:00");
    });
  });

  // ─── formatDisplayDateTime ───────────────────────────────────────────────────
  describe("formatDisplayDateTime", () => {
    it("should return '-' for null", () => {
      expect(formatDisplayDateTime(null)).toBe("-");
    });

    it("should return '-' for undefined", () => {
      expect(formatDisplayDateTime(undefined)).toBe("-");
    });

    it("should combine date and time in 24h with UTC", () => {
      const result = formatDisplayDateTime(UTC_DATE, UTC_SETTINGS);
      expect(result).toBe("15/06/2024 10:30");
    });

    it("should combine date and time in 12h for New York", () => {
      const result = formatDisplayDateTime(UTC_DATE, US_SETTINGS_12H);
      expect(result).toMatch(/^06\/15\/2024 06:30 AM$/i);
    });

    it("should combine date and time for Istanbul", () => {
      const result = formatDisplayDateTime(UTC_DATE, TR_SETTINGS);
      expect(result).toBe("15.06.2024 13:30");
    });
  });

  // ─── getUserNow ───────────────────────────────────────────────────────────────
  describe("getUserNow", () => {
    it("should return a dayjs object", () => {
      const result = getUserNow("UTC");
      expect(typeof result.format).toBe("function");
      expect(typeof result.valueOf).toBe("function");
    });

    it("should return current time (within 2 seconds)", () => {
      const result = getUserNow("UTC");
      const now = Date.now();
      expect(Math.abs(result.valueOf() - now)).toBeLessThan(2000);
    });

    it("should return time in the specified timezone", () => {
      const utcNow = getUserNow("UTC");
      const istanbulNow = getUserNow("Europe/Istanbul");
      // Both represent the same moment in time, just different tz
      const diffMs = Math.abs(utcNow.valueOf() - istanbulNow.valueOf());
      expect(diffMs).toBeLessThan(100);
    });

    it("should default to UTC if no timezone provided", () => {
      const result = getUserNow();
      expect(result).toBeDefined();
    });
  });

  // ─── toUTC ────────────────────────────────────────────────────────────────────
  describe("toUTC", () => {
    it("should convert Istanbul local time string to UTC Date", () => {
      // 15:30 Istanbul (UTC+3) = 12:30 UTC
      const result = toUTC("2024-06-15 15:30:00", "Europe/Istanbul");
      const utcHour = dayjs.utc(result).hour();
      const utcMinute = dayjs.utc(result).minute();
      expect(utcHour).toBe(12);
      expect(utcMinute).toBe(30);
    });

    it("should convert New York local time string to UTC Date", () => {
      // 10:00 New York (UTC-4 in summer) = 14:00 UTC
      const result = toUTC("2024-06-15 10:00:00", "America/New_York");
      const utcHour = dayjs.utc(result).hour();
      expect(utcHour).toBe(14);
    });

    it("should return a JS Date instance", () => {
      const result = toUTC("2024-06-15 12:00:00", "UTC");
      expect(result).toBeInstanceOf(Date);
    });

    it("should handle Date object input", () => {
      // If a Date object is passed, it's treated as local
      const date = new Date("2024-06-15T00:00:00.000");
      const result = toUTC(date, "UTC");
      expect(result).toBeInstanceOf(Date);
    });
  });

  // ─── utcToUserTz ─────────────────────────────────────────────────────────────
  describe("utcToUserTz", () => {
    it("should return null for null input", () => {
      expect(utcToUserTz(null, "UTC")).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(utcToUserTz(undefined, "UTC")).toBeNull();
    });

    it("should convert UTC string to Istanbul timezone", () => {
      const result = utcToUserTz(UTC_DATE, "Europe/Istanbul");
      expect(result).not.toBeNull();
      expect(result!.hour()).toBe(13); // 10:30 UTC = 13:30 Istanbul
      expect(result!.minute()).toBe(30);
    });

    it("should convert UTC string to New York timezone", () => {
      const result = utcToUserTz(UTC_DATE, "America/New_York");
      expect(result).not.toBeNull();
      expect(result!.hour()).toBe(6); // 10:30 UTC = 06:30 NYC (UTC-4)
    });

    it("should accept a Date object as input", () => {
      const dateObj = new Date(UTC_DATE);
      const result = utcToUserTz(dateObj, "UTC");
      expect(result).not.toBeNull();
      expect(result!.hour()).toBe(10);
    });

    it("should accept a Unix timestamp (number)", () => {
      const ts = new Date(UTC_DATE).getTime();
      const result = utcToUserTz(ts, "UTC");
      expect(result).not.toBeNull();
      expect(result!.minute()).toBe(30);
    });
  });

  // ─── formatSmartTimestamp ─────────────────────────────────────────────────────
  describe("formatSmartTimestamp", () => {
    it("should return '-' for null", () => {
      expect(formatSmartTimestamp(null)).toBe("-");
    });

    it("should return '-' for undefined", () => {
      expect(formatSmartTimestamp(undefined)).toBe("-");
    });

    it("should return only time (HH:mm) if the date is today in 24h", () => {
      const now = new Date().toISOString();
      const result = formatSmartTimestamp(now, UTC_SETTINGS);
      // Today → only time portion
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should return full date+time if the date is NOT today", () => {
      // A fixed date far in the past
      const pastDate = "2020-01-01T12:00:00.000Z";
      const result = formatSmartTimestamp(pastDate, UTC_SETTINGS);
      // Should contain date portion (year 2020)
      expect(result).toContain("2020");
    });

    it("should return 12h time format for today if settings say 12h", () => {
      const now = new Date().toISOString();
      const result = formatSmartTimestamp(now, {
        ...UTC_SETTINGS,
        timeFormat: "12h",
      });
      // Today → only time, 12h → contains AM or PM
      expect(result).toMatch(/AM|PM/i);
    });

    it("should return full format for past date with 12h setting", () => {
      const pastDate = "2020-06-10T18:00:00.000Z";
      const result = formatSmartTimestamp(pastDate, {
        ...UTC_SETTINGS,
        timeFormat: "12h",
      });
      expect(result).toContain("2020");
      expect(result).toMatch(/PM/i); // 18:00 UTC = 06:00 PM
    });
  });
});

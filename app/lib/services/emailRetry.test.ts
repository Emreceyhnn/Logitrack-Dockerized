import { describe, it, mock, before } from "node:test";
import { expect } from "expect";

mock.module("@/app/lib/logger.ts", {
  namedExports: {
    logger: {
      warn: mock.fn(),
      error: mock.fn(),
      info: mock.fn(),
    },
  },
});

describe("Email Retry", () => {
  let retry: unknown;

  before(async () => {
    retry = await import("./emailRetry");
  });

  describe("isRetryableEmailError() metodu", () => {
    it("should_ReturnTrue_WhenStatusIsTransient", () => {
      // 429 and 5xx would likely succeed a moment later
      expect(retry.isRetryableEmailError({ statusCode: 429 })).toBe(true);
      expect(retry.isRetryableEmailError({ statusCode: 500 })).toBe(true);
      expect(retry.isRetryableEmailError({ statusCode: 503 })).toBe(true);
    });

    it("should_ReturnFalse_WhenStatusIsPermanent", () => {
      // A bad address or unverified domain cannot fix itself — retrying
      // only burns quota and delays the caller.
      expect(retry.isRetryableEmailError({ statusCode: 422 })).toBe(false);
      expect(retry.isRetryableEmailError({ statusCode: 403 })).toBe(false);
      expect(retry.isRetryableEmailError({ statusCode: 401 })).toBe(false);
    });

    it("should_ReturnTrue_WhenNetworkErrorHasNoStatus", () => {
      // Network failures surface as a plain Error with no statusCode
      expect(retry.isRetryableEmailError(new Error("fetch failed"))).toBe(true);
      expect(retry.isRetryableEmailError(new Error("ECONNRESET"))).toBe(true);
      expect(retry.isRetryableEmailError(new Error("socket hang up"))).toBe(true);
    });

    it("should_ReturnFalse_WhenErrorIsUnrecognised", () => {
      expect(retry.isRetryableEmailError(new Error("invalid `to` field"))).toBe(false);
      expect(retry.isRetryableEmailError(null)).toBe(false);
    });
  });

  describe("withEmailRetry() metodu", () => {
    it("should_ReturnImmediately_WhenFirstAttemptSucceeds", async () => {
      // Arrange
      let calls = 0;
      const op = async () => {
        calls++;
        return "sent";
      };

      // Act
      const result = await retry.withEmailRetry(op, "test");

      // Assert
      expect(result).toBe("sent");
      expect(calls).toBe(1);
    });

    it("should_RetryAndSucceed_WhenFirstAttemptIsTransient", async () => {
      // Arrange — fails once with a 429, then succeeds
      let calls = 0;
      const op = async () => {
        calls++;
        if (calls === 1) throw Object.assign(new Error("rate limited"), { statusCode: 429 });
        return "sent";
      };

      // Act
      const result = await retry.withEmailRetry(op, "test");

      // Assert — the transient blip is absorbed rather than lost
      expect(result).toBe("sent");
      expect(calls).toBe(2);
    });

    it("should_NotRetry_WhenErrorIsPermanent", async () => {
      // Arrange
      let calls = 0;
      const op = async () => {
        calls++;
        throw Object.assign(new Error("invalid address"), { statusCode: 422 });
      };

      // Act + Assert — fails on the first attempt, no wasted quota
      await expect(retry.withEmailRetry(op, "test")).rejects.toThrow(/invalid address/);
      expect(calls).toBe(1);
    });

    it("should_ThrottleConcurrentSends_BelowProviderRateLimit", async () => {
      // Arrange — Resend allows 10 req/s. Batch senders fan out with Promise.all,
      // so without a gate a 12-recipient burst fires 12 requests at once and most
      // are rejected with 429 (verified against the live API before this fix).
      const timestamps: number[] = [];
      const op = async () => {
        timestamps.push(Date.now());
        return "sent";
      };

      // Act — fire concurrently, exactly as sendNotificationEmail does
      const start = Date.now();
      await Promise.all(
        Array.from({ length: 12 }, () => retry.withEmailRetry(op, "burst"))
      );

      // Assert — releases are spaced, so no one-second window exceeds the limit
      expect(timestamps.length).toBe(12);
      for (let i = 1; i < timestamps.length; i++) {
        const withinOneSecond = timestamps.filter(
          (t) => t > timestamps[i]! - 1000 && t <= timestamps[i]!
        ).length;
        expect(withinOneSecond).toBeLessThanOrEqual(10);
      }
      // 12 sends at ~8/s cannot complete instantly
      expect(Date.now() - start).toBeGreaterThan(1000);
    });

    it("should_NotWedgeQueue_WhenOneSendFails", async () => {
      // Arrange — a permanent failure must not block later sends, since the
      // gate is shared by every sender in the process.
      const failing = retry.withEmailRetry(async () => {
        throw Object.assign(new Error("bad address"), { statusCode: 422 });
      }, "failing");

      await expect(failing).rejects.toThrow(/bad address/);

      // Act + Assert — the queue still drains afterwards
      const result = await retry.withEmailRetry(async () => "sent", "after");
      expect(result).toBe("sent");
    });

    it("should_ExhaustAttemptsAndRethrow_WhenAlwaysTransient", async () => {
      // Arrange
      let calls = 0;
      const op = async () => {
        calls++;
        throw Object.assign(new Error("still down"), { statusCode: 503 });
      };

      // Act + Assert — caps at 3 attempts, then surfaces the loss to the caller
      // rather than swallowing it.
      await expect(retry.withEmailRetry(op, "test")).rejects.toThrow(/still down/);
      expect(calls).toBe(3);
    });
  });
});

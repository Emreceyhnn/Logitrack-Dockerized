import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

const redisGetMock = mock.fn(async (): Promise<unknown> => null);
const redisSetMock = mock.fn(async () => "OK");

mock.module("server-only", { namedExports: {} });
mock.module("@/app/lib/redis", {
  namedExports: { redis: { get: redisGetMock, set: redisSetMock } },
});
mock.module("@/app/lib/logger", {
  namedExports: { logger: { warn: () => {}, error: () => {}, info: () => {} } },
});

describe("controllers/admin/announcement.ts", () => {
  let getAnnouncement: () => Promise<{ active: boolean; message: string }>;
  let setAnnouncement: (
    id: string,
    input: { active: boolean; message: string; severity: string }
  ) => Promise<{ active: boolean; message: string; updatedBy: string | null }>;

  before(async () => {
    const mod = await import("./announcement");
    getAnnouncement = mod.getAnnouncement as typeof getAnnouncement;
    setAnnouncement = mod.setAnnouncement as typeof setAnnouncement;
  });

  beforeEach(() => {
    redisGetMock.mock.resetCalls();
    redisSetMock.mock.resetCalls();
    redisGetMock.mock.mockImplementation(async () => null);
    redisSetMock.mock.mockImplementation(async () => "OK");
  });

  describe("getAnnouncement", () => {
    it("returns an inactive default when nothing is stored", async () => {
      const result = await getAnnouncement();
      expect(result.active).toBe(false);
      expect(result.message).toBe("");
    });

    // Failing to read a banner must never break the page that renders it.
    it("falls back to the default when Redis throws", async () => {
      redisGetMock.mock.mockImplementation(async () => {
        throw new Error("redis down");
      });
      const result = await getAnnouncement();
      expect(result.active).toBe(false);
    });

    it("returns the stored announcement", async () => {
      redisGetMock.mock.mockImplementation(async () => ({
        active: true,
        message: "Maintenance tonight",
        severity: "warning",
        updatedAt: "2026-01-01T00:00:00.000Z",
        updatedBy: "admin1",
      }));
      const result = await getAnnouncement();
      expect(result.active).toBe(true);
      expect(result.message).toBe("Maintenance tonight");
    });
  });

  describe("setAnnouncement", () => {
    it("publishes a valid announcement", async () => {
      const result = await setAnnouncement("admin1", {
        active: true,
        message: "Scheduled maintenance",
        severity: "warning",
      });
      expect(result.active).toBe(true);
      expect(redisSetMock.mock.callCount()).toBe(1);
    });

    it("records who published it", async () => {
      const result = await setAnnouncement("admin42", {
        active: true,
        message: "Hello",
        severity: "info",
      });
      expect(result.updatedBy).toBe("admin42");
    });

    // An active banner with no text would render an empty coloured bar to
    // every user.
    it("rejects an active announcement with an empty message", async () => {
      await expect(
        setAnnouncement("admin1", {
          active: true,
          message: "   ",
          severity: "info",
        })
      ).rejects.toThrow("needs a message");
      expect(redisSetMock.mock.callCount()).toBe(0);
    });

    it("allows clearing with an empty message", async () => {
      const result = await setAnnouncement("admin1", {
        active: false,
        message: "",
        severity: "info",
      });
      expect(result.active).toBe(false);
      expect(redisSetMock.mock.callCount()).toBe(1);
    });

    it("rejects a message over the length cap", async () => {
      await expect(
        setAnnouncement("admin1", {
          active: true,
          message: "x".repeat(281),
          severity: "info",
        })
      ).rejects.toThrow("280 characters");
    });

    it("trims surrounding whitespace", async () => {
      const result = await setAnnouncement("admin1", {
        active: true,
        message: "  padded  ",
        severity: "info",
      });
      expect(result.message).toBe("padded");
    });

    // The banner must survive until an operator takes it down; an expiring
    // key would silently revert what users see.
    it("stores the banner without a TTL", async () => {
      await setAnnouncement("admin1", {
        active: true,
        message: "Persist me",
        severity: "info",
      });
      const args = redisSetMock.mock.calls[0]?.arguments;
      expect(args?.[2]).toBeUndefined();
    });
  });
});

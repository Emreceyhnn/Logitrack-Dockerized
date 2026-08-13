import { describe, it, mock } from "node:test";
import { expect } from "expect";
import "dotenv/config";

// Mock next/headers so that calling cookies() during tests doesn't log a request scope error
mock.module("next/headers", {
  namedExports: {
    cookies: mock.fn(() => ({
      get: mock.fn(() => null),
      set: mock.fn(),
    })),
    headers: mock.fn(() => ({
      get: mock.fn(() => null),
    })),
  },
});

// uploadImageAction rate-limits anonymous callers via ../rate-limiter, which
// falls back to a real Redis connection when unmocked. Without this, these
// tests silently depend on real Redis reachability/timing and on a
// module-level in-memory counter that persists across repeated runs within
// the same rate-limit window — causing "Should reject oversized images" to
// intermittently fail with "Too many uploads" once the shared counter for
// 127.0.0.1 (the test's fallback IP) climbs past the limit.
mock.module("./rate-limiter.ts", {
  namedExports: {
    rateLimit: mock.fn(async () => ({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
    })),
  },
});

describe("Testing Cloudinary Connection & Upload Actions", async () => {
  const { cloudinary, BUCKET_DELIVERY_TYPE } = await import("./cloudinary");
  const { uploadImageAction, getSignedUrlAction } =
    await import("./actions/upload");

  it("Should properly instantiate the Cloudinary client", () => {
    expect(cloudinary).toBeDefined();
    expect(cloudinary.uploader).toBeDefined();
    expect(cloudinary.config().cloud_name).toBeTruthy();
    expect(cloudinary.config().api_key).toBeTruthy();
  });

  it("Should keep the documents bucket on authenticated delivery", () => {
    // Regression guard: flipping this to "upload" would make every stored
    // document publicly readable from its bare URL, silently voiding the
    // ownership check in getSignedUrlAction.
    expect(BUCKET_DELIVERY_TYPE.documents).toBe("authenticated");
  });

  describe("uploadImageAction Validation", () => {
    it("Should reject empty file data", async () => {
      await expect(uploadImageAction("", "general", "test")).rejects.toThrow(
        "File data is required."
      );
    });

    it("Should reject unsupported image types", async () => {
      await expect(
        uploadImageAction("data:text/plain;base64,dGVzdA==", "general", "test")
      ).rejects.toThrow(/Unsupported file type/);
    });

    it("Should reject oversized images", async () => {
      const largeBase64 = "data:image/jpeg;base64," + "A".repeat(15000000);
      await expect(
        uploadImageAction(largeBase64, "general", "test")
      ).rejects.toThrow("File size exceeds the 10 MB limit.");
    });
  });

  describe("getSignedUrlAction Validation (Unauthenticated)", () => {
    it("Should redirect because user is unauthenticated", async () => {
      await expect(
        getSignedUrlAction("https://example.com/file", "documents")
      ).rejects.toThrow("NEXT_REDIRECT");
    });
  });
});

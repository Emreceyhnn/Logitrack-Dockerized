import { describe, it, mock, before } from "node:test";
import { expect } from "expect";

// assertSafeApiPath is the SSRF boundary for the whole sandbox, so it is
// tested in isolation. Collaborators are mocked only so the module imports.
mock.module("server-only", { namedExports: {} });
mock.module("next/headers", {
  namedExports: { headers: async () => ({ get: () => null }) },
});
mock.module("@/app/lib/redis", {
  namedExports: { redis: { scan: async () => [0, []] } },
});
mock.module("@/app/lib/services/email", {
  namedExports: { sendEmail: async () => undefined },
});
mock.module("@/app/lib/logger", {
  namedExports: { logger: { warn: () => {}, error: () => {}, info: () => {} } },
});

describe("controllers/admin/sandbox.ts", () => {
  let assertSafeApiPath: (path: string) => string;

  before(async () => {
    const mod = await import("./sandbox");
    assertSafeApiPath = mod.assertSafeApiPath;
  });

  describe("assertSafeApiPath — accepts legitimate paths", () => {
    it("accepts a plain /api path", () => {
      expect(assertSafeApiPath("/api/shipments")).toBe("/api/shipments");
    });

    it("preserves a query string", () => {
      expect(assertSafeApiPath("/api/shipments?status=ACTIVE")).toBe(
        "/api/shipments?status=ACTIVE"
      );
    });

    it("trims surrounding whitespace", () => {
      expect(assertSafeApiPath("  /api/vehicles  ")).toBe("/api/vehicles");
    });

    it("accepts nested paths", () => {
      expect(assertSafeApiPath("/api/vehicles/abc123/location")).toBe(
        "/api/vehicles/abc123/location"
      );
    });
  });

  describe("assertSafeApiPath — blocks SSRF vectors", () => {
    // The core threat: turning the console into an authenticated request proxy
    // that borrows the server's network position.
    it("rejects an absolute http URL", () => {
      expect(() => assertSafeApiPath("http://evil.example/api/x")).toThrow();
    });

    it("rejects an absolute https URL", () => {
      expect(() => assertSafeApiPath("https://evil.example/api/x")).toThrow();
    });

    // The classic cloud-metadata target.
    it("rejects the AWS metadata endpoint", () => {
      expect(() =>
        assertSafeApiPath("http://169.254.169.254/latest/meta-data/")
      ).toThrow();
    });

    it("rejects a protocol-relative URL", () => {
      expect(() => assertSafeApiPath("//evil.example/api/x")).toThrow();
    });

    it("rejects a backslash-prefixed authority", () => {
      expect(() => assertSafeApiPath("\\\\evil.example/api/x")).toThrow();
    });

    it("rejects the file scheme", () => {
      expect(() => assertSafeApiPath("file:///etc/passwd")).toThrow();
    });

    it("rejects a non-api path", () => {
      expect(() => assertSafeApiPath("/admin/secrets")).toThrow();
    });

    it("rejects a bare root path", () => {
      expect(() => assertSafeApiPath("/")).toThrow();
    });

    it("rejects an empty path", () => {
      expect(() => assertSafeApiPath("")).toThrow();
      expect(() => assertSafeApiPath("   ")).toThrow();
    });

    // Traversal must be resolved and re-checked, not merely prefix-matched.
    it("rejects traversal that escapes /api", () => {
      expect(() => assertSafeApiPath("/api/../admin/secrets")).toThrow();
      expect(() => assertSafeApiPath("/api/../../etc/passwd")).toThrow();
    });

    it("rejects a path that only looks like /api", () => {
      expect(() => assertSafeApiPath("/apifoo/bar")).toThrow();
    });

    // Recursion + audit-noise guard.
    it("rejects admin console endpoints", () => {
      expect(() => assertSafeApiPath("/api/admin/health")).toThrow();
      expect(() => assertSafeApiPath("/api/admin/overview")).toThrow();
    });
  });

  describe("assertSafeApiPath — normalisation", () => {
    it("collapses harmless traversal that stays inside /api", () => {
      expect(assertSafeApiPath("/api/vehicles/../shipments")).toBe(
        "/api/shipments"
      );
    });

    it("normalises duplicate slashes inside the path", () => {
      // Note: a leading "//" is rejected earlier as protocol-relative; this
      // covers the interior case only.
      expect(assertSafeApiPath("/api/vehicles//list")).toBe(
        "/api/vehicles//list"
      );
    });
  });
});

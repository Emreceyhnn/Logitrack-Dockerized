import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// getAuthenticatedUser authenticates on the JWT alone: it reads the `token`
// cookie, verifies the signature, then checks the Redis revocation denylist.
// These mocks stand in for those three collaborators.
const cookieStoreMock = {
  get: mock.fn<(name: string) => { value: string } | undefined>(),
};
const cookiesMock = mock.fn(async () => cookieStoreMock);
const headersMock = mock.fn(async () => new Map<string, string>());
const jwtVerifyMock = mock.fn<(...args: unknown[]) => unknown>();
const redisGetMock = mock.fn<(...args: unknown[]) => unknown>(async () => null);
const rateLimitMock = mock.fn(async () => ({ success: true }));
const redirectMock = mock.fn<(...args: unknown[]) => unknown>();

mock.module("next/headers", {
  namedExports: { cookies: cookiesMock, headers: headersMock },
});

mock.module("next/navigation", {
  namedExports: { redirect: redirectMock },
});

mock.module("jose", {
  namedExports: { jwtVerify: jwtVerifyMock },
});

mock.module("./redis.ts", {
  namedExports: { redis: { get: redisGetMock } },
});

mock.module("./rate-limiter.ts", {
  namedExports: { rateLimit: rateLimitMock },
});

mock.module("./controllers/session/internal.ts", {
  namedExports: {
    getJwtSecret: () => "test-secret",
    hashToken: (t: string) => `hash(${t})`,
    revokedTokenKey: (h: string) => `revoked:token:${h}`,
  },
});

mock.module("react", {
  namedExports: { cache: (fn: unknown) => fn },
});

mock.module("./constants.ts", {
  namedExports: { DEFAULT_LOCALE: "en", LOCALES: ["en", "tr", "de"] },
});

describe("auth-middleware.ts", () => {
  let getAuthenticatedUser: () => Promise<unknown>;
  let authenticatedAction: (fn: unknown) => (...a: unknown[]) => Promise<unknown>;
  let maybeAuthenticatedAction: (fn: unknown) => (...a: unknown[]) => Promise<unknown>;

  before(async () => {
    const mod = await import("./auth-middleware");
    getAuthenticatedUser = mod.getAuthenticatedUser;
    authenticatedAction = mod.authenticatedAction;
    maybeAuthenticatedAction = mod.maybeAuthenticatedAction;
  });

  beforeEach(() => {
    cookieStoreMock.get.mock.resetCalls();
    cookiesMock.mock.resetCalls();
    jwtVerifyMock.mock.resetCalls();
    redisGetMock.mock.resetCalls();
    rateLimitMock.mock.resetCalls();
    redirectMock.mock.resetCalls();

    // Restore default implementations — a per-test override (e.g. the
    // DYNAMIC_SERVER_USAGE case) must not leak into the next test.
    cookiesMock.mock.mockImplementation(async () => cookieStoreMock);
    cookieStoreMock.get.mock.mockImplementation(() => ({ value: "valid.jwt" }));
    jwtVerifyMock.mock.mockImplementation(async () => ({
      payload: {
        id: "user-1",
        companyId: "comp-1",
        role: "role-1",
        roleName: "Admin",
        sessionId: "sess-1",
        currency: "EUR",
        language: "tr",
      },
    }));
    redisGetMock.mock.mockImplementation(async () => null);
    rateLimitMock.mock.mockImplementation(async () => ({ success: true }));
    redirectMock.mock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  describe("getAuthenticatedUser", () => {
    it("should return the formatted user for a valid, non-revoked token", async () => {
      const user = (await getAuthenticatedUser()) as { id: string; currency: string };
      expect(user).toBeDefined();
      expect(user.id).toBe("user-1");
      expect(user.currency).toBe("EUR");
    });

    it("should return null when there is no token cookie", async () => {
      cookieStoreMock.get.mock.mockImplementation(() => undefined);
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
      // No signature verification attempted without a token
      expect(jwtVerifyMock.mock.calls.length).toBe(0);
    });

    it("should return null when the JWT signature is invalid", async () => {
      jwtVerifyMock.mock.mockImplementation(async () => {
        throw new Error("bad signature");
      });
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
    });

    it("should return null when the token is on the revocation denylist", async () => {
      // The session was revoked (logout / admin action) while the token is
      // still signature-valid — the denylist must reject it immediately.
      redisGetMock.mock.mockImplementation(async () => "1");
      const user = await getAuthenticatedUser();
      expect(user).toBeNull();
      expect(redisGetMock.mock.calls[0].arguments[0]).toBe(
        "revoked:token:hash(valid.jwt)"
      );
    });

    it("should fail-open (allow) when the revocation Redis check errors", async () => {
      // A transient Redis outage must not log everyone out — the signature is
      // still valid and the token is short-lived.
      const consoleMock = mock.method(console, "warn", () => {});
      redisGetMock.mock.mockImplementation(async () => {
        throw new Error("redis down");
      });
      const user = (await getAuthenticatedUser()) as { id: string };
      expect(user).toBeDefined();
      expect(user.id).toBe("user-1");
      consoleMock.mock.restore();
    });

    it("should re-throw DYNAMIC_SERVER_USAGE errors", async () => {
      cookiesMock.mock.mockImplementation(async () => {
        const err = new Error("Dynamic") as Error & { digest?: string };
        err.digest = "DYNAMIC_SERVER_USAGE";
        throw err;
      });
      await expect(getAuthenticatedUser()).rejects.toThrow("Dynamic");
    });
  });

  describe("authenticatedAction", () => {
    it("should redirect to the fallback locale when unauthenticated", async () => {
      cookieStoreMock.get.mock.mockImplementation(() => undefined);
      headersMock.mock.mockImplementation(async () => new Map([["other", "value"]]));

      const action = authenticatedAction(async () => "success");
      await expect(action()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirectMock.mock.calls[0].arguments[0]).toBe("/en/auth/sign-in");
    });

    it("should use the referer locale on redirect", async () => {
      cookieStoreMock.get.mock.mockImplementation(() => undefined);
      headersMock.mock.mockImplementation(
        async () => new Map([["referer", "http://localhost:3000/tr/dashboard"]])
      );

      const action = authenticatedAction(async () => "success");
      await expect(action()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirectMock.mock.calls[0].arguments[0]).toBe("/tr/auth/sign-in");
    });

    it("should run the action with the resolved user when authenticated", async () => {
      const action = authenticatedAction(
        async (user: { id: string }, arg1: string) => `${user.id} - ${arg1}`
      );
      const result = await action("test-arg");
      expect(result).toBe("user-1 - test-arg");
    });
  });

  describe("maybeAuthenticatedAction", () => {
    it("should run the action with the user when authenticated", async () => {
      const action = maybeAuthenticatedAction(
        async (user: { id: string } | null) => user?.id ?? null
      );
      expect(await action()).toBe("user-1");
    });

    it("should run the action with null when unauthenticated", async () => {
      cookieStoreMock.get.mock.mockImplementation(() => undefined);
      const action = maybeAuthenticatedAction(
        async (user: unknown) => user ?? "was-null"
      );
      expect(await action()).toBe("was-null");
    });
  });
});

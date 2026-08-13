import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// platform-admin.ts gates cross-tenant access. These mocks stand in for its
// collaborators so the tests can assert on authorization behaviour alone:
// who gets through, who is denied, and what lands in the audit log.
const getAuthenticatedUserMock = mock.fn<() => Promise<unknown>>();
const runAsSystemMock = mock.fn(<T>(fn: () => T): T => fn());
const rateLimitMock = mock.fn(async () => ({ success: true }));
const logAuditEventMock = mock.fn(async () => undefined);
const redirectMock = mock.fn<(...args: unknown[]) => unknown>(() => {
  // next/navigation's redirect throws to halt rendering; mirror that so the
  // tests can assert control flow actually stops.
  throw new Error("NEXT_REDIRECT");
});

const headerMap = new Map<string, string>();
const headersMock = mock.fn(async () => ({
  get: (k: string) => headerMap.get(k) ?? null,
}));

mock.module("next/headers", {
  namedExports: { headers: headersMock },
});

mock.module("next/navigation", {
  namedExports: { redirect: redirectMock },
});

mock.module("react", {
  namedExports: { cache: (fn: unknown) => fn },
});

mock.module("server-only", { namedExports: {} });

mock.module("./auth-middleware.ts", {
  namedExports: { getAuthenticatedUser: getAuthenticatedUserMock },
});

mock.module("./tenant-context.ts", {
  namedExports: { runAsSystem: runAsSystemMock },
});

mock.module("./rate-limiter.ts", {
  namedExports: { rateLimit: rateLimitMock },
});

mock.module("./controllers/session/audit.ts", {
  namedExports: { logAuditEvent: logAuditEventMock },
});

mock.module("./constants.ts", {
  namedExports: { DEFAULT_LOCALE: "en", LOCALES: ["en", "tr"] },
});

mock.module("@/app/lib/logger", {
  namedExports: { logger: { warn: () => {}, error: () => {}, info: () => {} } },
});

type AdminUser = {
  id: string;
  sessionId: string;
  companyId: string | null;
};

const ADMIN: AdminUser = {
  id: "user_admin_1",
  sessionId: "sess_1",
  companyId: "company_1",
};

const NON_ADMIN: AdminUser = {
  id: "user_regular_9",
  sessionId: "sess_9",
  companyId: "company_2",
};

describe("platform-admin.ts", () => {
  let isPlatformAdmin: (u: unknown) => boolean;
  let platformAdminAction: <T>(
    op: string,
    fn: (u: unknown, ...a: unknown[]) => Promise<T>
  ) => (...a: unknown[]) => Promise<T>;
  let requirePlatformAdmin: () => Promise<unknown>;

  before(async () => {
    const mod = await import("./platform-admin");
    isPlatformAdmin = mod.isPlatformAdmin;
    platformAdminAction = mod.platformAdminAction as typeof platformAdminAction;
    requirePlatformAdmin = mod.requirePlatformAdmin;
  });

  beforeEach(() => {
    getAuthenticatedUserMock.mock.resetCalls();
    runAsSystemMock.mock.resetCalls();
    rateLimitMock.mock.resetCalls();
    logAuditEventMock.mock.resetCalls();
    redirectMock.mock.resetCalls();
    headerMap.clear();
    rateLimitMock.mock.mockImplementation(async () => ({ success: true }));
    process.env.PLATFORM_ADMIN_USER_IDS = ADMIN.id;
  });

  describe("isPlatformAdmin", () => {
    it("accepts a user on the allowlist", () => {
      expect(isPlatformAdmin(ADMIN)).toBe(true);
    });

    it("rejects a user not on the allowlist", () => {
      expect(isPlatformAdmin(NON_ADMIN)).toBe(false);
    });

    it("rejects null", () => {
      expect(isPlatformAdmin(null)).toBe(false);
    });

    // Fail-closed is the whole point: a missing or fat-fingered env var must
    // lock everyone out rather than open the console to all signed-in users.
    it("fails closed when the allowlist is unset", () => {
      delete process.env.PLATFORM_ADMIN_USER_IDS;
      expect(isPlatformAdmin(ADMIN)).toBe(false);
    });

    it("fails closed when the allowlist is empty or whitespace", () => {
      process.env.PLATFORM_ADMIN_USER_IDS = "  ,  ,";
      expect(isPlatformAdmin(ADMIN)).toBe(false);
    });

    it("parses a comma-separated list with stray whitespace", () => {
      process.env.PLATFORM_ADMIN_USER_IDS = " user_x , user_admin_1 ,user_y ";
      expect(isPlatformAdmin(ADMIN)).toBe(true);
      expect(isPlatformAdmin({ ...ADMIN, id: "user_y" })).toBe(true);
      expect(isPlatformAdmin(NON_ADMIN)).toBe(false);
    });

    // Guards against a substring match creeping in (e.g. via `includes`).
    it("requires an exact id match", () => {
      expect(isPlatformAdmin({ ...ADMIN, id: "user_admin_11" })).toBe(false);
      expect(isPlatformAdmin({ ...ADMIN, id: "user_admin_" })).toBe(false);
    });
  });

  describe("platformAdminAction", () => {
    it("runs the action for a platform admin", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);
      const action = mock.fn(async () => "ok");

      const result = await platformAdminAction("tenants.list", action)();

      expect(result).toBe("ok");
      expect(action.mock.callCount()).toBe(1);
    });

    // The console is cross-tenant by design; this is the assertion that it
    // actually opens the tenant guard rather than silently returning nothing.
    it("runs the action inside runAsSystem", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);

      await platformAdminAction("tenants.list", async () => "ok")();

      expect(runAsSystemMock.mock.callCount()).toBe(1);
    });

    it("throws ForbiddenError for a non-admin", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => NON_ADMIN);
      const action = mock.fn(async () => "ok");

      await expect(
        platformAdminAction("tenants.list", action)()
      ).rejects.toThrow("Platform administrator access required");

      expect(action.mock.callCount()).toBe(0);
      // Critical: denial must never reach cross-tenant scope.
      expect(runAsSystemMock.mock.callCount()).toBe(0);
    });

    it("records an audit entry when access is denied", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => NON_ADMIN);

      await expect(
        platformAdminAction("tenants.list", async () => "ok")()
      ).rejects.toThrow();

      expect(logAuditEventMock.mock.callCount()).toBe(1);
      const arg = logAuditEventMock.mock.calls[0]?.arguments[0] as {
        userId: string;
        metadata: { outcome: string; operation: string; scope: string };
      };
      expect(arg.userId).toBe(NON_ADMIN.id);
      expect(arg.metadata.outcome).toBe("denied");
      expect(arg.metadata.operation).toBe("tenants.list");
      expect(arg.metadata.scope).toBe("platform-admin");
    });

    it("records an audit entry with the operation name on success", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);

      await platformAdminAction("users.masquerade", async () => "ok")();

      expect(logAuditEventMock.mock.callCount()).toBe(1);
      const arg = logAuditEventMock.mock.calls[0]?.arguments[0] as {
        userId: string;
        metadata: { outcome: string; operation: string };
      };
      expect(arg.userId).toBe(ADMIN.id);
      expect(arg.metadata.outcome).toBe("invoked");
      expect(arg.metadata.operation).toBe("users.masquerade");
    });

    it("captures ip and user-agent in the audit entry", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);
      headerMap.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");
      headerMap.set("user-agent", "Mozilla/5.0");

      await platformAdminAction("tenants.list", async () => "ok")();

      const arg = logAuditEventMock.mock.calls[0]?.arguments[0] as {
        ipAddress: string;
        deviceInfo: string;
      };
      // Only the client-most hop is meaningful; the rest is proxy chain.
      expect(arg.ipAddress).toBe("203.0.113.7");
      expect(arg.deviceInfo).toBe("Mozilla/5.0");
    });

    it("redirects to sign-in when unauthenticated", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => null);
      const action = mock.fn(async () => "ok");

      await expect(
        platformAdminAction("tenants.list", action)()
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(action.mock.callCount()).toBe(0);
    });

    it("throws RateLimitError when the limiter rejects", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);
      rateLimitMock.mock.mockImplementation(async () => ({ success: false }));
      const action = mock.fn(async () => "ok");

      await expect(
        platformAdminAction("tenants.list", action)()
      ).rejects.toThrow("Too many requests");

      expect(action.mock.callCount()).toBe(0);
      expect(runAsSystemMock.mock.callCount()).toBe(0);
    });

    it("forwards arguments and resolves the action result", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);

      const result = await platformAdminAction(
        "tenants.get",
        async (_user: unknown, id: unknown) => `tenant:${String(id)}`
      )("company_42");

      expect(result).toBe("tenant:company_42");
    });
  });

  describe("requirePlatformAdmin", () => {
    it("returns the user for a platform admin", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ADMIN);
      await expect(requirePlatformAdmin()).resolves.toEqual(ADMIN);
    });

    it("redirects an unauthenticated visitor", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => null);
      await expect(requirePlatformAdmin()).rejects.toThrow("NEXT_REDIRECT");
    });

    // Redirect, not 403 — a signed-in non-admin should not be able to confirm
    // the console exists by probing the URL.
    it("redirects a signed-in non-admin away from the console", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => NON_ADMIN);
      await expect(requirePlatformAdmin()).rejects.toThrow("NEXT_REDIRECT");

      const target = redirectMock.mock.calls[0]?.arguments[0];
      expect(String(target)).toContain("/overview");
    });
  });
});

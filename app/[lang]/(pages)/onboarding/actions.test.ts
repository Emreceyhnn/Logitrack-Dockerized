import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// canCreateCompany/checkAndSyncCompany must decide from DB-resolved
// entitlement, not the JWT claim alone: an approved demo request only marks
// the session stale for the edge proxy, and these Server Actions never go
// through the proxy. These tests pin that a stale "NONE" JWT claim next to a
// fresh "TRIAL" DB entitlement (i) still unlocks company creation and (ii)
// triggers a session refresh so the JWT catches up.
const getAuthenticatedUserMock = mock.fn<() => Promise<unknown>>();
const dbUserFindUniqueMock = mock.fn<() => Promise<unknown>>();
const refreshSessionMock = mock.fn(async () => true);
const resolveEntitlementMock = mock.fn<() => Promise<unknown>>();

mock.module("server-only", { namedExports: {} });

mock.module("@/app/lib/auth-middleware", {
  namedExports: { getAuthenticatedUser: getAuthenticatedUserMock },
});

mock.module("@/app/lib/db", {
  namedExports: {
    db: { user: { findUnique: dbUserFindUniqueMock } },
  },
});

mock.module("@/app/lib/controllers/session", {
  namedExports: { refreshSession: refreshSessionMock },
});

mock.module("@/app/lib/entitlement.server", {
  namedExports: { resolveEntitlement: resolveEntitlementMock },
});

const STALE_USER = {
  id: "u1",
  companyId: null,
  accessStatus: "NONE",
  trialEndsAt: null,
};

describe("onboarding/actions.ts", () => {
  let canCreateCompany: () => Promise<boolean>;

  before(async () => {
    const mod = await import("./actions");
    canCreateCompany = mod.canCreateCompany;
  });

  beforeEach(() => {
    for (const m of [
      getAuthenticatedUserMock,
      dbUserFindUniqueMock,
      refreshSessionMock,
      resolveEntitlementMock,
    ]) {
      m.mock.resetCalls();
    }
    getAuthenticatedUserMock.mock.mockImplementation(
      async () => STALE_USER
    );
  });

  describe("canCreateCompany", () => {
    it("returns false for a signed-out visitor", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => null);
      expect(await canCreateCompany()).toBe(false);
      expect(resolveEntitlementMock.mock.callCount()).toBe(0);
    });

    it("returns false when the DB entitlement is also NONE", async () => {
      resolveEntitlementMock.mock.mockImplementation(async () => ({
        accessStatus: "NONE",
        trialEndsAt: null,
      }));

      expect(await canCreateCompany()).toBe(false);
      expect(refreshSessionMock.mock.callCount()).toBe(0);
    });

    // The exact loop reported: JWT still says NONE, but an approved demo
    // request already wrote a live TRIAL to the DB.
    it("returns true and refreshes the session when the DB entitlement moved past a stale NONE claim", async () => {
      const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      resolveEntitlementMock.mock.mockImplementation(async () => ({
        accessStatus: "TRIAL",
        trialEndsAt,
      }));

      const result = await canCreateCompany();

      expect(result).toBe(true);
      expect(refreshSessionMock.mock.callCount()).toBe(1);
    });

    it("does not refresh the session when the DB entitlement matches the JWT claim", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ({
        ...STALE_USER,
        accessStatus: "ACTIVE",
        trialEndsAt: null,
      }));
      resolveEntitlementMock.mock.mockImplementation(async () => ({
        accessStatus: "ACTIVE",
        trialEndsAt: null,
      }));

      const result = await canCreateCompany();

      expect(result).toBe(true);
      expect(refreshSessionMock.mock.callCount()).toBe(0);
    });

    it("returns false for an expired trial even if the stale JWT still says TRIAL", async () => {
      getAuthenticatedUserMock.mock.mockImplementation(async () => ({
        ...STALE_USER,
        accessStatus: "TRIAL",
        trialEndsAt: Date.now() + 1000,
      }));
      resolveEntitlementMock.mock.mockImplementation(async () => ({
        accessStatus: "EXPIRED",
        trialEndsAt: Date.now() - 1000,
      }));

      const result = await canCreateCompany();

      expect(result).toBe(false);
      expect(refreshSessionMock.mock.callCount()).toBe(1);
    });
  });
});

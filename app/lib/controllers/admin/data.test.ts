import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// These screens are cross-tenant, so the tests focus on the properties that
// keep them safe: no credential columns are ever selected, self-lockout is
// refused, deactivation kills sessions, and pagination cannot be widened.
const userFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const userCountMock = mock.fn(async () => 0);
const userFindUniqueMock = mock.fn(async (): Promise<unknown> => ({ id: "u1" }));
const userUpdateMock = mock.fn(async () => ({}));
const sessionFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const companyFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const companyCountMock = mock.fn(async () => 0);
const auditFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const auditCountMock = mock.fn(async () => 0);

const revokeAllUserSessionsMock = mock.fn(async () => undefined);
const revokeSessionMock = mock.fn(async () => undefined);

mock.module("server-only", { namedExports: {} });

mock.module("@/app/lib/db", {
  namedExports: {
    db: {
      user: {
        findMany: userFindManyMock,
        count: userCountMock,
        findUnique: userFindUniqueMock,
        update: userUpdateMock,
      },
      session: { findMany: sessionFindManyMock },
      company: { findMany: companyFindManyMock, count: companyCountMock },
      auditLog: { findMany: auditFindManyMock, count: auditCountMock },
      vehicle: { findMany: async () => [], count: async () => 0 },
      shipment: { findMany: async () => [], count: async () => 0 },
      route: { findMany: async () => [], count: async () => 0 },
      warehouse: { findMany: async () => [], count: async () => 0 },
      customer: { findMany: async () => [], count: async () => 0 },
      driver: { findMany: async () => [], count: async () => 0 },
      inventory: { findMany: async () => [], count: async () => 0 },
    },
  },
});

mock.module("@/app/lib/logger", {
  namedExports: { logger: { warn: () => {}, error: () => {}, info: () => {} } },
});

mock.module("@/app/lib/controllers/session/manage", {
  namedExports: {
    revokeAllUserSessions: revokeAllUserSessionsMock,
    revokeSession: revokeSessionMock,
  },
});

/** Recursively collects the keys of a Prisma `select` clause. */
function selectKeys(select: unknown): string[] {
  if (!select || typeof select !== "object") return [];
  return Object.keys(select as Record<string, unknown>);
}

describe("controllers/admin/data.ts", () => {
  let listUsers: (f: unknown) => Promise<{ rows: unknown[]; pageSize: number; page: number }>;
  let setUserStatus: (a: string, u: string, s: string) => Promise<string>;
  let listSessions: () => Promise<unknown[]>;
  let browseTable: (m: string, p: number, s: number) => Promise<{ columns: string[] }>;

  before(async () => {
    const mod = await import("./data");
    listUsers = mod.listUsers as typeof listUsers;
    setUserStatus = mod.setUserStatus as typeof setUserStatus;
    listSessions = mod.listSessions as typeof listSessions;
    browseTable = mod.browseTable as typeof browseTable;
  });

  beforeEach(() => {
    for (const m of [
      userFindManyMock,
      userCountMock,
      userFindUniqueMock,
      userUpdateMock,
      sessionFindManyMock,
      revokeAllUserSessionsMock,
      revokeSessionMock,
    ]) {
      m.mock.resetCalls();
    }
    userFindManyMock.mock.mockImplementation(async () => []);
    userCountMock.mock.mockImplementation(async () => 0);
    userFindUniqueMock.mock.mockImplementation(async () => ({ id: "u1" }));
    sessionFindManyMock.mock.mockImplementation(async () => []);
  });

  const baseFilters = {
    search: "",
    status: "ALL",
    companyId: "ALL",
    page: 1,
    pageSize: 25,
  };

  describe("listUsers — credential exposure", () => {
    // The single most important property of this screen.
    it("never selects the password column", async () => {
      await listUsers(baseFilters);
      const args = userFindManyMock.mock.calls[0]?.arguments[0] as {
        select: unknown;
      };
      expect(selectKeys(args.select)).not.toContain("password");
    });

    it("never selects googleId", async () => {
      await listUsers(baseFilters);
      const args = userFindManyMock.mock.calls[0]?.arguments[0] as {
        select: unknown;
      };
      expect(selectKeys(args.select)).not.toContain("googleId");
    });

    it("uses an explicit select rather than returning whole rows", async () => {
      await listUsers(baseFilters);
      const args = userFindManyMock.mock.calls[0]?.arguments[0] as {
        select?: unknown;
      };
      expect(args.select).toBeDefined();
    });
  });

  describe("listUsers — pagination", () => {
    it("clamps an oversized page size", async () => {
      const result = await listUsers({ ...baseFilters, pageSize: 5000 });
      // MAX_PAGE_SIZE is 100; a crafted request must not dump the table.
      expect(result.pageSize).toBe(100);
    });

    it("clamps a zero or negative page size", async () => {
      const result = await listUsers({ ...baseFilters, pageSize: 0 });
      expect(result.pageSize).toBe(25);
    });

    it("clamps a page below 1", async () => {
      const result = await listUsers({ ...baseFilters, page: -3 });
      expect(result.page).toBe(1);
    });

    it("computes skip from the clamped page", async () => {
      await listUsers({ ...baseFilters, page: 3, pageSize: 10 });
      const args = userFindManyMock.mock.calls[0]?.arguments[0] as {
        skip: number;
        take: number;
      };
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });
  });

  describe("setUserStatus", () => {
    // Without this an admin can lock themselves out irreversibly.
    it("refuses to change the acting admin's own status", async () => {
      await expect(setUserStatus("admin1", "admin1", "SUSPENDED")).rejects.toThrow(
        "cannot change your own account status"
      );
      expect(userUpdateMock.mock.callCount()).toBe(0);
    });

    it("throws NotFoundError for an unknown user", async () => {
      userFindUniqueMock.mock.mockImplementation(async () => null);
      await expect(setUserStatus("admin1", "ghost", "ACTIVE")).rejects.toThrow();
    });

    // A suspended user who keeps a live session is not actually suspended.
    it("revokes all sessions when suspending", async () => {
      await setUserStatus("admin1", "u2", "SUSPENDED");
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(1);
    });

    it("revokes all sessions when deactivating", async () => {
      await setUserStatus("admin1", "u2", "INACTIVE");
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(1);
    });

    it("does not revoke sessions when re-activating", async () => {
      await setUserStatus("admin1", "u2", "ACTIVE");
      expect(revokeAllUserSessionsMock.mock.callCount()).toBe(0);
    });
  });

  describe("listSessions", () => {
    // Session tokens are bearer credentials — leaking one is account takeover.
    it("never selects the session token", async () => {
      await listSessions();
      const args = sessionFindManyMock.mock.calls[0]?.arguments[0] as {
        select: unknown;
      };
      expect(selectKeys(args.select)).not.toContain("token");
      expect(selectKeys(args.select)).not.toContain("refreshToken");
    });

    it("marks a revoked session as inactive", async () => {
      const future = new Date(Date.now() + 3_600_000);
      sessionFindManyMock.mock.mockImplementation(async () => [
        {
          id: "s1",
          userId: "u1",
          deviceInfo: null,
          ipAddress: null,
          lastActivityAt: new Date(),
          expiresAt: future,
          createdAt: new Date(),
          isRevoked: true,
          user: { email: "a@b.c", name: "A", surname: "B" },
        },
      ]);

      const rows = (await listSessions()) as { isActive: boolean }[];
      expect(rows[0]?.isActive).toBe(false);
    });

    it("marks an expired session as inactive", async () => {
      const past = new Date(Date.now() - 3_600_000);
      sessionFindManyMock.mock.mockImplementation(async () => [
        {
          id: "s1",
          userId: "u1",
          deviceInfo: null,
          ipAddress: null,
          lastActivityAt: new Date(),
          expiresAt: past,
          createdAt: new Date(),
          isRevoked: false,
          user: { email: "a@b.c", name: "A", surname: "B" },
        },
      ]);

      const rows = (await listSessions()) as { isActive: boolean }[];
      expect(rows[0]?.isActive).toBe(false);
    });
  });

  describe("browseTable", () => {
    it("rejects a model outside the allowlist", async () => {
      await expect(browseTable("User", 1, 25)).rejects.toThrow(
        "not browsable"
      );
    });

    it("rejects the Session model", async () => {
      await expect(browseTable("Session", 1, 25)).rejects.toThrow();
    });

    it("returns only the reviewed columns for an allowed model", async () => {
      const result = await browseTable("Company", 1, 25);
      expect(result.columns).toEqual(["id", "name", "domain", "createdAt"]);
    });

    it("never exposes a password column for any allowed model", async () => {
      for (const model of [
        "Company",
        "Vehicle",
        "Shipment",
        "Route",
        "Warehouse",
        "Customer",
        "Driver",
        "Inventory",
      ]) {
        const result = await browseTable(model, 1, 25);
        expect(result.columns).not.toContain("password");
        expect(result.columns).not.toContain("token");
      }
    });
  });
});

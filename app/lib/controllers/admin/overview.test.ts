import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// getAdminOverview issues ~13 aggregate queries in one Promise.all. The db mock
// stands in for all of them so the tests can assert on the pure logic that
// matters: trend math, time bucketing and tenant ranking.
const companyCountMock = mock.fn(async () => 0);
const companyFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const userCountMock = mock.fn(async () => 0);
const userFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const sessionCountMock = mock.fn(async () => 0);
const auditFindManyMock = mock.fn(async (): Promise<unknown[]> => []);
const auditCountMock = mock.fn(async () => 0);
const shipmentCountMock = mock.fn(async () => 0);
const subscriptionGroupByMock = mock.fn(async (): Promise<unknown[]> => []);

mock.module("server-only", { namedExports: {} });

mock.module("@/app/lib/db", {
  namedExports: {
    db: {
      company: { count: companyCountMock, findMany: companyFindManyMock },
      user: { count: userCountMock, findMany: userFindManyMock },
      session: { count: sessionCountMock },
      auditLog: { findMany: auditFindManyMock, count: auditCountMock },
      shipment: { count: shipmentCountMock },
      subscription: { groupBy: subscriptionGroupByMock },
    },
  },
});

type OverviewFn = (range: string) => Promise<{
  kpis: { key: string; value: number; trend?: { value: number; isUp: boolean } }[];
  authActivity: { key: string; points: { bucket: string; value: number }[] }[];
  signups: { bucket: string; value: number }[];
  subscriptions: { status: string; count: number }[];
  topTenants: { id: string; name: string; userCount: number; shipmentCount: number }[];
  range: string;
  generatedAt: string;
}>;

describe("controllers/admin/overview.ts", () => {
  let getAdminOverview: OverviewFn;

  before(async () => {
    const mod = await import("./overview");
    getAdminOverview = mod.getAdminOverview as OverviewFn;
  });

  beforeEach(() => {
    for (const m of [
      companyCountMock,
      companyFindManyMock,
      userCountMock,
      userFindManyMock,
      sessionCountMock,
      auditFindManyMock,
      auditCountMock,
      shipmentCountMock,
      subscriptionGroupByMock,
    ]) {
      m.mock.resetCalls();
    }
    companyCountMock.mock.mockImplementation(async () => 0);
    companyFindManyMock.mock.mockImplementation(async () => []);
    userCountMock.mock.mockImplementation(async () => 0);
    userFindManyMock.mock.mockImplementation(async () => []);
    sessionCountMock.mock.mockImplementation(async () => 0);
    auditFindManyMock.mock.mockImplementation(async () => []);
    auditCountMock.mock.mockImplementation(async () => 0);
    shipmentCountMock.mock.mockImplementation(async () => 0);
    subscriptionGroupByMock.mock.mockImplementation(async () => []);
  });

  describe("shape", () => {
    it("returns every KPI the grid renders", async () => {
      const result = await getAdminOverview("24h");
      expect(result.kpis.map((k) => k.key)).toEqual([
        "tenants",
        "users",
        "activeSessions",
        "signIns",
        "shipments",
        "failedSignIns",
      ]);
    });

    it("echoes the requested range back", async () => {
      const result = await getAdminOverview("7d");
      expect(result.range).toBe("7d");
    });

    it("falls back to the 24h config for an unknown range", async () => {
      // The route validates with Zod, but the controller must not crash if it
      // is ever called directly with something unexpected.
      const result = await getAdminOverview("bogus");
      expect(result.kpis.length).toBe(6);
    });
  });

  describe("trend calculation", () => {
    it("reports an upward trend when the current window is larger", async () => {
      // company.count is called twice: total, then the prior-window baseline.
      let call = 0;
      companyCountMock.mock.mockImplementation(async () => (++call === 1 ? 150 : 100));

      const result = await getAdminOverview("24h");
      const tenants = result.kpis.find((k) => k.key === "tenants");
      expect(tenants?.trend).toEqual({ value: 50, isUp: true });
    });

    it("reports a downward trend when the current window is smaller", async () => {
      let call = 0;
      shipmentCountMock.mock.mockImplementation(async () => (++call === 1 ? 50 : 100));

      const result = await getAdminOverview("24h");
      const shipments = result.kpis.find((k) => k.key === "shipments");
      expect(shipments?.trend).toEqual({ value: 50, isUp: false });
    });

    // A zero baseline has no defined percentage change — emitting "+100%"
    // would invent a comparison that does not exist.
    it("omits the trend when the baseline is zero", async () => {
      let call = 0;
      companyCountMock.mock.mockImplementation(async () => (++call === 1 ? 10 : 0));

      const result = await getAdminOverview("24h");
      const tenants = result.kpis.find((k) => k.key === "tenants");
      expect(tenants?.trend).toBeUndefined();
    });

    it("never attaches a trend to the point-in-time session gauge", async () => {
      sessionCountMock.mock.mockImplementation(async () => 42);

      const result = await getAdminOverview("24h");
      const sessions = result.kpis.find((k) => k.key === "activeSessions");
      expect(sessions?.value).toBe(42);
      expect(sessions?.trend).toBeUndefined();
    });
  });

  describe("time bucketing", () => {
    it("produces a dense series with zero-filled gaps", async () => {
      const now = Date.now();
      // Two sign-ins inside one 5-minute bucket of the 1h range.
      auditFindManyMock.mock.mockImplementation(async () => [
        { createdAt: new Date(now - 2 * 60_000) },
        { createdAt: new Date(now - 3 * 60_000) },
      ]);

      const result = await getAdminOverview("1h");
      const points = result.authActivity[0]?.points ?? [];

      // 1h / 5min = 12 buckets, emitted whether or not they contain events.
      expect(points.length).toBe(12);
      expect(points.reduce((sum, p) => sum + p.value, 0)).toBe(2);
      // Zero buckets must be present, not omitted.
      expect(points.some((p) => p.value === 0)).toBe(true);
    });

    it("ignores events outside the window", async () => {
      const now = Date.now();
      auditFindManyMock.mock.mockImplementation(async () => [
        { createdAt: new Date(now - 5 * 60 * 60_000) }, // 5h ago, outside 1h
        { createdAt: new Date(now - 60_000) },
      ]);

      const result = await getAdminOverview("1h");
      const total = (result.authActivity[0]?.points ?? []).reduce(
        (sum, p) => sum + p.value,
        0
      );
      expect(total).toBe(1);
    });

    it("emits 24 hourly buckets for the 24h range", async () => {
      const result = await getAdminOverview("24h");
      expect(result.authActivity[0]?.points.length).toBe(24);
    });

    it("emits 30 daily buckets for the 30d range", async () => {
      const result = await getAdminOverview("30d");
      expect(result.signups.length).toBe(30);
    });

    it("buckets are ordered oldest to newest", async () => {
      const result = await getAdminOverview("24h");
      const points = result.authActivity[0]?.points ?? [];
      const times = points.map((p) => new Date(p.bucket).getTime());
      const sorted = [...times].sort((a, b) => a - b);
      expect(times).toEqual(sorted);
    });
  });

  describe("tenant ranking", () => {
    it("ranks tenants by shipment volume, then user count", async () => {
      companyFindManyMock.mock.mockImplementation(async () => [
        {
          id: "c1",
          name: "Alpha",
          createdAt: new Date(),
          _count: { users: 5, shipments: 10 },
        },
        {
          id: "c2",
          name: "Beta",
          createdAt: new Date(),
          _count: { users: 2, shipments: 90 },
        },
        {
          id: "c3",
          name: "Gamma",
          createdAt: new Date(),
          _count: { users: 50, shipments: 10 },
        },
      ]);

      const result = await getAdminOverview("24h");
      expect(result.topTenants.map((t) => t.name)).toEqual([
        "Beta", // most shipments
        "Gamma", // tied on shipments with Alpha, more users
        "Alpha",
      ]);
    });

    it("caps the leaderboard at eight tenants", async () => {
      companyFindManyMock.mock.mockImplementation(async () =>
        Array.from({ length: 25 }, (_, i) => ({
          id: `c${i}`,
          name: `Tenant ${i}`,
          createdAt: new Date(),
          _count: { users: i, shipments: i },
        }))
      );

      const result = await getAdminOverview("24h");
      expect(result.topTenants.length).toBe(8);
    });

    it("serialises createdAt as an ISO string", async () => {
      companyFindManyMock.mock.mockImplementation(async () => [
        {
          id: "c1",
          name: "Alpha",
          createdAt: new Date("2025-01-15T10:00:00Z"),
          _count: { users: 1, shipments: 1 },
        },
      ]);

      const result = await getAdminOverview("24h");
      expect(result.topTenants[0]?.createdAt).toBe("2025-01-15T10:00:00.000Z");
    });
  });

  describe("subscriptions", () => {
    it("flattens Prisma groupBy output into slices", async () => {
      subscriptionGroupByMock.mock.mockImplementation(async () => [
        { status: "ACTIVE", _count: { _all: 12 } },
        { status: "EXPIRED", _count: { _all: 3 } },
      ]);

      const result = await getAdminOverview("24h");
      expect(result.subscriptions).toEqual([
        { status: "ACTIVE", count: 12 },
        { status: "EXPIRED", count: 3 },
      ]);
    });
  });
});

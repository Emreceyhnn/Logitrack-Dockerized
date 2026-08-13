 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(params: Record<string, string | string[]> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(val => sp.append(k, val));
    else sp.set(k, v);
  }
  return { nextUrl: { searchParams: sp } } as unknown;
}

// ─── next/server mock ────────────────────────────────────────────────────────
const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

// ─── Auth mocks ──────────────────────────────────────────────────────────────
const getAuthenticatedUserMock = mock.fn();
mock.module("../../../lib/auth-middleware.ts", {
  namedExports: { getAuthenticatedUser: getAuthenticatedUserMock },
});

const checkPermissionMock = mock.fn(async () => {});
mock.module("../../../lib/controllers/utils/checkPermission.ts", {
  namedExports: { checkPermission: checkPermissionMock },
});

// ─── DB mock ─────────────────────────────────────────────────────────────────
const vehicleFindManyMock = mock.fn(async () => []);
const vehicleCountMock = mock.fn(async () => 0);
mock.module("../../../lib/db.ts", {
  namedExports: { db: { vehicle: { findMany: vehicleFindManyMock, count: vehicleCountMock } } },
});

// ─── Redis / cache mocks ─────────────────────────────────────────────────────
// withCache should just call the factory function directly in tests
mock.module("../../../lib/redis.ts", {
  namedExports: {
    withCache: mock.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
    hashFilters: mock.fn(() => "hash123"),
    vehicleCacheKeys: { dashboard: mock.fn((companyId: string, hash: string) => `vehicle:${companyId}:${hash}`) },
    VEHICLE_CACHE_TTL: 60,
  },
});

// ─── Converter mocks ─────────────────────────────────────────────────────────
mock.module("../../../lib/controllers/utils/vehicleUtils.ts", {
  namedExports: {
    VehicleKpiConverter: mock.fn(() => ({ total: 1 })),
    VehicleCapacityConverter: mock.fn(() => []),
    VehicleDocumentConverter: mock.fn(() => []),
    VehicleServiceConverter: mock.fn(() => []),
  },
});

mock.module("../../../lib/controllers/utils/trendUtils.ts", {
  namedExports: {
    calcTrend: mock.fn(() => 0),
    daysAgo: mock.fn(() => new Date()),
  },
});

mock.module("@prisma/client", {
  namedExports: {
    Prisma: {},
    VehicleStatus: {
      AVAILABLE: "AVAILABLE",
      ON_TRIP: "ON_TRIP",
      MAINTENANCE: "MAINTENANCE",
      OUT_OF_ORDER: "OUT_OF_ORDER",
    },
    VehicleType: {
      TRUCK: "TRUCK",
      VAN: "VAN",
    },
  },
});

mock.module("../../../lib/type/vehicle.ts", {
  namedExports: {},
});

describe("GET /api/vehicles/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getAuthenticatedUserMock.mock.resetCalls();
    checkPermissionMock.mock.resetCalls();
    vehicleFindManyMock.mock.resetCalls();
    vehicleCountMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_Return401_WhenUserIsNull", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => null);
    const res: unknown = await GET(makeRequest());
    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(res._status).toBe(401);
  });

  it("should_Return403_WhenCompanyIdIsMissing", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => ({ id: "u1", companyId: null }));
    const res: unknown = await GET(makeRequest());
    expect(res._body).toEqual({ error: "No company" });
    expect(res._status).toBe(403);
  });

  it("should_ReturnDashboardData_WhenAuthorized", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => ({ id: "u1", companyId: "cmp1" }));
    vehicleFindManyMock.mock.mockImplementationOnce(async () => [{ id: "v1", plate: "34ABC", maintenanceRecords: [], routes: [] }]);
    vehicleCountMock.mock.mockImplementationOnce(async () => 5);

    const res: unknown = await GET(makeRequest());

    expect(checkPermissionMock.mock.calls.length).toBe(1);
    expect(vehicleFindManyMock.mock.calls.length).toBe(1);
    expect(res._status).toBe(200);
    expect(res._body.vehicles).toBeTruthy();
    expect(res._body.vehiclesKpis).toBeTruthy();
    expect(res._body.kpiTrends).toBeTruthy();
  });

  it("should_ApplySearchFilter_WhenProvided", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => ({ id: "u1", companyId: "cmp1" }));
    vehicleFindManyMock.mock.mockImplementationOnce(async () => []);
    vehicleCountMock.mock.mockImplementationOnce(async () => 0);

    await GET(makeRequest({ search: "34ABC" }));

    const whereClause = vehicleFindManyMock.mock.calls[0].arguments[0].where;
    expect(whereClause.OR).toBeTruthy();
    expect(whereClause.OR.length).toBe(3);
  });

  it("should_ApplyStatusFilter_WhenProvided", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => ({ id: "u1", companyId: "cmp1" }));
    vehicleFindManyMock.mock.mockImplementationOnce(async () => []);
    vehicleCountMock.mock.mockImplementationOnce(async () => 0);

    await GET(makeRequest({ status: ["AVAILABLE"] }));

    const whereClause = vehicleFindManyMock.mock.calls[0].arguments[0].where;
    expect(whereClause.status).toEqual({ in: ["AVAILABLE"] });
  });

  it("should_ApplyHasDriverFalseFilter_WhenHasDriverIsFalse", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => ({ id: "u1", companyId: "cmp1" }));
    vehicleFindManyMock.mock.mockImplementationOnce(async () => []);
    vehicleCountMock.mock.mockImplementationOnce(async () => 0);

    await GET(makeRequest({ hasDriver: "false" }));

    const whereClause = vehicleFindManyMock.mock.calls[0].arguments[0].where;
    expect(whereClause.driver).toEqual({ is: null });
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getAuthenticatedUserMock.mock.mockImplementationOnce(async () => { throw new Error("DB crash"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown;
}

const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

const getShipmentsWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/shipments.ts", {
  namedExports: { getShipmentsWithDashboardData: getShipmentsWithDashboardDataMock },
});

mock.module("../../../lib/type/enums.ts", {
  namedExports: {
    ShipmentStatus: {
      PENDING: "PENDING",
      PROCESSING: "PROCESSING",
      ASSIGNED: "ASSIGNED",
      IN_TRANSIT: "IN_TRANSIT",
      DELIVERED: "DELIVERED",
      FAILED: "FAILED",
      RETURNED: "RETURNED",
      DELAYED: "DELAYED",
      CANCELLED: "CANCELLED",
    },
  },
});

describe("GET /api/shipments/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getShipmentsWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParams", async () => {
    getShipmentsWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest());
    expect(getShipmentsWithDashboardDataMock.mock.calls[0].arguments).toEqual([1, 10, undefined, undefined]);
  });

  it("should_ParseAllFilters_WhenProvided", async () => {
    getShipmentsWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ page: "2", pageSize: "25", status: "IN_TRANSIT", search: "TRK-001" }));
    const [page, pageSize, status, search] = getShipmentsWithDashboardDataMock.mock.calls[0].arguments;
    expect(page).toBe(2);
    expect(pageSize).toBe(25);
    expect(status).toBe("IN_TRANSIT");
    expect(search).toBe("TRK-001");
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getShipmentsWithDashboardDataMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getShipmentsWithDashboardDataMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

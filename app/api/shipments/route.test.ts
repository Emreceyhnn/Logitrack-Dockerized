 
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

const getShipmentsMock = mock.fn();
mock.module("../../lib/controllers/shipments.ts", {
  namedExports: { getShipments: getShipmentsMock },
});

mock.module("@prisma/client", {
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

describe("GET /api/shipments", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getShipmentsMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnShipmentsWithNoFilters_WhenNoParams", async () => {
    const fakeData = { shipments: [] };
    getShipmentsMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET(makeRequest());
    // page/limit are always populated by the query schema's safe defaults.
    expect(getShipmentsMock.mock.calls[0].arguments[0]).toEqual({
      page: 1,
      limit: 10,
    });
    expect(res._body).toEqual(fakeData);
  });

  it("should_ParseAllFilters_WhenProvided", async () => {
    getShipmentsMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ page: "2", limit: "20", search: "TRK", status: "DELIVERED", unassigned: "true" }));
    const filters = getShipmentsMock.mock.calls[0].arguments[0];
    expect(filters.page).toBe(2);
    expect(filters.limit).toBe(20);
    expect(filters.search).toBe("TRK");
    expect(filters.status).toBe("DELIVERED");
    expect(filters.unassigned).toBe(true);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getShipmentsMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getShipmentsMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

 
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

const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

const getVehiclesMock = mock.fn();
mock.module("../../lib/controllers/vehicle.ts", {
  namedExports: { getVehicles: getVehiclesMock },
});

mock.module("@prisma/client", {
  namedExports: {
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

describe("GET /api/vehicles", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getVehiclesMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnVehicles_WithEmptyFilters_WhenNoParams", async () => {
    const fakeData = [{ id: "v1" }];
    getVehiclesMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET(makeRequest());
    expect(getVehiclesMock.mock.calls[0].arguments[0]).toEqual({});
    expect(res._body).toEqual(fakeData);
  });

  it("should_ParseSearchAndStatusAndType_WhenProvided", async () => {
    getVehiclesMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ search: "34ABC", status: ["AVAILABLE"], type: ["TRUCK"] }));
    const filters = getVehiclesMock.mock.calls[0].arguments[0];
    expect(filters.search).toBe("34ABC");
    expect(filters.status).toEqual(["AVAILABLE"]);
    expect(filters.type).toEqual(["TRUCK"]);
  });

  it("should_ParseHasIssuesAndHasDriver_AsBoolean", async () => {
    getVehiclesMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ hasIssues: "true", hasDriver: "false" }));
    const filters = getVehiclesMock.mock.calls[0].arguments[0];
    expect(filters.hasIssues).toBe(true);
    expect(filters.hasDriver).toBe(false);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getVehiclesMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getVehiclesMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

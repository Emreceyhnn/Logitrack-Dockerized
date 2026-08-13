 
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

const getDriverWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/driver.ts", {
  namedExports: { getDriverWithDashboardData: getDriverWithDashboardDataMock },
});

describe("GET /api/drivers/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getDriverWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultFilters_WhenNoParams", async () => {
    getDriverWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest());
    const filters = getDriverWithDashboardDataMock.mock.calls[0].arguments[0];
    expect(filters.page).toBe(1);
    expect(filters.limit).toBe(10);
  });

  it("should_ParseAllFilters_WhenProvided", async () => {
    getDriverWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ page: "3", limit: "15", search: "Jane", status: ["ON_JOB"], hasVehicle: "false", sortField: "rating", sortOrder: "desc" }));
    const filters = getDriverWithDashboardDataMock.mock.calls[0].arguments[0];
    expect(filters.page).toBe(3);
    expect(filters.limit).toBe(15);
    expect(filters.search).toBe("Jane");
    expect(filters.status).toEqual(["ON_JOB"]);
    expect(filters.hasVehicle).toBe(false);
    expect(filters.sortField).toBe("rating");
    expect(filters.sortOrder).toBe("desc");
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getDriverWithDashboardDataMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getDriverWithDashboardDataMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

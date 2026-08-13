 
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

const getWarehousesWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/warehouse.ts", {
  namedExports: { getWarehousesWithDashboardData: getWarehousesWithDashboardDataMock },
});

describe("GET /api/warehouses/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getWarehousesWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParams", async () => {
    getWarehousesWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest());
    expect(getWarehousesWithDashboardDataMock.mock.calls[0].arguments).toEqual([1, 10]);
  });

  it("should_ParsePagination_WhenProvided", async () => {
    getWarehousesWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ page: "2", pageSize: "5" }));
    expect(getWarehousesWithDashboardDataMock.mock.calls[0].arguments).toEqual([2, 5]);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getWarehousesWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerFails", async () => {
    getWarehousesWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("fail");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

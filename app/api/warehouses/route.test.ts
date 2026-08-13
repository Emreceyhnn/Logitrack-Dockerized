 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
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

const getWarehousesMock = mock.fn();
const getWarehousesWithDashboardDataMock = mock.fn();
mock.module("../../lib/controllers/warehouse.ts", {
  namedExports: {
    getWarehouses: getWarehousesMock,
    getWarehousesWithDashboardData: getWarehousesWithDashboardDataMock,
  },
});

// ─── /api/warehouses ─────────────────────────────────────────────────────────
describe("GET /api/warehouses", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getWarehousesMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnWarehouses_WhenControllerSucceeds", async () => {
    const fakeData = [{ id: "w1" }];
    getWarehousesMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET();
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getWarehousesMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET();
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerFails", async () => {
    getWarehousesMock.mock.mockImplementationOnce(async () => {
      throw new Error("timeout");
    });
    const res: unknown = await GET();
    expect(res._status).toBe(500);
  });
});

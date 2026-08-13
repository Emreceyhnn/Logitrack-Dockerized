 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

const getInventoryWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/inventory.ts", {
  namedExports: { getInventoryWithDashboardData: getInventoryWithDashboardDataMock },
});

function makeRequest(params: Record<string, string> = {}) {
  return { nextUrl: { searchParams: new URLSearchParams(params) } } as unknown;
}

describe("GET /api/inventory/dashboard", () => {
  let GET: (req?: unknown) => unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getInventoryWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnData_WhenControllerSucceeds", async () => {
    const fakeData = { items: [] };
    getInventoryWithDashboardDataMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET(makeRequest());
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenControllerThrowsNEXT_REDIRECT", async () => {
    getInventoryWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerThrowsGenericError", async () => {
    getInventoryWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("DB error");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._body).toEqual({ error: "Internal server error" });
    expect(res._status).toBe(500);
  });
});

 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeRes() {
  return {
    calls: [] as Array<{ body: unknown; status: number }>,
  };
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

// ─── Controller mocks ────────────────────────────────────────────────────────
const getAnalyticsDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/analytics.ts", {
  namedExports: { getAnalyticsDashboardData: getAnalyticsDashboardDataMock },
});

describe("GET /api/analytics/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getAnalyticsDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnData_WhenControllerSucceeds", async () => {
    const fakeData = { kpis: { shipments: 10 } };
    getAnalyticsDashboardDataMock.mock.mockImplementationOnce(async () => fakeData);

    const res: unknown = await GET();

    expect(getAnalyticsDashboardDataMock.mock.calls.length).toBe(1);
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenControllerThrowsNEXT_REDIRECT", async () => {
    getAnalyticsDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });

    const res: unknown = await GET();

    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerThrowsGenericError", async () => {
    getAnalyticsDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("DB connection failed");
    });

    const res: unknown = await GET();

    expect(res._body).toEqual({ error: "Internal server error" });
    expect(res._status).toBe(500);
  });
});

 
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

const getOverviewDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/overview.ts", {
  namedExports: { getOverviewDashboardData: getOverviewDashboardDataMock },
});

describe("GET /api/overview/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getOverviewDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnData_WhenControllerSucceeds", async () => {
    const fakeData = { totalShipments: 100 };
    getOverviewDashboardDataMock.mock.mockImplementationOnce(async () => fakeData);

    const res: unknown = await GET();
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenControllerThrowsNEXT_REDIRECT", async () => {
    getOverviewDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET();
    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerThrowsGenericError", async () => {
    getOverviewDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("Something broke");
    });
    const res: unknown = await GET();
    expect(res._body).toEqual({ error: "Internal server error" });
    expect(res._status).toBe(500);
  });
});

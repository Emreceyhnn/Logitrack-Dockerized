 
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

const getReportsDataActionMock = mock.fn();
mock.module("../../../lib/controllers/reports.ts", {
  namedExports: { getReportsDataAction: getReportsDataActionMock },
});

describe("GET /api/reports/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getReportsDataActionMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnData_WhenControllerSucceeds", async () => {
    const fakeData = { fleet: {}, inventory: {} };
    getReportsDataActionMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET();
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getReportsDataActionMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET();
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerThrowsGenericError", async () => {
    getReportsDataActionMock.mock.mockImplementationOnce(async () => {
      throw new Error("timeout");
    });
    const res: unknown = await GET();
    expect(res._status).toBe(500);
  });
});

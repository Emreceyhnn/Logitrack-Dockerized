 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params);
  return {
    nextUrl: {
      searchParams: sp,
    },
  } as unknown;
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

const getCustomersWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/customer.ts", {
  namedExports: { getCustomersWithDashboardData: getCustomersWithDashboardDataMock },
});

describe("GET /api/customers/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getCustomersWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParamsProvided", async () => {
    const fakeData = { customers: [], meta: {} };
    getCustomersWithDashboardDataMock.mock.mockImplementationOnce(async () => fakeData);

    await GET(makeRequest());

    expect(getCustomersWithDashboardDataMock.mock.calls[0].arguments).toEqual([1, 10, undefined]);
  });

  it("should_ParsePageAndPageSize_WhenProvided", async () => {
    getCustomersWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));

    await GET(makeRequest({ page: "2", pageSize: "25" }));

    expect(getCustomersWithDashboardDataMock.mock.calls[0].arguments[0]).toBe(2);
    expect(getCustomersWithDashboardDataMock.mock.calls[0].arguments[1]).toBe(25);
  });

  it("should_PassSearch_WhenProvided", async () => {
    getCustomersWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));

    await GET(makeRequest({ search: "Acme" }));

    expect(getCustomersWithDashboardDataMock.mock.calls[0].arguments[2]).toBe("Acme");
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getCustomersWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerFails", async () => {
    getCustomersWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("Timeout");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

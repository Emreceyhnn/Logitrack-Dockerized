 
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

const getCompanyWithDashboardDataMock = mock.fn();
mock.module("../../../lib/controllers/company.ts", {
  namedExports: { getCompanyWithDashboardData: getCompanyWithDashboardDataMock },
});

describe("GET /api/company/dashboard", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getCompanyWithDashboardDataMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParams", async () => {
    getCompanyWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));

    await GET(makeRequest());

    const args = getCompanyWithDashboardDataMock.mock.calls[0].arguments[0];
    expect(args).toEqual({ page: 1, pageSize: 10, search: undefined });
  });

  it("should_ParsePagination_WhenProvided", async () => {
    getCompanyWithDashboardDataMock.mock.mockImplementationOnce(async () => ({}));

    await GET(makeRequest({ page: "3", pageSize: "20", search: "admin" }));

    const args = getCompanyWithDashboardDataMock.mock.calls[0].arguments[0];
    expect(args.page).toBe(3);
    expect(args.pageSize).toBe(20);
    expect(args.search).toBe("admin");
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getCompanyWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getCompanyWithDashboardDataMock.mock.mockImplementationOnce(async () => {
      throw new Error("fail");
    });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

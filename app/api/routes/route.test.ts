 
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

const getRoutesMock = mock.fn();
mock.module("../../lib/controllers/routes.ts", {
  namedExports: { getRoutes: getRoutesMock },
});

describe("GET /api/routes", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getRoutesMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParams", async () => {
    getRoutesMock.mock.mockImplementationOnce(async () => []);
    await GET(makeRequest());
    expect(getRoutesMock.mock.calls[0].arguments).toEqual([1, 10, undefined]);
  });

  it("should_PassStatusFilter_WhenProvided", async () => {
    getRoutesMock.mock.mockImplementationOnce(async () => []);
    await GET(makeRequest({ page: "1", pageSize: "5", status: "ACTIVE" }));
    expect(getRoutesMock.mock.calls[0].arguments).toEqual([1, 5, "ACTIVE"]);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getRoutesMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getRoutesMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

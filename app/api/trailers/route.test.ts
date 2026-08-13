 
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

const getTrailersMock = mock.fn();
mock.module("../../lib/controllers/trailer.ts", {
  namedExports: { getTrailers: getTrailersMock },
});

mock.module("@prisma/client", {
  namedExports: {
    TrailerStatus: {
      AVAILABLE: "AVAILABLE",
      IN_USE: "IN_USE",
      MAINTENANCE: "MAINTENANCE",
      RETIRED: "RETIRED",
    },
    TrailerType: {
      DRY_VAN: "DRY_VAN",
      REEFER: "REEFER",
      FLATBED: "FLATBED",
      TANKER: "TANKER",
      CURTAINSIDE: "CURTAINSIDE",
      CONTAINER_CHASSIS: "CONTAINER_CHASSIS",
    },
  },
});

describe("GET /api/trailers", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getTrailersMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnTrailers_WithEmptyFilters_WhenNoParams", async () => {
    const fakeData = { trailers: [] };
    getTrailersMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET(makeRequest());
    // page/limit are always populated by the query schema's safe defaults.
    expect(getTrailersMock.mock.calls[0].arguments[0]).toEqual({
      page: 1,
      limit: 10,
    });
    expect(res._body).toEqual(fakeData);
  });

  it("should_ParseFilters_WhenProvided", async () => {
    getTrailersMock.mock.mockImplementationOnce(async () => ({}));
    await GET(makeRequest({ page: "2", limit: "10", search: "TRL", status: ["AVAILABLE"], type: ["FLATBED"], isColdChain: "true" }));
    const filters = getTrailersMock.mock.calls[0].arguments[0];
    expect(filters.page).toBe(2);
    expect(filters.search).toBe("TRL");
    expect(filters.status).toEqual(["AVAILABLE"]);
    expect(filters.type).toEqual(["FLATBED"]);
    expect(filters.isColdChain).toBe(true);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getTrailersMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getTrailersMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

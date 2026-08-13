 
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

const getDriversMock = mock.fn();
mock.module("../../lib/controllers/driver.ts", {
  namedExports: { getDrivers: getDriversMock },
});

mock.module("../../lib/type/enums.ts", {
  namedExports: {
    DriverStatus: {
      ON_JOB: "ON_JOB",
      OFF_DUTY: "OFF_DUTY",
      ON_LEAVE: "ON_LEAVE",
    },
  },
});

describe("GET /api/drivers", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getDriversMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_UseDefaultPagination_WhenNoParams", async () => {
    getDriversMock.mock.mockImplementationOnce(async () => []);
    await GET(makeRequest());
    const args = getDriversMock.mock.calls[0].arguments;
    expect(args[0]).toBe(1);   // page
    expect(args[1]).toBe(10);  // limit
    expect(args[2]).toBeUndefined(); // search
    expect(args[3]).toBeUndefined(); // status
    expect(args[4]).toBeUndefined(); // hasVehicle
  });

  it("should_ParseAllFilters_WhenProvided", async () => {
    getDriversMock.mock.mockImplementationOnce(async () => []);
    await GET(makeRequest({ page: "2", limit: "20", search: "John", status: ["ON_JOB", "OFF_DUTY"], hasVehicle: "true", sortField: "name", sortOrder: "asc" }));
    const [page, limit, search, status, hasVehicle, sortField, sortOrder] = getDriversMock.mock.calls[0].arguments;
    expect(page).toBe(2);
    expect(limit).toBe(20);
    expect(search).toBe("John");
    expect(status).toEqual(["ON_JOB", "OFF_DUTY"]);
    expect(hasVehicle).toBe(true);
    expect(sortField).toBe("name");
    expect(sortOrder).toBe("asc");
  });

  it("should_SetHasVehicle_ToFalse_WhenParamIsFalse", async () => {
    getDriversMock.mock.mockImplementationOnce(async () => []);
    await GET(makeRequest({ hasVehicle: "false" }));
    expect(getDriversMock.mock.calls[0].arguments[4]).toBe(false);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getDriversMock.mock.mockImplementationOnce(async () => { throw new Error("NEXT_REDIRECT"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenGenericError", async () => {
    getDriversMock.mock.mockImplementationOnce(async () => { throw new Error("fail"); });
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(500);
  });
});

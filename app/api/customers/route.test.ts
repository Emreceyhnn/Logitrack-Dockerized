 
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

const getCustomersMock = mock.fn();
mock.module("../../lib/controllers/customer.ts", {
  namedExports: { getCustomers: getCustomersMock },
});

describe("GET /api/customers", () => {
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    getCustomersMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnCustomers_WhenControllerSucceeds", async () => {
    const fakeData = [{ id: "c1", name: "Acme" }];
    getCustomersMock.mock.mockImplementationOnce(async () => fakeData);
    const res: unknown = await GET();
    expect(res._body).toEqual(fakeData);
    expect(res._status).toBe(200);
  });

  it("should_Return401_WhenNEXT_REDIRECT", async () => {
    getCustomersMock.mock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT");
    });
    const res: unknown = await GET();
    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(res._status).toBe(401);
  });

  it("should_Return500_WhenControllerFails", async () => {
    getCustomersMock.mock.mockImplementationOnce(async () => {
      throw new Error("DB error");
    });
    const res: unknown = await GET();
    expect(res._status).toBe(500);
  });
});

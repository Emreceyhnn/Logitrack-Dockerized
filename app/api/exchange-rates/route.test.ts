 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(options: { headers?: Record<string, string | null> } = {}) {
  return {
    headers: { get: (k: string) => options.headers?.[k] ?? null },
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

const getExchangeRatesMock = mock.fn();
const refreshExchangeRatesMock = mock.fn();
mock.module("../../lib/services/exchangeRate.ts", {
  namedExports: {
    getExchangeRates: getExchangeRatesMock,
    refreshExchangeRates: refreshExchangeRatesMock,
  },
});

describe("GET /api/exchange-rates", () => {
  let GET: unknown;
  let POST: unknown;

  before(async () => {
    // Set env for POST tests
    (process.env as unknown).CRON_SECRET = "test-secret";
    const mod = await import("./route");
    GET = mod.GET;
    POST = mod.POST;
  });

  beforeEach(() => {
    getExchangeRatesMock.mock.resetCalls();
    refreshExchangeRatesMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_ReturnRates_WhenServiceSucceeds", async () => {
    const fakeRates = { rates: { USD: 1, EUR: 0.92 }, lastUpdated: "2024-01-01" };
    getExchangeRatesMock.mock.mockImplementationOnce(async () => fakeRates);
    const res: unknown = await GET();
    expect(res._body).toEqual(fakeRates);
    expect(res._status).toBe(200);
  });

  it("should_Return500_WhenGetServiceFails", async () => {
    getExchangeRatesMock.mock.mockImplementationOnce(async () => { throw new Error("network error"); });
    const res: unknown = await GET();
    expect(res._status).toBe(500);
    expect(res._body.error).toBeTruthy();
  });

  it("should_Return401_WhenCronSecretIsMissing", async () => {
    const res: unknown = await POST(makeRequest({ headers: { "x-cron-secret": null } }));
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Unauthorized" });
  });

  it("should_Return401_WhenCronSecretIsWrong", async () => {
    const res: unknown = await POST(makeRequest({ headers: { "x-cron-secret": "wrong" } }));
    expect(res._status).toBe(401);
  });

  it("should_RefreshRates_WhenCronSecretIsCorrect", async () => {
    const fakeRates = { rates: { USD: 1 }, lastUpdated: "2024-01-01" };
    refreshExchangeRatesMock.mock.mockImplementationOnce(async () => fakeRates);

    const res: unknown = await POST(makeRequest({ headers: { "x-cron-secret": "test-secret" } }));

    expect(refreshExchangeRatesMock.mock.calls.length).toBe(1);
    expect(res._body.success).toBe(true);
    expect(res._body.lastUpdated).toBe("2024-01-01");
    expect(res._status).toBe(200);
  });

  it("should_Return500_WhenRefreshServiceFails", async () => {
    refreshExchangeRatesMock.mock.mockImplementationOnce(async () => { throw new Error("upstream error"); });

    const res: unknown = await POST(makeRequest({ headers: { "x-cron-secret": "test-secret" } }));
    expect(res._status).toBe(500);
  });
});

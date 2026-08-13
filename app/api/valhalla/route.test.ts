import { describe, it, before, beforeEach, after, mock } from "node:test";
import { expect } from "expect";

// NextResponse is used both as a constructor and via the static json() helper.
class MockNextResponse {
  _body: unknown;
  _status: number;
  _headers: Record<string, string>;

  constructor(
    body: unknown,
    init?: { status?: number; headers?: Record<string, string> }
  ) {
    this._body = body;
    this._status = init?.status ?? 200;
    this._headers = init?.headers ?? {};
  }

  static json = mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  }));
}

mock.module("next/server", {
  namedExports: { NextResponse: MockNextResponse, NextRequest: class {} },
});

const getAuthenticatedUserMock = mock.fn<any>(async () => ({ id: "user-1" }));
mock.module("../../lib/auth-middleware.ts", {
  namedExports: { getAuthenticatedUser: getAuthenticatedUserMock },
});

const originalFetch = globalThis.fetch;
const fetchMock = mock.fn<any>();
globalThis.fetch = fetchMock as unknown;

const makeRequest = (body: string) => ({ text: async () => body }) as unknown;

const validBody = JSON.stringify({
  locations: [
    { lat: 41.0, lon: 29.0 },
    { lat: 39.9, lon: 32.8 },
  ],
  costing: "truck",
});

describe("POST /route", () => {
  let POST: unknown;

  before(async () => {
    const mod = await import("./route");
    POST = mod.POST;
  });

  beforeEach(() => {
    fetchMock.mock.resetCalls();
    getAuthenticatedUserMock.mock.resetCalls();
    getAuthenticatedUserMock.mock.mockImplementation(async () => ({
      id: "user-1",
    }));
    MockNextResponse.json.mock.resetCalls();
    fetchMock.mock.mockImplementation(async () => ({
      status: 200,
      text: async () => '{"trip":{"summary":{"length":452.1}}}',
      headers: { get: () => "application/json" },
    }));
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it("should_Return401_WhenUserIsNotAuthenticated", async () => {
    // Arrange
    getAuthenticatedUserMock.mock.mockImplementation(async () => null);

    // Act
    const res: unknown = await POST(makeRequest(validBody));

    // Assert
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Unauthorized" });
    // Upstream must never be hit by anonymous callers
    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it("should_Return413_WhenBodyExceedsSizeCap", async () => {
    // Act
    const res: unknown = await POST(makeRequest("x".repeat(64 * 1024 + 1)));

    // Assert
    expect(res._status).toBe(413);
    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it("should_Return400_WhenBodyIsNotJson", async () => {
    // Act
    const res: unknown = await POST(makeRequest("not-json{"));

    // Assert
    expect(res._status).toBe(400);
    expect(res._body.error).toBe("Invalid JSON body");
    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it("should_Return400_WhenFewerThanTwoLocations", async () => {
    // Act
    const res: unknown = await POST(
      makeRequest(
        JSON.stringify({ locations: [{ lat: 1, lon: 2 }], costing: "truck" })
      )
    );

    // Assert
    expect(res._status).toBe(400);
    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it("should_Return400_WhenCostingIsMissing", async () => {
    // Act
    const res: unknown = await POST(
      makeRequest(
        JSON.stringify({
          locations: [
            { lat: 1, lon: 2 },
            { lat: 3, lon: 4 },
          ],
        })
      )
    );

    // Assert
    expect(res._status).toBe(400);
    expect(fetchMock.mock.calls.length).toBe(0);
  });

  it("should_ProxyToValhallaAndReturnUpstreamBody_WhenRequestIsValid", async () => {
    // Act
    const res: unknown = await POST(makeRequest(validBody));

    // Assert
    expect(res._status).toBe(200);
    expect(res._body).toBe('{"trip":{"summary":{"length":452.1}}}');
    expect(res._headers["Content-Type"]).toBe("application/json");
    expect(fetchMock.mock.calls.length).toBe(1);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    // Destination is fixed server-side; the client body is forwarded verbatim
    expect(String(url).endsWith("/route")).toBe(true);
    expect(init.body).toBe(validBody);
  });

  it("should_PassThroughUpstreamErrorStatus", async () => {
    // Arrange
    fetchMock.mock.mockImplementation(async () => ({
      status: 400,
      text: async () => '{"error":"No route found"}',
      headers: { get: () => "application/json" },
    }));

    // Act
    const res: unknown = await POST(makeRequest(validBody));

    // Assert
    expect(res._status).toBe(400);
    expect(res._body).toBe('{"error":"No route found"}');
  });

  it("should_Return500_WhenUpstreamFetchFails", async () => {
    // Arrange
    fetchMock.mock.mockImplementation(async () => {
      throw new Error("upstream unreachable");
    });

    // Act
    const res: unknown = await POST(makeRequest(validBody));

    // Assert
    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toBe("upstream unreachable");
  });
});

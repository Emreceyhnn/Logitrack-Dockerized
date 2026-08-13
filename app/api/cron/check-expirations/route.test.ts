 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(authHeader?: string) {
  return {
    headers: {
      get: (key: string) => {
        if (key === "authorization") return authHeader ?? null;
        return null;
      },
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

// Mock DB
const dbMock = {
  document: { findMany: mock.fn(async () => []) },
  driver: { findMany: mock.fn(async () => []) },
  vehicle: { findMany: mock.fn(async () => []) },
  route: { findMany: mock.fn(async () => []) },
  shipment: { findMany: mock.fn(async () => []) },
  warehouse: { findMany: mock.fn(async () => []) },
};

mock.module("../../../lib/db.ts", {
  namedExports: { db: dbMock },
});

const sendNotificationActionMock = mock.fn(async () => {});
mock.module("../../../lib/actions/notifications.ts", {
  namedExports: { sendNotificationAction: sendNotificationActionMock },
});

describe("GET /api/cron/check-expirations", () => {
  let GET: unknown;

  before(async () => {
    (process.env as unknown).CRON_SECRET = "cron-secret-123";
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    dbMock.document.findMany.mock.resetCalls();
    dbMock.driver.findMany.mock.resetCalls();
    dbMock.vehicle.findMany.mock.resetCalls();
    dbMock.route.findMany.mock.resetCalls();
    dbMock.shipment.findMany.mock.resetCalls();
    dbMock.warehouse.findMany.mock.resetCalls();
    sendNotificationActionMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  it("should_Return401_WhenAuthHeaderIsMissing", async () => {
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Unauthorized" });
  });

  it("should_Return401_WhenAuthHeaderIsWrong", async () => {
    const res: unknown = await GET(makeRequest("Bearer wrong-secret"));
    expect(res._status).toBe(401);
  });

  it("should_RunAllChecks_AndReturnSuccess_WhenAuthorized", async () => {
    // All findMany return empty arrays (no expirations)
    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));

    expect(res._body.success).toBe(true);
    expect(typeof res._body.checked).toBe("number");
    expect(res._status).toBe(200);

    // All 6 DB queries fired
    expect(dbMock.document.findMany.mock.calls.length).toBe(1);
    expect(dbMock.driver.findMany.mock.calls.length).toBe(1);
    expect(dbMock.vehicle.findMany.mock.calls.length).toBe(1);
    expect(dbMock.route.findMany.mock.calls.length).toBe(1);
    expect(dbMock.shipment.findMany.mock.calls.length).toBe(1);
    expect(dbMock.warehouse.findMany.mock.calls.length).toBe(1);
  });

  it("should_SendNotifications_WhenExpiringDocumentFound", async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
    dbMock.document.findMany.mock.mockImplementationOnce(async () => [
      {
        id: "doc1",
        name: "Driver License",
        expiryDate: futureDate,
        companyId: "cmp1",
        driver: { user: { name: "John", surname: "Doe" } },
        vehicle: null,
      },
    ]);

    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));

    expect(res._body.success).toBe(true);
    expect(sendNotificationActionMock.mock.calls.length).toBe(1);
    const notifArgs = sendNotificationActionMock.mock.calls[0].arguments;
    expect(notifArgs[0]).toEqual({ companyId: "cmp1" });
    expect(notifArgs[1].type).toBe("WARNING");
  });

  it("should_Return500_WhenDBThrows", async () => {
    dbMock.document.findMany.mock.mockImplementationOnce(async () => {
      throw new Error("DB crash");
    });

    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });
});

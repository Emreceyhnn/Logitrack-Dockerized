import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// ── Mocks ──────────────────────────────────────────────────────────────────
const findUniqueMock = mock.fn();
const dbMock = { shipment: { findUnique: findUniqueMock } };

const rateLimitMock = mock.fn(async () => ({ success: true }));

// runAsSystem just runs the callback here; the real bypass behaviour is the
// tenant-guard's concern, tested in db.test.ts.
const tenantContextMock = {
  runAsSystem: mock.fn((fn: () => unknown) => fn()),
};

const headersMock = {
  headers: mock.fn(async () => ({ get: mock.fn(() => "1.2.3.4") })),
};

mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../rate-limiter.ts", { namedExports: { rateLimit: rateLimitMock } });
mock.module("../tenant-context.ts", { namedExports: tenantContextMock });
mock.module("next/headers", { namedExports: headersMock });

describe("publicTracking", () => {
  let trackShipment: (id: string) => Promise<Record<string, unknown>>;

  before(async () => {
    ({ trackShipment } = await import("./publicTracking"));
  });

  beforeEach(() => {
    findUniqueMock.mock.resetCalls();
    rateLimitMock.mock.resetCalls();
    rateLimitMock.mock.mockImplementation(async () => ({ success: true }));
    tenantContextMock.runAsSystem.mock.resetCalls();
  });

  it("should_RejectInvalidId_BeforeAnyLookup", async () => {
    const result = await trackShipment("  ");
    expect(result).toEqual({ ok: false, error: "INVALID" });
    // No DB call and no rate-limit spend on obvious garbage.
    expect(findUniqueMock.mock.calls.length).toBe(0);
    expect(rateLimitMock.mock.calls.length).toBe(0);
  });

  it("should_ReturnRateLimited_WhenLimiterFails", async () => {
    rateLimitMock.mock.mockImplementation(async () => ({ success: false }));
    const result = await trackShipment("TRK-ABC1234");
    expect(result).toEqual({ ok: false, error: "RATE_LIMITED" });
    expect(findUniqueMock.mock.calls.length).toBe(0);
  });

  it("should_ReturnNotFound_WhenNoShipment", async () => {
    findUniqueMock.mock.mockImplementation(async () => null);
    const result = await trackShipment("TRK-ABC1234");
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("should_SelectOnlyPublicSafeFields", async () => {
    findUniqueMock.mock.mockImplementation(async () => ({
      trackingId: "TRK-ABC1234",
      status: "IN_TRANSIT",
      destination: "12 Main St, Kadıköy, Istanbul",
      destinationLat: null,
      destinationLng: null,
      slaDeadline: new Date("2026-08-01T10:00:00Z"),
      history: [],
      driver: null,
    }));

    await trackShipment("TRK-ABC1234");

    const callArgs = findUniqueMock.mock.calls[0]?.arguments[0] as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };
    // Lookup is by the unique token only.
    expect(callArgs.where).toEqual({ trackingId: "TRK-ABC1234" });
    // The projection must NOT leak tenant / PII fields. (Coordinates ARE
    // selected but returned coarsened — see the coarsening tests below.)
    for (const forbidden of [
      "companyId",
      "customerId",
      "contactEmail",
      "billingAccount",
      "originLat",
      "id",
    ]) {
      expect(callArgs.select[forbidden]).toBeUndefined();
    }
    // The driver sub-select must expose ONLY the vehicle's coordinates —
    // nothing identifying the driver (no name, phone, id, plate).
    const driverSelect = (
      callArgs.select.driver as { select: { currentVehicle: { select: Record<string, unknown> } } }
    ).select;
    expect(Object.keys(driverSelect)).toEqual(["currentVehicle"]);
    expect(Object.keys(driverSelect.currentVehicle.select).sort()).toEqual([
      "currentLat",
      "currentLng",
    ]);
    // Ran inside the system (tenant-bypass) context.
    expect(tenantContextMock.runAsSystem.mock.calls.length).toBe(1);
  });

  it("should_CoarsenDestination_ToLastSegmentOnly", async () => {
    findUniqueMock.mock.mockImplementation(async () => ({
      trackingId: "TRK-ABC1234",
      status: "IN_TRANSIT",
      destination: "12 Main St, Kadıköy, Istanbul",
      destinationLat: null,
      destinationLng: null,
      slaDeadline: null,
      history: [],
      driver: null,
    }));

    const result = await trackShipment("TRK-ABC1234");
    // Only the city survives — the street address is not exposed.
    expect((result as { data: { destination: string } }).data.destination).toBe(
      "Istanbul"
    );
  });

  it("should_ReturnCoarseVehicleArea_NotExactGps", async () => {
    findUniqueMock.mock.mockImplementation(async () => ({
      trackingId: "TRK-ABC1234",
      status: "IN_TRANSIT",
      destination: "Istanbul",
      destinationLat: 41.0082,
      destinationLng: 28.9784,
      slaDeadline: null,
      history: [],
      driver: { currentVehicle: { currentLat: 40.78219, currentLng: 29.44921 } },
    }));

    const result = (await trackShipment("TRK-ABC1234")) as {
      data: {
        lastKnownArea: { lat: number; lng: number } | null;
        destinationCoord: { lat: number; lng: number } | null;
      };
    };
    // Rounded to 1 decimal (~11 km) — never the exact fix.
    expect(result.data.lastKnownArea).toEqual({ lat: 40.8, lng: 29.4 });
    expect(result.data.destinationCoord).toEqual({ lat: 41.0, lng: 29.0 });
    // The precise input coordinates must not survive.
    expect(result.data.lastKnownArea?.lat).not.toBe(40.78219);
  });

  it("should_HideLastKnownArea_WhenTerminal", async () => {
    findUniqueMock.mock.mockImplementation(async () => ({
      trackingId: "TRK-ABC1234",
      status: "DELIVERED",
      destination: "Istanbul",
      destinationLat: 41.0082,
      destinationLng: 28.9784,
      slaDeadline: null,
      history: [],
      driver: { currentVehicle: { currentLat: 40.78, currentLng: 29.44 } },
    }));

    const result = (await trackShipment("TRK-ABC1234")) as {
      data: { lastKnownArea: unknown; destinationCoord: unknown };
    };
    // No stale vehicle position once delivered; destination pin still shows.
    expect(result.data.lastKnownArea).toBeNull();
    expect(result.data.destinationCoord).not.toBeNull();
  });

  it("should_SuppressEta_WhenShipmentIsTerminal", async () => {
    findUniqueMock.mock.mockImplementation(async () => ({
      trackingId: "TRK-ABC1234",
      status: "DELIVERED",
      destination: "Istanbul",
      slaDeadline: new Date("2026-08-01T10:00:00Z"),
      history: [
        { status: "IN_TRANSIT", location: "Hub A", createdAt: new Date("2026-07-30T00:00:00Z") },
        { status: "DELIVERED", location: null, createdAt: new Date("2026-08-01T09:00:00Z") },
      ],
    }));

    const result = (await trackShipment("TRK-ABC1234")) as {
      data: { estimatedArrival: string | null; isComplete: boolean; events: unknown[] };
    };
    expect(result.data.isComplete).toBe(true);
    expect(result.data.estimatedArrival).toBeNull();
    expect(result.data.events.length).toBe(2);
  });
});

 
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

// Mock Firebase Admin
const mockFirebaseRef = {
  set: mock.fn(async () => {}),
  once: mock.fn(async () => ({ val: () => ({ lat: 41.0, lng: 29.0, speed: 60, heading: 90 }) })),
};
mock.module("../../../../lib/firebase-admin.ts", {
  namedExports: {
    adminDb: { ref: mock.fn(() => mockFirebaseRef) },
  },
});

// Mock Prisma — the route authorizes via `prisma.vehicle.findFirst` inside the
// tenant context (see authorizeVehicleAccess in ./route).
const vehicleFindFirstMock = mock.fn();
mock.module("../../../../lib/db.ts", {
  namedExports: {
    db: { vehicle: { findFirst: vehicleFindFirstMock } },
  },
});

// Both handlers gate on getAuthenticatedUser(); provide a signed-in tenant user
// so the tests exercise the real 404/400/422/200 logic instead of the 401 gate.
const getAuthenticatedUserMock = mock.fn(async () => ({
  id: "user-1",
  companyId: "comp-1",
}));
mock.module("../../../../lib/auth-middleware.ts", {
  namedExports: { getAuthenticatedUser: getAuthenticatedUserMock },
});

describe("POST /api/vehicles/[id]/location", () => {
  let POST: unknown;
  let GET: unknown;

  before(async () => {
    const mod = await import("./route");
    POST = mod.POST;
    GET = mod.GET;
  });

  beforeEach(() => {
    vehicleFindFirstMock.mock.resetCalls();
    mockFirebaseRef.set.mock.resetCalls();
    mockFirebaseRef.once.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();
  });

  function makePostRequest(body: Record<string, unknown>) {
    return {
      json: async () => body,
    } as unknown;
  }

  function makeParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  // ─── POST tests ────────────────────────────────────────────────────────────
  it("should_Return404_WhenVehicleNotFound_OnPOST", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => null);
    const res: unknown = await POST(makePostRequest({ lat: 41, lng: 29 }), makeParams("v-missing"));
    expect(res._status).toBe(404);
  });

  it("should_Return400_WhenLatLngNotNumbers", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => ({ id: "v1", plate: "34ABC" }));
    const res: unknown = await POST(makePostRequest({ lat: "invalid", lng: 29 }), makeParams("v1"));
    expect(res._status).toBe(400);
  });

  it("should_Return422_WhenCoordinatesOutOfRange", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => ({ id: "v1", plate: "34ABC" }));
    const res: unknown = await POST(makePostRequest({ lat: 200, lng: 29 }), makeParams("v1"));
    expect(res._status).toBe(422);
  });

  it("should_PushToFirebase_AndReturn200_WhenValidPayload", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => ({ id: "v1", plate: "34ABC" }));
    const res: unknown = await POST(makePostRequest({ lat: 41.0, lng: 29.0, speed: 60 }), makeParams("v1"));
    expect(mockFirebaseRef.set.mock.calls.length).toBe(1);
    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.vehicleId).toBe("v1");
  });

  // ─── GET tests ─────────────────────────────────────────────────────────────
  it("should_Return404_WhenVehicleNotFound_OnGET", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => null);
    const res: unknown = await GET({} as unknown, makeParams("v-missing"));
    expect(res._status).toBe(404);
  });

  it("should_ReturnLiveLocation_WhenFirebaseHasData", async () => {
    vehicleFindFirstMock.mock.mockImplementationOnce(async () => ({
      id: "v1", plate: "34ABC", currentLat: 41.0, currentLng: 29.0
    }));
    const res: unknown = await GET({} as unknown, makeParams("v1"));
    expect(res._body.vehicleId).toBe("v1");
    expect(res._body.source).toBe("firebase_rtdb");
    expect(res._body.liveLocation).toBeTruthy();
  });
});

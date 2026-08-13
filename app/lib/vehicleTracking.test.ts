import "dotenv/config";
import { describe, it, mock, beforeEach } from "node:test";
import { expect } from "expect";

// Create mock functions
const mockRef = mock.fn((_db: unknown, path: string) => ({ path }));
const mockOnValue = mock.fn();
const mockOff = mock.fn();
const mockEnsureFirebaseAuth = mock.fn(async () => {});

// Mock the firebase modules BEFORE importing the code that uses them
mock.module("./firebase.ts", {
  namedExports: {
    db: {},
    ref: mockRef,
    onValue: mockOnValue,
    off: mockOff,
  },
});

// Subscriptions gate on Firebase custom-token auth; stub it as already signed in.
mock.module("./firebase-auth.ts", {
  namedExports: { ensureFirebaseAuth: mockEnsureFirebaseAuth },
});

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe("Vehicle Tracking", () => {
  beforeEach(() => {
    mockRef.mock.resetCalls();
    mockOnValue.mock.resetCalls();
    mockOff.mock.resetCalls();
    mockEnsureFirebaseAuth.mock.resetCalls();
    mockEnsureFirebaseAuth.mock.mockImplementation(async () => {});
  });

  describe("subscribeToVehicleLocation", () => {
    it("should subscribe to the tenant-scoped vehicle path after auth", async () => {
      const { subscribeToVehicleLocation } = await import("./vehicleTracking");
      const callback = mock.fn();
      const mockSnapshot = { val: () => ({ lat: 40.7128, lng: -74.006 }) };

      mockOnValue.mock.mockImplementationOnce((_ref: unknown, cb: (s: unknown) => void) => {
        cb(mockSnapshot);
      });

      const unsubscribe = subscribeToVehicleLocation("comp-1", "vehicle-123", callback);
      await flushAsync(); // subscription starts only after ensureFirebaseAuth resolves

      expect(mockEnsureFirebaseAuth.mock.calls.length).toBe(1);
      expect(mockRef.mock.calls.length).toBe(1);
      // Path must be tenant-scoped: vehicles/locations/{companyId}/{vehicleId}
      expect(mockRef.mock.calls[0].arguments[1]).toBe("vehicles/locations/comp-1/vehicle-123");
      expect(mockOnValue.mock.calls.length).toBe(1);
      expect(callback.mock.calls.length).toBe(1);
      expect(callback.mock.calls[0].arguments[0]).toEqual({ lat: 40.7128, lng: -74.006 });

      unsubscribe();
      expect(mockOff.mock.calls.length).toBe(1);
    });

    it("should not attach a listener when unsubscribed before auth resolves", async () => {
      const { subscribeToVehicleLocation } = await import("./vehicleTracking");
      let resolveAuth: () => void = () => {};
      mockEnsureFirebaseAuth.mock.mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolveAuth = resolve))
      );

      const unsubscribe = subscribeToVehicleLocation("comp-1", "vehicle-123", mock.fn());
      unsubscribe(); // cancel while auth is still pending
      resolveAuth();
      await flushAsync();

      expect(mockOnValue.mock.calls.length).toBe(0);
      expect(mockOff.mock.calls.length).toBe(0);
    });
  });

  describe("subscribeToAllVehicles", () => {
    it("should subscribe to the tenant-scoped fleet path and return unsubscribe function", async () => {
      const { subscribeToAllVehicles } = await import("./vehicleTracking");
      const callback = mock.fn();
      const mockLocations = {
        v1: { lat: 10, lng: 20 },
      };
      const mockSnapshot = { val: () => mockLocations };

      mockOnValue.mock.mockImplementationOnce((_ref: unknown, cb: (s: unknown) => void) => {
        cb(mockSnapshot);
      });

      const unsubscribe = subscribeToAllVehicles("comp-1", callback);
      await flushAsync();

      expect(mockRef.mock.calls.length).toBe(1);
      expect(mockRef.mock.calls[0].arguments[1]).toBe("vehicles/locations/comp-1");
      expect(callback.mock.calls.length).toBe(1);
      expect(callback.mock.calls[0].arguments[0]).toEqual(mockLocations);

      unsubscribe();
      expect(mockOff.mock.calls.length).toBe(1);
    });

    it("should coerce a null snapshot to an empty object", async () => {
      const { subscribeToAllVehicles } = await import("./vehicleTracking");
      const callback = mock.fn();

      mockOnValue.mock.mockImplementationOnce((_ref: unknown, cb: (s: unknown) => void) => {
        cb({ val: () => null });
      });

      subscribeToAllVehicles("comp-1", callback);
      await flushAsync();

      expect(callback.mock.calls[0].arguments[0]).toEqual({});
    });
  });
});

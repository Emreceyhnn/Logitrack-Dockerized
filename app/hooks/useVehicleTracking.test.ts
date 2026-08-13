 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useState: mock.fn((init) => [init, mock.fn()]),
  useEffect: mock.fn((cb) => {
    const cleanup = cb();
    if (typeof cleanup === "function") cleanup();
  }),
  useRef: mock.fn((init) => ({ current: init })),
};

const vehicleTrackingMock = {
  subscribeToAllVehicles: mock.fn((cb) => {
    return mock.fn(); // unsubscribe fn
  }),
  subscribeToVehicleLocation: mock.fn((id, cb) => {
    return mock.fn(); // unsubscribe fn
  }),
};

// Keep the rest of React intact (e.g. `createContext` used deeper in the
// import graph) and override only the hooks this test drives manually. Real
// React is loaded via CJS require so the ESM cache stays untouched and
// mock.module can still intercept "react".
import { createRequire } from "node:module";
const realReact = createRequire(import.meta.url)("react");
mock.module("react", {
  namedExports: { ...realReact, ...reactMock },
  defaultExport: { ...realReact, ...reactMock },
});
mock.module("../lib/vehicleTracking.ts", { namedExports: vehicleTrackingMock });

// Subscriptions are tenant-scoped; the hooks read companyId from useUser().
mock.module("./useUser.ts", {
  namedExports: { useUser: mock.fn(() => ({ user: { id: "user-1", companyId: "comp-1" } })) },
});

// 2. TEST GRUPLARI
describe("useVehicleTracking Hooks", () => {
  let trackingMod: unknown;

  before(async () => {
    trackingMod = await import("./useVehicleTracking");
  });

  beforeEach(() => {
    reactMock.useState.mock.resetCalls();
    reactMock.useEffect.mock.resetCalls();
    vehicleTrackingMock.subscribeToAllVehicles.mock.resetCalls();
    vehicleTrackingMock.subscribeToVehicleLocation.mock.resetCalls();
  });

  describe("useAllVehiclesTracking()", () => {
    it("should_SetupSubscriptionOnMount", () => {
      // Act
      trackingMod.useAllVehiclesTracking();

      // Assert
      expect(reactMock.useEffect.mock.calls.length).toBe(1);
      expect(vehicleTrackingMock.subscribeToAllVehicles.mock.calls.length).toBe(1);
    });
  });

  describe("useVehicleTracking()", () => {
    it("should_SetupSubscriptionForSpecificVehicle", () => {
      // Act
      trackingMod.useVehicleTracking("v-1");

      // Assert
      expect(reactMock.useEffect.mock.calls.length).toBe(1);
      expect(vehicleTrackingMock.subscribeToVehicleLocation.mock.calls.length).toBe(1);
      // Tenant-scoped subscribe: (companyId, vehicleId, callback)
      expect(vehicleTrackingMock.subscribeToVehicleLocation.mock.calls[0].arguments[0]).toBe("comp-1");
      expect(vehicleTrackingMock.subscribeToVehicleLocation.mock.calls[0].arguments[1]).toBe("v-1");
    });

    it("should_NotSetupSubscription_WhenVehicleIdIsNull", () => {
      // Act
      trackingMod.useVehicleTracking(null);

      // Assert
      // The effect is called, but it returns early inside. 
      // The mock execute the effect immediately.
      expect(vehicleTrackingMock.subscribeToVehicleLocation.mock.calls.length).toBe(0);
    });
  });
});

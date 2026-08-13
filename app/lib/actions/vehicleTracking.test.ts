 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const adminDbMock = {
  ref: mock.fn(() => ({
    set: mock.fn(async () => {}),
    update: mock.fn(async () => {}),
  })),
};

mock.module("../firebase-admin.ts", { namedExports: { adminDb: adminDbMock } });

// 2. TEST GRUPLARI
describe("Vehicle Tracking Actions", () => {
  let trackingActions: unknown;

  before(async () => {
    trackingActions = await import("./vehicleTracking");
  });

  beforeEach(() => {
    adminDbMock.ref.mock.resetCalls();
  });

  describe("updateVehicleLocationAction() metodu", () => {
    it("should_UpdateVehicleLocationInFirebase", async () => {
      // Act — RTDB paths are tenant-scoped: vehicles/<node>/{companyId}/{vehicleId}
      const result = await trackingActions.updateVehicleLocationAction("comp-1", "v-1", { lat: 40, lng: 29 });

      // Assert
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls.length).toBe(1);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("vehicles/locations/comp-1/v-1");
    });
  });

  describe("updateVehicleDataAction() metodu", () => {
    it("should_UpdateVehicleDataInFirebase", async () => {
      // Act
      const result = await trackingActions.updateVehicleDataAction("comp-1", "v-1", { speed: 80 });

      // Assert
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls.length).toBe(1);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("vehicles/locations/comp-1/v-1");
    });
  });

  describe("syncVehicleToFirebaseAction() metodu", () => {
    it("should_SyncVehicleRegistryToFirebase", async () => {
      // Act
      const result = await trackingActions.syncVehicleToFirebaseAction({ id: "v-1", companyId: "comp-1", plate: "34 ABC" });

      // Assert
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls.length).toBe(1);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("vehicles/registry/comp-1/v-1");
    });

    it("should_RefuseSync_WhenVehicleHasNoCompanyId", async () => {
      // Act — a vehicle without a tenant must never land in a shared node
      const result = await trackingActions.syncVehicleToFirebaseAction({ id: "v-1", companyId: null, plate: "34 ABC" });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Vehicle has no companyId");
      expect(adminDbMock.ref.mock.calls.length).toBe(0);
    });
  });
});

 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  vehicle: {
    findFirst: mock.fn(),
    findUnique: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  driver: {
    findUnique: mock.fn(),
    update: mock.fn(),
    findMany: mock.fn(),
  },
  $transaction: mock.fn(async (cb) => cb(dbMock)),
};

// Redis & Cache Mock
const redisMock = {
  del: mock.fn(),
};

const cacheUtilsMock = {
  redis: redisMock,
  withCache: mock.fn(async (key, ttl, cb) => cb()),
  invalidatePattern: mock.fn(),
  hashFilters: mock.fn(() => "mock-hash"),
  vehicleCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
  },
  VEHICLE_CACHE_TTL: 3600,
  EXCHANGE_RATE_CACHE_TTL: 3600,
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// Notifications Mock
const notificationsMock = {
  sendNotificationAction: mock.fn(),
};

// Vehicle Tracking Mock (Firebase sync)
const vehicleTrackingMock = {
  syncVehicleToFirebaseAction: mock.fn(async () => {}),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../redis.ts", {
  namedExports: cacheUtilsMock,
});

mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

mock.module("./utils/checkPermission.ts", {
  namedExports: checkPermissionMock,
});

mock.module("../actions/notifications.ts", {
  namedExports: { sendNotificationAction: notificationsMock.sendNotificationAction },
});

mock.module("../actions/vehicleTracking.ts", {
  namedExports: { syncVehicleToFirebaseAction: vehicleTrackingMock.syncVehicleToFirebaseAction },
});

mock.module("../services/exchangeRate.ts", {
  namedExports: { getExchangeRates: mock.fn() },
});

mock.module("next/cache", {
  namedExports: { revalidatePath: () => {} },
});

// 2. TEST GRUPLARI
describe("Vehicle Controller", () => {
  let vehicleController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    vehicleController = await import("./vehicle");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.vehicle.findFirst.mock.resetCalls();
    dbMock.vehicle.findUnique.mock.resetCalls();
    dbMock.vehicle.create.mock.resetCalls();
    dbMock.vehicle.update.mock.resetCalls();
    dbMock.vehicle.delete.mock.resetCalls();
    
    redisMock.del.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
    vehicleTrackingMock.syncVehicleToFirebaseAction.mock.resetCalls();
  });

  describe("createVehicle() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_CreateVehicle_AndSyncToFirebase_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => null); // No existing vehicle
      dbMock.vehicle.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "veh-1",
        ...args.data,
      }));

      // Act
      const vehicleData = {
        year: 2023,
        maxLoadKg: 20000,
        plate: "34 ABC 123",
        type: "TRUCK",
      };

      const result = await vehicleController.createVehicle(mockUser, vehicleData);

      // Assert
      expect(result.id).toBe("veh-1");
      expect(result.plate).toBe("34 ABC 123");
      expect(dbMock.vehicle.create.mock.calls.length).toBe(1);
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
      
      // Wait a tick for async background sync (using setImmediate)
      await new Promise(resolve => setImmediate(resolve));
      expect(vehicleTrackingMock.syncVehicleToFirebaseAction.mock.calls.length).toBe(1);
    });

    it("should_RethrowUniqueConstraintError_WhenPlateAlreadyExists", async () => {
      // Arrange — uniqueness is enforced by the DB constraint (P2002), not a
      // pre-read; the controller must propagate the failure.
      dbMock.vehicle.create.mock.mockImplementationOnce(async () => {
        const err = new Error(
          "Unique constraint failed on the fields: (`plate`)"
        ) as Error & { code?: string };
        err.code = "P2002";
        throw err;
      });

      const vehicleData = {
        year: 2023,
        maxLoadKg: 20000,
        plate: "34 ABC 123",
        type: "TRUCK",
      };

      // Act & Assert
      await expect(
        vehicleController.createVehicle(mockUser, vehicleData)
      ).rejects.toThrow("Unique constraint failed");

      // No cache invalidation or Firebase sync for a failed create
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(0);
      expect(vehicleTrackingMock.syncVehicleToFirebaseAction.mock.calls.length).toBe(0);
    });
  });

  describe("getVehicleById() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_ReturnVehicle_WhenVehicleExistsAndBelongsToCompany", async () => {
      // Arrange
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => ({
        id: "veh-1",
        plate: "34 ABC 123",
        companyId: "company-1",
      }));

      // Act
      const result = await vehicleController.getVehicleById(mockUser, "veh-1");

      // Assert
      expect(result.id).toBe("veh-1");
      expect(result.plate).toBe("34 ABC 123");
      expect(dbMock.vehicle.findFirst.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenVehicleDoesNotExist", async () => {
      // Arrange
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => null);

      // Act & Assert
      await expect(
        vehicleController.getVehicleById(mockUser, "non-existent")
      ).rejects.toThrow("Vehicle not found or unauthorized");
    });

    it("should_ThrowError_WhenVehicleBelongsToAnotherCompany", async () => {
      // Arrange — the tenant-scoped findFirst({ where: { id, companyId } })
      // never returns a row belonging to another company, so the mock
      // reflects that by resolving to null (same as "not found").
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => null);

      // Act & Assert
      await expect(
        vehicleController.getVehicleById(mockUser, "veh-2")
      ).rejects.toThrow("Vehicle not found or unauthorized");
    });
  });
});

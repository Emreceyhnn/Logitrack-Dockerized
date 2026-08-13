 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";
import { DriverStatus } from "@prisma/client";

// 1. MOCK'LAR

// Prisma DB Mock
const dbMock = {
  driver: {
    findFirst: mock.fn(),
    create: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
    findMany: mock.fn(),
    count: mock.fn(),
    aggregate: mock.fn(),
  },
  user: {
    findUnique: mock.fn(),
    update: mock.fn(),
    findMany: mock.fn(),
  },
  vehicle: {
    findFirst: mock.fn(),
  },
  role: {
    findFirst: mock.fn(),
  },
  $transaction: mock.fn(async (cb) => cb(dbMock)),
};

// Cache & Redis Mock
const redisMock = {
  del: mock.fn(async () => 1),
};

const cacheUtilsMock = {
  redis: redisMock,
  withCache: mock.fn(async (key, ttl, cb) => cb()),
  invalidatePattern: mock.fn(async () => 1),
  hashFilters: mock.fn(() => "mock-hash"),
  driverCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
    kpis: mock.fn(() => "kpi-key"),
  },
  DRIVER_CACHE_TTL: 3600,
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// Notification Mock
const notificationsMock = {
  sendNotificationAction: mock.fn(async () => {}),
};

// Trend Utils Mock
const trendUtilsMock = {
  calcTrend: mock.fn(() => 5),
  daysAgo: mock.fn(() => new Date()),
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

mock.module("./utils/trendUtils.ts", {
  namedExports: trendUtilsMock,
});

mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

// 2. TEST GRUPLARI
describe("Driver Controller", () => {
  let driverController: unknown;

  before(async () => {
    driverController = await import("./driver");
  });

  beforeEach(() => {
    dbMock.driver.findFirst.mock.resetCalls();
    dbMock.driver.create.mock.resetCalls();
    dbMock.driver.update.mock.resetCalls();
    dbMock.driver.delete.mock.resetCalls();
    dbMock.driver.findMany.mock.resetCalls();
    dbMock.driver.count.mock.resetCalls();
    dbMock.driver.aggregate.mock.resetCalls();
    
    dbMock.user.findUnique.mock.resetCalls();
    dbMock.user.update.mock.resetCalls();
    dbMock.user.findMany.mock.resetCalls();
    
    dbMock.vehicle.findFirst.mock.resetCalls();
    dbMock.role.findFirst.mock.resetCalls();
    dbMock.$transaction.mock.resetCalls();
    
    redisMock.del.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
  });

  describe("createDriver() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateDriverAndNotification_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => ({
        id: "target-user-1",
        companyId: "company-1",
        name: "John",
        surname: "Doe",
        driver: null, // User is not a driver yet
      }));

      dbMock.driver.findFirst.mock.mockImplementation(async () => null); // Employee ID is available
      
      const expectedDriver = { id: "driver-1" };
      dbMock.driver.create.mock.mockImplementation(async () => expectedDriver);

      // Act
      const result = await driverController.createDriver(mockUser, {
        userId: "target-user-1",
        phone: "+1234567890",
        employeeId: "EMP-100",
        licenseNumber: "LIC-123",
        licenseType: "CLASS A",
        status: DriverStatus.OFF_DUTY,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(dbMock.driver.create.mock.calls.length).toBe(1);
      expect(dbMock.user.update.mock.calls.length).toBe(1); // Should update roleId to role_driver
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1); // Notification sent
    });

    it("should_ThrowError_WhenUserIsAlreadyADriver", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => ({
        id: "target-user-1",
        companyId: "company-1",
        driver: { id: "existing-driver-id" }, // User is already a driver
      }));

      // Act & Assert
      await expect(
        driverController.createDriver(mockUser, { userId: "target-user-1", phone: "123", licenseNumber: "123", licenseType: "A", status: DriverStatus.OFF_DUTY })
      ).rejects.toThrow("User is already assigned as a driver");

      expect(dbMock.driver.create.mock.calls.length).toBe(0);
    });
  });

  describe("updateDriverStatus() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_UpdateStatusAndSendNotification", async () => {
      // Arrange
      dbMock.driver.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        user: { name: "John", surname: "Doe" }
      }));

      dbMock.driver.update.mock.mockImplementation(async () => ({
        id: "driver-1",
        status: DriverStatus.ON_JOB
      }));

      // Act
      const result = await driverController.updateDriverStatus(mockUser, "driver-1", DriverStatus.ON_JOB);

      // Assert
      expect(result.status).toBe("ON_JOB");
      expect(dbMock.driver.update.mock.calls.length).toBe(1);
      
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1);
      const notifArgs = notificationsMock.sendNotificationAction.mock.calls[0].arguments[1] as unknown;
      expect(notifArgs.title).toContain("Görevde");
    });
  });
});

 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { MaintenanceType, MaintenanceStatus } from "@prisma/client";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  maintenanceRecord: {
    create: mock.fn(),
    findMany: mock.fn(),
    findFirst: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  vehicle: {
    findFirst: mock.fn(),
  },
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

// Exchange Rate Mock
const exchangeRateMock = {
  getExchangeRates: mock.fn(async () => ({ rates: { USD: 1, EUR: 0.92, TRY: 30.0 } })),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
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

mock.module("../services/exchangeRate.ts", {
  namedExports: exchangeRateMock,
});

// Dayjs Mock (if needed)
const dayjsMock = mock.fn((val) => ({
  format: mock.fn(() => "01.01.2024")
}));
mock.module("dayjs", {
  defaultExport: dayjsMock,
});

// 2. TEST GRUPLARI
describe("Maintenance Controller", () => {
  let maintenanceController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    maintenanceController = await import("./maintenance");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.maintenanceRecord.create.mock.resetCalls();
    dbMock.maintenanceRecord.findMany.mock.resetCalls();
    dbMock.maintenanceRecord.findFirst.mock.resetCalls();
    dbMock.maintenanceRecord.update.mock.resetCalls();
    dbMock.maintenanceRecord.delete.mock.resetCalls();
    dbMock.vehicle.findFirst.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
  });

  describe("createMaintenanceRecord() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateRecordAndSendNotification_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
      }));
      
      const expectedRecord = {
        id: "record-1",
        vehicleId: "v-1",
        type: MaintenanceType.OIL_CHANGE,
        vehicle: { plate: "34 ABC 12" }
      };
      dbMock.maintenanceRecord.create.mock.mockImplementation(async () => expectedRecord);

      // Act
      const result = await maintenanceController.createMaintenanceRecord(
        mockUser,
        "v-1",
        "OIL_CHANGE",
        new Date(),
        3000,
        "Routine oil change",
        "TRY" // using TRY currency to test normalization
      );

      // Assert
      expect(result.maintenanceRecord.id).toBe("record-1");
      expect(dbMock.maintenanceRecord.create.mock.calls.length).toBe(1);
      
      // Cost should be normalized (3000 / 30.0 = 100)
      const createArgs = dbMock.maintenanceRecord.create.mock.calls[0].arguments[0] as unknown;
      expect(createArgs.data.cost).toBe(100);
      expect(createArgs.data.currency).toBe("USD");
      
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenVehicleBelongsToAnotherCompany", async () => {
      // Arrange
      // createMaintenanceRecord scopes the lookup itself via
      // `where: { id, companyId }` (maintenance.ts) — a vehicle from another
      // tenant simply doesn't match that filter and Prisma returns null.
      dbMock.vehicle.findFirst.mock.mockImplementation(async () => null);

      // Act & Assert
      await expect(
        maintenanceController.createMaintenanceRecord(mockUser, "v-1", MaintenanceType.OIL_CHANGE, new Date(), 100)
      ).rejects.toThrow("Vehicle not found or unauthorized");

      expect(dbMock.maintenanceRecord.create.mock.calls.length).toBe(0);
    });
  });

  describe("updateMaintenanceRecord() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_UpdateRecordAndSendNotification_WhenStatusChanges", async () => {
      // Arrange
      dbMock.maintenanceRecord.findFirst.mock.mockImplementation(async () => ({
        status: MaintenanceStatus.SCHEDULED,
        type: MaintenanceType.ENGINE_REPAIR,
        companyId: "company-1",
        vehicle: { plate: "34 XYZ 99" }
      }));

      dbMock.maintenanceRecord.update.mock.mockImplementation(async () => ({
        status: MaintenanceStatus.COMPLETED, // changed status
        type: MaintenanceType.ENGINE_REPAIR,
        cost: 100,
        originalCost: null,
        vehicle: { plate: "34 XYZ 99", id: "v-1" }
      }));

      // Act
      const result = await maintenanceController.updateMaintenanceRecord(
        mockUser, 
        "record-1", 
        { status: MaintenanceStatus.COMPLETED }
      );

      // Assert
      expect(result.status).toBe("COMPLETED");
      expect(dbMock.maintenanceRecord.update.mock.calls.length).toBe(1);
      
      // Status changed from SCHEDULED to COMPLETED, so a notification should be sent
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1);
      
      const notifArgs = notificationsMock.sendNotificationAction.mock.calls[0].arguments[1] as unknown;
      expect(notifArgs.title).toBe("Bakım Tamamlandı! ✅");
      expect(notifArgs.type).toBe("SUCCESS");
    });
  });
});

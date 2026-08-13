 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { ShipmentStatus, ShipmentPriority } from "@prisma/client";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  shipment: {
    findFirst: mock.fn(),
    findUniqueOrThrow: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    count: mock.fn(),
    update: mock.fn(),
    aggregate: mock.fn(),
  },
  customer: {
    findFirst: mock.fn(),
  },
  trailer: {
    findFirst: mock.fn(),
  },
  inventory: {
    findFirst: mock.fn(),
    update: mock.fn(),
  },
  inventoryMovement: {
    create: mock.fn(),
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
  shipmentCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
  },
  SHIPMENT_CACHE_TTL: 3600,
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

// Inventory Mock
const inventoryMock = {
  invalidateInventoryCache: mock.fn(),
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

mock.module("./inventory.ts", {
  namedExports: inventoryMock,
});

const nextCacheMock = {
  revalidatePath: mock.fn(),
};
mock.module("next/cache", {
  namedExports: nextCacheMock,
});

// 2. TEST GRUPLARI
describe("Shipments Controller", () => {
  let shipmentsController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    shipmentsController = await import("./shipments");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.shipment.findFirst.mock.resetCalls();
    dbMock.shipment.create.mock.resetCalls();
    dbMock.shipment.findMany.mock.resetCalls();
    dbMock.customer.findFirst.mock.resetCalls();
    dbMock.trailer.findFirst.mock.resetCalls();
    dbMock.$transaction.mock.resetCalls();
    
    redisMock.del.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
    inventoryMock.invalidateInventoryCache.mock.resetCalls();
  });

  describe("createShipment() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_CreateShipment_AndSendNotification_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.shipment.findFirst.mock.mockImplementation(async () => null); // No existing tracking ID
      dbMock.customer.findFirst.mock.mockImplementation(async () => null); // No customer details
      dbMock.shipment.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "shipment-1",
        trackingId: "TRK-123456",
        ...args.data,
      }));

      const shipmentData = {
        origin: "Istanbul",
        destination: "Ankara",
        weightKg: 1000,
        volumeM3: 5,
        priority: ShipmentPriority.HIGH,
      };

      // Act
      const result = await shipmentsController.createShipment(mockUser, shipmentData);

      // Assert
      expect(result.shipment.id).toBe("shipment-1");
      expect(result.shipment.origin).toBe("Istanbul");
      expect(result.shipment.destination).toBe("Ankara");
      expect(dbMock.shipment.create.mock.calls.length).toBe(1);
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1);
      expect(inventoryMock.invalidateInventoryCache.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenTrackingIdAlreadyExists", async () => {
      // Arrange
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        id: "existing-shipment",
        trackingId: "TRK-EXISTING",
      }));

      const shipmentData = {
        origin: "Istanbul",
        destination: "Ankara",
        trackingId: "TRK-EXISTING",
      };

      // Act & Assert
      await expect(
        shipmentsController.createShipment(mockUser, shipmentData)
      ).rejects.toThrow("Tracking ID already exists");

      expect(dbMock.shipment.create.mock.calls.length).toBe(0);
    });
  });

  describe("updateShipmentStatus() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    beforeEach(() => {
      dbMock.shipment.update.mock.resetCalls();
      dbMock.shipment.findFirst.mock.resetCalls();
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.ASSIGNED,
      }));
      dbMock.shipment.update.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "shipment-1",
        trackingId: "TRK-123456",
        status: args.data.status,
      }));
    });

    it("should_UpdateStatusAndWriteHistory_WhenShipmentBelongsToCompany", async () => {
      // Act
      const result = await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "IN_TRANSIT",
        "Istanbul Hub",
        "Departed origin warehouse"
      );

      // Assert
      expect(result.status).toBe("IN_TRANSIT");
      expect(dbMock.shipment.update.mock.calls.length).toBe(1);
      const updateArgs = dbMock.shipment.update.mock.calls[0].arguments[0];
      expect(updateArgs.where).toEqual({ id: "shipment-1" });
      expect(updateArgs.data.status).toBe("IN_TRANSIT");
      // Every transition must leave an audit trail in ShipmentHistory
      expect(updateArgs.data.history.create).toMatchObject({
        status: ShipmentStatus.IN_TRANSIT,
        companyId: "company-1",
        location: "Istanbul Hub",
        description: "Departed origin warehouse",
        createdById: "user-1",
      });
      // Cache invalidated
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
    });

    it("should_ThrowWithoutUpdate_WhenShipmentBelongsToAnotherCompany", async () => {
      // Arrange — tenant-scoped findFirst({ where: { id, companyId } }) never
      // returns a row belonging to another company, so the mock reflects
      // that as null (same outcome as "not found").
      dbMock.shipment.findFirst.mock.mockImplementation(async () => null);
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        shipmentsController.updateShipmentStatus(
          mockUser,
          "shipment-of-other-company",
          "DELIVERED"
        )
      ).rejects.toThrow("Shipment not found or unauthorized");
      expect(dbMock.shipment.update.mock.calls.length).toBe(0);
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_ThrowWithoutUpdate_WhenShipmentDoesNotExist", async () => {
      // Arrange
      dbMock.shipment.findFirst.mock.mockImplementation(async () => null);
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        shipmentsController.updateShipmentStatus(mockUser, "ghost", "DELIVERED")
      ).rejects.toThrow("Shipment not found or unauthorized");
      expect(dbMock.shipment.update.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_SendWarningNotification_WhenStatusIsDelayed", async () => {
      // Act
      await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "DELAYED"
      );

      // Assert
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1);
      const payload =
        notificationsMock.sendNotificationAction.mock.calls[0].arguments[1];
      expect(payload.type).toBe("WARNING");
      expect(payload.category).toBe("DELAY_ALERT");
      expect(payload.message).toContain("TRK-123456");
    });

    it("should_SendErrorNotification_WhenStatusIsCancelled", async () => {
      // Act
      await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "CANCELLED"
      );

      // Assert
      const payload =
        notificationsMock.sendNotificationAction.mock.calls[0].arguments[1];
      expect(payload.type).toBe("ERROR");
      expect(payload.category).toBe("SHIPMENT_UPDATE");
    });

    it("should_SendSuccessNotification_WhenStatusIsDelivered", async () => {
      // Arrange: DELIVERED is only reachable from IN_TRANSIT / DELAYED
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.IN_TRANSIT,
      }));

      // Act
      await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "DELIVERED"
      );

      // Assert
      const payload =
        notificationsMock.sendNotificationAction.mock.calls[0].arguments[1];
      expect(payload.type).toBe("SUCCESS");
      expect(payload.link).toBe("/shipments?id=shipment-1");
    });

    it("should_NotSendNotification_WhenStatusIsPending", async () => {
      // Act
      await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "PENDING"
      );

      // Assert
      expect(dbMock.shipment.update.mock.calls.length).toBe(1);
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(0);
    });

    it("should_RethrowError_WhenDbUpdateFails", async () => {
      // Arrange
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.IN_TRANSIT,
      }));
      dbMock.shipment.update.mock.mockImplementation(async () => {
        throw new Error("DB write failed");
      });
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        shipmentsController.updateShipmentStatus(mockUser, "shipment-1", "DELIVERED")
      ).rejects.toThrow("DB write failed");
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_RejectIllegalTransition_WhenShipmentIsDelivered", async () => {
      // Arrange: a delivered shipment is terminal — no move back to IN_TRANSIT
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.DELIVERED,
      }));
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        shipmentsController.updateShipmentStatus(mockUser, "shipment-1", "IN_TRANSIT")
      ).rejects.toThrow("Invalid shipment status transition");
      expect(dbMock.shipment.update.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_RequireReason_WhenStatusIsFailed", async () => {
      // Arrange: FAILED is reachable from IN_TRANSIT but needs a reason
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.IN_TRANSIT,
      }));
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert: no description provided → rejected
      await expect(
        shipmentsController.updateShipmentStatus(mockUser, "shipment-1", "FAILED")
      ).rejects.toThrow("failure reason");
      expect(dbMock.shipment.update.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_MarkFailed_WhenReasonProvided", async () => {
      // Arrange
      dbMock.shipment.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
        status: ShipmentStatus.IN_TRANSIT,
      }));

      // Act
      const result = await shipmentsController.updateShipmentStatus(
        mockUser,
        "shipment-1",
        "FAILED",
        "Customer address closed",
        "Recipient not available at delivery window"
      );

      // Assert
      expect(result.status).toBe("FAILED");
      expect(dbMock.shipment.update.mock.calls.length).toBe(1);
    });
  });

  describe("getShipments() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_ReturnShipmentsList_WhenNoFiltersProvided", async () => {
      // Arrange
      const mockShipmentsList = [
        { id: "shipment-1", trackingId: "TRK-1" },
        { id: "shipment-2", trackingId: "TRK-2" },
      ];
      dbMock.shipment.findMany.mock.mockImplementation(async () => mockShipmentsList);

      // Act
      const result = await shipmentsController.getShipments(mockUser);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].trackingId).toBe("TRK-1");
      expect(dbMock.shipment.findMany.mock.calls.length).toBe(1);
      expect(checkPermissionMock.checkPermission.mock.calls.length).toBe(1);
    });
  });
});

 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { UserStatus, ShipmentStatus } from "@prisma/client";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  shipment: {
    groupBy: mock.fn(),
    count: mock.fn(),
  },
  route: {
    findFirst: mock.fn(),
  },
  vehicle: {
    findMany: mock.fn(),
    count: mock.fn(),
  },
  inventory: {
    findMany: mock.fn(),
  },
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

// 2. TEST GRUPLARI
describe("Reports Controller", () => {
  let reportsController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    reportsController = await import("./reports");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.shipment.groupBy.mock.resetCalls();
    dbMock.shipment.count.mock.resetCalls();
    dbMock.route.findFirst.mock.resetCalls();
    dbMock.vehicle.findMany.mock.resetCalls();
    dbMock.vehicle.count.mock.resetCalls();
    dbMock.inventory.findMany.mock.resetCalls();
  });

  describe("getReportsDataAction() metodu", () => {
    it("should_ReturnNull_WhenUserHasNoCompanyId", async () => {
      // Arrange
      const mockUser = { id: "user-1", companyId: null };

      // Act
      const result = await reportsController.getReportsDataAction(mockUser);

      // Assert
      expect(result).toBeNull();
      expect(dbMock.shipment.groupBy.mock.calls.length).toBe(0);
    });

    it("should_ReturnReportsData_WhenUserHasCompanyId", async () => {
      // Arrange
      const mockUser = { id: "user-1", companyId: "company-1" };

      // Mock Shipment GroupBy
      dbMock.shipment.groupBy.mock.mockImplementation(async (args: Record<string, unknown>) => {
        if (args.by.includes("status")) {
          return [
            { status: ShipmentStatus.DELIVERED, _count: { status: 10 } },
            { status: ShipmentStatus.PENDING, _count: { status: 5 } },
          ];
        }
        if (args.by.includes("routeId")) {
          return [
            { routeId: "route-1", _count: { routeId: 8 } },
            { routeId: null, _count: { routeId: 2 } },
          ];
        }
        return [];
      });

      // Mock Route FindFirst
      dbMock.route.findFirst.mock.mockImplementation(async () => ({
        name: "Istanbul-Ankara",
      }));

      // Mock Vehicle FindMany and Count
      dbMock.vehicle.findMany.mock.mockImplementation(async () => [
        {
          plate: "34 ABC 123",
          currentLat: 41.0,
          currentLng: 28.9,
          status: UserStatus.ACTIVE,
          avgFuelConsumption: 7.5,
          odometerKm: 120000,
          maintenanceRecords: [{ cost: 100 }, { cost: 50 }],
        },
      ]);
      dbMock.vehicle.count.mock.mockImplementation(async () => 5);

      // Mock Inventory FindMany
      dbMock.inventory.findMany.mock.mockImplementation(async () => [
        { name: "Laptop", quantity: 10, warehouseId: "w-1" },
        { name: "Chair", quantity: 50, warehouseId: "w-2" },
      ]);

      // Mock Shipment Count — on-time rate is (total - delayed) / total
      dbMock.shipment.count.mock.mockImplementation(async (args: Record<string, unknown>) => {
        if (args.where?.status === "DELAYED") return 5;
        return 15; // Total shipments
      });

      // Act
      const result = await reportsController.getReportsDataAction(mockUser);

      // Assert
      expect(result).not.toBeNull();

      // Metrics
      expect(result.metrics.totalShipments).toBe(15);
      expect(result.metrics.activeVehicles).toBe(5);
      expect(result.metrics.onTimeRate).toBe(
        parseFloat((((15 - 5) / 15) * 100).toFixed(1))
      );

      // Shipments
      expect(result.shipments.statusCounts.length).toBe(2);
      expect(result.shipments.routeCounts.length).toBe(2);
      expect(result.shipments.routeCounts[0].route).toBe("Istanbul-Ankara");
      expect(result.shipments.routeCounts[1].route).toBe("Unassigned");

      // Fleet
      expect(result.fleet.length).toBe(1);
      expect(result.fleet[0].plate).toBe("34 ABC 123");
      expect(result.fleet[0].maintenanceCost).toBe(150);
      expect(result.fleet[0].consumption).toBe("7.5");
      expect(result.fleet[0].odometer).toBe(120000);

      // Inventory
      expect(result.inventory.categoryStats).toBeDefined();
    });

    it("should_ReturnNull_WhenDatabaseThrowsError", async () => {
      // Arrange
      const mockUser = { id: "user-1", companyId: "company-1" };
      dbMock.shipment.groupBy.mock.mockImplementation(async () => {
        throw new Error("Database error");
      });

      // Act
      const result = await reportsController.getReportsDataAction(mockUser);

      // Assert
      expect(result).toBeNull();
    });
  });
});

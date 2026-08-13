 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import {
  IssueType,
  IssuePriority,
  IssueStatus,
  ShipmentStatus,
  MovementType,
} from "@prisma/client";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  shipment: {
    count: mock.fn(),
    findMany: mock.fn(),
  },
  vehicle: {
    count: mock.fn(),
    findMany: mock.fn(),
  },
  driver: {
    count: mock.fn(),
  },
  warehouse: {
    count: mock.fn(),
    findMany: mock.fn(),
  },
  inventory: {
    count: mock.fn(),
    findMany: mock.fn(),
    groupBy: mock.fn(),
    fields: { minStock: 10 },
  },
  issue: {
    findMany: mock.fn(),
  },
  document: {
    findMany: mock.fn(),
  },
  route: {
    count: mock.fn(),
    aggregate: mock.fn(),
  },
  fuelLog: {
    aggregate: mock.fn(),
    findMany: mock.fn(),
  },
  inventoryMovement: {
    groupBy: mock.fn(),
  },
  customer: {
    findMany: mock.fn(),
  },
};

// Cache & Redis Mock
const cacheUtilsMock = {
  withCache: mock.fn(async (key, ttl, cb) => cb()),
  overviewCacheKeys: {
    dashboard: mock.fn(() => "dashboard-key"),
  },
  OVERVIEW_CACHE_TTL: 3600,
};

// Exchange Rate Mock
const exchangeRateMock = {
  getExchangeRates: mock.fn(async () => ({ rates: { USD: 1, EUR: 0.92 } })),
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// Utils Mocks
const dateUtilsMock = {
  formatDisplayDate: mock.fn(() => "2024-01-01"),
};

const trendUtilsMock = {
  calcTrend: mock.fn(() => 5),
  daysAgo: mock.fn(() => new Date()),
};

// Dayjs Mock
const dayjsMock = mock.fn();
const dayjsUtcMock = mock.fn(() => ({
  tz: mock.fn(() => ({
    format: mock.fn(() => "Jan 01")
  }))
}));
(dayjsMock as unknown).utc = dayjsUtcMock;
// overview.ts calls dayjs.extend(utc/timezone) at module load
(dayjsMock as unknown).extend = mock.fn();

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../redis.ts", {
  namedExports: cacheUtilsMock,
});

mock.module("../services/exchangeRate.ts", {
  namedExports: exchangeRateMock,
});

mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

mock.module("./utils/checkPermission.ts", {
  namedExports: checkPermissionMock,
});

mock.module("../utils/date.ts", {
  namedExports: dateUtilsMock,
});

mock.module("./utils/trendUtils.ts", {
  namedExports: trendUtilsMock,
});

mock.module("dayjs", {
  defaultExport: dayjsMock,
});

// 2. TEST GRUPLARI
describe("Overview Controller", () => {
  let overviewController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    overviewController = await import("./overview");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.shipment.count.mock.resetCalls();
    dbMock.shipment.findMany.mock.resetCalls();
    dbMock.vehicle.count.mock.resetCalls();
    dbMock.vehicle.findMany.mock.resetCalls();
    dbMock.driver.count.mock.resetCalls();
    dbMock.warehouse.count.mock.resetCalls();
    dbMock.warehouse.findMany.mock.resetCalls();
    dbMock.inventory.count.mock.resetCalls();
    dbMock.inventory.findMany.mock.resetCalls();
    dbMock.inventory.groupBy.mock.resetCalls();
    dbMock.issue.findMany.mock.resetCalls();
    dbMock.document.findMany.mock.resetCalls();
    dbMock.route.count.mock.resetCalls();
    dbMock.route.aggregate.mock.resetCalls();
    dbMock.fuelLog.aggregate.mock.resetCalls();
    dbMock.fuelLog.findMany.mock.resetCalls();
    dbMock.inventoryMovement.groupBy.mock.resetCalls();
    dbMock.customer.findMany.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("getOverviewDashboardData() metodu", () => {
    it("should_ReturnEmptyStructure_WhenNoCompanyId", async () => {
      // Arrange
      const mockUser = { id: "user-1", companyId: null };

      // Act
      const result = await overviewController.getOverviewDashboardData(mockUser);

      // Assert
      expect(result.stats).toBeNull();
      expect(result.alerts).toEqual([]);
      expect(dbMock.shipment.count.mock.calls.length).toBe(0); // DB is not queried
    });

    it("should_ReturnDashboardData_WhenUserHasCompanyId", async () => {
      // Arrange
      const mockUser = { id: "user-1", companyId: "company-1", timezone: "UTC" };

      // Set up base mock returns so Promise.all resolves safely
      dbMock.shipment.count.mock.mockImplementation(async () => 10);
      dbMock.vehicle.count.mock.mockImplementation(async () => 5);
      dbMock.driver.count.mock.mockImplementation(async () => 8);
      dbMock.warehouse.count.mock.mockImplementation(async () => 2);
      dbMock.inventory.count.mock.mockImplementation(async () => 100);
      
      dbMock.route.count.mock.mockImplementation(async () => 4);
      dbMock.route.aggregate.mock.mockImplementation(async () => ({ _avg: { durationMin: 120 } }));
      
      dbMock.fuelLog.aggregate.mock.mockImplementation(async () => ({ _sum: { volumeLiter: 500 } }));
      dbMock.fuelLog.findMany.mock.mockImplementation(async () => [
        { vehicleId: "v-1", volumeLiter: 100, cost: 150, date: new Date(), currency: "USD" }
      ]);
      
      dbMock.issue.findMany.mock.mockImplementation(async () => [
        { id: "issue-1", type: IssueType.VEHICLE, priority: IssuePriority.HIGH, status: IssueStatus.OPEN, title: "Engine check" }
      ]);
      
      dbMock.document.findMany.mock.mockImplementation(async () => [
        { id: "doc-1", name: "Insurance", expiryDate: new Date() }
      ]);
      
      dbMock.vehicle.findMany.mock.mockImplementation(async () => [
        { id: "v-1", plate: "34 ABC 123", currentLat: 41.0, currentLng: 28.9 }
      ]);
      
      dbMock.warehouse.findMany.mock.mockImplementation(async () => [
        { id: "w-1", name: "Main Hub", capacityPallets: 1000, capacityVolumeM3: 5000, lat: 41.0, lng: 28.9 }
      ]);
      
      dbMock.inventory.groupBy.mock.mockImplementation(async () => [
        { warehouseId: "w-1", _sum: { palletCount: 500, volumeM3: 2000 } }
      ]);
      
      dbMock.inventory.findMany.mock.mockImplementation(async () => [
        { id: "inv-1", name: "Item 1", sku: "SKU-1", quantity: 5, minStock: 10, warehouse: { name: "Main Hub" } }
      ]);
      
      dbMock.shipment.findMany.mock.mockImplementation(async () => [
        { status: ShipmentStatus.IN_TRANSIT, createdAt: new Date() }
      ]);
      
      dbMock.inventoryMovement.groupBy.mock.mockImplementation(async () => [
        { type: MovementType.PICK, _sum: { quantity: 50 } },
        { type: MovementType.PACK, _sum: { quantity: 45 } }
      ]);
      
      dbMock.customer.findMany.mock.mockImplementation(async () => [
        { id: "c-1", name: "Acme", locations: [{ isDefault: true, lat: 41.1, lng: 29.0 }] }
      ]);

      // Act
      const result = await overviewController.getOverviewDashboardData(mockUser);

      // Assert
      expect(result.stats).not.toBeNull();
      expect(result.stats?.activeShipments).toBe(10);
      expect(result.dailyOps?.fuelConsumedLiters).toBe(500);
      expect(result.alerts.length).toBe(2); // 1 issue, 1 doc
      expect(result.alerts[0].title).toBe("Engine check");
      expect(result.mapData.length).toBe(3); // 1 warehouse, 1 vehicle, 1 customer
      expect(result.fuelStats.length).toBe(1);
      expect(result.warehouseCapacity.length).toBe(1);
      expect(result.warehouseCapacity[0].palletUsed).toBe(500);
    });
  });
});

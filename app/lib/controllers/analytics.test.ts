 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const dbMock = {
  shipment: { count: mock.fn(), findMany: mock.fn() },
  vehicle: { count: mock.fn(), findMany: mock.fn() },
  driver: { count: mock.fn() },
  warehouse: { count: mock.fn(), findMany: mock.fn() },
  inventory: { count: mock.fn(), findMany: mock.fn(), groupBy: mock.fn(), fields: { minStock: "minStock" } },
  issue: { findMany: mock.fn() },
  document: { findMany: mock.fn() },
  route: { count: mock.fn(), aggregate: mock.fn(), findMany: mock.fn() },
  fuelLog: { aggregate: mock.fn(), findMany: mock.fn() },
  inventoryMovement: { groupBy: mock.fn() },
  customer: { findMany: mock.fn() },
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

const exchangeRateMock = {
  getExchangeRates: mock.fn(async () => ({ rates: { USD: 1, EUR: 0.92 } })),
};

const dateUtilsMock = {
  formatDisplayDate: mock.fn(() => "01.01.2024"),
};

// Dayjs Mock
const dayjsMock = mock.fn();
const dayjsUtcMock = mock.fn(() => ({
  tz: mock.fn(() => ({
    format: mock.fn(() => "Jan 01")
  }))
}));
(dayjsMock as unknown).utc = dayjsUtcMock;

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("./utils/checkPermission.ts", { namedExports: checkPermissionMock });
mock.module("../services/exchangeRate.ts", { namedExports: exchangeRateMock });
mock.module("../utils/date.ts", { namedExports: dateUtilsMock });
mock.module("dayjs", { defaultExport: dayjsMock });

// 2. TEST GRUPLARI
describe("Analytics Controller", () => {
  let analyticsController: unknown;

  before(async () => {
    analyticsController = await import("./analytics");
  });

  beforeEach(() => {
    dbMock.shipment.count.mock.resetCalls();
    dbMock.vehicle.count.mock.resetCalls();
    dbMock.driver.count.mock.resetCalls();
    dbMock.warehouse.count.mock.resetCalls();
    dbMock.inventory.count.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("getOverviewStats() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_ReturnOverviewStats", async () => {
      // Arrange
      dbMock.shipment.count.mock.mockImplementation(async () => 50); // Mocks all shipment counts to 50 for simplicity
      dbMock.vehicle.count.mock.mockImplementation(async () => 10);  // Mocks all vehicle counts to 10
      dbMock.driver.count.mock.mockImplementation(async () => 15);
      dbMock.warehouse.count.mock.mockImplementation(async () => 3);
      dbMock.inventory.count.mock.mockImplementation(async () => 500);

      // Act
      const result = await analyticsController.getOverviewStats(mockUser);

      // Assert
      expect(result).not.toBeNull();
      expect(result.activeShipments).toBe(50);
      expect(result.vehiclesOnTrip).toBe(10);
      expect(result.activeDrivers).toBe(15);
      expect(result.warehouses).toBe(3);
      expect(result.inventorySkus).toBe(500);
      
      // Check that all 8 counts were called
      const totalCountCalls = 
        dbMock.shipment.count.mock.calls.length +
        dbMock.vehicle.count.mock.calls.length +
        dbMock.driver.count.mock.calls.length +
        dbMock.warehouse.count.mock.calls.length +
        dbMock.inventory.count.mock.calls.length;
        
      expect(totalCountCalls).toBe(8);
    });
    
    it("should_ReturnNull_WhenUserHasNoCompany", async () => {
       const userWithoutCompany = { id: "user-1" };
       const result = await analyticsController.getOverviewStats(userWithoutCompany);
       expect(result).toBeNull();
    });
  });
});

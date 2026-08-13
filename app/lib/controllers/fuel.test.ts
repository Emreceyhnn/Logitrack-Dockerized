 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { FuelType } from "@prisma/client";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  fuelLog: {
    findMany: mock.fn(),
    create: mock.fn(),
  },
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
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

mock.module("../services/exchangeRate.ts", {
  namedExports: exchangeRateMock,
});

// 2. TEST GRUPLARI
describe("Fuel Controller", () => {
  let fuelController: unknown;

  before(async () => {
    fuelController = await import("./fuel");
  });

  beforeEach(() => {
    dbMock.fuelLog.findMany.mock.resetCalls();
    dbMock.fuelLog.create.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("createFuelLog() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateFuelLog_AndNormalizeCurrency", async () => {
      // Arrange
      const expectedLog = { id: "log-1", volumeLiter: 50, cost: 100, currency: "USD" };
      dbMock.fuelLog.create.mock.mockImplementation(async () => expectedLog);

      // Act
      const result = await fuelController.createFuelLog(mockUser, {
        vehicleId: "v-1",
        driverId: "d-1",
        volumeLiter: 50,
        cost: 3000,
        odometerKm: 150000,
        fuelType: FuelType.DIESEL,
        currency: "TRY" // Should convert to USD
      });

      // Assert
      expect(result.id).toBe("log-1");
      expect(dbMock.fuelLog.create.mock.calls.length).toBe(1);
      
      const createArgs = dbMock.fuelLog.create.mock.calls[0].arguments[0] as unknown;
      expect(createArgs.data.cost).toBe(100); // 3000 / 30.0 = 100
      expect(createArgs.data.currency).toBe("USD");
    });
  });

  describe("getFuelStats() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_ReturnFuelStats_WhenLogsExist", async () => {
      // Arrange
      dbMock.fuelLog.findMany.mock.mockImplementation(async () => [
        { cost: 100, volumeLiter: 50, odometerKm: 150000 },
        { cost: 100, volumeLiter: 50, odometerKm: 149000 }
      ]); // Total dist = 1000, Total Volume = 100, Efficiency = 10 km/l

      // Act
      const result = await fuelController.getFuelStats(mockUser);

      // Assert
      expect(result.totalCost).toBe(200);
      expect(result.totalVolume).toBe(100);
      expect(result.avgFuelPrice).toBe(2);
      expect(result.efficiencyKml).toBe(10);
    });
  });
});

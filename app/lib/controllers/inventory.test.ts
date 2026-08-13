 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  inventory: {
    findFirst: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
    count: mock.fn(),
  },
  warehouse: {
    findFirst: mock.fn(),
  },
  inventoryMovement: {
    create: mock.fn(),
    findMany: mock.fn(),
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
  inventoryCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
    kpis: mock.fn(() => "kpi-key"),
    dashboard: mock.fn(() => "dashboard-key"),
    movements: mock.fn(() => "movements-key"),
  },
  INVENTORY_CACHE_TTL: 3600,
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
  getExchangeRates: mock.fn(async () => ({ rates: { USD: 1, EUR: 0.92 } })),
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

mock.module("../services/exchangeRate.ts", {
  namedExports: exchangeRateMock,
});

mock.module("./utils/trendUtils.ts", {
  namedExports: trendUtilsMock,
});

mock.module("next/cache", {
  namedExports: { revalidatePath: mock.fn() },
});

// 2. TEST GRUPLARI
describe("Inventory Controller", () => {
  let inventoryController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    inventoryController = await import("./inventory");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.inventory.findFirst.mock.resetCalls();
    dbMock.inventory.create.mock.resetCalls();
    dbMock.inventory.findMany.mock.resetCalls();
    dbMock.inventory.update.mock.resetCalls();
    dbMock.inventory.delete.mock.resetCalls();
    dbMock.inventory.count.mock.resetCalls();
    dbMock.warehouse.findFirst.mock.resetCalls();
    dbMock.inventoryMovement.create.mock.resetCalls();
    dbMock.inventoryMovement.findMany.mock.resetCalls();
    dbMock.$transaction.mock.resetCalls();
    
    redisMock.del.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("createInventoryItem() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateInventoryAndMovement_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.warehouse.findFirst.mock.mockImplementation(async () => ({
        id: "w-1",
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementation(async () => null); // SKU doesn't exist
      
      const expectedItem = { id: "inv-1", sku: "TEST-SKU", name: "Laptop", quantity: 50 };
      dbMock.inventory.create.mock.mockImplementation(async () => expectedItem);

      // Act
      const result = await inventoryController.createInventoryItem(mockUser, {
        warehouseId: "w-1",
        name: "Laptop",
        sku: "TEST-SKU",
        quantity: 50,
        minStock: 10,
        unitValue: 1500,
        currency: "USD"
      });

      // Assert
      expect(result.inventory.id).toBe("inv-1");
      expect(dbMock.inventory.create.mock.calls.length).toBe(1);
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(1); // Should log putaway
      
      const moveArgs = dbMock.inventoryMovement.create.mock.calls[0].arguments[0] as unknown;
      expect(moveArgs.data.type).toBe("PUTAWAY");
      
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1); // Cache invalidated
    });

    it("should_ThrowError_WhenSkuAlreadyExists", async () => {
      // Arrange
      dbMock.warehouse.findFirst.mock.mockImplementation(async () => ({
        companyId: "company-1",
      }));
      dbMock.inventory.findFirst.mock.mockImplementation(async () => ({
        id: "existing-inv",
        sku: "TEST-SKU",
      })); // SKU already exists

      // Act & Assert
      await expect(
        inventoryController.createInventoryItem(mockUser, {
          warehouseId: "w-1",
          name: "Laptop",
          sku: "TEST-SKU",
          quantity: 50,
        })
      ).rejects.toThrow("Item with this SKU already exists in this warehouse");

      expect(dbMock.inventory.create.mock.calls.length).toBe(0);
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(0);
    });
  });

  describe("adjustInventoryStock() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_AdjustStockAndLogMovement_WhenValidRequest", async () => {
      // Arrange
      dbMock.inventory.findFirst.mock.mockImplementation(async () => ({
        sku: "SKU-1",
        warehouseId: "w-1",
        companyId: "company-1",
        quantity: 100,
      }));

      dbMock.inventory.update.mock.mockImplementation(async () => ({
        id: "inv-1",
        warehouseId: "w-1",
        sku: "SKU-1",
        quantity: 120, // Incremented by 20
      }));

      // Act
      const result = await inventoryController.adjustInventoryStock(mockUser, "inv-1", 20, "ADJUSTMENT", "Found extra box");

      // Assert
      expect(result.quantity).toBe(120);
      expect(dbMock.inventory.update.mock.calls.length).toBe(1);
      
      const updateArgs = dbMock.inventory.update.mock.calls[0].arguments[0] as unknown;
      expect(updateArgs.data.quantity.increment).toBe(20);
      
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(1);
      const moveArgs = dbMock.inventoryMovement.create.mock.calls[0].arguments[0] as unknown;
      expect(moveArgs.data.quantity).toBe(20);
      expect(moveArgs.data.type).toBe("ADJUSTMENT");
    });

    it("should_RecordNegativeDelta_WhenStockIsReduced", async () => {
      // Arrange
      dbMock.inventory.findFirst.mock.mockImplementation(async () => ({
        sku: "SKU-1",
        warehouseId: "w-1",
        companyId: "company-1",
        quantity: 100,
      }));
      dbMock.inventory.update.mock.mockImplementation(async () => ({
        id: "inv-1",
        warehouseId: "w-1",
        sku: "SKU-1",
        quantity: 70,
      }));

      // Act
      const result = await inventoryController.adjustInventoryStock(
        mockUser,
        "inv-1",
        -30,
        "PICK"
      );

      // Assert
      expect(result.quantity).toBe(70);
      const moveArgs = dbMock.inventoryMovement.create.mock.calls[0]
        .arguments[0] as unknown;
      expect(moveArgs.data.quantity).toBe(-30);
      expect(moveArgs.data.type).toBe("PICK");
    });

    it("should_ThrowAndSkipMovement_WhenAdjustmentWouldGoNegative", async () => {
      // Arrange — 100 in stock, removing 150 would leave -50
      dbMock.inventory.findFirst.mock.mockImplementation(async () => ({
        sku: "SKU-1",
        warehouseId: "w-1",
        companyId: "company-1",
        quantity: 100,
      }));
      dbMock.inventory.update.mock.mockImplementation(async () => ({
        id: "inv-1",
        warehouseId: "w-1",
        sku: "SKU-1",
        quantity: -50,
      }));
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        inventoryController.adjustInventoryStock(mockUser, "inv-1", -150)
      ).rejects.toThrow(
        "Insufficient stock: adjustment would result in negative quantity"
      );
      // The movement must not be written when the transaction is rolled back
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });

    it("should_ThrowWithoutUpdate_WhenItemBelongsToAnotherCompany", async () => {
      // Arrange
      // adjustInventoryStock scopes the lookup itself via `where: { id, companyId }`
      // (mutations.ts) — a row from another tenant simply doesn't match that
      // filter and Prisma returns null, exactly like an unknown id.
      dbMock.inventory.findFirst.mock.mockImplementation(async () => null);
      const consoleMock = mock.method(console, "error", () => {});

      // Act & Assert
      await expect(
        inventoryController.adjustInventoryStock(mockUser, "inv-1", 10)
      ).rejects.toThrow("Inventory item not found or unauthorized");
      expect(dbMock.inventory.update.mock.calls.length).toBe(0);
      expect(dbMock.inventoryMovement.create.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });
  });
});

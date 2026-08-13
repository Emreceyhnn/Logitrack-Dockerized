 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR
const dbMock = {
  customer: {
    findFirst: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    count: mock.fn(),
    findUnique: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  customerLocation: {
    findMany: mock.fn(),
  },
};

const redisMock = {
  del: mock.fn(async () => 1),
};

const cacheUtilsMock = {
  redis: redisMock,
  withCache: mock.fn(async (key, ttl, cb) => cb()),
  invalidatePattern: mock.fn(async () => 1),
  hashFilters: mock.fn(() => "mock-hash"),
  customerCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
    dashboard: mock.fn(() => "dashboard-key"),
  },
  CUSTOMER_CACHE_TTL: 3600,
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

const trendUtilsMock = {
  calcTrend: mock.fn(() => 5),
  daysAgo: mock.fn(() => new Date()),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../redis.ts", { namedExports: cacheUtilsMock });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("./utils/checkPermission.ts", { namedExports: checkPermissionMock });
mock.module("./utils/trendUtils.ts", { namedExports: trendUtilsMock });

mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

// 2. TEST GRUPLARI
describe("Customer Controller", () => {
  let customerController: unknown;

  before(async () => {
    customerController = await import("./customer");
  });

  beforeEach(() => {
    dbMock.customer.findFirst.mock.resetCalls();
    dbMock.customer.create.mock.resetCalls();
    dbMock.customer.findMany.mock.resetCalls();
    dbMock.customer.count.mock.resetCalls();
    dbMock.customer.findUnique.mock.resetCalls();
    dbMock.customer.update.mock.resetCalls();
    dbMock.customer.delete.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
  });

  describe("createCustomer() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateCustomer_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.customer.findFirst.mock.mockImplementation(async () => null); // Code not taken
      
      const expectedCustomer = { id: "cust-1", name: "Acme Corp", code: "ACME-1" };
      dbMock.customer.create.mock.mockImplementation(async () => expectedCustomer);

      // Act
      const result = await customerController.createCustomer(
        mockUser, "Acme Corp", "ACME-1", "Tech", "TAX-123", "acme@test.com", "555-1234"
      );

      // Assert
      expect(result.customer.id).toBe("cust-1");
      expect(dbMock.customer.create.mock.calls.length).toBe(1);
      
      const createArgs = dbMock.customer.create.mock.calls[0].arguments[0] as unknown;
      expect(createArgs.data.name).toBe("Acme Corp");
      
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenCustomerCodeAlreadyExists", async () => {
      // Arrange
      dbMock.customer.findFirst.mock.mockImplementation(async () => ({ id: "existing-cust" }));

      // Act & Assert
      await expect(
        customerController.createCustomer(mockUser, "Acme Corp", "ACME-1")
      ).rejects.toThrow("Customer with this code already exists");
    });
  });
});

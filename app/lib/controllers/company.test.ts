 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const dbMock = {
  company: {
    findUnique: mock.fn(),
    // createCompany's uniqueness checks use findFirst so they can spread
    // INCLUDE_DELETED (findUnique rejects non-unique fields in `where`).
    findFirst: mock.fn(),
    create: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  user: {
    findUnique: mock.fn(),
    update: mock.fn(),
    findMany: mock.fn(),
    count: mock.fn(),
  },
  role: {
    upsert: mock.fn(),
    findFirst: mock.fn(),
  },
  vehicle: { count: mock.fn(), findMany: mock.fn() },
  driver: { count: mock.fn(), findMany: mock.fn(), findUnique: mock.fn(), create: mock.fn() },
  warehouse: { count: mock.fn(), findMany: mock.fn() },
  customer: { count: mock.fn(), findMany: mock.fn() },
  shipment: { count: mock.fn() },
  $transaction: mock.fn(async (cb) => cb(dbMock)),
};

const sessionMock = {
  createSession: mock.fn(),
  revokeSession: mock.fn(),
};

const redisMock = {
  del: mock.fn(async () => 1),
};

const cacheUtilsMock = {
  redis: redisMock,
  withCache: mock.fn(async (key, ttl, cb) => cb()),
  invalidatePattern: mock.fn(async () => 1),
  hashFilters: mock.fn(() => "mock-hash"),
  companyCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    dashboard: mock.fn(() => "dashboard-key"),
  },
  driverCacheKeys: {
    companyPattern: mock.fn(() => "driver-company-pattern"),
  },
  COMPANY_CACHE_TTL: 3600,
  WAREHOUSE_CACHE_TTL: 3600,
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// createCompany gates on a verified email address. The real guard reads the DB
// and throws EmailNotVerifiedError, which is a separate concern from what these
// tests assert — stub it so the company logic itself is what's under test.
const requireVerifiedEmailMock = {
  requireVerifiedEmail: mock.fn(async () => {}),
};

const trendUtilsMock = {
  calcTrend: mock.fn(() => 5),
  daysAgo: mock.fn(() => new Date()),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("./session.ts", { namedExports: sessionMock });
mock.module("../redis.ts", { namedExports: cacheUtilsMock });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("./utils/checkPermission.ts", { namedExports: checkPermissionMock });
mock.module("./utils/requireVerifiedEmail.ts", { namedExports: requireVerifiedEmailMock });
mock.module("./utils/trendUtils.ts", { namedExports: trendUtilsMock });

mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

// 2. TEST GRUPLARI
describe("Company Controller", () => {
  let companyController: unknown;

  before(async () => {
    companyController = await import("./company");
  });

  beforeEach(() => {
    dbMock.company.findFirst.mock.resetCalls();
    dbMock.company.create.mock.resetCalls();
    dbMock.user.update.mock.resetCalls();
    dbMock.role.upsert.mock.resetCalls();
    dbMock.role.findFirst.mock.resetCalls();
    sessionMock.createSession.mock.resetCalls();
    sessionMock.revokeSession.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("createCompany() metodu", () => {
    // createCompany() gates on hasAccess(accessStatus, trialEndsAt) — an
    // ACTIVE subscription always passes regardless of trialEndsAt.
    const mockUser = {
      id: "user-1",
      sessionId: "sess-1",
      accessStatus: "ACTIVE" as const,
      trialEndsAt: null,
    };

    it("should_CreateCompanyAndUpdateUserRole_WhenNameIsUnique", async () => {
      // Arrange
      dbMock.company.findFirst.mock.mockImplementation(async () => null); // Name is not taken
      
      const newCompany = { id: "comp-1", name: "Logi Co" };
      dbMock.company.create.mock.mockImplementation(async () => newCompany);
      
      dbMock.role.findFirst.mock.mockImplementation(async () => ({ id: "role_admin" }));
      
      const updatedUser = { id: "user-1", roleId: "role_admin", companyId: "comp-1" };
      dbMock.user.update.mock.mockImplementation(async () => updatedUser);

      // Act
      const result = await companyController.createCompany(mockUser, "Logi Co");

      // Assert
      expect(result.company.id).toBe("comp-1");
      expect(dbMock.company.create.mock.calls.length).toBe(1);
      expect(dbMock.role.upsert.mock.calls.length).toBe(6); // Creates 6 default roles (admin, manager, dispatcher, driver, warehouse, default)
      expect(dbMock.user.update.mock.calls.length).toBe(1);
      
      expect(sessionMock.revokeSession.mock.calls.length).toBe(1);
      expect(sessionMock.createSession.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenCompanyNameAlreadyExists", async () => {
      // Arrange
      dbMock.company.findFirst.mock.mockImplementation(async () => ({ id: "existing" }));

      // Act & Assert
      await expect(
        companyController.createCompany(mockUser, "Logi Co")
      ).rejects.toThrow("Company name already exists");
    });
  });
});

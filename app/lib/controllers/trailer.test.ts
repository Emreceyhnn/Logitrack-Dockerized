 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  trailer: {
    findFirst: mock.fn(),
    findUnique: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    count: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  trailerAssignment: {
    updateMany: mock.fn(),
    create: mock.fn(),
  },
  vehicle: {
    findUnique: mock.fn(),
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
  trailerCacheKeys: {
    companyPattern: mock.fn(() => "company-pattern"),
    detail: mock.fn(() => "detail-key"),
    list: mock.fn(() => "list-key"),
  },
  TRAILER_CACHE_TTL: 3600,
};

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
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

mock.module("next/cache", {
  namedExports: { revalidatePath: () => {} },
});

// 2. TEST GRUPLARI
describe("Trailer Controller", () => {
  let trailerController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    trailerController = await import("./trailer");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.trailer.findFirst.mock.resetCalls();
    dbMock.trailer.findUnique.mock.resetCalls();
    dbMock.trailer.create.mock.resetCalls();
    dbMock.trailer.findMany.mock.resetCalls();
    dbMock.trailer.count.mock.resetCalls();
    
    redisMock.del.mock.resetCalls();
    cacheUtilsMock.invalidatePattern.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("createTrailer() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_CreateTrailer_WhenValidDataProvided", async () => {
      // Arrange
      dbMock.trailer.findFirst.mock.mockImplementation(async () => null); // No existing trailer
      dbMock.trailer.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "trailer-1",
        ...args.data,
      }));

      const trailerData = {
        plate: "34 TR 123",
        fleetNo: "FL-123",
        type: "DRY_VAN",
        capacityVolumeM3: 100,
        maxLoadKg: 25000,
      };

      // Act
      const result = await trailerController.createTrailer(mockUser, trailerData);

      // Assert
      expect(result.id).toBe("trailer-1");
      expect(result.plate).toBe("34 TR 123");
      expect(dbMock.trailer.create.mock.calls.length).toBe(1);
      expect(cacheUtilsMock.invalidatePattern.mock.calls.length).toBe(1);
      expect(checkPermissionMock.checkPermission.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenPlateOrFleetNoAlreadyExists", async () => {
      // Arrange
      dbMock.trailer.findFirst.mock.mockImplementation(async () => ({
        id: "existing-trailer",
        plate: "34 TR 123",
      }));

      const trailerData = {
        plate: "34 TR 123",
        fleetNo: "TRL-001",
        type: "DRY_VAN",
        capacityVolumeM3: 85,
        maxLoadKg: 24000,
      };

      // Act & Assert
      await expect(
        trailerController.createTrailer(mockUser, trailerData)
      ).rejects.toThrow("Plate or fleet number already exists");

      expect(dbMock.trailer.create.mock.calls.length).toBe(0);
    });
  });

  describe("getTrailerById() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_ReturnTrailer_WhenTrailerExistsAndBelongsToCompany", async () => {
      // Arrange
      dbMock.trailer.findFirst.mock.mockImplementation(async () => ({
        id: "trailer-1",
        plate: "34 TR 123",
        companyId: "company-1",
      }));

      // Act
      const result = await trailerController.getTrailerById(mockUser, "trailer-1");

      // Assert
      expect(result.id).toBe("trailer-1");
      expect(result.plate).toBe("34 TR 123");
      expect(dbMock.trailer.findFirst.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenTrailerDoesNotExist", async () => {
      // Arrange
      dbMock.trailer.findFirst.mock.mockImplementation(async () => null);

      // Act & Assert
      await expect(
        trailerController.getTrailerById(mockUser, "non-existent")
      ).rejects.toThrow("Trailer not found or unauthorized");
    });
  });
});

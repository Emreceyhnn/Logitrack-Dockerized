 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR

// Prisma DB Mock
const dbMock = {
  document: {
    create: mock.fn(),
    findMany: mock.fn(),
    findUnique: mock.fn(),
    delete: mock.fn(),
  },
  driver: {
    findFirst: mock.fn(),
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

// 2. TEST GRUPLARI
describe("Documents Controller", () => {
  let documentsController: unknown;

  before(async () => {
    documentsController = await import("./documents");
  });

  beforeEach(() => {
    dbMock.document.create.mock.resetCalls();
    dbMock.document.findMany.mock.resetCalls();
    dbMock.document.findUnique.mock.resetCalls();
    dbMock.document.delete.mock.resetCalls();
    dbMock.driver.findFirst.mock.resetCalls();
    dbMock.vehicle.findFirst.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
    notificationsMock.sendNotificationAction.mock.resetCalls();
  });

  describe("createDocument() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_CreateDocument_AndSetStatusToExpired_WhenExpiryDateIsInThePast", async () => {
      // Arrange
      dbMock.driver.findFirst.mock.mockImplementation(async () => ({ companyId: "company-1" }));
      dbMock.document.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({ id: "doc-1", ...args.data }));

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      // Act
      const result = await documentsController.createDocument(
        mockUser, "LICENSE", "Driver License", "http://url.com", pastDate, "driver-1"
      );

      // Assert
      expect(result.document.status).toBe("EXPIRED");
      expect(dbMock.document.create.mock.calls.length).toBe(1);
      expect(notificationsMock.sendNotificationAction.mock.calls.length).toBe(1); // Expiration notification should be sent
    });

    it("should_ThrowError_WhenNeitherDriverNorVehicleIsProvided", async () => {
      // Act & Assert
      await expect(
        documentsController.createDocument(mockUser, "LICENSE", "Doc", "http://url")
      ).rejects.toThrow("Document must be associated with a driver or a vehicle");
    });
  });
});

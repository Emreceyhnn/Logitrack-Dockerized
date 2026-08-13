 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  role: {
    findUnique: mock.fn(),
    findFirst: mock.fn(),
    create: mock.fn(),
    findMany: mock.fn(),
    update: mock.fn(),
    delete: mock.fn(),
  },
  user: {
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

// 2. TEST GRUPLARI
describe("Roles Controller", () => {
  let rolesController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    rolesController = await import("./roles");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.role.findUnique.mock.resetCalls();
    dbMock.role.findFirst.mock.resetCalls();
    dbMock.role.create.mock.resetCalls();
    dbMock.role.findMany.mock.resetCalls();
    dbMock.role.update.mock.resetCalls();
    dbMock.role.delete.mock.resetCalls();
    dbMock.user.findFirst.mock.resetCalls();
    
    checkPermissionMock.checkPermission.mock.resetCalls();
  });

  describe("createRole() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_CreateRole_WhenNameDoesNotExist", async () => {
      // Arrange
      dbMock.role.findFirst.mock.mockImplementation(async () => null); // Name is available
      dbMock.role.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "role-1",
        ...args.data,
      }));

      // Act
      const result = await rolesController.createRole(
        mockUser,
        "Admin",
        "Administrator role",
        ["read", "write"]
      );

      // Assert
      expect(result.role.id).toBe("role-1");
      expect(result.role.name).toBe("Admin");
      expect(dbMock.role.create.mock.calls.length).toBe(1);
      expect(checkPermissionMock.checkPermission.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenRoleNameAlreadyExists", async () => {
      // Arrange
      dbMock.role.findFirst.mock.mockImplementation(async () => ({
        id: "existing-role",
        name: "Admin",
        companyId: "company-1",
      }));

      // Act & Assert
      await expect(
        rolesController.createRole(mockUser, "Admin")
      ).rejects.toThrow("Role name already exists");

      expect(dbMock.role.create.mock.calls.length).toBe(0);
    });
  });

  describe("deleteRole() metodu", () => {
    const mockUser = {
      id: "user-1",
      companyId: "company-1",
    };

    it("should_DeleteRole_WhenNotInUse", async () => {
      // Arrange
      // deleteRole first verifies the role is a tenant-owned custom role
      dbMock.role.findUnique.mock.mockImplementation(async () => ({
        id: "role-1",
        name: "Custom",
        companyId: "company-1",
      }));
      dbMock.user.findFirst.mock.mockImplementation(async () => null); // Role is not assigned to any user
      dbMock.role.delete.mock.mockImplementation(async () => ({ id: "role-1" }));

      // Act
      const result = await rolesController.deleteRole(mockUser, "role-1");

      // Assert
      expect(result.success).toBe(true);
      expect(dbMock.user.findFirst.mock.calls.length).toBe(1);
      expect(dbMock.role.delete.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenRoleIsInUse", async () => {
      // Arrange
      dbMock.role.findUnique.mock.mockImplementation(async () => ({
        id: "role-1",
        name: "Custom",
        companyId: "company-1",
      }));
      dbMock.user.findFirst.mock.mockImplementation(async () => ({
        id: "some-user",
        roleId: "role-1",
      }));

      // Act & Assert
      await expect(
        rolesController.deleteRole(mockUser, "role-1")
      ).rejects.toThrow("Cannot delete role because it is assigned to one or more users");

      expect(dbMock.role.delete.mock.calls.length).toBe(0);
    });
  });
});

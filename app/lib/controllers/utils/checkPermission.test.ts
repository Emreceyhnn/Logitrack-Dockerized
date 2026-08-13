 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR
const dbMock = {
  user: {
    findUnique: mock.fn(),
  },
};

const rolesMock = [
  { id: "role_admin", name: "Administrator", names: ["Administrator", "Admin"] },
  { id: "role_manager", name: "Manager", names: ["Manager", "Yönetici"] }
];

mock.module("../../db.ts", { namedExports: { db: dbMock } });
mock.module("@/roles.json", { defaultExport: rolesMock });

// 2. TEST GRUPLARI
describe("Check Permission Utility", () => {
  let checkPermissionMod: unknown;

  before(async () => {
    checkPermissionMod = await import("./checkPermission");
  });

  beforeEach(() => {
    dbMock.user.findUnique.mock.resetCalls();
  });

  describe("checkPermission() metodu", () => {
    it("should_ThrowError_WhenUserHasNoCompanyAndAllowNoCompanyIsFalse", async () => {
      const user = { id: "u-1", companyId: null };
      
      await expect(
        checkPermissionMod.checkPermission(user, null)
      ).rejects.toThrow("User has no company");
    });

    it("should_ThrowError_WhenUserCompanyDoesNotMatchTargetCompany", async () => {
      const user = { id: "u-1", companyId: "comp-1" };
      
      await expect(
        checkPermissionMod.checkPermission(user, "comp-2")
      ).rejects.toThrow("User is not authorized to access this company");
    });

    it("should_ResolveUserObject_WhenValidationPasses", async () => {
      const user = { id: "u-1", companyId: "comp-1", roleName: "Administrator" };
      
      const result = await checkPermissionMod.checkPermission(user, "comp-1");
      expect(result.id).toBe("u-1");
      expect(result.companyId).toBe("comp-1");
    });

    it("should_ThrowError_WhenUserLacksRequiredRole", async () => {
      const user = { id: "u-1", companyId: "comp-1", roleName: "Driver" };
      
      await expect(
        checkPermissionMod.checkPermission(user, "comp-1", ["role_admin", "role_manager"])
      ).rejects.toThrow("Insufficient permissions. Required roles: role_admin, role_manager");
    });

    it("should_Pass_WhenUserHasRequiredRole", async () => {
      const user = { id: "u-1", companyId: "comp-1", roleName: "Yönetici" }; // Maps to role_manager
      
      const result = await checkPermissionMod.checkPermission(user, "comp-1", ["role_manager"]);
      expect(result.id).toBe("u-1");
    });

    it("should_FetchUserFromDb_WhenUserIdStringIsProvided", async () => {
      dbMock.user.findUnique.mock.mockImplementation(async () => ({
        id: "u-1",
        companyId: "comp-1",
        role: { name: "Administrator" }
      }));

      const result = await checkPermissionMod.checkPermission("u-1", "comp-1", ["role_admin"]);
      
      expect(result.id).toBe("u-1");
      expect(dbMock.user.findUnique.mock.calls.length).toBe(1);
    });
  });
});

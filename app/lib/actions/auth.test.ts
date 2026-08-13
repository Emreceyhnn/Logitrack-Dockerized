 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const authMiddlewareMock = {
  getAuthenticatedUser: mock.fn(),
};

const usersControllerMock = {
  LogoutUser: mock.fn(),
};

const sessionControllerMock = {
  refreshSession: mock.fn(),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("../controllers/users.ts", { namedExports: usersControllerMock });
mock.module("../controllers/session.ts", { namedExports: sessionControllerMock });

// 2. TEST GRUPLARI
describe("Auth Actions", () => {
  let authActions: unknown;

  before(async () => {
    authActions = await import("./auth");
  });

  beforeEach(() => {
    authMiddlewareMock.getAuthenticatedUser.mock.resetCalls();
    usersControllerMock.LogoutUser.mock.resetCalls();
    sessionControllerMock.refreshSession.mock.resetCalls();
  });

  describe("getUserSession() metodu", () => {
    it("should_ReturnUser_WhenAuthenticated", async () => {
      // Arrange
      const mockUser = { id: "user-1", email: "test@test.com" };
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => mockUser);

      // Act
      const result = await authActions.getUserSession();

      // Assert
      expect(result).toBe(mockUser);
      expect(authMiddlewareMock.getAuthenticatedUser.mock.calls.length).toBe(1);
    });

    it("should_ThrowError_WhenGetAuthenticatedUserFails", async () => {
      // Arrange
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => {
        throw new Error("Not authenticated");
      });

      // Act & Assert
      await expect(authActions.getUserSession()).rejects.toThrow("Not authenticated");
    });
  });

  describe("logoutAction() metodu", () => {
    it("should_CallLogoutUser", async () => {
      usersControllerMock.LogoutUser.mock.mockImplementation(async () => ({ success: true }));
      const result = await authActions.logoutAction();
      expect(result.success).toBe(true);
      expect(usersControllerMock.LogoutUser.mock.calls.length).toBe(1);
    });
  });

  describe("refreshSessionAction() metodu", () => {
    it("should_CallRefreshSession", async () => {
      sessionControllerMock.refreshSession.mock.mockImplementation(async () => true);
      const result = await authActions.refreshSessionAction();
      expect(result.success).toBe(true);
      expect(sessionControllerMock.refreshSession.mock.calls.length).toBe(1);
    });
  });
});

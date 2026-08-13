 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const cookiesMock = {
  set: mock.fn(),
  get: mock.fn(),
};

const nextHeadersMock = {
  cookies: mock.fn(async () => cookiesMock),
};

const redisMock = {
  set: mock.fn(async () => "OK"),
  get: mock.fn(),
};

const authMiddlewareMock = {
  getAuthenticatedUser: mock.fn(),
};

mock.module("next/headers", { namedExports: nextHeadersMock });
mock.module("../redis.ts", { namedExports: { redis: redisMock } });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });

// 2. TEST GRUPLARI
describe("Theme Actions", () => {
  let themeActions: unknown;

  before(async () => {
    themeActions = await import("./theme");
  });

  beforeEach(() => {
    cookiesMock.set.mock.resetCalls();
    cookiesMock.get.mock.resetCalls();
    redisMock.set.mock.resetCalls();
    redisMock.get.mock.resetCalls();
    authMiddlewareMock.getAuthenticatedUser.mock.resetCalls();
  });

  describe("saveUserTheme() metodu", () => {
    it("should_SaveThemeToCookieAndRedis_WhenUserIsAuthenticated", async () => {
      // Arrange
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({ id: "user-1" }));

      // Act
      const result = await themeActions.saveUserTheme("dark");

      // Assert
      expect(result.success).toBe(true);
      expect(cookiesMock.set.mock.calls.length).toBe(1);
      expect(cookiesMock.set.mock.calls[0].arguments[0]).toBe("logitrack-theme");
      expect(cookiesMock.set.mock.calls[0].arguments[1]).toBe("dark");
      expect(redisMock.set.mock.calls.length).toBe(1);
    });

    it("should_ReturnError_WhenUserIsNotAuthenticated", async () => {
      // Arrange
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => null);

      // Act
      const result = await themeActions.saveUserTheme("dark");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("getUserTheme() metodu", () => {
    it("should_ReturnThemeFromCookie_WhenAvailable", async () => {
      // Arrange
      cookiesMock.get.mock.mockImplementation(() => ({ value: "light" }));

      // Act
      const result = await themeActions.getUserTheme();

      // Assert
      expect(result).toBe("light");
      expect(redisMock.get.mock.calls.length).toBe(0); // Should not hit redis
    });

    it("should_ReturnThemeFromRedis_WhenCookieIsMissing", async () => {
      // Arrange
      cookiesMock.get.mock.mockImplementation(() => undefined);
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({ id: "user-1" }));
      redisMock.get.mock.mockImplementation(async () => "dark");

      // Act
      const result = await themeActions.getUserTheme();

      // Assert
      expect(result).toBe("dark");
      expect(redisMock.get.mock.calls.length).toBe(1);
    });
  });
});

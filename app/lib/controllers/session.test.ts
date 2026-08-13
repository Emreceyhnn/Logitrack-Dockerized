 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { UserStatus } from "@prisma/client";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  session: {
    create: mock.fn(),
    findUnique: mock.fn(),
    update: mock.fn(),
    findMany: mock.fn(),
    updateMany: mock.fn(),
    deleteMany: mock.fn(),
  },
  auditLog: {
    create: mock.fn(),
  },
  // createSession resolves roleName from roleId when the caller doesn't
  // provide one (session/core.ts) — the mock must cover that lookup.
  role: {
    findUnique: mock.fn(async () => ({ name: "Admin" })),
  },
  // createSession/refreshSession bake the caller's entitlement into the
  // token via resolveEntitlement() (entitlement.server.ts), which first
  // looks up the user's own subscription via db.user.findUnique — default
  // to no subscription (NONE access), matching a session test's default user.
  user: {
    findUnique: mock.fn(async () => ({ companyId: "company-1", subscription: null })),
  },
  subscription: {
    findFirst: mock.fn(async () => null),
  },
};

// Redis Mock
const redisMock = {
  get: mock.fn(async () => null),
  set: mock.fn(async () => "OK"),
  del: mock.fn(async () => 1),
};

// Cookie Store Mock
const cookieStoreMock = {
  get: mock.fn(),
  set: mock.fn(),
  delete: mock.fn(),
};

// Next.js Headers Mock
const headerStoreMock = {
  get: mock.fn(() => null),
};
const nextHeadersMock = {
  cookies: mock.fn(async () => cookieStoreMock),
  headers: mock.fn(async () => headerStoreMock),
};

// Jose JWT Mock
const joseMock = {
  SignJWT: class {
    setProtectedHeader() { return this; }
    setJti() { return this; }
    setExpirationTime() { return this; }
    async sign() { return "mocked-jwt-token"; }
  },
  jwtVerify: mock.fn(async () => ({
    payload: { id: "user-1", role: "admin", companyId: "company-1" }
  })),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../redis.ts", {
  namedExports: { redis: redisMock },
});

mock.module("next/headers", {
  namedExports: nextHeadersMock,
});

mock.module("jose", {
  namedExports: joseMock,
});

// Environment variable setup
process.env.JWT_SECRET = "super-secret-key-for-testing-only";

// 2. TEST GRUPLARI
describe("Session Controller", () => {
  let sessionController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    sessionController = await import("./session");
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    dbMock.session.create.mock.resetCalls();
    dbMock.session.findUnique.mock.resetCalls();
    dbMock.session.update.mock.resetCalls();
    dbMock.session.findMany.mock.resetCalls();
    dbMock.session.updateMany.mock.resetCalls();
    dbMock.auditLog.create.mock.resetCalls();
    dbMock.user.findUnique.mock.resetCalls();
    dbMock.user.findUnique.mock.mockImplementation(async () => ({
      companyId: "company-1",
      subscription: null,
    }));
    dbMock.subscription.findFirst.mock.resetCalls();
    dbMock.subscription.findFirst.mock.mockImplementation(async () => null);
    
    redisMock.get.mock.resetCalls();
    redisMock.set.mock.resetCalls();
    redisMock.del.mock.resetCalls();

    cookieStoreMock.get.mock.resetCalls();
    cookieStoreMock.set.mock.resetCalls();
    cookieStoreMock.delete.mock.resetCalls();
  });

  describe("createSession() metodu", () => {
    it("should_CreateSessionAndSetCookies_WhenValidUserProvided", async () => {
      // Arrange
      const mockUser = {
        id: "user-1",
        companyId: "company-1",
        roleId: "role-1",
      };

      dbMock.session.create.mock.mockImplementation(async () => ({
        id: "session-1",
      }));

      // Act
      const result = await sessionController.createSession(mockUser, "Chrome", "127.0.0.1");

      // Assert
      expect(result.accessToken).toBe("mocked-jwt-token");
      expect(result.sessionId).toBe("session-1");
      expect(dbMock.session.create.mock.calls.length).toBe(1);
      expect(cookieStoreMock.set.mock.calls.length).toBe(2); // One for token, one for refreshToken
    });
  });

  describe("validateSession() metodu", () => {
    it("should_ReturnSessionUser_WhenValidTokenExists", async () => {
      // Arrange
      cookieStoreMock.get.mock.mockImplementation(() => ({ value: "valid-token" }));
      
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        id: "session-1",
        expiresAt: futureDate,
        lastActivityAt: new Date(),
        isRevoked: false,
        user: {
          id: "user-1",
          companyId: "company-1",
          status: UserStatus.ACTIVE,
          role: { name: "Admin" },
        },
      }));

      redisMock.get.mock.mockImplementation(async () => null); // Force DB lookup

      // Act
      const result = await sessionController.validateSession();

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-1");
      expect(result?.companyId).toBe("company-1");
      expect(dbMock.session.findUnique.mock.calls.length).toBe(1);
    });

    it("should_ReturnNullAndClearCookies_WhenSessionIsRevoked", async () => {
      // Arrange
      cookieStoreMock.get.mock.mockImplementation(() => ({ value: "valid-token" }));

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        id: "session-1",
        expiresAt: futureDate,
        lastActivityAt: new Date(),
        isRevoked: true, // Revoked!
        user: {
          id: "user-1",
          status: UserStatus.ACTIVE,
        },
      }));

      redisMock.get.mock.mockImplementation(async () => null);

      // Act
      const result = await sessionController.validateSession();

      // Assert
      expect(result).toBeNull();
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
    });

    it("should_ReturnNull_WhenUserIsNotActive", async () => {
      // Arrange
      cookieStoreMock.get.mock.mockImplementation(() => ({ value: "valid-token" }));

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        id: "session-1",
        expiresAt: futureDate,
        lastActivityAt: new Date(),
        isRevoked: false,
        user: {
          id: "user-1",
          status: UserStatus.SUSPENDED,
        },
      }));

      redisMock.get.mock.mockImplementation(async () => null);

      // Act
      const result = await sessionController.validateSession();

      // Assert
      expect(result).toBeNull();
    });

    it("should_ReturnNullAndClearCookies_WhenTokenIsExpired", async () => {
      // Arrange
      cookieStoreMock.get.mock.mockImplementation(() => ({ value: "valid-token" }));
      
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        id: "session-1",
        expiresAt: pastDate, // Expired!
        lastActivityAt: new Date(),
        isRevoked: false,
        user: {
          id: "user-1",
          status: UserStatus.ACTIVE,
        },
      }));

      redisMock.get.mock.mockImplementation(async () => null);

      // Act
      const result = await sessionController.validateSession();

      // Assert
      expect(result).toBeNull();
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2); // token and refreshToken
    });
  });

  describe("revokeSession() metodu", () => {
    it("should_MarkSessionAsRevoked_RemoveFromRedis_AndDenylistToken", async () => {
      // Arrange
      redisMock.del.mock.resetCalls();
      redisMock.set.mock.resetCalls();
      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        token: "hashed-token",
      }));
      dbMock.session.updateMany.mock.mockImplementation(async () => ({ count: 1 }));

      // Act
      await sessionController.revokeSession("session-1");

      // Assert — DB flag set, cache dropped, token added to revocation denylist
      expect(dbMock.session.updateMany.mock.calls.length).toBe(1);
      expect(redisMock.del.mock.calls[0].arguments[0]).toBe("session:hashed-token");

      const denylistCall = redisMock.set.mock.calls.find(
        (c: { arguments: unknown[] }) =>
          c.arguments[0] === "revoked:token:hashed-token"
      );
      expect(denylistCall).toBeDefined();
      // TTL is set so the entry auto-expires with the token
      expect(denylistCall.arguments[2]).toHaveProperty("ex");
    });
  });

  describe("refreshSession() metodu", () => {
    const validSession = () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      return {
        id: "session-1",
        refreshToken: "stored-refresh-hash",
        isRevoked: false,
        expiresAt: futureDate,
        ipAddress: "127.0.0.1",
        deviceInfo: "Chrome",
        user: {
          id: "user-1",
          roleId: "role-1",
          companyId: "company-1",
          status: UserStatus.ACTIVE,
        },
      };
    };

    const withCookies = (values: Record<string, string | undefined>) => {
      cookieStoreMock.get.mock.mockImplementation((name: string) =>
        values[name] !== undefined ? { value: values[name] } : undefined
      );
    };

    it("should_RotateTokensAndReturnTrue_WhenRefreshTokenIsValid", async () => {
      // Arrange
      withCookies({ refreshToken: "raw-refresh", token: "old-access" });
      dbMock.session.findUnique.mock.mockImplementation(async () => validSession());
      dbMock.session.update.mock.mockImplementation(async () => ({}));
      dbMock.auditLog.create.mock.mockImplementation(async () => ({}));

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(true);
      // DB rotation happened
      expect(dbMock.session.update.mock.calls.length).toBe(1);
      const updateArgs = dbMock.session.update.mock.calls[0].arguments[0];
      expect(updateArgs.where).toEqual({ id: "session-1" });
      expect(typeof updateArgs.data.refreshToken).toBe("string");
      // Rotation: the new refresh token hash must differ from the hash the
      // session was looked up with (token reuse must not be possible).
      const lookupHash =
        dbMock.session.findUnique.mock.calls[0].arguments[0].where.refreshToken;
      expect(updateArgs.data.refreshToken).not.toBe(lookupHash);
      // New cookies set for token + refreshToken
      const setNames = cookieStoreMock.set.mock.calls.map(
        (c: Record<string, unknown>) => c.arguments[0]
      );
      expect(setNames).toContain("token");
      expect(setNames).toContain("refreshToken");
      // Old access-token cache invalidated, and the stale-claims marker cleared
      // now that the re-minted JWT carries current companyId/role claims.
      const delKeys = redisMock.del.mock.calls.map(
        (c: Record<string, unknown>) => c.arguments[0]
      );
      expect(delKeys.some((k: string) => k.startsWith("session:"))).toBe(true);
      expect(delKeys).toContain("stale:claims:user-1");
      // Refresh is audit-logged
      const auditArgs = dbMock.auditLog.create.mock.calls.map(
        (c: Record<string, unknown>) => c.arguments[0]?.data?.action
      );
      expect(auditArgs).toContain("TOKEN_REFRESH");
    });

    it("should_ReturnFalse_WhenNoRefreshTokenCookie", async () => {
      // Arrange
      withCookies({});

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      expect(dbMock.session.findUnique.mock.calls.length).toBe(0);
      expect(dbMock.session.update.mock.calls.length).toBe(0);
    });

    it("should_ReturnFalseAndClearCookies_WhenRefreshTokenIsUnknown", async () => {
      // Arrange
      withCookies({ refreshToken: "stolen-or-stale" });
      dbMock.session.findUnique.mock.mockImplementation(async () => null);

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
      expect(dbMock.session.update.mock.calls.length).toBe(0);
    });

    it("should_ReturnFalseWithoutRotation_WhenSessionIsRevoked", async () => {
      // Arrange
      withCookies({ refreshToken: "raw-refresh" });
      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        ...validSession(),
        isRevoked: true,
      }));

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      expect(dbMock.session.update.mock.calls.length).toBe(0);
      expect(cookieStoreMock.set.mock.calls.length).toBe(0);
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
    });

    it("should_ReturnFalseWithoutRotation_WhenSessionIsExpired", async () => {
      // Arrange
      withCookies({ refreshToken: "raw-refresh" });
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      dbMock.session.findUnique.mock.mockImplementation(async () => ({
        ...validSession(),
        expiresAt: pastDate,
      }));

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      expect(dbMock.session.update.mock.calls.length).toBe(0);
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
    });

    it("should_ReturnFalseWithoutRotation_WhenUserIsNotActive", async () => {
      // Arrange
      withCookies({ refreshToken: "raw-refresh" });
      const session = validSession();
      session.user.status = "SUSPENDED";
      dbMock.session.findUnique.mock.mockImplementation(async () => session);

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      expect(dbMock.session.update.mock.calls.length).toBe(0);
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
    });

    it("should_ReturnFalse_WhenDbFailsDuringRotation", async () => {
      // Arrange
      withCookies({ refreshToken: "raw-refresh" });
      dbMock.session.findUnique.mock.mockImplementation(async () => {
        throw new Error("DB down");
      });
      const consoleMock = mock.method(console, "error", () => {});

      // Act
      const result = await sessionController.refreshSession();

      // Assert
      expect(result).toBe(false);
      consoleMock.mock.restore();
    });
  });

  describe("clearAuthCookies() metodu", () => {
    it("should_DeleteTokenAndRefreshTokenCookies", async () => {
      // Act
      await sessionController.clearAuthCookies();

      // Assert
      expect(cookieStoreMock.delete.mock.calls.length).toBe(2);
      expect(cookieStoreMock.delete.mock.calls[0].arguments[0]).toBe("token");
      expect(cookieStoreMock.delete.mock.calls[1].arguments[0]).toBe("refreshToken");
    });
  });
});

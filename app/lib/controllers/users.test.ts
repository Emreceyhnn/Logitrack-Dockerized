 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { rejects } from "node:assert";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Prisma DB Mock
const dbMock = {
  user: {
    findUnique: mock.fn(),
    findFirst: mock.fn(),
    findMany: mock.fn(),
    create: mock.fn(),
    update: mock.fn(),
    upsert: mock.fn(),
  },
  session: {
    findMany: mock.fn(),
  },
  role: {
    findFirst: mock.fn(),
  },
};

// Redis Mock
const redisMock = {
  del: mock.fn(),
};

// Auth & Session Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
  maybeAuthenticatedAction: mock.fn((cb) => cb),
};

// Must cover every export of the ./session barrel that the controllers import.
// A missing name is not a silent undefined — it throws at import time and
// cancels the whole suite before a single test runs.
const sessionMock = {
  createSession: mock.fn(),
  revokeSession: mock.fn(),
  revokeAllUserSessions: mock.fn(),
  invalidateUserSessionCache: mock.fn(),
  clearAuthCookies: mock.fn(),
  cleanExpiredSessions: mock.fn(),
  getUserActiveSessions: mock.fn(),
  logAuditEvent: mock.fn(),
  validateSession: mock.fn(),
  refreshSession: mock.fn(),
  toSessionPayload: mock.fn(),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// Entitlement mock — RegisterUser grants a self-serve trial before minting the
// session. Spied here so the guest-signup test can assert it fired.
const entitlementServerMock = {
  grantTrial: mock.fn(async () => ({ trialEndsAt: new Date() })),
  verifyDemoSignupToken: mock.fn(async () => false),
};

// Next.js Headers Mock
// `cookies` is required as well as `headers`: the regional-settings save
// re-mints the session token in-process (refreshSession), and that reads and
// writes auth cookies. Without this export the whole module fails to load.
const headersMock = {
  headers: mock.fn(async () => ({
    get: mock.fn(() => "127.0.0.1"),
  })),
  cookies: mock.fn(async () => ({
    get: mock.fn(() => undefined),
    set: mock.fn(),
    delete: mock.fn(),
  })),
};

// Rate Limiter Mock
const rateLimiterMock = {
  rateLimit: mock.fn(async () => ({ success: true })),
};

// Notifications Mock
const notificationsMock = {
  sendNotificationAction: mock.fn(),
};

// Bcrypt Mock
const bcryptMock = {
  hash: mock.fn(async () => "hashed-password"),
  compare: mock.fn(async () => true),
};

// Jose Mock
// Mocking "jose" replaces the whole module, so every export the code under test
// imports must be present. session/internal.ts imports SignJWT; omitting it made
// the import throw and cancelled the entire suite before any test ran.
const joseMock = {
  SignJWT: class {
    setProtectedHeader() { return this; }
    setJti() { return this; }
    setExpirationTime() { return this; }
    async sign() { return "mocked-jwt-token"; }
  },
  jwtVerify: mock.fn(),
};

// Modülleri Sisteme Enjekte Etme
mock.module("../db.ts", {
  namedExports: { db: dbMock },
});

mock.module("../redis.ts", {
  namedExports: { redis: redisMock },
});

mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

mock.module("./session.ts", {
  namedExports: sessionMock,
});

mock.module("./utils/checkPermission.ts", {
  namedExports: checkPermissionMock,
});

mock.module("../entitlement.server.ts", {
  namedExports: entitlementServerMock,
});

mock.module("next/headers", {
  namedExports: headersMock,
});

mock.module("../rate-limiter.ts", {
  namedExports: rateLimiterMock,
});

mock.module("../actions/notifications.ts", {
  namedExports: { sendNotificationAction: notificationsMock.sendNotificationAction },
});

mock.module("bcryptjs", {
  defaultExport: bcryptMock,
});

mock.module("jose", {
  namedExports: joseMock,
});

// 2. TEST GRUPLARI
describe("Users Controller", () => {
  let usersController: unknown;

  before(async () => {
    // Dynamically import the module after mocks are defined
    usersController = await import("./users");
  });

  beforeEach(() => {
    // Reset all mock calls before each test
    dbMock.user.findFirst.mock.resetCalls();
    dbMock.user.findUnique.mock.resetCalls();
    dbMock.user.findMany.mock.resetCalls();
    dbMock.user.create.mock.resetCalls();
    
    sessionMock.createSession.mock.resetCalls();
    sessionMock.logAuditEvent.mock.resetCalls();
    rateLimiterMock.rateLimit.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();
    bcryptMock.hash.mock.resetCalls();
    entitlementServerMock.grantTrial.mock.resetCalls();
    entitlementServerMock.verifyDemoSignupToken.mock.resetCalls();
    entitlementServerMock.verifyDemoSignupToken.mock.mockImplementation(async () => false);
  });

  describe("RegisterUser() metodu", () => {
    it("should_RegisterUser_AndCreateSession_WhenDataIsValid", async () => {
      // Arrange
      dbMock.user.findFirst.mock.mockImplementation(async () => null); // Email doesn't exist
      dbMock.user.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "user-1",
        ...args.data,
      }));
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));

      // Act
      const result = await usersController.RegisterUser(
        null, // No authenticated user (guest registration)
        "John",
        "Doe",
        "Secret-Passw0rd",
        "john.doe@example.com"
      );

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.user?.id).toBe("user-1");
      expect(result.user?.email).toBe("john.doe@example.com");
      
      expect(dbMock.user.create.mock.calls.length).toBe(1);
      expect(bcryptMock.hash.mock.calls.length).toBe(1);
      expect(sessionMock.createSession.mock.calls.length).toBe(1);
      expect(sessionMock.logAuditEvent.mock.calls.length).toBe(1);
      expect(rateLimiterMock.rateLimit.mock.calls.length).toBe(1);

      // A trial is a demo-request perk, not a default — a plain signup with
      // no verified demoToken gets no trial and lands on pending-access.
      expect(entitlementServerMock.grantTrial.mock.calls.length).toBe(0);
    });

    it("should_GrantTrial_WhenDemoSignupTokenIsValid", async () => {
      // Arrange
      dbMock.user.findFirst.mock.mockImplementation(async () => null); // Email doesn't exist
      dbMock.user.create.mock.mockImplementation(async (args: Record<string, unknown>) => ({
        id: "user-1",
        ...args.data,
      }));
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));
      entitlementServerMock.verifyDemoSignupToken.mock.mockImplementation(
        async () => true
      );

      // Act
      const result = await usersController.RegisterUser(
        null, // No authenticated user (guest registration)
        "John",
        "Doe",
        "Secret-Passw0rd",
        "john.doe@example.com"
      );

      // Assert
      expect(result.error).toBeUndefined();

      // Self-serve trial granted for the new user before the session is minted,
      // so the access token carries TRIAL entitlement from the first request.
      expect(entitlementServerMock.grantTrial.mock.calls.length).toBe(1);
      expect(entitlementServerMock.grantTrial.mock.calls[0]?.arguments[0]).toBe(
        "user-1"
      );
    });

    it("should_ReturnError_WhenEmailAlreadyExists", async () => {
      // Arrange
      dbMock.user.findFirst.mock.mockImplementation(async () => ({
        id: "existing-user",
        email: "john.doe@example.com",
      }));
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));

      // Act
      const result = await usersController.RegisterUser(
        null,
        "John",
        "Doe",
        "Secret-Passw0rd",
        "john.doe@example.com"
      );

      // Assert
      expect(result.error).toBe("Email already exists");
      expect(result.field).toBe("email");
      
      expect(dbMock.user.create.mock.calls.length).toBe(0);
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
    });

    it("should_ReturnValidationError_WhenPasswordIsWeak", async () => {
      // Arrange
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));

      // Act — password lacks uppercase and digit, violating the server policy
      const result = await usersController.RegisterUser(
        null,
        "John",
        "Doe",
        "weakpassword",
        "john.doe@example.com"
      );

      // Assert
      expect(result.error).toBeDefined();
      expect(result.field).toBe("password");
      expect(dbMock.user.findFirst.mock.calls.length).toBe(0);
      expect(dbMock.user.create.mock.calls.length).toBe(0);
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
    });

    it("should_ReturnValidationError_WhenEmailIsMalformed", async () => {
      // Arrange
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));

      // Act
      const result = await usersController.RegisterUser(
        null,
        "John",
        "Doe",
        "Secret-Passw0rd",
        "not-an-email"
      );

      // Assert
      expect(result.error).toBeDefined();
      expect(result.field).toBe("email");
      expect(dbMock.user.create.mock.calls.length).toBe(0);
    });

    it("should_ReturnRateLimitError_WhenTooManyAttempts", async () => {
      // Arrange
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: false }));

      // Act
      const result = await usersController.RegisterUser(
        null,
        "John",
        "Doe",
        "Secret-Passw0rd",
        "john.doe@example.com"
      );

      // Assert
      expect(result.error).toContain("Too many registration attempts from this IP");
      
      expect(dbMock.user.findFirst.mock.calls.length).toBe(0);
      expect(dbMock.user.create.mock.calls.length).toBe(0);
    });
  });

  describe("LoginUser() metodu", () => {
    const storedUser = {
      id: "user-1",
      name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
      password: "hashed-password",
      companyId: "company-1",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "24h",
      currency: "EUR",
      language: "tr",
    };

    beforeEach(() => {
      dbMock.user.update.mock.resetCalls();
      bcryptMock.compare.mock.resetCalls();
      rateLimiterMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));
      bcryptMock.compare.mock.mockImplementation(async () => true);
    });

    it("should_ReturnUserAndCreateSession_WhenCredentialsAreValid", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => storedUser);
      dbMock.user.update.mock.mockImplementation(async () => storedUser);

      // Act
      const result = await usersController.LoginUser(
        null,
        "john.doe@example.com",
        "correct-password"
      );

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.user).toEqual({
        id: "user-1",
        name: "John",
        surname: "Doe",
        email: "john.doe@example.com",
        companyId: "company-1",
        timezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "24h",
        currency: "EUR",
        language: "tr",
      });
      expect(bcryptMock.compare.mock.calls.length).toBe(1);
      expect(bcryptMock.compare.mock.calls[0].arguments).toEqual([
        "correct-password",
        "hashed-password",
      ]);
      expect(sessionMock.createSession.mock.calls.length).toBe(1);
      // lastLoginAt updated
      expect(dbMock.user.update.mock.calls.length).toBe(1);
      // Successful login is audit-logged as LOGIN
      const auditActions = sessionMock.logAuditEvent.mock.calls.map(
        (c: Record<string, unknown>) => c.arguments[0].action
      );
      expect(auditActions).toContain("LOGIN");
    });

    it("should_RejectWithoutSession_WhenPasswordIsWrong", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => storedUser);
      bcryptMock.compare.mock.mockImplementation(async () => false);

      // Act
      const result = await usersController.LoginUser(
        null,
        "john.doe@example.com",
        "wrong-password"
      );

      // Assert
      expect(result.error).toBe("Invalid credentials");
      expect(result.user).toBeUndefined();
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
      expect(dbMock.user.update.mock.calls.length).toBe(0);
      const failedAudit = sessionMock.logAuditEvent.mock.calls.find(
        (c: Record<string, unknown>) => c.arguments[0].action === "LOGIN_FAILED"
      );
      expect(failedAudit?.arguments[0].metadata.reason).toBe("Invalid password");
    });

    it("should_RejectWithSameError_WhenEmailDoesNotExist", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => null);

      // Act
      const result = await usersController.LoginUser(
        null,
        "ghost@example.com",
        "any-password"
      );

      // Assert — same generic message as wrong password (no user enumeration)
      expect(result.error).toBe("Invalid credentials");
      expect(bcryptMock.compare.mock.calls.length).toBe(0);
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
      const failedAudit = sessionMock.logAuditEvent.mock.calls.find(
        (c: Record<string, unknown>) => c.arguments[0].action === "LOGIN_FAILED"
      );
      expect(failedAudit?.arguments[0].metadata.reason).toBe("User not found");
    });

    it("should_RejectMalformedEmail_BeforeLimiterAndDb", async () => {
      // Act
      const result = await usersController.LoginUser(
        null,
        "not-an-email",
        "any-password"
      );

      // Assert — same generic message, nothing downstream is touched
      expect(result.error).toBe("Invalid credentials");
      expect(rateLimiterMock.rateLimit.mock.calls.length).toBe(0);
      expect(dbMock.user.findUnique.mock.calls.length).toBe(0);
    });

    it("should_BlockBeforeUserLookup_WhenIpRateLimitExceeded", async () => {
      // Arrange — first rateLimit call is the IP check
      rateLimiterMock.rateLimit.mock.mockImplementationOnce(async () => ({
        success: false,
      }));

      // Act
      const result = await usersController.LoginUser(
        null,
        "john.doe@example.com",
        "correct-password"
      );

      // Assert
      expect(result.error).toBe(
        "Too many login attempts. Please try again later."
      );
      expect(dbMock.user.findUnique.mock.calls.length).toBe(0);
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
    });

    it("should_BlockPerAccount_WhenEmailRateLimitExceeded", async () => {
      // Arrange — IP check passes, per-email check fails
      rateLimiterMock.rateLimit.mock.mockImplementationOnce(async () => ({
        success: true,
      }), 0);
      rateLimiterMock.rateLimit.mock.mockImplementationOnce(async () => ({
        success: false,
      }), 1);

      // Act
      const result = await usersController.LoginUser(
        null,
        "john.doe@example.com",
        "correct-password"
      );

      // Assert
      expect(result.error).toBe(
        "Too many login attempts for this account. Please try again later."
      );
      expect(dbMock.user.findUnique.mock.calls.length).toBe(0);
      // Per-email limiter keyed on normalized email
      expect(rateLimiterMock.rateLimit.mock.calls[1].arguments[0]).toBe(
        "john.doe@example.com"
      );
    });

    it("should_ReturnErrorInsteadOfThrowing_WhenDbFails", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => {
        throw new Error("Database connection lost");
      });
      const consoleMock = mock.method(console, "error", () => {});

      // Act
      const result = await usersController.LoginUser(
        null,
        "john.doe@example.com",
        "correct-password"
      );

      // Assert
      expect(result.error).toBe("Database connection lost");
      expect(sessionMock.createSession.mock.calls.length).toBe(0);
      consoleMock.mock.restore();
    });
  });

  describe("getUsers() metodu", () => {
    const mockUser = {
      id: "admin-1",
      companyId: "company-1",
    };

    it("should_ReturnUsersList_WhenUserHasPermission", async () => {
      // Arrange
      const mockUsersList = [
        { id: "u-1", name: "User 1" },
        { id: "u-2", name: "User 2" },
      ];
      dbMock.user.findMany.mock.mockImplementation(async () => mockUsersList);

      // Act
      const result = await usersController.getUsers(mockUser);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("User 1");
      expect(dbMock.user.findMany.mock.calls.length).toBe(1);
      expect(checkPermissionMock.checkPermission.mock.calls.length).toBe(1);
    });
  });
});

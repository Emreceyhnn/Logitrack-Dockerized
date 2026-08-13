 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const dbMock = {
  user: {
    findUnique: mock.fn(),
    update: mock.fn(),
  },
  session: {
    updateMany: mock.fn(async () => ({ count: 1 })),
  },
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const nextCacheMock = {
  revalidatePath: mock.fn(),
};

const bcryptMock = {
  compare: mock.fn(),
  hash: mock.fn(),
};

// updateMyProfile re-signs the access-token cookie after a profile change
// (see profile.ts) so the still-valid cookie doesn't show stale name/avatar.
const cookieStoreMock = {
  get: mock.fn(() => ({ value: "old-token" })),
  set: mock.fn(),
};
const cookiesMock = mock.fn(async () => cookieStoreMock);

const sessionInternalMock = {
  generateAccessToken: mock.fn(async () => "new-token"),
  hashToken: mock.fn((token: string) => `hashed-${token}`),
  ACCESS_TOKEN_MAX_AGE: 3600,
  COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: "lax" as const },
};

const redisMock = {
  del: mock.fn(async () => 1),
};

mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("next/cache", { namedExports: nextCacheMock });
mock.module("bcryptjs", { defaultExport: bcryptMock });
const headersMock = mock.fn(async () => ({
  get: (key: string) =>
    key === "user-agent" ? "Test Browser" : key === "x-real-ip" ? "1.2.3.4" : null,
}));

// changeMyPassword now emits a security alert + audit event, so both are mocked
// here: the test asserts the password write, not the notification side effects.
const sendSecurityAlertEmailMock = mock.fn(async () => {});
const logAuditEventMock = mock.fn(async () => {});

mock.module("next/headers", {
  namedExports: { cookies: cookiesMock, headers: headersMock },
});
mock.module("../services/email.ts", {
  namedExports: { sendSecurityAlertEmail: sendSecurityAlertEmailMock },
});
mock.module("../controllers/session/audit.ts", {
  namedExports: { logAuditEvent: logAuditEventMock },
});
mock.module("../controllers/session/internal.ts", { namedExports: sessionInternalMock });
mock.module("../redis.ts", { namedExports: { redis: redisMock } });

// 2. TEST GRUPLARI
describe("Profile Actions", () => {
  let profileActions: unknown;

  before(async () => {
    profileActions = await import("./profile");
  });

  beforeEach(() => {
    dbMock.user.findUnique.mock.resetCalls();
    dbMock.user.update.mock.resetCalls();
    dbMock.session.updateMany.mock.resetCalls();
    nextCacheMock.revalidatePath.mock.resetCalls();
    bcryptMock.compare.mock.resetCalls();
    bcryptMock.hash.mock.resetCalls();
    cookieStoreMock.get.mock.resetCalls();
    cookieStoreMock.set.mock.resetCalls();
    cookiesMock.mock.resetCalls();
    sessionInternalMock.generateAccessToken.mock.resetCalls();
    sessionInternalMock.hashToken.mock.resetCalls();
    redisMock.del.mock.resetCalls();
    sendSecurityAlertEmailMock.mock.resetCalls();
    logAuditEventMock.mock.resetCalls();
  });

  describe("getMyProfile() metodu", () => {
    const mockUser = { id: "user-1" };

    it("should_ReturnProfile_WhenUserExists", async () => {
      // Arrange
      const expectedProfile = { id: "user-1", name: "John" };
      dbMock.user.findUnique.mock.mockImplementation(async () => expectedProfile);

      // Act
      const result = await profileActions.getMyProfile(mockUser);

      // Assert
      expect(result).toBe(expectedProfile);
      expect(dbMock.user.findUnique.mock.calls.length).toBe(1);
    });
  });

  describe("updateMyProfile() metodu", () => {
    const mockUser = { id: "user-1" };

    it("should_UpdateProfileAndRevalidatePath", async () => {
      // Arrange
      const updateData = { name: "Jane", surname: "Doe" };
      const expectedProfile = { id: "user-1", ...updateData };
      dbMock.user.update.mock.mockImplementation(async () => expectedProfile);

      // Act
      const result = await profileActions.updateMyProfile(mockUser, updateData);

      // Assert
      expect(result.user).toBe(expectedProfile);
      expect(dbMock.user.update.mock.calls.length).toBe(1);
      expect(nextCacheMock.revalidatePath.mock.calls.length).toBe(1);
    });
  });

  describe("changeMyPassword() metodu", () => {
    const mockUser = { id: "user-1" };

    it("should_ChangePassword_WhenCurrentPasswordIsCorrect", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => ({ password: "hashed_old" }));
      bcryptMock.compare.mock.mockImplementation(async () => true); // Password matches
      bcryptMock.hash.mock.mockImplementation(async () => "hashed_new");

      // Act
      const result = await profileActions.changeMyPassword(mockUser, { currentPassword: "old", newPassword: "new" });

      // Assert
      expect(result.success).toBe(true);
      expect(bcryptMock.compare.mock.calls.length).toBe(1);
      expect(bcryptMock.hash.mock.calls.length).toBe(1);
      expect(dbMock.user.update.mock.calls.length).toBe(1);
    });

    it("should_SendSecurityAlert_WhenPasswordIsChanged", async () => {
      // Arrange — a password change is the first move in an account takeover,
      // so the real owner must be told out of band.
      dbMock.user.findUnique.mock.mockImplementation(async () => ({
        password: "hashed_old",
        email: "owner@test.com",
        name: "Owner",
        language: "tr",
      }));
      bcryptMock.compare.mock.mockImplementation(async () => true);
      bcryptMock.hash.mock.mockImplementation(async () => "hashed_new");

      // Act
      await profileActions.changeMyPassword(mockUser, {
        currentPassword: "old",
        newPassword: "new",
      });

      // Assert — alert carries the request's IP/device so the user can judge it
      expect(sendSecurityAlertEmailMock.mock.calls.length).toBe(1);
      const [recipient, payload] = sendSecurityAlertEmailMock.mock.calls[0].arguments;
      expect(recipient).toEqual({ email: "owner@test.com", lang: "tr" });
      expect(payload.kind).toBe("PASSWORD_CHANGED");
      expect(payload.ipAddress).toBe("1.2.3.4");
      expect(payload.deviceInfo).toBe("Test Browser");

      expect(logAuditEventMock.mock.calls.length).toBe(1);
      expect(logAuditEventMock.mock.calls[0].arguments[0].action).toBe("PASSWORD_CHANGE");
    });

    it("should_NotSendSecurityAlert_WhenCurrentPasswordIsWrong", async () => {
      // Arrange — a failed attempt changes nothing, so alerting would be noise
      dbMock.user.findUnique.mock.mockImplementation(async () => ({
        password: "hashed_old",
        email: "owner@test.com",
        name: "Owner",
        language: "en",
      }));
      bcryptMock.compare.mock.mockImplementation(async () => false);

      // Act
      await profileActions.changeMyPassword(mockUser, {
        currentPassword: "wrong",
        newPassword: "new",
      });

      // Assert
      expect(sendSecurityAlertEmailMock.mock.calls.length).toBe(0);
    });

    it("should_ReturnError_WhenCurrentPasswordIsIncorrect", async () => {
      // Arrange
      dbMock.user.findUnique.mock.mockImplementation(async () => ({ password: "hashed_old" }));
      bcryptMock.compare.mock.mockImplementation(async () => false); // Password mismatch

      // Act
      const result = await profileActions.changeMyPassword(mockUser, { currentPassword: "wrong", newPassword: "new" });

      // Assert
      expect(result.error).toBe("Current password is incorrect");
      expect(dbMock.user.update.mock.calls.length).toBe(0);
    });
  });
});

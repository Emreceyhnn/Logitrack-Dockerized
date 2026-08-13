import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const dbMock = {
  invitation: {
    findFirst: mock.fn(),
    findUnique: mock.fn(),
    findMany: mock.fn(),
    update: mock.fn(async (args: unknown) => args),
  },
  user: {
    findFirst: mock.fn(),
    findUnique: mock.fn(),
  },
};

const emailMock = {
  sendCompanyInviteEmail: mock.fn(async () => {}),
};

const rateLimitMock = {
  rateLimit: mock.fn(async () => ({ success: true })),
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

const requireVerifiedEmailMock = {
  requireVerifiedEmail: mock.fn(async () => {}),
};

const sessionInternalMock = {
  generateRefreshToken: mock.fn(() => "raw-token-xyz"),
  hashToken: mock.fn((t: string) => `hashed:${t}`),
};

mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../services/email.ts", { namedExports: emailMock });
mock.module("../rate-limiter.ts", { namedExports: rateLimitMock });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("./utils/checkPermission.ts", { namedExports: checkPermissionMock });
mock.module("./utils/requireVerifiedEmail.ts", { namedExports: requireVerifiedEmailMock });
mock.module("./session/internal.ts", { namedExports: sessionInternalMock });
mock.module("../utils/baseUrl.ts", {
  namedExports: { getBaseUrl: () => "https://app.test" },
});

// 2. TEST GRUPLARI
describe("Invitations Controller", () => {
  let manage: unknown;

  const admin = {
    id: "admin-1",
    companyId: "comp-1",
    language: "en",
  };

  before(async () => {
    manage = await import("./invitations/manage");
  });

  beforeEach(() => {
    dbMock.invitation.findFirst.mock.resetCalls();
    dbMock.invitation.findMany.mock.resetCalls();
    dbMock.invitation.update.mock.resetCalls();
    dbMock.user.findFirst.mock.resetCalls();
    emailMock.sendCompanyInviteEmail.mock.resetCalls();
    rateLimitMock.rateLimit.mock.resetCalls();
    checkPermissionMock.checkPermission.mock.resetCalls();

    rateLimitMock.rateLimit.mock.mockImplementation(async () => ({ success: true }));
    dbMock.user.findFirst.mock.mockImplementation(async () => null);
    dbMock.invitation.update.mock.mockImplementation(
      async (args: { data: Record<string, unknown> }) => ({
        id: "inv-1",
        email: "driver@test.com",
        expiresAt: args.data.expiresAt,
      })
    );
  });

  describe("resendInvitation() metodu", () => {
    const pendingInvite = {
      id: "inv-1",
      email: "driver@test.com",
      companyId: "comp-1",
      status: "PENDING",
      company: { name: "Acme Fleet" },
      role: { id: "role_driver" },
    };

    it("should_MintNewTokenAndResetExpiry_WhenInvitationIsPending", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => pendingInvite);

      // Act
      const result = await manage.resendInvitation(admin, "inv-1");

      // Assert — the raw token is never stored, so resending must mint a fresh one.
      // That also invalidates the old link, which is the point.
      expect(result.id).toBe("inv-1");
      const updateArgs = dbMock.invitation.update.mock.calls[0].arguments[0];
      expect(updateArgs.data.tokenHash).toBe("hashed:raw-token-xyz");
      expect(updateArgs.data.status).toBe("PENDING");
      expect(updateArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Email carries the NEW raw token, not the stored hash
      const [to, url] = emailMock.sendCompanyInviteEmail.mock.calls[0].arguments;
      expect(to).toBe("driver@test.com");
      expect(url).toContain("token=raw-token-xyz");
    });

    it("should_ReviveInvitation_WhenItHasExpired", async () => {
      // Arrange — an expired-but-PENDING row is the main reason to resend
      dbMock.invitation.findFirst.mock.mockImplementation(async () => ({
        ...pendingInvite,
        expiresAt: new Date(Date.now() - 86400000),
      }));

      // Act
      await manage.resendInvitation(admin, "inv-1");

      // Assert
      const updateArgs = dbMock.invitation.update.mock.calls[0].arguments[0];
      expect(updateArgs.data.status).toBe("PENDING");
      expect(updateArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should_Reject_WhenInvitationAlreadyAccepted", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => ({
        ...pendingInvite,
        status: "ACCEPTED",
      }));

      // Act + Assert
      await expect(manage.resendInvitation(admin, "inv-1")).rejects.toThrow(
        /already been accepted/i
      );
      expect(emailMock.sendCompanyInviteEmail.mock.calls.length).toBe(0);
    });

    it("should_Reject_WhenInvitationBelongsToAnotherCompany", async () => {
      // Arrange — the companyId filter is part of the query, so a foreign id finds nothing
      dbMock.invitation.findFirst.mock.mockImplementation(async () => null);

      // Act + Assert
      await expect(manage.resendInvitation(admin, "inv-other")).rejects.toThrow(
        /not found/i
      );
      const where = dbMock.invitation.findFirst.mock.calls[0].arguments[0].where;
      expect(where.companyId).toBe("comp-1");
      expect(emailMock.sendCompanyInviteEmail.mock.calls.length).toBe(0);
    });

    it("should_Reject_WhenRateLimited", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => pendingInvite);
      rateLimitMock.rateLimit.mock.mockImplementation(async () => ({ success: false }));

      // Act + Assert — the limiter must fire before any mail goes out
      await expect(manage.resendInvitation(admin, "inv-1")).rejects.toThrow();
      expect(emailMock.sendCompanyInviteEmail.mock.calls.length).toBe(0);
    });

    it("should_Reject_WhenRecipientJoinedAnotherCompany", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => pendingInvite);
      dbMock.user.findFirst.mock.mockImplementation(async () => ({
        companyId: "comp-999",
      }));

      // Act + Assert
      await expect(manage.resendInvitation(admin, "inv-1")).rejects.toThrow(
        /another company/i
      );
      expect(emailMock.sendCompanyInviteEmail.mock.calls.length).toBe(0);
    });
  });

  describe("revokeInvitation() metodu", () => {
    it("should_SetStatusToRevoked_WhenInvitationIsPending", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => ({
        id: "inv-1",
        status: "PENDING",
      }));

      // Act
      const result = await manage.revokeInvitation(admin, "inv-1");

      // Assert — accept flows all require status PENDING, so this kills the live link
      expect(result.success).toBe(true);
      expect(dbMock.invitation.update.mock.calls[0].arguments[0].data.status).toBe(
        "REVOKED"
      );
    });

    it("should_Reject_WhenInvitationAlreadyAccepted", async () => {
      // Arrange — revoking an accepted invite would imply removing a real member
      dbMock.invitation.findFirst.mock.mockImplementation(async () => ({
        id: "inv-1",
        status: "ACCEPTED",
      }));

      // Act + Assert
      await expect(manage.revokeInvitation(admin, "inv-1")).rejects.toThrow(
        /already accepted/i
      );
      expect(dbMock.invitation.update.mock.calls.length).toBe(0);
    });

    it("should_BeIdempotent_WhenAlreadyRevoked", async () => {
      // Arrange
      dbMock.invitation.findFirst.mock.mockImplementation(async () => ({
        id: "inv-1",
        status: "REVOKED",
      }));

      // Act
      const result = await manage.revokeInvitation(admin, "inv-1");

      // Assert — a repeated revoke succeeds without a redundant write
      expect(result.success).toBe(true);
      expect(dbMock.invitation.update.mock.calls.length).toBe(0);
    });
  });

  describe("getCompanyInvitations() metodu", () => {
    it("should_FlagExpiredRows_WhenStatusIsStillPending", async () => {
      // Arrange — nothing sweeps PENDING → EXPIRED, so the flag is derived at read time
      dbMock.invitation.findMany.mock.mockImplementation(async () => [
        { id: "a", status: "PENDING", expiresAt: new Date(Date.now() - 1000) },
        { id: "b", status: "PENDING", expiresAt: new Date(Date.now() + 86400000) },
        { id: "c", status: "ACCEPTED", expiresAt: new Date(Date.now() - 1000) },
      ]);

      // Act
      const result = await manage.getCompanyInvitations(admin);

      // Assert
      expect(result.map((r: { isExpired: boolean }) => r.isExpired)).toEqual([
        true,
        false,
        false,
      ]);
      expect(dbMock.invitation.findMany.mock.calls[0].arguments[0].where.companyId).toBe(
        "comp-1"
      );
    });
  });
});

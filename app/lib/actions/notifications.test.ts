
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const dbMock = {
  user: {
    findMany: mock.fn(),
  },
  notification: {
    create: mock.fn(),
    updateMany: mock.fn(),
    deleteMany: mock.fn(),
    findMany: mock.fn(),
  },
};

const authMiddlewareMock = {
  getAuthenticatedUser: mock.fn(),
};

const notificationBusMock = {
  publish: mock.fn(),
};

const sendNotificationEmailMock = mock.fn(async () => {});

mock.module("../db.ts", { namedExports: { db: dbMock } });
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("../notificationBus.ts", {
  namedExports: { notificationBus: notificationBusMock },
});
mock.module("../services/email.ts", {
  namedExports: { sendNotificationEmail: sendNotificationEmailMock },
});

// Recipients now carry every preference column, since the dispatcher filters
// the inbox and email channels independently. Defaults mirror the schema.
const makeUser = (
  id: string,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  email: `${id}@test.com`,
  language: "en",
  notifEmailShipment: true,
  notifEmailMaint: true,
  notifEmailAssignment: true,
  notifEmailDelay: true,
  notifPushAssignment: true,
  notifPushDelay: true,
  ...overrides,
});

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: "notif-1",
  title: "Title",
  message: "Message",
  type: "INFO",
  category: null,
  link: null,
  metadata: null,
  isRead: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  userId: null,
  companyId: null,
  roleId: null,
  ...overrides,
});

// 2. TEST GRUPLARI
describe("Notifications Actions", () => {
  let notificationsActions: unknown;

  before(async () => {
    notificationsActions = await import("./notifications");
  });

  beforeEach(() => {
    dbMock.user.findMany.mock.resetCalls();
    dbMock.notification.create.mock.resetCalls();
    dbMock.notification.updateMany.mock.resetCalls();
    dbMock.notification.deleteMany.mock.resetCalls();
    dbMock.notification.findMany.mock.resetCalls();
    authMiddlewareMock.getAuthenticatedUser.mock.resetCalls();
    notificationBusMock.publish.mock.resetCalls();
    sendNotificationEmailMock.mock.resetCalls();

    dbMock.notification.create.mock.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      makeRow(args.data)
    );
  });

  describe("sendNotificationAction() metodu", () => {
    it("should_WriteOneSharedRow_WhenCompanyIdAndCategoryAreProvided", async () => {
      // Arrange
      const target = { companyId: "comp-1" };
      const notification = { title: "Update", message: "New update", type: "INFO", category: "SHIPMENT_UPDATE" };

      // Preference filtering happens in the DB query itself; findMany only
      // returns users who opted in to shipment emails.
      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-1", { language: "tr" }),
        makeUser("u-2"),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert
      expect(result.success).toBe(true);
      expect(dbMock.user.findMany.mock.calls.length).toBe(1);
      const whereClause = dbMock.user.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.companyId).toBe("comp-1");
      expect(whereClause.notifEmailShipment).toBe(true);

      // Company/role-wide targets write exactly ONE shared row, not one per recipient.
      expect(dbMock.notification.create.mock.calls.length).toBe(1);
      const createArgs = dbMock.notification.create.mock.calls[0].arguments[0].data;
      expect(createArgs.userId).toBe(null);
      expect(createArgs.companyId).toBe("comp-1");
      expect(notificationBusMock.publish.mock.calls.length).toBe(1);
    });

    it("should_SendEmail_WhenTargetIsSingleUserAndCategoryIsEmailScoped", async () => {
      // Arrange — the regression: a { userId } target used to skip email entirely.
      const target = { userId: "u-9" };
      const notification = {
        title: "Bakım",
        message: "Araç bakıma alındı",
        type: "ERROR",
        category: "MAINTENANCE_ALERT",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-9", { email: "driver@test.com", language: "tr" }),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — resolved through the same recipient query as company-scoped sends
      expect(result.success).toBe(true);
      const whereClause = dbMock.user.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.id).toBe("u-9");
      // Inbox and email share one column here, so it is asserted directly (no OR)
      expect(whereClause.notifEmailMaint).toBe(true);

      // Personal row written for this user
      const createArgs = dbMock.notification.create.mock.calls[0].arguments[0].data;
      expect(createArgs.userId).toBe("u-9");

      // ...and email is now actually dispatched, in the user's language
      expect(sendNotificationEmailMock.mock.calls.length).toBe(1);
      const [recipients, payload] = sendNotificationEmailMock.mock.calls[0].arguments;
      expect(recipients).toEqual([{ email: "driver@test.com", lang: "tr" }]);
      expect(payload.title).toBe("Bakım");
    });

    it("should_EnforceCompanyBoundary_WhenUserIdAndCompanyIdAreBothProvided", async () => {
      // Arrange
      const target = { companyId: "comp-1", userId: "u-5" };
      const notification = { title: "Atama", message: "Depo yöneticisi", type: "INFO" };

      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-5", { email: "mgr@test.com" }),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — companyId scopes the lookup instead of being ignored
      expect(result.success).toBe(true);
      const whereClause = dbMock.user.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.id).toBe("u-5");
      expect(whereClause.companyId).toBe("comp-1");

      // No category → no preference filter and no email
      expect(whereClause.notifEmailMaint).toBe(undefined);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(0);
      const createArgs = dbMock.notification.create.mock.calls[0].arguments[0].data;
      expect(createArgs.userId).toBe("u-5");
    });

    it("should_SendBothChannels_WhenCategoryIsNewAssignment", async () => {
      // Arrange — NEW_ASSIGNMENT now emails via its own notifEmailAssignment preference,
      // instead of being silently in-app only.
      const target = { userId: "u-7" };
      const notification = {
        title: "Yeni Araç Atandı",
        message: "Araç size atandı",
        type: "SUCCESS",
        category: "NEW_ASSIGNMENT",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-7", { email: "d@test.com", language: "tr" }),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — the query ORs the two channels rather than filtering on one column
      expect(result.success).toBe(true);
      const whereClause = dbMock.user.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.OR).toEqual([
        { notifPushAssignment: true },
        { notifEmailAssignment: true },
      ]);

      expect(dbMock.notification.create.mock.calls.length).toBe(1);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(1);
      const [recipients] = sendNotificationEmailMock.mock.calls[0].arguments;
      expect(recipients).toEqual([{ email: "d@test.com", lang: "tr" }]);
    });

    it("should_SendEmailOnly_WhenInboxChannelIsMuted", async () => {
      // Arrange — user disabled the in-app signal but kept the email channel on
      const target = { userId: "u-10" };
      const notification = {
        title: "Gecikme",
        message: "Sevkiyat gecikti",
        type: "WARNING",
        category: "DELAY_ALERT",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-10", { notifPushDelay: false, notifEmailDelay: true }),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — no inbox row written, but email still goes out
      expect(result.success).toBe(true);
      expect(dbMock.notification.create.mock.calls.length).toBe(0);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(1);
    });

    it("should_SendInboxOnly_WhenEmailChannelIsMuted", async () => {
      // Arrange — the inverse: in-app alert kept, email opted out
      const target = { userId: "u-11" };
      const notification = {
        title: "Gecikme",
        message: "Sevkiyat gecikti",
        type: "WARNING",
        category: "DELAY_ALERT",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => [
        makeUser("u-11", { notifPushDelay: true, notifEmailDelay: false }),
      ]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — row written, no email
      expect(result.success).toBe(true);
      expect(dbMock.notification.create.mock.calls.length).toBe(1);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(0);
    });

    it("should_NotSendEmail_WhenCategoryHasNoEmailChannel", async () => {
      // Arrange — SYSTEM has no policy entry: always inboxed, never emailed
      const target = { userId: "u-12" };
      const notification = {
        title: "Sistem",
        message: "Bakım penceresi",
        type: "INFO",
        category: "SYSTEM",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => [makeUser("u-12")]);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert
      expect(result.success).toBe(true);
      expect(dbMock.notification.create.mock.calls.length).toBe(1);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(0);
    });

    it("should_DeliverNothing_WhenRecipientHasOptedOut", async () => {
      // Arrange — preference filter excludes the user, so findMany returns empty
      const target = { userId: "u-8" };
      const notification = {
        title: "Sevkiyat",
        message: "Güncellendi",
        type: "INFO",
        category: "SHIPMENT_UPDATE",
      };

      dbMock.user.findMany.mock.mockImplementation(async () => []);

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert — no row written, no email, but not an error either
      expect(result.success).toBe(true);
      expect(dbMock.notification.create.mock.calls.length).toBe(0);
      expect(sendNotificationEmailMock.mock.calls.length).toBe(0);
    });

    it("should_SendGlobalNotification_WhenIsGlobalIsTrue", async () => {
      // Arrange
      const target = { isGlobal: true };
      const notification = { title: "Global", message: "Hello", type: "SYSTEM" };

      // Act
      const result = await notificationsActions.sendNotificationAction(target, notification as unknown);

      // Assert
      expect(result.success).toBe(true);
      expect(dbMock.notification.create.mock.calls.length).toBe(1);
      const createArgs = dbMock.notification.create.mock.calls[0].arguments[0].data;
      expect(createArgs.userId).toBe(null);
      expect(createArgs.companyId).toBe(null);
      expect(notificationBusMock.publish.mock.calls.length).toBe(1);
      const publishedEvent = notificationBusMock.publish.mock.calls[0].arguments[0];
      expect(publishedEvent.isGlobal).toBe(true);
    });
  });

  describe("markAsReadAction() metodu", () => {
    it("should_MarkNotificationAsRead_WhenOwnedByCaller", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({
        id: "u-1",
        companyId: "comp-1",
      }));
      dbMock.notification.updateMany.mock.mockImplementation(async () => ({ count: 1 }));

      const result = await notificationsActions.markAsReadAction("notif-1");

      expect(result.success).toBe(true);
      const args = dbMock.notification.updateMany.mock.calls[0].arguments[0];
      expect(args.where.id).toBe("notif-1");
      expect(args.data.isRead).toBe(true);
    });

    it("should_Fail_WhenNotificationNotOwnedByCaller", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({
        id: "u-1",
        companyId: "comp-1",
      }));
      dbMock.notification.updateMany.mock.mockImplementation(async () => ({ count: 0 }));

      const result = await notificationsActions.markAsReadAction("notif-999");

      expect(result.success).toBe(false);
    });

    it("should_Fail_WhenUnauthenticated", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => null);

      const result = await notificationsActions.markAsReadAction("notif-1");

      expect(result.success).toBe(false);
      expect(dbMock.notification.updateMany.mock.calls.length).toBe(0);
    });
  });

  describe("deleteNotificationAction() metodu", () => {
    it("should_DeleteNotification_WhenOwnedByCaller", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({
        id: "u-1",
        companyId: "comp-1",
      }));
      dbMock.notification.deleteMany.mock.mockImplementation(async () => ({ count: 1 }));

      const result = await notificationsActions.deleteNotificationAction("notif-1");

      expect(result.success).toBe(true);
      const args = dbMock.notification.deleteMany.mock.calls[0].arguments[0];
      expect(args.where.id).toBe("notif-1");
    });
  });

  describe("getNotificationsAction() metodu", () => {
    it("should_ReturnHistory_ForSignedInUser", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => ({
        id: "u-1",
        companyId: "comp-1",
        roleId: "role-1",
      }));
      dbMock.notification.findMany.mock.mockImplementation(async () => [makeRow()]);

      const result = await notificationsActions.getNotificationsAction();

      expect(result.success).toBe(true);
      expect(result.notifications.length).toBe(1);
      const whereClause = dbMock.notification.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.OR).toEqual([
        { userId: "u-1" },
        { userId: null, companyId: null },
        { userId: null, companyId: "comp-1", roleId: null },
        { userId: null, companyId: "comp-1", roleId: "role-1" },
      ]);
    });

    it("should_Fail_WhenUnauthenticated", async () => {
      authMiddlewareMock.getAuthenticatedUser.mock.mockImplementation(async () => null);

      const result = await notificationsActions.getNotificationsAction();

      expect(result.success).toBe(false);
    });
  });
});

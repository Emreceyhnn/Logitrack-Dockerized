 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const adminDbMock = {
  ref: mock.fn(() => ({
    push: mock.fn(() => ({
      key: "mock-key",
      set: mock.fn(async () => {}),
    })),
    update: mock.fn(async () => {}),
    remove: mock.fn(async () => {}),
  })),
};

const dbMock = {
  user: {
    findMany: mock.fn(),
  },
};

const sendNotificationEmailMock = mock.fn(async () => {});

mock.module("../firebase-admin.ts", { namedExports: { adminDb: adminDbMock } });
mock.module("../db.ts", { namedExports: { db: dbMock } });
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

// 2. TEST GRUPLARI
describe("Notifications Actions", () => {
  let notificationsActions: unknown;

  before(async () => {
    notificationsActions = await import("./notifications");
  });

  beforeEach(() => {
    adminDbMock.ref.mock.resetCalls();
    dbMock.user.findMany.mock.resetCalls();
    sendNotificationEmailMock.mock.resetCalls();
  });

  describe("sendNotificationAction() metodu", () => {
    it("should_SendTargetedBroadcast_WhenCompanyIdAndCategoryAreProvided", async () => {
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
      // Opt-in filter must be part of the where clause for SHIPMENT_UPDATE
      const whereClause = dbMock.user.findMany.mock.calls[0].arguments[0].where;
      expect(whereClause.companyId).toBe("comp-1");
      expect(whereClause.notifEmailShipment).toBe(true);

      // One personal inbox write per opted-in user
      expect(adminDbMock.ref.mock.calls.length).toBe(2);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-1");
      expect(adminDbMock.ref.mock.calls[1].arguments[0]).toBe("notifications/inbox/u-2");
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

      // Personal inbox still written
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-9");

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
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-5");
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

      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-7");
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

      // Assert — no inbox write, but email still goes out
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls.length).toBe(0);
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

      // Assert — inbox written, no email
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-11");
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
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/inbox/u-12");
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

      // Assert — no inbox write, no email, but not an error either
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls.length).toBe(0);
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
      expect(adminDbMock.ref.mock.calls.length).toBe(1);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("notifications/broadcast");
    });
  });

  describe("markAsReadAction() metodu", () => {
    it("should_MarkNotificationAsRead", async () => {
      const result = await notificationsActions.markAsReadAction("inbox/u-1", "notif-1");
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("inbox/u-1/notif-1");
    });
  });

  describe("deleteNotificationAction() metodu", () => {
    it("should_DeleteNotification", async () => {
      const result = await notificationsActions.deleteNotificationAction("inbox/u-1", "notif-1");
      expect(result.success).toBe(true);
      expect(adminDbMock.ref.mock.calls[0].arguments[0]).toBe("inbox/u-1/notif-1");
    });
  });
});


import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useEffect: mock.fn(),
  useState: mock.fn((init) => [init, mock.fn()]),
  useMemo: mock.fn((cb) => cb()),
  useCallback: mock.fn((cb) => cb),
  useRef: mock.fn((init) => ({ current: init })),
};

const notificationsActionMock = {
  getNotificationsAction: mock.fn(async () => ({ success: true, notifications: [] })),
  markAsReadAction: mock.fn(),
  deleteNotificationAction: mock.fn(),
};

// Keep the rest of React intact (e.g. `cache` used deeper in the import
// graph) and override only the hooks this test drives manually. Real React is
// loaded via CJS require so the ESM cache stays untouched and mock.module can
// still intercept "react".
import { createRequire } from "node:module";
const realReact = createRequire(import.meta.url)("react");
mock.module("react", {
  namedExports: { ...realReact, ...reactMock },
  defaultExport: { ...realReact, ...reactMock },
});

mock.module("../lib/actions/notifications.ts", { namedExports: notificationsActionMock });

// 2. TEST GRUPLARI
describe("useNotifications Hook", () => {
  let useNotificationsMod: unknown;

  before(async () => {
    useNotificationsMod = await import("./useNotifications");
  });

  beforeEach(() => {
    reactMock.useEffect.mock.resetCalls();
    reactMock.useState.mock.resetCalls();
    notificationsActionMock.getNotificationsAction.mock.resetCalls();
    notificationsActionMock.markAsReadAction.mock.resetCalls();
    notificationsActionMock.deleteNotificationAction.mock.resetCalls();
  });

  it("should_InitializeHookAndReturnHelpers", () => {
    const user = { id: "user-1", companyId: "comp-1" };

    // Act
    const result = useNotificationsMod.useNotifications(user);

    // Assert
    expect(result.notifications).toBeDefined();
    expect(result.unreadCount).toBeDefined();
    expect(result.loading).toBeDefined();
    expect(typeof result.markAsRead).toBe("function");
    expect(typeof result.deleteNotification).toBe("function");
  });

  // markAsRead/deleteNotification now take only the notification id — the
  // RTDB `_sourcePath` concept this test used to assert on no longer exists.
  it("should_CallMarkAsReadAction_WithOnlyNotificationId", async () => {
    notificationsActionMock.markAsReadAction.mock.mockImplementation(
      async () => ({ success: true })
    );

    const result = useNotificationsMod.useNotifications({ id: "user-1" });
    const notification = {
      id: "notif-1",
      title: "T",
      message: "M",
      type: "INFO",
      createdAt: Date.now(),
      isRead: false,
    };

    await result.markAsRead(notification);

    expect(notificationsActionMock.markAsReadAction.mock.calls.length).toBe(1);
    expect(notificationsActionMock.markAsReadAction.mock.calls[0]?.arguments).toEqual([
      "notif-1",
    ]);
  });

  it("should_CallDeleteNotificationAction_WithOnlyNotificationId", async () => {
    notificationsActionMock.deleteNotificationAction.mock.mockImplementation(
      async () => ({ success: true })
    );

    const result = useNotificationsMod.useNotifications({ id: "user-1" });
    const notification = {
      id: "notif-2",
      title: "T",
      message: "M",
      type: "INFO",
      createdAt: Date.now(),
      isRead: false,
    };

    await result.deleteNotification(notification);

    expect(notificationsActionMock.deleteNotificationAction.mock.calls.length).toBe(1);
    expect(notificationsActionMock.deleteNotificationAction.mock.calls[0]?.arguments).toEqual([
      "notif-2",
    ]);
  });
});

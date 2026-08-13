 
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

const firebaseMock = {
  db: "mockDb",
  ref: mock.fn(() => "mockRef"),
  onValue: mock.fn(),
  off: mock.fn(),
};

const notificationsActionMock = {
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

// Subscriptions gate on Firebase custom-token auth; stub it as signed in.
mock.module("../lib/firebase-auth.ts", {
  namedExports: { ensureFirebaseAuth: mock.fn(async () => {}) },
});
mock.module("../lib/firebase.ts", { namedExports: firebaseMock });
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
    firebaseMock.ref.mock.resetCalls();
    firebaseMock.onValue.mock.resetCalls();
    notificationsActionMock.markAsReadAction.mock.resetCalls();
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
  });

  it("should_CallMarkAsReadAction_WithNotificationPathAndId", async () => {
    notificationsActionMock.markAsReadAction.mock.mockImplementation(
      async () => ({ success: true })
    );

    const result = useNotificationsMod.useNotifications({ id: "user-1" });
    const notification = {
      id: "notif-1",
      title: "T",
      message: "M",
      type: "GENERAL",
      createdAt: Date.now(),
      isRead: false,
      _sourcePath: "notifications/inbox/user-1",
    };

    await result.markAsRead(notification);

    expect(notificationsActionMock.markAsReadAction.mock.calls.length).toBe(1);
    expect(notificationsActionMock.markAsReadAction.mock.calls[0]?.arguments).toEqual([
      "notifications/inbox/user-1",
      "notif-1",
    ]);
  });
});

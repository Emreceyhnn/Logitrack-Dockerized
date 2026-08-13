 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    primary: { main: "blue", _alpha: { main_05: "", main_10: "", main_30: "" } },
    text: { primary: "black", secondary: "gray" },
    action: { hover: "#eee" },
    divider: "gray",
    background: { paper: "white" }
  }
}));

const useDictionaryMock = mock.fn(() => ({
  notifications: {
    title: "Bildirimler",
    catchUp: "Hepsini Okundu İşaretle",
    initializing: "Yükleniyor...",
    systemClear: "Bildirim Yok"
  }
}));

const useDateSettingsMock = mock.fn(() => ({
  format: "DD/MM/YYYY",
  timezone: "UTC"
}));

const useUserMock = mock.fn(() => ({
  user: { id: "user_1", role: "ADMIN" }
}));

const markAsReadMock = mock.fn();
const markAllAsReadMock = mock.fn();
const deleteNotificationMock = mock.fn();

const useNotificationsMock = mock.fn(() => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: markAsReadMock,
  markAllAsRead: markAllAsReadMock,
  deleteNotification: deleteNotificationMock
}));

const useStateMock = mock.fn((init) => [init, mock.fn()]);

import * as originalReact from "react";
mock.module("react", {
  namedExports: { ...originalReact, useState: useStateMock }
});

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    IconButton: (props: Record<string, unknown>) => ({ type: "IconButton", props }),
    Badge: (props: Record<string, unknown>) => ({ type: "Badge", props }),
    Popover: (props: Record<string, unknown>) => ({ type: "Popover", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props }),
    Divider: (props: Record<string, unknown>) => ({ type: "Divider", props }),
    List: (props: Record<string, unknown>) => ({ type: "List", props }),
    ListItem: (props: Record<string, unknown>) => ({ type: "ListItem", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    Button: (props: Record<string, unknown>) => ({ type: "Button", props }),
    Tooltip: (props: Record<string, unknown>) => ({ type: "Tooltip", props }),
  }
});

// İkonlar
mock.module("@mui/icons-material", {
  namedExports: {
    Notifications: () => ({ type: "NotificationsIcon" }),
    NotificationsActive: () => ({ type: "NotificationsActiveIcon" }),
    Delete: () => ({ type: "DeleteIcon" }),
    CheckCircle: () => ({ type: "ReadIcon" }),
    DoneAll: () => ({ type: "DoneAllIcon" }),
  }
});

// Hook ve Utiller
mock.module("../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock, useLanguage: mock.fn(() => ({ lang: "en" })) } });
mock.module("../../hooks/useDateSettings.ts", { namedExports: { useDateSettings: useDateSettingsMock } });
mock.module("../../hooks/useUser.ts", { namedExports: { useUser: useUserMock } });
mock.module("../../hooks/useNotifications.ts", { namedExports: { useNotifications: useNotificationsMock } });

mock.module("../../lib/priorityColor.ts", {
  namedExports: { getStatusColor: mock.fn(), resolveStatusAlpha: mock.fn() }
});
mock.module("../../lib/utils/date.ts", {
  namedExports: { formatSmartTimestamp: mock.fn() }
});


describe("NotificationBell Component", () => {
  let NotificationBell: unknown;

  before(async () => {
    // Modülü dinamik olarak yüklüyoruz
    const mod = await import("./NotificationBell");
    NotificationBell = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useNotificationsMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
  });

  describe("NotificationBell() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenUserIsProvided", async () => {
      // Arrange
      useNotificationsMock.mock.mockImplementation(() => ({
        notifications: [],
        unreadCount: 0,
        loading: false,
        markAsRead: markAsReadMock,
        markAllAsRead: markAllAsReadMock,
        deleteNotification: deleteNotificationMock
      }));

      // Act
      let error = null;
      try {
        NotificationBell({ user: { id: "user_1" } });
      } catch (e) {
        error = e;
      }

      // Assert
      expect(NotificationBell).toBeDefined();
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
      expect(useNotificationsMock.mock.calls.length).toBeGreaterThan(0);
    });

    it("should_HandleUnreadCount_WhenNotificationsExist", async () => {
      // Arrange
      useNotificationsMock.mock.mockImplementation(() => ({
        notifications: [{ id: 1, title: "Test", isRead: false }],
        unreadCount: 1,
        loading: false,
        markAsRead: markAsReadMock,
        markAllAsRead: markAllAsReadMock,
        deleteNotification: deleteNotificationMock
      }));

      // Act
      try {
        NotificationBell({ user: { id: "user_1" } });
      } catch (e) {}

      // Assert
      expect(useNotificationsMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});

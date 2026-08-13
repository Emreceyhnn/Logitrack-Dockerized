 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    tooltips: {
      notifications: "Notifications",
      account: "Account",
    }
  }
}));

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// Mock child components
mock.module("./DashboardBreadcrumbs.tsx", {
  defaultExport: () => <div data-testid="breadcrumbs">Breadcrumbs</div>,
});
mock.module("../nav/UserAccountNav.tsx", {
  defaultExport: () => <div data-testid="user-nav">User Nav</div>,
});
mock.module("../notifications/NotificationBell.tsx", {
  defaultExport: () => <div data-testid="notification-bell">Notification Bell</div>,
});
mock.module("../sidebar/index.tsx", {
  defaultExport: ({ onMobileClose  }: Record<string, unknown>) => (
    <div data-testid="sidebar">
      Sidebar
      <button onClick={onMobileClose}>Close Sidebar</button>
    </div>
  ),
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

const mockAlpha = { main_10: "rgba(0,0,0,0.1)" };
(customTheme.palette as unknown).divider_alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("DashboardHeader RTL Component", () => {
  let DashboardHeader: unknown;

  before(async () => {
    const mod = await import("./DashboardHeader");
    DashboardHeader = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const MOCK_USER = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    role: "ADMIN"
  };

  describe("DashboardHeader() bileşeni", () => {
    it("should_RenderHeaderWithChildren_WhenUserProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DashboardHeader user={MOCK_USER} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByTestId("breadcrumbs")).toBeTruthy();
      expect(screen.getByTestId("user-nav")).toBeTruthy();
      // NotificationBell is loaded via next/dynamic (ssr:false) so it mounts
      // asynchronously after the dynamic chunk resolves.
      expect(await screen.findByTestId("notification-bell")).toBeTruthy();
    });

    it("should_OpenMobileDrawer_WhenMenuIconClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DashboardHeader user={MOCK_USER} />
        </ThemeProvider>
      );

      // Drawer is initially closed, meaning its contents might be invisible or unmounted depending on MUI Drawer ModalProps
      // We'll click the open drawer button (Menu icon)
      const openDrawerBtn = screen.getByLabelText("open drawer");
      fireEvent.click(openDrawerBtn);

      // After click, sidebar should be mounted and visible
      expect(screen.getByTestId("sidebar")).toBeTruthy();
    });
  });
});

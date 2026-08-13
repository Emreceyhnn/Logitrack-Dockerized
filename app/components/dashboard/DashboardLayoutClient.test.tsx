 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "ADMIN"
};

mock.module("../../lib/context/UserContext.tsx", {
  namedExports: { 
    useUserContext: mock.fn(() => ({ user: MOCK_USER }))
  },
});

// Mock child components
mock.module("../sidebar/index.tsx", {
  defaultExport: () => <div data-testid="sidebar">Sidebar</div>,
});
mock.module("./DashboardHeader.tsx", {
  defaultExport: ({ user  }: Record<string, unknown>) => <div data-testid="header">Header for {user?.name}</div>,
});
mock.module("../../lib/context/GuidedTourContext.tsx", {
  namedExports: {
    GuidedTourProvider: ({ children  }: Record<string, unknown>) => <>{children}</>,
  },
});
mock.module("../guidedTour/GuidedTourOverlay.tsx", {
  defaultExport: () => <div data-testid="guided-tour-overlay" />,
});

// The layout reads dict.common.skipToContent for its skip-link; provide it so
// the component renders instead of throwing on a missing dictionary provider.
mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: mock.fn(() => ({
      common: { skipToContent: "Skip to content" },
    })),
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

(customTheme.palette.background as unknown).dashboardBg = "#f5f5f5";

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("DashboardLayoutClient RTL Component", () => {
  let DashboardLayoutClient: unknown;

  before(async () => {
    const mod = await import("./DashboardLayoutClient");
    DashboardLayoutClient = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DashboardLayoutClient() bileşeni", () => {
    it("should_RenderLayoutWithSidebarAndHeader_WhenMounted", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DashboardLayoutClient>
            <div data-testid="page-content">Page Content</div>
          </DashboardLayoutClient>
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByTestId("sidebar")).toBeTruthy();
      expect(screen.getByTestId("header")).toBeTruthy();
      expect(screen.getByText("Header for Test User")).toBeTruthy();
      expect(screen.getByTestId("page-content")).toBeTruthy();
    });
  });
});

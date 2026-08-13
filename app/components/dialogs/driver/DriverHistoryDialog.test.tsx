 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    errorOccurred: "Error Occurred",
  },
  drivers: {
    labels: {
      driverHistory: "Driver History",
      activityLog: "Activity log for {name}",
      completedJobs: "Completed Jobs",
      permissions: "Permissions",
      recentActivities: "Recent Activities",
      noActivities: "No Activities",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const mockHistory = {
  completedShipments: 10,
  activePermissions: 5,
  activities: [
    {
      id: "act-1",
      type: "SHIFT_START",
      title: "Started Shift",
      timestamp: new Date().toISOString(),
      description: "Driver started shift",
    }
  ]
};

mock.module("../../../lib/controllers/driver.ts", {
  namedExports: { 
    getDriverHistory: mock.fn(async () => mockHistory)
  },
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: { 
    useDateSettings: mock.fn(() => ({}))
  },
});

mock.module("../../../lib/utils/date.ts", {
  namedExports: { 
    formatDisplayDateTime: mock.fn(() => "01/01/2026 10:00")
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    info: { main: "#0288d1" } as unknown,
    text: { secondary: "#757575" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_15: "rgba()", main_30: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.success as unknown)._alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.warning as unknown)._alpha = mockAlpha;
(customTheme.palette.info as unknown)._alpha = mockAlpha;

(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("DriverHistoryDialog RTL Component", () => {
  let DriverHistoryDialog: unknown;

  before(async () => {
    const mod = await import("./DriverHistoryDialog");
    DriverHistoryDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DriverHistoryDialog() bileşeni", () => {
    it("should_LoadAndRenderHistory_WhenDriverIdProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DriverHistoryDialog open={true} onClose={() => {}} driverId="driver-1" driverName="John Doe" />
        </ThemeProvider>
      );

      // Assert that loading state disappears and data shows up
      await waitFor(() => {
        expect(screen.getByText("Completed Jobs")).toBeTruthy();
        expect(screen.getByText("10")).toBeTruthy(); // completedShipments
        expect(screen.getByText("Started Shift")).toBeTruthy();
      });
    });
  });
});

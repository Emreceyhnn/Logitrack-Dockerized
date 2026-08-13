 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  common: {
    synchronizing: "Saving...",
  },
  settings: {
    dialogs: {
      notifications: {
        emailChannels: "Email Channels",
        fleetStatus: "Fleet Status",
        fleetStatusDesc: "Get emails about fleet",
        preventiveMaintenance: "Maintenance",
        preventiveMaintenanceDesc: "Get emails about maintenance",
        executiveKpi: "Executive KPI",
        executiveKpiDesc: "Get weekly reports",
        realTimeSignals: "Real-time Signals",
        dynamicRouting: "Dynamic Routing",
        dynamicRoutingDesc: "Push notifications for routing",
        networkAnomalies: "Network Anomalies",
        networkAnomaliesDesc: "Push notifications for anomalies",
        updateWebhooks: "Update Webhooks",
      },
    },
  },
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// Mock NotificationRow to easily trigger onChange
mock.module("./NotificationRow.tsx", {
  defaultExport: ({ label, checked, onChange  }: Record<string, unknown>) => (
    <div data-testid={`notification-row-${label}`}>
      <span>{label}</span>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        data-testid={`checkbox-${label}`}
      />
    </div>
  ),
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_10: "rgba()", main_25: "rgba()", main_35: "rgba()" };
(customTheme.palette.common as unknown) = { white_alpha: { main_05: "rgba()", main_60: "rgba()" } };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("NotificationsTab RTL Component", () => {
  let NotificationsTab: unknown;

  before(async () => {
    const mod = await import("./NotificationsTab");
    NotificationsTab = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    isSaving: false,
    notifications: {
      emailShipmentUpdates: true,
      emailMaintenanceAlerts: false,
      emailWeeklyReports: false,
      pushNewAssignments: true,
      pushDelayAlerts: false,
    }
  };
  
  const mockActions = {
    updateNotifications: mock.fn(),
    saveNotifications: mock.fn(),
  };

  describe("NotificationsTab() bileşeni", () => {
    it("should_RenderAllNotificationToggles_WithCorrectStates", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <NotificationsTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Assert labels
      expect(screen.getByText(/Fleet Status/i)).toBeTruthy();
      expect(screen.getByText(/Maintenance/i)).toBeTruthy();

      // Assert checkbox states based on mockState
      const fleetCheckbox = screen.getByTestId("checkbox-Fleet Status") as HTMLInputElement;
      expect(fleetCheckbox.checked).toBe(true);

      const maintenanceCheckbox = screen.getByTestId("checkbox-Maintenance") as HTMLInputElement;
      expect(maintenanceCheckbox.checked).toBe(false);
    });

    it("should_CallUpdateNotifications_WhenToggleClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <NotificationsTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      const fleetCheckbox = screen.getByTestId("checkbox-Fleet Status");
      fireEvent.click(fleetCheckbox);

      // Assert
      expect(mockActions.updateNotifications.mock.calls.length).toBe(1);
      // Since it was true, clicking should emit false
      expect(mockActions.updateNotifications.mock.calls[0].arguments[0]).toEqual({ emailShipmentUpdates: false });
    });

    it("should_CallSaveNotifications_WhenSaveButtonIsClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <NotificationsTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      const saveButton = screen.getByText(/Update Webhooks/i);
      fireEvent.click(saveButton);

      // Assert
      expect(mockActions.saveNotifications.mock.calls.length).toBe(1);
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const useDictionaryMock = mock.fn(() => ({
  routes: {
    dashboard: {
      routeEfficiency: "Route Efficiency",
      fuelConsumption: "Fuel Consumption",
      avg: "{count} L/100km avg",
      onTimePerformance: "On-Time Performance",
      vehicleUtilization: "Vehicle Utilization",
      recentNotifications: "Recent Notifications",
      notification: "Notification",
      noNotifications: "All systems go",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: useDictionaryMock,
    useLanguage: () => ({ lang: "en", dict: useDictionaryMock() }),
  },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// 2. Theme with success._alpha
const customTheme = createTheme({
  palette: {
    mode: "light",
    success: { main: "#2e7d32" } as unknown,
  }
});
(customTheme.palette.success as unknown)._alpha = { main_30: "rgba(46,125,50,0.3)" };

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("RouteEfficiency RTL Component", () => {
  let RouteEfficiency: unknown;

  before(async () => {
    const mod = await import("./routeEfficiency");
    RouteEfficiency = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockData = {
    fuelConsumption: 12.5,
    onTimePerformance: 87,
    vehicleUtilization: 73.4,
    recentNotifications: [
      { title: "Route Delay", message: "Route A delayed by 30 min" },
      { title: "Detour Alert", message: "Route B rerouted" },
    ]
  };

  describe("RouteEfficiency() bileşeni", () => {
    it("should_RenderSkeletons_WhenLoadingIsTrue", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteEfficiency data={null} loading={true} />
        </ThemeProvider>
      );
      // The title renders in loading state too
      expect(screen.getByText("ROUTE EFFICIENCY")).toBeTruthy();
    });

    it("should_RenderSkeletons_WhenDataIsNull", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteEfficiency data={null} loading={false} />
        </ThemeProvider>
      );
      expect(screen.getByText("ROUTE EFFICIENCY")).toBeTruthy();
    });

    it("should_RenderEfficiencyMetrics_WithCorrectValues", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteEfficiency data={mockData} loading={false} />
        </ThemeProvider>
      );

      expect(screen.getByText("Fuel Consumption")).toBeTruthy();
      expect(screen.getByText("12.50 L/100km avg")).toBeTruthy();

      expect(screen.getByText("On-Time Performance")).toBeTruthy();
      expect(screen.getByText("87 %")).toBeTruthy();

      expect(screen.getByText("Vehicle Utilization")).toBeTruthy();
      expect(screen.getByText("73.4 %")).toBeTruthy();
    });

    it("should_RenderNotifications_WhenRecentNotificationsExist", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteEfficiency data={mockData} loading={false} />
        </ThemeProvider>
      );

      expect(screen.getByText("Route Delay")).toBeTruthy();
      expect(screen.getByText("Route A delayed by 30 min")).toBeTruthy();
      expect(screen.getByText("Detour Alert")).toBeTruthy();
    });

    it("should_RenderNoNotificationsState_WhenEmpty", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteEfficiency data={{ ...mockData, recentNotifications: [] }} loading={false} />
        </ThemeProvider>
      );
      expect(screen.getByText("All systems go")).toBeTruthy();
    });
  });
});

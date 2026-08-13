 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  overview: {
    title: "Overview",
    activeShipments: "Active",
    delayedShipments: "Delayed",
    vehiclesOnTrip: "On Trip",
    vehiclesInService: "In Service",
    availableVehicles: "Available",
    activeDrivers: "Drivers",
    warehouses: "Warehouses",
    inventorySkus: "SKUs"
  },
  common: {
    lastUpdated: "Last Updated",
    refreshDashboard: "Refresh"
  }
}));

mock.module("../../../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: useDictionaryMock,
    useLanguage: () => ({ lang: "en" }),
  },
});

const mockRefetch = mock.fn(async () => {});
mock.module("../../../../../hooks/useOverview.ts", {
  namedExports: { 
    useOverviewData: mock.fn(() => ({
      data: {
        stats: { activeShipments: 10 },
        statsTrends: {},
        mapData: [],
        dailyOps: {},
        fuelLogs: [],
        shipmentStatus: {},
        alerts: [],
        warehouseCapacity: {},
        picksAndPacks: {},
        shipmentVolume: {},
        lowStockItems: []
      },
      isLoading: false,
      refetch: mockRefetch,
    }))
  },
});

mock.module("../../../../../hooks/useDateSettings.ts", {
  namedExports: {
    useDateSettings: mock.fn(() => ({
      timezone: "UTC",
      dateFormat: "DD/MM/YYYY"
    }))
  },
});

// Guided tour — the overview auto-starts a first-visit tour. Stub the hook so
// the component renders without a real GuidedTourProvider.
const startTourMock = mock.fn();
mock.module("../../../../../lib/context/GuidedTourContext.tsx", {
  namedExports: { useGuidedTour: () => ({ startTour: startTourMock }) },
});
mock.module("../../../../../components/guidedTour/tourSteps.ts", {
  namedExports: { getOverviewTourSteps: mock.fn(() => []) },
});
mock.module("../../../../../components/dashboard/overview/GettingStartedCard.tsx", {
  defaultExport: () => <div data-testid="getting-started">Getting Started</div>,
});

// Mock child components
mock.module("../../../../../components/cards/KpiCards.tsx", {
  defaultExport: ({ kpis  }: Record<string, unknown>) => <div data-testid="kpi-cards">KPI Cards {kpis.length}</div>,
});
mock.module("../../../../../components/dashboard/overview/dailyOperations.tsx", {
  defaultExport: () => <div data-testid="daily-ops">Daily Ops</div>,
});
mock.module("../../../../../components/dashboard/overview/shipmentsByStatusCard.tsx", {
  defaultExport: () => <div data-testid="shipment-status">Shipment Status</div>,
});
mock.module("../../../../../components/dashboard/overview/actionRequiredCard.tsx", {
  defaultExport: () => <div data-testid="alerts">Alerts</div>,
});
mock.module("../../../../../components/dashboard/overview/warehouseCapacityCard.tsx", {
  defaultExport: () => <div data-testid="warehouse-cap">Warehouse Capacity</div>,
});
mock.module("../../../../../components/dashboard/overview/picsPacksDailyCard.tsx", {
  defaultExport: () => <div data-testid="picks-packs">Picks Packs</div>,
});
mock.module("../../../../../components/dashboard/overview/onTimeTrends.tsx", {
  defaultExport: () => <div data-testid="shipment-volume">Shipment Volume</div>,
});
mock.module("../../../../../components/dashboard/overview/inventoryCard.tsx", {
  defaultExport: () => <div data-testid="low-stock">Low Stock</div>,
});
mock.module("../../../../../components/dashboard/overview/overViewMapCard.tsx", {
  defaultExport: () => <div data-testid="overview-map">Overview Map</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    info: { main: "#0288d1" } as unknown,
    secondary: { main: "#9c27b0" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    kpi: { violet: "#ccc", indigo: "#ccc", sky: "#ccc" } as unknown,
  }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("OverviewContent Component", () => {
  let OverviewContent: unknown;

  before(async () => {
    const mod = await import("./OverviewContent");
    OverviewContent = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockRefetch.mock.resetCalls();
  });

  describe("OverviewContent() Render Testleri", () => {
    it("should_RenderDashboardElements_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <OverviewContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Overview")).toBeTruthy();
      expect(screen.getByTestId("kpi-cards")).toBeTruthy();
      expect(screen.getByTestId("daily-ops")).toBeTruthy();
      // shipment-status & shipment-volume load via next/dynamic (ssr:false),
      // so they mount asynchronously after the dynamic chunk resolves.
      expect(await screen.findByTestId("shipment-status")).toBeTruthy();
      expect(screen.getByTestId("alerts")).toBeTruthy();
      expect(screen.getByTestId("warehouse-cap")).toBeTruthy();
      expect(screen.getByTestId("picks-packs")).toBeTruthy();
      expect(await screen.findByTestId("shipment-volume")).toBeTruthy();
      expect(screen.getByTestId("low-stock")).toBeTruthy();
      expect(screen.getByTestId("overview-map")).toBeTruthy();
    });

    it("should_CallRefetch_WhenRefreshButtonClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <OverviewContent />
        </ThemeProvider>
      );

      // Refresh button is identified by the tooltip title or icon, we can use getByTestId if we add one or getByRole
      const refreshBtn = screen.getByRole("button", { name: "Refresh" });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(mockRefetch.mock.calls.length).toBe(1);
      });
    });
  });
});

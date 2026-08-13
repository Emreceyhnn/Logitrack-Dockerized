 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  reports: {
    title: "Reports",
    subtitle: "System reports",
    tabs: {
      shipment: "Shipments",
      fleet: "Fleet",
      inventory: "Inventory"
    }
  }
}));

mock.module("../../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../../hooks/useReports.ts", {
  namedExports: { 
    useReportsData: mock.fn(() => ({
      state: {
        loading: false,
        data: {
          metrics: {},
          shipments: [],
          fleet: [],
          inventory: { categoryStats: {} }
        }
      }
    }))
  },
});

// Mock child components
mock.module("../../../../../components/dashboard/reports/ShipmentCharts.tsx", {
  defaultExport: () => <div data-testid="shipment-charts">Shipment Charts</div>,
});
mock.module("../../../../../components/dashboard/reports/FleetCharts.tsx", {
  defaultExport: () => <div data-testid="fleet-charts">Fleet Charts</div>,
});
mock.module("../../../../../components/dashboard/reports/InventoryCharts.tsx", {
  defaultExport: () => <div data-testid="inventory-charts">Inventory Charts</div>,
});
mock.module("../../../../../components/dashboard/reports/ReportSummaryCards.tsx", {
  defaultExport: () => <div data-testid="report-summary">Summary</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
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

describe("ReportsContent Component", () => {
  let ReportsContent: unknown;

  before(async () => {
    const mod = await import("./ReportsContent");
    ReportsContent = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("ReportsContent() Render Testleri", () => {
    it("should_RenderTabsAndContent_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <ReportsContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Reports")).toBeTruthy();
      expect(screen.getByTestId("report-summary")).toBeTruthy();
      
      // Shipment is selected by default. Charts load via next/dynamic (lazy),
      // so findByTestId waits for them to resolve.
      expect(await screen.findByTestId("shipment-charts")).toBeTruthy();

      // Click Fleet tab
      const fleetTab = screen.getByRole("tab", { name: "Fleet" });
      fireEvent.click(fleetTab);

      // Now fleet charts should be visible (MUI tabs render content but hide it, we can just check if it's in doc)
      expect(await screen.findByTestId("fleet-charts")).toBeTruthy();
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks — must be before any imports
const useCurrencyMock = mock.fn(() => ({
  compact: (v: number) => `$${v}`,
  format: (v: number) => `$${v}.00`,
}));

mock.module("../../../hooks/useCurrency.ts", {
  namedExports: { useCurrency: useCurrencyMock },
});

mock.module("../../skeletons/KpiSkeleton.tsx", {
  defaultExport: ({ count  }: Record<string, unknown>) => (
    <div data-testid="kpi-skeleton">Loading {count} KPIs</div>
  ),
});

// Custom theme with all the alpha tokens the component uses
const mockTheme = {
  palette: {
    mode: "light",
    kpi: { indigo: "#6366f1", emerald: "#10b981", sky: "#0ea5e9", amber: "#f59e0b", error: "#ef4444" },
    success: { main: "#2e7d32", _alpha: { main_10: "rgba(46,125,50,0.1)" } },
    error: { main: "#d32f2f", _alpha: { main_10: "rgba(211,47,47,0.1)" } },
    background: { paper_alpha: { main_80: "rgba(255,255,255,0.8)" } },
    common: { black_alpha: { main_30: "rgba(0,0,0,0.3)" } },
    text: { primary_alpha: { main_40: "rgba(0,0,0,0.4)" } },
    getColorAlpha: (_color: string) => ({
      main_10: "rgba(0,0,0,0.1)",
      main_12: "rgba(0,0,0,0.12)",
      main_15: "rgba(0,0,0,0.15)",
      main_20: "rgba(0,0,0,0.2)",
      main_30: "rgba(0,0,0,0.3)",
      main_40: "rgba(0,0,0,0.4)",
    }),
  },
};

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => mockTheme),
  },
});

const mockDict = {
  reports: {
    metrics: {
      totalShipments: "Total Shipments",
      onTimeRate: "On-Time Rate",
      avgDeliveryTime: "Avg Delivery Time",
      daysUnits: "{count} days",
      pendingOrders: "Pending Orders",
      activeVehicles: "Active Vehicles",
      avgFuelCons: "Avg Fuel Consumption",
      maintenanceCost: "Maintenance Cost",
      totalDistance: "Total Distance",
      totalInventoryValue: "Total Inventory Value",
      stockTurnover: "Stock Turnover",
      deadStock: "Dead Stock",
    },
  },
} as unknown;

describe("ReportSummaryCards RTL Component", () => {
  let ReportSummaryCards: unknown;

  before(async () => {
    const mod = await import("./ReportSummaryCards");
    ReportSummaryCards = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockMetrics = {
    totalShipments: 1234,
    onTimeRate: 92.5,
    avgDeliveryTime: 3,
    pendingOrders: 7,
    activeVehicles: 18,
    avgFuelCons: 12,
    maintenanceCost: 4250,
    totalInventoryValue: 550000,
    stockTurnover: 5,
    deadStock: 1200,
    warehouseCapacity: 68,
  } as unknown;

  describe("ReportSummaryCards() bileşeni", () => {
    it("should_RenderKpiSkeleton_WhenLoadingIsTrue", async () => {
      render(<ReportSummaryCards tabIndex={0} metrics={mockMetrics} dict={mockDict} loading={true} />);
      expect(screen.getByTestId("kpi-skeleton")).toBeTruthy();
    });

    it("should_RenderKpiSkeleton_WhenMetricsIsUndefined", async () => {
      render(<ReportSummaryCards tabIndex={0} metrics={undefined} dict={mockDict} />);
      expect(screen.getByTestId("kpi-skeleton")).toBeTruthy();
    });

    it("should_RenderShipmentTab_WhenTabIndexIsZero", async () => {
      render(<ReportSummaryCards tabIndex={0} metrics={mockMetrics} dict={mockDict} />);
      expect(screen.getByText("Total Shipments")).toBeTruthy();
      expect(screen.getByText("On-Time Rate")).toBeTruthy();
      expect(screen.getByText("Avg Delivery Time")).toBeTruthy();
      expect(screen.getByText("Pending Orders")).toBeTruthy();
      // totalShipments formatted via toLocaleString
      expect(screen.getByText(/1[.,]?234/)).toBeTruthy();
      // onTimeRate toFixed(1)
      expect(screen.getByText("92.5%")).toBeTruthy();
    });

    it("should_RenderFleetTab_WhenTabIndexIsOne", async () => {
      // Fleet tab renders 3 cards: activeVehicles, avgFuelCons, maintenanceCost
      // (no "Total Distance" card — that dict key exists but isn't wired up).
      render(<ReportSummaryCards tabIndex={1} metrics={mockMetrics} dict={mockDict} />);
      expect(screen.getByText("Active Vehicles")).toBeTruthy();
      expect(screen.getByText("Avg Fuel Consumption")).toBeTruthy();
      expect(screen.getByText("Maintenance Cost")).toBeTruthy();
      // activeVehicles toString
      expect(screen.getByText("18")).toBeTruthy();
      // maintenanceCost via format()
      expect(screen.getByText("$4250.00")).toBeTruthy();
    });

    it("should_RenderInventoryTab_WhenTabIndexIsTwo", async () => {
      render(<ReportSummaryCards tabIndex={2} metrics={mockMetrics} dict={mockDict} />);
      expect(screen.getByText("Total Inventory Value")).toBeTruthy();
      expect(screen.getByText("Stock Turnover")).toBeTruthy();
      expect(screen.getByText("Dead Stock")).toBeTruthy();
      expect(screen.getByText("Warehouse Capacity")).toBeTruthy();
      // totalInventoryValue via compact()
      expect(screen.getByText("$550000")).toBeTruthy();
    });

    it("should_RenderEmptyCards_WhenTabIndexIsUnknown", async () => {
      render(<ReportSummaryCards tabIndex={99} metrics={mockMetrics} dict={mockDict} />);
      // default returns [] so no metric cards rendered
      expect(screen.queryByText("Total Shipments")).toBeNull();
    });

  });
});

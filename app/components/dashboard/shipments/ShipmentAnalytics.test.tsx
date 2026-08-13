 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const useDictionaryMock = mock.fn(() => ({
  shipments: {
    dashboard: {
      statusOverview: "Status Overview",
      liveBreakdown: "Live Breakdown",
      volumeTrend: "Volume Trend",
      dailyVolume: "Daily Volume",
      shipments: "Shipments",
      units: "{count} units",
      noData: "No Data",
    }
  },
  routes: {
    statuses: {
      DELIVERED: "Delivered",
      IN_TRANSIT: "In Transit",
      DELAYED: "Delayed",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: useDictionaryMock,
    useLanguage: () => ({ lang: "en", dict: useDictionaryMock() }),
  },
});

mock.module("../../skeletons/AnalyticsSkeleton.tsx", {
  defaultExport: ({ title  }: Record<string, unknown>) => <div data-testid={`skeleton-${title}`}>{title}</div>,
});

mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ dataset, series  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        {dataset?.map((d: unknown, i: number) => (
          <div key={i} data-testid={`bar-day-${d.day}`}>{d.volume}</div>
        ))}
        <div data-testid="bar-series-label">{series?.[0]?.label}</div>
      </div>
    )
  }
});

mock.module("@mui/x-charts/PieChart", {
  namedExports: {
    PieChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="pie-chart">
        {series?.[0]?.data?.map((d: Record<string, unknown>) => (
          <div key={d.id} data-testid={`pie-slice-${d.label}`}>{d.value}</div>
        ))}
      </div>
    )
  }
});

// 2. Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    info: { main: "#0288d1" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
  }
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("ShipmentAnalytics RTL Component", () => {
  let ShipmentAnalytics: unknown;

  before(async () => {
    const mod = await import("./ShipmentAnalytics");
    ShipmentAnalytics = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockState = {
    loading: false,
    statusDistribution: [
      { status: "DELIVERED", count: 40 },
      { status: "IN_TRANSIT", count: 20 },
      { status: "DELAYED", count: 5 },
    ],
    volumeHistory: [
      { day: "Mon", volume: 10 },
      { day: "Tue", volume: 15 },
    ]
  };

  describe("ShipmentAnalytics() bileşeni", () => {
    it("should_RenderSkeletons_WhenLoadingIsTrue", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentAnalytics state={{ ...mockState, loading: true }} />
        </ThemeProvider>
      );
      expect(screen.getByTestId("skeleton-Status Overview")).toBeTruthy();
      expect(screen.getByTestId("skeleton-Volume Trend")).toBeTruthy();
    });

    it("should_RenderChartTitles_WhenDataLoaded", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentAnalytics state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByText("Status Overview")).toBeTruthy();
      expect(screen.getByText("Volume Trend")).toBeTruthy();
    });

    it("should_RenderPieChartSlices_ForEachStatus", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentAnalytics state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByTestId("pie-slice-Delivered")).toBeTruthy();
      expect(screen.getByTestId("pie-slice-In Transit")).toBeTruthy();
      expect(screen.getByTestId("pie-slice-Delayed")).toBeTruthy();
    });

    it("should_RenderBarChartDays_WithCorrectVolumes", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentAnalytics state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByTestId("bar-day-Mon").textContent).toBe("10");
      expect(screen.getByTestId("bar-day-Tue").textContent).toBe("15");
    });

    it("should_RenderNoDataSlice_WhenStatusDistributionEmpty", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentAnalytics state={{ ...mockState, statusDistribution: [] }} />
        </ThemeProvider>
      );
      expect(screen.getByTestId("pie-slice-No Data")).toBeTruthy();
    });
  });
});

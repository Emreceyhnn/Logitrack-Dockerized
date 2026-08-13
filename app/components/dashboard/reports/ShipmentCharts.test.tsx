 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
mock.module("../../skeletons/AnalyticsSkeleton.tsx", {
  defaultExport: ({ title  }: Record<string, unknown>) => (
    <div data-testid="analytics-skeleton">{title}</div>
  ),
});

mock.module("@mui/x-charts/PieChart", {
  namedExports: {
    PieChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="pie-chart">
        {series?.[0]?.data?.map((d: Record<string, unknown>) => (
          <div key={d.id} data-testid={`pie-slice-${d.label}`}>
            {d.value}
          </div>
        ))}
      </div>
    ),
    pieArcLabelClasses: { root: "mock-arc-label" },
  },
});

mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ dataset, series  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        {dataset?.map((d: unknown, i: number) => (
          <div key={i} data-testid={`bar-${d.route}`}>{d.count}</div>
        ))}
        <div data-testid="bar-series-label">{series?.[0]?.label}</div>
      </div>
    ),
  },
});

const mockTheme = {
  palette: {
    mode: "light",
    success: { main: "#2e7d32" },
    primary: { main: "#1976d2" },
    warning: { main: "#ed6c02" },
    info: { main: "#0288d1" },
    error: { main: "#d32f2f" },
    secondary: { main: "#9c27b0" },
    divider: "#e0e0e0",
    text: { secondary: "#666" },
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
    charts: {
      shipment: {
        analyticsTitle: "Shipment Analytics Loading",
        statusDistribution: "Status Distribution",
        volumeByRoute: "Volume By Route",
        volumeByRouteSubtitle: "Shipments per route",
      },
    },
  },
  routes: {
    // Empty on purpose: unlocalized statuses must fall back to
    // s.status.replace("_", " ") (asserted below).
    statuses: {},
  },
  shipments: {
    dashboard: {
      totalShipments: "Total Shipments",
    },
  },
} as unknown;

describe("ShipmentCharts RTL Component", () => {
  let ShipmentCharts: unknown;

  before(async () => {
    const mod = await import("./ShipmentCharts");
    ShipmentCharts = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockData = {
    statusCounts: [
      { status: "DELIVERED", count: 120 },
      { status: "IN_TRANSIT", count: 45 },
      { status: "UNKNOWN_STATE", count: 5 },
    ],
    routeCounts: [
      { route: "Route A", count: 80 },
      { route: "Route B", count: 60 },
    ],
  };

  describe("ShipmentCharts() bileşeni", () => {
    it("should_RenderSkeleton_WhenLoadingIsTrue", async () => {
      render(<ShipmentCharts data={mockData} dict={mockDict} loading={true} />);
      expect(screen.getByTestId("analytics-skeleton")).toBeTruthy();
      expect(screen.getByText("Shipment Analytics Loading")).toBeTruthy();
    });

    it("should_RenderSkeleton_WhenDataIsNull", async () => {
      render(<ShipmentCharts data={null} dict={mockDict} loading={false} />);
      expect(screen.getByTestId("analytics-skeleton")).toBeTruthy();
    });

    it("should_RenderChartTitles_WhenDataProvided", async () => {
      render(<ShipmentCharts data={mockData} dict={mockDict} loading={false} />);
      expect(screen.getByText("Status Distribution")).toBeTruthy();
      expect(screen.getByText("Volume By Route")).toBeTruthy();
    });

    it("should_RenderPieChart_WithStatusDistribution", async () => {
      render(<ShipmentCharts data={mockData} dict={mockDict} loading={false} />);
      expect(screen.getByTestId("pie-chart")).toBeTruthy();
      expect(screen.getByTestId("pie-slice-DELIVERED").textContent).toBe("120");
      expect(screen.getByTestId("pie-slice-IN TRANSIT").textContent).toBe("45"); // Status string replaced '_' with ' '
      expect(screen.getByTestId("pie-slice-UNKNOWN STATE").textContent).toBe("5");
    });

    it("should_RenderBarChart_WithRouteCounts", async () => {
      render(<ShipmentCharts data={mockData} dict={mockDict} loading={false} />);
      expect(screen.getByTestId("bar-chart")).toBeTruthy();
      expect(screen.getByTestId("bar-Route A").textContent).toBe("80");
      expect(screen.getByTestId("bar-Route B").textContent).toBe("60");
    });

    it("should_RenderEmptyStatusMessage_WhenStatusDataIsEmpty", async () => {
      render(
        <ShipmentCharts
          data={{ ...mockData, statusCounts: [] }}
          dict={mockDict}
          loading={false}
        />
      );
      expect(screen.getByText("No status data available")).toBeTruthy();
    });
  });
});

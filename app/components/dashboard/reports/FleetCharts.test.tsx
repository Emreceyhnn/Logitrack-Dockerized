 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ dataset, series  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        {dataset?.map((d: unknown, i: number) => (
          <div key={i} data-testid={`bar-${d.plate}`}>{d.cost}</div>
        ))}
        <div data-testid="bar-series-label">{series?.[0]?.label}</div>
      </div>
    ),
  },
});

mock.module("@mui/x-charts/ScatterChart", {
  namedExports: {
    ScatterChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="scatter-chart">
        {series?.[0]?.data?.map((d: Record<string, unknown>) => (
          <div key={d.id} data-testid={`scatter-point-${d.id}`}>
            {d.x},{d.y}
          </div>
        ))}
      </div>
    ),
  },
});

const mockTheme = {
  palette: {
    mode: "light",
    error: { main: "#d32f2f" },
    info: { main: "#0288d1" },
    text: { secondary: "#666" },
    divider: "#e0e0e0",
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
      fleet: {
        noData: "No fleet data",
        highMaintenance: "High Maintenance Vehicles",
        maintenanceCostLabel: "Maintenance Cost",
        consumptionVsOdometer: "Consumption vs Odometer",
        fleetLabel: "Fleet",
        odometerLabel: "Odometer",
        consumptionLabel: "Consumption",
      },
    },
  },
} as unknown;

describe("FleetCharts RTL Component", () => {
  let FleetCharts: unknown;

  before(async () => {
    const mod = await import("./FleetCharts");
    FleetCharts = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockData = [
    { plate: "34 ABC", maintenanceCost: 5000, odometer: 120000, consumption: "22.5" },
    { plate: "06 DEF", maintenanceCost: 3200, odometer: 85000, consumption: "18.3" },
    { plate: "35 GHI", maintenanceCost: 4100, odometer: 95000, consumption: "20.1" },
  ];

  describe("FleetCharts() bileşeni", () => {
    it("should_RenderNoDataMessage_WhenDataIsEmpty", async () => {
      render(<FleetCharts data={[]} dict={mockDict} />);
      expect(screen.getByText("No fleet data")).toBeTruthy();
    });

    it("should_RenderNoDataMessage_WhenDataIsNull", async () => {
      render(<FleetCharts data={null as unknown} dict={mockDict} />);
      expect(screen.getByText("No fleet data")).toBeTruthy();
    });

    it("should_RenderChartTitles_WhenDataProvided", async () => {
      render(<FleetCharts data={mockData} dict={mockDict} />);
      expect(screen.getByText("High Maintenance Vehicles")).toBeTruthy();
      expect(screen.getByText("Consumption vs Odometer")).toBeTruthy();
    });

    it("should_RenderBarChart_SortedByMaintenanceCostDescending", async () => {
      render(<FleetCharts data={mockData} dict={mockDict} />);
      const barChart = screen.getByTestId("bar-chart");
      expect(barChart).toBeTruthy();
      // Top costly vehicle: 34 ABC (5000) should appear
      expect(screen.getByTestId("bar-34 ABC").textContent).toBe("5000");
    });

    it("should_RenderScatterChart_WithOdometerAndConsumption", async () => {
      render(<FleetCharts data={mockData} dict={mockDict} />);
      expect(screen.getByTestId("scatter-chart")).toBeTruthy();
      // First point: odometer=120000, consumption=22.5
      expect(screen.getByTestId("scatter-point-0").textContent).toBe("120000,22.5");
    });

    it("should_LimitBarChartToTopEight_WhenMoreVehiclesExist", async () => {
      const largeData = Array.from({ length: 12 }, (_, i) => ({
        plate: `PLATE-${i}`,
        maintenanceCost: (12 - i) * 1000,
        odometer: 100000,
        consumption: "20",
      }));
      render(<FleetCharts data={largeData} dict={mockDict} />);
      // Only top 8 bars should be rendered
      const bars = screen.getAllByTestId(/^bar-PLATE-/);
      expect(bars.length).toBe(8);
    });
  });
});

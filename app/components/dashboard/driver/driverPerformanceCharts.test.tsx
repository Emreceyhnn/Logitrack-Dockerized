 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
const mockDict = {
  drivers: {
    dashboard: {
      ratings: "Ratings",
      weeklyHours: "Weekly Hours",
      ratingsLabel: "Rating (0-5)",
      hours: "Hours",
      hoursThisWeek: "Hours This Week",
      safetyEfficiency: "Safety & Efficiency",
      scoreLabel: "Score",
      safetyScore: "Safety",
      efficiencyScore: "Efficiency",
      weeklyOutcomes: "Deliveries",
      shipmentsLabel: "Shipments",
      delivered: "Delivered",
      delayed: "Delayed",
    },
  },
  sidebar: {
    drivers: "Drivers",
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../skeletons/AnalyticsSkeleton.tsx", {
  defaultExport: ({ title  }: Record<string, unknown>) => <div data-testid="analytics-skeleton">{title}</div>,
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// Mock Recharts BarChart
mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ series, xAxis  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        <div data-testid="x-axis-data">
          {xAxis?.[0]?.data?.join(",")}
        </div>
        <div data-testid="series-data">
          {series?.[0]?.data?.join(",")}
        </div>
      </div>
    ),
  },
});

describe("DriverPerformanceCharts RTL Component", () => {
  let DriverPerformanceCharts: unknown;

  before(async () => {
    const mod = await import("./driverPerformanceCharts");
    DriverPerformanceCharts = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockData = [
    { name: "John Doe", rating: 4.5, workingHours: 40 },
    { name: "Jane Smith", rating: 4.8, workingHours: 35 },
  ];

  describe("DriverPerformanceCharts() bileşeni", () => {
    it("should_RenderSkeletons_WhenLoadingIsTrue", async () => {
      render(<DriverPerformanceCharts data={mockData} loading={true} />);
      const skeletons = screen.getAllByTestId("analytics-skeleton");
      expect(skeletons.length).toBe(1);
      expect(screen.getByText("Ratings & Weekly Hours")).toBeTruthy();
    });

    it("should_RenderSkeletons_WhenDataIsUndefined", async () => {
      render(<DriverPerformanceCharts data={undefined} loading={false} />);
      expect(screen.getAllByTestId("analytics-skeleton").length).toBe(1);
    });

    it("should_RenderBarCharts_WithCorrectMappedData", async () => {
      render(<DriverPerformanceCharts data={mockData} loading={false} />);
      
      const charts = screen.getAllByTestId("bar-chart");
      expect(charts.length).toBe(1);

      // X-axis for chart should contain names
      const xAxisElements = screen.getAllByTestId("x-axis-data");
      expect(xAxisElements[0].textContent).toBe("John Doe,Jane Smith");

      // Series data for combined ratings chart
      const seriesElements = screen.getAllByTestId("series-data");
      expect(seriesElements[0].textContent).toBe("4.5,4.8");
    });

    it("should_RenderOnlyOneChart_WhenScoresAndWeeklyAbsent", async () => {
      render(<DriverPerformanceCharts data={mockData} loading={false} />);
      expect(screen.getAllByTestId("bar-chart").length).toBe(1);
    });

    it("should_RenderThreeCharts_WithScoreAndWeeklyData", async () => {
      const enriched = [
        {
          name: "John Doe",
          rating: 4.5,
          workingHours: 40,
          safetyScore: 90,
          efficiencyScore: 82,
          weeklyDelivered: 12,
          weeklyDelayed: 2,
        },
        {
          name: "Jane Smith",
          rating: 4.8,
          workingHours: 35,
          safetyScore: 95,
          efficiencyScore: 88,
          weeklyDelivered: 15,
          weeklyDelayed: 1,
        },
      ];
      render(<DriverPerformanceCharts data={enriched} loading={false} />);

      // combined rating+hours, scores, weekly = 3 charts
      expect(screen.getAllByTestId("bar-chart").length).toBe(3);

      const series = screen.getAllByTestId("series-data");
      // 2nd chart's first series = safety scores
      expect(series[1].textContent).toBe("90,95");
      // 3rd chart's first series = delivered counts
      expect(series[2].textContent).toBe("12,15");
    });
  });
});

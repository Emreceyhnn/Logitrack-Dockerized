import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

mock.module("../../../../../hooks/useAnalytics.ts", {
  namedExports: {
    useAnalyticsData: mock.fn(() => ({
      state: {
        loading: false,
        data: {
          performance: {},
          forecast: {},
          costs: {},
        },
      },
    })),
  },
});

// Mock child components
mock.module(
  "../../../../../components/dashboard/analytics/AnalyticsHeader.tsx",
  {
    defaultExport: () => <div data-testid="analytics-header">Header</div>,
  }
);
mock.module(
  "../../../../../components/dashboard/analytics/PerformanceGauges.tsx",
  {
    defaultExport: () => <div data-testid="performance-gauges">Gauges</div>,
  }
);
mock.module(
  "../../../../../components/dashboard/analytics/CostAnalysisCharts.tsx",
  {
    defaultExport: () => <div data-testid="cost-analysis">Costs</div>,
  }
);
mock.module(
  "../../../../../components/dashboard/analytics/ForecastingWidget.tsx",
  {
    defaultExport: () => <div data-testid="forecasting-widget">Forecast</div>,
  }
);

describe("AnalyticsContent Component", () => {
  let AnalyticsContent: unknown;

  before(async () => {
    const mod = await import("./AnalyticsContent");
    AnalyticsContent = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AnalyticsContent() Render Testleri", () => {
    it("should_RenderAnalyticsElements_Correctly_WhenDataIsLoaded", async () => {
      // Act
      render(<AnalyticsContent />);

      // Assert basic renders. The charts are loaded via next/dynamic (lazy), so
      // they resolve on a later tick — findByTestId waits for them.
      expect(screen.getByTestId("analytics-header")).toBeTruthy();
      expect(await screen.findByTestId("performance-gauges")).toBeTruthy();
      expect(await screen.findByTestId("cost-analysis")).toBeTruthy();
      expect(await screen.findByTestId("forecasting-widget")).toBeTruthy();
    });
  });
});

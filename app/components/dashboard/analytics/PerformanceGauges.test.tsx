 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  analytics: {
    performance: {
      onTimeDelivery: "On-Time Delivery",
      fleetUtilization: "Fleet Utilization",
      customerSatisfaction: "Customer Satisfaction",
      target: "Target: {value}%",
      realTime: "Real-time average",
      reviews: "Based on {count} reviews"
    }
  }
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("@mui/x-charts/Gauge", {
  namedExports: {
    Gauge: ({ value, valueMax = 100 }: unknown) => (
      <div data-testid="gauge">
        Value: {value}/{valueMax}
      </div>
    ),
    gaugeClasses: { valueText: "val", valueArc: "arc", referenceArc: "ref" }
  },
});

const customTheme = createTheme({ palette: { mode: "light" } });

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("PerformanceGauges RTL Component", () => {
  let PerformanceGauges: unknown;

  before(async () => {
    const mod = await import("./PerformanceGauges");
    PerformanceGauges = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    onTimeRate: 85,
    fleetUtilization: 92,
    satisfaction: 4.8,
    satisfactionCount: 1500
  };

  describe("PerformanceGauges() bileşeni", () => {
    it("should_RenderHeadersAndSubtitles", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <PerformanceGauges state={mockState} />
        </ThemeProvider>
      );

      expect(screen.getByText("On-Time Delivery")).toBeTruthy();
      expect(screen.getByText("Fleet Utilization")).toBeTruthy();
      expect(screen.getByText("Customer Satisfaction")).toBeTruthy();
      
      // Subtitles
      expect(screen.getByText("Target: 95%")).toBeTruthy();
      expect(screen.getByText("Real-time average")).toBeTruthy();
      expect(screen.getByText("Based on 1500 reviews")).toBeTruthy();
    });

    it("should_RenderDeficitWhenOnTimeRateIsBelowTarget", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <PerformanceGauges state={mockState} />
        </ThemeProvider>
      );
      // 85 - 95 = -10.0%
      expect(screen.getByText("(-10.0%)")).toBeTruthy();
    });

    it("should_NotRenderDeficitWhenOnTimeRateIsAboveTarget", async () => {
      const successState = { ...mockState, onTimeRate: 98 };
      render(
        <ThemeProvider theme={customTheme}>
          <PerformanceGauges state={successState} />
        </ThemeProvider>
      );
      expect(screen.queryByText("(-3.0%)")).toBeNull();
      expect(screen.queryByText("(3.0%)")).toBeNull();
    });

    it("should_RenderGaugesWithCorrectValues", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <PerformanceGauges state={mockState} />
        </ThemeProvider>
      );
      
      const gauges = screen.getAllByTestId("gauge");
      expect(gauges.length).toBe(3);
      expect(gauges[0].textContent).toBe("Value: 85/100");
      expect(gauges[1].textContent).toBe("Value: 92/100");
      expect(gauges[2].textContent).toBe("Value: 4.8/5");
    });
  });
});

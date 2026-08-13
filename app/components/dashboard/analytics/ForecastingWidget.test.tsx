 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  analytics: {
    forecasting: {
      title: "Demand Forecasting",
      aiPowered: "AI Powered",
      subtitle: "Forecasted vs Actual",
      weekPrefix: "Week ",
      actualVolume: "Actual Volume",
      predicted: "Predicted",
    }
  }
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../charts/TimeRangeSelector.tsx", {
  defaultExport: ({ value, onChange  }: Record<string, unknown>) => (
    <div data-testid="time-range-selector">
      Current: {value}
      <button onClick={() => onChange("1w")}>Change to 1w</button>
    </div>
  ),
});

mock.module("@mui/x-charts/LineChart", {
  namedExports: {
    LineChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="line-chart">
        {series.map((s: Record<string, unknown>) => (
          <span key={s.label}>{s.label}:{s.data.length}items</span>
        ))}
      </div>
    ),
    lineElementClasses: { root: "line-root" },
    markElementClasses: { root: "mark-root" }
  },
});

const customTheme = createTheme({ palette: { mode: "light" } });
Object.assign((customTheme.palette.secondary as unknown), {
  _alpha: { main_10: "rgba(156,39,176,0.1)", main_20: "rgba(156,39,176,0.2)" }
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("ForecastingWidget RTL Component", () => {
  let ForecastingWidget: unknown;

  before(async () => {
    const mod = await import("./ForecastingWidget");
    ForecastingWidget = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    weeks: ["W1", "W2", "W3", "W4"],
    actuals: [100, 200, 300, 400],
    predicted: [110, 210, 290, 410],
  };

  describe("ForecastingWidget() bileşeni", () => {
    it("should_RenderHeadersAndBadges", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ForecastingWidget state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByText("Demand Forecasting")).toBeTruthy();
      expect(screen.getByText("AI Powered")).toBeTruthy();
      expect(screen.getByText("Forecasted vs Actual")).toBeTruthy();
    });

    it("should_RenderLineChartWithDefaultRangeLength", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ForecastingWidget state={mockState} />
        </ThemeProvider>
      );
      // Default is '6m' which sets displayCount to 4 because weeks.length = 4
      const chart = screen.getByTestId("line-chart");
      expect(chart.textContent).toContain("Actual Volume:4items");
      expect(chart.textContent).toContain("Predicted:4items");
    });

    it("should_UpdateChartLengthWhenRangeChanged", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ForecastingWidget state={mockState} />
        </ThemeProvider>
      );
      fireEvent.click(screen.getByText("Change to 1w"));
      // '1w' sets displayCount to 4
      const chart = screen.getByTestId("line-chart");
      expect(chart.textContent).toContain("Actual Volume:4items");
    });
  });
});

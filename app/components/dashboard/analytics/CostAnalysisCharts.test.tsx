 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  common: {
    months: {
      jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
      may: "May", jun: "Jun", jul: "Jul", aug: "Aug",
      sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec"
    }
  },
  analytics: {
    costs: {
      title: "Cost Analysis",
      subtitle: "Monthly cost breakdown",
      breakdown: "Cost Breakdown",
      categories: {
        fuel: "Fuel",
        maintenance: "Maintenance",
        salaries: "Salaries",
        insuranceOps: "Insurance & Ops",
        overhead: "Overhead"
      }
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
      <button onClick={() => onChange("12m")}>Change to 12m</button>
    </div>
  ),
});

mock.module("@mui/x-charts/PieChart", {
  namedExports: {
    PieChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="pie-chart">
        {series[0].data.map((d: Record<string, unknown>) => (
          <span key={d.label}>{d.label}-{d.value}</span>
        ))}
      </div>
    ),
    pieArcLabelClasses: { root: "pie-arc-root" }
  },
});

mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ series  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        {series.map((s: Record<string, unknown>) => (
          <span key={s.label}>{s.label}:{s.data.join(",")}</span>
        ))}
      </div>
    ),
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

describe("CostAnalysisCharts RTL Component", () => {
  let CostAnalysisCharts: unknown;

  before(async () => {
    const mod = await import("./CostAnalysisCharts");
    CostAnalysisCharts = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    fuel: [10, 20, 30, 40, 50, 60],
    maintenance: [5, 15, 25, 35, 45, 55],
    overhead: [1, 2, 3, 4, 5, 6],
    distribution: [
      { id: 0, label: "fuel", value: 50 },
      { id: 1, label: "maintenance", value: 30 }
    ]
  };

  describe("CostAnalysisCharts() bileşeni", () => {
    it("should_RenderTitlesAndSelectors", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CostAnalysisCharts state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByText("Cost Analysis")).toBeTruthy();
      expect(screen.getByText("Cost Breakdown")).toBeTruthy();
      expect(screen.getByText("Current: 6m")).toBeTruthy();
    });

    it("should_RenderBarChartWithMappedData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CostAnalysisCharts state={mockState} />
        </ThemeProvider>
      );
      // Checking series data in mocked BarChart
      expect(screen.getByTestId("bar-chart").textContent).toContain("Fuel:10,20,30,40,50,60");
      expect(screen.getByTestId("bar-chart").textContent).toContain("Maintenance:5,15,25,35,45,55");
      expect(screen.getByTestId("bar-chart").textContent).toContain("Overhead:1,2,3,4,5,6");
    });

    it("should_RenderPieChartWithMappedLabels", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CostAnalysisCharts state={mockState} />
        </ThemeProvider>
      );
      // Translated labels
      const pieChart = screen.getByTestId("pie-chart");
      expect(pieChart.textContent).toContain("Fuel-50");
      expect(pieChart.textContent).toContain("Maintenance-30");
    });

    it("should_ChangeTimeRangeWhenSelectorClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CostAnalysisCharts state={mockState} />
        </ThemeProvider>
      );
      expect(screen.getByText("Current: 6m")).toBeTruthy();
      fireEvent.click(screen.getByText("Change to 12m"));
      expect(screen.getByText("Current: 12m")).toBeTruthy();
    });
  });
});

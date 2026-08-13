 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
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

const mockTheme = {
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#d32f2f" },
    info: { main: "#0288d1" },
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
  common: { noData: "No Data" },
  reports: {
    charts: {
      inventory: {
        valueTitle: "Inventory Value",
        valueSubtitle: "By Category",
        countTitle: "Item Count",
        countSubtitle: "By Category",
      },
      inventoryCategories: {
        electronics: "Electronics",
        clothing: "Clothing",
        food: "Food",
      },
    },
  },
} as unknown;

describe("InventoryCharts RTL Component", () => {
  let InventoryCharts: unknown;

  before(async () => {
    const mod = await import("./InventoryCharts");
    InventoryCharts = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockData = {
    electronics: { value: 15000, count: 50 },
    clothing: { value: 8000, count: 200 },
    food: { value: 3000, count: 500 },
    toys: { value: 1000, count: 100 }, // No localized name
  };

  describe("InventoryCharts() bileşeni", () => {
    it("should_ReturnNull_WhenDataIsFalsy", async () => {
      const { container } = render(<InventoryCharts data={null as unknown} dict={mockDict} />);
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderChartTitles_WhenDataProvided", async () => {
      render(<InventoryCharts data={mockData} dict={mockDict} />);
      expect(screen.getByText("Inventory Value")).toBeTruthy();
      expect(screen.getByText("Item Count")).toBeTruthy();
    });

    it("should_RenderValueAndCountPieCharts_WithMappedCategories", async () => {
      render(<InventoryCharts data={mockData} dict={mockDict} />);
      
      const pieCharts = screen.getAllByTestId("pie-chart");
      expect(pieCharts.length).toBe(2);

      // Value Chart
      expect(screen.getAllByTestId("pie-slice-Electronics")[0].textContent).toBe("15000");
      expect(screen.getAllByTestId("pie-slice-Clothing")[0].textContent).toBe("8000");
      
      // Count Chart
      expect(screen.getAllByTestId("pie-slice-Electronics")[1].textContent).toBe("50");
      expect(screen.getAllByTestId("pie-slice-Clothing")[1].textContent).toBe("200");

      // Fallback to raw category key if missing in localization dictionary
      expect(screen.getAllByTestId("pie-slice-toys")[0].textContent).toBe("1000");
    });

    it("should_RenderNoDataSlices_WhenDataRecordIsEmpty", async () => {
      render(<InventoryCharts data={{}} dict={mockDict} />);
      
      // Both pie charts should render the 'noData' fallback slice
      const noDataSlices = screen.getAllByTestId("pie-slice-No Data");
      expect(noDataSlices.length).toBe(2);
      expect(noDataSlices[0].textContent).toBe("1");
      expect(noDataSlices[1].textContent).toBe("1");
    });
  });
});

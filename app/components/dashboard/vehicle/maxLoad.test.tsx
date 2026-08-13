 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  vehicles: {
    dashboard: {
      maxLoadCapacity: "Max Load Capacity",
      vehiclePlate: "Plate",
      capacityUnits: "%",
      maxWeightKg: "Max Weight (KG)",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

mock.module("../../skeletons/AnalyticsSkeleton.tsx", {
  defaultExport: () => <div data-testid="analytics-skeleton">Loading...</div>,
});

mock.module("@mui/x-charts/BarChart", {
  namedExports: {
    BarChart: ({ xAxis, series  }: Record<string, unknown>) => {
      const plates = xAxis[0]?.data || [];
      const weights = series[0]?.data || [];
      return (
        <div data-testid="bar-chart-mock">
          {plates.map((plate: string, i: number) => (
            <div key={plate} data-testid={`chart-item-${plate}`}>
              {weights[i]}
            </div>
          ))}
        </div>
      );
    }
  }
});

describe("VehicleCapacityChart RTL Component", () => {
  let VehicleCapacityChart: unknown;

  before(async () => {
    const mod = await import("./maxLoad");
    VehicleCapacityChart = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockData = [
    { id: "v1", plate: "34 ABC 123", maxLoadKg: 15000 },
    { id: "v2", plate: "06 DEF 456", maxLoadKg: 20000 },
  ];

  describe("VehicleCapacityChart() bileşeni", () => {
    it("should_RenderSkeleton_WhenLoadingIsTrue", async () => {
      // Act
      render(<VehicleCapacityChart data={[]} loading={true} />);

      // Assert basic renders
      expect(screen.getByTestId("analytics-skeleton")).toBeTruthy();
    });

    it("should_RenderChartWithData_WhenDataProvided", async () => {
      // Act
      render(<VehicleCapacityChart data={mockData} loading={false} />);

      // Ensure the chart mock received the right data mappings
      expect(screen.getByText("Max Load Capacity")).toBeTruthy();
      expect(screen.getByTestId("bar-chart-mock")).toBeTruthy();
      
      const plate1 = screen.getByTestId("chart-item-34 ABC 123");
      expect(plate1.textContent).toBe("15000");

      const plate2 = screen.getByTestId("chart-item-06 DEF 456");
      expect(plate2.textContent).toBe("20000");
    });
  });
});

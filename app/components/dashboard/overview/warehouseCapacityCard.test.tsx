 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockDict = {
  dashboard: {
    overview: {
      warehouseUtilization: {
        title: "Warehouse Utilization",
        noWarehouses: "No warehouse data",
        palletsUnit: "{used} / {total} pallets",
        volumeUnit: "{used} / {total} m3",
      },
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// Custom theme
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

(customTheme.palette as unknown).error = { main: "#f44336" };
(customTheme.palette as unknown).warning = { main: "#ff9800" };
(customTheme.palette as unknown).success = { main: "#4caf50" };
(customTheme.palette as unknown).divider_alpha = { main_10: "rgba(0,0,0,0.1)" };

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("WarehouseCapacityCard RTL Component", () => {
  let WarehouseCapacityCard: unknown;

  before(async () => {
    const mod = await import("./warehouseCapacityCard");
    WarehouseCapacityCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockValues = [
    { warehouseName: "Warehouse A", capacity: 90, palletUsed: 900, palletCapacity: 1000, volumeUsed: 4500, volumeCapacity: 5000 }, // Danger (>85)
    { warehouseName: "Warehouse B", capacity: 70, palletUsed: 700, palletCapacity: 1000, volumeUsed: 3500, volumeCapacity: 5000 }, // Warning (>65)
    { warehouseName: "Warehouse C", capacity: 50, palletUsed: 500, palletCapacity: 1000, volumeUsed: 2500, volumeCapacity: 5000 }, // Success
  ];

  describe("WarehouseCapacityCard() bileşeni", () => {
    it("should_ReturnNull_WhenValuesIsNull", async () => {
      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <WarehouseCapacityCard values={null as unknown} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderEmptyState_WhenValuesIsEmptyArray", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseCapacityCard values={[]} />
        </ThemeProvider>
      );
      expect(screen.getByText("Warehouse Utilization")).toBeTruthy();
      expect(screen.getByText("No warehouse data")).toBeTruthy();
    });

    it("should_RenderWarehouseProgressBars_WithCorrectData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseCapacityCard values={mockValues} />
        </ThemeProvider>
      );

      // Check warehouse names
      expect(screen.getByText("Warehouse A")).toBeTruthy();
      expect(screen.getByText("Warehouse B")).toBeTruthy();
      expect(screen.getByText("Warehouse C")).toBeTruthy();

      // Check capacities
      expect(screen.getByText("90%")).toBeTruthy();
      expect(screen.getByText("70%")).toBeTruthy();
      expect(screen.getByText("50%")).toBeTruthy();

      // Check pallets and volumes replacing
      expect(screen.getByText(/900 \/ 1[.,]000 pallets/)).toBeTruthy();
      expect(screen.getByText(/4[.,]500 \/ 5[.,]000 m3/)).toBeTruthy();
    });
  });
});

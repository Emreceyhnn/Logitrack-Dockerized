 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockDict = {
  dashboard: {
    overview: {
      warehouseThroughput: {
        title: "Warehouse Throughput",
        itemsPicked: "Items Picked",
        itemsPacked: "Items Packed",
        netDifference: "Net Difference",
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

// Custom theme with alpha tokens
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

(customTheme.palette as unknown).info = { main: "#2196f3", _alpha: { main_10: "rgba(33,150,243,0.1)" } };
(customTheme.palette as unknown).success = { main: "#4caf50", _alpha: { main_10: "rgba(76,175,80,0.1)" } };
(customTheme.palette as unknown).warning = { main: "#ff9800" };
(customTheme.palette as unknown).divider_alpha = { main_50: "rgba(0,0,0,0.5)" };

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("PicksPacksDailyCard RTL Component", () => {
  let PicksPacksDailyCard: unknown;

  before(async () => {
    const mod = await import("./picsPacksDailyCard");
    PicksPacksDailyCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("PicksPacksDailyCard() bileşeni", () => {
    it("should_RenderZeroValues_WhenValuesIsNull", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <PicksPacksDailyCard values={null} />
        </ThemeProvider>
      );
      expect(screen.getByText("Warehouse Throughput")).toBeTruthy();
      // Both picks and packs should be '0'
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(3); // Pick, pack, and net difference
    });

    it("should_RenderValues_WithCorrectData", async () => {
      const mockValues = { picks: 1500, packs: 1250 };
      
      render(
        <ThemeProvider theme={customTheme}>
          <PicksPacksDailyCard values={mockValues} />
        </ThemeProvider>
      );

      expect(screen.getByText("Items Picked")).toBeTruthy();
      expect(screen.getByText(/1[.,]500/)).toBeTruthy();

      expect(screen.getByText("Items Packed")).toBeTruthy();
      expect(screen.getByText(/1[.,]250/)).toBeTruthy();

      expect(screen.getByText(/Net Difference:/)).toBeTruthy();
      // Difference is 250
      expect(screen.getByText("250")).toBeTruthy();
    });

    it("should_CalculateNetDifferenceCorrectly_WhenPacksGreater", async () => {
      const mockValues = { picks: 1000, packs: 1200 };
      
      render(
        <ThemeProvider theme={customTheme}>
          <PicksPacksDailyCard values={mockValues} />
        </ThemeProvider>
      );

      // Difference should be absolute value: 200
      expect(screen.getByText("200")).toBeTruthy();
    });
  });
});

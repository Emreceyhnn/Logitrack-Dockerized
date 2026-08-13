 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  dashboard: {
    warehouse: {
      capacityUtilization: "Capacity Utilization",
      pallets: "pallets",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../skeletons/AnalyticsSkeleton.tsx", {
  defaultExport: () => <div data-testid="analytics-skeleton">Loading...</div>,
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    error: { main: "#d32f2f" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba(0,0,0,0.05)", main_30: "rgba(0,0,0,0.3)", main_40: "rgba(0,0,0,0.4)" };
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.text as unknown).primary_alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("CapacityUtilization RTL Component", () => {
  let CapacityUtilization: unknown;

  before(async () => {
    const mod = await import("./capacityUtilization");
    CapacityUtilization = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockWarehouses = [
    {
      id: "wh-1",
      name: "Main Hub",
      city: "Istanbul",
      capacityPallets: 5000,
      _count: { inventory: 100 } // 100 * 10 = 1000 used -> 20%
    },
    {
      id: "wh-2",
      name: "Secondary Hub",
      city: "Ankara",
      capacityPallets: 1000,
      _count: { inventory: 90 } // 90 * 10 = 900 used -> 90%
    }
  ];

  describe("CapacityUtilization() bileşeni", () => {
    it("should_RenderSkeleton_WhenLoadingIsTrue", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CapacityUtilization warehouses={mockWarehouses} loading={true} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByTestId("analytics-skeleton")).toBeTruthy();
    });

    it("should_RenderCapacityValues_WhenLoadingIsFalse", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CapacityUtilization warehouses={mockWarehouses} loading={false} />
        </ThemeProvider>
      );

      // Main Hub -> 20%
      expect(screen.getByText("20%")).toBeTruthy();
      expect(screen.getByText("Main Hub")).toBeTruthy();
      expect(screen.getByText(/1[.,]000 \/ 5[.,]000 pallets/i)).toBeTruthy();

      // Secondary Hub -> 90%
      expect(screen.getByText("90%")).toBeTruthy();
      expect(screen.getByText("Secondary Hub")).toBeTruthy();
      expect(screen.getByText(/900 \/ 1[.,]000 pallets/i)).toBeTruthy();
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  dashboard: {
    warehouse: {
      recentMovements: "Recent Movements",
      loadingMovements: "Loading...",
      noMovements: "No Movements",
      warehouse: "Warehouse",
      itemSku: "Item / SKU",
      type: "Type",
      quantity: "Quantity",
      timestamp: "Timestamp",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: { useDateSettings: mock.fn(() => ({})) },
});

mock.module("../../../lib/utils/date.ts", {
  namedExports: { 
    formatDisplayDate: mock.fn(() => "01/01/2026"),
    formatDisplayTime: mock.fn(() => "12:00 PM")
  },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

mock.module("../../ui/DataTable/index.tsx", {
  defaultExport: ({ rows, columns, emptyMessage  }: Record<string, unknown>) => (
    <div data-testid="data-table">
      {rows.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((c: Record<string, unknown>) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: unknown, i: number) => (
              <tr key={i}>
                {columns.map((c: Record<string, unknown>) => (
                  <td key={c.key} data-testid={`cell-${c.key}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    success: { main: "#2e7d32" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba(0,0,0,0.05)", main_10: "rgba(0,0,0,0.1)" };
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.warning as unknown)._alpha = mockAlpha;
(customTheme.palette.success as unknown)._alpha = mockAlpha;
(customTheme.palette.primary as unknown)._alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("RecentStockMovements RTL Component", () => {
  let RecentStockMovements: unknown;

  before(async () => {
    const mod = await import("./recentStockMovements");
    RecentStockMovements = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockMovements = [
    {
      id: "mov-1",
      warehouse: { code: "WH-A" },
      itemName: "Pallet Jack",
      sku: "SKU-PJ-1",
      type: "PICK",
      quantity: 5,
      date: new Date().toISOString(),
    },
    {
      id: "mov-2",
      warehouse: { code: "WH-A" },
      itemName: "Forklift",
      sku: "SKU-FL-1",
      type: "PUTAWAY",
      quantity: 2,
      date: new Date().toISOString(),
    }
  ];

  describe("RecentStockMovements() bileşeni", () => {
    it("should_RenderLoadingState_WhenLoadingIsTrue", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RecentStockMovements movements={[]} loading={true} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Loading...")).toBeTruthy();
    });

    it("should_RenderEmptyState_WhenNoMovements", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RecentStockMovements movements={[]} loading={false} />
        </ThemeProvider>
      );

      expect(screen.getByText("No Movements")).toBeTruthy();
    });

    it("should_RenderTableRows_WhenMovementsProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RecentStockMovements movements={mockMovements} loading={false} />
        </ThemeProvider>
      );

      // Pick -> Negative quantity
      expect(screen.getByText("-5")).toBeTruthy();
      expect(screen.getByText("PICK")).toBeTruthy();

      // Putaway -> Positive quantity
      expect(screen.getByText("+2")).toBeTruthy();
      expect(screen.getByText("PUTAWAY")).toBeTruthy();

      // Other fields
      expect(screen.getByText("Pallet Jack")).toBeTruthy();
      expect(screen.getByText("SKU-PJ-1")).toBeTruthy();
      
      // Dates (mocked via formatDisplayTime/Date)
      expect(screen.getAllByText("12:00 PM").length).toBeGreaterThan(0);
    });
  });
});

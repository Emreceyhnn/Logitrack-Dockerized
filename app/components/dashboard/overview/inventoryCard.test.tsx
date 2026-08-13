 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockDict = {
  dashboard: {
    overview: {
      inventoryAlerts: {
        title: "Inventory Alerts",
        itemCount: "{count} Items",
        healthy: "Inventory is healthy",
        table: {
          item: "Item",
          warehouse: "Warehouse",
          qty: "Quantity",
          min: "Min Stock",
        },
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

Object.assign(customTheme.palette.error, { _alpha: { main_10: "rgba(244,67,54,0.1)" } });
Object.assign(customTheme.palette.primary, { _alpha: { main_03: "rgba(25,118,210,0.03)" } });
(customTheme.palette as unknown).divider_alpha = { main_10: "rgba(0,0,0,0.1)" };

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("AlertInventoryCard RTL Component", () => {
  let AlertInventoryCard: unknown;

  before(async () => {
    const mod = await import("./inventoryCard");
    AlertInventoryCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockInventory = [
    { item: "Engine Oil", sku: "OIL-101", warehouseId: "WH-A", onHand: 5, minStock: 20 },
    { item: "Brake Pads", sku: "BRK-202", warehouseId: "WH-B", onHand: 12, minStock: 15 },
  ];

  describe("AlertInventoryCard() bileşeni", () => {
    it("should_RenderHealthyState_WhenInventoryIsEmpty", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <AlertInventoryCard inventory={[]} />
        </ThemeProvider>
      );
      expect(screen.getByText("Inventory Alerts")).toBeTruthy();
      expect(screen.getByText("Inventory is healthy")).toBeTruthy();
    });

    it("should_RenderInventoryList_WithCorrectData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <AlertInventoryCard inventory={mockInventory} />
        </ThemeProvider>
      );

      // Check title and alert count
      expect(screen.getByText("Inventory Alerts")).toBeTruthy();
      expect(screen.getByText("2 Items")).toBeTruthy();

      // Check table headers
      expect(screen.getByText("Item")).toBeTruthy();
      expect(screen.getByText("Warehouse")).toBeTruthy();
      expect(screen.getByText("Quantity")).toBeTruthy();
      expect(screen.getByText("Min Stock")).toBeTruthy();

      // Check row data
      expect(screen.getByText("Engine Oil")).toBeTruthy();
      expect(screen.getByText("OIL-101")).toBeTruthy();
      expect(screen.getByText("WH-A")).toBeTruthy();
      expect(screen.getByText("5")).toBeTruthy();
      expect(screen.getByText("20")).toBeTruthy();

      expect(screen.getByText("Brake Pads")).toBeTruthy();
      expect(screen.getByText("BRK-202")).toBeTruthy();
    });
  });
});

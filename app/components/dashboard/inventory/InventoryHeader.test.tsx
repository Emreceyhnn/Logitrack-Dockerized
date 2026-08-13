 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  common: { all: "All" },
  inventory: {
    title: "Inventory",
    subtitle: "Manage your stock",
    addInventory: "Add Inventory",
    searchPlaceholder: "Search...",
    filters: {
      warehouse: "Warehouse",
      status: "Stock Status",
    },
    status: {
      inStock: "In Stock",
      low: "Low Stock",
      out: "Out of Stock",
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

const mockUseWarehouses = mock.fn(() => ({
  data: [
    { id: "w1", name: "Main Warehouse" },
    { id: "w2", name: "Backup Warehouse" },
  ],
}));

mock.module("../../../hooks/useWarehouses.ts", {
  namedExports: { useWarehouses: mockUseWarehouses },
});

// Custom theme with alpha tokens
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

Object.assign((customTheme.palette as unknown), {
  buttonPrimary: {
    buttonBg: "#000",
    primaryText: "#fff",
    buttonBgHover: "#333",
  },
  divider_alpha: { main_10: "rgba(0,0,0,0.1)", main_05: "rgba(0,0,0,0.05)" },
  common: { white_alpha: { main_60: "rgba(255,255,255,0.6)" }, black_alpha: { main_10: "rgba(0,0,0,0.1)" } },
  primary: { _alpha: { main_15: "rgba(25,118,210,0.15)", main_10: "rgba(25,118,210,0.1)" }, main: "#1976d2" },
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("InventoryHeader RTL Component", () => {
  let InventoryHeader: unknown;

  before(async () => {
    const mod = await import("./InventoryHeader");
    InventoryHeader = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockUseWarehouses.mock.resetCalls();
  });

  describe("InventoryHeader() bileşeni", () => {
    it("should_RenderTitleAndButtons", async () => {
      const onAddClick = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryHeader
            value=""
            onSearch={() => {}}
            onAddClick={onAddClick}
          />
        </ThemeProvider>
      );
      
      expect(screen.getByText("Inventory")).toBeTruthy();
      expect(screen.getByText("Manage your stock")).toBeTruthy();
      expect(screen.getByText("Add Inventory")).toBeTruthy();

      fireEvent.click(screen.getByText("Add Inventory"));
      expect(onAddClick.mock.calls.length).toBe(1);
    });

    it("should_CallOnSearch_WhenInputChanges", async () => {
      const onSearch = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryHeader
            value=""
            onSearch={onSearch}
            onAddClick={() => {}}
          />
        </ThemeProvider>
      );

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "test query" } });
      expect(onSearch.mock.calls.length).toBe(1);
      expect(onSearch.mock.calls[0].arguments[0]).toBe("test query");
    });

    it("should_HideWarehouseFilter_WhenHideWarehouseFilterIsTrue", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryHeader
            value=""
            onSearch={() => {}}
            onAddClick={() => {}}
            hideWarehouseFilter={true}
          />
        </ThemeProvider>
      );

      expect(screen.queryByLabelText("Warehouse")).toBeNull();
      expect(screen.getAllByText("Stock Status").length).toBeGreaterThan(0);
    });

    it("should_RenderWarehouseFilter_WhenHideWarehouseFilterIsFalse", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryHeader
            value=""
            onSearch={() => {}}
            onAddClick={() => {}}
            hideWarehouseFilter={false}
          />
        </ThemeProvider>
      );

      // Label exists
      const elements = screen.getAllByText("Warehouse");
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});

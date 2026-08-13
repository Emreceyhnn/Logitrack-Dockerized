 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  inventory: {
    noItems: "No inventory items found",
    table: {
      productName: "Product Name",
      sku: "SKU",
      category: "Category",
      stockLevel: "Stock Level",
      unitPrice: "Unit Price",
      warehouses: "Warehouse",
    },
    category: {
      general: "General",
    },
    status: {
      blocked: "Blocked",
      low: "Low",
      out: "Out",
    },
    actions: {
      details: "Details",
      edit: "Edit",
      delete: "Delete",
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

const mockFormatFrom = mock.fn((val: number, cur: string, dec: number) => `$${val}`);
mock.module("../../../hooks/useCurrency.ts", {
  namedExports: {
    useCurrency: () => ({ formatFrom: mockFormatFrom, isLoading: false }),
  },
});

// Mock DataTable to expose columns rendering
let dataTableProps: unknown = null;
mock.module("../../ui/DataTable/index.tsx", {
  defaultExport: (props: Record<string, unknown>) => {
    dataTableProps = props;
    return (
      <div data-testid="data-table">
        <div data-testid="empty-message">{props.emptyMessage}</div>
      </div>
    );
  },
});

// Custom theme
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

Object.assign((customTheme.palette as unknown), {
  kpi: {
    sky: "#0ea5e9",
    sky_alpha: { main_10: "rgba(14,165,233,0.1)", main_20: "rgba(14,165,233,0.2)" },
    purple: "#a855f7",
    purple_alpha: { main_10: "rgba(168,85,247,0.1)", main_20: "rgba(168,85,247,0.2)" },
    amber: "#f59e0b",
    amber_alpha: { main_10: "rgba(245,158,11,0.1)", main_20: "rgba(245,158,11,0.2)" },
    emerald: "#10b981",
    emerald_alpha: { main_10: "rgba(16,185,129,0.1)", main_20: "rgba(16,185,129,0.2)" },
    indigo: "#6366f1",
    indigo_alpha: { main_10: "rgba(99,102,241,0.1)", main_20: "rgba(99,102,241,0.2)" },
  },
  primary: { main: "#1976d2", _alpha: { main_10: "rgba(25,118,210,0.1)", main_20: "rgba(25,118,210,0.2)" } },
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("InventoryTable RTL Component", () => {
  let InventoryTable: unknown;

  before(async () => {
    const mod = await import("./InventoryTable");
    InventoryTable = mod.default;
  });

  afterEach(() => {
    cleanup();
    dataTableProps = null;
    mockFormatFrom.mock.resetCalls();
  });

  const mockItems = [
    {
      id: "inv1",
      name: "Laptop",
      sku: "SKU-LAP-001",
      cargoType: "ELECTRONICS",
      quantity: 50,
      minStock: 10,
      allocatedQuantity: 5,
      unitValue: 1200,
      currency: "USD",
      warehouse: { code: "WH-A" },
    },
    {
      id: "inv2",
      name: "Frozen Meat",
      sku: "SKU-MEAT-001",
      cargoType: "FROZEN_FOOD",
      quantity: 5,
      minStock: 20, // Low stock
      allocatedQuantity: 0,
      unitValue: 50,
      currency: "USD",
      warehouse: { code: "WH-B" },
    },
    {
      id: "inv3",
      name: "Water",
      sku: "SKU-WTR-001",
      cargoType: null, // General
      quantity: 0, // Out of stock
      minStock: 10,
      allocatedQuantity: 0,
      unitValue: 1,
      currency: "USD",
      warehouse: { code: "WH-A" },
    },
  ];

  describe("InventoryTable() bileşeni", () => {
    it("should_PassPropsToDataTable", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryTable
            items={mockItems as unknown}
            onSelect={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId("data-table")).toBeTruthy();
      expect(screen.getByTestId("empty-message").textContent).toBe("No inventory items found");
      
      // Verify DataTable receives right columns and data
      expect(dataTableProps).not.toBeNull();
      expect(dataTableProps.rows.length).toBe(3);
      expect(dataTableProps.columns.length).toBe(6);
      expect(dataTableProps.rowActions.length).toBe(3);
    });

    it("should_FormatColumnsCorrectly", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryTable
            items={mockItems as unknown}
            onSelect={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </ThemeProvider>
      );
      
      const columns = dataTableProps.columns;
      
      // 1. productName
      const productNameCol = columns.find((c: Record<string, unknown>) => c.key === "productName");
      const nameRender = productNameCol.render(mockItems[0]);
      const { container: nameContainer } = render(nameRender);
      expect(nameContainer.textContent).toContain("Laptop");

      // 2. sku
      const skuCol = columns.find((c: Record<string, unknown>) => c.key === "sku");
      expect(skuCol.render(mockItems[0])).toBe("SKU-LAP-001");

      // 3. category
      const catCol = columns.find((c: Record<string, unknown>) => c.key === "category");
      const catRender = catCol.render(mockItems[1]); // FROZEN_FOOD
      const { container: catContainer } = render(catRender);
      expect(catContainer.textContent).toContain("FROZEN_FOOD");

      // 4. stockLevel (LOW_STOCK)
      const stockCol = columns.find((c: Record<string, unknown>) => c.key === "stockLevel");
      const stockRenderLow = stockCol.render(mockItems[1]); // quantity: 5, min: 20
      const { container: stockContainerLow } = render(stockRenderLow);
      expect(stockContainerLow.textContent).toContain("5");
      expect(stockContainerLow.textContent).toContain("(Low)");

      // 5. unitPrice
      const priceCol = columns.find((c: Record<string, unknown>) => c.key === "unitPrice");
      expect(priceCol.render(mockItems[0])).toBe("$1200");

      // 6. warehouse
      const whCol = columns.find((c: Record<string, unknown>) => c.key === "warehouse");
      const whRender = whCol.render(mockItems[0]);
      const { container: whContainer } = render(whRender);
      expect(whContainer.textContent).toContain("WH-A");
    });

    it("should_BindRowActionsCorrectly", async () => {
      const onSelect = mock.fn();
      const onEdit = mock.fn();
      const onDelete = mock.fn();

      render(
        <ThemeProvider theme={customTheme}>
          <InventoryTable
            items={mockItems as unknown}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </ThemeProvider>
      );

      const rowActions = dataTableProps.rowActions;

      // Details
      rowActions[0].onClick(mockItems[0]);
      expect(onSelect.mock.calls.length).toBe(1);
      expect(onSelect.mock.calls[0].arguments[0]).toBe("inv1");

      // Edit
      rowActions[1].onClick(mockItems[0]);
      expect(onEdit.mock.calls.length).toBe(1);
      expect(onEdit.mock.calls[0].arguments[0]).toBe(mockItems[0]);

      // Delete
      rowActions[2].onClick(mockItems[0]);
      expect(onDelete.mock.calls.length).toBe(1);
      expect(onDelete.mock.calls[0].arguments[0]).toBe("inv1");
    });
  });
});

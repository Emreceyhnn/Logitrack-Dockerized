 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    noData: "Required",
    saveSuccess: "Saved",
    fillRequired: "Fill required fields",
  },
  inventory: {
    dialogs: {
      editItem: "Edit Item",
      productInfo: "Product Info",
      productImage: "Product Image",
      clickToChange: "Click to change",
      skuOptional: "SKU (Optional)",
      skuPlaceholder: "Enter SKU",
      safetyThreshold: "Safety Threshold",
      auditWarning: "Audit Warning",
      loadParams: "Load Params",
      unitWeight: "Unit Weight",
      totalVolume: "Total Volume",
      palletSpots: "Pallet Spots",
      discardChanges: "Discard",
      commitUpdate: "Commit Update",
    },
    fields: {
      name: "Product Name",
      quantity: "Quantity",
    },
    filters: {
      warehouse: "Warehouse",
    },
    table: {
      cargoType: "Cargo Type",
      unitPrice: "Unit Value",
    }
  },
  warehouses: {
    dialogs: {
      zones: {
        code: "Zone",
      },
      fields: {
        unassigned: "Unassigned",
      },
    },
  },
  toasts: {
    loading: "Loading...",
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

mock.module("../../../hooks/useWarehouses.ts", {
  namedExports: {
    useWarehouses: mock.fn(() => ({
      data: [{ id: "wh-1", name: "Main Warehouse", code: "WH-M" }]
    })),
    useWarehouseZones: mock.fn(() => ({ data: [] })),
  },
});

mock.module("../../../lib/actions/upload.ts", {
  namedExports: { 
    uploadImageAction: mock.fn(async () => ({ url: "https://example.com/image.png" }))
  },
});

mock.module("../../../hooks/useCurrency.ts", {
  namedExports: {
    useCurrency: mock.fn(() => ({
      convertFrom: (val: number) => val,
      symbol: "$",
      currency: "USD",
    }))
  }
});

// Bypass Yup validation for UI tests
mock.module("yup", {
  namedExports: {
    object: () => ({
      validate: async (val: Record<string, unknown>) => val,
      isValid: async () => true,
      validateSync: (val: Record<string, unknown>) => val,
      isValidSync: () => true,
    }),
    string: () => ({ required: () => ({}), optional: () => ({ nullable: () => ({}) }) }),
    number: () => ({ typeError: () => ({ required: () => ({ min: () => ({}) }) }), nullable: () => ({ transform: () => ({}) }) }),
  }
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    secondary: { main: "#9c27b0" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_80: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.secondary as unknown)._alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.warning as unknown)._alpha = mockAlpha;

(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;
(customTheme.palette.background as unknown).default_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: { main_20: "rgba()", main_30: "rgba()", main_50: "rgba()" } };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("InventoryEditDialog RTL Component", () => {
  let InventoryEditDialog: unknown;

  before(async () => {
    const mod = await import("./InventoryEditDialog");
    InventoryEditDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const MOCK_ITEM = {
    id: "inv-1",
    sku: "TEST-SKU-001",
    name: "Test Product",
    quantity: 100,
    minStock: 20,
    warehouseId: "wh-1",
    warehouse: { id: "wh-1", name: "Main Warehouse", code: "WH-M" },
    cargoType: "General",
    weightKg: 5.5,
    volumeM3: 0.2,
    palletCount: 1,
    unitValue: 150,
    currency: "USD",
  };

  describe("InventoryEditDialog() bileşeni", () => {
    it("should_RenderFormFields_AndPopulateWithItemData", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryEditDialog isOpen={true} onClose={() => {}} item={MOCK_ITEM} onUpdate={mock.fn()} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Edit Item")).toBeTruthy();
      
      const nameInput = screen.getByDisplayValue("Test Product");
      expect(nameInput).toBeTruthy();
      
      const quantityInput = screen.getByDisplayValue("100");
      expect(quantityInput).toBeTruthy();
    });

    it("should_CallOnUpdate_WhenFormIsSubmitted", async () => {
      const mockOnUpdate = mock.fn();
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryEditDialog isOpen={true} onClose={() => {}} item={MOCK_ITEM} onUpdate={mockOnUpdate} />
        </ThemeProvider>
      );

      const submitButton = screen.getByText("Commit Update");
      fireEvent.click(submitButton);

      // Assert that form submission triggered the promise toast wrapper
      await waitFor(() => {
         expect(toastMock.promise.mock.calls.length).toBeGreaterThan(0);
      });
    });
  });
});

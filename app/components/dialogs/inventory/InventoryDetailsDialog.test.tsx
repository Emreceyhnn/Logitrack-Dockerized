 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  inventory: {
    status: {
      outOfStock: "Out of Stock",
      lowStock: "Low Stock",
      inStock: "In Stock",
      blocked: "Blocked",
    },
    fields: {
      sku: "SKU",
      unitValue: "Unit Value",
      weight: "Weight",
      volume: "Volume",
      pallets: "Pallets",
    },
    dialogs: {
      overview: "Overview",
      history: "History",
      stockLevels: "Stock Levels",
      available: "Available",
      quickAdjustment: "Quick Adjustment",
      adjustmentAmount: "Amount",
      adjustmentType: "Type",
      notes: "Notes",
      safetyStock: "Safety Stock",
      locationData: "Location Data",
      warehouseCode: "Warehouse Code",
      cargoType: "Cargo Type",
      physicalSpecs: "Physical Specs",
      intelTitle: "Intel",
      intelDesc: "Keep minStock above {minStock}",
      otherLocations: "Other Locations",
    },
    category: {
      general: "General",
    }
  },
  common: {
    apply: "Apply",
    errorOccurred: "Error",
  },
  toasts: {
    successUpdate: "Updated",
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

mock.module("../../../lib/controllers/inventory.ts", {
  namedExports: { 
    getInventoryMovements: mock.fn(async () => []),
    getInventoryBySku: mock.fn(async () => []),
  },
});

const mutateAsyncMock = mock.fn(async () => ({}));
mock.module("../../../hooks/useInventory.ts", {
  namedExports: {
    useInventoryMutations: mock.fn(() => ({
      adjustStock: { mutateAsync: mutateAsyncMock, isPending: false }
    }))
  }
});

mock.module("../../../hooks/useCurrency.ts", {
  namedExports: {
    useCurrency: mock.fn(() => ({
      formatFrom: (val: number, cur: string) => `${val} ${cur}`
    }))
  }
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: {
    useDateSettings: mock.fn(() => ({}))
  }
});

mock.module("../../../lib/utils/date.ts", {
  namedExports: {
    formatDisplayDateTime: mock.fn(() => "Formatted Date")
  }
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293", light: "#42a5f5" } as unknown,
    secondary: { main: "#9c27b0" } as unknown,
    success: { main: "#2e7d32", light: "#4caf50" } as unknown,
    error: { main: "#d32f2f", light: "#ef5350" } as unknown,
    warning: { main: "#ed6c02", light: "#ff9800" } as unknown,
    info: { main: "#0288d1", light: "#03a9f4" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.secondary as unknown)._alpha = mockAlpha;
(customTheme.palette.success as unknown)._alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.warning as unknown)._alpha = mockAlpha;
(customTheme.palette.info as unknown)._alpha = mockAlpha;

(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).default_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;
(customTheme.palette.text as unknown).secondary_alpha = { main_50: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("InventoryDetailsDialog RTL Component", () => {
  let InventoryDetailsDialog: unknown;

  before(async () => {
    const mod = await import("./InventoryDetailsDialog");
    InventoryDetailsDialog = mod.default;
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
    allocatedQuantity: 10,
    warehouseId: "wh-1",
    warehouse: { id: "wh-1", name: "Main Warehouse", code: "WH-M" },
    cargoType: "General",
    weightKg: 5.5,
    volumeM3: 0.2,
    palletCount: 1,
    unitValue: 150,
    currency: "USD",
  };

  describe("InventoryDetailsDialog() bileşeni", () => {
    it("should_RenderDetails_WhenItemIsProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryDetailsDialog isOpen={true} onClose={() => {}} item={MOCK_ITEM} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Test Product")).toBeTruthy();
      expect(screen.getByText(/TEST-SKU-001/)).toBeTruthy();
      
      // Stock Levels
      expect(screen.getByText("90")).toBeTruthy(); // 100 - 10 allocated
    });

    it("should_CallAdjustStock_WhenAdjustmentIsSubmitted", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryDetailsDialog isOpen={true} onClose={() => {}} item={MOCK_ITEM} />
        </ThemeProvider>
      );

      const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: "50" } });

      const applyButton = screen.getByText(/Apply/i);
      fireEvent.click(applyButton);

      // Assert API is called
      expect(mutateAsyncMock.mock.calls.length).toBe(1);
    });
  });
});

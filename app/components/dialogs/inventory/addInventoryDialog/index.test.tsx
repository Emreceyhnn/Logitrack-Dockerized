 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    save: "Save",
    errorOccurred: "Error",
  },
  inventory: {
    dialogs: {
      addTitle: "Add Inventory",
      addSubtitle: "Add new product",
      steps: {
        details: "Details",
        storage: "Storage",
        review: "Review",
      }
    }
  },
  warehouses: {
    dialogs: {
      zones: {
        code: "Zone",
        empty: "No zones defined yet",
      },
      fields: {
        unassigned: "Unassigned",
      },
    },
  },
  toasts: {
    loading: "Loading...",
    successAdd: "Item Added",
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  loading: mock.fn(),
  dismiss: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

mock.module("../../../../lib/controllers/warehouse.ts", {
  namedExports: {
    addInventoryItem: mock.fn(async () => ({}))
  },
});

mock.module("../../../../lib/controllers/inventory.ts", {
  namedExports: {
    getInventory: mock.fn(async () => []),
    getInventoryItemById: mock.fn(async () => null),
    getLowStockItems: mock.fn(async () => []),
    getInventoryMovements: mock.fn(async () => []),
    createInventoryItem: mock.fn(async () => ({})),
    updateInventoryItem: mock.fn(async () => ({})),
    deleteInventoryItem: mock.fn(async () => ({})),
    logWarehouseFulfillment: mock.fn(async () => ({})),
    adjustInventoryStock: mock.fn(async () => ({})),
  },
});

const inventoryQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: mock.fn(() => ({ data: null })),
    useMutation: mock.fn((options: Record<string, unknown>) => ({
      mutate: (variables: Record<string, unknown>) => {
        Promise.resolve().then(async () => {
          const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
          try {
            const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
            await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
          } catch (e) {
            (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          } finally {
            (options.onSettled as (() => void) | undefined)?.();
          }
        });
      },
      mutateAsync: async (variables: Record<string, unknown>) => {
        const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
        try {
          const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
          await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
          return res;
        } catch (e) {
          (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          throw e;
        } finally {
          (options.onSettled as (() => void) | undefined)?.();
        }
      },
    })),
    useQueryClient: mock.fn(() => inventoryQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("../../../../hooks/useUser.ts", {
  namedExports: { 
    useUser: mock.fn(() => ({ user: { currency: "USD" } }))
  },
});

mock.module("../../../../lib/actions/upload.ts", {
  namedExports: { 
    uploadImageAction: mock.fn(async () => ({ url: "https://example.com/image.png" }))
  },
});

// Mock Sections
mock.module("./sections/ItemDetailsSection.tsx", {
  defaultExport: () => <div data-testid="item-details-section">Item Details</div>,
});
mock.module("./sections/StorageLevelsSection.tsx", {
  defaultExport: () => <div data-testid="storage-levels-section">Storage Levels</div>,
});
mock.module("./sections/ReviewSection.tsx", {
  defaultExport: () => <div data-testid="review-section">Review</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_50: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AddInventoryDialog RTL Component", () => {
  let AddInventoryDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddInventoryDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddInventoryDialog() bileşeni", () => {
    it("should_RenderWizard_AndDisplayFirstStep", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AddInventoryDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Add Inventory")).toBeTruthy();
      expect(screen.getByTestId("item-details-section")).toBeTruthy();
    });
  });
});

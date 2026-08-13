 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  inventory: {
    totalItems: "Total Items",
    lowStock: "Low Stock",
    outOfStock: "Out Of Stock",
    totalValue: "Total Value",
    header: "Inventory",
    deleteTitle: "Delete Item",
    deleteDesc: "Delete {name}?",
  }
}));

mock.module("../../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const mockRefetch = mock.fn(async () => {});
const mockDeleteMutateAsync = mock.fn(async () => {});
const mockUpdateMutateAsync = mock.fn(async () => {});

mock.module("../../../../../hooks/useInventory.ts", {
  namedExports: { 
    useInventoryWithDashboard: mock.fn(() => ({
      data: {
        items: [{ id: "i1", name: "Item 1" }],
        stats: { totalItems: 10, lowStockCount: 2, outOfStockCount: 0, totalValue: 1000 },
        statsTrends: {},
        totalCount: 1
      },
      isLoading: false,
      refetch: mockRefetch,
    })),
    useInventoryMutations: mock.fn(() => ({
      deleteItem: { mutateAsync: mockDeleteMutateAsync, isPending: false },
      updateItem: { mutateAsync: mockUpdateMutateAsync, isPending: false }
    }))
  },
});

mock.module("../../../../../hooks/useTableParams.ts", {
  namedExports: { 
    useTableParams: mock.fn(() => ({
      page: 1,
      pageSize: 10,
      search: "",
      sortField: "name",
      sortOrder: "asc",
      getFilter: mock.fn(() => undefined),
      getArrayFilter: mock.fn(() => undefined),
      setPage: mock.fn(),
      setPageSize: mock.fn(),
      setSearch: mock.fn(),
      setSort: mock.fn(),
      setFilter: mock.fn(),
    }))
  },
});

mock.module("../../../../../hooks/useCurrency.ts", {
  namedExports: { 
    useCurrency: mock.fn(() => ({
      format: (val: number) => `$${val}`,
      isLoading: false
    }))
  },
});

// Mock child components
mock.module("../../../../../components/cards/KpiCards.tsx", {
  defaultExport: () => <div data-testid="kpi-cards">KPI Cards</div>,
});
mock.module("../../../../../components/dashboard/inventory/InventoryHeader.tsx", {
  defaultExport: () => <div data-testid="inventory-header">Header</div>,
});
mock.module("../../../../../components/dashboard/inventory/InventoryTable.tsx", {
  defaultExport: ({ onDelete  }: Record<string, unknown>) => (
    <div data-testid="inventory-table">
      <button onClick={() => onDelete("i1")}>Delete i1</button>
    </div>
  ),
});
mock.module("../../../../../components/dialogs/inventory/InventoryDetailsDialog.tsx", {
  defaultExport: () => <div data-testid="detail-dialog">Details Dialog</div>,
});
mock.module("../../../../../components/dialogs/inventory/InventoryEditDialog.tsx", {
  defaultExport: () => <div data-testid="edit-dialog">Edit Dialog</div>,
});
mock.module("../../../../../components/dialogs/inventory/addInventoryDialog/index.tsx", {
  defaultExport: () => <div data-testid="add-dialog">Add Dialog</div>,
});
mock.module("../../../../../components/dialogs/deleteConfirmationDialog.tsx", {
  defaultExport: ({ open, onConfirm  }: Record<string, unknown>) => open ? (
    <div data-testid="delete-dialog">
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  ) : null,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    error: { main: "#d32f2f" } as unknown,
  }
});
import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("InventoryContent Component", () => {
  let InventoryContent: unknown;

  before(async () => {
    const mod = await import("./InventoryContent");
    InventoryContent = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockRefetch.mock.resetCalls();
    mockDeleteMutateAsync.mock.resetCalls();
  });

  describe("InventoryContent() Render Testleri", () => {
    it("should_RenderDashboardElements_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByTestId("kpi-cards")).toBeTruthy();
      expect(screen.getByTestId("inventory-header")).toBeTruthy();
      expect(screen.getByTestId("inventory-table")).toBeTruthy();
    });

    it("should_OpenDeleteDialog_WhenDeleteClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <InventoryContent />
        </ThemeProvider>
      );

      const deleteBtn = screen.getByText("Delete i1");
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeTruthy();
      });

      const confirmBtn = screen.getByText("Confirm Delete");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteMutateAsync.mock.calls.length).toBe(1);
      });
    });
  });
});

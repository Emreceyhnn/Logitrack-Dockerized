 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  warehouses: {
    title: "Warehouses",
    subtitle: "Manage warehouses",
    addWarehouse: "Add Warehouse",
    deleteTitle: "Delete",
    deleteDesc: "Delete {name}?",
    kpi: {
      totalWarehouses: "Total Warehouses",
      inventorySkus: "SKUs",
      totalItems: "Total Items",
      palletCapacity: "Pallets",
      stockedVolume: "Volume",
    }
  },
  toasts: {
    successDelete: "Deleted",
    errorGeneric: "Error",
  }
}));


mock.module("../../../../../components/dialogs/warehouse/addWarehouseDialog/index.tsx", {
  defaultExport: () => <div data-testid="add-dialog">Add Dialog</div>,
});
mock.module("../../../../../components/dialogs/warehouse/warehouseDetailsDialog/index.tsx", {
  defaultExport: () => <div data-testid="details-dialog">Details Dialog</div>,
});
mock.module("../../../../../components/dialogs/warehouse/editWarehouseDialog/index.tsx", {
  defaultExport: () => <div data-testid="edit-dialog">Edit Dialog</div>,
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
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    info: { main: "#0288d1" } as unknown,
    secondary: { main: "#9c27b0" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    success: { main: "#2e7d32" } as unknown,
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

describe("WarehouseContent RTL Component", () => {
  let WarehouseContent: unknown;

  before(async () => {
    const mod = await import("./WarehouseContent");
    WarehouseContent = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockMutateAsync.mock.resetCalls();
  });

  describe("WarehouseContent() bileşeni", () => {
    it("should_RenderDashboardElements_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Warehouses")).toBeTruthy();
      expect(screen.getByTestId("kpi-cards")).toBeTruthy();
      expect(screen.getByTestId("warehouse-list")).toBeTruthy();
      expect(screen.getByTestId("capacity-chart")).toBeTruthy();
      expect(screen.getByTestId("movements-table")).toBeTruthy();
    });

    it("should_TriggerDeleteMutation_WhenDeleteConfirmed", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseContent />
        </ThemeProvider>
      );

      // Simulate clicking delete on the table row
      const deleteBtn = screen.getByText("Delete WH-1");
      fireEvent.click(deleteBtn);

      // Dialog opens
      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeTruthy();
      });

      // Click confirm
      const confirmBtn = screen.getByText("Confirm Delete");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockMutateAsync.mock.calls.length).toBe(1);
        expect(mockMutateAsync.mock.calls[0].arguments[0]).toBe("wh-1");
      });
    });
  });
});

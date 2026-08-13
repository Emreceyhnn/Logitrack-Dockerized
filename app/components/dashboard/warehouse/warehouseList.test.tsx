 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  dashboard: {
    warehouse: {
      code: "Code",
      name: "Name",
      typeCity: "Type / City",
      capacityPallets: "Pallet Capacity",
      capacityVolume: "Volume Capacity",
      operatingHours: "Operating Hours",
      viewDetails: "View Details",
      editWarehouse: "Edit",
      deleteFactory: "Delete",
      noWarehouses: "No Warehouses",
      listTitle: "Warehouse List",
      utilized: "{percent}% Utilized",
      space: "{percent}% Space",
    }
  },
  warehouses: {
    categories: {
      types: {
        DISTRIBUTION_CENTER: "Distribution",
      }
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: { useDateSettings: mock.fn(() => ({ timezone: "Europe/Istanbul" })) },
});

mock.module("dayjs", {
  defaultExport: () => ({
    tz: () => ({
      set: () => ({
        set: () => ({
          set: () => ({
            isBefore: () => false,
            add: () => ({}),
            tz: () => ({ format: () => "08:00" }),
          })
        })
      })
    })
  }),
});

mock.module("../../ui/DataTable/index.tsx", {
  defaultExport: ({ rows, columns, rowActions, emptyMessage  }: Record<string, unknown>) => (
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
              <th>Actions</th>
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
                <td>
                  {rowActions?.map((action: unknown, aIdx: number) => (
                    <button key={aIdx} onClick={() => action.onClick(row)}>
                      {action.label}
                    </button>
                  ))}
                </td>
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
    error: { main: "#d32f2f" } as unknown,
    success: { main: "#2e7d32" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba(0,0,0,0.05)", main_10: "rgba(0,0,0,0.1)", main_30: "rgba(0,0,0,0.3)", main_40: "rgba(0,0,0,0.4)" };
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.success as unknown)._alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("WarehouseListTable RTL Component", () => {
  let WarehouseListTable: unknown;

  before(async () => {
    const mod = await import("./warehouseList");
    WarehouseListTable = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockWarehouses = [
    {
      id: "wh-1",
      code: "WH-001",
      name: "Main HQ",
      address: "Atasehir, Istanbul",
      type: "DISTRIBUTION_CENTER",
      city: "Istanbul",
      capacityPallets: 1000,
      capacityVolumeM3: 5000,
      _count: { inventory: 50 }, // 500 pallets, 250 m3
      operatingHours: "08:00 - 18:00",
      timezone: "Europe/Istanbul",
    }
  ];

  describe("WarehouseListTable() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoWarehouses", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseListTable warehouses={[]} loading={false} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} onDetails={() => {}} />
        </ThemeProvider>
      );

      expect(screen.getByText("No Warehouses")).toBeTruthy();
    });

    it("should_RenderColumns_Properly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseListTable warehouses={mockWarehouses} loading={false} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} onDetails={() => {}} />
        </ThemeProvider>
      );

      // Code
      expect(screen.getByText("WH-001")).toBeTruthy();
      // Name & Address
      expect(screen.getByText("Main HQ")).toBeTruthy();
      expect(screen.getByText("Atasehir")).toBeTruthy();
      // Type & City
      expect(screen.getByText("Distribution")).toBeTruthy();
      expect(screen.getByText("Istanbul")).toBeTruthy();
      
      // Pallets
      expect(screen.getByText(/500 \/ 1[.,]000/)).toBeTruthy();
      expect(screen.getByText("50% Utilized")).toBeTruthy();

      // Volume
      expect(screen.getByText(/250 \/ 5[.,]000 m³/)).toBeTruthy();
      expect(screen.getByText("5% Space")).toBeTruthy();
    });

    it("should_TriggerRowActions_WhenClicked", async () => {
      const onEdit = mock.fn();
      const onDelete = mock.fn();
      const onDetails = mock.fn();

      render(
        <ThemeProvider theme={customTheme}>
          <WarehouseListTable 
            warehouses={mockWarehouses} 
            loading={false} 
            onSelect={() => {}} 
            onEdit={onEdit} 
            onDelete={onDelete} 
            onDetails={onDetails} 
          />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Edit"));
      expect(onEdit.mock.calls.length).toBe(1);
      expect(onEdit.mock.calls[0].arguments[0]).toBe("wh-1");

      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete.mock.calls.length).toBe(1);
      expect(onDelete.mock.calls[0].arguments[0]).toBe("wh-1");

      fireEvent.click(screen.getByText("View Details"));
      expect(onDetails.mock.calls.length).toBe(1);
      expect(onDetails.mock.calls[0].arguments[0]).toBe("wh-1");
    });
  });
});

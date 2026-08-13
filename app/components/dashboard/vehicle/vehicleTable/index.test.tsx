 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    edit: "Edit",
    delete: "Delete",
    km: "km",
    na: "N/A"
  },
  vehicles: {
    table: {
      emptyMessage: "No vehicles",
      searchPlaceholder: "Search...",
      title: "Vehicles"
    },
    fields: {
      plate: "Plate",
      brandModel: "Brand - Model",
      status: "Status",
      odometer: "Odometer",
      driver: "Driver",
      type: "Type",
      fuelLevel: "Fuel Level"
    },
    statuses: {
      AVAILABLE: "Available",
      MAINTENANCE: "Maintenance",
      notAssigned: "No Driver"
    },
    types: {
      TRUCK: "Truck"
    },
    dialogs: {
      details: "Details",
      setMaintenance: "Set Maintenance",
      returnToService: "Return to Service"
    }
  },
  toasts: {
    successUpdate: "Updated",
    errorGeneric: "Error"
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/type/enums.ts", {
  namedExports: {
    VehicleStatus: { AVAILABLE: "AVAILABLE", MAINTENANCE: "MAINTENANCE" },
    VehicleType: { TRUCK: "TRUCK" },
  }
});

const mockUpdateVehicleStatus = mock.fn(async () => {});
mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: {
    createVehicle: mock.fn(async () => {}),
    updateVehicle: mock.fn(async () => {}),
    deleteVehicle: mock.fn(async () => {}),
    updateVehicleStatus: mockUpdateVehicleStatus,
    assignDriverToVehicle: mock.fn(async () => {}),
    unassignDriverFromVehicle: mock.fn(async () => {}),
    uploadVehicleDocument: mock.fn(async () => {}),
    addMaintenanceRecord: mock.fn(async () => {}),
    createVehicleIssue: mock.fn(async () => {}),
  }
});

mock.module("../../../../lib/controllers/fuel.ts", {
  namedExports: { createFuelLog: mock.fn(async () => {}) },
});

mock.module("sonner", {
  namedExports: { toast: { success: mock.fn(), error: mock.fn() } }
});

const queryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: mock.fn(() => ({ data: null })),
    useMutation: mock.fn((options: Record<string, unknown>) => ({
      mutate: (variables: Record<string, unknown>) => {
        Promise.resolve()
          .then(async () => {
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
    useQueryClient: mock.fn(() => queryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("../../../chips/statusChips.tsx", {
  namedExports: { StatusChip: ({ status  }: Record<string, unknown>) => <span data-testid={`status-chip-${status}`}>{status}</span> }
});

mock.module("../../../avatar.tsx", {
  defaultExport: ({ name, surname  }: Record<string, unknown>) => <div data-testid="driver-avatar">{name} {surname}</div>
});

mock.module("../../../ui/DataTable/index.tsx", {
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
                  {rowActions?.map((action: unknown, aIdx: number) => {
                    const isHidden = action.hidden ? action.hidden(row) : false;
                    if (isHidden) return null;
                    return (
                      <button key={aIdx} onClick={() => action.onClick(row)}>
                        {action.label}
                      </button>
                    );
                  })}
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
  palette: { mode: "light" }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("VehicleTable RTL Component", () => {
  let VehicleTable: unknown;

  before(async () => {
    const mod = await import("./index");
    VehicleTable = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockUpdateVehicleStatus.mock.resetCalls();
  });

  const mockVehicles = [
    {
      id: "v-1",
      plate: "34 ABC 123",
      brand: "Volvo",
      model: "FH16",
      year: 2022,
      status: "AVAILABLE",
      odometerKm: 150000,
      type: "TRUCK",
      fuelLevel: 80,
      fuelCapacity: 500,
      driver: { user: { name: "Ahmet", surname: "Yilmaz", avatarUrl: "" }, rating: 4.5 }
    },
    {
      id: "v-2",
      plate: "06 DEF 456",
      brand: "Mercedes",
      model: "Actros",
      year: 2021,
      status: "MAINTENANCE",
      odometerKm: null,
      type: "TRUCK",
      fuelLevel: null,
      fuelCapacity: null,
      driver: null
    }
  ];

  const mockState = { vehicles: mockVehicles, loading: false, filters: {} };
  const mockActions = {
    selectVehicle: mock.fn(),
    onEdit: mock.fn(),
    onDelete: mock.fn(),
    updateFilters: mock.fn(),
    onUpdateSuccess: mock.fn(),
  };

  describe("VehicleTable() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoVehicles", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleTable state={{ vehicles: [] }} actions={mockActions} />
        </ThemeProvider>
      );

      expect(screen.getByText("No vehicles")).toBeTruthy();
    });

    it("should_RenderVehicleRows_Properly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleTable state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Plate
      expect(screen.getByText("34 ABC 123")).toBeTruthy();
      
      // Brand/Model
      expect(screen.getByText("Volvo – FH16 / 2022")).toBeTruthy();
      
      // Odometer
      expect(screen.getByText(/150[.,]000 km/)).toBeTruthy();
      expect(screen.getByText("N/A")).toBeTruthy(); // For v-2
      
      // Driver
      expect(screen.getByTestId("driver-avatar")).toBeTruthy();
      expect(screen.getByText("Ahmet Yilmaz")).toBeTruthy();
      expect(screen.getByText("No Driver")).toBeTruthy(); // For v-2
      
      // Fuel
      expect(screen.getByText("80%")).toBeTruthy();
      expect(screen.getByText("400lt / 500lt")).toBeTruthy(); // 80% of 500 = 400
    });

    it("should_TriggerRowActions_AndStatusUpdates", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleTable state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Detail action
      const detailBtns = screen.getAllByText("Details");
      fireEvent.click(detailBtns[0]);
      expect(mockActions.selectVehicle.mock.calls.length).toBe(1);

      // Edit action
      const editBtns = screen.getAllByText("Edit");
      fireEvent.click(editBtns[0]);
      expect(mockActions.onEdit.mock.calls.length).toBe(1);

      // Delete action
      const deleteBtns = screen.getAllByText("Delete");
      fireEvent.click(deleteBtns[0]);
      expect(mockActions.onDelete.mock.calls.length).toBe(1);

      // Status Update (Set Maintenance on v-1)
      const maintenanceBtn = screen.getByText("Set Maintenance");
      fireEvent.click(maintenanceBtn);

      await waitFor(() => {
        expect(mockUpdateVehicleStatus.mock.calls.length).toBe(1);
        expect(mockUpdateVehicleStatus.mock.calls[0].arguments[0]).toBe("v-1");
        expect(mockUpdateVehicleStatus.mock.calls[0].arguments[1]).toBe("MAINTENANCE");
      });

      // Status Update (Return to Service on v-2)
      const returnBtn = screen.getByText("Return to Service");
      fireEvent.click(returnBtn);

      await waitFor(() => {
        expect(mockUpdateVehicleStatus.mock.calls.length).toBe(2);
        expect(mockUpdateVehicleStatus.mock.calls[1].arguments[0]).toBe("v-2");
        expect(mockUpdateVehicleStatus.mock.calls[1].arguments[1]).toBe("AVAILABLE");
      });
    });
  });
});

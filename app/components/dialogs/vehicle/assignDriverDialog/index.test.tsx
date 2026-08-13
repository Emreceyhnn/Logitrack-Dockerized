 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    na: "N/A",
  },
  vehicles: {
    fields: {
      plate: "Plate",
    },
    dialogs: {
      manageDriver: "Manage Driver",
      failedToLoadDrivers: "Failed to load",
      failedToAssign: "Failed to assign",
      failedToUnassign: "Failed to unassign",
      currentAssignment: "Current Assignment",
      rating: "Rating",
      unassign: "Unassign",
      noDriverAssigned: "No Driver",
      assignNewDriver: "Assign New",
      selectDriver: "Select",
      noDriversFound: "No Drivers Found",
      assigning: "Assigning",
      assignDriver: "Assign Driver",
    },
  },
}));

const assignDriverMock = mock.fn(async () => ({ success: true }));
const unassignDriverMock = mock.fn(async () => ({ success: true }));
const getAvailableDriversMock = mock.fn(async () => []);

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: {
    createVehicle: mock.fn(async () => ({})),
    updateVehicle: mock.fn(async () => ({})),
    deleteVehicle: mock.fn(async () => ({})),
    updateVehicleStatus: mock.fn(async () => ({})),
    assignDriverToVehicle: assignDriverMock,
    unassignDriverFromVehicle: unassignDriverMock,
    uploadVehicleDocument: mock.fn(async () => ({})),
    getAvailableDrivers: getAvailableDriversMock,
    addMaintenanceRecord: mock.fn(async () => ({})),
    createVehicleIssue: mock.fn(async () => ({})),
  },
});

mock.module("../../../../lib/controllers/fuel.ts", {
  namedExports: { createFuelLog: mock.fn(async () => ({})) },
});

mock.module("sonner", {
  namedExports: {
    toast: {
      success: mock.fn(),
      error: mock.fn(),
      loading: mock.fn(),
      dismiss: mock.fn(),
      promise: mock.fn(async (promise) => await promise),
    },
  },
});

const assignDriverQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => assignDriverQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    divider_alpha: { main_10: "rgba(0,0,0,0.1)", main_05: "rgba(0,0,0,0.05)" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_20: "rgba()", main_30: "rgba()", main_10: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_05: "rgba()" } },
    success: { ...originalMui.useTheme().palette.success, _alpha: { main_10: "rgba()" } },
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AssignDriverDialog RTL Component", () => {
  let AssignDriverDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AssignDriverDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AssignDriverDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <AssignDriverDialog
          open={true}
          onClose={() => {}}
          vehicleId="v1"
          vehiclePlate="34 ABC 123"
          currentDriver={null}
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText("Manage Driver")).toBeTruthy();
      expect(screen.getByText("Current Assignment")).toBeTruthy();
      expect(screen.getByText("Assign New")).toBeTruthy();
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    save: "Save",
  },
  toasts: {
    loading: "Loading...",
    successAdd: "Successfully added",
    errorGeneric: "Error occurred",
  },
  validation: {
    genericFormError: "Form error",
  },
  vehicles: {
    dialogs: {
      addTitle: "Add Vehicle",
      steps: {
        general: "General",
        specs: "Specs",
        docs: "Docs",
      },
    },
  },
}));

const createVehicleMock = mock.fn(async () => ({ id: "vehicle-1" }));
const uploadVehicleDocumentMock = mock.fn(async () => ({}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: {
    createVehicle: createVehicleMock,
    updateVehicle: mock.fn(async () => ({})),
    deleteVehicle: mock.fn(async () => ({})),
    updateVehicleStatus: mock.fn(async () => ({})),
    assignDriverToVehicle: mock.fn(async () => ({})),
    unassignDriverFromVehicle: mock.fn(async () => ({})),
    uploadVehicleDocument: uploadVehicleDocumentMock,
    addMaintenanceRecord: mock.fn(async () => ({})),
    createVehicleIssue: mock.fn(async () => ({})),
  },
});

mock.module("../../../../lib/controllers/fuel.ts", {
  namedExports: { createFuelLog: mock.fn(async () => ({})) },
});

mock.module("../../../../lib/actions/upload.ts", {
  namedExports: { uploadImageAction: mock.fn() },
});

mock.module("../../../../lib/validationSchema.ts", {
  namedExports: { addVehicleValidationSchema: mock.fn(() => ({})) },
});

mock.module("sonner", {
  namedExports: {
    toast: {
      promise: mock.fn(),
      loading: mock.fn(),
      dismiss: mock.fn(),
      success: mock.fn(),
      error: mock.fn(),
    },
  },
});

const vehicleQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => vehicleQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

// Since Formik uses Context, testing full Formik flows without wrapping it in a valid component tree can be tricky.
// For the dialog test, we just want to test if it renders the base structure.
// However, since RTL evaluates everything, we provide mock children for the complex steps.
mock.module("./firstStep.tsx", { defaultExport: () => <div data-testid="first-step" /> });
mock.module("./techSpecsStep.tsx", { defaultExport: () => <div data-testid="tech-specs-step" /> });
mock.module("./documentsStep.tsx", { defaultExport: () => <div data-testid="documents-step" /> });

// Provide MUI Theme Mock so custom palette variables exist during real render
import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    divider_alpha: { main_10: "rgba(0,0,0,0.1)", main_05: "rgba(0,0,0,0.05)", main_02: "rgba(0,0,0,0.02)" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_20: "rgba(0,0,0,0.2)" } },
    success: { ...originalMui.useTheme().palette.success, _alpha: { main_10: "rgba(0,0,0,0.1)", main_20: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba(0,0,0,0.1)" } },
    warning: { ...originalMui.useTheme().palette.warning, _alpha: { main_10: "rgba(0,0,0,0.1)" } }
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AddVehicleDialog RTL Component", () => {
  let AddVehicleDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddVehicleDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddVehicleDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <AddVehicleDialog
          open={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      // Assert that the title exists
      expect(screen.getByText("Add Vehicle")).toBeTruthy();
      
      // First step should be active and rendered based on our mock
      expect(screen.getByTestId("first-step")).toBeTruthy();
    });
  });
});

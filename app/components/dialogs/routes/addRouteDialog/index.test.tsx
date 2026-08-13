 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  routes: {
    dialogs: {
      addTitle: "Add Route",
      addSubtitle: "Create a new route",
      steps: {
        schedule: "Schedule",
        locations: "Locations",
        assignments: "Assignments",
      }
    }
  },
  toasts: {
    loading: "Loading...",
    successAdd: "Created",
    errorGeneric: "Error",
  },
  common: {
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    next: "Next",
  },
  validation: {
    genericFormError: "Form Error",
  }
}));


const stableDict = {
      common: { back: "Back", cancel: "Cancel", next: "Next", save: "Save" },
      routes: {
        details: { delivery: "Delivery" },
        dialogs: {
          addTitle: "Add Route", addSubtitle: "Add subtitle",
          editTitle: "Edit Route", editSubtitle: "Edit subtitle",
          deliveryLabel: "Delivery {n}", prefilledFrom: "Prefilled from {name}",
          steps: { locations: "Locations", schedule: "Schedule", assignments: "Assignments" },
        },
      },
      shipments: {
        dialogs: {
          addTitle: "Add Shipment", addSubtitle: "Add subtitle",
          editTitle: "Edit Shipment", editSubtitle: "Edit subtitle",
          cargoTitle: "Cargo",
          fields: { exceedsTrailerVolume: "Exceeds volume", exceedsTrailerWeight: "Exceeds weight" },
          steps: { cargo: "Cargo", logistics: "Logistics" },
        },
      },
      toasts: { errorGeneric: "Error", loading: "Loading", successAdd: "Added", successUpdate: "Updated" },
      validation: {
        genericFormError: "Form error",
        required: "{field} is required",
        min: "{field} must be at least {min}",
        max: "{field} must be at most {max}",
        email: "Invalid email",
        positive: "{field} must be positive",
        oneOf: "{field} must be one of the allowed values",
        endTimeAfterStart: "End time must be after start time",
      },
    };
const stableUserResult = { user: { id: "user-1", companyId: "comp-1", currency: "USD" } };

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: () => stableDict,
  },
});

mock.module("../../../../hooks/useUser.ts", {
  namedExports: { useUser: () => stableUserResult },
});

mock.module("../../../../lib/controllers/routes.ts", {
  namedExports: {
    createRoute: mock.fn(async () => ({})),
    updateRoute: mock.fn(async () => ({})),
    deleteRoute: mock.fn(async () => ({})),
    updateRouteStatus: mock.fn(async () => ({})),
    getRouteStats: mock.fn(async () => null),
    getRouteEfficiencyStats: mock.fn(async () => null),
    getActiveRoutesLocations: mock.fn(async () => []),
  },
});

mock.module("../../../../lib/controllers/shipments.ts", {
  namedExports: { getShipments: mock.fn(async () => []) },
});

mock.module("../../../../lib/controllers/warehouse.ts", {
  namedExports: { getWarehouses: mock.fn(async () => []) },
});

mock.module("sonner", {
  namedExports: {
    toast: {
      success: mock.fn(),
      error: mock.fn(),
      loading: mock.fn(),
      dismiss: mock.fn(),
      info: mock.fn(),
      promise: mock.fn(async (promise) => await promise),
    },
  },
});

const addRouteQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => addRouteQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("./firstStep.tsx", {
  defaultExport: () => <div data-testid="first-step">First Step</div>,
});
mock.module("./secondStep.tsx", {
  defaultExport: () => <div data-testid="second-step">Second Step</div>,
});
mock.module("./thirdStep.tsx", {
  defaultExport: () => <div data-testid="third-step">Third Step</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

(customTheme.palette.primary as unknown)._alpha = { main_20: "rgba()" };
(customTheme.palette as unknown).divider_alpha = { main_05: "rgba()", main_10: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AddRouteDialog RTL Component", () => {
  let AddRouteDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddRouteDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddRouteDialog() bileşeni", () => {
    it("should_RenderAddRouteWizard_AtFirstStep", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AddRouteDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Add Route/i)).toBeTruthy();
      
      // First step component should be rendered
      expect(screen.getByTestId("first-step")).toBeTruthy();
    });
  });
});

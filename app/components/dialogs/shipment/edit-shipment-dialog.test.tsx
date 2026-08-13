 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    next: "Next",
    save: "Save",
    back: "Back",
  },
  shipments: {
    dialogs: {
      editTitle: "Edit Shipment",
      editSubtitle: "Editing shipment",
      steps: {
        logistics: "Logistics",
        cargo: "Cargo",
      },
      fields: {
        exceedsTrailerWeight: "Exceeds weight",
        exceedsTrailerVolume: "Exceeds volume",
      },
    },
  },
  toasts: {
    loading: "Loading",
    successUpdate: "Update Success",
    errorGeneric: "Error",
  },
  validation: {
    genericFormError: "Form Error",
  },
}));

const useUserMock = mock.fn(() => ({
  user: { id: "u1", currency: "USD" },
}));



// 4. Mock Sub-Sections
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

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: () => stableDict,
  },
});

mock.module("../../../hooks/useUser.ts", {
  namedExports: { useUser: () => stableUserResult },
});

mock.module("../../../lib/controllers/shipments.ts", {
  namedExports: {
    getShipmentById: mock.fn(async () => null),
    getShipmentStats: mock.fn(async () => null),
    getShipmentVolumeHistory: mock.fn(async () => []),
    getShipmentStatusDistribution: mock.fn(async () => []),
    createShipment: mock.fn(async () => ({})),
    updateShipment: mock.fn(async () => ({})),
    deleteShipment: mock.fn(async () => ({})),
    updateShipmentStatus: mock.fn(async () => ({})),
  },
});
mock.module("../../../lib/controllers/warehouse.ts", {
  namedExports: { getWarehouses: mock.fn(async () => []) },
});
mock.module("../../../lib/controllers/customer.ts", {
  namedExports: { getCustomers: mock.fn(async () => []) },
});
mock.module("../../../lib/controllers/inventory.ts", {
  namedExports: { getInventory: mock.fn(async () => []) },
});
mock.module("../../../lib/controllers/trailer.ts", {
  namedExports: { getTrailers: mock.fn(async () => ({ trailers: [] })) },
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

const editShipmentQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => editShipmentQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("./addShipmentDialog/sections/BasicInfoSection.tsx", { defaultExport: () => <div data-testid="basic-info-section" /> });
mock.module("./addShipmentDialog/sections/LogisticsSection.tsx", { defaultExport: () => <div data-testid="logistics-section" /> });
mock.module("./addShipmentDialog/sections/CargoSection.tsx", { defaultExport: () => <div data-testid="cargo-section" /> });
mock.module("./addShipmentDialog/sections/InventorySection.tsx", { defaultExport: () => <div data-testid="inventory-section" /> });
mock.module("./addShipmentDialog/sections/StopsSection.tsx", { defaultExport: () => <div data-testid="stops-section" /> });

// 5. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    divider_alpha: { main_05: "rgba()" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_30: "rgba()", main_40: "rgba()", main_02: "rgba()", main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" };
(customTheme.palette.warning as unknown)._alpha = { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("EditShipmentDialog RTL Component", () => {
  let EditShipmentDialog: unknown;

  before(async () => {
    const mod = await import("./edit-shipment-dialog");
    EditShipmentDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("EditShipmentDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Arrange
      const mockShipment = {
        id: "s1",
        trackingId: "TRK-123",
        status: "PENDING",
        priority: "MEDIUM",
        origin: "Warehouse A",
        destination: "Customer B",
        itemsCount: 10,
        weightKg: 500,
        volumeM3: 5,
        palletCount: 1,
        cargoType: "General Cargo",
        type: "Standard Freight",
        items: [],
        stops: []
      };

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditShipmentDialog open={true} onClose={() => {}} onSuccess={() => {}} shipment={mockShipment} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Edit Shipment/i)).toBeTruthy();
      expect(screen.getByText(/TRK-123/i)).toBeTruthy();
      expect(screen.getByText(/Logistics/i)).toBeTruthy();
      expect(screen.getByText(/Cargo/i)).toBeTruthy();
      
      // Step 1 Sub-components
      expect(screen.getByTestId("basic-info-section")).toBeTruthy();
      expect(screen.getByTestId("logistics-section")).toBeTruthy();
      expect(screen.getByTestId("stops-section")).toBeTruthy();
      
      expect(screen.getByText(/Next/i)).toBeTruthy();
    });
  });
});

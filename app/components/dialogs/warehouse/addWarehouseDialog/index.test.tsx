 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    mode: "light",
    background: { paper: "white" },
    primary: { main: "blue", _alpha: { main_20: "" } },
    text: { primary: "black", secondary: "gray" },
    action: { hover: "gray" },
    divider_alpha: { main_05: "" }
  }
}));

const useDictionaryMock = mock.fn(() => ({
  common: { step: "Step", next: "Next", back: "Back", cancel: "Cancel" },
  warehouses: {
    dialogs: {
      addTitle: "Add Warehouse",
      locationTitle: "Location",
      capacityTitle: "Capacity",
      createButton: "Create",
      steps: { basicInfo: "Basic", location: "Location", capacity: "Capacity" }
    }
  },
  toasts: { loading: "Loading", successAdd: "Added", errorGeneric: "Error" }
}));

const useUserMock = mock.fn(() => ({
  user: { companyId: "comp-123" }
}));

const createWarehouseMock = mock.fn();

// This test invokes the component as a plain function, so the react hooks it
// calls need stubs (there is no render dispatcher), and its theme/user/
// dictionary/controller dependencies must be mocked here to be self-sufficient.
import * as originalReact from "react";
const useStateMock = mock.fn((init: unknown) => [
  typeof init === "function" ? (init as () => unknown)() : init,
  mock.fn(),
]);
mock.module("react", {
  namedExports: { ...originalReact, useState: useStateMock },
});
import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: { ...originalMui, useTheme: useThemeMock },
});
mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});
mock.module("../../../../hooks/useUser.ts", {
  namedExports: { useUser: useUserMock },
});
mock.module("../../../../lib/controllers/warehouse.ts", {
  namedExports: {
    createWarehouse: createWarehouseMock,
    updateWarehouse: mock.fn(async () => ({})),
    deleteWarehouse: mock.fn(async () => ({})),
    assignManagerToWarehouse: mock.fn(async () => ({})),
    getWarehouseById: mock.fn(async () => null),
    getWarehouseStats: mock.fn(async () => null),
    getRecentStockMovements: mock.fn(async () => []),
  },
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

const warehouseQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => warehouseQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

describe("AddWarehouseDialog Component", () => {
  let AddWarehouseDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddWarehouseDialog = mod.default;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    useDictionaryMock.mock.resetCalls();
    useUserMock.mock.resetCalls();
    createWarehouseMock.mock.resetCalls();
  });

  describe("AddWarehouseDialog() bileşeni", () => {
    it("should_ReturnDialogElement_WhenRendered", async () => {
      // Act
      const element = AddWarehouseDialog({ open: true, onClose: () => {}, onSuccess: () => {} });
      
      // Assert
      expect(element).toBeDefined();
    });
  });
});

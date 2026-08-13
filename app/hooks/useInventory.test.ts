 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const queryClientMock = {
  invalidateQueries: mock.fn(),
};

const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: null })),
  useMutation: mock.fn((options: Record<string, unknown>) => ({
    mutateAsync: async (variables: Record<string, unknown>) => {
      try {
        const res = await options.mutationFn(variables);
        options.onSuccess?.(res);
        return res;
      } catch (e) {
        options.onError?.(e);
        throw e;
      }
    },
  })),
  useQueryClient: mock.fn(() => queryClientMock),
  keepPreviousData: "keepPreviousData",
};

const sonnerMock = {
  toast: {
    success: mock.fn(),
    error: mock.fn(),
  },
};

const inventoryControllerMock = {
  getInventory: mock.fn(),
  getInventoryItemById: mock.fn(),
  getLowStockItems: mock.fn(),
  getInventoryMovements: mock.fn(),
  createInventoryItem: mock.fn(),
  updateInventoryItem: mock.fn(),
  deleteInventoryItem: mock.fn(),
  logWarehouseFulfillment: mock.fn(),
  adjustInventoryStock: mock.fn(),
};


const dictContextMock = {
  useDictionary: mock.fn(() => ({
    toasts: {
      successAdd: "Added",
      successUpdate: "Updated",
      successDelete: "Deleted",
      errorGeneric: "Error",
    },
  })),
};
mock.module("../lib/language/DictionaryContext.tsx", { namedExports: dictContextMock });

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });
mock.module("sonner", { namedExports: sonnerMock });
mock.module("../lib/controllers/inventory.ts", { namedExports: inventoryControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useInventory Hook", () => {
  let useInventoryMod: unknown;

  before(async () => {
    useInventoryMod = await import("./useInventory");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    inventoryControllerMock.createInventoryItem.mock.resetCalls();
    inventoryControllerMock.adjustInventoryStock.mock.resetCalls();
  });

  describe("useInventory()", () => {
    it("should_CallUseQueryForInventory", () => {
      useInventoryMod.useInventory("wh-1");
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useInventoryMutations()", () => {
    it("should_ProcessCreateItemAndShowToast", async () => {
      inventoryControllerMock.createInventoryItem.mock.mockImplementation(async () => true);
      
      const { createItem } = useInventoryMod.useInventoryMutations();
      await createItem.mutateAsync({ sku: "TEST-SKU" });

      expect(inventoryControllerMock.createInventoryItem.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });

    it("should_ProcessAdjustStockAndShowToast", async () => {
      inventoryControllerMock.adjustInventoryStock.mock.mockImplementation(async () => true);
      
      const { adjustStock } = useInventoryMod.useInventoryMutations();
      await adjustStock.mutateAsync({ id: "item-1", delta: 10 });

      expect(inventoryControllerMock.adjustInventoryStock.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
  });
});

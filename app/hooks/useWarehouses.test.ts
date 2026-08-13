 
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

const warehouseControllerMock = {
  getWarehouseById: mock.fn(),
  getWarehouseStats: mock.fn(),
  getRecentStockMovements: mock.fn(),
  createWarehouse: mock.fn(),
  updateWarehouse: mock.fn(),
  deleteWarehouse: mock.fn(),
  assignManagerToWarehouse: mock.fn(),
  getWarehouseZones: mock.fn(),
  createWarehouseZone: mock.fn(),
  updateWarehouseZone: mock.fn(),
  deleteWarehouseZone: mock.fn(),
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
mock.module("../lib/controllers/warehouse.ts", { namedExports: warehouseControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useWarehouses Hook", () => {
  let useWarehousesMod: unknown;

  before(async () => {
    useWarehousesMod = await import("./useWarehouses");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    warehouseControllerMock.createWarehouse.mock.resetCalls();
  });

  describe("useWarehouses()", () => {
    it("should_CallUseQueryToFetchList", () => {
      useWarehousesMod.useWarehouses();
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useWarehouseMutations()", () => {
    it("should_ProcessCreateWarehouseAndShowToast", async () => {
      warehouseControllerMock.createWarehouse.mock.mockImplementation(async () => true);
      
      const { createWarehouse } = useWarehousesMod.useWarehouseMutations();
      await createWarehouse.mutateAsync({ name: "WH-1", code: "W1" });

      expect(warehouseControllerMock.createWarehouse.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
  });
});

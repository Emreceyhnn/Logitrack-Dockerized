 
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

const shipmentsControllerMock = {
  getShipmentById: mock.fn(),
  getShipmentStats: mock.fn(),
  getShipmentVolumeHistory: mock.fn(),
  getShipmentStatusDistribution: mock.fn(),
  createShipment: mock.fn(),
  updateShipment: mock.fn(),
  deleteShipment: mock.fn(),
  updateShipmentStatus: mock.fn(),
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

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });
mock.module("sonner", { namedExports: sonnerMock });
mock.module("../lib/controllers/shipments.ts", { namedExports: shipmentsControllerMock });
mock.module("../lib/language/DictionaryContext.tsx", { namedExports: dictContextMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useShipments Hook", () => {
  let useShipmentsMod: unknown;

  before(async () => {
    useShipmentsMod = await import("./useShipments");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    shipmentsControllerMock.createShipment.mock.resetCalls();
    shipmentsControllerMock.deleteShipment.mock.resetCalls();
  });

  describe("useShipments()", () => {
    it("should_CallUseQueryWithFilters", () => {
      useShipmentsMod.useShipments({ page: 1, limit: 10 });
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useShipmentMutations()", () => {
    it("should_ProcessCreateShipmentAndShowToastFromDict", async () => {
      shipmentsControllerMock.createShipment.mock.mockImplementation(async () => true);

      const { createShipment } = useShipmentsMod.useShipmentMutations();
      await createShipment.mutateAsync({ customerId: "c-1", origin: "O", destination: "D", status: "PENDING" });

      expect(shipmentsControllerMock.createShipment.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls[0].arguments[0]).toBe("Added");
    });

    it("should_ForwardWarehouseAndAssignmentFields_ToCreateShipmentController", async () => {
      // Regression guard: these fields were previously dropped by the
      // mutationFn on their way to the server action, so a warehouse/trailer/
      // driver picked in the dialog silently never reached createShipment —
      // no stock allocation, no warehouse task, and (once
      // requireOriginWarehouseWithInventory was added) an unexplained
      // "Origin warehouse is required" rejection despite the user having
      // selected one.
      shipmentsControllerMock.createShipment.mock.mockImplementation(async () => true);

      const { createShipment } = useShipmentsMod.useShipmentMutations();
      await createShipment.mutateAsync({
        customerId: "c-1",
        origin: "O",
        destination: "D",
        status: "PENDING",
        originWarehouseId: "wh-1",
        referenceNumber: "REF-1",
        trailerId: "trailer-1",
        driverId: "driver-1",
        stops: [{ address: "A", lat: 1, lng: 2, sequence: 1 }],
      });

      const forwarded = shipmentsControllerMock.createShipment.mock.calls[0].arguments[0];
      expect(forwarded.originWarehouseId).toBe("wh-1");
      expect(forwarded.referenceNumber).toBe("REF-1");
      expect(forwarded.trailerId).toBe("trailer-1");
      expect(forwarded.driverId).toBe("driver-1");
      expect(forwarded.stops).toEqual([{ address: "A", lat: 1, lng: 2, sequence: 1 }]);
    });
  });
});

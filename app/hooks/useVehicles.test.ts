 
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

const vehicleControllerMock = {
  createVehicle: mock.fn(),
  updateVehicle: mock.fn(),
  deleteVehicle: mock.fn(),
  updateVehicleStatus: mock.fn(),
  assignDriverToVehicle: mock.fn(),
  unassignDriverFromVehicle: mock.fn(),
  uploadVehicleDocument: mock.fn(),
  addMaintenanceRecord: mock.fn(),
  createVehicleIssue: mock.fn(),
};

const fuelControllerMock = {
  createFuelLog: mock.fn(),
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
mock.module("../lib/controllers/vehicle.ts", { namedExports: vehicleControllerMock });
mock.module("../lib/controllers/fuel.ts", { namedExports: fuelControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useVehicles Hook", () => {
  let useVehiclesMod: unknown;

  before(async () => {
    useVehiclesMod = await import("./useVehicles");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    vehicleControllerMock.createVehicle.mock.resetCalls();
    vehicleControllerMock.deleteVehicle.mock.resetCalls();
  });

  describe("useVehicles()", () => {
    it("should_CallUseQueryWithFilters", () => {
      useVehiclesMod.useVehicles({ page: 1, limit: 10 });
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useVehicleMutations()", () => {
    it("should_ProcessCreateVehicleAndShowToast", async () => {
      vehicleControllerMock.createVehicle.mock.mockImplementation(async () => true);
      
      const { createVehicle } = useVehiclesMod.useVehicleMutations();
      await createVehicle.mutateAsync({ plate: "34 ABC" });

      expect(vehicleControllerMock.createVehicle.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
  });
});

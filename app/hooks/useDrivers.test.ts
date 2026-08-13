 
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

const driverControllerMock = {
  createDriver: mock.fn(),
  updateDriver: mock.fn(),
  deleteDriver: mock.fn(),
  updateDriverStatus: mock.fn(),
  assignVehicleToDriver: mock.fn(),
  unassignVehicleFromDriver: mock.fn(),
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
mock.module("../lib/controllers/driver.ts", { namedExports: driverControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useDrivers Hook", () => {
  let useDriversMod: unknown;

  before(async () => {
    useDriversMod = await import("./useDrivers");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    driverControllerMock.createDriver.mock.resetCalls();
    driverControllerMock.deleteDriver.mock.resetCalls();
    driverControllerMock.updateDriverStatus.mock.resetCalls();
  });

  describe("useDrivers()", () => {
    it("should_CallUseQueryWithFilterParams", () => {
      useDriversMod.useDrivers(1, 10, "search", ["AVAILABLE"]);
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useDriverMutations()", () => {
    it("should_ProcessUpdateDriverStatusAndShowToast", async () => {
      driverControllerMock.updateDriverStatus.mock.mockImplementation(async () => true);
      
      const { updateDriverStatus } = useDriversMod.useDriverMutations();
      await updateDriverStatus.mutateAsync({ id: "d-1", status: "ON_JOB" });

      expect(driverControllerMock.updateDriverStatus.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
    
    it("should_ProcessDeleteDriverAndShowToast", async () => {
      driverControllerMock.deleteDriver.mock.mockImplementation(async () => true);
      
      const { deleteDriver } = useDriversMod.useDriverMutations();
      await deleteDriver.mutateAsync("d-1");

      expect(driverControllerMock.deleteDriver.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
  });
});

 
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

const customerControllerMock = {
  createCustomer: mock.fn(),
  updateCustomer: mock.fn(),
  deleteCustomer: mock.fn(),
};

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });
mock.module("sonner", { namedExports: sonnerMock });
mock.module("../lib/controllers/customer.ts", { namedExports: customerControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useCustomers Hook", () => {
  let useCustomersMod: unknown;

  before(async () => {
    useCustomersMod = await import("./useCustomers");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    customerControllerMock.deleteCustomer.mock.resetCalls();
  });

  describe("useCustomers()", () => {
    it("should_CallUseQueryForCustomerList", () => {
      useCustomersMod.useCustomers();
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useCustomerMutations()", () => {
    it("should_ProcessDeleteCustomerAndShowToast", async () => {
      customerControllerMock.deleteCustomer.mock.mockImplementation(async () => true);
      
      const { deleteCustomer } = useCustomersMod.useCustomerMutations();
      await deleteCustomer.mutateAsync("cust-1");

      expect(customerControllerMock.deleteCustomer.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
    });
  });
});

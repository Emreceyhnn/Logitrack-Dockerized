 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const queryClientMock = {
  invalidateQueries: mock.fn(),
};

const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: null })),
  useMutation: mock.fn((options: Record<string, unknown>) => {
    return {
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
    };
  }),
  useQueryClient: mock.fn(() => queryClientMock),
  keepPreviousData: "keepPreviousData",
};

const sonnerMock = {
  toast: {
    success: mock.fn(),
    error: mock.fn(),
  },
};

const companyControllerMock = {
  getCompanyProfile: mock.fn(),
  addCompanyUser: mock.fn(),
  updateCompanyMember: mock.fn(),
  removeCompanyUser: mock.fn(),
};

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });
mock.module("sonner", { namedExports: sonnerMock });
mock.module("../lib/controllers/company.ts", { namedExports: companyControllerMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useCompany Hook", () => {
  let useCompanyMod: unknown;

  before(async () => {
    useCompanyMod = await import("./useCompany");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useMutation.mock.resetCalls();
    sonnerMock.toast.success.mock.resetCalls();
    sonnerMock.toast.error.mock.resetCalls();
    globalFetchMock.mock.resetCalls();
    companyControllerMock.removeCompanyUser.mock.resetCalls();
  });

  describe("useCompanyWithDashboard()", () => {
    it("should_CallUseQueryWithCorrectParams", () => {
      useCompanyMod.useCompanyWithDashboard({ page: 1, pageSize: 10 });
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });
  });

  describe("useCompanyMutations()", () => {
    it("should_ReturnMutationObjectAndHandleSuccess", async () => {
      companyControllerMock.removeCompanyUser.mock.mockImplementation(async () => true);
      
      const { deleteMember } = useCompanyMod.useCompanyMutations();
      await deleteMember.mutateAsync("member-1");

      expect(companyControllerMock.removeCompanyUser.mock.calls.length).toBe(1);
      expect(sonnerMock.toast.success.mock.calls.length).toBe(1);
      expect(queryClientMock.invalidateQueries.mock.calls.length).toBe(1);
    });
  });
});

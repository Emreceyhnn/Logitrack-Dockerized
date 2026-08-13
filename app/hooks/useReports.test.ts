 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useCallback: mock.fn((cb) => cb),
};

const queryClientMock = {
  invalidateQueries: mock.fn(),
};

const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: null, isLoading: false, isFetching: false, error: null })),
  useQueryClient: mock.fn(() => queryClientMock),
};

mock.module("react", { namedExports: reactMock });
mock.module("@tanstack/react-query", { namedExports: reactQueryMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useReports Hook", () => {
  let useReportsMod: unknown;

  before(async () => {
    useReportsMod = await import("./useReports");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    globalFetchMock.mock.resetCalls();
  });

  it("should_CallUseQueryAndReturnStateAndActions", () => {
    const { state, actions } = useReportsMod.useReportsData();
    expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    expect(state.loading).toBe(false);
    expect(typeof actions.fetchReports).toBe("function");
  });
});

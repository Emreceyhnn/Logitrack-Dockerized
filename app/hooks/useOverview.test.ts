 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: { stats: { total: 100 } }, isLoading: false, isFetching: false, isError: false, refetch: mock.fn() })),
};

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });

const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useOverview Hook", () => {
  let useOverviewMod: unknown;

  before(async () => {
    useOverviewMod = await import("./useOverview");
  });

  beforeEach(() => {
    reactQueryMock.useQuery.mock.resetCalls();
    globalFetchMock.mock.resetCalls();
  });

  it("should_CallUseQueryAndReturnFormattedData", () => {
    const result = useOverviewMod.useOverviewData();
    expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    expect(result.data.stats).toEqual({ total: 100 });
    expect(result.isLoading).toBe(false);
  });
});

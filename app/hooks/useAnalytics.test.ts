 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useCallback: mock.fn((cb) => cb),
  useEffect: mock.fn(),
  useState: mock.fn((init) => [init, mock.fn()]),
  useMemo: mock.fn((cb) => cb()),
};

const queryClientMock = {
  invalidateQueries: mock.fn(async () => {}),
};

const reactQueryMock = {
  useQuery: mock.fn(() => ({ data: null, isLoading: false, isFetching: false, error: null })),
  useMutation: mock.fn(() => ({ mutateAsync: mock.fn(), isPending: false })),
  useQueryClient: mock.fn(() => queryClientMock),
};

// Modülleri Sisteme Enjekte Etme
mock.module("react", { namedExports: reactMock });
mock.module("@tanstack/react-query", { namedExports: reactQueryMock });

// Fetch'i global seviyede mocklama (eğer fetch doğrudan hook içinde çağrılırsa diye)
const globalFetchMock = mock.fn();
(globalThis as unknown).fetch = globalFetchMock;

// 2. TEST GRUPLARI
describe("useAnalytics Hook", () => {
  let useAnalyticsMod: unknown;

  before(async () => {
    useAnalyticsMod = await import("./useAnalytics");
  });

  beforeEach(() => {
    reactMock.useCallback.mock.resetCalls();
    reactQueryMock.useQuery.mock.resetCalls();
    reactQueryMock.useQueryClient.mock.resetCalls();
    queryClientMock.invalidateQueries.mock.resetCalls();
    globalFetchMock.mock.resetCalls();
  });

  describe("useAnalyticsData() metodu", () => {
    it("should_ReturnInitialState_WhenQueryIsLoading", () => {
      // Arrange
      reactQueryMock.useQuery.mock.mockImplementation(() => ({
        data: null,
        isLoading: true,
        isFetching: false,
        error: null,
      }));

      // Act
      const { state, actions } = useAnalyticsMod.useAnalyticsData();

      // Assert
      expect(state.loading).toBe(true);
      expect(state.data).toBeNull();
      expect(state.error).toBeNull();
      
      expect(reactQueryMock.useQuery.mock.calls.length).toBe(1);
    });

    it("should_ReturnData_WhenQuerySucceeds", () => {
      // Arrange
      const mockData = { performance: { onTimeRate: 95 } };
      reactQueryMock.useQuery.mock.mockImplementation(() => ({
        data: mockData,
        isLoading: false,
        isFetching: false,
        error: null,
      }));

      // Act
      const { state } = useAnalyticsMod.useAnalyticsData();

      // Assert
      expect(state.loading).toBe(false);
      expect(state.data).toBe(mockData);
    });

    it("should_CallInvalidateQueries_WhenFetchAnalyticsIsCalled", async () => {
      // Arrange
      reactQueryMock.useQuery.mock.mockImplementation(() => ({
        data: null,
        isLoading: false,
        isFetching: false,
        error: null,
      }));

      const { actions } = useAnalyticsMod.useAnalyticsData();

      // Act
      await actions.fetchAnalytics();

      // Assert
      expect(queryClientMock.invalidateQueries.mock.calls.length).toBe(1);
    });
  });
});

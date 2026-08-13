import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR

interface CapturedQueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  staleTime?: number;
  placeholderData?: unknown;
}

let capturedOptions: CapturedQueryOptions | null = null;

const queryClientMock = {
  cancelQueries: mock.fn(),
  invalidateQueries: mock.fn(),
  getQueryCache: mock.fn(() => ({ findAll: mock.fn(() => []) })),
  setQueryData: mock.fn(),
};

const reactQueryMock = {
  useQuery: mock.fn((options: CapturedQueryOptions) => {
    capturedOptions = options;
    return { data: undefined, isLoading: false };
  }),
  useMutation: mock.fn((options: Record<string, unknown>) => ({
    mutateAsync: async (variables: Record<string, unknown>) => {
      try {
        const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
        await (options.onMutate as ((v: unknown) => Promise<unknown>) | undefined)?.(variables);
        (options.onSuccess as ((r: unknown) => void) | undefined)?.(res);
        return res;
      } catch (e) {
        (options.onError as ((e: unknown, v: unknown, ctx: unknown) => void) | undefined)?.(e, variables, undefined);
        throw e;
      }
    },
  })),
  useQueryClient: mock.fn(() => queryClientMock),
};

mock.module("@tanstack/react-query", { namedExports: reactQueryMock });

const warehouseWorkerControllerMock = {
  logWarehouseMovement: mock.fn(),
  adjustWarehouseStock: mock.fn(),
  advanceWarehouseTask: mock.fn(),
  requestRestock: mock.fn(),
  reportWarehouseIssue: mock.fn(),
};
mock.module("../lib/controllers/warehouseWorker.ts", { namedExports: warehouseWorkerControllerMock });

const fetchMock = mock.fn();
(globalThis as { fetch: unknown }).fetch = fetchMock;

// 2. TEST GRUPLARI
describe("useWarehouseWorker Hook", () => {
   
  let hookMod: unknown;

  before(async () => {
    hookMod = await import("./useWarehouseWorker");
  });

  beforeEach(() => {
    capturedOptions = null;
    reactQueryMock.useQuery.mock.resetCalls();
    fetchMock.mock.resetCalls();
  });

  it("warehouseId ile doğru queryKey ve staleTime kullanır", () => {
    hookMod.useWarehouseWorker("wh-42");

    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions!.queryKey).toContain("wh-42");
    expect(capturedOptions!.staleTime).toBe(1000 * 30);
  });

  it("queryFn dashboard endpoint'ini credentials ile çağırır", async () => {
    fetchMock.mock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ kpis: { picks: 1 } }),
    }));

    hookMod.useWarehouseWorker("wh-42");
    const result = await capturedOptions!.queryFn();

    expect(result).toEqual({ kpis: { picks: 1 } });
    const [url, init] = fetchMock.mock.calls[0].arguments as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/warehouse-worker/dashboard?warehouseId=wh-42");
    expect(init.credentials).toBe("include");
  });

  it("warehouseId verilmezse query string eklemez", async () => {
    fetchMock.mock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({}),
    }));

    hookMod.useWarehouseWorker();
    await capturedOptions!.queryFn();

    const [url] = fetchMock.mock.calls[0].arguments as [string];
    expect(url).toBe("/api/warehouse-worker/dashboard");
  });

  it("HTTP hatasında status kodunu içeren hata fırlatır", async () => {
    fetchMock.mock.mockImplementationOnce(async () => ({
      ok: false,
      status: 403,
    }));

    hookMod.useWarehouseWorker("wh-42");
    await expect(capturedOptions!.queryFn()).rejects.toThrow("403");
  });
});

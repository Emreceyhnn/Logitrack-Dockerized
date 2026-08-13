 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const routerMock = {
  replace: mock.fn(),
  push: mock.fn(),
};

const searchParamsMock = {
  get: mock.fn((key: string) => {
    if (key === "page") return "2";
    if (key === "pageSize") return "20";
    if (key === "search") return "test";
    return null;
  }),
  toString: mock.fn(() => "page=2&pageSize=20&search=test"),
};

const nextNavigationMock = {
  usePathname: mock.fn(() => "/dashboard"),
  useRouter: mock.fn(() => routerMock),
  useSearchParams: mock.fn(() => searchParamsMock),
};

const reactMock = {
  useCallback: mock.fn((cb) => cb),
};

mock.module("next/navigation", { namedExports: nextNavigationMock });
mock.module("react", { namedExports: reactMock });

// 2. TEST GRUPLARI
describe("useTableParams Hook", () => {
  let useTableParamsMod: unknown;

  before(async () => {
    useTableParamsMod = await import("./useTableParams");
  });

  beforeEach(() => {
    nextNavigationMock.usePathname.mock.resetCalls();
    nextNavigationMock.useRouter.mock.resetCalls();
    nextNavigationMock.useSearchParams.mock.resetCalls();
    routerMock.replace.mock.resetCalls();
    routerMock.push.mock.resetCalls();
  });

  it("should_ParseInitialParamsFromURL", () => {
    // Act
    const params = useTableParamsMod.useTableParams();

    // Assert
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(20);
    expect(params.search).toBe("test");
    expect(params.sortOrder).toBe("asc");
  });

  it("should_UpdateURLParams_WhenSetPageIsCalled", () => {
    // Act
    const params = useTableParamsMod.useTableParams();
    params.setPage(3);

    // Assert
    expect(routerMock.replace.mock.calls.length).toBe(1);
    const newUrl = routerMock.replace.mock.calls[0].arguments[0];
    expect(newUrl).toContain("page=3");
  });
});

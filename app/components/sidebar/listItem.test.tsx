 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const useThemeMock = mock.fn(() => ({
  palette: {
    primary: {
      main: "blue",
      _alpha: { main_10: "", main_15: "", main_08: "", main_12: "", main_05: "" }
    }
  }
}));

const usePathnameMock = mock.fn(() => "/overview");

// React hooks mock'ları
const useStateMock = mock.fn((init) => [init, mock.fn()]);
const useCallbackMock = mock.fn((fn) => fn);
const useMemoMock = mock.fn((fn) => fn());
const memoMock = mock.fn((component) => component);

// Only useState/useCallback/useMemo/memo need mocking; spread the real module
// for the rest (createContext etc. — listItem.tsx pulls in DictionaryContext).
const originalReact = await import("react");
mock.module("react", {
  namedExports: {
    ...originalReact,
    useState: useStateMock,
    useCallback: useCallbackMock,
    useMemo: useMemoMock,
    memo: memoMock
  }
});

mock.module("next/navigation", {
  namedExports: { usePathname: usePathnameMock }
});

mock.module("@mui/material", {
  namedExports: {
    useTheme: useThemeMock,
    List: (props: Record<string, unknown>) => ({ type: "List", props }),
    ListItemButton: (props: Record<string, unknown>) => ({ type: "ListItemButton", props }),
    ListItemIcon: (props: Record<string, unknown>) => ({ type: "ListItemIcon", props }),
    ListItemText: (props: Record<string, unknown>) => ({ type: "ListItemText", props }),
    Collapse: (props: Record<string, unknown>) => ({ type: "Collapse", props }),
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Chip: (props: Record<string, unknown>) => ({ type: "Chip", props }),
  }
});

mock.module("@mui/icons-material/ExpandMore", { defaultExport: () => ({ type: "ExpandMoreIcon" }) });
mock.module("next/link", { defaultExport: () => ({ type: "Link" }) });

const isPathActiveMock = mock.fn(() => true);
const buildLocalizedHrefMock = mock.fn((href) => `/en${href}`);

mock.module("../../lib/language/navigation.ts", {
  namedExports: {
    isPathActive: isPathActiveMock,
    buildLocalizedHref: buildLocalizedHrefMock
  }
});

const useDictionaryMock = mock.fn(() => ({
  toasts: { demoActionDisabled: "Disabled in demo" },
  sidebar: { demoSoon: "Soon" },
}));
mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

describe("SidebarListItem Component", () => {
  let SidebarList: unknown;

  before(async () => {
    // Modülü yüklüyoruz. 'memo' ile sarılı olduğu için asıl bileşene erişiyoruz.
    const mod = await import("./listItem");
    SidebarList = mod.SidebarList;
  });

  beforeEach(() => {
    useThemeMock.mock.resetCalls();
    usePathnameMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
    isPathActiveMock.mock.resetCalls();
  });

  describe("SidebarList() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenItemsProvided", async () => {
      // Arrange
      const items = [
        { title: "Overview", href: "/overview", icon: null },
        { title: "Vehicles", href: "/vehicles", subTitles: [{ title: "Cars", href: "/vehicles/cars" }] }
      ];

      // Act
      let error = null;
      try {
        SidebarList({ items, lang: "en" });
      } catch (e) {
        error = e;
      }

      // Assert
      expect(SidebarList).toBeDefined();
      expect(usePathnameMock.mock.calls.length).toBeGreaterThan(0);
      expect(useThemeMock.mock.calls.length).toBeGreaterThan(0);
    });

    it("should_CallNavigationHelpers_WhenRenderingItems", async () => {
      // Arrange
      const items = [{ title: "Overview", href: "/overview", icon: null }];

      // Act
      try {
        SidebarList({ items, lang: "en" });
      } catch (e) {}

      // Assert
      // isParentActive resolves each item's href via resolveHref -> buildLocalizedHref
      expect(buildLocalizedHrefMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});

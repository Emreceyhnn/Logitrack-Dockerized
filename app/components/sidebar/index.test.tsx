
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. MOCK'LAR
const pushMock = mock.fn();
const useRouterMock = mock.fn(() => ({ push: pushMock }));
const useParamsMock = mock.fn(() => ({ lang: "en" }));
const usePathnameMock = mock.fn(() => "/en/overview");

const dictionary = {
  sidebar: {
    overview: "Overview", operation: "Operation", vehicles: "Vehicles",
    drivers: "Drivers", routes: "Routes", shipments: "Shipments",
    management: "Management", warehouses: "Warehouses", inventory: "Inventory",
    customers: "Customers", company: "Company", analytics: "Analytics",
    reports: "Reports", warehousePanel: "Warehouse Panel",
  },
  common: { logitrack: "LogiTrack", needHelp: "Need Help", logout: "Logout" },
};
const useDictionaryMock = mock.fn(() => dictionary);

mock.module("next/navigation", {
  namedExports: {
    useRouter: useRouterMock,
    useParams: useParamsMock,
    usePathname: usePathnameMock,
  },
});

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const buildLocalizedHrefMock = mock.fn((href: string) => `/en${href}`);
const getCanonicalPathMock = mock.fn(() => "/overview");
mock.module("../../lib/language/navigation.ts", {
  namedExports: {
    buildLocalizedHref: buildLocalizedHrefMock,
    getCanonicalPath: getCanonicalPathMock,
  },
});

const startTourMock = mock.fn();
mock.module("../../lib/context/GuidedTourContext.tsx", {
  namedExports: { useGuidedTour: () => ({ startTour: startTourMock }) },
});

mock.module("../guidedTour/tourSteps.ts", {
  namedExports: { getTourStepsForPage: mock.fn(() => []) },
});

const clearAuthCookiesMock = mock.fn(async () => {});
mock.module("../../lib/controllers/session.ts", {
  namedExports: { clearAuthCookies: clearAuthCookiesMock },
});

// Alt bileşenleri sığ tutuyoruz: SidebarList'e giden prop'ları yakalayıp
// navigasyon öğelerinin sözlükten doğru üretildiğini doğrulayacağız.
const sidebarListCalls: Array<Record<string, unknown>> = [];
mock.module("./listItem.tsx", {
  namedExports: {
    SidebarList: (props: Record<string, unknown>) => {
      sidebarListCalls.push(props);
      return <div data-testid="sidebar-list" />;
    },
  },
});
mock.module("../dialogs/logoutConfirmationDialog.tsx", {
  defaultExport: () => null,
});
mock.module("next/image", {
  defaultExport: (props: Record<string, unknown>) => <img alt="" data-testid="logo" src={String(props.src ?? "")} />,
});

// 2. TEMA — bileşenin kullandığı özel palet uzantılarıyla birlikte
const customTheme = createTheme({ palette: { mode: "light" } });
const mockAlpha = {
  main_03: "rgba(0,0,0,0.03)", main_05: "rgba(0,0,0,0.05)", main_08: "rgba(0,0,0,0.08)",
  main_10: "rgba(0,0,0,0.10)", main_20: "rgba(0,0,0,0.20)", main_25: "rgba(0,0,0,0.25)",
  main_30: "rgba(0,0,0,0.30)", main_40: "rgba(0,0,0,0.40)", main_50: "rgba(0,0,0,0.50)",
  main_60: "rgba(0,0,0,0.60)",
};
const palette = customTheme.palette as unknown as Record<string, unknown>;
(palette.background as Record<string, unknown>).sidebar = "#fff";
(palette.background as Record<string, unknown>).paper_alpha = mockAlpha;
palette.divider_alpha = mockAlpha;
(palette.error as Record<string, unknown>)._alpha = mockAlpha;
palette.icon = { secondary: "gray" };

describe("SideBar Component", () => {
  let SideBar: React.ComponentType<{ onMobileClose?: () => void }>;

  before(async () => {
    const mod = await import("./index");
    SideBar = mod.default;
  });

  afterEach(() => {
    cleanup();
    sidebarListCalls.length = 0;
  });

  describe("SideBar() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", () => {
      render(
        <ThemeProvider theme={customTheme}>
          <SideBar />
        </ThemeProvider>
      );

      expect(screen.getByText("LogiTrack")).toBeTruthy();
      expect(screen.getByTestId("sidebar-list")).toBeTruthy();
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
      expect(useRouterMock.mock.calls.length).toBeGreaterThan(0);
    });

    it("should_PrepareNavigationItems_BasedOnDictionary", () => {
      render(
        <ThemeProvider theme={customTheme}>
          <SideBar onMobileClose={mock.fn()} />
        </ThemeProvider>
      );

      // Sözlükteki başlıklar SidebarList'e items prop'u olarak gitmeli
      expect(sidebarListCalls.length).toBeGreaterThan(0);
      const items = sidebarListCalls[0].items as Array<{ title: string }>;
      const titles = items.map((i) => i.title);
      expect(titles).toContain("Overview");
      expect(titles).toContain("Operation");
      expect(titles).toContain("Management");
      expect(titles).toContain("Analytics");
      expect(sidebarListCalls[0].lang).toBe("en");
    });
  });
});

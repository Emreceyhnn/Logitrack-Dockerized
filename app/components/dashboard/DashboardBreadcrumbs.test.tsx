 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  sidebar: {
    overview: "Overview",
    warehouses: "Warehouses",
  },
  common: {
    tooltips: {
      details: "Details",
    }
  }
}));

mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const usePathnameMock = mock.fn(() => "/en/warehouses");
mock.module("next/navigation", {
  namedExports: { 
    usePathname: usePathnameMock
  },
});

mock.module("../../lib/language/navigation.ts", {
  namedExports: {
    routeTranslations: {
      en: {
        warehouses: "warehouses"
      }
    },
    isDemoPathname: (p: string) => p?.split("/").filter(Boolean)[1] === "demo",
    buildDashboardHomeHref: (p: string, lang: string) =>
      p?.split("/").filter(Boolean)[1] === "demo"
        ? `/${lang}/demo/overview`
        : `/${lang}/overview`,
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("DashboardBreadcrumbs RTL Component", () => {
  let DashboardBreadcrumbs: unknown;

  before(async () => {
    const mod = await import("./DashboardBreadcrumbs");
    DashboardBreadcrumbs = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DashboardBreadcrumbs() bileşeni", () => {
    it("should_RenderBreadcrumbs_BasedOnPathname", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <DashboardBreadcrumbs />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Warehouses")).toBeTruthy();
    });

    it("should_SkipOverview_WhenFirstSegmentIsOverview", async () => {
      // Change mock
      usePathnameMock.mock.mockImplementation(() => "/en/overview");

      render(
        <ThemeProvider theme={customTheme}>
          <DashboardBreadcrumbs />
        </ThemeProvider>
      );

      // It should NOT render "Overview" because we skip redundant Overview if index === 0
      const overviewEls = screen.queryAllByText("Overview");
      expect(overviewEls.length).toBe(0);
    });

    // Regression: the home crumb used to hardcode /{lang}/overview, a
    // PROTECTED_ROUTE. Anonymous demo visitors clicking it got bounced to the
    // sign-in page by the proxy auth gate.
    it("should_LinkHomeToDemoOverview_WhenOnDemoPath", async () => {
      usePathnameMock.mock.mockImplementation(() => "/en/demo/warehouses");

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <DashboardBreadcrumbs />
        </ThemeProvider>
      );

      const homeLink = container.querySelector("a");
      expect(homeLink?.getAttribute("href")).toBe("/en/demo/overview");
    });

    // The "demo" path segment is a routing detail, not a navigable page.
    it("should_NotRenderDemoSegmentAsCrumb_WhenOnDemoPath", async () => {
      usePathnameMock.mock.mockImplementation(() => "/en/demo/warehouses");

      render(
        <ThemeProvider theme={customTheme}>
          <DashboardBreadcrumbs />
        </ThemeProvider>
      );

      expect(screen.queryAllByText("Demo").length).toBe(0);
      expect(screen.getByText("Warehouses")).toBeTruthy();
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  landing: {
    featuresPage: {
      badge: "Features",
      heroTitle: "Hero Title",
      heroSubtitle: "Hero Subtitle",
      items: {
        routeOptimization: { title: "Route", description: "Route Desc", tag: "AI", details: ["Det1"] },
        warehouse: { title: "Warehouse", description: "Warehouse Desc", tag: "WMS", details: ["Det2"] },
        telemetry: { title: "Telemetry", description: "Tel Desc", tag: "IoT", details: ["Det3"] },
        alerts: { title: "Alerts", description: "Alert Desc", tag: "Real-time", details: ["Det4"] },
        compliance: { title: "Compliance", description: "Comp Desc", tag: "Legal", details: ["Det5"] },
        api: { title: "API", description: "API Desc", tag: "Dev", details: ["Det6"] }
      },
      infrastructure: {
        overline: "Infra",
        title: "Infra Title",
        description: "Infra Desc",
        stats: ["99.9%"]
      },
      footer: { copyright: "© {year}", builtFor: "Built" }
    }
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    kpi: {
      cyan_alpha: { main_05: "#000", main_10: "#000", main_15: "#000", main_20: "#000", main_30: "#000", main_40: "#000", main_80: "#000" },
      slateLight_alpha: { main_05: "#000", main_10: "#000", main_40: "#000", main_60: "#000", main_70: "#000", main_80: "#000" },
      slateDeep_alpha: { main_40: "#000" },
      slateDeepest_alpha: { main_50: "#000" }
    },
    common: { black_alpha: { main_50: "#000" } }
  } as unknown
});
import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("FeaturesPage Component", () => {
  let FeaturesPage: unknown;

  before(async () => {
    const mod = await import("./page");
    FeaturesPage = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("FeaturesPage() Render Testleri", () => {
    it("should_RenderFeaturesContent_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <FeaturesPage />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText("Route")).toBeTruthy();
      expect(screen.getByText("Warehouse")).toBeTruthy();
      expect(screen.getByText("Infra Title")).toBeTruthy();
    });
  });
});

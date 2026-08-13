 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  landing: {
    aboutPage: {
      mission: { badge: "Mission", title: "Our Mission", subtitle: "Mission Subtitle" },
      vision: { overline: "Vision", title: "Our Vision", description: "Vision Desc" },
      pillars: { 
        title: "Pillars", 
        items: {
          resilience: { title: "Resilience", description: "Res Desc" },
          transparency: { title: "Transparency", description: "Trans Desc" },
          efficiency: { title: "Efficiency", description: "Eff Desc" }
        }
      },
      why: { title: "Why Us", subtitle: "Why Subtitle" },
      footer: { copyright: "© {year}" }
    }
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// Mock next/image
mock.module("next/image", {
  defaultExport: (props: Record<string, unknown>) => <img {...props} data-testid="next-image" />,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    kpi: {
      cyan_alpha: { main_10: "#000", main_20: "#000", main_30: "#000" },
      slateLight_alpha: { main_05: "#000", main_10: "#000", main_40: "#000", main_70: "#000", main_80: "#000", main_90: "#000" },
      slateDark_alpha: { main_40: "#000", main_60: "#000" },
      slateDeepest_alpha: { main_50: "#000" }
    },
    common: { black_alpha: { main_40: "#000" } }
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

describe("AboutPage Component", () => {
  let AboutPage: unknown;

  before(async () => {
    const mod = await import("./page");
    AboutPage = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AboutPage() Render Testleri", () => {
    it("should_RenderAboutContent_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AboutPage />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText("Our Mission")).toBeTruthy();
      expect(screen.getByText("Our Vision")).toBeTruthy();
      expect(screen.getByText("Pillars")).toBeTruthy();
      expect(screen.getByTestId("next-image")).toBeTruthy();
    });
  });
});

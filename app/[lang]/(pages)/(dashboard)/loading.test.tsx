 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
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

describe("DashboardLoading Component", () => {
  let DashboardLoading: unknown;

  before(async () => {
    const mod = await import("./loading");
    DashboardLoading = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DashboardLoading() Render Testleri", () => {
    it("should_RenderSkeletons_Correctly", async () => {
      // Act
      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <DashboardLoading />
        </ThemeProvider>
      );

      // The loading state renders lightweight CSS-animated placeholder divs
      // (animation: pulse ...) rather than MUI <Skeleton> — keeps this
      // Server-Component fallback client-JS-free.
      const skeletons = container.querySelectorAll('div[style*="pulse"]');
      expect(skeletons.length).toBeGreaterThan(10);
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  common: {
    logitrack: "LogiTrack"
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// Mock next/image
mock.module("next/image", {
  defaultExport: (props: Record<string, unknown>) => <img {...props} data-testid="next-image" />,
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

describe("AuthLayout Component", () => {
  let AuthLayout: unknown;

  before(async () => {
    const mod = await import("./layout");
    AuthLayout = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AuthLayout() Render Testleri", () => {
    it("should_RenderAuthLayout_WithChildren", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AuthLayout>
            <div data-testid="child-content">Auth Form</div>
          </AuthLayout>
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("child-content")).toBeTruthy();
      
      // Should show logo/brand
      const logos = screen.getAllByText("LogiTrack");
      expect(logos.length).toBeGreaterThan(0);
    });
  });
});

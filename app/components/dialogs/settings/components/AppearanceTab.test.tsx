 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  settings: {
    dialogs: {
      appearance: {
        modes: {
          polar: "Light Mode",
          polarDesc: "Bright theme",
          nebula: "Dark Mode",
          nebulaDesc: "Dark theme",
          adaptive: "System Mode",
          adaptiveDesc: "Follow OS",
        },
      },
    },
  },
}));

const setModeMock = mock.fn();
const useThemeModeMock = mock.fn(() => ({
  mode: "dark",
  setMode: setModeMock,
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/theme/themeContext.ts", {
  namedExports: { useThemeMode: useThemeModeMock },
});

mock.module("framer-motion", {
  namedExports: {
    motion: {
      div: ({ children, onClick  }: Record<string, unknown>) => <div data-testid="motion-div" onClick={onClick}>{children}</div>,
    },
    AnimatePresence: ({ children  }: Record<string, unknown>) => <>{children}</>,
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976d2" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_04: "rgba()", main_08: "rgba()", main_10: "rgba()", main_20: "rgba()", main_50: "rgba()" };
(customTheme.palette.common as unknown) = { white_alpha: { main_02: "rgba()", main_05: "rgba()", main_20: "rgba()", main_60: "rgba()", main_70: "rgba()" }, black_alpha: { main_50: "rgba()" } };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AppearanceTab RTL Component", () => {
  let AppearanceTab: unknown;

  before(async () => {
    const mod = await import("./AppearanceTab");
    AppearanceTab = mod.default;
  });

  afterEach(() => {
    cleanup();
    setModeMock.mock.resetCalls();
  });

  const mockState = {
    appearance: { mode: "dark" }
  };
  
  const mockActions = {
    updateAppearance: mock.fn(),
  };

  describe("AppearanceTab() bileşeni", () => {
    it("should_RenderAppearanceOptions_AndReflectCurrentState", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AppearanceTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/Light Mode/i)).toBeTruthy();
      expect(screen.getByText(/Dark Mode/i)).toBeTruthy();
      expect(screen.getByText(/System Mode/i)).toBeTruthy();
    });

    it("should_CallUpdateAppearance_WhenModeIsChanged", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AppearanceTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // We just need to click the element, the click will bubble up to the Box
      const lightModeElement = screen.getByText(/Light Mode/i);
      fireEvent.click(lightModeElement);

      // Assert
      expect(mockActions.updateAppearance.mock.calls.length).toBe(1);
      expect(mockActions.updateAppearance.mock.calls[0].arguments[0]).toEqual({ mode: "light" });
      
      expect(setModeMock.mock.calls.length).toBe(1);
      expect(setModeMock.mock.calls[0].arguments[0]).toBe("light");
    });
  });
});

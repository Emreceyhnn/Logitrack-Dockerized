 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  settings: {
    dialogs: {
      systemConfiguration: "System Configuration",
      adjustRegional: "Adjust regional and system settings",
    },
  },
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    error: { main: "#d32f2f" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_12: "rgba()", main_20: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_10: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("SettingsHeader RTL Component", () => {
  let SettingsHeader: unknown;

  before(async () => {
    const mod = await import("./SettingsHeader");
    SettingsHeader = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("SettingsHeader() bileşeni", () => {
    it("should_RenderHeader_WithTitleAndSubtitle", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <SettingsHeader onClose={() => {}} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/System Configuration/i)).toBeTruthy();
      expect(screen.getByText(/Adjust regional and system settings/i)).toBeTruthy();
    });

    it("should_CallOnClose_WhenCloseButtonIsClicked", async () => {
      const mockOnClose = mock.fn();
      
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <SettingsHeader onClose={mockOnClose} />
        </ThemeProvider>
      );

      // The CloseIcon is rendered inside an IconButton. 
      // We can find the button using the testid if we had one, or query by role.
      const closeButton = screen.getByRole("button");
      fireEvent.click(closeButton);

      // Assert
      expect(mockOnClose.mock.calls.length).toBe(1);
    });
  });
});

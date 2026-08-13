 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  common: {
    synchronizing: "Saving...",
    updatePreferences: "Update Preferences",
  },
  company: {
    dialogs: {
      localizationDesc: "Localization settings",
      interfaceLanguage: "Language",
      defaultCurrency: "Currency",
      dateTimeFormat: "Date & Time Format",
      activeTimezone: "Active Timezone",
    },
  },
  settings: {
    dialogs: {
      tabs: {
        localization: "Localization",
      },
      regional: {
        currencies: { dollar: "Dollar", euro: "Euro", lira: "Lira", pound: "Pound" },
        dateFormats: { standard: "Standard", international: "International" },
        timeFormat: "Time Format",
        timeFormats: { hour: "Hour" },
      },
    },
  },
  languages: {
    en: "English",
    tr: "Turkish",
  },
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// Mock Constants so we don't depend on actual implementation details for the test
mock.module("../../../../lib/constants.ts", {
  namedExports: {
    COMMON_TIMEZONES: [
      { value: "UTC", label: "UTC" },
      { value: "Europe/Istanbul", label: "Istanbul" },
    ],
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    divider_alpha: { main_08: "rgba()" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { 
  main_04: "rgba()", 
  main_10: "rgba()", 
  main_50: "rgba()", 
  main_25: "rgba()", 
  main_35: "rgba()" 
};
(customTheme.palette.common as unknown) = { 
  white_alpha: { main_45: "rgba()", main_60: "rgba()" } 
};

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("RegionalTab RTL Component", () => {
  let RegionalTab: unknown;

  before(async () => {
    const mod = await import("./RegionalTab");
    RegionalTab = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    isSaving: false,
    regional: {
      language: "en",
      currency: "USD",
      timezone: "UTC",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
    }
  };
  
  const mockActions = {
    updateRegional: mock.fn(),
    saveRegional: mock.fn(),
  };

  describe("RegionalTab() bileşeni", () => {
    it("should_RenderSelectInputs_WithInitialState", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RegionalTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Verify labels are rendered
      expect(screen.getAllByText(/Language/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Currency/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Active Timezone/i).length).toBeGreaterThan(0);

      // Verify select field values (Select components display their current value as text in a hidden input or in the button)
      // Since MUI Select uses a hidden input to store the value, we can look for it.
      const langInput = document.querySelector('input[name="Language"]') || document.querySelector('input[value="en"]');
      expect(langInput).toBeTruthy();
    });

    it("should_CallSaveRegional_WhenSaveButtonIsClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <RegionalTab state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      const saveButton = screen.getByText(/Update Preferences/i);
      fireEvent.click(saveButton);

      // Assert
      expect(mockActions.saveRegional.mock.calls.length).toBe(1);
    });
  });
});

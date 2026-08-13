 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  vehicles: {
    table: {
      searchPlaceholder: "Search vehicles...",
    },
    fields: {
      status: "Status",
      type: "Type"
    },
    statuses: {
      ACTIVE: "Active",
      MAINTENANCE: "Maintenance",
    },
    types: {
      TRUCK: "Truck",
      VAN: "Van",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../lib/type/enums.ts", {
  namedExports: {
    VehicleStatus: { ACTIVE: "ACTIVE", MAINTENANCE: "MAINTENANCE" },
    VehicleType: { TRUCK: "TRUCK", VAN: "VAN" },
  }
});

// 2. Mock Theme
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

describe("VehicleToolbar RTL Component", () => {
  let VehicleToolbar: unknown;

  before(async () => {
    const mod = await import("./toolbar");
    VehicleToolbar = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("VehicleToolbar() bileşeni", () => {
    it("should_RenderToolbarAndPlaceholder_Correctly", async () => {
      const mockState = { filters: { search: "", status: [], type: [] } };
      const mockActions = { updateFilters: mock.fn() };

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleToolbar state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByPlaceholderText("Search vehicles...")).toBeTruthy();
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Type").length).toBeGreaterThan(0);
    });

    it("should_DebounceSearchInput_AndCallUpdateFilters", async () => {
      const mockState = { filters: { search: "", status: [], type: [] } };
      const mockActions = { updateFilters: mock.fn() };

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleToolbar state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      const input = screen.getByPlaceholderText("Search vehicles...");
      
      fireEvent.change(input, { target: { value: "34ABC" } });

      // Should not call immediately
      expect(mockActions.updateFilters.mock.calls.length).toBe(0);

      // Wait for debounce (500ms)
      await waitFor(() => {
        expect(mockActions.updateFilters.mock.calls.length).toBe(1);
        expect(mockActions.updateFilters.mock.calls[0].arguments[0]).toEqual({ search: "34ABC" });
      }, { timeout: 1000 });
    });
  });
});

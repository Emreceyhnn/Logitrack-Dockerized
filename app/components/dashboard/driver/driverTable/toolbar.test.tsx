 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  drivers: {
    table: {
      searchPlaceholder: "Search drivers...",
    },
    filters: {
      status: "Status",
      vehicleAssignment: "Vehicle Assignment",
      all: "All",
      assigned: "Assigned",
      unassigned: "Unassigned",
    },
  },
};

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

// Custom theme
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("DriverTableToolbar RTL Component", () => {
  let DriverTableToolbar: unknown;

  before(async () => {
    const mod = await import("./toolbar");
    DriverTableToolbar = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DriverTableToolbar() bileşeni", () => {
    it("should_RenderSearchAndFilters", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <DriverTableToolbar filters={{}} onFilterChange={() => {}} />
        </ThemeProvider>
      );
      
      expect(screen.getByPlaceholderText("Search drivers...")).toBeTruthy();
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Vehicle Assignment").length).toBeGreaterThan(0);
    });

    it("should_DebounceSearchTermChange", async () => {
      const onFilterChange = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <DriverTableToolbar filters={{ search: "" }} onFilterChange={onFilterChange} />
        </ThemeProvider>
      );

      const input = screen.getByPlaceholderText("Search drivers...");
      fireEvent.change(input, { target: { value: "John" } });

      // Immediate call shouldn't happen due to debounce (500ms)
      expect(onFilterChange.mock.calls.length).toBe(0);

      // Wait for debounce
      await waitFor(() => {
        expect(onFilterChange.mock.calls.length).toBe(1);
        expect(onFilterChange.mock.calls[0].arguments[0]).toEqual({ search: "John" });
      }, { timeout: 1000 });
    });

    it("should_CallOnFilterChange_WhenClearIconClicked", async () => {
      const onFilterChange = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <DriverTableToolbar filters={{ search: "John" }} onFilterChange={onFilterChange} />
        </ThemeProvider>
      );

      // Find clear button (only renders when search term exists)
      const clearBtn = screen.getByTestId("ClearIcon");
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(onFilterChange.mock.calls.length).toBe(1);
        expect(onFilterChange.mock.calls[0].arguments[0]).toEqual({ search: "" });
      }, { timeout: 1000 });
    });
  });
});

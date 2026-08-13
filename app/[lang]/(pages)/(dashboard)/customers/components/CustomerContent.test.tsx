 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  customers: {
    searchPlaceholder: "Search",
    noGeoData: "No map data",
    deleteTitle: "Delete",
    deleteDesc: "Delete {name}?",
    dialogs: {
      successDelete: "Deleted",
      errorDelete: "Error"
    }
  },
  common: {
    add: "Add",
    search: "Search",
    this: "this"
  }
}));




mock.module("../../../../../components/dialogs/customer/customerDetailDialog.tsx", {
  defaultExport: () => <div data-testid="detail-dialog">Detail Dialog</div>,
});
mock.module("../../../../../components/dialogs/customer/editCustomerDialog.tsx", {
  defaultExport: () => <div data-testid="edit-dialog">Edit Dialog</div>,
});
mock.module("../../../../../components/dialogs/customer/addCustomerDialog/index.tsx", {
  defaultExport: () => <div data-testid="add-dialog">Add Dialog</div>,
});
mock.module("../../../../../components/dialogs/deleteConfirmationDialog.tsx", {
  defaultExport: ({ open, onConfirm  }: Record<string, unknown>) => open ? (
    <div data-testid="delete-dialog">
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  ) : null,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
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

describe("CustomerContent Component", () => {
  let CustomerContent: unknown;

  before(async () => {
    const mod = await import("./CustomerContent");
    CustomerContent = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockRefetch.mock.resetCalls();
    mockDeleteMutateAsync.mock.resetCalls();
  });

  describe("CustomerContent() Render Testleri", () => {
    it("should_RenderDashboardElements_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByTestId("customer-list")).toBeTruthy();
      expect(screen.getByTestId("gmaps-provider")).toBeTruthy();
      expect(screen.getByTestId("map-with-marker")).toBeTruthy();
    });

    it("should_OpenDeleteDialog_WhenDeleteClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerContent />
        </ThemeProvider>
      );

      const deleteBtn = screen.getByText("Delete C1");
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByTestId("delete-dialog")).toBeTruthy();
      });

      const confirmBtn = screen.getByText("Confirm Delete");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteMutateAsync.mock.calls.length).toBe(1);
      });
    });
  });
});

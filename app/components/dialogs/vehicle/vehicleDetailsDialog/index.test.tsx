 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    delete: "Delete",
    thisActionCannotBeUndone: "Cannot be undone",
  },
  vehicles: {
    dialogs: {
      vehicleLabel: "Vehicle",
      tabs: {
        overview: "Overview",
        documents: "Documents",
        maintenance: "Maintenance",
        fuel: "Fuel",
      },
    },
    deleteTitle: "Delete Title",
    deleteDesc: "Delete Desc",
  },
}));

const deleteVehicleMock = mock.fn(async () => ({}));
const getStatusMetaMock = mock.fn(() => ({ label: "Available", color: "green", paletteKey: "success" }));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: { deleteVehicle: deleteVehicleMock },
});

mock.module("../../../../lib/priorityColor.ts", {
  namedExports: { getStatusMeta: getStatusMetaMock },
});

mock.module("./overviewTab.tsx", { defaultExport: () => <div data-testid="overview-tab" /> });
mock.module("./documentsTab.tsx", { defaultExport: () => <div data-testid="documents-tab" /> });
mock.module("./maintenance.tsx", { defaultExport: () => <div data-testid="maintenance-tab" /> });
mock.module("../../deleteConfirmationDialog.tsx", { defaultExport: () => <div data-testid="delete-confirm-dialog" /> });

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    mode: "light",
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_10: "rgba()", main_20: "rgba()", main_50: "rgba()" } },
    success: { ...originalMui.useTheme().palette.success, _alpha: { main_10: "rgba()", main_20: "rgba()", main_50: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("VehicleDetailsDialog RTL Component", () => {
  let VehicleDetailsDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    VehicleDetailsDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("VehicleDetailsDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <VehicleDetailsDialog
          open={true}
          onClose={() => {}}
          vehicleData={{ id: "v1", plate: "34 ABC 123", photo: "img.png", status: "AVAILABLE", brand: "Ford", model: "F-150", year: 2020 }}
        />
      );

      // Assert
      expect(screen.getByText("34 ABC 123")).toBeTruthy(); // Plate number should be displayed in the header
      expect(screen.getByText("Available")).toBeTruthy(); // Status label
      expect(screen.getByText("Overview")).toBeTruthy(); // Tab exists
      expect(screen.getByTestId("overview-tab")).toBeTruthy(); // Default tab panel rendered
      expect(screen.getAllByText("Delete").length).toBeGreaterThan(0);
    });
  });
});

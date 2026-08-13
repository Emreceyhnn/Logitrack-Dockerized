 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    save: "Save",
    saving: "Saving",
    fillAllFields: "Fill all fields",
  },
  fuel: {
    dialogs: {
      addTitle: "Add Fuel Log",
      error: "Error adding fuel log",
    },
    addLogDesc: "Description",
    info: "Info",
    fields: {
      date: "Date",
      fuelType: "Fuel Type",
      volume: "Volume",
      cost: "Cost",
      odometer: "Odometer",
      location: "Location",
    },
  },
  vehicles: {
    fuelTypes: {
      DIESEL: "Diesel",
      GASOLINE: "Gasoline",
      ELECTRIC: "Electric",
      HYBRID: "Hybrid",
    },
  },
  drivers: {
    table: {
      noVehicle: "No Vehicle",
    },
  },
}));

const useUserContextMock = mock.fn(() => ({
  user: { currency: "USD" },
}));

const createFuelLogMock = mock.fn(async () => ({ id: "log-1" }));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/context/UserContext.tsx", {
  namedExports: { useUserContext: useUserContextMock },
});

mock.module("../../../../hooks/useVehicles.ts", {
  namedExports: {
    useVehicleMutations: mock.fn(() => ({
      addFuelLog: { mutateAsync: createFuelLogMock, isPending: false },
    })),
  },
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    divider_alpha: { main_10: "rgba(0,0,0,0.1)", main_05: "rgba(0,0,0,0.05)" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_20: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
    success: { ...originalMui.useTheme().palette.success, _alpha: { main_10: "rgba()" } },
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

mock.module("@mui/x-date-pickers/DatePicker", {
  namedExports: { DatePicker: () => <div data-testid="date-picker-mock" /> },
});

describe("AddFuelLogDialog RTL Component", () => {
  let AddFuelLogDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddFuelLogDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddFuelLogDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <AddFuelLogDialog
          open={true}
          onClose={() => {}}
          vehicleId="v1"
          vehiclePlate="34 ABC 123"
          currentDriverId="d1"
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText(/Add Fuel Log/i)).toBeTruthy();
    });
  });
});

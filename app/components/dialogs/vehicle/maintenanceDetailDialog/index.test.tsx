 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    fillAllFields: "Fill all fields",
    updating: "Updating",
  },
  vehicles: {
    dialogs: {
      failedToUpdateRecord: "Failed",
      maintenanceDetails: "Maintenance Details",
      maintenanceDetailsDesc: "Desc",
      maintenanceStatus: "Status",
      configuration: "Config",
      servicedOn: "Serviced On",
      additionalInfo: "Info",
      technicianNotes: "Notes",
      attachDocument: "Attach",
      newFileUpload: "Upload",
      viewDocument: "View",
      deleteAttachmentNote: "Delete",
      updateRecord: "Update Record",
    },
    fields: {
      status: "Status",
      serviceType: "Type",
      cost: "Cost",
    },
    serviceTypes: {
      ROUTINE_MAINTENANCE: "Routine",
      REPAIR: "Repair",
      INSPECTION: "Inspection",
      TIRE_CHANGE: "Tire",
      OIL_CHANGE: "Oil",
      OTHER: "Other",
    },
    statuses: {
      SCHEDULED: "Scheduled",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    },
  },
  toasts: {
    loading: "Loading",
  },
}));

const updateMaintenanceRecordMock = mock.fn(async () => ({}));
const convertFromMock = (val: Record<string, unknown>) => val || 0;
const useCurrencyMock = mock.fn(() => ({ convertFrom: convertFromMock, symbol: "$", currency: "USD" }));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: { updateMaintenanceRecord: updateMaintenanceRecordMock },
});

mock.module("../../../../hooks/useCurrency.ts", {
  namedExports: { useCurrency: useCurrencyMock },
});

mock.module("../../../../lib/actions/upload.ts", {
  namedExports: {
    uploadImageAction: mock.fn(),
    uploadDocumentAction: mock.fn(),
    getSignedUrlAction: mock.fn(async () => ({ url: "https://signed.example/doc" })),
    deleteFileAction: mock.fn(),
  },
});

mock.module("@mui/x-date-pickers", {
  namedExports: { DatePicker: () => <div data-testid="date-picker-mock" /> },
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    mode: "light",
    divider_alpha: { main_05: "rgba()" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
    success: { ...originalMui.useTheme().palette.success, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("MaintenanceDetailDialog RTL Component", () => {
  let MaintenanceDetailDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    MaintenanceDetailDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("MaintenanceDetailDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <MaintenanceDetailDialog
          open={true}
          onClose={() => {}}
          record={{ id: "m1", type: "REPAIR", date: new Date(), cost: 100, status: "COMPLETED", currency: "USD", description: "Fix engine" }}
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText("Maintenance Details")).toBeTruthy();
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cost").length).toBeGreaterThan(0);
    });
  });
});

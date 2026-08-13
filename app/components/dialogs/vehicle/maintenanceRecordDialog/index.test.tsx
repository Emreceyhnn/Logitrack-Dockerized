 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    fillAllFields: "Fill all fields",
    saving: "Saving",
  },
  vehicles: {
    dialogs: {
      failedToCreateRecord: "Failed",
      addMaintenanceRecord: "Add Maintenance",
      addMaintenanceDesc: "Desc",
      maintenanceStatus: "Status",
      configuration: "Config",
      servicedOn: "Serviced On",
      additionalInfo: "Info",
      technicianNotes: "Notes",
      attachDocument: "Attach",
      newFileUpload: "Upload",
      viewDocument: "View",
      deleteAttachmentNote: "Delete",
      saveRecord: "Save Record",
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

const addMaintenanceRecordMock = mock.fn(async () => ({}));
const useUserContextMock = mock.fn(() => ({ user: { currency: "USD" } }));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useVehicles.ts", {
  namedExports: {
    useVehicleMutations: mock.fn(() => ({
      addMaintenanceRecord: { mutateAsync: addMaintenanceRecordMock, isPending: false },
    })),
  },
});

mock.module("../../../../lib/context/UserContext.tsx", {
  namedExports: { useUserContext: useUserContextMock },
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

describe("MaintenanceRecordDialog RTL Component", () => {
  let MaintenanceRecordDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    MaintenanceRecordDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("MaintenanceRecordDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <MaintenanceRecordDialog
          open={true}
          onClose={() => {}}
          vehicleId="v1"
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText("Add Maintenance")).toBeTruthy();
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getByTestId("date-picker-mock")).toBeTruthy();
    });
  });
});

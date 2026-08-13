 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
  },
  vehicles: {
    dialogs: {
      reportIssueTitle: "Report Issue",
      vehicleLabel: "Vehicle",
      coreDetails: "Core Details",
      issueTitle: "Issue Title",
      issuePlaceholder: "Title",
      priorityLevel: "Priority Level",
      extendedDescription: "Description",
      details: "Details",
      detailsPlaceholder: "Details",
      submitIssue: "Submit Issue",
    },
    priorities: {
      LOW: "Low",
      MEDIUM: "Medium",
      HIGH: "High",
      CRITICAL: "Critical",
    },
  },
  toasts: {
    errorGeneric: "Generic error",
    successAdd: "Added successfully",
    loading: "Loading",
  },
  validation: {
    genericFormError: "Validation error",
  },
}));

const createVehicleIssueMock = mock.fn(async () => ({}));
const vehicleReportIssueValidationSchemaMock = mock.fn(() => ({
  validate: mock.fn(async () => true),
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useVehicles.ts", {
  namedExports: {
    useVehicleMutations: mock.fn(() => ({
      reportIssue: { mutateAsync: createVehicleIssueMock, isPending: false },
    })),
  },
});

mock.module("../../../../lib/validationSchema.ts", {
  namedExports: { vehicleReportIssueValidationSchema: vehicleReportIssueValidationSchemaMock },
});

mock.module("../../../../lib/priorityColor.ts", {
  namedExports: { getPriorityColor: mock.fn(() => "warning") },
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    mode: "light",
    divider_alpha: { main_05: "rgba()" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_10: "rgba()", main_20: "rgba()" } },
    warning: { ...originalMui.useTheme().palette.warning, _alpha: { main_10: "rgba()" } },
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

describe("ReportIssueDialog RTL Component", () => {
  let ReportIssueDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    ReportIssueDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("ReportIssueDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <ReportIssueDialog
          open={true}
          onClose={() => {}}
          vehicleId="v1"
          vehiclePlate="34 ABC 123"
          onSuccess={() => {}}
        />
      );

      // Assert
      expect(screen.getByText("Report Issue")).toBeTruthy();
      expect(screen.getAllByText("Issue Title").length).toBeGreaterThan(0);
      expect(screen.getByText("Submit Issue")).toBeTruthy();
    });
  });
});

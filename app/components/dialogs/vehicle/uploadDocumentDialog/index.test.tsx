 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    fillAllFields: "Fill all fields",
    docType: "Document Type",
    uploading: "Uploading",
  },
  vehicles: {
    dialogs: {
      uploadDocumentTitle: "Upload Document",
      uploadDocumentDesc: "Desc",
      failedToUploadDocument: "Failed",
      configuration: "Config",
      docName: "Document Name",
      docNamePlaceholder: "Name",
      expiryDate: "Expiry Date",
      fileAttachment: "Attachment",
      selectOrDragFile: "Select File",
      fileFormats: "Formats",
      preview: "Preview",
      startUpload: "Upload",
    },
    docTypes: {
      REGISTRATION: "Registration",
      INSURANCE: "Insurance",
      LICENSE: "License",
      INSPECTION: "Inspection",
      MAINTENANCE: "Maintenance",
      OTHER: "Other",
    },
  },
  toasts: {
    loading: "Loading",
  },
}));

const uploadVehicleDocumentMock = mock.fn(async () => ({}));
const uploadImageActionMock = mock.fn(async () => ({ url: "https://example.com/doc.pdf" }));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/controllers/vehicle.ts", {
  namedExports: {
    createVehicle: mock.fn(async () => ({})),
    updateVehicle: mock.fn(async () => ({})),
    deleteVehicle: mock.fn(async () => ({})),
    updateVehicleStatus: mock.fn(async () => ({})),
    assignDriverToVehicle: mock.fn(async () => ({})),
    unassignDriverFromVehicle: mock.fn(async () => ({})),
    uploadVehicleDocument: uploadVehicleDocumentMock,
    addMaintenanceRecord: mock.fn(async () => ({})),
    createVehicleIssue: mock.fn(async () => ({})),
  },
});

mock.module("../../../../lib/controllers/fuel.ts", {
  namedExports: { createFuelLog: mock.fn(async () => ({})) },
});

mock.module("../../../../lib/actions/upload.ts", {
  namedExports: { uploadImageAction: uploadImageActionMock },
});

mock.module("sonner", {
  namedExports: {
    toast: {
      success: mock.fn(),
      error: mock.fn(),
      loading: mock.fn(),
      dismiss: mock.fn(),
      promise: mock.fn(async (promise) => await promise),
    },
  },
});

const uploadDocQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
mock.module("@tanstack/react-query", {
  namedExports: {
    useQuery: mock.fn(() => ({ data: null })),
    useMutation: mock.fn((options: Record<string, unknown>) => ({
      mutate: (variables: Record<string, unknown>) => {
        Promise.resolve().then(async () => {
          const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
          try {
            const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
            await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
          } catch (e) {
            (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          } finally {
            (options.onSettled as (() => void) | undefined)?.();
          }
        });
      },
      mutateAsync: async (variables: Record<string, unknown>) => {
        const context = await (options.onMutate as ((v: unknown) => unknown) | undefined)?.(variables);
        try {
          const res = await (options.mutationFn as (v: unknown) => Promise<unknown>)(variables);
          await (options.onSuccess as ((r: unknown, v: unknown, c: unknown) => void) | undefined)?.(res, variables, context);
          return res;
        } catch (e) {
          (options.onError as ((e: unknown, v: unknown, c: unknown) => void) | undefined)?.(e, variables, context);
          throw e;
        } finally {
          (options.onSettled as (() => void) | undefined)?.();
        }
      },
    })),
    useQueryClient: mock.fn(() => uploadDocQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("@mui/x-date-pickers/DatePicker", {
  namedExports: { DatePicker: () => <div data-testid="date-picker-mock" /> },
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => ({
  ...originalMui.useTheme(),
  palette: {
    ...originalMui.useTheme().palette,
    mode: "light",
    divider_alpha: { main_05: "rgba()" },
    primary: { ...originalMui.useTheme().palette.primary, _alpha: { main_10: "rgba()", main_30: "rgba()", main_40: "rgba()", main_02: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
    error: { ...originalMui.useTheme().palette.error, _alpha: { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" } },
  },
}));

mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
  }
});
// Mutate theme object to inject custom alpha properties that MUI type definitions might reject
(customTheme.palette.primary as unknown)._alpha = { main_30: "rgba()", main_40: "rgba()", main_02: "rgba()", main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_10: "rgba()", main_05: "rgba()", main_20: "rgba()" };

describe("UploadDocumentDialog RTL Component", () => {
  let UploadDocumentDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    UploadDocumentDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("UploadDocumentDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UploadDocumentDialog
            open={true}
            onClose={() => {}}
            vehicleId="v1"
            onSuccess={() => {}}
          />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText("Upload Document")).toBeTruthy();
      expect(screen.getAllByText("Document Name").length).toBeGreaterThan(0);
      expect(screen.getByText("Upload")).toBeTruthy();
    });
  });
});

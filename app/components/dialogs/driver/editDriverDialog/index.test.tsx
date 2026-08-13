 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    save: "Save",
    errorOccurred: "Error",
  },
  drivers: {
    dialogs: {
      editTitle: "Edit Driver",
      editSubtitle: "Edit existing driver details",
    },
    tabs: {
      personalInfo: "Personal Info",
      operationalInfo: "Operational Info",
    }
  },
  validation: {
    genericFormError: "Form Error",
  },
  toasts: {
    loading: "Loading...",
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  loading: mock.fn(),
  dismiss: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

mock.module("../../../../lib/controllers/driver.ts", {
  namedExports: {
    createDriver: mock.fn(async () => ({})),
    updateDriver: mock.fn(async () => ({})),
    deleteDriver: mock.fn(async () => ({})),
    updateDriverStatus: mock.fn(async () => ({})),
    assignVehicleToDriver: mock.fn(async () => ({})),
    unassignVehicleFromDriver: mock.fn(async () => ({})),
  },
});

const editDriverQueryClientMock = { invalidateQueries: mock.fn(), cancelQueries: mock.fn(async () => {}), getQueryCache: mock.fn(() => ({ findAll: () => [] })), setQueryData: mock.fn() };
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
    useQueryClient: mock.fn(() => editDriverQueryClientMock),
    keepPreviousData: "keepPreviousData",
  },
});

mock.module("../../../../lib/actions/upload.ts", {
  namedExports: { 
    uploadImageAction: mock.fn(async () => ({ url: "https://example.com/image.png" }))
  },
});

mock.module("../../../../lib/validationSchema.ts", {
  namedExports: {
    editDriverValidationSchema: mock.fn(() => ({
      validate: async () => true,
    }))
  }
});

mock.module("../../../../hooks/useDateSettings.ts", {
  namedExports: { 
    useDateSettings: mock.fn(() => ({}))
  },
});

mock.module("../../../../lib/utils/date.ts", {
  namedExports: { 
    formatDisplayDate: mock.fn(() => "01/01/2026")
  },
});

// Mock Sections
mock.module("./firstStep.tsx", {
  defaultExport: () => <div data-testid="first-step-section">First Step Content</div>,
});
mock.module("./secondStep.tsx", {
  defaultExport: () => <div data-testid="second-step-section">Second Step Content</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    background: { midnight: { main: "#0B0F19" } } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_50: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("EditDriverDialog RTL Component", () => {
  let EditDriverDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    EditDriverDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const MOCK_DRIVER = {
    id: "driver-1",
    status: "ACTIVE",
    employeeId: "EMP-001",
    phone: "1234567890",
    documents: [],
    user: {
      id: "user-1",
      name: "John",
      surname: "Doe",
      email: "john@example.com",
    }
  };

  describe("EditDriverDialog() bileşeni", () => {
    it("should_RenderWizard_AndDisplayFirstStep", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditDriverDialog open={true} onClose={() => {}} driver={MOCK_DRIVER} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Edit Driver: John Doe")).toBeTruthy();
      expect(screen.getByTestId("first-step-section")).toBeTruthy();
    });

    it("should_TransitionToSecondStep_WhenNextIsClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditDriverDialog open={true} onClose={() => {}} driver={MOCK_DRIVER} />
        </ThemeProvider>
      );

      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("second-step-section")).toBeTruthy();
      });
    });
  });
});

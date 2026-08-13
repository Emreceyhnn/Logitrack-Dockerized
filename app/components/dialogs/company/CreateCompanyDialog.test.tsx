 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    next: "Next",
  },
  company: {
    dialogs: {
      steps: {
        branding: "Branding",
        regional: "Regional",
      },
      identityTitle: "Identity",
      regionalTitle: "Regional",
      identitySubtitle: "Setup Identity",
    }
  },
  validation: {
    genericFormError: "Validation Error",
  },
  toasts: {
    loading: "Creating...",
    successAdd: "Created successfully",
    errorGeneric: "Error",
  }
}));

const useLanguageMock = mock.fn(() => ({
  lang: "en",
  dict: useDictionaryMock(),
  changeLanguage: mock.fn(),
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock, useLanguage: useLanguageMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

// useParams drives locale-based regional defaults; default to Turkish here.
const useParamsMock = mock.fn(() => ({ lang: "tr" }));
// `redirect` is here because the gate's server action reaches auth-middleware,
// which imports it at module load; without the export the whole suite fails to
// instantiate rather than failing a test.
mock.module("next/navigation", {
  namedExports: {
    useParams: useParamsMock,
    redirect: mock.fn(),
    useRouter: mock.fn(() => ({ push: mock.fn(), refresh: mock.fn() })),
    usePathname: mock.fn(() => "/"),
  },
});

// The dialog reads the signed-in user to decide between the company form and
// the email-verification gate. Verified by default here; the gate has its own
// test file.
const useOptionalUserContextMock = mock.fn(() => ({
  user: { id: "user-1", emailVerified: true },
  loading: false,
}));
mock.module("../../../lib/context/UserContext.tsx", {
  namedExports: { useOptionalUserContext: useOptionalUserContextMock },
});

const createCompanyMock = mock.fn(async () => ({}));
mock.module("../../../lib/controllers/company.ts", {
  namedExports: { 
    createCompany: createCompanyMock
  },
});

mock.module("../../../lib/actions/upload.ts", {
  namedExports: { 
    uploadImageAction: mock.fn(async () => ({ url: "https://example.com/logo.png" }))
  },
});

mock.module("../../../lib/validationSchema.ts", {
  namedExports: {
    createCompanyValidationSchema: mock.fn(() => ({
      validate: async () => true,
    }))
  }
});

// Mock step components
mock.module("./Step1Branding.tsx", {
  defaultExport: ({ actions  }: Record<string, unknown>) => {
    return (
      <div data-testid="step1">
        <button onClick={() => actions.updateFormData({ name: "My Company", industry: "Tech" })}>Fill Valid Step 1</button>
      </div>
    );
  }
});
mock.module("./Step2Regional.tsx", {
  defaultExport: () => <div data-testid="step2">Step 2</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba(0,0,0,0.5)", main_10: "rgba(0,0,0,0.5)", main_20: "rgba(0,0,0,0.5)", main_25: "rgba(0,0,0,0.5)", main_35: "rgba(0,0,0,0.5)", main_40: "rgba(0,0,0,0.5)", main_80: "rgba(0,0,0,0.5)" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;
(customTheme.palette.text as unknown).primary_alpha = mockAlpha;
(customTheme.palette.text as unknown).secondary_alpha = mockAlpha;
(customTheme.palette.error as unknown)._alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("CreateCompanyDialog RTL Component", () => {
  let CreateCompanyDialog: unknown;

  before(async () => {
    const mod = await import("./CreateCompanyDialog");
    CreateCompanyDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
    createCompanyMock.mock.resetCalls();
  });

  describe("CreateCompanyDialog() bileşeni", () => {
    it("should_RenderFirstStep_WhenOpened", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CreateCompanyDialog open={true} onClose={() => {}} onSuccess={() => {}} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Identity")).toBeTruthy();
      expect(screen.getByTestId("step1")).toBeTruthy();
    });

    it("should_TransitionToStep2_WhenValid", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CreateCompanyDialog open={true} onClose={() => {}} onSuccess={() => {}} />
        </ThemeProvider>
      );

      // simulate valid fill
      fireEvent.click(screen.getByText("Fill Valid Step 1"));

      // click next
      fireEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByTestId("step2")).toBeTruthy();
        expect(screen.getAllByText("Regional").length).toBeGreaterThan(0);
      });
    });
  });
});

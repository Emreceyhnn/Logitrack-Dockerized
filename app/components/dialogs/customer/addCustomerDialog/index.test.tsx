 
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
    nextStep: "Next Step",
    fillRequired: "Fill Required",
  },
  customers: {
    dialogs: {
      addTitle: "Add Customer",
      successAdd: "Created successfully",
      errorAdd: "Creation failed",
      steps: {
        identity: "Identity",
        contact: "Contact",
      }
    },
    registerNewPartner: "Register New Partner",
    addCustomer: "Add Customer",
  },
  toasts: {
    loading: "Creating...",
  }
}));



const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useDictionary: () => ({
      common: { back: "Back", cancel: "Cancel", fillRequired: "Fill required", nextStep: "Next Step" },
      customers: {
        addCustomer: "Add Customer",
        registerNewPartner: "Register new partner",
        dialogs: {
          addTitle: "Add Customer",
          errorAdd: "Error",
          successAdd: "Added",
          steps: { contact: "Contact", identity: "Identity" },
        },
      },
      toasts: { errorGeneric: "Error" },
    }),
  },
});

mock.module("../../../../hooks/useUser.ts", {
  namedExports: { useUser: () => ({ user: { id: "user-1", companyId: "comp-1", currency: "USD" } }) },
});

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

const mockCreateCustomerMutate = mock.fn(async () => ({}));
mock.module("../../../../hooks/useCustomers.ts", {
  namedExports: {
    useCustomerMutations: mock.fn(() => ({
      createCustomer: { mutateAsync: mockCreateCustomerMutate, isPending: false },
    })),
  },
});

mock.module("../../../../lib/validationSchema.ts", {
  namedExports: {
    addCustomerValidationSchema: mock.fn(() => ({
      validate: async () => true,
    }))
  }
});

// Mock Sections
mock.module("./sections/IdentitySection.tsx", {
  defaultExport: () => <div data-testid="identity-section">Identity Content</div>,
});
mock.module("./sections/ContactSection.tsx", {
  defaultExport: () => <div data-testid="contact-section">Contact Content</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    background: { default: "#0B0F19" } as unknown,
  }
});

const mockAlpha = { main_03: "rgba()", main_05: "rgba()", main_08: "rgba()", main_10: "rgba()", main_20: "rgba()", main_25: "rgba()", main_30: "rgba()", main_40: "rgba()", main_50: "rgba()", main_60: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).default_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };
(customTheme.palette.text as unknown as { secondary_alpha: typeof mockAlpha }).secondary_alpha = mockAlpha;

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("AddCustomerDialog RTL Component", () => {
  let AddCustomerDialog: unknown;

  before(async () => {
    const mod = await import("./index");
    AddCustomerDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("AddCustomerDialog() bileşeni", () => {
    it("should_RenderWizard_AndDisplayIdentityStep", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AddCustomerDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Add Customer")).toBeTruthy();
      expect(screen.getByTestId("identity-section")).toBeTruthy();
    });

    it("should_TransitionToContactStep_WhenNextIsClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <AddCustomerDialog open={true} onClose={() => {}} />
        </ThemeProvider>
      );

      const nextButton = screen.getByText("Next Step");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId("contact-section")).toBeTruthy();
      });
    });
  });
});

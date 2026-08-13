 
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
    saveChanges: "Save Changes",
  },
  customers: {
    dialogs: {
      editTitle: "Edit Customer",
      editSubtitle: "Editing {name}",
      successUpdate: "Updated successfully",
      errorUpdate: "Update failed",
      steps: {
        identity: "Identity",
        contact: "Contact",
      }
    },
    fields: {
      mainOffice: "Main Office"
    }
  },
  toasts: {
    loading: "Updating...",
  }
}));



const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
  promise: mock.fn(async (promise) => await promise),
};

mock.module("sonner", {
  namedExports: { toast: toastMock },
});

// EditCustomerDialog consumes useUser() and useDictionary(); without these
// mocks the real context hooks throw "must be used within a UserProvider".
mock.module("../../../hooks/useUser.ts", {
  namedExports: {
    useUser: mock.fn(() => ({
      user: {
        id: "user-1",
        companyId: "company-1",
        timezone: "UTC",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
      },
    })),
  },
});

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const mockUpdateCustomerMutate = mock.fn(async () => ({}));
mock.module("../../../hooks/useCustomers.ts", {
  namedExports: {
    useCustomerMutations: mock.fn(() => ({
      updateCustomer: { mutateAsync: mockUpdateCustomerMutate, isPending: false },
    })),
  },
});

mock.module("../../../lib/validationSchema.ts", {
  namedExports: {
    editCustomerValidationSchema: mock.fn(() => ({
      validate: async () => true,
    }))
  }
});

// Mock Sections
mock.module("./addCustomerDialog/sections/IdentitySection.tsx", {
  defaultExport: () => <div data-testid="identity-section">Identity Content</div>,
});
mock.module("./addCustomerDialog/sections/ContactSection.tsx", {
  defaultExport: () => <div data-testid="contact-section">Contact Content</div>,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
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

describe("EditCustomerDialog RTL Component", () => {
  let EditCustomerDialog: unknown;

  before(async () => {
    const mod = await import("./editCustomerDialog");
    EditCustomerDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const MOCK_CUSTOMER = {
    id: "cust-1",
    name: "Acme Corp",
    code: "CUST-001",
    industry: "Technology",
    taxId: "TAX-12345",
    email: "contact@acme.com",
    phone: "123-456-7890",
    locations: [],
  };

  describe("EditCustomerDialog() bileşeni", () => {
    it("should_RenderWizard_AndDisplayIdentityStep", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditCustomerDialog open={true} onClose={() => {}} onSuccess={() => {}} customer={MOCK_CUSTOMER} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Edit Customer")).toBeTruthy();
      expect(screen.getByText("Editing Acme Corp")).toBeTruthy();
      expect(screen.getByTestId("identity-section")).toBeTruthy();
    });

    it("should_TransitionToContactStep_WhenNextIsClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditCustomerDialog open={true} onClose={() => {}} onSuccess={() => {}} customer={MOCK_CUSTOMER} />
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

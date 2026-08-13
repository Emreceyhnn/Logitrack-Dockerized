 
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
  },
  company: {
    roles: {
      admin: "Admin",
      manager: "Manager",
      dispatcher: "Dispatcher",
      warehouse: "Warehouse",
      default: "Default",
      driver: "Driver",
    },
    editMember: {
      title: "Edit Member",
      subtitle: "Editing {name}",
      firstName: "First Name",
      lastName: "Last Name",
      systemRole: "System Role",
      accountStatus: "Account Status",
      saving: "Saving...",
      statuses: {
        ACTIVE: "Active",
        INACTIVE: "Inactive",
        SUSPENDED: "Suspended",
      }
    }
  },
  validation: {
    genericFormError: "Validation Error",
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const updateCompanyMemberMock = mock.fn(async () => ({}));
mock.module("../../../hooks/useCompany.ts", {
  namedExports: {
    useCompanyMutations: mock.fn(() => ({
      updateMember: { mutateAsync: updateCompanyMemberMock, isPending: false },
    })),
  },
});

mock.module("../../../lib/validationSchema.ts", {
  namedExports: {
    editCompanyMemberValidationSchema: mock.fn(() => ({
      validate: async () => true,
    }))
  }
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    background: { default: "#0B0F19", paper: "#111" } as unknown,
  }
});

const mockAlpha = { main_05: "rgba()", main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_50: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).default_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("EditCompanyMemberDialog RTL Component", () => {
  let EditCompanyMemberDialog: unknown;

  before(async () => {
    const mod = await import("./EditCompanyMemberDialog");
    EditCompanyMemberDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
    updateCompanyMemberMock.mock.resetCalls();
  });

  const MOCK_MEMBER = {
    id: "member-1",
    name: "John",
    surname: "Doe",
    roleId: "role_manager",
    roleName: "Manager",
    status: "ACTIVE",
  };

  describe("EditCompanyMemberDialog() bileşeni", () => {
    it("should_RenderMemberDetails_WhenDialogOpens", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditCompanyMemberDialog open={true} onClose={() => {}} onSuccess={() => {}} member={MOCK_MEMBER} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Edit Member")).toBeTruthy();
      expect(screen.getByText("Editing John")).toBeTruthy();
      
      // Look for the inputs by their value
      const nameInput = screen.getByDisplayValue("John");
      expect(nameInput).toBeTruthy();
    });

    it("should_CallUpdateController_WhenSaveClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <EditCompanyMemberDialog open={true} onClose={() => {}} onSuccess={() => {}} member={MOCK_MEMBER} />
        </ThemeProvider>
      );

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateCompanyMemberMock.mock.calls.length).toBe(1);
        expect(updateCompanyMemberMock.mock.calls[0].arguments[0].id).toBe("member-1");
      });
    });
  });
});

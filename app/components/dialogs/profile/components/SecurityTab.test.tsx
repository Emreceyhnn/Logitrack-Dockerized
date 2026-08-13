 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  profile: {
    security: {
      bannerTitle: "Security Settings",
      bannerDesc: "Keep your account secure.",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      updateButton: "Update Password",
      entropyLevel: "Strength:",
      matchError: "Passwords do not match",
      strengths: {
        vulnerable: "Weak",
        acceptable: "Medium",
        robust: "Strong",
      }
    },
    status: {
      upgrading: "Updating...",
    }
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    success: { main: "#2e7d32" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_06: "rgba()", main_10: "rgba()", main_15: "rgba()", main_30: "rgba()", main_40: "rgba()" };
(customTheme.palette.error as unknown)._alpha = { main_40: "rgba()" };
(customTheme.palette.warning as unknown)._alpha = { main_40: "rgba()" };
(customTheme.palette.success as unknown)._alpha = { main_40: "rgba()" };
(customTheme.palette as unknown).divider_alpha = { main_08: "rgba()" };
(customTheme.palette.common as unknown) = { 
  white_alpha: { main_03: "rgba()", main_05: "rgba()", main_06: "rgba()", main_10: "rgba()", main_20: "rgba()", main_30: "rgba()", main_40: "rgba()", main_45: "rgba()" }
};

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("SecurityTab RTL Component", () => {
  let SecurityTab: unknown;

  before(async () => {
    const mod = await import("./SecurityTab");
    SecurityTab = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    isSaving: false,
    passwordForm: {
      currentPassword: "",
      newPassword: "TestPassword123!",
      confirmPassword: "TestPassword123!",
    }
  };

  const mockActions = {
    updatePasswordForm: mock.fn(),
    changePassword: mock.fn(),
  };

  describe("SecurityTab() bileşeni", () => {
    it("should_RenderPasswordForm_AndValidateInputs", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <SecurityTab state={mockState as unknown} actions={mockActions as unknown} />
        </ThemeProvider>
      );

      // Assert labels and values
      expect(screen.getByText(/Security Settings/i)).toBeTruthy();
      
      const currentPasswordInput = screen.getByLabelText(/Current Password/i) as HTMLInputElement;
      expect(currentPasswordInput.value).toBe("");
      
      const newPasswordInput = screen.getByLabelText(/New Password/i) as HTMLInputElement;
      expect(newPasswordInput.value).toBe("TestPassword123!");

      // Since length > 12, strength should be Strong
      expect(screen.getByText(/Strong/i)).toBeTruthy();
    });

    it("should_CallUpdatePassword_WhenSubmitted", async () => {
      // The submit button also requires a non-empty current password, so use a
      // fully-filled state here (mockState leaves currentPassword blank on purpose
      // for the render test above).
      const filledState = {
        isSaving: false,
        passwordForm: {
          currentPassword: "OldPassword123!",
          newPassword: "TestPassword123!",
          confirmPassword: "TestPassword123!",
        },
      };

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <SecurityTab state={filledState as unknown} actions={mockActions as unknown} />
        </ThemeProvider>
      );

      const updateButton = screen.getByText(/Update Password/i);

      // Button should be enabled because strength is strong, and passwords match
      expect((updateButton as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(updateButton);

      // Assert
      expect(mockActions.changePassword.mock.calls.length).toBe(1);
    });
  });
});

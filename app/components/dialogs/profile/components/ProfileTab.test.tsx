 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  profile: {
    account: {
      verifiedMember: "Verified Member",
      firstName: "First Name",
      lastName: "Last Name",
      adminEmail: "Admin Email",
      emailHelper: "Email helper text",
      syncButton: "Sync Profile",
    },
    status: {
      finalizing: "Saving...",
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
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_08: "rgba()", main_10: "rgba()", main_12: "rgba()", main_20: "rgba()", main_30: "rgba()", main_40: "rgba()" };
(customTheme.palette as unknown).divider_alpha = { main_08: "rgba()" };
(customTheme.palette.common as unknown) = { 
  white_alpha: { main_02: "rgba()", main_03: "rgba()", main_05: "rgba()", main_06: "rgba()", main_25: "rgba()", main_30: "rgba()", main_40: "rgba()" },
  black_alpha: { main_40: "rgba()" }
};

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("ProfileTab RTL Component", () => {
  let ProfileTab: unknown;

  before(async () => {
    const mod = await import("./ProfileTab");
    ProfileTab = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockState = {
    isSaving: false,
    profileForm: {
      name: "John",
      surname: "Doe",
      email: "john@example.com",
      avatarUrl: null,
    }
  };

  const mockActions = {
    updateProfileForm: mock.fn(),
    saveProfile: mock.fn(),
  };

  describe("ProfileTab() bileşeni", () => {
    it("should_RenderProfileForm_WithInitialUserValues", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <ProfileTab state={mockState as unknown} actions={mockActions as unknown} />
        </ThemeProvider>
      );

      // Assert labels
      expect(screen.getByText(/Verified Member/i)).toBeTruthy();
      
      // Since it's a TextField, the value is in the input element
      const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe("John");
      
      const emailInput = screen.getByLabelText(/Admin Email/i) as HTMLInputElement;
      expect(emailInput.value).toBe("john@example.com");
    });

    it("should_CallUpdateAPI_WhenSavingValidData", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <ProfileTab state={mockState as unknown} actions={mockActions as unknown} />
        </ThemeProvider>
      );

      const syncButton = screen.getByText(/Sync Profile/i);
      fireEvent.click(syncButton);

      // Assert
      expect(mockActions.saveProfile.mock.calls.length).toBe(1);
    });
  });
});

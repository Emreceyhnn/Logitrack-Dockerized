 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  company: {
    memberDetails: {
      noRole: "No Role",
      contactInfo: "Contact Info",
      emailAddress: "Email Address",
      joinedSince: "Joined Since",
      adminData: "Admin Data",
      adminDataDesc: "Desc: {role}",
      closeView: "Close View",
    },
    editMember: {
      statuses: {
        ACTIVE: "Active",
        INACTIVE: "Inactive",
        SUSPENDED: "Suspended",
      }
    }
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: { 
    useDateSettings: mock.fn(() => ({}))
  },
});

mock.module("../../../lib/utils/date.ts", {
  namedExports: { 
    formatDisplayDate: mock.fn(() => "01/01/2026")
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
  }
});

const mockAlpha = { main_02: "rgba()", main_03: "rgba()", main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette as unknown).secondary = { _alpha: mockAlpha, light: "#ccc" };
(customTheme.palette as unknown).info = { _alpha: mockAlpha, main: "#ccc" };
(customTheme.palette as unknown).success = { _alpha: mockAlpha, main: "#ccc" };
(customTheme.palette as unknown).warning = { _alpha: mockAlpha, main: "#ccc", light: "#ccc" };
(customTheme.palette.background as unknown) = { paper_alpha: mockAlpha };
(customTheme.palette.common as unknown) = { white_alpha: mockAlpha };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("CompanyMemberDetailsDialog RTL Component", () => {
  let CompanyMemberDetailsDialog: unknown;

  before(async () => {
    const mod = await import("./CompanyMemberDetailsDialog");
    CompanyMemberDetailsDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const MOCK_MEMBER = {
    id: "member-1",
    name: "John",
    surname: "Doe",
    roleId: "role_manager",
    roleName: "Manager",
    status: "ACTIVE",
    email: "john@example.com",
    avatarUrl: null,
    createdAt: new Date().toISOString()
  };

  describe("CompanyMemberDetailsDialog() bileşeni", () => {
    it("should_RenderMemberDetailsAndContactInfo_Properly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyMemberDetailsDialog open={true} onClose={() => {}} member={MOCK_MEMBER} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("John Doe")).toBeTruthy();
      expect(screen.getAllByText("Manager").length).toBeGreaterThan(0);
      expect(screen.getByText("Active")).toBeTruthy();
      expect(screen.getByText("john@example.com")).toBeTruthy();
    });
  });
});

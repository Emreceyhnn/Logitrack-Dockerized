 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  company: {
    title: "Company",
    subtitle: "Manage company details",
    addMember: "Add Member",
    kpi: {
      totalUsers: "Users",
      vehicles: "Vehicles",
      drivers: "Drivers",
      warehouses: "Warehouses",
      customers: "Customers",
      shipments: "Shipments"
    }
  }
}));

mock.module("../../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const mockRefetch = mock.fn(async () => {});
const mockDeleteMutateAsync = mock.fn(async () => {});

mock.module("../../../../../hooks/useCompany.ts", {
  namedExports: { 
    useCompanyWithDashboard: mock.fn(() => ({
      data: {
        profile: {},
        stats: { users: 5 },
        statsTrends: {},
        members: [],
        totalCount: 0,
        meta: {}
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })),
    useCompanyMutations: mock.fn(() => ({
      deleteMember: { mutateAsync: mockDeleteMutateAsync }
    }))
  },
});

// Mock child components
mock.module("../../../../../components/cards/KpiCards.tsx", {
  defaultExport: ({ kpis  }: Record<string, unknown>) => <div data-testid="kpi-cards">KPI Cards</div>,
});
mock.module("../../../../../components/dashboard/company/companyInfoCard.tsx", {
  defaultExport: () => <div data-testid="company-info-card">Company Info</div>,
});
mock.module("../../../../../components/dashboard/company/companyMembersTable.tsx", {
  defaultExport: () => <div data-testid="company-members-table">Members Table</div>,
});
mock.module("../../../../../components/dialogs/company/AddCompanyMemberDialog.tsx", {
  defaultExport: ({ open, onClose  }: Record<string, unknown>) => open ? (
    <div data-testid="add-member-dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    info: { main: "#0288d1" } as unknown,
    secondary: { main: "#9c27b0" } as unknown,
    warning: { main: "#ed6c02" } as unknown,
    success: { main: "#2e7d32" } as unknown,
    error: { main: "#d32f2f" } as unknown,
    kpi: { pink: "#ccc", violet: "#ccc" } as unknown,
  }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("CompanyContent Component", () => {
  let CompanyContent: unknown;

  before(async () => {
    const mod = await import("./CompanyContent");
    CompanyContent = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockRefetch.mock.resetCalls();
    mockDeleteMutateAsync.mock.resetCalls();
  });

  describe("CompanyContent() Render Testleri", () => {
    it("should_RenderDashboardElements_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyContent />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Company")).toBeTruthy();
      expect(screen.getByTestId("kpi-cards")).toBeTruthy();
      expect(screen.getByTestId("company-info-card")).toBeTruthy();
      expect(screen.getByTestId("company-members-table")).toBeTruthy();
    });

    it("should_OpenAddMemberDialog_WhenAddButtonClicked", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyContent />
        </ThemeProvider>
      );

      const addBtn = screen.getByRole("button", { name: "Add Member" });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByTestId("add-member-dialog")).toBeTruthy();
      });
    });
  });
});

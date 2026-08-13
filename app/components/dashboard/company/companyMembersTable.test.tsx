 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  company: {
    members: {
      title: "Members",
      empty: "No members",
      columns: {
        member: "Member",
        email: "Email",
        role: "Role",
        status: "Status",
        joined: "Joined",
      },
      statuses: {
        active: "Active",
        inactive: "Inactive",
        suspended: "Suspended",
      },
      actions: {
        details: "Details",
        edit: "Edit",
        delete: "Delete",
      },
      deleteDialog: {
        title: "Delete Member",
        description: "Are you sure you want to delete {name}?",
      },
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../../hooks/useDateSettings.ts", {
  namedExports: { useDateSettings: () => ({ format: "YYYY-MM-DD" }) },
});

mock.module("../../../lib/utils/date.ts", {
  namedExports: { formatDisplayDate: () => "2024-01-01" },
});

// Mock Dialogs
mock.module("../../dialogs/company/CompanyMemberDetailsDialog.tsx", {
  defaultExport: ({ open, onClose, member  }: Record<string, unknown>) =>
    open ? (
      <div data-testid="details-dialog">
        {member?.name}
        <button onClick={onClose}>Close Details</button>
      </div>
    ) : null,
});

mock.module("../../dialogs/company/EditCompanyMemberDialog.tsx", {
  defaultExport: ({ open, onClose, member  }: Record<string, unknown>) =>
    open ? (
      <div data-testid="edit-dialog">
        Edit {member?.name}
        <button onClick={onClose}>Close Edit</button>
      </div>
    ) : null,
});

mock.module("../../dialogs/deleteConfirmationDialog.tsx", {
  defaultExport: ({ open, onClose, onConfirm, description  }: Record<string, unknown>) =>
    open ? (
      <div data-testid="delete-dialog">
        {description}
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
});

// Mock DataTable
let dataTableProps: unknown = null;
mock.module("../../ui/DataTable/index.tsx", {
  defaultExport: (props: Record<string, unknown>) => {
    dataTableProps = props;
    return <div data-testid="data-table">{props.emptyMessage}</div>;
  },
});

const customTheme = createTheme({ palette: { mode: "light" } });
Object.assign((customTheme.palette.primary as unknown), {
  _alpha: { main_10: "rgba(25,118,210,0.1)" }
});

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("CompanyMembersTable RTL Component", () => {
  let CompanyMembersTable: unknown;

  before(async () => {
    const mod = await import("./companyMembersTable");
    CompanyMembersTable = mod.default;
  });

  afterEach(() => {
    cleanup();
    dataTableProps = null;
  });

  const mockActions = {
    updatePagination: mock.fn(),
    updateFilters: mock.fn(),
    deleteMember: mock.fn(async () => {}),
    refreshAll: mock.fn(),
  };

  const mockProps = {
    state: {
      loading: false,
      data: {
        members: [
          {
            id: "m1",
            name: "John",
            surname: "Doe",
            email: "john@example.com",
            roleName: "Admin",
            status: "ACTIVE",
            createdAt: "2023-01-01",
          },
        ],
        meta: { page: 1, limit: 10, total: 1 },
      },
    },
    actions: mockActions,
  };

  describe("CompanyMembersTable() bileşeni", () => {
    it("should_PassPropsToDataTable", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyMembersTable props={mockProps as unknown} />
        </ThemeProvider>
      );

      expect(screen.getByTestId("data-table")).toBeTruthy();
      expect(dataTableProps.rows.length).toBe(1);
      expect(dataTableProps.columns.length).toBe(5);
    });

    it("should_FormatColumnsCorrectly", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyMembersTable props={mockProps as unknown} />
        </ThemeProvider>
      );

      const columns = dataTableProps.columns;
      const member = mockProps.state.data.members[0];

      // Member Name
      const nameCol = columns.find((c: Record<string, unknown>) => c.key === "member");
      const { container: nameContainer } = render(nameCol.render(member));
      expect(nameContainer.textContent).toContain("John Doe");
      expect(nameContainer.textContent).toContain("JD"); // Avatar initials fallback

      // Role
      const roleCol = columns.find((c: Record<string, unknown>) => c.key === "role");
      const { container: roleContainer } = render(roleCol.render(member));
      expect(roleContainer.textContent).toContain("Admin");

      // Status
      const statusCol = columns.find((c: Record<string, unknown>) => c.key === "status");
      const { container: statusContainer } = render(statusCol.render(member));
      expect(statusContainer.textContent).toBe("Active"); // localized
    });

    it("should_OpenDialogs_WhenRowActionsClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CompanyMembersTable props={mockProps as unknown} />
        </ThemeProvider>
      );

      const rowActions = dataTableProps.rowActions;
      const member = mockProps.state.data.members[0];

      // 1. Details Action
      act(() => {
        rowActions[0].onClick(member);
      });
      expect(screen.getByTestId("details-dialog")).toBeTruthy();
      expect(screen.getByText("John")).toBeTruthy();
      fireEvent.click(screen.getByText("Close Details"));

      // 2. Edit Action
      act(() => {
        rowActions[1].onClick(member);
      });
      expect(screen.getByTestId("edit-dialog")).toBeTruthy();
      fireEvent.click(screen.getByText("Close Edit"));

      // 3. Delete Action
      act(() => {
        rowActions[2].onClick(member);
      });
      expect(screen.getByTestId("delete-dialog")).toBeTruthy();
      expect(screen.getByText("Are you sure you want to delete John?")).toBeTruthy();

      // Confirm Delete
      fireEvent.click(screen.getByText("Confirm Delete"));
      
      // Wait for async handler
      await new Promise(process.nextTick);
      expect(mockActions.deleteMember.mock.calls.length).toBe(1);
      expect(mockActions.deleteMember.mock.calls[0].arguments[0]).toBe("m1");
    });
  });
});

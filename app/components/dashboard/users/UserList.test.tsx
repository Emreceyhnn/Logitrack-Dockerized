 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    edit: "Edit",
  },
  dashboard: {
    users: {
      fullName: "Full Name",
      email: "Email",
      role: "Role",
      noUsers: "No Users Found",
    }
  },
  company: {
    roles: {
      admin: "Admin",
      manager: "Manager",
      driver: "Driver",
      warehouse: "Warehouse",
      dispatcher: "Dispatcher",
      default: "User",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

mock.module("../../ui/DataTable/index.tsx", {
  defaultExport: ({ rows, columns, rowActions, emptyMessage  }: Record<string, unknown>) => (
    <div data-testid="data-table">
      {rows.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((c: Record<string, unknown>) => <th key={c.key}>{c.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: unknown, i: number) => (
              <tr key={i} data-testid={`row-${row.id}`}>
                {columns.map((c: Record<string, unknown>) => (
                  <td key={c.key} data-testid={`cell-${c.key}-${row.id}`}>
                    {c.render(row)}
                  </td>
                ))}
                <td>
                  {rowActions?.map((action: unknown, aIdx: number) => (
                    <button key={aIdx} onClick={() => action.onClick(row)}>
                      {action.label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
});

// 2. Mock Theme
const customTheme = createTheme({ palette: { mode: "light" } });

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("UserList RTL Component", () => {
  let UserList: unknown;

  before(async () => {
    const mod = await import("./UserList");
    UserList = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockUsers = [
    {
      id: "u-1",
      name: "Ahmet",
      surname: "Yilmaz",
      email: "ahmet@example.com",
      role: { name: "Admin" },
    },
    {
      id: "u-2",
      name: "Mehmet",
      surname: "Kaya",
      email: "mehmet@example.com",
      role: { name: "Driver" },
    },
    {
      id: "u-3",
      name: "Ali",
      surname: "Demir",
      email: "ali@example.com",
      role: { name: "Manager" },
    },
    {
      id: "u-4",
      name: "Fatma",
      surname: "Celik",
      email: "fatma@example.com",
      role: { name: "Dispatcher" },
    },
    {
      id: "u-5",
      name: "Ayse",
      surname: "Sahin",
      email: "ayse@example.com",
      role: { name: "Warehouse" },
    },
    {
      id: "u-6",
      name: "Zeynep",
      surname: "Oz",
      email: "zeynep@example.com",
      role: null, // no role -> falls back to the "User" label
    },
  ];

  describe("UserList() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoUsers", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UserList users={[]} loading={false} onSelect={() => {}} />
        </ThemeProvider>
      );

      expect(screen.getByText("No Users Found")).toBeTruthy();
    });

    it("should_RenderUserRows_WithCorrectFullNames", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UserList users={mockUsers} loading={false} onSelect={() => {}} />
        </ThemeProvider>
      );

      // Full name concatenation
      expect(screen.getByText("Ahmet Yilmaz")).toBeTruthy();
      expect(screen.getByText("Mehmet Kaya")).toBeTruthy();
      // Email
      expect(screen.getByText("ahmet@example.com")).toBeTruthy();
    });

    it("should_RenderRoleChips_WithCorrectLabelsForEachRoleType", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UserList users={mockUsers} loading={false} onSelect={() => {}} />
        </ThemeProvider>
      );

      // Each role type maps to the dictionary label
      expect(screen.getByText("Admin")).toBeTruthy();
      expect(screen.getByText("Driver")).toBeTruthy();
      expect(screen.getByText("Manager")).toBeTruthy();
      expect(screen.getByText("Dispatcher")).toBeTruthy();
      expect(screen.getByText("Warehouse")).toBeTruthy();
      // Missing role -> "User" fallback (localized via dict.company.roles)
      expect(screen.getByText("User")).toBeTruthy();
    });

    it("should_CallOnSelect_WhenEditActionClicked", async () => {
      const onSelect = mock.fn();

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UserList users={mockUsers} loading={false} onSelect={onSelect} />
        </ThemeProvider>
      );

      const editBtns = screen.getAllByText("Edit");
      fireEvent.click(editBtns[0]);

      expect(onSelect.mock.calls.length).toBe(1);
      // Should pass the first user's ID
      expect(onSelect.mock.calls[0].arguments[0]).toBe("u-1");
    });

    it("should_RenderTableHeaders_Correctly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <UserList users={mockUsers} loading={false} onSelect={() => {}} />
        </ThemeProvider>
      );

      expect(screen.getByText("Full Name")).toBeTruthy();
      expect(screen.getByText("Email")).toBeTruthy();
      expect(screen.getByText("Role")).toBeTruthy();
    });
  });
});

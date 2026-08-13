 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    yes: "Yes",
    no: "No",
    edit: "Edit",
    delete: "Delete"
  },
  trailers: {
    status: "Status",
    type: "Type",
    coldChain: "Cold Chain",
    plate: "Plate",
    capacity: "Capacity",
    currentVehicle: "Current Vehicle",
    assignToVehicle: "Assign",
    detach: "Detach",
    notAssigned: "Not Assigned",
    title: "Trailers",
    emptyMessage: "No trailers found",
    statuses: { AVAILABLE: "Available", IN_USE: "In Use" },
    types: { FLATBED: "Flatbed", REEFER: "Reefer" }
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../lib/type/enums.ts", {
  namedExports: {
    TrailerStatus: { AVAILABLE: "AVAILABLE", IN_USE: "IN_USE" },
    TrailerType: { FLATBED: "FLATBED", REEFER: "REEFER" },
  }
});

mock.module("../../../ui/DataTable/index.tsx", {
  defaultExport: ({ rows, columns, rowActions, emptyMessage  }: Record<string, unknown>) => (
    <div data-testid="data-table">
      {rows.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((c: Record<string, unknown>) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: unknown, i: number) => (
              <tr key={i}>
                {columns.map((c: Record<string, unknown>) => (
                  <td key={c.key} data-testid={`cell-${c.key}`}>
                    {c.render(row)}
                  </td>
                ))}
                <td>
                  {rowActions?.map((action: unknown, aIdx: number) => {
                    const isHidden = action.hidden ? action.hidden(row) : false;
                    if (isHidden) return null;
                    return (
                      <button key={aIdx} onClick={() => action.onClick(row)}>
                        {action.label}
                      </button>
                    );
                  })}
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
const customTheme = createTheme({
  palette: { mode: "light" }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("TrailerTable RTL Component", () => {
  let TrailerTable: unknown;

  before(async () => {
    const mod = await import("./index");
    TrailerTable = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockTrailers = [
    {
      id: "trl-1",
      plate: "34 TR 123",
      fleetNo: "F-001",
      type: "REEFER",
      isColdChain: true,
      capacityVolumeM3: 50,
      status: "AVAILABLE",
      currentVehicle: null,
    },
    {
      id: "trl-2",
      plate: "06 TR 456",
      fleetNo: "F-002",
      type: "FLATBED",
      isColdChain: false,
      capacityVolumeM3: 40,
      status: "IN_USE",
      currentVehicle: { plate: "34 ABC 123" },
    }
  ];

  describe("TrailerTable() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoTrailers", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <TrailerTable trailers={[]} loading={false} onEdit={() => {}} onDelete={() => {}} onAssign={() => {}} onDetach={() => {}} />
        </ThemeProvider>
      );

      expect(screen.getByText("No trailers found")).toBeTruthy();
    });

    it("should_RenderTrailerRows_Properly", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <TrailerTable trailers={mockTrailers} loading={false} onEdit={() => {}} onDelete={() => {}} onAssign={() => {}} onDetach={() => {}} />
        </ThemeProvider>
      );

      // Plate & Fleet
      expect(screen.getByText("34 TR 123")).toBeTruthy();
      expect(screen.getByText("F-001")).toBeTruthy();

      // Type & Badge (Reefer string should be matched via Dict mock)
      expect(screen.getByText("Reefer")).toBeTruthy();
      
      // Capacity
      expect(screen.getByText("50 m³")).toBeTruthy();
      
      // Status
      expect(screen.getByText("Available")).toBeTruthy();

      // Current Vehicle
      expect(screen.getByText("Not Assigned")).toBeTruthy();
      expect(screen.getByText("34 ABC 123")).toBeTruthy();
    });

    it("should_TriggerRowActions_WhenClicked", async () => {
      const onEdit = mock.fn();
      const onDelete = mock.fn();
      const onAssign = mock.fn();
      const onDetach = mock.fn();

      render(
        <ThemeProvider theme={customTheme}>
          <TrailerTable 
            trailers={mockTrailers} 
            loading={false} 
            onEdit={onEdit} 
            onDelete={onDelete} 
            onAssign={onAssign} 
            onDetach={onDetach} 
          />
        </ThemeProvider>
      );

      // trl-1 is AVAILABLE, so Assign button is visible, Detach is hidden.
      const assignBtns = screen.getAllByText("Assign");
      expect(assignBtns.length).toBe(1);
      fireEvent.click(assignBtns[0]);
      expect(onAssign.mock.calls.length).toBe(1);

      // trl-2 is IN_USE, so Detach button is visible, Assign is hidden.
      const detachBtns = screen.getAllByText("Detach");
      expect(detachBtns.length).toBe(1);
      fireEvent.click(detachBtns[0]);
      expect(onDetach.mock.calls.length).toBe(1);

      const editBtns = screen.getAllByText("Edit");
      fireEvent.click(editBtns[0]);
      expect(onEdit.mock.calls.length).toBe(1);
    });
  });
});

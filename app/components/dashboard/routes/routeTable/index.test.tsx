 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const useDictionaryMock = mock.fn(() => ({
  common: { details: "Details", edit: "Edit", delete: "Delete", unassigned: "Unassigned", na: "N/A" },
  routes: {
    table: {
      columns: {
        routeId: "Route ID",
        vehiclePlate: "Vehicle",
        origin: "Origin",
        destination: "Destination",
        eta: "ETA",
        status: "Status",
      },
      actions: { activate: "Activate", complete: "Complete" },
      noRoutes: "No Routes",
      title: "Routes",
    },
    toasts: { updateSuccess: "Route updated to {status}", updateError: "Failed to update" },
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useDateSettings.ts", {
  namedExports: { useDateSettings: mock.fn(() => ({})) },
});

mock.module("../../../../lib/utils/date.ts", {
  namedExports: { formatDisplayDateTime: mock.fn(() => "31/05/2026 14:00") },
});

mock.module("../../../../lib/type/enums.ts", {
  namedExports: { RouteStatus: { PLANNED: "PLANNED", ACTIVE: "ACTIVE", COMPLETED: "COMPLETED" } }
});

const mockUpdateRouteStatus = mock.fn();
mock.module("../../../../hooks/useRoutes.ts", {
  namedExports: {
    useRouteMutations: mock.fn(() => ({
      updateRouteStatus: { mutate: mockUpdateRouteStatus, isPending: false },
    })),
  }
});

mock.module("../../../../lib/priorityColor.ts", {
  namedExports: {
    getStatusMeta: mock.fn((_status: string, _dict: unknown) => ({ label: "Active" }))
  }
});

mock.module("sonner", {
  namedExports: { toast: { success: mock.fn(), error: mock.fn() } }
});

mock.module("../../../chips/statusChips.tsx", {
  namedExports: {
    StatusChip: ({ status  }: Record<string, unknown>) => <span data-testid={`status-chip-${status}`}>{status}</span>
  }
});

mock.module("../../../dialogs/routes/index.tsx", {
  defaultExport: ({ open, onClose  }: Record<string, unknown>) => open ? (
    <div data-testid="route-details-dialog">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
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

// 2. Theme
const customTheme = createTheme({ palette: { mode: "light" } });

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("RouteTable RTL Component", () => {
  let RouteTable: unknown;

  before(async () => {
    const mod = await import("./index");
    RouteTable = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockUpdateRouteStatus.mock.resetCalls();
  });

  const mockRoutes = [
    {
      id: "rt-1",
      name: "Route Alpha",
      status: "PLANNED",
      vehicle: { plate: "34 ABC 123" },
      stops: [{ address: "Istanbul" }, { address: "Ankara" }],
      endTime: new Date().toISOString(),
    },
    {
      id: "rt-2",
      name: "Route Beta",
      status: "ACTIVE",
      vehicle: null,
      stops: [],
      endTime: null,
    }
  ];

  const mockOnEdit = mock.fn();
  const mockOnDelete = mock.fn();
  const mockOnSelect = mock.fn();
  const mockOnRefresh = mock.fn();

  describe("RouteTable() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoRoutes", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={[]} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </ThemeProvider>
      );
      expect(screen.getByText("No Routes")).toBeTruthy();
    });

    it("should_RenderRouteRows_WithCorrectData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={mockRoutes} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </ThemeProvider>
      );

      expect(screen.getByText("Route Alpha")).toBeTruthy();
      expect(screen.getByText("34 ABC 123")).toBeTruthy();
      expect(screen.getByText("Istanbul")).toBeTruthy();
      expect(screen.getByText("Ankara")).toBeTruthy();
      expect(screen.getByText("31/05/2026 14:00")).toBeTruthy();

      // Route Beta — null fallbacks
      expect(screen.getByText("Route Beta")).toBeTruthy();
      expect(screen.getByText("Unassigned")).toBeTruthy();
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("should_ShowActivateAction_ForPlannedRoute_AndHideForActive", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={mockRoutes} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} onRefresh={mockOnRefresh} />
        </ThemeProvider>
      );

      // PLANNED → "Activate" visible, "Complete" hidden
      expect(screen.getByText("Activate")).toBeTruthy();
      // ACTIVE → "Complete" visible, "Activate" hidden
      expect(screen.getByText("Complete")).toBeTruthy();
    });

    it("should_OpenDetailsDialog_WhenDetailsClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={mockRoutes} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </ThemeProvider>
      );

      const detailBtns = screen.getAllByText("Details");
      fireEvent.click(detailBtns[0]);

      expect(screen.getByTestId("route-details-dialog")).toBeTruthy();
      expect(mockOnSelect.mock.calls.length).toBe(1);
      expect(mockOnSelect.mock.calls[0].arguments[0]).toBe("rt-1");
    });

    it("should_CallStatusUpdate_WhenActivateClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={mockRoutes} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} onRefresh={mockOnRefresh} />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Activate"));

      await waitFor(() => {
        expect(mockUpdateRouteStatus.mock.calls.length).toBe(1);
        expect(mockUpdateRouteStatus.mock.calls[0].arguments[0]).toEqual({ id: "rt-1", status: "ACTIVE" });
      });
    });

    it("should_TriggerEditAndDelete_WhenClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <RouteTable routes={mockRoutes} loading={false} onSelect={mockOnSelect} onEdit={mockOnEdit} onDelete={mockOnDelete} />
        </ThemeProvider>
      );

      fireEvent.click(screen.getAllByText("Edit")[0]);
      expect(mockOnEdit.mock.calls.length).toBe(1);
      expect(mockOnEdit.mock.calls[0].arguments[0]).toBe("rt-1");

      fireEvent.click(screen.getAllByText("Delete")[0]);
      expect(mockOnDelete.mock.calls.length).toBe(1);
      expect(mockOnDelete.mock.calls[0].arguments[0]).toBe("rt-1");
    });
  });
});

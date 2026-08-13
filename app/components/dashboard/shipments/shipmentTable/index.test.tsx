 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const useDictionaryMock = mock.fn(() => ({
  common: { details: "Details", edit: "Edit", delete: "Delete" },
  shipments: {
    table: {
      columns: {
        code: "Code",
        status: "Status",
        customer: "Customer",
        created: "Created",
        destination: "Destination",
        driver: "Driver",
        route: "Route",
        items: "Items",
      },
      noShipments: "No Shipments",
      searchPlaceholder: "Search...",
      title: "Shipments",
    },
    statuses: { DELIVERED: "Delivered", IN_TRANSIT: "In Transit" },
    dialogs: { updateStatusTitle: "Update status" },
  }
}));

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../../../hooks/useDateSettings.ts", {
  namedExports: { useDateSettings: mock.fn(() => ({})) },
});

mock.module("../../../../lib/utils/date.ts", {
  namedExports: { formatDisplayDate: mock.fn(() => "31/05/2026") },
});

mock.module("../../../../lib/type/enums.ts", {
  namedExports: {
    ShipmentStatus: {
      PENDING: "PENDING",
      PROCESSING: "PROCESSING",
      ASSIGNED: "ASSIGNED",
      IN_TRANSIT: "IN_TRANSIT",
      DELIVERED: "DELIVERED",
      FAILED: "FAILED",
      RETURNED: "RETURNED",
      DELAYED: "DELAYED",
      CANCELLED: "CANCELLED",
    },
  }
});

mock.module("../../../chips/statusChips.tsx", {
  namedExports: {
    StatusChip: ({ status  }: Record<string, unknown>) => <span data-testid={`status-chip-${status}`}>{status}</span>
  }
});

mock.module("../../../dialogs/shipment/shipmentDetailDialog.tsx", {
  defaultExport: ({ open, onClose  }: Record<string, unknown>) => open ? (
    <div data-testid="detail-dialog">
      <button onClick={onClose as () => void}>Close</button>
    </div>
  ) : null,
});

mock.module("../../../dialogs/shipment/statusUpdateDialog.tsx", {
  defaultExport: ({ open }: Record<string, unknown>) =>
    open ? <div data-testid="status-dialog" /> : null,
});

mock.module("../../../../hooks/useShipments.ts", {
  namedExports: {
    useShipmentMutations: () => ({
      updateShipmentStatus: {
        mutateAsync: async () => {},
        isPending: false,
      },
    }),
  },
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

// 2. Theme
const customTheme = createTheme({ palette: { mode: "light" } });

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("ShipmentTable RTL Component", () => {
  let ShipmentTable: unknown;

  before(async () => {
    const mod = await import("./index");
    ShipmentTable = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockShipments = [
    {
      id: "shp-1",
      trackingId: "TRK-001",
      status: "DELIVERED",
      customer: { name: "Acme Corp" },
      createdAt: new Date().toISOString(),
      destination: "Istanbul, TR",
      driver: { user: { name: "Ahmet", surname: "Yilmaz" } },
      route: { name: "Route A" },
      routeId: "rt-1",
      itemsCount: 5,
    },
    {
      id: "shp-2",
      trackingId: "TRK-002",
      status: "IN_TRANSIT",
      customer: null,
      createdAt: new Date().toISOString(),
      destination: "Ankara, TR",
      driver: null,
      route: null,
      routeId: null,
      itemsCount: 3,
    }
  ];

  const mockState = { shipments: mockShipments, loading: false, filters: {} };
  const mockActions = {
    selectShipment: mock.fn(),
    onEdit: mock.fn(),
    onDelete: mock.fn(),
    updateFilters: mock.fn(),
  };

  describe("ShipmentTable() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoShipments", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentTable
            state={{ shipments: [], loading: false, filters: {} }}
            actions={mockActions}
          />
        </ThemeProvider>
      );
      expect(screen.getByText("No Shipments")).toBeTruthy();
    });

    it("should_RenderShipmentRows_WithCorrectData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentTable state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Tracking IDs
      expect(screen.getByText("TRK-001")).toBeTruthy();
      expect(screen.getByText("TRK-002")).toBeTruthy();

      // Customer (null falls back to "-")
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);

      // Destination
      expect(screen.getByText("Istanbul, TR")).toBeTruthy();
      expect(screen.getByText("Ankara, TR")).toBeTruthy();

      // Driver (null shows "-")
      expect(screen.getByText("Ahmet Yilmaz")).toBeTruthy();

      // Route
      expect(screen.getByText("Route A")).toBeTruthy();

      // Items count
      expect(screen.getByText("5")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();

      // Date (mocked)
      expect(screen.getAllByText("31/05/2026").length).toBeGreaterThan(0);
    });

    it("should_TriggerRowActions_WhenClicked", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentTable state={mockState} actions={mockActions} />
        </ThemeProvider>
      );

      // Details -> opens dialog & calls selectShipment
      const detailBtns = screen.getAllByText("Details");
      fireEvent.click(detailBtns[0]);
      expect(mockActions.selectShipment.mock.calls.length).toBe(1);
      expect(mockActions.selectShipment.mock.calls[0].arguments[0]).toBe("shp-1");

      // Detail dialog should now be visible
      expect(screen.getByTestId("detail-dialog")).toBeTruthy();

      // Edit
      const editBtns = screen.getAllByText("Edit");
      fireEvent.click(editBtns[0]);
      expect(mockActions.onEdit.mock.calls.length).toBe(1);
      expect(mockActions.onEdit.mock.calls[0].arguments[0]).toBe("shp-1");

      // Delete
      const deleteBtns = screen.getAllByText("Delete");
      fireEvent.click(deleteBtns[0]);
      expect(mockActions.onDelete.mock.calls.length).toBe(1);
      expect(mockActions.onDelete.mock.calls[0].arguments[0]).toBe("shp-1");
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks
const mockDict = {
  drivers: {
    table: {
      columns: {
        idx: "#",
        name: "Name",
        status: "Status",
        phone: "Phone",
        vehicle: "Vehicle",
        homebase: "Homebase",
        license: "License",
        safetyScore: "Safety Score",
      },
      noVehicle: "No Vehicle",
      notAssigned: "Not Assigned",
      noDrivers: "No drivers found",
      title: "Drivers Table",
      searchPlaceholder: "Search...",
    },
    actions: {
      details: "Details",
      edit: "Edit",
      delete: "Delete",
    },
    filters: {
      status: "Status",
      vehicle: "Vehicle",
      assigned: "Assigned",
      unassigned: "Unassigned",
    },
    onDuty: "On Duty",
    offDuty: "Off Duty",
    onLeave: "On Leave",
  },
};

mock.module("../../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

// Mock StatusChip
mock.module("../../../chips/statusChips.tsx", {
  namedExports: {
    StatusChip: ({ status  }: Record<string, unknown>) => <span data-testid="status-chip">{status}</span>,
  },
});

// Mock DataTable
let dataTableProps: unknown = null;
mock.module("../../../ui/DataTable/index.tsx", {
  defaultExport: (props: Record<string, unknown>) => {
    dataTableProps = props;
    return (
      <div data-testid="data-table">
        <div data-testid="empty-message">{props.emptyMessage}</div>
      </div>
    );
  },
});

describe("DriverTable RTL Component", () => {
  let DriverTable: unknown;

  before(async () => {
    const mod = await import("./index");
    DriverTable = mod.default;
  });

  afterEach(() => {
    cleanup();
    dataTableProps = null;
  });

  const mockDrivers = [
    {
      id: "d1",
      user: { name: "John", surname: "Doe" },
      status: "ON_JOB",
      phone: "+123456789",
      currentVehicle: { plate: "ABC-123" },
      homeBaseWarehouse: { name: "Main WH" },
      licenseType: "Class A",
      safetyScore: 98,
    },
    {
      id: "d2",
      user: { name: "Jane", surname: "Smith" },
      status: "OFF_DUTY",
      phone: "+987654321",
      currentVehicle: null,
      homeBaseWarehouse: null,
      licenseType: "Class B",
      safetyScore: 95,
    },
  ];

  describe("DriverTable() bileşeni", () => {
    it("should_PassPropsToDataTable", async () => {
      render(
        <DriverTable
          drivers={mockDrivers}
          onDriverSelect={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      expect(screen.getByTestId("data-table")).toBeTruthy();
      expect(screen.getByTestId("empty-message").textContent).toBe("No drivers found");

      expect(dataTableProps).not.toBeNull();
      expect(dataTableProps.rows.length).toBe(2);
      expect(dataTableProps.columns.length).toBe(8);
      expect(dataTableProps.tableTitle).toBe("Drivers Table");
    });

    it("should_FormatColumnsCorrectly", async () => {
      render(
        <DriverTable
          drivers={mockDrivers}
          onDriverSelect={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const columns = dataTableProps.columns;

      // 1. name
      const nameCol = columns.find((c: Record<string, unknown>) => c.key === "name");
      const { container: nameContainer } = render(nameCol.render(mockDrivers[0]));
      expect(nameContainer.textContent).toContain("John Doe");

      // 2. status
      const statusCol = columns.find((c: Record<string, unknown>) => c.key === "status");
      const { container: statusContainer } = render(statusCol.render(mockDrivers[0]));
      expect(statusContainer.textContent).toBe("ON_JOB");

      // 3. vehicle
      const vehicleCol = columns.find((c: Record<string, unknown>) => c.key === "vehicle");
      expect(vehicleCol.render(mockDrivers[0])).toBe("ABC-123");
      expect(vehicleCol.render(mockDrivers[1])).toBe("No Vehicle");

      // 4. homeBaseWarehouse
      const homeBaseCol = columns.find((c: Record<string, unknown>) => c.key === "homeBaseWarehouse");
      expect(homeBaseCol.render(mockDrivers[0])).toBe("Main WH");
      expect(homeBaseCol.render(mockDrivers[1])).toBe("Not Assigned");

      // 5. idx
      const idxCol = columns.find((c: Record<string, unknown>) => c.key === "id");
      expect(idxCol.render(mockDrivers[0])).toBe(1);
      expect(idxCol.render(mockDrivers[1])).toBe(2);
    });

    it("should_BindRowActionsCorrectly", async () => {
      const onDriverSelect = mock.fn();
      const onEdit = mock.fn();
      const onDelete = mock.fn();

      render(
        <DriverTable
          drivers={mockDrivers}
          onDriverSelect={onDriverSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const rowActions = dataTableProps.rowActions;

      // Details
      rowActions[0].onClick(mockDrivers[0]);
      expect(onDriverSelect.mock.calls.length).toBe(1);
      expect(onDriverSelect.mock.calls[0].arguments[0]).toBe("d1");

      // Edit
      rowActions[1].onClick(mockDrivers[0]);
      expect(onEdit.mock.calls.length).toBe(1);
      expect(onEdit.mock.calls[0].arguments[0]).toBe(mockDrivers[0]);

      // Delete
      rowActions[2].onClick(mockDrivers[0]);
      expect(onDelete.mock.calls.length).toBe(1);
      expect(onDelete.mock.calls[0].arguments[0]).toBe("d1");
    });
  });
});

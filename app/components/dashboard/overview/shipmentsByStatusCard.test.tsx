 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockDict = {
  dashboard: {
    overview: {
      shipmentsByStatus: {
        title: "Shipments by Status",
        noShipments: "No shipments",
        total: "Total",
      },
    },
  },
  shipments: {
    statuses: {
      PENDING: "Pending",
      ASSIGNED: "Assigned",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
      DELAYED: "Delayed",
      CANCELLED: "Cancelled",
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

mock.module("@mui/x-charts/hooks", {
  namedExports: {
    useDrawingArea: () => ({ width: 100, height: 100, left: 0, top: 0 }),
  },
});

mock.module("@mui/x-charts", {
  namedExports: {
    PieChart: ({ series, children  }: Record<string, unknown>) => (
      <div data-testid="pie-chart">
        {series?.[0]?.data?.map((d: Record<string, unknown>) => (
          <div key={d.id} data-testid={`pie-slice-${d.label}`}>
            {d.value}
          </div>
        ))}
        {children}
      </div>
    ),
  },
});

// Custom theme
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

(customTheme.palette as unknown).kpi = {
  sky: "#2196f3",
  cyan: "#00bcd4",
  indigo: "#3f51b5",
  emerald: "#4caf50",
  error: "#f44336",
};
(customTheme.palette as unknown).error = { main: "#f44336" };

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("ShipmentOnStatusCard RTL Component", () => {
  let ShipmentOnStatusCard: unknown;

  before(async () => {
    const mod = await import("./shipmentsByStatusCard");
    ShipmentOnStatusCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("ShipmentOnStatusCard() bileşeni", () => {
    it("should_ReturnNull_WhenValuesIsNull", async () => {
      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <ShipmentOnStatusCard values={null as unknown} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderEmptyState_WhenValuesIsEmptyArray", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentOnStatusCard values={[]} />
        </ThemeProvider>
      );
      expect(screen.getByText("Shipments by Status")).toBeTruthy();
      expect(screen.getByText("No shipments")).toBeTruthy();
    });

    it("should_RenderPieChart_WithGroupedStatuses", async () => {
      // PROCESSING maps to PENDING, COMPLETED maps to DELIVERED, FAILED maps to CANCELLED
      const mockValues = ["PENDING", "PROCESSING", "IN_TRANSIT", "COMPLETED", "FAILED"];
      
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentOnStatusCard values={mockValues} />
        </ThemeProvider>
      );

      expect(screen.getByTestId("pie-chart")).toBeTruthy();
      
      // PENDING + PROCESSING = 2
      expect(screen.getByTestId("pie-slice-Pending").textContent).toBe("2");
      // IN_TRANSIT = 1
      expect(screen.getByTestId("pie-slice-In Transit").textContent).toBe("1");
      // COMPLETED = 1 -> DELIVERED
      expect(screen.getByTestId("pie-slice-Delivered").textContent).toBe("1");
      // FAILED = 1 -> CANCELLED
      expect(screen.getByTestId("pie-slice-Cancelled").textContent).toBe("1");

      // Total center label should be 5
      expect(screen.getByText("5")).toBeTruthy();
      expect(screen.getByText("Total")).toBeTruthy();
    });
  });
});

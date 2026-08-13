 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts
const useDictionaryMock = mock.fn(() => ({
  common: {
    noData: "N/A",
  },
  shipments: {
    details: {
      systemConsignmentId: "System ID",
      assignmentDetails: "Assignment Details",
      noDriverAssigned: "No Driver",
      missionPath: "Mission Path",
      pickupOrigin: "Origin",
      finalDelivery: "Final Delivery",
      consignmentSpecs: "Specs",
      quantity: "Quantity",
      units: "Units",
      grossWeight: "Gross Weight",
      kg: "kg",
      customerEntity: "Customer",
      clientPartner: "Client",
      directConsignment: "Direct Consignment",
      oneTimeService: "One time",
      tabs: {
        overview: "Overview",
        items: "Items",
      },
      itemsTab: {
        totalItems: "Total Items",
        totalWeight: "Total Weight",
        noItems: "No Items",
        itemCode: "Item Code",
        skuCode: "SKU",
      },
    },
    dialogs: {
      sections: {
        stop: "Stop",
      },
    },
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

// 2. Mock framer-motion to bypass animations
mock.module("framer-motion", {
  namedExports: {
    motion: {
      div: ({ children, "data-testid": testId, id }: unknown) => <div id={id} data-testid={testId || "motion-div"}>{children}</div>,
    },
    AnimatePresence: ({ children  }: Record<string, unknown>) => <>{children}</>,
  },
});

// 3. Mock External Components
mock.module("../../chips/statusChips.tsx", {
  namedExports: { StatusChip: () => <div data-testid="status-chip" /> },
});

mock.module("../../cards/driverCard.tsx", {
  defaultExport: () => <div data-testid="driver-card" />,
});

mock.module("../routes/map.tsx", {
  defaultExport: () => <div data-testid="map-routes" />,
});

// 4. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
    common: { white_alpha: { main_08: "rgba()" } } as unknown,
    background: { paper_alpha: { main_90: "rgba()" }, paper: "#fff", default: "#fafafa" } as unknown,
  }
});
(customTheme.palette.primary as unknown)._alpha = { main_30: "rgba()", main_40: "rgba()", main_02: "rgba()", main_05: "rgba()", main_08: "rgba()", main_10: "rgba()", main_15: "rgba()", main_20: "rgba()", main_25: "rgba()" };
(customTheme.palette.secondary as unknown)._alpha = { main_30: "rgba()" };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("ShipmentDetailDialog RTL Component", () => {
  let ShipmentDetailDialog: unknown;

  before(async () => {
    const mod = await import("./shipmentDetailDialog");
    ShipmentDetailDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("ShipmentDetailDialog() bileşeni", () => {
    it("should_RenderDialogElements_WhenOpen", async () => {
      // Arrange
      const mockShipment = {
        id: "s1",
        trackingId: "TRK-999",
        status: "IN_TRANSIT",
        origin: "Warehouse Alpha",
        destination: "Customer Beta",
        itemsCount: 5,
        weightKg: 100,
        driver: null,
        customer: null,
        items: [
          { id: "i1", sku: "SKU-1", name: "Box", quantity: 5, weightKg: 20 }
        ],
        stops: []
      };

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentDetailDialog open={true} onClose={() => {}} shipment={mockShipment} />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByText(/TRK-999/i)).toBeTruthy();
      expect(screen.getByText(/Overview/i)).toBeTruthy();
      expect(screen.getByText(/Items/i)).toBeTruthy();
      
      // Values rendered inside the overview tab
      expect(screen.getByText(/Warehouse Alpha/i)).toBeTruthy();
      expect(screen.getByText(/Customer Beta/i)).toBeTruthy();
      
      // Status chip mock should be mounted
      expect(screen.getByTestId("status-chip")).toBeTruthy();
    });
  });
});

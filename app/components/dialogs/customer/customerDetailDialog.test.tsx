 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  common: {
    close: "Close",
    contactInfo: "Contact Info",
    noEmail: "No Email",
    noPhone: "No Phone",
    na: "N/A",
    recent: "Recent",
  },
  industries: {
    technology: "Technology",
  },
  customers: {
    dialogs: {
      errorAdd: "Error occurred",
    },
    industryGeneral: "General",
    customerNotFound: "Customer Not Found",
    registeredLocations: "Registered Locations",
    totalShipments: "Total Shipments",
    recentShipments: "Recent Shipments",
    noRecentShipments: "No Recent Shipments",
    records: "Records",
    fields: {
      isDefault: "Default",
      taxId: "Tax ID / VKN",
    },
    noLocations: "No Locations",
  },
  routes: {
    statuses: {
      PENDING: "Pending",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const mockCustomer = {
  id: "cust-1",
  name: "Acme Corp",
  code: "CUST-001",
  industry: "Technology",
  email: "contact@acme.com",
  phone: "123-456-7890",
  taxId: "TAX-12345",
  locations: [
    {
      id: "loc-1",
      name: "Main HQ",
      address: "123 Main St",
      isDefault: true,
    }
  ],
  shipments: [
    {
      id: "ship-1",
      trackingId: "TRK-001",
      status: "PENDING",
      origin: "123 Main St",
      destination: "456 Market St",
    }
  ]
};

mock.module("../../../lib/controllers/customer.ts", {
  namedExports: { 
    getCustomerById: mock.fn(async () => mockCustomer)
  },
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2", dark: "#115293" } as unknown,
    secondary: { main: "#9c27b0", dark: "#7b1fa2" } as unknown,
  }
});

const mockAlpha = { main_02: "rgba()", main_05: "rgba()", main_10: "rgba()", main_20: "rgba()" };
(customTheme.palette.primary as unknown)._alpha = mockAlpha;
(customTheme.palette.secondary as unknown)._alpha = mockAlpha;
(customTheme.palette as unknown).divider_alpha = mockAlpha;
(customTheme.palette.background as unknown).paper_alpha = mockAlpha;
(customTheme.palette.common as unknown) = { black_alpha: mockAlpha, white_alpha: { main_70: "rgba()" } };

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("CustomerDetailDialog RTL Component", () => {
  let CustomerDetailDialog: unknown;

  before(async () => {
    const mod = await import("./customerDetailDialog");
    CustomerDetailDialog = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("CustomerDetailDialog() bileşeni", () => {
    it("should_LoadAndRenderCustomerDetails_WhenIdProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerDetailDialog open={true} onClose={() => {}} customerId="cust-1" />
        </ThemeProvider>
      );

      // Assert that loading state disappears and data shows up
      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeTruthy();
        expect(screen.getByText("CUST-001")).toBeTruthy();
        expect(screen.getAllByText("contact@acme.com").length).toBeGreaterThan(0);
        expect(screen.getByText("Main HQ")).toBeTruthy();
        expect(screen.getByText("TRK-001")).toBeTruthy();
      });
    });
  });
});

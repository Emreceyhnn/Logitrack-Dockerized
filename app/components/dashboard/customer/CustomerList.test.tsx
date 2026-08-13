 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const mockDict = {
  common: { tooltips: { actions: "Actions" } },
  customers: {
    industryGeneral: "General",
    fields: { address: "Address", phone: "Phone" },
    list: {
      noAddress: "No Address",
      na: "N/A",
      shipmentsCount: "{count} Shipments",
      noCustomers: "No customers found",
    },
    actions: { details: "Details", edit: "Edit", delete: "Delete" },
  },
  industries: {
    logistics: "Logistics",
    retail: "Retail",
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// Custom theme with alpha tokens and kpi palette
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

Object.assign((customTheme.palette.text as unknown), {
  primary_alpha: { main_10: "rgba(0,0,0,0.1)", main_05: "rgba(0,0,0,0.05)" }
});
Object.assign((customTheme.palette.primary as unknown), {
  _alpha: { main_10: "rgba(25,118,210,0.1)", main_08: "rgba(25,118,210,0.08)", main_20: "rgba(25,118,210,0.2)" }
});

(customTheme.palette as unknown).divider_alpha = { main_10: "rgba(0,0,0,0.1)" };
(customTheme.palette as unknown).kpi = {
  indigo: "#6366f1", indigo_alpha: { main_20: "rgba(99,102,241,0.2)" },
  sky: "#0ea5e9", sky_alpha: { main_20: "rgba(14,165,233,0.2)" },
  emerald: "#10b981", emerald_alpha: { main_20: "rgba(16,185,129,0.2)" },
  amber: "#f59e0b", amber_alpha: { main_20: "rgba(245,158,11,0.2)" },
  pink: "#ec4899", pink_alpha: { main_20: "rgba(236,72,153,0.2)" },
  violet: "#8b5cf6", violet_alpha: { main_20: "rgba(139,92,246,0.2)" },
  cyan: "#06b6d4", cyan_alpha: { main_20: "rgba(6,182,212,0.2)" },
};

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("CustomerList RTL Component", () => {
  let CustomerList: unknown;

  before(async () => {
    const mod = await import("./CustomerList");
    CustomerList = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockCustomers = [
    {
      id: "c1",
      name: "Acme Corp",
      code: "CUST-001",
      industry: "Logistics & Transportation",
      phone: "123-456-7890",
      locations: [{ isDefault: true, address: "123 Main St" }],
      _count: { shipments: 5 },
    },
    {
      id: "c2",
      name: "Global Trade",
      code: "CUST-002",
      industry: "Retail & E-commerce",
      phone: null,
      locations: [],
      _count: { shipments: 0 },
    },
  ];

  describe("CustomerList() bileşeni", () => {
    it("should_RenderSkeletons_WhenLoadingIsTrue", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList customers={[]} onSelect={() => {}} loading={true} />
        </ThemeProvider>
      );
      // CustomCard is rendered
      expect(screen.getByTestId("custom-card")).toBeTruthy();
      // Should not see any customer names
      expect(screen.queryByText("Acme Corp")).toBeNull();
    });

    it("should_RenderEmptyState_WhenNoCustomers", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList customers={[]} onSelect={() => {}} loading={false} />
        </ThemeProvider>
      );
      expect(screen.getByText("No customers found")).toBeTruthy();
    });

    it("should_RenderCustomers_WithMappedData", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList customers={mockCustomers} onSelect={() => {}} loading={false} />
        </ThemeProvider>
      );
      
      // First customer
      expect(screen.getByText("Acme Corp")).toBeTruthy();
      expect(screen.getByText("123 Main St")).toBeTruthy();
      expect(screen.getByText("123-456-7890")).toBeTruthy();
      // mapped industry: Logistics & Transportation -> Logistics
      expect(screen.getByText(/CUST-001 • Logistics/)).toBeTruthy();
      expect(screen.getByText("5 Shipments")).toBeTruthy();

      // Second customer (empty fallbacks)
      expect(screen.getByText("Global Trade")).toBeTruthy();
      expect(screen.getByText("No Address")).toBeTruthy();
      expect(screen.getByText("N/A")).toBeTruthy();
      expect(screen.getByText(/CUST-002 • Retail/)).toBeTruthy();
      expect(screen.getByText("0 Shipments")).toBeTruthy();
    });

    it("should_CallOnSelect_WhenCustomerClicked", async () => {
      const onSelect = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList customers={mockCustomers} onSelect={onSelect} loading={false} />
        </ThemeProvider>
      );

      // Box wrapper has onClick, we can trigger by clicking the customer name which propagates
      fireEvent.click(screen.getByText("Acme Corp"));
      expect(onSelect.mock.calls.length).toBe(1);
      expect(onSelect.mock.calls[0].arguments[0]).toBe("c1");
    });

    it("should_OpenMenuAndTriggerActions", async () => {
      const onSelect = mock.fn();
      const onEdit = mock.fn();
      const onDelete = mock.fn();

      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList
            customers={mockCustomers}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            loading={false}
          />
        </ThemeProvider>
      );

      // Find MoreVertIcon buttons
      const menuButtons = screen.getAllByTestId("MoreVertIcon");
      expect(menuButtons.length).toBe(2);

      // Click first customer menu
      fireEvent.click(menuButtons[0]);

      // Menu is open
      expect(screen.getByText("Details")).toBeTruthy();
      expect(screen.getByText("Edit")).toBeTruthy();
      expect(screen.getByText("Delete")).toBeTruthy();

      // Click Edit
      fireEvent.click(screen.getByText("Edit"));
      expect(onEdit.mock.calls.length).toBe(1);
      expect(onEdit.mock.calls[0].arguments[0].id).toBe("c1");

      // Menu should be closed. Re-open to click Delete
      fireEvent.click(menuButtons[0]);
      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete.mock.calls.length).toBe(1);
      expect(onDelete.mock.calls[0].arguments[0].id).toBe("c1");
    });

    it("should_RenderPagination_WhenMetaIsProvided", async () => {
      const onPageChange = mock.fn();
      render(
        <ThemeProvider theme={customTheme}>
          <CustomerList
            customers={mockCustomers}
            onSelect={() => {}}
            loading={false}
            meta={{ page: 1, limit: 10, total: 25 }}
            onPageChange={onPageChange}
          />
        </ThemeProvider>
      );

      // Meta: 25 total, 10 limit => 3 pages.
      expect(screen.getByRole("navigation")).toBeTruthy();
      // Click page 2
      fireEvent.click(screen.getByLabelText("Go to page 2"));
      expect(onPageChange.mock.calls.length).toBe(1);
      expect(onPageChange.mock.calls[0].arguments[0]).toBe(2);
    });
  });
});

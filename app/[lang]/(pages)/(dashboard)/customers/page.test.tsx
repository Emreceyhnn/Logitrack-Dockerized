 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 1. Mock Server-Side Data Fetching
const mockGetCustomersWithDashboardData = mock.fn(async () => ({
  customers: [],
}));

mock.module("../../../../lib/controllers/customer.ts", {
  namedExports: { getCustomersWithDashboardData: mockGetCustomersWithDashboardData },
});

// 2. Mock Components
mock.module("./components/CustomerContent.tsx", {
  defaultExport: () => <div data-testid="customer-content">Customer Content</div>,
});

describe("CustomersPage Component", () => {
  let CustomersPage: unknown;

  before(async () => {
    const mod = await import("./page");
    CustomersPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetCustomersWithDashboardData.mock.resetCalls();
  });

  describe("CustomersPage() Render Testleri", () => {
    it("should_RenderCustomerContent_WithHydratedState", async () => {
      // Act
      const PageComponent = await CustomersPage();
      render(
        <QueryClientProvider client={new QueryClient()}>
          {PageComponent}
        </QueryClientProvider>
      );

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("customer-content")).toBeTruthy();
      });

      // Verify server side prefetching was called
      expect(mockGetCustomersWithDashboardData.mock.calls.length).toBe(1);
    });
  });
});

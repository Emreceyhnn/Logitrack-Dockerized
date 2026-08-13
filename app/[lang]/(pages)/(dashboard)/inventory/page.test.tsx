 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 1. Mock Server-Side Data Fetching
const mockGetInventoryWithDashboardData = mock.fn(async () => ({
  items: [],
}));

mock.module("../../../../lib/controllers/inventory.ts", {
  namedExports: { getInventoryWithDashboardData: mockGetInventoryWithDashboardData },
});

// 2. Mock Components
mock.module("./components/InventoryContent.tsx", {
  defaultExport: () => <div data-testid="inventory-content">Inventory Content</div>,
});

describe("InventoryPage Component", () => {
  let InventoryPage: unknown;

  before(async () => {
    const mod = await import("./page");
    InventoryPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetInventoryWithDashboardData.mock.resetCalls();
  });

  describe("InventoryPage() Render Testleri", () => {
    it("should_RenderInventoryContent_WithHydratedState", async () => {
      // Act
      const PageComponent = await InventoryPage();
      render(
        <QueryClientProvider client={new QueryClient()}>
          {PageComponent}
        </QueryClientProvider>
      );

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("inventory-content")).toBeTruthy();
      });

      // Verify server side prefetching was called
      expect(mockGetInventoryWithDashboardData.mock.calls.length).toBe(1);
    });
  });
});

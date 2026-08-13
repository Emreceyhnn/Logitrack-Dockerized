 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 1. Mock Server-Side Data Fetching
const mockGetShipmentsWithDashboardData = mock.fn(async () => ({
  shipments: [],
}));

mock.module("../../../../lib/controllers/shipments.ts", {
  namedExports: { getShipmentsWithDashboardData: mockGetShipmentsWithDashboardData },
});

// 2. Mock Components
mock.module("./components/shipmentsContent.tsx", {
  defaultExport: () => <div data-testid="shipments-content">Shipments Content</div>,
});

describe("ShipmentsPage Component", () => {
  let ShipmentsPage: unknown;

  before(async () => {
    const mod = await import("./page");
    ShipmentsPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetShipmentsWithDashboardData.mock.resetCalls();
  });

  describe("ShipmentsPage() Render Testleri", () => {
    it("should_RenderShipmentsContent_WithHydratedState", async () => {
      // Act
      const PageComponent = await ShipmentsPage();
      const queryClient = new QueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          {PageComponent}
        </QueryClientProvider>
      );

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("shipments-content")).toBeTruthy();
      });

      // Verify server side prefetching was called
      expect(mockGetShipmentsWithDashboardData.mock.calls.length).toBe(1);
    });
  });
});

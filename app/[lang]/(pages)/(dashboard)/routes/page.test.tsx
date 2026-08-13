 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 1. Mock Server-Side Data Fetching
const mockGetRoutesWithDashboardData = mock.fn(async () => ({
  routes: [],
}));

mock.module("../../../../lib/controllers/routes.ts", {
  namedExports: { getRoutesWithDashboardData: mockGetRoutesWithDashboardData },
});

// 2. Mock Components
mock.module("./components/routesContent.tsx", {
  defaultExport: () => <div data-testid="routes-content">Routes Content</div>,
});

describe("RoutesPage Component", () => {
  let RoutesPage: unknown;

  before(async () => {
    const mod = await import("./page");
    RoutesPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetRoutesWithDashboardData.mock.resetCalls();
  });

  describe("RoutesPage() Render Testleri", () => {
    it("should_RenderRoutesContent_WithHydratedState", async () => {
      // Act
      const PageComponent = await RoutesPage();
      render(
        <QueryClientProvider client={new QueryClient()}>
          {PageComponent}
        </QueryClientProvider>
      );

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("routes-content")).toBeTruthy();
      });

      // Verify server side prefetching was called
      expect(mockGetRoutesWithDashboardData.mock.calls.length).toBe(1);
    });
  });
});

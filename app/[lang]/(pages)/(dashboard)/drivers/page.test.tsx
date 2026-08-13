 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 1. Mock Server-Side Data Fetching
const mockGetDriverWithDashboardData = mock.fn(async () => ({
  drivers: [],
}));

mock.module("../../../../lib/controllers/driver.ts", {
  namedExports: { getDriverWithDashboardData: mockGetDriverWithDashboardData },
});

// 2. Mock Components
mock.module("./components/DriverContent.tsx", {
  defaultExport: () => <div data-testid="driver-content">Driver Content</div>,
});

describe("DriverPage Component", () => {
  let DriverPage: unknown;

  before(async () => {
    const mod = await import("./page");
    DriverPage = mod.default;
  });

  afterEach(() => {
    cleanup();
    mockGetDriverWithDashboardData.mock.resetCalls();
  });

  describe("DriverPage() Render Testleri", () => {
    it("should_RenderDriverContent_WithHydratedState", async () => {
      // Act
      const PageComponent = await DriverPage();
      render(
        <QueryClientProvider client={new QueryClient()}>
          {PageComponent}
        </QueryClientProvider>
      );

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("driver-content")).toBeTruthy();
      });

      // Verify server side prefetching was called
      expect(mockGetDriverWithDashboardData.mock.calls.length).toBe(1);
    });
  });
});

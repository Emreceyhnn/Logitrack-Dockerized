 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";

// Mock child component
mock.module("../../../components/dashboard/DashboardLayoutClient.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="dashboard-layout-client">{children}</div>,
});

// The server layout awaits getAuthenticatedUser(); mock it to a non-warehouse
// user so it renders the dashboard tree (no redirect).
mock.module("../../../lib/auth-middleware.ts", {
  namedExports: {
    getAuthenticatedUser: mock.fn(async () => ({
      id: "user-1",
      companyId: "company-1",
      roleName: "role_admin",
    })),
  },
});

describe("DashboardLayout Component", () => {
  let DashboardLayout: unknown;

  before(async () => {
    const mod = await import("./layout");
    DashboardLayout = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("DashboardLayout() Render Testleri", () => {
    it("should_RenderDashboardLayoutClient_WithChildren", async () => {
      // Act
      const LayoutComponent = await DashboardLayout({
        children: <div data-testid="child-content">Test Child</div>,
        params: Promise.resolve({ lang: "en" }),
      });
      render(LayoutComponent);

      // Assert basic renders
      await waitFor(() => {
        expect(screen.getByTestId("dashboard-layout-client")).toBeTruthy();
        expect(screen.getByTestId("child-content")).toBeTruthy();
      });
    });
  });
});

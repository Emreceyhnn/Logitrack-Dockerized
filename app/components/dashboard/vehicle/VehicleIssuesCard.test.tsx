 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mock Contexts & Utils
const useDictionaryMock = mock.fn(() => ({
  vehicles: {
    dashboard: {
      openIssues: "Open Issues",
      activeIssues: "{count} Active",
      noOpenIssues: "No Open Issues"
    },
    fields: {
      plate: "Plate"
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../chips/priorityChips.tsx", {
  namedExports: {
    PriorityChip: ({ status  }: Record<string, unknown>) => <span data-testid="priority-chip">{status}</span>
  }
});

// 2. Mock Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
  }
});

import * as originalMui from "@mui/material";
const useThemeMock = mock.fn(() => customTheme);
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: useThemeMock,
  },
});

describe("VehicleIssuesCard RTL Component", () => {
  let VehicleIssuesCard: unknown;

  before(async () => {
    const mod = await import("./VehicleIssuesCard");
    VehicleIssuesCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("VehicleIssuesCard() bileşeni", () => {
    it("should_RenderEmptyState_WhenNoIssuesProvided", async () => {
      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleIssuesCard issues={[]} />
        </ThemeProvider>
      );

      // Assert basic renders
      expect(screen.getByText("Open Issues")).toBeTruthy();
      expect(screen.getByText("0 Active")).toBeTruthy();
      expect(screen.getByText("No Open Issues")).toBeTruthy();
    });

    it("should_RenderIssueList_WhenIssuesExist", async () => {
      const mockIssues = [
        {
          id: "iss-1",
          title: "Engine Light On",
          description: "Check engine light came on during transit",
          status: "OPEN",
          priority: "HIGH",
          createdAt: new Date(),
          vehicle: { plate: "34 ABC 123" }
        },
        {
          id: "iss-2",
          title: "Tire Pressure Low",
          description: "Rear left tire pressure is below threshold",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          createdAt: new Date(),
          vehicle: { plate: "06 DEF 456" }
        }
      ];

      // Act
      render(
        <ThemeProvider theme={customTheme}>
          <VehicleIssuesCard issues={mockIssues} />
        </ThemeProvider>
      );

      expect(screen.getByText("2 Active")).toBeTruthy();

      // Issue 1
      expect(screen.getByText("Engine Light On")).toBeTruthy();
      expect(screen.getByText("Check engine light came on during transit")).toBeTruthy();
      expect(screen.getByText("Plate: 34 ABC 123")).toBeTruthy();

      // Issue 2
      expect(screen.getByText("Tire Pressure Low")).toBeTruthy();
      expect(screen.getByText("Rear left tire pressure is below threshold")).toBeTruthy();
      expect(screen.getByText("Plate: 06 DEF 456")).toBeTruthy();

      // Priority chips
      expect(screen.getAllByTestId("priority-chip").length).toBe(2);
    });
  });
});

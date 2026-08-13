 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const mockDict = {
  dashboard: {
    overview: {
      dailyOperations: {
        title: "Daily Operations",
        plannedRoutes: "Planned Routes",
        completedDeliveries: "Completed Deliveries",
        failedDeliveries: "Failed Deliveries",
        avgDuration: "Avg Duration",
        fuelConsumed: "Fuel Consumed",
      },
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: () => mockDict },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

// Custom theme with alpha tokens
const customTheme = createTheme({
  palette: {
    mode: "light",
  },
});

(customTheme.palette as unknown).kpi = {
  indigo: "#3f51b5",
  indigo_alpha: { main_10: "rgba(63,81,181,0.1)" },
  emerald: "#4caf50",
  emerald_alpha: { main_10: "rgba(76,175,80,0.1)" },
  error: "#f44336",
  error_alpha: { main_10: "rgba(244,67,54,0.1)" },
  amber: "#ff9800",
  amber_alpha: { main_10: "rgba(255,152,0,0.1)" },
  sky: "#2196f3",
  sky_alpha: { main_10: "rgba(33,150,243,0.1)" },
};

(customTheme.palette.background as unknown).paper_alpha = { main_40: "rgba(255,255,255,0.4)", main_60: "rgba(255,255,255,0.6)" };
(customTheme.palette as unknown).divider_alpha = { main_08: "rgba(0,0,0,0.08)", main_20: "rgba(0,0,0,0.2)" };
(customTheme.palette.common as unknown).black_alpha = { main_08: "rgba(0,0,0,0.08)" };
(customTheme.palette as unknown).getColorAlpha = () => ({ main_10: "rgba(0,0,0,0.1)" });

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("DailyOperationsCard RTL Component", () => {
  let DailyOperationsCard: unknown;

  before(async () => {
    const mod = await import("./dailyOperations");
    DailyOperationsCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockValues = {
    plannedRoutes: 15,
    completedDeliveries: 42,
    failedDeliveries: 3,
    avgDeliveryTimeMin: "45 min",
    fuelConsumedLiters: "120 L",
  };

  describe("DailyOperationsCard() bileşeni", () => {
    it("should_ReturnNull_WhenValuesIsNull", async () => {
      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <DailyOperationsCard values={null} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderMetrics_WithCorrectValues", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <DailyOperationsCard values={mockValues} />
        </ThemeProvider>
      );

      expect(screen.getByText("Daily Operations")).toBeTruthy();
      expect(screen.getByText("Planned Routes")).toBeTruthy();
      expect(screen.getByText("15")).toBeTruthy();

      expect(screen.getByText("Completed Deliveries")).toBeTruthy();
      expect(screen.getByText("42")).toBeTruthy();

      expect(screen.getByText("Failed Deliveries")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();

      expect(screen.getByText("Avg Duration")).toBeTruthy();
      expect(screen.getByText("45 min")).toBeTruthy();

      expect(screen.getByText("Fuel Consumed")).toBeTruthy();
      expect(screen.getByText("120 L")).toBeTruthy();
    });

    it("should_RenderFallback_ForMissingAvgDuration", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <DailyOperationsCard values={{ ...mockValues, avgDeliveryTimeMin: undefined }} />
        </ThemeProvider>
      );

      expect(screen.getByText("Avg Duration")).toBeTruthy();
      expect(screen.getByText("--")).toBeTruthy();
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. Mocks
const useDictionaryMock = mock.fn(() => ({
  shipments: {
    dashboard: {
      totalShipments: "Total Shipments",
      activeShipments: "Active Shipments",
      delayedShipments: "Delayed Shipments",
      inTransit: "In Transit",
    }
  }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

mock.module("../../skeletons/KpiSkeleton.tsx", {
  defaultExport: ({ count  }: Record<string, unknown>) => <div data-testid="kpi-skeleton">Loading {count} KPIs</div>,
});

mock.module("../../cards/StatCard.tsx", {
  defaultExport: ({ title, value  }: Record<string, unknown>) => (
    <div data-testid={`stat-card-${title}`}>
      <span>{title}</span>
      <span data-testid={`value-${title}`}>{value}</span>
    </div>
  ),
});

mock.module("framer-motion", {
  namedExports: {
    motion: {
      div: ({ children, ...rest }: unknown) => <div {...rest}>{children}</div>
    }
  }
});

// 2. Theme
const customTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" } as unknown,
  }
});

const mockAlpha = { sky: "#38bdf8", error: "#ef4444", emerald: "#10b981" };
(customTheme.palette as unknown).kpi = mockAlpha;

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    useTheme: mock.fn(() => customTheme),
  },
});

describe("ShipmentKpiCard RTL Component", () => {
  let ShipmentKpiCard: unknown;

  before(async () => {
    const mod = await import("./shipmentKpiCard");
    ShipmentKpiCard = mod.default;
  });

  afterEach(() => { cleanup(); });

  describe("ShipmentKpiCard() bileşeni", () => {
    it("should_RenderKpiSkeleton_WhenLoadingIsTrue", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentKpiCard state={{ loading: true, stats: null }} />
        </ThemeProvider>
      );
      expect(screen.getByTestId("kpi-skeleton")).toBeTruthy();
      expect(screen.getByText("Loading 4 KPIs")).toBeTruthy();
    });

    it("should_RenderAllFourKpiCards_WithCorrectValues", async () => {
      const mockStats = { total: 120, active: 45, delayed: 8, inTransit: 67 };

      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentKpiCard state={{ loading: false, stats: mockStats }} />
        </ThemeProvider>
      );

      expect(screen.getByTestId("stat-card-Total Shipments")).toBeTruthy();
      expect(screen.getByTestId("value-Total Shipments").textContent).toBe("120");

      expect(screen.getByTestId("stat-card-Active Shipments")).toBeTruthy();
      expect(screen.getByTestId("value-Active Shipments").textContent).toBe("45");

      expect(screen.getByTestId("stat-card-Delayed Shipments")).toBeTruthy();
      expect(screen.getByTestId("value-Delayed Shipments").textContent).toBe("8");

      expect(screen.getByTestId("stat-card-In Transit")).toBeTruthy();
      expect(screen.getByTestId("value-In Transit").textContent).toBe("67");
    });

    it("should_RenderZeroValues_WhenStatsIsNull", async () => {
      render(
        <ThemeProvider theme={customTheme}>
          <ShipmentKpiCard state={{ loading: false, stats: null }} />
        </ThemeProvider>
      );

      expect(screen.getByTestId("value-Total Shipments").textContent).toBe("0");
      expect(screen.getByTestId("value-Active Shipments").textContent).toBe("0");
      expect(screen.getByTestId("value-Delayed Shipments").textContent).toBe("0");
      expect(screen.getByTestId("value-In Transit").textContent).toBe("0");
    });
  });
});

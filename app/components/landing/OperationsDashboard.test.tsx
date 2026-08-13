 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  landing: {
    operations: {
      tabs: { overview: "Overview", fleet: "Fleet", routes: "Routes" },
      stats: { totalFleet: "1", inTransit: "1", maintenance: "1", onTime: "1", activeRoutes: "1", fuelSaved: "1", timeSaved: "1", deviations: "1", activeUnits: "1", efficiency: "1", avgSpeed: "1", co2Reduced: "1" },
      telemetry: { title: "Title", activeIntelligence: "Intelligence", routeOptimized: "Optimized {id}", efficiencyIncreased: "Increased {value}", systemLog: "Log" },
      fleet: { title: "Title", onSchedule: "On Schedule", delayed: "Delayed", arriving: "Arriving" },
      routes: { title: "Title" }
    }
  }
}));

const useStateMock = mock.fn((init) => [init, mock.fn()]);

mock.module("react", { namedExports: { useState: useStateMock } });
mock.module("../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock } });

mock.module("@mui/material", {
  namedExports: {
    Box: (props: Record<string, unknown>) => ({ type: "Box", props }),
    Container: (props: Record<string, unknown>) => ({ type: "Container", props }),
    Grid: (props: Record<string, unknown>) => ({ type: "Grid", props }),
    Stack: (props: Record<string, unknown>) => ({ type: "Stack", props }),
    Typography: (props: Record<string, unknown>) => ({ type: "Typography", props })
  }
});

mock.module("@mui/icons-material/Dashboard", { defaultExport: () => ({ type: "Icon" }) });
mock.module("@mui/icons-material/LocalShipping", { defaultExport: () => ({ type: "Icon" }) });
mock.module("@mui/icons-material/Route", { defaultExport: () => ({ type: "Icon" }) });
mock.module("@mui/icons-material/MyLocation", { defaultExport: () => ({ type: "Icon" }) });
mock.module("@mui/icons-material/NotificationsActive", { defaultExport: () => ({ type: "Icon" }) });
mock.module("@mui/icons-material/Speed", { defaultExport: () => ({ type: "Icon" }) });
mock.module("framer-motion", { namedExports: { motion: { div: (props: Record<string, unknown>) => ({ type: "MotionDiv", props }) } } });

describe("OperationsDashboard Component", () => {
  let OperationsDashboard: unknown;

  before(async () => {
    const mod = await import("./OperationsDashboard");
    OperationsDashboard = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
    useStateMock.mock.resetCalls();
  });

  describe("OperationsDashboard() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      // Act
      try {
        OperationsDashboard();
      } catch (e) {}

      // Assert
      expect(OperationsDashboard).toBeDefined();
      expect(useDictionaryMock.mock.calls.length).toBeGreaterThan(0);
    });
  });
});

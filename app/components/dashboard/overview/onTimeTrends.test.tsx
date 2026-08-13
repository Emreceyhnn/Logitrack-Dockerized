 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockDict = {
  dashboard: {
    overview: {
      shipmentVolume: {
        title: "Shipment Volume",
        noHistory: "No shipment history",
        shipmentsCount: "{count} Shipments",
      },
    },
  },
};

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { 
    useDictionary: () => mockDict,
    useLanguage: () => ({ lang: "en" })
  },
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => <div data-testid="custom-card">{children}</div>,
});

mock.module("../../charts/TimeRangeSelector.tsx", {
  defaultExport: ({ value, onChange  }: Record<string, unknown>) => (
    <div data-testid="time-range-selector">
      <span>{value}</span>
      <button onClick={() => onChange("1m")}>Set 1m</button>
      <button onClick={() => onChange("1w")}>Set 1w</button>
    </div>
  ),
});

mock.module("@mui/x-charts", {
  namedExports: {
    BarChart: ({ series, xAxis  }: Record<string, unknown>) => (
      <div data-testid="bar-chart">
        {xAxis?.[0]?.data?.map((date: string, i: number) => (
          <div key={date} data-testid={`bar-${date}`}>
            {series?.[0]?.data[i]}
          </div>
        ))}
      </div>
    ),
  },
});

describe("ShipmentVolumeCard RTL Component", () => {
  let ShipmentVolumeCard: unknown;

  before(async () => {
    const mod = await import("./onTimeTrends");
    ShipmentVolumeCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  // Data represents 10 days
  const mockValues = Array.from({ length: 10 }).map((_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    count: i * 10,
  }));

  describe("ShipmentVolumeCard() bileşeni", () => {
    it("should_ReturnNull_WhenValuesIsNull", async () => {
      const { container } = render(<ShipmentVolumeCard values={null as unknown} />);
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderEmptyState_WhenValuesIsEmpty", async () => {
      render(<ShipmentVolumeCard values={[]} />);
      expect(screen.getByText("No shipment history")).toBeTruthy();
    });

    it("should_RenderBarChart_WithDefault1mRange", async () => {
      render(<ShipmentVolumeCard values={mockValues} />);
      
      expect(screen.getByText("Shipment Volume")).toBeTruthy();
      expect(screen.getByTestId("bar-chart")).toBeTruthy();
      
      // Default is 1m (30 days). So from array of length 10, it shows all 10.
      expect(screen.getByTestId("bar-May 04")).toBeTruthy();
      expect(screen.getByTestId("bar-May 03")).toBeTruthy();
    });

    it("should_UpdateTimeRange_AndRefilterData_WhenSelectorChanges", async () => {
      render(<ShipmentVolumeCard values={mockValues} />);
      
      // Initially 1m, so '2026-05-01' is visible
      expect(screen.getByTestId("bar-May 01")).toBeTruthy();

      const selectButton = screen.getByText("Set 1w");
      fireEvent.click(selectButton);

      // Now 1w (7 days), '2026-05-01' should be hidden because 10-7=3 elements. So it starts at May 04.
      expect(screen.queryByTestId("bar-May 01")).toBeNull();
    });
  });
});

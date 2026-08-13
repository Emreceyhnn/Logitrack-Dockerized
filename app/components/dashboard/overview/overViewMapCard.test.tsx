 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks — the map itself is a dynamic() Leaflet import; stub it out and
// render the markers it receives so the mapping logic can be asserted.
mock.module("next/dynamic", {
  defaultExport: () => (props: Record<string, unknown>) => (
    <div data-testid="map-with-marker">
      {props.markers?.map((m: Record<string, unknown>) => (
        <div key={m.name} data-testid={`marker-${m.name}`}>
          {`${m.type}:${m.lat},${m.len}`}
        </div>
      ))}
    </div>
  ),
});

mock.module("../../cards/card.tsx", {
  defaultExport: ({ children  }: Record<string, unknown>) => (
    <div data-testid="custom-card">{children}</div>
  ),
});

// The card now navigates on marker drill-down and localizes labels; stub the
// router + language hooks so the mapping logic can still be asserted in isolation.
mock.module("next/navigation", {
  // The component also imports usePathname (to detect the demo tree); without
  // it here the module fails to instantiate.
  namedExports: {
    useRouter: () => ({ push: () => {} }),
    usePathname: () => "/en/overview",
  },
});

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: {
    useLanguage: () => ({ lang: "en" }),
    useDictionary: () => ({ common: { viewDetails: "View details" } }),
  },
});

describe("OverviewMapCard RTL Component", () => {
  let OverviewMapCard: unknown;

  before(async () => {
    const mod = await import("./overViewMapCard");
    OverviewMapCard = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  const mockStats = [
    { id: "w-1", type: "W", name: "Warehouse A", position: { lat: 10, lng: 20 } },
    { id: "v-1", type: "V", name: "Vehicle 1", position: { lat: 11, lng: 21 } },
    { id: "c-1", type: "C", name: "Customer X", position: { lat: 12, lng: 22 } },
  ];

  describe("OverviewMapCard() bileşeni", () => {
    it("should_ReturnNull_WhenStatsIsNull", async () => {
      const { container } = render(<OverviewMapCard stats={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should_RenderMapWithMarkers_MappedFromStats", async () => {
      render(<OverviewMapCard stats={mockStats as unknown} />);

      expect(screen.getByTestId("custom-card")).toBeTruthy();
      expect(screen.getByTestId("map-with-marker")).toBeTruthy();

      // position.lat/lng is flattened into the marker's lat/len fields and
      // the type code is passed through untouched.
      expect(screen.getByTestId("marker-Warehouse A").textContent).toBe("W:10,20");
      expect(screen.getByTestId("marker-Vehicle 1").textContent).toBe("V:11,21");
      expect(screen.getByTestId("marker-Customer X").textContent).toBe("C:12,22");
    });

    it("should_RenderEmptyMap_WhenStatsIsEmptyArray", async () => {
      render(<OverviewMapCard stats={[] as unknown} />);
      expect(screen.getByTestId("map-with-marker")).toBeTruthy();
      expect(screen.queryAllByTestId(/^marker-/).length).toBe(0);
    });
  });
});

 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// 1. Mocks — the map is a dynamic() Leaflet import; stub the factory and
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

import * as originalMui from "@mui/material";
mock.module("@mui/material", {
  namedExports: {
    ...originalMui,
    Skeleton: ({ variant  }: Record<string, unknown>) => <div data-testid="loading-skeleton" data-variant={variant} />,
  }
});

describe("RoutesMainMap RTL Component", () => {
  let RoutesMainMap: unknown;

  before(async () => {
    const mod = await import("./routesMainMap");
    RoutesMainMap = mod.default;
  });

  afterEach(() => { cleanup(); });

  const mockMapData = [
    { id: "v-1", name: "Truck Alpha", type: "V", position: { lat: 41.0, lng: 28.9 } },
    { id: "w-1", name: "Warehouse HQ", type: "W", position: { lat: 41.1, lng: 29.0 } },
  ];

  describe("RoutesMainMap() bileşeni", () => {
    it("should_RenderLoadingSkeleton_WhenLoadingIsTrue", async () => {
      render(<RoutesMainMap mapData={[]} loading={true} />);
      expect(screen.getByTestId("loading-skeleton")).toBeTruthy();
      // The map still renders under the skeleton overlay
      expect(screen.getByTestId("map-with-marker")).toBeTruthy();
    });

    it("should_RenderMarkersOnMap_ForEachMapDataEntry", async () => {
      render(<RoutesMainMap mapData={mockMapData} loading={false} />);

      expect(screen.getByTestId("map-with-marker")).toBeTruthy();
      // position.lat/lng is flattened to lat/len; type codes pass through raw
      expect(screen.getByTestId("marker-Truck Alpha").textContent).toBe("V:41,28.9");
      expect(screen.getByTestId("marker-Warehouse HQ").textContent).toBe("W:41.1,29");
    });
  });
});
